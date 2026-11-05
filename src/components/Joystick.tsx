import React, { useRef, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

// ==========================================
// Rotation / Steering Joystick (Left - 1D)
// ==========================================

interface RotationJoystickProps {
  value: number; // -80 to 80
  onChange: (yaw: number) => void;
  disabled?: boolean;
  driveMode: 'mecanum' | 'classic';
  size?: number;
  compact?: boolean;
  gestureRef?: React.MutableRefObject<any>;
  simultaneousHandlers?: React.MutableRefObject<any>[];
}

export const RotationJoystick: React.FC<RotationJoystickProps> = ({
  value,
  onChange,
  disabled = false,
  driveMode,
  size = 160,
  compact = false,
  gestureRef,
  simultaneousHandlers,
}) => {
  const travel = size * 0.28;
  const knobAnimX = useRef(new Animated.Value(0)).current;
  const [engaged, setEngaged] = useState(false);
  const startOffset = useRef<number>(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const knobSize = size * 0.42;

  const panGesture = useMemo(() => {
    let g = Gesture.Pan()
      .minDistance(0)
      .minPointers(1)
      .maxPointers(1)
      .shouldCancelWhenOutside(false)
      .runOnJS(true);

    if (gestureRef) {
      g = g.withRef(gestureRef);
    }

    if (simultaneousHandlers && simultaneousHandlers.length > 0) {
      g = g.simultaneousWithExternalGesture(...simultaneousHandlers);
    }

    return g
      .enabled(!disabled)
      .onBegin((e) => {
        setEngaged(true);
        // e.x is relative to the well itself (exact center is size / 2)
        const rawDx = e.x - size / 2;
        // If thumb lands on/near the knob, anchor at center for smooth drag without jumping
        const startX = Math.abs(rawDx) < knobSize * 0.38 ? 0 : rawDx;
        startOffset.current = startX;
        const clampedDx = Math.max(-travel, Math.min(travel, startX));
        knobAnimX.setValue(clampedDx);
        onChangeRef.current(clampedDx / travel);
      })
      .onUpdate((e) => {
        const curX = startOffset.current + e.translationX;
        const clampedDx = Math.max(-travel, Math.min(travel, curX));
        knobAnimX.setValue(clampedDx);
        onChangeRef.current(clampedDx / travel);
      })
      .onFinalize(() => {
        setEngaged(false);
        Animated.spring(knobAnimX, {
          toValue: 0,
          friction: 7,
          tension: 100,
          useNativeDriver: true,
        }).start();
        onChangeRef.current(0);
      });
  }, [travel, size, knobSize, disabled, gestureRef, simultaneousHandlers]);

  const isClassic = driveMode === 'classic';
  const displayVal = Math.abs(value);
  let dirText = 'CENTERED';
  if (value > 0) dirText = isClassic ? 'RIGHT' : 'CLOCKWISE';
  else if (value < 0) dirText = isClassic ? 'LEFT' : 'COUNTER-CW';

  const isEngaged = engaged || value !== 0;

  return (
    <View style={[styles.panel, compact && styles.compactPanel, { width: '100%', maxWidth: size + 24 }]}>
      {/* Header */}
      <View style={styles.heading}>
        <Text style={styles.number}>01</Text>
        <Text style={[styles.title, compact && styles.compactText]}>
          {isClassic ? 'Steering' : 'Rotation'}
        </Text>
        <Text style={styles.axisLabel}>YAW</Text>
      </View>

      {/* Stick Area */}
      <View style={[styles.stickArea, { height: size + (compact ? 14 : 24) }]}>
        <Text style={[styles.directionLabel, styles.dirTop, compact && styles.compactDir]}>
          {isClassic ? 'STEER' : 'ROTATE'}
        </Text>

        <GestureDetector gesture={panGesture}>
          <View
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            // @ts-ignore
            style={[
              styles.well,
              { width: size, height: size, borderRadius: size / 2, touchAction: 'none', userSelect: 'none' },
              isEngaged && styles.wellEngagedBlue,
              disabled && styles.disabled,
            ]}>
            {/* Subtle axis track guide */}
            <View pointerEvents="none" style={styles.horizontalTrack} />
            <View pointerEvents="none" style={styles.crosshairH} />
            <View pointerEvents="none" style={styles.crosshairV} />

            {/* Knob */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.knob,
                {
                  width: knobSize,
                  height: knobSize,
                  borderRadius: knobSize / 2,
                  transform: [{ translateX: knobAnimX }],
                },
                isEngaged && styles.knobEngagedBlue,
              ]}>
              <View style={styles.knobInnerRow}>
                <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#9299a5" strokeWidth={2.2}>
                  <Path d="m15 18-6-6 6-6" />
                </Svg>
                <View style={styles.knobGrip} />
                <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#9299a5" strokeWidth={2.2}>
                  <Path d="m9 18 6-6-6-6" />
                </Svg>
              </View>
            </Animated.View>
          </View>
        </GestureDetector>

        <Text style={[styles.directionLabel, styles.dirBottom, compact && styles.compactDir]}>
          {isClassic ? 'LEFT / RIGHT' : 'CCW / CW'}
        </Text>
      </View>

      {/* Readout */}
      <View style={styles.readout}>
        <View style={styles.readoutRow}>
          <Text style={[styles.readoutName, compact && styles.compactReadoutName]}>{dirText}</Text>
          <Text style={[styles.readoutValue, compact && styles.compactReadoutValue]}>
            {displayVal}
            <Text style={styles.readoutUnit}>%</Text>
          </Text>
        </View>
        <View style={styles.levelTrack}>
          <View
            style={[
              styles.levelFill,
              styles.levelFillBlue,
              { width: `${(displayVal / 80) * 100}%` },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

// ==========================================
// Movement / Throttle Joystick (Right - 2D)
// ==========================================

interface MovementJoystickProps {
  throttle: number; // -80 to 80
  strafe: number; // -80 to 80
  onChange: (forward: number, lateral: number) => void;
  disabled?: boolean;
  driveMode: 'mecanum' | 'classic';
  size?: number;
  compact?: boolean;
  gestureRef?: React.MutableRefObject<any>;
  simultaneousHandlers?: React.MutableRefObject<any>[];
}

export const MovementJoystick: React.FC<MovementJoystickProps> = ({
  throttle,
  strafe,
  onChange,
  disabled = false,
  driveMode,
  size = 160,
  compact = false,
  gestureRef,
  simultaneousHandlers,
}) => {
  const travel = size * 0.28;
  const knobAnimX = useRef(new Animated.Value(0)).current;
  const knobAnimY = useRef(new Animated.Value(0)).current;
  const [engaged, setEngaged] = useState(false);
  const isClassic = driveMode === 'classic';

  const startOffsetX = useRef<number>(0);
  const startOffsetY = useRef<number>(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const knobSize = size * 0.42;

  const panGesture = useMemo(() => {
    let g = Gesture.Pan()
      .minDistance(0)
      .minPointers(1)
      .maxPointers(1)
      .shouldCancelWhenOutside(false)
      .runOnJS(true);

    if (gestureRef) {
      g = g.withRef(gestureRef);
    }

    if (simultaneousHandlers && simultaneousHandlers.length > 0) {
      g = g.simultaneousWithExternalGesture(...simultaneousHandlers);
    }

    const computeAndDispatch = (curX: number, curY: number) => {
      const rawDx = isClassic ? 0 : curX;
      const rawDy = curY; // upward is positive forward

      const dist = Math.hypot(rawDx, rawDy);
      const clampedDist = Math.min(travel, dist);
      const scale = dist > 0 ? clampedDist / dist : 0;

      const clampedX = rawDx * scale;
      const clampedY = rawDy * scale;

      knobAnimX.setValue(clampedX);
      knobAnimY.setValue(-clampedY);

      const normX = clampedX / travel;
      const normY = clampedY / travel;
      onChangeRef.current(normY, normX);
    };

    return g
      .enabled(!disabled)
      .onBegin((e) => {
        setEngaged(true);
        // e.x, e.y are relative to the well itself (exact center is size / 2, size / 2)
        const rawDx = isClassic ? 0 : e.x - size / 2;
        const rawDy = size / 2 - e.y;
        const distFromCenter = Math.hypot(rawDx, rawDy);

        // If thumb lands on/near the knob, anchor at center for smooth drag without jumping
        const startX = distFromCenter < knobSize * 0.38 ? 0 : rawDx;
        const startY = distFromCenter < knobSize * 0.38 ? 0 : rawDy;

        startOffsetX.current = startX;
        startOffsetY.current = startY;
        computeAndDispatch(startX, startY);
      })
      .onUpdate((e) => {
        const curX = startOffsetX.current + e.translationX;
        const curY = startOffsetY.current - e.translationY;
        computeAndDispatch(curX, curY);
      })
      .onFinalize(() => {
        setEngaged(false);
        Animated.parallel([
          Animated.spring(knobAnimX, {
            toValue: 0,
            friction: 7,
            tension: 100,
            useNativeDriver: true,
          }),
          Animated.spring(knobAnimY, {
            toValue: 0,
            friction: 7,
            tension: 100,
            useNativeDriver: true,
          }),
        ]).start();
        onChangeRef.current(0, 0);
      });
  }, [travel, size, knobSize, isClassic, disabled, gestureRef, simultaneousHandlers]);

  const componentMag = Math.round(Math.hypot(throttle, strafe));
  const displayVal = Math.min(80, componentMag);

  let dirText = 'NEUTRAL';
  const parts: string[] = [];
  if (throttle > 0) parts.push('FWD');
  else if (throttle < 0) parts.push('REV');
  if (strafe > 0) parts.push('RIGHT');
  else if (strafe < 0) parts.push('LEFT');
  if (parts.length > 0) dirText = parts.join(' · ');

  const isEngaged = engaged || throttle !== 0 || strafe !== 0;

  return (
    <View style={[styles.panel, compact && styles.compactPanel, { width: '100%', maxWidth: size + 24 }]}>
      {/* Header */}
      <View style={styles.heading}>
        <Text style={styles.number}>02</Text>
        <Text style={[styles.title, compact && styles.compactText]}>
          {isClassic ? 'Forward / back' : 'Movement'}
        </Text>
        <Text style={styles.axisLabel}>{isClassic ? 'Y AXIS' : 'X / Y'}</Text>
      </View>

      {/* Stick Area */}
      <View style={[styles.stickArea, { height: size + (compact ? 14 : 24) }]}>
        <Text style={[styles.directionLabel, styles.dirTop, compact && styles.compactDir]}>FORWARD</Text>
        {!isClassic && (
          <>
            <Text style={[styles.directionLabel, styles.dirLeft, compact && styles.compactDir]}>LEFT</Text>
            <Text style={[styles.directionLabel, styles.dirRight, compact && styles.compactDir]}>RIGHT</Text>
          </>
        )}

        <GestureDetector gesture={panGesture}>
          <View
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            // @ts-ignore
            style={[
              styles.well,
              { width: size, height: size, borderRadius: size / 2, touchAction: 'none', userSelect: 'none' },
              isEngaged && styles.wellEngagedOrange,
              disabled && styles.disabled,
            ]}>
            <View pointerEvents="none" style={styles.crosshairH} />
            <View pointerEvents="none" style={styles.crosshairV} />
            {isClassic && <View pointerEvents="none" style={styles.verticalTrack} />}

            {/* Knob */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.knob,
                {
                  width: knobSize,
                  height: knobSize,
                  borderRadius: knobSize / 2,
                  transform: [
                    { translateX: knobAnimX },
                    { translateY: knobAnimY },
                  ],
                },
                isEngaged && styles.knobEngagedOrange,
              ]}>
              <View style={styles.knobInner}>
                {isClassic ? (
                  <View style={styles.knobClassicCol}>
                    <Svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#9299a5" strokeWidth={2.4}>
                      <Path d="m18 15-6-6-6 6" />
                    </Svg>
                    <View style={styles.knobGripH} />
                    <Svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#9299a5" strokeWidth={2.4}>
                      <Path d="m6 9 6 6 6-6" />
                    </Svg>
                  </View>
                ) : (
                  <>
                    <View style={styles.knobCrosshair} />
                    <View style={styles.knobDot} />
                  </>
                )}
              </View>
            </Animated.View>
          </View>
        </GestureDetector>

        <Text style={[styles.directionLabel, styles.dirBottom, compact && styles.compactDir]}>REVERSE</Text>
      </View>

      {/* Readout */}
      <View style={styles.readout}>
        <View style={styles.readoutRow}>
          <Text style={[styles.readoutName, compact && styles.compactReadoutName]}>{dirText}</Text>
          <Text style={[styles.readoutValue, compact && styles.compactReadoutValue]}>
            {displayVal}
            <Text style={styles.readoutUnit}>%</Text>
          </Text>
        </View>
        <View style={styles.levelTrack}>
          <View
            style={[
              styles.levelFill,
              styles.levelFillOrange,
              { width: `${(displayVal / 80) * 100}%` },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#16181c',
    borderWidth: 1,
    borderColor: '#26292f',
    borderRadius: 14,
    padding: 8,
    alignItems: 'center',
    marginVertical: 2,
    alignSelf: 'center',
  },
  compactPanel: {
    paddingVertical: 5,
    paddingHorizontal: 6,
    marginVertical: 1,
    borderRadius: 12,
  },
  heading: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  number: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: '#555b66',
    fontWeight: '700',
  },
  title: {
    fontSize: 10,
    fontWeight: '700',
    color: '#e2e5ea',
    letterSpacing: 0.3,
  },
  compactText: {
    fontSize: 9,
  },
  axisLabel: {
    fontSize: 8,
    fontFamily: 'monospace',
    color: '#6c7482',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  stickArea: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
  },
  directionLabel: {
    position: 'absolute',
    fontSize: 7.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#555d69',
  },
  compactDir: {
    fontSize: 6.5,
    letterSpacing: 0.5,
  },
  dirTop: {
    top: 0,
  },
  dirBottom: {
    bottom: 0,
  },
  dirLeft: {
    left: 0,
  },
  dirRight: {
    right: 0,
  },
  well: {
    backgroundColor: '#1b1d22',
    borderWidth: 2,
    borderColor: '#2a2e36',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  wellEngagedBlue: {
    borderColor: 'rgba(110, 168, 255, 0.45)',
    backgroundColor: '#141820',
  },
  wellEngagedOrange: {
    borderColor: 'rgba(255, 104, 75, 0.45)',
    backgroundColor: '#1f1715',
  },
  disabled: {
    opacity: 0.4,
  },
  crosshairH: {
    position: 'absolute',
    width: '84%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  crosshairV: {
    position: 'absolute',
    width: 1,
    height: '84%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  horizontalTrack: {
    position: 'absolute',
    width: '68%',
    height: 2,
    backgroundColor: 'rgba(110, 168, 255, 0.1)',
    borderRadius: 1,
  },
  verticalTrack: {
    position: 'absolute',
    width: 2,
    height: '68%',
    backgroundColor: 'rgba(255, 104, 75, 0.1)',
    borderRadius: 1,
  },
  knob: {
    backgroundColor: '#262930',
    borderWidth: 2,
    borderColor: '#3c414c',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  knobEngagedBlue: {
    borderColor: '#6ea8ff',
    backgroundColor: '#1a2434',
    shadowColor: '#6ea8ff',
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  knobEngagedOrange: {
    borderColor: '#ff684b',
    backgroundColor: '#301c18',
    shadowColor: '#ff684b',
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  knobInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  knobInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  knobGrip: {
    width: 3,
    height: 12,
    borderRadius: 1.5,
    backgroundColor: '#6c7482',
  },
  knobClassicCol: {
    alignItems: 'center',
    gap: 3,
  },
  knobGripH: {
    width: 12,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#6c7482',
  },
  knobCrosshair: {
    position: 'absolute',
    width: 14,
    height: 1,
    backgroundColor: '#5a6270',
  },
  knobDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9299a5',
  },
  readout: {
    width: '100%',
    marginTop: 6,
  },
  readoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  readoutName: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#8b94a2',
    letterSpacing: 0.4,
  },
  compactReadoutName: {
    fontSize: 7.5,
  },
  readoutValue: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#f0f3f8',
  },
  compactReadoutValue: {
    fontSize: 9,
  },
  readoutUnit: {
    fontSize: 7.5,
    color: '#717a88',
  },
  levelTrack: {
    height: 3,
    backgroundColor: '#202227',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  levelFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  levelFillBlue: {
    backgroundColor: '#6ea8ff',
  },
  levelFillOrange: {
    backgroundColor: '#ff684b',
  },
});
