/**
 * SuperCarLink - Robust transport & connection manager for ESP32 Car Remote
 * Handles continuous connection probing, auto-reconnection, and serialized command transmission.
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
  error?: string,
  probing?: boolean
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
  private probing: boolean;
  private active: boolean;
  private latest: CarCommand;
  private lastSentAt: number;
  private lastFlightStart: number;
  private inFlight: boolean;
  private driveTimer: any;
  private probeTimer: any;
  private abortController: AbortController | null;
  private baseUrl: string;
  private consecutiveErrors: number;

  constructor(onStatus: StatusCallback, baseUrl = 'http://192.168.4.1') {
    this.onStatus = onStatus;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.client = generateClientId();
    this.seq = 0;
    this.connected = false;
    this.probing = false;
    this.active = true;
    this.latest = this.neutral();
    this.lastSentAt = -Infinity;
    this.lastFlightStart = 0;
    this.inFlight = false;
    this.driveTimer = null;
    this.probeTimer = null;
    this.abortController = null;
    this.consecutiveErrors = 0;
  }

  setBaseUrl(url: string) {
    const clean = url.replace(/\/+$/, '');
    if (this.baseUrl === clean) return;
    this.baseUrl = clean;
    if (this.active && !this.connected) {
      this.probeNow();
    }
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

  isProbing(): boolean {
    return this.probing;
  }

  neutral(): CarCommand {
    return { mode: 'drive', t: 0, x: 0, s: 0, id: 0 };
  }

  start() {
    this.active = true;
    if (this.connected) {
      this.startDriveLoop();
    } else {
      this.startProbeLoop();
    }
  }

  stop() {
    this.stopDriveLoop();
    this.stopProbeLoop();
    if (this.abortController) {
      try {
        this.abortController.abort();
      } catch {}
      this.abortController = null;
    }
    this.inFlight = false;
  }

  private startDriveLoop() {
    this.stopProbeLoop();
    this.stopDriveLoop();
    this.driveTimer = setInterval(() => this.send(), 50);
    this.send();
  }

  private stopDriveLoop() {
    if (this.driveTimer) {
      clearInterval(this.driveTimer);
      this.driveTimer = null;
    }
  }

  private startProbeLoop() {
    this.stopDriveLoop();
    this.stopProbeLoop();
    if (!this.active || this.connected) return;

    this.probing = true;
    this.onStatus(false, [0, 0, 0, 0], undefined, true);

    this.probeTimer = setInterval(() => {
      this.probe();
    }, 1200);

    // Trigger immediate probe
    this.probe();
  }

  private stopProbeLoop() {
    if (this.probeTimer) {
      clearInterval(this.probeTimer);
      this.probeTimer = null;
    }
    this.probing = false;
  }

  /**
   * Forcibly triggers an immediate probe, clearing any stuck in-flight request.
   */
  async probeNow(): Promise<boolean> {
    if (!this.active) return false;
    if (this.abortController) {
      try {
        this.abortController.abort();
      } catch {}
      this.abortController = null;
    }
    this.inFlight = false;
    return this.probe();
  }

  /**
   * Resumes link execution when app comes to foreground or network changes.
   */
  wake() {
    if (!this.active) {
      this.start();
      return;
    }
    // Clean up any stale in-flight state from backgrounding
    if (this.abortController) {
      try {
        this.abortController.abort();
      } catch {}
      this.abortController = null;
    }
    this.inFlight = false;

    if (this.connected) {
      this.send();
    } else {
      this.startProbeLoop();
    }
  }

  update(command: CarCommand) {
    const changed = JSON.stringify(command) !== JSON.stringify(this.latest);
    this.latest = { ...command };
    if (!this.connected || !this.active) return;

    const immediate =
      command.mode !== 'drive' || (!command.t && !command.x && !command.s);
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (changed && (immediate || now - this.lastSentAt >= 50)) {
      this.send();
    }
  }

  /**
   * High-speed 50ms command transmission loop used while connected.
   */
  async send() {
    if (!this.active || !this.connected) return;

    // Guard against hung in-flight request (> 1500ms)
    const now = Date.now();
    if (this.inFlight) {
      if (now - this.lastFlightStart > 1500) {
        if (this.abortController) {
          try {
            this.abortController.abort();
          } catch {}
          this.abortController = null;
        }
        this.inFlight = false;
      } else {
        return;
      }
    }

    this.inFlight = true;
    this.lastFlightStart = Date.now();
    const command = this.latest;

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
          'Cache-Control': 'no-cache',
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

      clearTimeout(timeout);
      this.consecutiveErrors = 0;
      this.connected = true;
      this.probing = false;
      this.onStatus(true, data.motors, undefined, false);
    } catch (error: any) {
      clearTimeout(timeout);
      this.consecutiveErrors++;
      // If 3 consecutive failures occur, drop connection and initiate auto-probe
      if (this.consecutiveErrors >= 3) {
        this.connected = false;
        this.latest = this.neutral();
        this.stopDriveLoop();
        this.onStatus(false, [0, 0, 0, 0], error?.message || 'Connection lost', true);
        this.startProbeLoop();
      }
    } finally {
      clearTimeout(timeout);
      this.inFlight = false;
      // If a new command arrived while this request was in flight, dispatch it immediately
      if (this.connected && JSON.stringify(this.latest) !== JSON.stringify(command)) {
        this.send();
      }
    }
  }

  /**
   * Lightweight connection probe sent periodically when disconnected.
   * Auto-reconnects as soon as the ESP32 becomes reachable.
   */
  async probe(): Promise<boolean> {
    if (!this.active || this.connected) return false;

    // Guard against hung in-flight requests (> 2000ms)
    const now = Date.now();
    if (this.inFlight) {
      if (now - this.lastFlightStart > 2000) {
        if (this.abortController) {
          try {
            this.abortController.abort();
          } catch {}
          this.abortController = null;
        }
        this.inFlight = false;
      } else {
        return false;
      }
    }

    this.inFlight = true;
    this.lastFlightStart = Date.now();
    this.probing = true;
    this.onStatus(false, [0, 0, 0, 0], undefined, true);

    const abort = new AbortController();
    this.abortController = abort;
    const timeout = setTimeout(() => abort.abort(), 1100);

    const params = new URLSearchParams();
    params.append('client', this.client);
    params.append('seq', String(++this.seq));
    params.append('mode', 'drive');
    params.append('t', '0');
    params.append('x', '0');
    params.append('s', '0');
    params.append('id', '0');

    try {
      const response = await fetch(`${this.baseUrl}/api/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
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
        data.motors.length !== 4
      ) {
        throw new Error(data.error || `Invalid controller response (HTTP ${response.status})`);
      }

      // Probing SUCCESS: Car responded!
      clearTimeout(timeout);
      this.inFlight = false;
      this.consecutiveErrors = 0;
      this.connected = true;
      this.probing = false;
      this.stopProbeLoop();
      this.onStatus(true, data.motors, undefined, false);
      this.startDriveLoop();
      return true;
    } catch (error: any) {
      clearTimeout(timeout);
      this.inFlight = false;
      this.connected = false;
      this.probing = true;
      this.onStatus(false, [0, 0, 0, 0], error?.message || 'Searching...', true);
      return false;
    }
  }

  setActive(active: boolean) {
    if (this.active === active) return;
    this.active = active;
    this.stop();

    if (!active) {
      this.consecutiveErrors = 0;
      this.latest = this.neutral();
      this.connected = false;
      this.probing = false;

      // Best-effort neutral stop packet
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

      this.onStatus(false, [0, 0, 0, 0], undefined, false);
    } else {
      this.start();
    }
  }
}
