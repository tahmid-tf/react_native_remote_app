import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
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

type MotorTuple = [number, number, number, number];
const ZERO_MOTORS: MotorTuple = [0, 0, 0, 0];

function sameMotors(a: MotorTuple, b: MotorTuple): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

export function useCarController() {
  const [hydrated, setHydrated] = useState<boolean>(false);
  const [isLiveMode, setIsLiveMode] = useState<boolean>(true);
  const [serverUrl, setServerUrl] = useState<string>('http://192.168.4.1');
  const [connected, setConnected] = useState<boolean>(false);
  const [probing, setProbing] = useState<boolean>(true);
  const [driveMode, setDriveMode] = useState<DriveMode>('mecanum');
  const [throttle, setThrottle] = useState<number>(0);
  const [strafe, setStrafe] = useState<number>(0);
  const [steering, setSteering] = useState<number>(0);
  const [action, setAction] = useState<ActionState | null>(null);
  const [quick, setQuick] = useState<QuickState | null>(null);
  const [maintenance, setMaintenance] = useState<boolean>(false);
  const [actualOutputs, setActualOutputs] = useState<MotorTuple>(ZERO_MOTORS);
  const [announcement, setAnnouncement] = useState<string>('Connecting to Super Car…');

  const actionCounterRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const quickAnimFrameRef = useRef<number | null>(null);
  const linkRef = useRef<SuperCarLink | null>(null);
  const idleModeRef = useRef<'drive' | 'stop'>('stop');
  // Mirrors of state that async callbacks (link status, timers) must read
  // synchronously, without depending on stale render closures.
  const connectedRef = useRef<boolean>(false);
  const maintenanceRef = useRef<boolean>(false);

  // Real-time multi-touch refs to prevent closure clobbering during simultaneous gestures
  const throttleRef = useRef<number>(0);
  const strafeRef = useRef<number>(0);
  const steeringRef = useRef<number>(0);
  const actionRef = useRef<ActionState | null>(null);
  const quickRef = useRef<QuickState | null>(null);

  const updateConnected = useCallback((next: boolean) => {
    connectedRef.current = next;
    setConnected(next);
  }, []);

  const triggerHaptic = useCallback((style: 'light' | 'medium' | 'heavy' = 'light') => {
    const impact =
      style === 'heavy'
        ? Haptics.ImpactFeedbackStyle.Heavy
        : style === 'medium'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light;
    // impactAsync returns a promise that rejects where haptics are unavailable (e.g. web);
    // a sync try/catch would not catch that rejection.
    Haptics.impactAsync(impact).catch(() => {});
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

  const cancelAnimations = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (quickAnimFrameRef.current !== null) {
      cancelAnimationFrame(quickAnimFrameRef.current);
      quickAnimFrameRef.current = null;
    }
  }, []);

  const stopAll = useCallback(
    (msg?: string, completed = false) => {
      cancelAnimations();

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
    [announce, cancelAnimations, isLiveMode]
  );

  // Cancel any running action / quick-move animation loops on unmount
  useEffect(() => cancelAnimations, [cancelAnimations]);

  /**
   * Applies the Live / Demo operating mode and resets the connection state that
   * goes with it. The transport link itself is managed by the effect below.
   */
  const applyLiveMode = useCallback(
    (live: boolean, url: string) => {
      stopAll();
      setIsLiveMode(live);
      if (live) {
        updateConnected(false);
        setProbing(true);
        announce(`Scanning for Super Car (${url})…`);
      } else {
        updateConnected(true);
        setProbing(false);
        setActualOutputs(ZERO_MOTORS);
        announce('Interactive demo mode active. Ready to drive.');
      }
    },
    [stopAll, updateConnected, announce]
  );

  // Restore persisted settings on startup. The live link is not created until
  // this finishes, so we never start probing a default URL that is about to change.
  useEffect(() => {
    let active = true;
    Promise.all([AppStorage.getDriveMode(), AppStorage.getServerUrl(), AppStorage.getIsLiveMode()])
      .then(([mode, savedUrl, savedLive]) => {
        if (!active) return;
        setDriveMode(mode);
        setServerUrl(savedUrl);
        applyLiveMode(savedLive, savedUrl);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
    // Mount-only: restoring settings must not re-run when callbacks change identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live transport lifecycle: one link per (live mode, server URL)
  useEffect(() => {
    if (!hydrated || !isLiveMode) return;

    const link = new SuperCarLink((conn, motors, err, isProbing) => {
      // Ignore late callbacks from a link that has been replaced or torn down
      if (linkRef.current !== link) return;

      setActualOutputs((prev) => (sameMotors(prev, motors) ? prev : motors));
      setProbing(!!isProbing);

      const wasConnected = connectedRef.current;
      if (conn === wasConnected) return;
      updateConnected(conn);

      if (!conn) {
        stopAll();
        if (maintenanceRef.current) {
          announce('Controls paused.');
        } else {
          triggerHaptic('heavy');
          announce(
            err === 'another controller is active'
              ? 'Another controller is active. Close it to take control.'
              : 'Connection lost · Auto-reconnecting…'
          );
        }
      } else {
        triggerHaptic('medium');
        announce('Connected to Super Car. Controls ready.');
      }
    }, serverUrl);

    linkRef.current = link;
    if (maintenanceRef.current) {
      link.setActive(false);
    } else {
      link.start();
    }

    return () => {
      // Detach first so the teardown status callback is ignored
      linkRef.current = null;
      link.setActive(false);
      link.stop();
    };
  }, [hydrated, isLiveMode, serverUrl, announce, stopAll, triggerHaptic, updateConnected]);

  // App lifecycle listener (resumes auto-probing on foreground, neutralizes on background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        const link = linkRef.current;
        if (link && isLiveMode && !maintenanceRef.current) {
          link.wake();
          if (!link.isConnected()) {
            setProbing(true);
            announce('Resumed: Scanning for Super Car…');
          }
        }
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        stopAll('App in background · Controls neutral.');
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isLiveMode, stopAll, announce]);

  // Pause / resume controls (e.g. while a firmware update is in progress)
  const updateMaintenance = useCallback(
    (paused: boolean) => {
      if (paused === maintenanceRef.current) return;
      maintenanceRef.current = paused;
      if (paused) stopAll('Controls paused.');
      setMaintenance(paused);
      linkRef.current?.setActive(!paused);
    },
    [stopAll]
  );

  const toggleConnection = useCallback(() => {
    triggerHaptic('light');
    if (isLiveMode) {
      if (connected) {
        announce(`Connected to Super Car (${serverUrl}). Live telemetry active.`);
      } else if (!maintenance) {
        setProbing(true);
        announce(`Searching for Super Car (${serverUrl})…`);
        linkRef.current?.probeNow();
      }
    } else {
      stopAll();
      const next = !connected;
      updateConnected(next);
      announce(
        next ? 'Demo link connected. Ready to drive.' : 'Demo link disconnected. All motor outputs stopped.'
      );
    }
  }, [isLiveMode, connected, maintenance, serverUrl, announce, stopAll, triggerHaptic, updateConnected]);

  const toggleDriveMode = useCallback(() => {
    if (!connected || maintenance) return;
    stopAll();
    const next: DriveMode = driveMode === 'mecanum' ? 'classic' : 'mecanum';
    setDriveMode(next);
    AppStorage.setDriveMode(next);
    triggerHaptic('medium');
    announce(
      next === 'classic'
        ? 'Classic mode. Right stick forward/back, left stick steers. Quick moves need mecanum mode.'
        : 'Mecanum mode. Right stick moves in any direction, left stick rotates.'
    );
  }, [connected, maintenance, driveMode, stopAll, announce, triggerHaptic]);

  // Movement Joystick (Throttle & Strafe)
  const setThrottleAndStrafe = useCallback(
    (forward: number, lateral = 0) => {
      if (!connected || maintenance || quickRef.current) return;
      const f = forward;
      const l = driveMode === 'classic' ? 0 : lateral;

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

      // Skip redundant React state dispatches if integer PWM values are identical
      if (newT === throttleRef.current && newX === strafeRef.current) return;

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

      // Skip redundant React state dispatches if integer PWM value is identical
      if (s === steeringRef.current) return;

      steeringRef.current = s;
      setSteering(s);
      sendTransportUpdate(actionRef.current, quickRef.current, throttleRef.current, strafeRef.current, s);
    },
    [connected, maintenance, sendTransportUpdate]
  );

  // Trigger Action (Burnout / Nitro)
  const startAction = useCallback(
    (name: ActionType): boolean => {
      if (!connected || maintenance || quickRef.current) return false;
      // Burnout may re-trigger / interrupt; nitro cannot interrupt a running action
      if (actionRef.current && name !== 'burnout') return false;

      // Only one action loop may run at a time: an orphaned loop would later
      // clear the new action early and could not be cancelled by stopAll().
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }

      const duration = name === 'burnout' ? 100 : 1000;
      const nextId = ++actionCounterRef.current;
      const start = nowMs();

      const newAction: ActionState = {
        name,
        start,
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
        if (actionRef.current?.id !== nextId) {
          animFrameRef.current = null;
          return;
        }
        const remaining = Math.max(0, 1 - (nowMs() - start) / duration);

        if (remaining <= 0) {
          animFrameRef.current = null;
          actionRef.current = null;
          setAction(null);
          sendTransportUpdate(null, null, throttleRef.current, strafeRef.current, steeringRef.current);
          announce('Action complete. Ready to drive.');
        } else {
          setAction((prev) => (prev && prev.id === nextId ? { ...prev, progress: remaining } : prev));
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

      const start = nowMs();
      const newQuick: QuickState = { name, start };
      quickRef.current = newQuick;
      setQuick(newQuick);
      triggerHaptic('light');
      announce(`${QUICK_NAMES[name] || name}: 80% PWM; hold to move, release to stop.`);

      const tick = () => {
        if (quickRef.current !== newQuick) {
          quickAnimFrameRef.current = null;
          return;
        }
        const phase = (nowMs() - start) / 1000;
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
    // Already stopped (e.g. emergency stop or link loss) — keep that announcement
    if (!quickRef.current) return;
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

  // Derive Drive State Text (Motor & maneuver telemetry only; connection state handled in TopBar)
  let driveStateText = 'STANDBY';
  if (maintenance) {
    driveStateText = 'PAUSED';
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

  const updateServerUrl = useCallback(
    (url: string) => {
      if (url === serverUrl) return;
      setServerUrl(url);
      AppStorage.setServerUrl(url);
      if (isLiveMode) {
        stopAll();
        updateConnected(false);
        setProbing(true);
        announce(`Scanning for Super Car (${url})…`);
      }
    },
    [serverUrl, isLiveMode, stopAll, updateConnected, announce]
  );

  const updateIsLiveMode = useCallback(
    (live: boolean) => {
      if (live === isLiveMode) return;
      applyLiveMode(live, serverUrl);
      AppStorage.setIsLiveMode(live);
    },
    [isLiveMode, serverUrl, applyLiveMode]
  );

  return {
    connected,
    probing,
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
    setMaintenance: updateMaintenance,
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
