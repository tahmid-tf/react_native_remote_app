import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  GestureResponderEvent,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

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
}

export const RotationJoystick: React.FC<RotationJoystickProps> = ({
  value,
  onChange,
  disabled = false,
  driveMode,
  size = 160,
  compact = false,
}) => {
  const travel = size * 0.26;
  const knobAnimX = useRef(new Animated.Value(0)).current;
  const activeTouchId = useRef<number | null>(null);
  const startX = useRef<number>(0);
  const [engaged, setEngaged] = useState(false);

  const onTouchStart = (e: GestureResponderEvent) => {
    if (disabled || activeTouchId.current !== null) return;
    const touch = e.nativeEvent;
    activeTouchId.current = touch.identifier;
    startX.current = touch.pageX;
    setEngaged(true);
    handleMove(touch.pageX);
  };

  const onTouchMove = (e: GestureResponderEvent) => {
    if (activeTouchId.current === null) return;
    const touches = e.nativeEvent.touches;
    const touch = Array.from(touches).find(
      (t) => t.identifier === activeTouchId.current
    );
    if (touch) {
      handleMove(touch.pageX);
    }
  };

  const handleMove = (currentX: number) => {
    const rawDx = currentX - startX.current;
    const clampedDx = Math.max(-travel, Math.min(travel, rawDx));
    knobAnimX.setValue(clampedDx);
    const normalized = clampedDx / travel;
    onChange(normalized);
  };

  const onTouchEnd = (e: GestureResponderEvent) => {
    const ended = Array.from(e.nativeEvent.changedTouches).some(
      (t) => t.identifier === activeTouchId.current
    );
    if (ended || e.nativeEvent.touches.length === 0) {
      activeTouchId.current = null;
      setEngaged(false);
      Animated.spring(knobAnimX, {
        toValue: 0,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }).start();
      onChange(0);
    }
  };

  const isClassic = driveMode === 'classic';
  const displayVal = Math.abs(value);
  let dirText = 'CENTERED';
  if (value > 0) dirText = isClassic ? 'RIGHT' : 'CLOCKWISE';
  else if (value < 0) dirText = isClassic ? 'LEFT' : 'COUNTER-CW';

  const knobSize = size * 0.44;
  const isEngaged = engaged || value !== 0;

  return (
    <View style={[styles.panel, { width: size }]}>
      {/* Header */}
      <View style={styles.heading}>
        <Text style={styles.number}>01</Text>
        <Text style={[styles.title, compact && styles.compactText]}>
          {isClassic ? 'Steering' : 'Rotation'}
        </Text>
        <Text style={styles.axisLabel}>YAW</Text>
      </View>

      {/* Stick Area */}
      <View style={[styles.stickArea, { height: size + (compact ? 18 : 26) }]}>
        <Text style={[styles.directionLabel, styles.dirTop, compact && styles.compactDir]}>
          {isClassic ? 'STEER' : 'ROTATE'}
        </Text>

        <View
          style={[
            styles.well,
            { width: size, height: size, borderRadius: size / 2 },
            isEngaged && styles.wellEngagedBlue,
            disabled && styles.disabled,
          ]}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}>
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
}

export const MovementJoystick: React.FC<MovementJoystickProps> = ({
  throttle,
  strafe,
  onChange,
  disabled = false,
  driveMode,
  size = 160,
  compact = false,
}) => {
  const travel = size * 0.26;
  const knobAnimX = useRef(new Animated.Value(0)).current;
  const knobAnimY = useRef(new Animated.Value(0)).current;
  const activeTouchId = useRef<number | null>(null);
  const startX = useRef<number>(0);
  const startY = useRef<number>(0);
  const [engaged, setEngaged] = useState(false);
  const isClassic = driveMode === 'classic';

  const onTouchStart = (e: GestureResponderEvent) => {
    if (disabled || activeTouchId.current !== null) return;
    const touch = e.nativeEvent;
    activeTouchId.current = touch.identifier;
    startX.current = touch.pageX;
    startY.current = touch.pageY;
    setEngaged(true);
    handleMove(touch.pageX, touch.pageY);
  };

  const onTouchMove = (e: GestureResponderEvent) => {
    if (activeTouchId.current === null) return;
    const touches = e.nativeEvent.touches;
    const touch = Array.from(touches).find(
      (t) => t.identifier === activeTouchId.current
    );
    if (touch) {
      handleMove(touch.pageX, touch.pageY);
    }
  };

  const handleMove = (curX: number, curY: number) => {
    const rawDx = isClassic ? 0 : curX - startX.current;
    const rawDy = startY.current - curY; // upward is positive forward

    const dist = Math.hypot(rawDx, rawDy);
    const clampedDist = Math.min(travel, dist);
    const scale = dist > 0 ? clampedDist / dist : 0;

    const clampedX = rawDx * scale;
    const clampedY = rawDy * scale;

    knobAnimX.setValue(clampedX);
    knobAnimY.setValue(-clampedY);

    const normX = clampedX / travel;
    const normY = clampedY / travel;
    onChange(normY, normX);
  };

  const onTouchEnd = (e: GestureResponderEvent) => {
    const ended = Array.from(e.nativeEvent.changedTouches).some(
      (t) => t.identifier === activeTouchId.current
    );
    if (ended || e.nativeEvent.touches.length === 0) {
      activeTouchId.current = null;
      setEngaged(false);
      Animated.parallel([
        Animated.spring(knobAnimX, {
          toValue: 0,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.spring(knobAnimY, {
          toValue: 0,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
      onChange(0, 0);
    }
  };

  const componentMag = Math.round(Math.hypot(throttle, strafe));
  const displayVal = Math.min(80, componentMag);

  let dirText = 'NEUTRAL';
  const parts: string[] = [];
  if (throttle > 0) parts.push('FWD');
  else if (throttle < 0) parts.push('REV');
  if (strafe > 0) parts.push('RIGHT');
  else if (strafe < 0) parts.push('LEFT');
  if (parts.length > 0) dirText = parts.join(' · ');

  const knobSize = size * 0.44;
  const isEngaged = engaged || throttle !== 0 || strafe !== 0;

  return (
    <View style={[styles.panel, { width: size }]}>
      {/* Header */}
      <View style={styles.heading}>
        <Text style={styles.number}>02</Text>
        <Text style={[styles.title, compact && styles.compactText]}>
          {isClassic ? 'Forward / back' : 'Movement'}
        </Text>
        <Text style={styles.axisLabel}>{isClassic ? 'Y AXIS' : 'X / Y'}</Text>
      </View>

      {/* Stick Area */}
      <View style={[styles.stickArea, { height: size + (compact ? 18 : 26) }]}>
        <Text style={[styles.directionLabel, styles.dirTop, compact && styles.compactDir]}>FORWARD</Text>
        {!isClassic && (
          <>
            <Text style={[styles.directionLabel, styles.dirLeft, compact && styles.compactDir]}>LEFT</Text>
            <Text style={[styles.directionLabel, styles.dirRight, compact && styles.compactDir]}>RIGHT</Text>
          </>
        )}

        <View
          style={[
            styles.well,
            { width: size, height: size, borderRadius: size / 2 },
            isEngaged && styles.wellEngagedOrange,
            disabled && styles.disabled,
          ]}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}>
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
                <Text style={styles.verticalArrowGlyph}>↕</Text>
              ) : (
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#b3bdcc" strokeWidth={2}>
                  <Path d="M12 2v20M2 12h20m-13-7 3-3 3 3m-6 14 3 3 3-3M5 9l-3 3 3 3m14-6 3 3-3 3" />
                </Svg>
              )}
            </View>
          </Animated.View>
        </View>

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
        <Text style={[styles.motionComponents, compact && styles.compactMotionText]}>
          FWD {throttle}% · SIDE {strafe}%
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    alignItems: 'stretch',
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  number: {
    fontFamily: 'monospace',
    color: '#646a74',
    fontSize: 9,
    fontWeight: '700',
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: '#eceef0',
  },
  compactText: {
    fontSize: 10,
  },
  axisLabel: {
    marginLeft: 'auto',
    fontSize: 7,
    letterSpacing: 1.2,
    color: '#646a74',
    fontWeight: '600',
  },
  stickArea: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionLabel: {
    position: 'absolute',
    fontSize: 6.5,
    letterSpacing: 1.2,
    color: '#777e8a',
    fontWeight: '700',
  },
  compactDir: {
    fontSize: 5.5,
  },
  dirTop: {
    top: 2,
  },
  dirBottom: {
    bottom: 2,
  },
  dirLeft: {
    left: 0,
    top: '50%',
    transform: [{ translateY: -5 }],
  },
  dirRight: {
    right: 0,
    top: '50%',
    transform: [{ translateY: -5 }],
  },
  well: {
    backgroundColor: '#121418',
    borderWidth: 1.5,
    borderColor: '#373b44',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  wellEngagedOrange: {
    borderColor: 'rgba(255, 104, 75, 0.6)',
    backgroundColor: '#1a1413',
  },
  wellEngagedBlue: {
    borderColor: 'rgba(110, 168, 255, 0.6)',
    backgroundColor: '#121722',
  },
  disabled: {
    opacity: 0.45,
  },
  crosshairH: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 1,
    backgroundColor: '#252932',
  },
  crosshairV: {
    position: 'absolute',
    top: 10,
    bottom: 10,
    width: 1,
    backgroundColor: '#252932',
  },
  horizontalTrack: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#343943',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 6,
  },
  verticalTrack: {
    position: 'absolute',
    top: 12,
    bottom: 12,
    width: 20,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#343943',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 6,
  },
  knob: {
    backgroundColor: '#2c313a',
    borderWidth: 1.5,
    borderColor: '#535964',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
  },
  knobEngagedOrange: {
    borderColor: '#ff684b',
    shadowColor: '#ff684b',
    shadowOpacity: 0.5,
  },
  knobEngagedBlue: {
    borderColor: '#6ea8ff',
    shadowColor: '#6ea8ff',
    shadowOpacity: 0.5,
  },
  knobInner: {
    width: '84%',
    height: '84%',
    borderRadius: 999,
    backgroundColor: '#22252b',
    borderWidth: 1,
    borderColor: '#15171c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  knobInnerRow: {
    width: '84%',
    height: '84%',
    borderRadius: 999,
    backgroundColor: '#22252b',
    borderWidth: 1,
    borderColor: '#15171c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  knobGrip: {
    width: 5,
    height: 12,
    backgroundColor: '#757d8b',
    opacity: 0.5,
    borderRadius: 2,
  },
  verticalArrowGlyph: {
    fontSize: 18,
    color: '#b3bdcc',
    lineHeight: 20,
  },
  readout: {
    marginTop: 4,
    paddingHorizontal: 2,
  },
  readoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  readoutName: {
    fontSize: 8,
    letterSpacing: 1.2,
    color: '#8b929e',
    fontWeight: '700',
  },
  compactReadoutName: {
    fontSize: 7,
  },
  readoutValue: {
    fontSize: 18,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#eceef0',
  },
  compactReadoutValue: {
    fontSize: 15,
  },
  readoutUnit: {
    fontSize: 9,
    color: '#818895',
  },
  levelTrack: {
    height: 3,
    backgroundColor: '#2c3038',
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  levelFill: {
    height: '100%',
    borderRadius: 2,
  },
  levelFillOrange: {
    backgroundColor: '#ff684b',
  },
  levelFillBlue: {
    backgroundColor: '#6ea8ff',
  },
  motionComponents: {
    color: '#798493',
    fontFamily: 'monospace',
    fontSize: 6.5,
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 2,
  },
  compactMotionText: {
    fontSize: 5.5,
  },
});
