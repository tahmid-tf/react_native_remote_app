import { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { SuperCarLink, CarCommand } from '@/services/transport';
import { AppStorage } from '@/services/storage';

export type DriveMode = 'mecanum' | 'classic';
export type ActionType = 'burnout' | 'nitro';

export interface ActionState {
  name: ActionType;
  start: number;
  duration: number;
  id: number;
  progress: number; // 1 to 0
}

export interface QuickState {
  name: string;
  start: number;
}

export const QUICK_NAMES: Record<string, string> = {
  orbit: 'Orbit',
  diagonal: 'Diagonal dash',
  shuffle: 'Side shuffle',
  eight: 'Figure eight',
  pivot: 'Corner pivot',
  dance: 'Dance',
};

export function signedRound(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

export function magnitude(value: number): number {
  const amount = Math.abs(value);
  return amount < 0.07 ? 0 : Math.sign(value) * Math.round(40 + ((amount - 0.07) / 0.93) * 40);
}

export function calculateMotorOutputs(
  connected: boolean,
  maintenance: boolean,
  isLive: boolean,
  actualOutputs: [number, number, number, number],
  action: ActionState | null,
  quick: QuickState | null,
  throttle: number,
  strafe: number,
  steering: number
): [number, number, number, number] {
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
  }) as [number, number, number, number];
}

export function useCarController() {
  const [isLiveMode, setIsLiveMode] = useState<boolean>(true);
  const [serverUrl, setServerUrl] = useState<string>('http://192.168.4.1');
  const [connected, setConnected] = useState<boolean>(false);
  const [driveMode, setDriveMode] = useState<DriveMode>('mecanum');
  const [throttle, setThrottle] = useState<number>(0);
  const [strafe, setStrafe] = useState<number>(0);
  const [steering, setSteering] = useState<number>(0);
  const [action, setAction] = useState<ActionState | null>(null);
  const [quick, setQuick] = useState<QuickState | null>(null);
  const [maintenance, setMaintenance] = useState<boolean>(false);
  const [actualOutputs, setActualOutputs] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [announcement, setAnnouncement] = useState<string>('Connecting to Super Car (192.168.4.1)…');

  const actionCounterRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const quickAnimFrameRef = useRef<number | null>(null);
  const linkRef = useRef<SuperCarLink | null>(null);
  const idleModeRef = useRef<'drive' | 'stop'>('stop');

  // Real-time multi-touch refs to prevent closure clobbering during simultaneous gestures
  const throttleRef = useRef<number>(0);
  const strafeRef = useRef<number>(0);
  const steeringRef = useRef<number>(0);
  const actionRef = useRef<ActionState | null>(null);
  const quickRef = useRef<QuickState | null>(null);

  // Restore persisted settings from storage on startup
  useEffect(() => {
    let active = true;
    AppStorage.getDriveMode().then((mode) => {
      if (active && mode) {
        setDriveMode(mode);
      }
    });
    AppStorage.getServerUrl().then((savedUrl) => {
      if (active && savedUrl) {
        setServerUrl(savedUrl);
      }
    });
    AppStorage.getIsLiveMode().then((savedLive) => {
      if (active && typeof savedLive === 'boolean') {
        setIsLiveMode(savedLive);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const triggerHaptic = useCallback((style: 'light' | 'medium' | 'heavy' = 'light') => {
    try {
      if (style === 'heavy') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      else if (style === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  }, []);

  const announce = useCallback((msg: string) => {
    setAnnouncement(msg);
  }, []);

  // Update transport
  const sendTransportUpdate = useCallback(
    (curAction: ActionState | null, curQuick: QuickState | null, t: number, x: number, s: number) => {
      if (!linkRef.current || !isLiveMode) return;
      const isMoving = t !== 0 || x !== 0 || s !== 0;
      const mode = curAction?.name || (isMoving ? 'drive' : idleModeRef.current);
      const payload: CarCommand = {
        mode,
        t,
        x,
        s,
        id: curAction?.id || 0,
        ...(curQuick ? { q: 1 } : {}),
      };
      linkRef.current.update(payload);
    },
    [isLiveMode]
  );

  const stopAll = useCallback(
    (msg?: string, completed = false) => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (quickAnimFrameRef.current) {
        cancelAnimationFrame(quickAnimFrameRef.current);
        quickAnimFrameRef.current = null;
      }

      setQuick(null);
      quickRef.current = null;
      setAction(null);
      actionRef.current = null;
      idleModeRef.current = completed ? 'drive' : 'stop';
      throttleRef.current = 0;
      strafeRef.current = 0;
      steeringRef.current = 0;
      setThrottle(0);
      setStrafe(0);
      setSteering(0);

      if (linkRef.current && isLiveMode) {
        linkRef.current.update({
          mode: idleModeRef.current,
          t: 0,
          x: 0,
          s: 0,
          id: 0,
        });
      }

      if (msg) announce(msg);
    },
    [announce, isLiveMode]
  );

  // Switch Live / Demo Mode
  useEffect(() => {
    if (isLiveMode) {
      setConnected(false);
      announce('Connecting to Super Car…');
      const link = new SuperCarLink((conn, motors, err) => {
        setActualOutputs(motors);
        setConnected((wasConn) => {
          if (!conn) {
            stopAll();
            if (wasConn || err) {
              announce(
                err === 'another controller is active'
                  ? 'Another controller tab is active. Close it to take control.'
                  : 'Connection lost. Motors stop automatically; reconnecting at neutral.'
              );
            }
          } else if (!wasConn) {
            announce('Connected to Super Car. Controls ready.');
          }
          return conn;
        });
      }, serverUrl);

      linkRef.current = link;
      link.start();

      return () => {
        link.setActive(false);
        link.stop();
        linkRef.current = null;
      };
    } else {
      if (linkRef.current) {
        linkRef.current.setActive(false);
        linkRef.current.stop();
        linkRef.current = null;
      }
      setConnected(true);
      setActualOutputs([0, 0, 0, 0]);
      announce('Interactive demo mode active. Ready to drive.');
    }
  }, [isLiveMode, serverUrl, announce, stopAll]);

  // Handle Maintenance state changes
  useEffect(() => {
    if (maintenance) {
      stopAll('Controls paused.');
      if (linkRef.current) linkRef.current.setActive(false);
    } else {
      if (linkRef.current) linkRef.current.setActive(true);
    }
  }, [maintenance, stopAll]);

  const toggleConnection = useCallback(() => {
    if (isLiveMode) {
      if (connected) {
        announce('Connected to Super Car. Command readouts show live PWM.');
      } else {
        announce('Connecting to Super Car (192.168.4.1)…');
        if (linkRef.current) {
          linkRef.current.setActive(true);
          linkRef.current.send();
        }
      }
    } else {
      stopAll();
      setConnected((c) => {
        const next = !c;
        announce(next ? 'Demo link connected. Ready to drive.' : 'Demo link disconnected. All motor outputs stopped.');
        return next;
      });
    }
  }, [isLiveMode, connected, announce, stopAll]);

  const toggleDriveMode = useCallback(() => {
    if (!connected || maintenance) return;
    stopAll();
    setDriveMode((prev) => {
      const next = prev === 'mecanum' ? 'classic' : 'mecanum';
      AppStorage.setDriveMode(next);
      triggerHaptic('medium');
      announce(
        next === 'classic'
          ? 'Classic mode. Right stick forward/back, left stick steers. Quick moves need mecanum mode.'
          : 'Mecanum mode. Right stick moves in any direction, left stick rotates.'
      );
      return next;
    });
  }, [connected, maintenance, stopAll, announce, triggerHaptic]);

  // Movement Joystick (Throttle & Strafe)
  const setThrottleAndStrafe = useCallback(
    (forward: number, lateral = 0) => {
      if (!connected || maintenance || quickRef.current) return;
      let f = forward;
      let l = driveMode === 'classic' ? 0 : lateral;

      let newT = 0;
      let newX = 0;

      if (driveMode === 'classic') {
        newT = magnitude(Math.max(-1, Math.min(1, f)));
        newX = 0;
      } else {
        const length = Math.hypot(f, l);
        const radius = Math.min(1, length);
        const strength = magnitude(radius);
        newT = length ? signedRound((f / length) * strength) : 0;
        newX = length ? signedRound((l / length) * strength) : 0;
      }

      throttleRef.current = newT;
      strafeRef.current = newX;
      setThrottle(newT);
      setStrafe(newX);
      sendTransportUpdate(actionRef.current, quickRef.current, newT, newX, steeringRef.current);
    },
    [connected, maintenance, driveMode, sendTransportUpdate]
  );

  // Rotation / Steering Joystick
  const setSteeringInput = useCallback(
    (yaw: number) => {
      if (!connected || maintenance || quickRef.current) return;
      const clamped = Math.max(-1, Math.min(1, yaw));
      const s = magnitude(clamped);
      steeringRef.current = s;
      setSteering(s);
      sendTransportUpdate(actionRef.current, quickRef.current, throttleRef.current, strafeRef.current, s);
    },
    [connected, maintenance, sendTransportUpdate]
  );

  // Trigger Action (Burnout / Nitro)
  const startAction = useCallback(
    (name: ActionType): boolean => {
      if (!connected || maintenance || (actionRef.current && name !== 'burnout')) return false;

      const duration = name === 'burnout' ? 100 : 1000;
      const nextId = ++actionCounterRef.current;
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

      const newAction: ActionState = {
        name,
        start: now,
        duration,
        id: nextId,
        progress: 1,
      };

      actionRef.current = newAction;
      setAction(newAction);
      triggerHaptic(name === 'burnout' ? 'heavy' : 'medium');
      announce(
        name === 'burnout'
          ? 'Burnout: all four motors forward at 100% for 0.1 seconds.'
          : 'Nitro: all four motors at 100% for 1 second.'
      );

      sendTransportUpdate(newAction, null, throttleRef.current, strafeRef.current, steeringRef.current);

      const tick = () => {
        const currentNow = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const elapsed = currentNow - now;
        const remaining = Math.max(0, 1 - elapsed / duration);

        if (remaining <= 0) {
          actionRef.current = null;
          setAction(null);
          sendTransportUpdate(null, null, throttleRef.current, strafeRef.current, steeringRef.current);
          announce('Action complete. Ready to drive.');
        } else {
          setAction((prev) => (prev ? { ...prev, progress: remaining } : null));
          animFrameRef.current = requestAnimationFrame(tick);
        }
      };

      animFrameRef.current = requestAnimationFrame(tick);
      return true;
    },
    [connected, maintenance, triggerHaptic, announce, sendTransportUpdate]
  );

  // Trigger Quick Moves Presets
  const startQuick = useCallback(
    (name: string): boolean => {
      if (!connected || maintenance || actionRef.current || quickRef.current || driveMode !== 'mecanum') return false;
      stopAll();

      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const newQuick: QuickState = { name, start: now };
      quickRef.current = newQuick;
      setQuick(newQuick);
      triggerHaptic('light');
      announce(`${QUICK_NAMES[name] || name}: 80% PWM; hold to move, release to stop.`);

      const tick = () => {
        const currentNow = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const phase = (currentNow - now) / 1000;
        let t = 0;
        let x = 0;
        let s = 0;

        switch (name) {
          case 'orbit':
            x = 35;
            s = 35;
            break;
          case 'diagonal':
            t = 40;
            x = 40;
            break;
          case 'shuffle':
            x = 50 * Math.cos(phase * Math.PI);
            break;
          case 'eight':
            t = 35;
            s = Math.floor(phase / 2) % 2 ? -35 : 35;
            break;
          case 'pivot':
            t = 20;
            x = 20;
            s = 40;
            break;
          case 'dance':
            x = 40 * Math.cos(phase * Math.PI);
            s = 25 * Math.sin(phase * Math.PI);
            break;
        }

        const signedT = signedRound(t);
        const signedX = signedRound(x);
        const signedS = signedRound(s);

        throttleRef.current = signedT;
        strafeRef.current = signedX;
        steeringRef.current = signedS;
        setThrottle(signedT);
        setStrafe(signedX);
        setSteering(signedS);
        sendTransportUpdate(null, newQuick, signedT, signedX, signedS);

        quickAnimFrameRef.current = requestAnimationFrame(tick);
      };

      quickAnimFrameRef.current = requestAnimationFrame(tick);
      return true;
    },
    [connected, maintenance, driveMode, stopAll, triggerHaptic, announce, sendTransportUpdate]
  );

  const stopQuick = useCallback(() => {
    quickRef.current = null;
    stopAll('Quick move released. Controls neutral.');
  }, [stopAll]);

  // Compute live motor outputs
  const motorOutputs = calculateMotorOutputs(
    connected,
    maintenance,
    isLiveMode,
    actualOutputs,
    action,
    quick,
    throttle,
    strafe,
    steering
  );

  const isMoving = motorOutputs.some((v) => v !== 0);

  // Derive Drive State Text
  let driveStateText = 'STANDBY';
  if (maintenance) {
    driveStateText = 'CONTROLS PAUSED';
  } else if (!connected) {
    driveStateText = 'NO CONNECTION';
  } else if (action) {
    driveStateText = action.name === 'burnout' ? 'BURNOUT' : 'NITRO BOOST';
  } else if (quick) {
    driveStateText = `${(QUICK_NAMES[quick.name] || quick.name).toUpperCase()} · 80% PWM`;
  } else if (isMoving) {
    if (steering && (throttle || strafe)) driveStateText = 'MOVE + ROTATE';
    else if (steering) driveStateText = 'ROTATING';
    else if (throttle && strafe) driveStateText = 'DIAGONAL';
    else if (strafe > 0) driveStateText = 'CRAB RIGHT';
    else if (strafe < 0) driveStateText = 'CRAB LEFT';
    else if (throttle < 0) driveStateText = 'REVERSING';
    else driveStateText = 'DRIVING';
  }

  const updateServerUrl = useCallback((url: string) => {
    setServerUrl(url);
    AppStorage.setServerUrl(url);
  }, []);

  const updateIsLiveMode = useCallback((live: boolean) => {
    setIsLiveMode(live);
    AppStorage.setIsLiveMode(live);
  }, []);

  return {
    connected,
    isLiveMode,
    setIsLiveMode: updateIsLiveMode,
    serverUrl,
    setServerUrl: updateServerUrl,
    driveMode,
    toggleDriveMode,
    throttle,
    strafe,
    steering,
    motorOutputs,
    isMoving,
    driveStateText,
    action,
    quick,
    maintenance,
    setMaintenance,
    announcement,
    setThrottleAndStrafe,
    setSteeringInput,
    startAction,
    startQuick,
    stopQuick,
    stopAll,
    toggleConnection,
    triggerHaptic,
  };
}
