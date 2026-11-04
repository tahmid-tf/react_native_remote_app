import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Path,
  Rect,
  Circle,
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
  compact = true,
}) => {
  const isMoving = outputs.some((v) => v !== 0);
  const isBoosting = action?.name === 'nitro';
  const isBurning = action?.name === 'burnout';

  // Animation values for smooth car tilting/translation
  const angleAnim = useRef(new Animated.Value(0)).current;
  const xAnim = useRef(new Animated.Value(0)).current;
  const yAnim = useRef(new Animated.Value(0)).current;
  const flameAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  const targetTurn = action ? 0 : steering / 80;
  const targetTravel = action ? 1 : throttle / 80;
  const targetX = (strafe / 80) * 12;
  const targetY = -targetTravel * 5;
  const targetAngle = targetTurn * 18;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(angleAnim, {
        toValue: targetAngle,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(xAnim, {
        toValue: targetX,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(yAnim, {
        toValue: targetY,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [targetAngle, targetX, targetY, angleAnim, xAnim, yAnim]);

  // Underglow subtle pulse
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Exhaust flame flicker animation during nitro or burnout
  useEffect(() => {
    if (isBoosting || isBurning) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(flameAnim, {
            toValue: 0.6,
            duration: 70,
            useNativeDriver: true,
          }),
          Animated.timing(flameAnim, {
            toValue: 1.25,
            duration: 70,
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

  const carWidth = compact ? 46 : 74;
  const carHeight = compact ? 98 : 162;

  // Derive underglow color
  let underglowColor = 'rgba(110, 168, 255, 0.22)';
  if (isBurning) underglowColor = 'rgba(255, 104, 75, 0.55)';
  else if (isBoosting) underglowColor = 'rgba(80, 210, 255, 0.65)';
  else if (isMoving) underglowColor = 'rgba(110, 168, 255, 0.4)';

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      {/* Telemetry Stage Platform */}
      <View style={[styles.stage, compact && styles.compactStage]}>
        {/* Dynamic Holographic Underglow Grid */}
        <Animated.View
          style={[
            styles.underglowDisc,
            {
              backgroundColor: underglowColor,
              opacity: pulseAnim,
            },
          ]}
        />

        {/* Radar concentric telemetry rings */}
        <View style={styles.radarRings} pointerEvents="none">
          <View style={styles.ringOuter} />
          <View style={styles.ringInner} />
          <View style={styles.axisCrossH} />
          <View style={styles.axisCrossV} />
        </View>

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
                <Stop offset="0" stopColor="#25282e" />
                <Stop offset="0.3" stopColor="#484e56" />
                <Stop offset="0.5" stopColor="#5d636b" />
                <Stop offset="0.7" stopColor="#484e56" />
                <Stop offset="1" stopColor="#22252a" />
              </LinearGradient>
              <LinearGradient id="hoodAccent" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#ff7a5c" stopOpacity="0.8" />
                <Stop offset="1" stopColor="#30343b" />
              </LinearGradient>
              <LinearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#3b627d" />
                <Stop offset="0.6" stopColor="#1e3140" />
                <Stop offset="1" stopColor="#0d141a" />
              </LinearGradient>
              <LinearGradient id="cyanHeadlight" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#ffffff" />
                <Stop offset="1" stopColor="#5cd8ff" />
              </LinearGradient>
            </Defs>

            {/* Aerodynamic Shadow Plate */}
            <Path
              d="M20 14Q50 4 80 14L90 42 94 168Q92 198 80 206H20Q8 198 6 168L10 42Z"
              fill="#08090b"
              opacity="0.6"
            />

            {/* Main Aerodynamic Outer Body */}
            <Path
              d="M24 10Q50 0 76 10L86 38 90 165Q88 195 76 202H24Q12 195 10 165L14 38Z"
              fill="url(#bodyPaint)"
              stroke="#6b727a"
              strokeWidth="1.3"
            />

            {/* Front Racing Splitter & Canards */}
            <Path
              d="M20 12L12 28M80 12L88 28M24 10H76"
              stroke="#ff684b"
              strokeWidth="2"
              fill="none"
            />

            {/* Hood Trim */}
            <Path
              d="M26 20Q50 12 74 20L78 48 22 48Z"
              fill="#2a2e34"
              stroke="#545a62"
            />

            {/* Hood Center Air Scoop */}
            <Path
              d="M44 24h12l2 14h-16z"
              fill="#181a1f"
              stroke="#ff7a5c"
              strokeWidth="1"
            />

            {/* Windshield */}
            <Path
              d="m22 53 56 0-6 33H28Z"
              fill="url(#glass)"
              stroke="#758896"
            />

            {/* Cockpit Roof */}
            <Path
              d="m29 91 42 0 4 56-50 0Z"
              fill="#2e333a"
              stroke="#555a62"
            />

            {/* Rear Window Glass */}
            <Path
              d="m25 153 50 0 4 23-58 0Z"
              fill="url(#glass)"
              stroke="#5e6a75"
            />

            {/* Rear Aero Wing / Spoiler */}
            <Path
              d="M16 195Q50 190 84 195L86 202Q50 197 14 202Z"
              fill="#1e2126"
              stroke="#ff684b"
              strokeWidth="1.5"
            />

            {/* Aerodynamic Air Inlets & Seams */}
            <Path
              d="m17 59 5 84-7 17m68-101-5 84 7 17M28 185h44M32 29h36"
              fill="none"
              stroke="#13161a"
              strokeWidth="2"
            />

            {/* High-intensity Cyan LED Headlights */}
            <Path
              d="m19 25 4-8 13-3m43 11-4-8-13-3"
              fill="none"
              stroke="url(#cyanHeadlight)"
              strokeWidth="3.5"
            />

            {/* Rear Tail Light Strip */}
            <Path
              d="M24 192Q50 188 76 192"
              stroke="#ff3823"
              strokeWidth="3"
              fill="none"
            />
          </Svg>

          {/* Animated Exhaust Flames */}
          {(isBoosting || isBurning) && (
            <Animated.View
              style={[
                styles.flameContainer,
                {
                  transform: [{ scaleY: flameAnim }],
                },
              ]}>
              <View style={[styles.flame, isBoosting && styles.flameNitro]} />
              <View style={[styles.flame, isBoosting && styles.flameNitro]} />
            </Animated.View>
          )}
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  compactContainer: {
    paddingVertical: 1,
  },
  stage: {
    width: 140,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  compactStage: {
    width: 136,
    height: 108,
  },
  underglowDisc: {
    position: 'absolute',
    width: 110,
    height: 90,
    borderRadius: 55,
  },
  radarRings: {
    position: 'absolute',
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringOuter: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderStyle: 'dashed',
  },
  ringInner: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: 'rgba(110, 168, 255, 0.08)',
  },
  axisCrossH: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  axisCrossV: {
    position: 'absolute',
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  wheelContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  compactWheelFL: {
    top: 6,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  compactWheelFR: {
    top: 6,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  compactWheelRL: {
    bottom: 6,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  compactWheelRR: {
    bottom: 6,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  wheelFL: {
    top: 10,
    left: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  wheelFR: {
    top: 10,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  wheelRL: {
    bottom: 10,
    left: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  wheelRR: {
    bottom: 10,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  wheelGraphic: {
    width: 11,
    height: 22,
    backgroundColor: '#1b1d22',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#393f4a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelRunning: {
    borderColor: '#6ea8ff',
    backgroundColor: '#152233',
    shadowColor: '#6ea8ff',
    shadowOpacity: 0.6,
    shadowRadius: 5,
  },
  tread: {
    width: 4,
    height: 10,
    backgroundColor: '#353b47',
    borderRadius: 1,
  },
  wheelValue: {
    fontSize: 7.5,
    fontFamily: 'monospace',
    color: '#656d7a',
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
  },
  wheelRunningText: {
    color: '#8ec0ff',
  },
  carWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  carSvg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  flameContainer: {
    position: 'absolute',
    bottom: -16,
    flexDirection: 'row',
    gap: 12,
  },
  flame: {
    width: 6,
    height: 20,
    backgroundColor: '#ff5522',
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    shadowColor: '#ff4400',
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  flameNitro: {
    backgroundColor: '#00d0ff',
    shadowColor: '#00aaff',
  },
});
