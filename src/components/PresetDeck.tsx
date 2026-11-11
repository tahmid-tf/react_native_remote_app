import React, { useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { QuickState } from '@/hooks/useCarController';

interface PresetDeckProps {
  currentQuick: QuickState | null;
  onStart: (name: string) => boolean;
  onStop: () => void;
  disabled?: boolean;
  driveMode: 'mecanum' | 'classic';
  compact?: boolean;
}

interface PresetItem {
  id: string;
  name: string;
  desc: string;
  telemetry: string;
  icon: (color: string, size?: number) => React.ReactNode;
}

const PRESETS: PresetItem[] = [
  {
    id: 'orbit',
    name: 'Orbit',
    desc: 'SIDE + ROTATION',
    telemetry: '360° ORBIT',
    icon: (c, s = 15) => (
      <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.8 1 6.5 2.7M21 3v6h-6" />
        <Path d="M12 9v6m-3-3h6" />
      </Svg>
    ),
  },
  {
    id: 'diagonal',
    name: 'Diagonal',
    desc: 'FORWARD + RIGHT',
    telemetry: '45° VECTOR',
    icon: (c, s = 15) => (
      <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M7 17L17 7M10 7h7v7" />
        <Path d="M4 20l3-3" strokeOpacity={0.6} />
      </Svg>
    ),
  },
  {
    id: 'shuffle',
    name: 'Shuffle',
    desc: 'LEFT ⇄ RIGHT',
    telemetry: 'STRAFE ⇄',
    icon: (c, s = 15) => (
      <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M4 9h16M16 5l4 4-4 4" />
        <Path d="M20 15H4M8 11l-4 4 4 4" />
      </Svg>
    ),
  },
  {
    id: 'eight',
    name: 'Figure 8',
    desc: 'FLOWING TURNS',
    telemetry: 'INFINITY ∞',
    icon: (c, s = 15) => (
      <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M12 12c-3-3-5.5-3-7 0a4 4 0 0 0 0 6c2.5 3 5 1.5 7-1.5 2 3 4.5 4.5 7 1.5a4 4 0 0 0 0-6c-1.5-3-4-3-7 0z" />
      </Svg>
    ),
  },
  {
    id: 'pivot',
    name: 'Pivot',
    desc: 'REAR-RIGHT PIVOT',
    telemetry: '90° PIVOT',
    icon: (c, s = 15) => (
      <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M5 19V6a1 1 0 0 1 1-1h13M15 9l4-4-4-4" />
        <Path d="M3 19h6M5 16v6" />
      </Svg>
    ),
  },
  {
    id: 'dance',
    name: 'Dance',
    desc: 'SWAY + ROTATE',
    telemetry: 'RHYTHM',
    icon: (c, s = 15) => (
      <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M3 8c3-3 6-3 9 0s6 3 9 0M3 16c3-3 6-3 9 0s6 3 9 0" />
        <Path d="M12 5v14" strokeDasharray="2,2" strokeOpacity={0.7} />
      </Svg>
    ),
  },
];

const PresetButtonCell: React.FC<{
  item: PresetItem;
  isFiring: boolean;
  isBlocked: boolean;
  onStart: (name: string) => boolean;
  onStop: () => void;
}> = ({ item, isFiring, isBlocked, onStart, onStop }) => {
  // Whether the current press is the one that started the maneuver.
  const startedRef = useRef(false);

  const iconColor = isFiring ? '#00f0ff' : isBlocked ? '#4b5563' : '#38bdf8';

  const gesture = usePanGesture({
    minDistance: 0,
    minPointers: 1,
    maxPointers: 1,
    shouldCancelWhenOutside: false,
    runOnJS: true,
    enabled: !isBlocked,
    onBegin: () => {
      startedRef.current = onStart(item.id);
    },
    onFinalize: () => {
      // Only the press that actually started the maneuver may stop it; otherwise
      // a second finger on another preset would cancel the one being held.
      if (!startedRef.current) return;
      startedRef.current = false;
      onStop();
    },
  });

  return (
    <GestureDetector gesture={gesture}>
      <View
        // @ts-ignore
        style={[
          styles.buttonCell,
          isFiring && styles.firingCell,
          isBlocked && styles.disabledCell,
          { touchAction: 'none', userSelect: 'none' },
        ]}>
        {/* Active Corner Accent */}
        {isFiring && <View style={styles.cellActiveGlowBar} />}

        {/* Icon */}
        <View style={styles.cellIconWrapper}>
          {item.icon(iconColor, 15)}
        </View>

        {/* Text Details */}
        <View style={styles.cellTextColumn}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.75}
            style={[
              styles.cellTitle,
              isFiring && styles.firingTitle,
              isBlocked && styles.disabledTitle,
            ]}>
            {item.name}
          </Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.7}
            style={[
              styles.cellTelemetry,
              isFiring && styles.firingTelemetry,
            ]}>
            {item.telemetry}
          </Text>
        </View>
      </View>
    </GestureDetector>
  );
};

export const PresetDeck: React.FC<PresetDeckProps> = ({
  currentQuick,
  onStart,
  onStop,
  disabled = false,
  driveMode,
}) => {
  const isClassic = driveMode === 'classic';
  const isBlocked = disabled || isClassic;

  // Split presets into 2 fixed rows of 3 buttons each (No scroll!)
  const topRow = PRESETS.slice(0, 3);
  const bottomRow = PRESETS.slice(3, 6);

  return (
    <View style={styles.unifiedDeckWrapper}>
      {/* HUD Header Bar */}
      <View style={styles.hudHeader}>
        <View style={styles.hudTitleGroup}>
          <View
            style={[
              styles.hudBeaconDot,
              isClassic ? styles.beaconAmber : styles.beaconCyan,
            ]}
          />
          <Text style={styles.hudTitle}>PRESET MANEUVERS</Text>
        </View>

        <View
          style={[
            styles.hudBadge,
            isClassic ? styles.hudBadgeAmber : styles.hudBadgeCyan,
          ]}>
          <Text
            style={[
              styles.hudBadgeText,
              isClassic ? styles.hudBadgeTextAmber : styles.hudBadgeTextCyan,
            ]}>
            {isClassic ? 'MECANUM ONLY' : '80% PWM · HOLD'}
          </Text>
        </View>
      </View>

      {/* Unified 3x2 Matrix (Always in one place, zero scrolling) */}
      <View style={styles.matrixContainer}>
        {/* Row 1: Orbit, Diagonal, Shuffle */}
        <View style={styles.matrixRow}>
          {topRow.map((item) => (
            <PresetButtonCell
              key={item.id}
              item={item}
              isFiring={currentQuick?.name === item.id}
              isBlocked={isBlocked}
              onStart={onStart}
              onStop={onStop}
            />
          ))}
        </View>

        {/* Row 2: Figure 8, Corner Pivot, Dance */}
        <View style={styles.matrixRow}>
          {bottomRow.map((item) => (
            <PresetButtonCell
              key={item.id}
              item={item}
              isFiring={currentQuick?.name === item.id}
              isBlocked={isBlocked}
              onStart={onStart}
              onStop={onStop}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  unifiedDeckWrapper: {
    width: '100%',
    backgroundColor: 'rgba(13, 16, 22, 0.75)',
    borderWidth: 1,
    borderColor: '#1e2430',
    borderRadius: 9,
    paddingHorizontal: 6,
    paddingTop: 5,
    paddingBottom: 6,
  },
  hudHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  hudTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  hudBeaconDot: {
    width: 5,
    height: 5,
    borderRadius: 1,
  },
  beaconCyan: {
    backgroundColor: '#00e5ff',
    shadowColor: '#00e5ff',
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  beaconAmber: {
    backgroundColor: '#f59e0b',
    shadowColor: '#f59e0b',
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  hudTitle: {
    fontSize: 7.5,
    letterSpacing: 1.2,
    color: '#8b97a8',
    fontWeight: '800',
  },
  hudBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
  },
  hudBadgeCyan: {
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderColor: 'rgba(0, 229, 255, 0.25)',
  },
  hudBadgeAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  hudBadgeText: {
    fontSize: 6.5,
    letterSpacing: 0.8,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  hudBadgeTextCyan: {
    color: '#38bdf8',
  },
  hudBadgeTextAmber: {
    color: '#fbbf24',
  },

  /* 3x2 Matrix Grid */
  matrixContainer: {
    width: '100%',
    gap: 4,
  },
  matrixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    width: '100%',
  },

  /* Individual Button Cell */
  buttonCell: {
    flex: 1,
    height: 31,
    backgroundColor: '#161a22',
    borderWidth: 1,
    borderColor: '#262f3d',
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  cellActiveGlowBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#00f0ff',
  },
  firingCell: {
    backgroundColor: '#0f2438',
    borderColor: '#00f0ff',
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  disabledCell: {
    opacity: 0.35,
    backgroundColor: '#121419',
    borderColor: '#1c2028',
  },
  cellIconWrapper: {
    width: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  cellTextColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  cellTitle: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#d1d8e2',
    letterSpacing: 0.3,
  },
  firingTitle: {
    color: '#ffffff',
    textShadowColor: 'rgba(0, 240, 255, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  disabledTitle: {
    color: '#555f6d',
  },
  cellTelemetry: {
    fontSize: 5.8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.4,
    color: '#657488',
    marginTop: 0.5,
  },
  firingTelemetry: {
    color: '#38bdf8',
    fontWeight: '700',
  },
});
