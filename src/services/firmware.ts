/**
 * Firmware OTA Service for ESP32 Super Car
 */

export interface FirmwareInfo {
  ok: boolean;
  token: string;
  bootId: string;
  build: string;
  maxSize: number;
  locked: boolean;
  uploading: boolean;
}

export function validateFirmwareBytes(bytes: Uint8Array): { valid: boolean; error?: string } {
  if (bytes.length < 288) {
    return { valid: false, error: 'File is too small. Application firmware must be at least 288 bytes.' };
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = view.getUint32(32, true);

  if (
    bytes[0] !== 0xe9 ||
    bytes[1] < 1 ||
    bytes[1] > 16 ||
    bytes[12] !== 0 ||
    bytes[13] !== 0 ||
    magic !== 0xabcd5432
  ) {
    return {
      valid: false,
      error: 'Invalid ESP32 image. Choose a classic ESP32 application firmware.bin, not a bootloader or partition file.',
    };
  }
  return { valid: true };
}

export async function fetchFirmwareInfo(baseUrl: string): Promise<FirmwareInfo> {
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 3500);

  try {
    const res = await fetch(`${cleanUrl}/api/firmware`, {
      signal: abort.signal,
      cache: 'no-store',
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Failed to fetch firmware info from controller');
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export async function lockFirmware(baseUrl: string, token: string): Promise<void> {
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 3500);

  try {
    const res = await fetch(`${cleanUrl}/api/firmware/lock`, {
      method: 'POST',
      headers: { 'X-Firmware-Token': token },
      signal: abort.signal,
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Failed to lock controller for firmware update');
    }
  } finally {
    clearTimeout(timeout);
  }
}

export async function unlockFirmware(baseUrl: string, token: string): Promise<void> {
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 3500);

  try {
    const res = await fetch(`${cleanUrl}/api/firmware/unlock`, {
      method: 'POST',
      headers: { 'X-Firmware-Token': token },
      signal: abort.signal,
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Failed to unlock controller');
    }
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendFirmwareUpload(
  baseUrl: string,
  token: string,
  fileName: string,
  fileSize: number,
  fileBytes: Uint8Array | Blob,
  onProgress: (percent: number, phase: string) => void
): Promise<any> {
  const cleanUrl = baseUrl.replace(/\/+$/, '');

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${cleanUrl}/api/firmware`);
    xhr.timeout = 120000;
    xhr.setRequestHeader('X-Firmware-Token', token);
    xhr.setRequestHeader('X-Firmware-Size', String(fileSize));

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
        onProgress(percent, percent === 100 ? 'Verifying firmware' : 'Uploading firmware');
      }
    };

    xhr.onload = () => {
      let result: any;
      try {
        result = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error('Unexpected response. Check the connection to the controller.'));
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300 || !result.ok || !result.restarting) {
        reject(new Error(result.error || 'Firmware update was rejected.'));
      } else {
        resolve(result);
      }
    };

    xhr.onerror = () => reject(new Error('Connection lost during firmware upload.'));
    xhr.ontimeout = () => reject(new Error('Firmware upload timed out.'));

    const formData = new FormData();
    if (fileBytes instanceof Blob) {
      formData.append('firmware', fileBytes, fileName);
    } else {
      const blob = new Blob([fileBytes as any], { type: 'application/octet-stream' });
      formData.append('firmware', blob, fileName);
    }
    xhr.send(formData);
  });
}

export async function confirmRestart(
  baseUrl: string,
  previousBootId: string,
  timeoutMs = 45000
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    try {
      const current = await fetchFirmwareInfo(baseUrl);
      if (current.bootId && current.bootId !== previousBootId) {
        return true;
      }
    } catch {
      // AP might drop temporarily during ESP32 reboot
    }
  }
  return false;
}
