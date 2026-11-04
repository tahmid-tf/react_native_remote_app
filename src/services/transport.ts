/**
 * SuperCarLink - Transport manager for ESP32 Car Remote
 * Handles serialized command transmission to the ESP32 /api/control endpoint.
 */

export interface CarCommand {
  mode: 'drive' | 'stop' | 'burnout' | 'nitro';
  t: number; // throttle -80..80
  x: number; // strafe -80..80
  s: number; // steering -80..80
  id: number; // actionId
  q?: number; // quick flag (1 or 0)
}

export interface MotorFeedback {
  ok: boolean;
  motors: [number, number, number, number];
  timeoutMs?: number;
  error?: string;
}

export type StatusCallback = (
  connected: boolean,
  motors: [number, number, number, number],
  error?: string
) => void;

function generateClientId(): string {
  const hex = '0123456789abcdef';
  let s = '';
  for (let i = 0; i < 32; i++) {
    s += hex.charAt(Math.floor(Math.random() * 16));
  }
  return s;
}

export class SuperCarLink {
  private onStatus: StatusCallback;
  private client: string;
  private seq: number;
  private connected: boolean;
  private active: boolean;
  private epoch: number;
  private latest: CarCommand;
  private lastSentAt: number;
  private inFlight: boolean;
  private timer: any;
  private abortController: AbortController | null;
  private baseUrl: string;

  constructor(onStatus: StatusCallback, baseUrl = 'http://192.168.4.1') {
    this.onStatus = onStatus;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.client = generateClientId();
    this.seq = 0;
    this.connected = false;
    this.active = true;
    this.epoch = 0;
    this.latest = this.neutral();
    this.lastSentAt = -Infinity;
    this.inFlight = false;
    this.timer = null;
    this.abortController = null;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getClientId(): string {
    return this.client;
  }

  isConnected(): boolean {
    return this.connected;
  }

  neutral(): CarCommand {
    return { mode: 'drive', t: 0, x: 0, s: 0, id: 0 };
  }

  start() {
    this.stop();
    this.timer = setInterval(() => this.send(), 50);
    this.send();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  update(command: CarCommand) {
    const changed = JSON.stringify(command) !== JSON.stringify(this.latest);
    this.latest = { ...command };
    const immediate =
      command.mode !== 'drive' || (!command.t && !command.x && !command.s);
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (changed && (immediate || now - this.lastSentAt >= 50)) {
      this.send();
    }
  }

  async send() {
    if (!this.active || this.inFlight) return;
    this.inFlight = true;
    const epoch = this.epoch;
    const command = this.connected ? this.latest : this.neutral();

    const params = new URLSearchParams();
    params.append('client', this.client);
    params.append('seq', String(++this.seq));
    params.append('mode', command.mode);
    params.append('t', String(command.t));
    params.append('x', String(command.x));
    params.append('s', String(command.s));
    params.append('id', String(command.id));
    if (command.q) {
      params.append('q', '1');
    }

    const abort = new AbortController();
    this.abortController = abort;
    const timeout = setTimeout(() => abort.abort(), 800);
    this.lastSentAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/api/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: params.toString(),
        signal: abort.signal,
      });

      const text = await response.text();
      let data: MotorFeedback;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Controller returned invalid JSON (HTTP ${response.status})`);
      }

      if (
        !response.ok ||
        !data.ok ||
        !Array.isArray(data.motors) ||
        data.motors.length !== 4 ||
        !data.motors.every(
          (value) => typeof value === 'number' && Math.abs(value) <= 100
        )
      ) {
        throw new Error(data.error || `Invalid controller response (HTTP ${response.status})`);
      }

      if (epoch !== this.epoch) return;
      this.connected = true;
      this.onStatus(true, data.motors);
    } catch (error: any) {
      if (epoch !== this.epoch) return;
      this.connected = false;
      this.latest = this.neutral();
      this.onStatus(false, [0, 0, 0, 0], error?.message || 'Connection error');
    } finally {
      clearTimeout(timeout);
      if (epoch === this.epoch) {
        this.inFlight = false;
      }
    }
  }

  setActive(active: boolean) {
    if (this.active === active) return;
    this.active = active;
    this.epoch++;
    if (this.abortController) {
      this.abortController.abort();
    }
    this.inFlight = false;
    this.latest = this.neutral();
    this.connected = false;

    if (!active) {
      // Fire stop command
      try {
        const params = new URLSearchParams();
        params.append('client', this.client);
        params.append('seq', String(++this.seq));
        params.append('mode', 'stop');
        params.append('t', '0');
        params.append('x', '0');
        params.append('s', '0');
        params.append('id', '0');
        fetch(`${this.baseUrl}/api/control`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        }).catch(() => {});
      } catch {}
    }

    this.onStatus(false, [0, 0, 0, 0]);
    if (active) {
      this.send();
    }
  }
}
