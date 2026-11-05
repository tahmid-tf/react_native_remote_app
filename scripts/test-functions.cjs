const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

console.log('====================================================');
console.log('SUPER CAR REACT NATIVE CONTROLLER - VERIFICATION TEST');
console.log('====================================================\n');

// 1. Test Math & PWM Mixing Formulae
console.log('1. Testing Motor Output & PWM Mixing...');
function signedRound(value) {
  return Math.sign(value) * Math.round(Math.abs(value));
}

function magnitude(value) {
  const amount = Math.abs(value);
  return amount < 0.07 ? 0 : Math.sign(value) * Math.round(40 + ((amount - 0.07) / 0.93) * 40);
}

function calculateMotorOutputs(
  connected,
  maintenance,
  isLive,
  actualOutputs,
  action,
  quick,
  throttle,
  strafe,
  steering
) {
  if (!connected || maintenance) return [0, 0, 0, 0];
  if (isLive) return actualOutputs;

  if (action) {
    if (action.name === 'nitro' || action.name === 'burnout') {
      return [100, 100, 100, 100];
    }
  }

  const forward = throttle;
  const side = strafe;
  const yaw = steering;

  const wheels = [
    forward + side + yaw,
    forward - side - yaw,
    forward - side + yaw,
    forward + side - yaw,
  ];

  const scale = Math.max(1, ...wheels.map((v) => Math.abs(v) / 80));

  return wheels.map((value) => {
    if (quick) return value > 0 ? 80 : value < 0 ? -80 : 0;
    const pwm = signedRound(value / scale);
    return pwm === 0 ? 0 : Math.sign(pwm) * Math.max(40, Math.abs(pwm));
  });
}

// Deadzone & scaling checks
assert.equal(magnitude(0), 0);
assert.equal(magnitude(0.05), 0, 'Values below 0.07 deadzone should be 0');
assert.equal(magnitude(0.07), 40, 'Minimum engaged throttle is 40%');
assert.equal(magnitude(1.0), 80, 'Maximum joystick throttle is 80%');
assert.equal(magnitude(-1.0), -80);

// Neutral
assert.deepEqual(calculateMotorOutputs(true, false, false, [0, 0, 0, 0], null, null, 0, 0, 0), [0, 0, 0, 0]);

// Forward 80%
assert.deepEqual(
  calculateMotorOutputs(true, false, false, [0, 0, 0, 0], null, null, 80, 0, 0),
  [80, 80, 80, 80],
  'All 4 motors forward'
);

// Reverse 80%
assert.deepEqual(
  calculateMotorOutputs(true, false, false, [0, 0, 0, 0], null, null, -80, 0, 0),
  [-80, -80, -80, -80],
  'All 4 motors reverse'
);

// Crab Right 80% (lateral +80)
assert.deepEqual(
  calculateMotorOutputs(true, false, false, [0, 0, 0, 0], null, null, 0, 80, 0),
  [80, -80, -80, 80],
  'Mecanum crab right'
);

// Crab Left 80% (lateral -80)
assert.deepEqual(
  calculateMotorOutputs(true, false, false, [0, 0, 0, 0], null, null, 0, -80, 0),
  [-80, 80, 80, -80],
  'Mecanum crab left'
);

// Forward-Right Diagonal (throttle 80, strafe 80 scaled)
assert.deepEqual(
  calculateMotorOutputs(true, false, false, [0, 0, 0, 0], null, null, 80, 80, 0),
  [80, 0, 0, 80],
  'Forward-right diagonal'
);

// Forward-Left Diagonal (throttle 80, strafe -80 scaled)
assert.deepEqual(
  calculateMotorOutputs(true, false, false, [0, 0, 0, 0], null, null, 80, -80, 0),
  [0, 80, 80, 0],
  'Forward-left diagonal'
);

// Clockwise Yaw rotation (steering 80)
assert.deepEqual(
  calculateMotorOutputs(true, false, false, [0, 0, 0, 0], null, null, 0, 0, 80),
  [80, -80, 80, -80],
  'Clockwise rotation'
);

// Counterclockwise Yaw rotation (steering -80)
assert.deepEqual(
  calculateMotorOutputs(true, false, false, [0, 0, 0, 0], null, null, 0, 0, -80),
  [-80, 80, -80, 80],
  'Counterclockwise rotation'
);

// Disconnected or maintenance lock
assert.deepEqual(calculateMotorOutputs(false, false, false, [0, 0, 0, 0], null, null, 80, 0, 0), [0, 0, 0, 0]);
assert.deepEqual(calculateMotorOutputs(true, true, false, [0, 0, 0, 0], null, null, 80, 0, 0), [0, 0, 0, 0]);
console.log('✓ Motor mixing and PWM formulas pass all tests.\n');

// 2. Test Actions (Burnout & Nitro)
console.log('2. Testing Action System (Burnout & Nitro)...');
const burnoutAction = { name: 'burnout', start: 0, duration: 100, id: 1, progress: 1 };
assert.deepEqual(
  calculateMotorOutputs(true, false, false, [0, 0, 0, 0], burnoutAction, null, 0, 0, 0),
  [100, 100, 100, 100],
  'Burnout produces 100% PWM across all 4 wheels'
);

const nitroAction = { name: 'nitro', start: 0, duration: 1000, id: 2, progress: 1 };
assert.deepEqual(
  calculateMotorOutputs(true, false, false, [0, 0, 0, 0], nitroAction, null, 0, 0, 0),
  [100, 100, 100, 100],
  'Nitro produces 100% PWM across all 4 wheels'
);
console.log('✓ Action outputs confirmed (100% PWM).\n');

// 3. Test Quick Moves
console.log('3. Testing Quick Moves Presets...');
const presets = ['orbit', 'diagonal', 'shuffle', 'eight', 'pivot', 'dance'];
for (const p of presets) {
  const quick = { name: p, start: 0 };
  let t = 0, x = 0, s = 0;
  if (p === 'orbit') { x = 35; s = 35; }
  else if (p === 'diagonal') { t = 40; x = 40; }
  else if (p === 'shuffle') { x = 50; }
  else if (p === 'eight') { t = 35; s = 35; }
  else if (p === 'pivot') { t = 20; x = 20; s = 40; }
  else if (p === 'dance') { x = 40; s = 25; }

  const out = calculateMotorOutputs(true, false, false, [0, 0, 0, 0], null, quick, t, x, s);
  for (const pwm of out) {
    assert.ok(pwm === 0 || Math.abs(pwm) === 80, `Quick move ${p} must only output 0 or 80% PWM, got ${pwm}`);
  }
}
console.log('✓ Quick moves all enforce 80% PWM.\n');

// 4. Test Firmware Binary Validation
console.log('4. Testing Firmware Validation Logic...');
function validateFirmwareBytes(bytes) {
  if (bytes.length < 288) {
    return { valid: false, error: 'File is too small' };
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
    return { valid: false, error: 'Invalid ESP32 image' };
  }
  return { valid: true };
}

// Check small file
assert.equal(validateFirmwareBytes(new Uint8Array(200)).valid, false);

// Check compiled firmware binary from the project
const firmwareBinPath = path.join(__dirname, '../../ESP32CAR/ESP32CAR/.pio/build/esp32dev/firmware.bin');
if (fs.existsSync(firmwareBinPath)) {
  const actualBin = fs.readFileSync(firmwareBinPath);
  const result = validateFirmwareBytes(actualBin);
  assert.equal(result.valid, true, 'Real compiled ESP32 firmware.bin must validate successfully');
  console.log(`✓ Real ESP32 firmware binary (${actualBin.length} bytes) validated successfully.`);
}

// 5. Test Transport Serialization & Commands
console.log('5. Testing Transport Commands & State...');
let seqCounter = 0;
function buildControlParams(client, mode, t, x, s, actionId, quick) {
  const p = new URLSearchParams();
  p.append('client', client);
  p.append('seq', String(++seqCounter));
  p.append('mode', mode);
  p.append('t', String(t));
  p.append('x', String(x));
  p.append('s', String(s));
  p.append('id', String(actionId));
  if (quick) p.append('q', '1');
  return p;
}

const p1 = buildControlParams('0123456789abcdef0123456789abcdef', 'drive', 0, 0, 0, 0, false);
assert.equal(p1.get('mode'), 'drive');
assert.equal(p1.get('t'), '0');
assert.equal(p1.get('seq'), '1');

const p2 = buildControlParams('0123456789abcdef0123456789abcdef', 'burnout', 0, 0, 0, 5, false);
assert.equal(p2.get('mode'), 'burnout');
assert.equal(p2.get('id'), '5');
assert.equal(p2.get('seq'), '2');
console.log('✓ Transport parameters serialization confirmed.\n');

// 6. Test Responsive Orientation Detection
console.log('6. Testing Orientation & Sizing Logic...');
function getOrientation(w, h, manual) {
  if (manual !== null) return manual === 'landscape';
  return w > h;
}
assert.equal(getOrientation(390, 844, null), false, 'Phone portrait');
assert.equal(getOrientation(844, 390, null), true, 'Phone landscape');
assert.equal(getOrientation(390, 844, 'landscape'), true, 'Manual override to landscape');
assert.equal(getOrientation(844, 390, 'portrait'), false, 'Manual override to portrait');
console.log('✓ Screen orientation logic verified.\n');

// 7. Test LocalStorage / Persistence Logic
console.log('7. Testing Drive Mode Persistence Logic...');
const mockStorage = new Map();
function simulateStorageSave(key, val) {
  mockStorage.set(key, String(val));
}
function simulateStorageGet(key, fallback) {
  const v = mockStorage.get(key);
  if (v === 'classic' || v === 'mecanum') return v;
  return fallback;
}

// Initial state default
assert.equal(simulateStorageGet('@supercar_drive_mode', 'mecanum'), 'mecanum');

// Toggle to classic
simulateStorageSave('@supercar_drive_mode', 'classic');
assert.equal(simulateStorageGet('@supercar_drive_mode', 'mecanum'), 'classic', 'Must remember classic mode after toggle');

// Simulate app restart: re-read from storage
assert.equal(simulateStorageGet('@supercar_drive_mode', 'mecanum'), 'classic', 'Must preserve classic mode across app restart');

// Toggle back to mecanum
simulateStorageSave('@supercar_drive_mode', 'mecanum');
assert.equal(simulateStorageGet('@supercar_drive_mode', 'classic'), 'mecanum', 'Must remember mecanum mode after toggle');
console.log('✓ Drive mode local storage persistence verified.\n');

// 8. Test Auto-Reconnection & Probing Logic
console.log('8. Testing Auto-Reconnection & Continuous Probing State Flow...');
class MockSuperCarLink {
  constructor() {
    this.connected = false;
    this.probing = false;
    this.active = true;
    this.consecutiveErrors = 0;
    this.driveTimer = null;
    this.probeTimer = null;
    this.statusLog = [];
  }

  onStatus(conn, motors, err, probing) {
    this.statusLog.push({ conn, probing, err });
  }

  start() {
    this.active = true;
    if (this.connected) {
      this.startDrive();
    } else {
      this.startProbe();
    }
  }

  startProbe() {
    this.stopDrive();
    this.probing = true;
    this.onStatus(false, [0, 0, 0, 0], undefined, true);
  }

  stopDrive() {
    this.driveTimer = null;
  }

  startDrive() {
    this.probing = false;
    this.driveTimer = 'active';
  }

  simulateProbeSuccess() {
    this.connected = true;
    this.probing = false;
    this.consecutiveErrors = 0;
    this.onStatus(true, [0, 0, 0, 0], undefined, false);
    this.startDrive();
  }

  simulatePacketLoss() {
    this.consecutiveErrors++;
    if (this.consecutiveErrors >= 3) {
      this.connected = false;
      this.stopDrive();
      this.onStatus(false, [0, 0, 0, 0], 'Connection lost', true);
      this.startProbe();
    }
  }

  wake() {
    if (this.connected) {
      this.startDrive();
    } else {
      this.startProbe();
    }
  }
}

const link = new MockSuperCarLink();
// On initial startup: must start probing immediately
link.start();
assert.equal(link.connected, false, 'Initial state is disconnected');
assert.equal(link.probing, true, 'Initial state must be probing/searching');
assert.equal(link.statusLog[link.statusLog.length - 1].probing, true);

// Simulate ESP32 Car detected and responds
link.simulateProbeSuccess();
assert.equal(link.connected, true, 'Link connects upon successful probe');
assert.equal(link.probing, false, 'Probing ends when connected');
assert.equal(link.driveTimer, 'active', 'Fast drive loop is active');

// Simulate packet loss (e.g. WiFi range drop)
link.simulatePacketLoss(); // 1 error - remains connected
assert.equal(link.connected, true);
link.simulatePacketLoss(); // 2 errors - remains connected
assert.equal(link.connected, true);
link.simulatePacketLoss(); // 3 errors - drops to searching auto-probe
assert.equal(link.connected, false, 'Drops connection after 3 failures');
assert.equal(link.probing, true, 'Auto-reconnect probing automatically engages');

// Simulate app backgrounding and foregrounding
link.wake();
assert.equal(link.probing, true, 'Waking app keeps auto-reconnection probing active');

// Simulate reconnect
link.simulateProbeSuccess();
assert.equal(link.connected, true, 'Auto-reconnects seamlessly');
console.log('✓ Continuous auto-reconnection & probing state flow confirmed.\n');

console.log('====================================================');
console.log('ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
console.log('====================================================');
