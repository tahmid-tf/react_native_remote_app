/**
 * ESP32 Diagnostics Service
 */

export interface DiagnosticsData {
  ok: boolean;
  resetReason: string;
  previousRecovery: number;
  bootCount: number;
  uptimeMs: number;
  freeHeap: number;
  minimumFreeHeap: number;
  motorHeartbeatAgeMs: number;
  apStarted: boolean;
  systemStop: boolean;
  taskWatchdogSeconds: number;
}

export async function fetchDiagnostics(baseUrl: string): Promise<DiagnosticsData> {
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 3500);

  try {
    const res = await fetch(`${cleanUrl}/api/diagnostics`, {
      signal: abort.signal,
      cache: 'no-store',
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Failed to fetch diagnostics');
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}
