import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { QuickState } from '@/hooks/useCarController';

interface PresetDeckProps {
  currentQuick: QuickState | null;
  onStart: (name: string) => void;
  onStop: () => void;
  disabled?: boolean;
  driveMode: 'mecanum' | 'classic';
  compact?: boolean;
}

interface PresetItem {
  id: string;
  name: string;
  desc: string;
  icon: (color: string, size?: number) => React.ReactNode;
}

const CompactPresetButton: React.FC<{
  item: PresetItem;
  isFiring: boolean;
  isBlocked: boolean;
  onStart: (name: string) => void;
  onStop: () => void;
}> = ({ item, isFiring, isBlocked, onStart, onStop }) => {
  const strokeColor = isFiring ? '#6ea8ff' : '#909cad';

  const gesture = useMemo(() => {
    return Gesture.Pan()
      .minDistance(0)
      .minPointers(1)
      .maxPointers(1)
      .shouldCancelWhenOutside(false)
      .runOnJS(true)
      .enabled(!isBlocked)
      .onBegin(() => {
        onStart(item.id);
      })
      .onFinalize(() => {
        onStop();
      });
  }, [isBlocked, item.id, onStart, onStop]);

  return (
    <GestureDetector gesture={gesture}>
      <View
        // @ts-ignore
        style={[
          styles.compactRibbonBtn,
          isFiring && styles.firingBtn,
          isBlocked && styles.disabledBtn,
          { touchAction: 'none', userSelect: 'none' },
        ]}>
        {item.icon(strokeColor, 14)}
        <Text
          style={[
            styles.compactRibbonText,
            isFiring && styles.firingText,
          ]}>
          {item.name}
        </Text>
      </View>
    </GestureDetector>
  );
};

const GridPresetButton: React.FC<{
  item: PresetItem;
  isFiring: boolean;
  isBlocked: boolean;
  onStart: (name: string) => void;
  onStop: () => void;
}> = ({ item, isFiring, isBlocked, onStart, onStop }) => {
  const strokeColor = isFiring ? '#6ea8ff' : '#909cad';

  const gesture = useMemo(() => {
    return Gesture.Pan()
      .minDistance(0)
      .minPointers(1)
      .maxPointers(1)
      .shouldCancelWhenOutside(false)
      .runOnJS(true)
      .enabled(!isBlocked)
      .onBegin(() => {
        onStart(item.id);
      })
      .onFinalize(() => {
        onStop();
      });
  }, [isBlocked, item.id, onStart, onStop]);

  return (
    <GestureDetector gesture={gesture}>
      <View
        // @ts-ignore
        style={[
          styles.button,
          isFiring && styles.firingBtn,
          isBlocked && styles.disabledBtn,
          { touchAction: 'none', userSelect: 'none' },
        ]}>
        <View style={styles.iconWrapper}>{item.icon(strokeColor, 18)}</View>
        <View style={styles.textCol}>
          <Text
            style={[
              styles.btnName,
              isFiring && styles.firingText,
            ]}>
            {item.name}
          </Text>
          <Text style={styles.btnDesc}>{item.desc}</Text>
        </View>
      </View>
    </GestureDetector>
  );
};

const PRESETS: PresetItem[] = [
  {
    id: 'orbit',
    name: 'Orbit',
    desc: 'SIDE + ROTATION',
    icon: (c, s = 18) => (
      <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2}>
        <Path d="M20 12a8 8 0 1 1-8-8m3-2 5 2-3 4M12 10v4m-2-2h4" />
      </Svg>
    ),
  },
  {
    id: 'diagonal',
    name: 'Diagonal',
    desc: 'FORWARD + RIGHT',
    icon: (c, s = 18) => (
      <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2}>
        <Path d="M5 19 19 5M8 5h11v11" />
      </Svg>
    ),
  },
  {
    id: 'shuffle',
    name: 'Shuffle',
    desc: 'LEFT ⇄ RIGHT',
    icon: (c, s = 18) => (
      <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2}>
        <Path d="M3 8h18m-4-4 4 4-4 4M21 16H3m4-4-4 4 4 4" />
      </Svg>
    ),
  },
  {
    id: 'eight',
    name: 'Figure 8',
    desc: 'FLOWING TURNS',
    icon: (c, s = 18) => (
      <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2}>
        <Path d="M12 12C-2-2-2 26 12 12S26-2 12 12" />
      </Svg>
    ),
  },
  {
    id: 'pivot',
    name: 'Corner Pivot',
    desc: 'REAR-RIGHT PIVOT',
    icon: (c, s = 18) => (
      <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2}>
        <Path d="M5 19V5h14M15 9l4-4-4-3M5 16v6M2 19h6" />
      </Svg>
    ),
  },
  {
    id: 'dance',
    name: 'Dance',
    desc: 'SWAY + ROTATE',
    icon: (c, s = 18) => (
      <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2}>
        <Path d="m3 7 5-4 4 4 5-4 4 4M3 17l5 4 4-4 5 4 4-4M12 7v10" />
      </Svg>
    ),
  },
];

export const PresetDeck: React.FC<PresetDeckProps> = ({
  currentQuick,
  onStart,
  onStop,
  disabled = false,
  driveMode,
  compact = false,
}) => {
  const isClassic = driveMode === 'classic';
  const isBlocked = disabled || isClassic;

  if (compact) {
    // Ultra-compact horizontal ribbon for landscape
    return (
      <View style={styles.compactRibbonWrapper}>
        <View style={styles.compactRibbonHeader}>
          <Text style={styles.compactRibbonTitle}>PRESETS</Text>
          <Text style={styles.compactRibbonHint}>HOLD TO DRIVE · 80% PWM</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.compactRibbonContent}>
          {PRESETS.map((item) => (
            <CompactPresetButton
              key={item.id}
              item={item}
              isFiring={currentQuick?.name === item.id}
              isBlocked={isBlocked}
              onStart={onStart}
              onStop={onStop}
            />
          ))}
        </ScrollView>
      </View>
    );
  }

  // Portrait Grid
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>QUICK MOVES</Text>
        <Text style={styles.hint}>
          {isClassic ? 'REQUIRES MECANUM MODE' : '80% PWM · HOLD TO MOVE'}
        </Text>
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {PRESETS.map((item) => (
          <GridPresetButton
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
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(17, 19, 23, 0.4)',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: '#79818e',
    fontWeight: '700',
  },
  hint: {
    fontSize: 7,
    letterSpacing: 1.2,
    color: '#575f6c',
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  button: {
    flexBasis: '31%',
    flexGrow: 1,
    minHeight: 52,
    backgroundColor: '#20232a',
    borderWidth: 1,
    borderColor: '#343943',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },
  pressedBtn: {
    transform: [{ translateY: 2 }],
  },
  firingBtn: {
    borderColor: '#6ea8ff',
    backgroundColor: '#263242',
    shadowColor: '#6ea8ff',
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  disabledBtn: {
    opacity: 0.35,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  btnName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#bdc4cf',
  },
  firingText: {
    color: '#ffffff',
  },
  btnDesc: {
    fontSize: 6,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
    color: '#747e8d',
    marginTop: 2,
  },

  /* Compact Ribbon for Landscape */
  compactRibbonWrapper: {
    width: '100%',
    paddingVertical: 2,
  },
  compactRibbonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  compactRibbonTitle: {
    fontSize: 7,
    letterSpacing: 1,
    color: '#79818e',
    fontWeight: '700',
  },
  compactRibbonHint: {
    fontSize: 6,
    letterSpacing: 0.8,
    color: '#575f6c',
  },
  compactRibbonContent: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 2,
  },
  compactRibbonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#20232a',
    borderWidth: 1,
    borderColor: '#343943',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  compactRibbonText: {
    fontSize: 8.5,
    fontWeight: '600',
    color: '#bdc4cf',
  },
});
