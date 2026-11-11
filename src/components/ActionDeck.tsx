import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { GestureDetector, usePanGesture, type PanGesture } from 'react-native-gesture-handler';
import { ActionState, ActionType } from '@/hooks/useCarController';

interface ActionButtonControl {
  gesture: PanGesture;
  pressed: boolean;
}

export interface ActionDeckControls {
  burnout: ActionButtonControl;
  nitro: ActionButtonControl;
}

interface ActionDeckGestureOptions {
  onTrigger: (type: ActionType) => void;
  disabled: boolean;
  /**
   * Gestures created earlier (in render order) that may run at the same time
   * as the action buttons. RNGH makes the relation symmetric. Burnout and
   * nitro are deliberately not simultaneous with each other.
   */
  simultaneousWith?: PanGesture[];
}

function useActionButton(
  type: ActionType,
  { onTrigger, disabled, simultaneousWith }: ActionDeckGestureOptions
): ActionButtonControl {
  const [pressed, setPressed] = useState(false);

  const gesture = usePanGesture({
    minDistance: 0,
    minPointers: 1,
    maxPointers: 1,
    shouldCancelWhenOutside: false,
    runOnJS: true,
    enabled: !disabled,
    simultaneousWith,
    onBegin: () => {
      setPressed(true);
      onTrigger(type);
    },
    onFinalize: () => {
      setPressed(false);
    },
  });

  return { gesture, pressed };
}

export function useActionDeck(options: ActionDeckGestureOptions): ActionDeckControls {
  const burnout = useActionButton('burnout', options);
  const nitro = useActionButton('nitro', options);
  return { burnout, nitro };
}

interface ActionDeckProps {
  action: ActionState | null;
  controls: ActionDeckControls;
  disabled?: boolean;
  compact?: boolean;
}

export const ActionDeck: React.FC<ActionDeckProps> = ({
  action,
  controls,
  disabled = false,
  compact = false,
}) => {
  const isBurnoutActive = action?.name === 'burnout';
  const isNitroActive = action?.name === 'nitro';
  const { gesture: burnoutGesture, pressed: pressedBurnout } = controls.burnout;
  const { gesture: nitroGesture, pressed: pressedNitro } = controls.nitro;

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
              minimumFontScale={0.75}
              style={[styles.titleBurnout, compact && styles.compactTitle]}>
              BURNOUT
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
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
              minimumFontScale={0.75}
              style={[styles.titleNitro, compact && styles.compactTitle]}>
              NITRO
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
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
    height: 38,
    paddingHorizontal: 5,
    borderRadius: 7,
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
