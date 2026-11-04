import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Rect,
  G,
} from 'react-native-svg';

interface CarStageProps {
  outputs: [number, number, number, number];
  throttle: number;
  strafe: number;
  steering: number;
  action: { name: 'burnout' | 'nitro' } | null;
  isLive: boolean;
  compact?: boolean;
}

export const CarStage: React.FC<CarStageProps> = ({
  outputs,
  throttle,
  strafe,
  steering,
  action,
  isLive,
  compact = false,
}) => {
  const isMoving = outputs.some((v) => v !== 0);
  const isBoosting = action?.name === 'nitro';
  const isBurning = action?.name === 'burnout';

  // Animation values for smooth car tilting/translation
  const angleAnim = useRef(new Animated.Value(0)).current;
  const xAnim = useRef(new Animated.Value(0)).current;
  const yAnim = useRef(new Animated.Value(0)).current;
  const flameAnim = useRef(new Animated.Value(1)).current;

  const targetTurn = action ? 0 : steering / 80;
  const targetTravel = action ? 1 : throttle / 80;
  const targetX = (strafe / 80) * 14;
  const targetY = -targetTravel * 6;
  const targetAngle = targetTurn * 22;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(angleAnim, {
        toValue: targetAngle,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(xAnim, {
        toValue: targetX,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(yAnim, {
        toValue: targetY,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [targetAngle, targetX, targetY, angleAnim, xAnim, yAnim]);

  // Exhaust flame flicker animation during nitro or burnout
  useEffect(() => {
    if (isBoosting || isBurning) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(flameAnim, {
            toValue: 0.6,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.timing(flameAnim, {
            toValue: 1.2,
            duration: 80,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      flameAnim.setValue(0);
    }
  }, [isBoosting, isBurning, flameAnim]);

  const carWidth = compact ? 44 : 74;
  const carHeight = compact ? 96 : 162;

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      <Text style={[styles.topLabel, compact && styles.compactTopLabel]}>LIVE OUTPUT</Text>

      <View style={[styles.stage, compact && styles.compactStage]}>
        {/* Ambient aura glow */}
        <View
          style={[
            styles.aura,
            isBurning && styles.auraBurning,
            isBoosting && styles.auraBoosting,
          ]}
        />

        {/* Wheels positioned around the chassis */}
        {/* FL (M1) */}
        <View style={[styles.wheelContainer, styles.wheelFL, compact && styles.compactWheelFL]}>
          <Text
            style={[
              styles.wheelValue,
              outputs[0] !== 0 && styles.wheelRunningText,
            ]}>
            {outputs[0] > 0 ? `+${outputs[0]}` : outputs[0]}
          </Text>
          <View
            style={[
              styles.wheelGraphic,
              outputs[0] !== 0 && styles.wheelRunning,
            ]}>
            <View style={styles.tread} />
          </View>
        </View>

        {/* FR (M2) */}
        <View style={[styles.wheelContainer, styles.wheelFR, compact && styles.compactWheelFR]}>
          <View
            style={[
              styles.wheelGraphic,
              outputs[1] !== 0 && styles.wheelRunning,
            ]}>
            <View style={styles.tread} />
          </View>
          <Text
            style={[
              styles.wheelValue,
              outputs[1] !== 0 && styles.wheelRunningText,
            ]}>
            {outputs[1] > 0 ? `+${outputs[1]}` : outputs[1]}
          </Text>
        </View>

        {/* RL (M3) */}
        <View style={[styles.wheelContainer, styles.wheelRL, compact && styles.compactWheelRL]}>
          <Text
            style={[
              styles.wheelValue,
              outputs[2] !== 0 && styles.wheelRunningText,
            ]}>
            {outputs[2] > 0 ? `+${outputs[2]}` : outputs[2]}
          </Text>
          <View
            style={[
              styles.wheelGraphic,
              outputs[2] !== 0 && styles.wheelRunning,
            ]}>
            <View style={styles.tread} />
          </View>
        </View>

        {/* RR (M4) */}
        <View style={[styles.wheelContainer, styles.wheelRR, compact && styles.compactWheelRR]}>
          <View
            style={[
              styles.wheelGraphic,
              outputs[3] !== 0 && styles.wheelRunning,
            ]}>
            <View style={styles.tread} />
          </View>
          <Text
            style={[
              styles.wheelValue,
              outputs[3] !== 0 && styles.wheelRunningText,
            ]}>
            {outputs[3] > 0 ? `+${outputs[3]}` : outputs[3]}
          </Text>
        </View>

        {/* Car chassis with dynamic transform */}
        <Animated.View
          style={[
            styles.carWrapper,
            {
              transform: [
                { translateX: xAnim },
                { translateY: yAnim },
                {
                  rotate: angleAnim.interpolate({
                    inputRange: [-360, 360],
                    outputRange: ['-360deg', '360deg'],
                  }),
                },
              ],
            },
          ]}>
          <Svg
            width={carWidth}
            height={carHeight}
            viewBox="0 0 100 210"
            style={styles.carSvg}>
            <Defs>
              <LinearGradient id="bodyPaint" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#34383e" />
                <Stop offset="0.48" stopColor="#60656b" />
                <Stop offset="0.54" stopColor="#52575d" />
                <Stop offset="1" stopColor="#292c32" />
              </LinearGradient>
              <LinearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#243842" />
                <Stop offset="1" stopColor="#10161c" />
              </LinearGradient>
            </Defs>

            {/* Main Aerodynamic Outer Body */}
            <Path
              d="M24 10Q50 0 76 10L86 38 90 165Q88 195 76 202H24Q12 195 10 165L14 38Z"
              fill="url(#bodyPaint)"
              stroke="#767c83"
              strokeWidth="1.2"
            />
            {/* Hood Trim */}
            <Path
              d="M24 19Q50 11 76 19L79 48 21 48Z"
              fill="#30343a"
              stroke="#6b7076"
            />
            {/* Windshield */}
            <Path
              d="m22 53 56 0-6 33H28Z"
              fill="url(#glass)"
              stroke="#829098"
            />
            {/* Cabin Roof */}
            <Path
              d="m29 91 42 0 4 56-50 0Z"
              fill="#353a41"
              stroke="#6a7076"
            />
            {/* Rear Window Glass */}
            <Path
              d="m25 153 50 0 4 23-58 0Z"
              fill="url(#glass)"
              stroke="#6a757e"
            />
            {/* Aerodynamic Air Inlets & Seams */}
            <Path
              d="m17 59 5 84-7 17m68-101-5 84 7 17M28 185h44M32 29h36"
              fill="none"
              stroke="#171b20"
              strokeWidth="2"
            />
            {/* Cyan LED Headlights */}
            <Path
              d="m19 26 3-9 14-3m45 12-3-9-14-3"
              fill="none"
              stroke="#d5f4fd"
              strokeWidth="4"
            />
            {/* Red LED Taillights */}
            <Path
              d="m17 187 3 9h17m46-9-3 9H63"
              fill="none"
              stroke="#ff5c56"
              strokeWidth="3"
            />
            {/* Racing Center Decal */}
            <Rect x="45" y="95" width="10" height="46" fill="#ff6549" opacity={0.8} />
          </Svg>

          {/* Exhaust Flame nozzles */}
          {(isBoosting || isBurning) && (
            <Animated.View
              style={[
                styles.exhaustPipes,
                {
                  opacity: 1,
                  transform: [{ scaleY: flameAnim }],
                },
              ]}>
              <View
                style={[
                  styles.flame,
                  isBurning && styles.flameOrange,
                  isBoosting && styles.flameBlue,
                ]}
              />
              <View
                style={[
                  styles.flame,
                  isBurning && styles.flameOrange,
                  isBoosting && styles.flameBlue,
                ]}
              />
            </Animated.View>
          )}
        </Animated.View>
      </View>

      <Text style={[styles.bottomLabel, compact && styles.compactBottomLabel]}>
        {isLive ? 'COMMANDED' : 'SIMULATED'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContainer: {
    paddingHorizontal: 0,
    marginVertical: 0,
  },
  topLabel: {
    fontSize: 8,
    letterSpacing: 2,
    color: '#737b87',
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  compactTopLabel: {
    fontSize: 6.5,
    marginBottom: 2,
  },
  bottomLabel: {
    fontSize: 7,
    letterSpacing: 1.5,
    color: '#5c6471',
    fontWeight: '600',
    marginTop: 6,
    textTransform: 'uppercase',
  },
  compactBottomLabel: {
    fontSize: 6,
    marginTop: 2,
  },
  stage: {
    width: 160,
    height: 220,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactStage: {
    width: 120,
    height: 114,
  },
  aura: {
    position: 'absolute',
    width: '100%',
    height: '90%',
    borderRadius: 80,
    backgroundColor: 'rgba(141, 166, 208, 0.04)',
  },
  auraBurning: {
    backgroundColor: 'rgba(255, 104, 75, 0.18)',
  },
  auraBoosting: {
    backgroundColor: 'rgba(110, 168, 255, 0.22)',
  },
  carWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  carSvg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  wheelContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 2,
  },
  wheelGraphic: {
    width: 9,
    height: 27,
    borderRadius: 3,
    backgroundColor: '#1d2026',
    borderWidth: 1,
    borderColor: '#434a55',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelRunning: {
    borderColor: '#ff684b',
    backgroundColor: '#27201f',
  },
  tread: {
    width: '100%',
    height: '100%',
    opacity: 0.5,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#353a42',
  },
  wheelValue: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: '#6d7683',
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  wheelRunningText: {
    color: '#ff684b',
  },
  wheelFL: {
    top: 44,
    left: 8,
  },
  wheelFR: {
    top: 44,
    right: 8,
  },
  wheelRL: {
    bottom: 42,
    left: 8,
  },
  wheelRR: {
    bottom: 42,
    right: 8,
  },
  compactWheelFL: {
    top: 14,
    left: 2,
  },
  compactWheelFR: {
    top: 14,
    right: 2,
  },
  compactWheelRL: {
    bottom: 14,
    left: 2,
  },
  compactWheelRR: {
    bottom: 14,
    right: 2,
  },
  exhaustPipes: {
    position: 'absolute',
    bottom: -10,
    flexDirection: 'row',
    gap: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flame: {
    width: 8,
    height: 24,
    borderRadius: 4,
  },
  flameOrange: {
    backgroundColor: '#ff7733',
    shadowColor: '#ff684b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  flameBlue: {
    backgroundColor: '#6ea8ff',
    shadowColor: '#6ea8ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
});
