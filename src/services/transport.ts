/**
 * SuperCarLink - Robust transport & connection manager for ESP32 Car Remote
 * Handles continuous connection probing, auto-reconnection, and serialized command transmission.
 *
 * Only one HTTP request is ever "current". Every request captures a token when it
 * starts; if the token has changed by the time it settles (because it was aborted,
 * superseded, or the link was deactivated) its result is ignored, so a stale
 * response can never clear the in-flight flag of a newer request, bump the error
 * counter, or report a connection state that is no longer true.
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

const DRIVE_INTERVAL_MS = 50;
const PROBE_INTERVAL_MS = 1200;
const SEND_TIMEOUT_MS = 800;
const PROBE_TIMEOUT_MS = 1100;
const MAX_CONSECUTIVE_ERRORS = 3;
// Safety net in case an aborted fetch never settles on some network stacks.
const HUNG_REQUEST_MS = 2000;
const NEUTRAL_MOTORS: [number, number, number, number] = [0, 0, 0, 0];

function generateClientId(): string {
  const hex = '0123456789abcdef';
  let s = '';
  for (let i = 0; i < 32; i++) {
    s += hex.charAt(Math.floor(Math.random() * 16));
  }
  return s;
}

function sameCommand(a: CarCommand, b: CarCommand): boolean {
  return (
    a.mode === b.mode &&
    a.t === b.t &&
    a.x === b.x &&
    a.s === b.s &&
    a.id === b.id &&
    (a.q ? 1 : 0) === (b.q ? 1 : 0)
  );
}

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

export function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export class SuperCarLink {
  private onStatus: StatusCallback;
  private client: string;
  private seq = 0;
  private connected = false;
  private probing = false;
  private active = true;
  private latest: CarCommand;
  private lastSentAt = -Infinity;
  private inFlight = false;
  private flightStartedAt = 0;
  private requestToken = 0;
  private driveTimer: ReturnType<typeof setInterval> | null = null;
  private probeTimer: ReturnType<typeof setInterval> | null = null;
  private abortController: AbortController | null = null;
  private baseUrl: string;
  private consecutiveErrors = 0;

  constructor(onStatus: StatusCallback, baseUrl = 'http://192.168.4.1') {
    this.onStatus = onStatus;
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.client = generateClientId();
    this.latest = this.neutral();
  }

  setBaseUrl(url: string) {
    const clean = normalizeBaseUrl(url);
    if (this.baseUrl === clean) return;
    this.baseUrl = clean;
    if (!this.active) return;
    // The old endpoint's link state says nothing about the new one: re-probe.
    this.cancelInFlight();
    this.connected = false;
    this.consecutiveErrors = 0;
    this.latest = this.neutral();
    this.startProbeLoop();
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

  isActive(): boolean {
    return this.active;
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
    this.cancelInFlight();
  }

  /** Emits a status update, but only while the link is active. */
  private emit(
    connected: boolean,
    motors: [number, number, number, number],
    error?: string,
    probing?: boolean
  ) {
    if (!this.active) return;
    this.onStatus(connected, motors, error, probing);
  }

  /** Aborts the current request (if any) and invalidates its result. */
  private cancelInFlight() {
    this.requestToken++;
    if (this.abortController) {
      try {
        this.abortController.abort();
      } catch {}
      this.abortController = null;
    }
    this.inFlight = false;
  }

  /** Returns true if a request is still legitimately in flight. */
  private isBusy(): boolean {
    if (!this.inFlight) return false;
    if (Date.now() - this.flightStartedAt > HUNG_REQUEST_MS) {
      this.cancelInFlight();
      return false;
    }
    return true;
  }

  private startDriveLoop() {
    this.stopProbeLoop();
    this.stopDriveLoop();
    this.driveTimer = setInterval(() => this.send(), DRIVE_INTERVAL_MS);
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
    this.emit(false, NEUTRAL_MOTORS, undefined, true);

    this.probeTimer = setInterval(() => {
      this.probe();
    }, PROBE_INTERVAL_MS);

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
   * Makes sure the periodic probe loop keeps running if this probe fails.
   */
  async probeNow(): Promise<boolean> {
    if (!this.active || this.connected) return this.connected;
    this.cancelInFlight();
    if (!this.probeTimer) {
      this.startProbeLoop();
      return false;
    }
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
    // Requests started before backgrounding may never settle: drop them.
    this.cancelInFlight();

    if (this.connected) {
      if (!this.driveTimer) this.startDriveLoop();
      else this.send();
    } else {
      this.startProbeLoop();
    }
  }

  update(command: CarCommand) {
    const changed = !sameCommand(command, this.latest);
    this.latest = { ...command };
    if (!this.connected || !this.active) return;

    const immediate =
      command.mode !== 'drive' || (!command.t && !command.x && !command.s);
    if (changed && (immediate || nowMs() - this.lastSentAt >= DRIVE_INTERVAL_MS)) {
      this.send();
    }
  }

  private buildParams(command: CarCommand): string {
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
    return params.toString();
  }

  /**
   * Posts a control packet and validates the controller's motor feedback.
   * Throws on network errors, timeouts, and malformed or rejected responses.
   */
  private async postControl(
    body: string,
    abort: AbortController,
    timeoutMs: number
  ): Promise<[number, number, number, number]> {
    const timeout = setTimeout(() => abort.abort(), timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}/api/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
        },
        body,
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
        !data ||
        !data.ok ||
        !Array.isArray(data.motors) ||
        data.motors.length !== 4 ||
        !data.motors.every(
          (value) => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 100
        )
      ) {
        throw new Error(data?.error || `Invalid controller response (HTTP ${response.status})`);
      }
      return data.motors;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new Error('Controller did not respond in time');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * High-speed 50ms command transmission loop used while connected.
   * Requests are serialized: while one is in flight, newer commands simply
   * replace `latest` and are sent as soon as the current request settles.
   */
  async send() {
    if (!this.active || !this.connected || this.isBusy()) return;

    const token = ++this.requestToken;
    const abort = new AbortController();
    this.abortController = abort;
    this.inFlight = true;
    this.flightStartedAt = Date.now();
    const command = this.latest;
    const body = this.buildParams(command);
    this.lastSentAt = nowMs();

    try {
      const motors = await this.postControl(body, abort, SEND_TIMEOUT_MS);
      if (token !== this.requestToken) return;
      this.consecutiveErrors = 0;
      this.emit(true, motors, undefined, false);
    } catch (error: any) {
      if (token !== this.requestToken) return;
      this.consecutiveErrors++;
      // If 3 consecutive failures occur, drop connection and initiate auto-probe
      if (this.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        this.inFlight = false;
        this.abortController = null;
        this.connected = false;
        this.latest = this.neutral();
        this.stopDriveLoop();
        this.emit(false, NEUTRAL_MOTORS, error?.message || 'Connection lost', true);
        this.startProbeLoop();
        return;
      }
    } finally {
      if (token === this.requestToken && this.inFlight) {
        this.inFlight = false;
        this.abortController = null;
        // If a new command arrived while this request was in flight, dispatch it immediately
        if (this.connected && !sameCommand(this.latest, command)) {
          this.send();
        }
      }
    }
  }

  /**
   * Lightweight connection probe sent periodically when disconnected.
   * Auto-reconnects as soon as the ESP32 becomes reachable.
   */
  async probe(): Promise<boolean> {
    if (!this.active || this.connected || this.isBusy()) return false;

    const token = ++this.requestToken;
    const abort = new AbortController();
    this.abortController = abort;
    this.inFlight = true;
    this.flightStartedAt = Date.now();
    this.probing = true;
    const body = this.buildParams(this.neutral());

    try {
      const motors = await this.postControl(body, abort, PROBE_TIMEOUT_MS);
      if (token !== this.requestToken || !this.active) return false;

      // Probing SUCCESS: Car responded!
      this.inFlight = false;
      this.abortController = null;
      this.consecutiveErrors = 0;
      this.connected = true;
      this.stopProbeLoop();
      this.emit(true, motors, undefined, false);
      this.startDriveLoop();
      return true;
    } catch (error: any) {
      if (token !== this.requestToken) return false;
      this.inFlight = false;
      this.abortController = null;
      this.emit(false, NEUTRAL_MOTORS, error?.message || 'Searching...', true);
      return false;
    }
  }

  setActive(active: boolean) {
    if (this.active === active) return;
    if (!active) {
      this.stop();
      this.active = false;
      this.consecutiveErrors = 0;
      this.latest = this.neutral();
      this.connected = false;
      this.probing = false;

      // Best-effort neutral stop packet
      try {
        fetch(`${this.baseUrl}/api/control`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: this.buildParams({ mode: 'stop', t: 0, x: 0, s: 0, id: 0 }),
        }).catch(() => {});
      } catch {}

      this.onStatus(false, NEUTRAL_MOTORS, undefined, false);
    } else {
      this.start();
    }
  }
}
