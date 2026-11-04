import React, { useState, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ActionState, ActionType } from '@/hooks/useCarController';

interface ActionDeckProps {
  action: ActionState | null;
  onTrigger: (type: ActionType) => void;
  disabled?: boolean;
  compact?: boolean;
  burnoutGestureRef?: React.MutableRefObject<any>;
  nitroGestureRef?: React.MutableRefObject<any>;
  simultaneousHandlers?: React.MutableRefObject<any>[];
}

export const ActionDeck: React.FC<ActionDeckProps> = ({
  action,
  onTrigger,
  disabled = false,
  compact = false,
  burnoutGestureRef,
  nitroGestureRef,
  simultaneousHandlers,
}) => {
  const isBurnoutActive = action?.name === 'burnout';
  const isNitroActive = action?.name === 'nitro';
  const [pressedBurnout, setPressedBurnout] = useState(false);
  const [pressedNitro, setPressedNitro] = useState(false);

  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;

  const burnoutGesture = useMemo(() => {
    let g = Gesture.Pan()
      .minDistance(0)
      .minPointers(1)
      .maxPointers(1)
      .shouldCancelWhenOutside(false)
      .runOnJS(true);

    if (burnoutGestureRef) {
      g = g.withRef(burnoutGestureRef);
    }

    if (simultaneousHandlers && simultaneousHandlers.length > 0) {
      g = g.simultaneousWithExternalGesture(...simultaneousHandlers);
    }

    return g
      .enabled(!disabled)
      .onBegin(() => {
        setPressedBurnout(true);
        onTriggerRef.current('burnout');
      })
      .onFinalize(() => {
        setPressedBurnout(false);
      });
  }, [disabled, burnoutGestureRef, simultaneousHandlers]);

  const nitroGesture = useMemo(() => {
    let g = Gesture.Pan()
      .minDistance(0)
      .minPointers(1)
      .maxPointers(1)
      .shouldCancelWhenOutside(false)
      .runOnJS(true);

    if (nitroGestureRef) {
      g = g.withRef(nitroGestureRef);
    }

    if (simultaneousHandlers && simultaneousHandlers.length > 0) {
      g = g.simultaneousWithExternalGesture(...simultaneousHandlers);
    }

    return g
      .enabled(!disabled)
      .onBegin(() => {
        setPressedNitro(true);
        onTriggerRef.current('nitro');
      })
      .onFinalize(() => {
        setPressedNitro(false);
      });
  }, [disabled, nitroGestureRef, simultaneousHandlers]);

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      {/* BURNOUT BUTTON */}
      <GestureDetector gesture={burnoutGesture}>
        <View
          // @ts-ignore
          style={[
            styles.button,
            styles.burnoutBtn,
            (isBurnoutActive || pressedBurnout) && styles.firingBurnout,
            disabled && styles.btnDisabled,
            compact && styles.compactButton,
            { touchAction: 'none', userSelect: 'none' },
          ]}>
          {/* Progress Fill */}
          {isBurnoutActive && (
            <View
              pointerEvents="none"
              style={[
                styles.progressBar,
                styles.progressBurnout,
                { width: `${(action?.progress ?? 0) * 100}%` },
              ]}
            />
          )}

          <View pointerEvents="none" style={[styles.iconBox, compact && styles.compactIconBox]}>
            <Image
              source={require('@/assets/images/burnout-wheel.png')}
              style={[styles.wheelImg, compact && styles.compactWheelImg]}
              resizeMode="contain"
            />
          </View>

          <View pointerEvents="none" style={styles.textContainer}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[styles.titleBurnout, compact && styles.compactTitle]}>
              BURNOUT
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.subtitleBurnout, compact && styles.compactSubtitle]}>
              100% PWM <Text style={styles.highlight}>0.1s</Text>
            </Text>
          </View>
        </View>
      </GestureDetector>

      {/* NITRO BUTTON */}
      <GestureDetector gesture={nitroGesture}>
        <View
          // @ts-ignore
          style={[
            styles.button,
            styles.nitroBtn,
            (isNitroActive || pressedNitro) && styles.firingNitro,
            disabled && styles.btnDisabled,
            compact && styles.compactButton,
            { touchAction: 'none', userSelect: 'none' },
          ]}>
          {/* Progress Fill */}
          {isNitroActive && (
            <View
              pointerEvents="none"
              style={[
                styles.progressBar,
                styles.progressNitro,
                { width: `${(action?.progress ?? 0) * 100}%` },
              ]}
            />
          )}

          <View pointerEvents="none" style={[styles.iconBox, styles.nitroIconBox, compact && styles.compactIconBox]}>
            <Svg width={compact ? 14 : 22} height={compact ? 14 : 22} viewBox="0 0 24 24" fill="none" stroke="#a2c7ff" strokeWidth={2}>
              <Path d="m14 2-10 12h7l-1 8 10-12h-7z" />
            </Svg>
          </View>

          <View pointerEvents="none" style={styles.textContainer}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[styles.titleNitro, compact && styles.compactTitle]}>
              NITRO
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.subtitleNitro, compact && styles.compactSubtitle]}>
              100% PWM <Text style={styles.highlightNitro}>1s</Text>
            </Text>
          </View>
        </View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  compactContainer: {
    gap: 6,
    width: '100%',
  },
  button: {
    flex: 1,
    height: 52,
    borderRadius: 9,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
  },
  compactButton: {
    height: 42,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  burnoutBtn: {
    backgroundColor: '#1d1916',
    borderColor: '#4d2d1e',
  },
  nitroBtn: {
    backgroundColor: '#141c26',
    borderColor: '#244569',
  },
  btnDisabled: {
    opacity: 0.38,
  },
  firingBurnout: {
    borderColor: '#ff684b',
    backgroundColor: '#2d1c16',
  },
  firingNitro: {
    borderColor: '#6ea8ff',
    backgroundColor: '#16283d',
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    opacity: 0.35,
  },
  progressBurnout: {
    backgroundColor: '#ff684b',
  },
  progressNitro: {
    backgroundColor: '#6ea8ff',
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 104, 75, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  compactIconBox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    marginRight: 4,
  },
  nitroIconBox: {
    backgroundColor: 'rgba(110, 168, 255, 0.15)',
  },
  wheelImg: {
    width: 22,
    height: 22,
  },
  compactWheelImg: {
    width: 17,
    height: 17,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleBurnout: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#ffb295',
    letterSpacing: 0.4,
  },
  titleNitro: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#b6d5ff',
    letterSpacing: 0.4,
  },
  compactTitle: {
    fontSize: 8.5,
  },
  subtitleBurnout: {
    fontSize: 7.5,
    fontFamily: 'monospace',
    color: '#957c74',
    marginTop: 1,
  },
  subtitleNitro: {
    fontSize: 7.5,
    fontFamily: 'monospace',
    color: '#75889e',
    marginTop: 1,
  },
  compactSubtitle: {
    fontSize: 6.5,
  },
  highlight: {
    color: '#ff8266',
    fontWeight: '700',
  },
  highlightNitro: {
    color: '#8ec0ff',
    fontWeight: '700',
  },
});
