import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ActionState, ActionType } from '@/hooks/useCarController';

interface ActionDeckProps {
  action: ActionState | null;
  onTrigger: (type: ActionType) => void;
  disabled?: boolean;
  compact?: boolean;
}

export const ActionDeck: React.FC<ActionDeckProps> = ({
  action,
  onTrigger,
  disabled = false,
  compact = false,
}) => {
  const isBurnoutActive = action?.name === 'burnout';
  const isNitroActive = action?.name === 'nitro';

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      {/* BURNOUT BUTTON */}
      <TouchableOpacity
        activeOpacity={0.75}
        disabled={disabled || (!!action && !isBurnoutActive)}
        onPressIn={() => onTrigger('burnout')}
        style={[
          styles.button,
          styles.burnoutBtn,
          isBurnoutActive && styles.firingBurnout,
          disabled && styles.btnDisabled,
          compact && styles.compactButton,
        ]}>
        {/* Progress Fill */}
        {isBurnoutActive && (
          <View
            style={[
              styles.progressBar,
              styles.progressBurnout,
              { width: `${(action?.progress ?? 0) * 100}%` },
            ]}
          />
        )}

        <View style={[styles.iconBox, compact && styles.compactIconBox]}>
          <Image
            source={require('@/assets/images/burnout-wheel.png')}
            style={[styles.wheelImg, compact && styles.compactWheelImg]}
            resizeMode="contain"
          />
        </View>

        <View style={styles.textContainer}>
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
      </TouchableOpacity>

      {/* NITRO BUTTON */}
      <TouchableOpacity
        activeOpacity={0.75}
        disabled={disabled || (!!action && !isNitroActive)}
        onPressIn={() => onTrigger('nitro')}
        style={[
          styles.button,
          styles.nitroBtn,
          isNitroActive && styles.firingNitro,
          disabled && styles.btnDisabled,
          compact && styles.compactButton,
        ]}>
        {/* Progress Fill */}
        {isNitroActive && (
          <View
            style={[
              styles.progressBar,
              styles.progressNitro,
              { width: `${(action?.progress ?? 0) * 100}%` },
            ]}
          />
        )}

        <View style={[styles.iconBox, styles.nitroIconBox, compact && styles.compactIconBox]}>
          <Svg width={compact ? 14 : 22} height={compact ? 14 : 22} viewBox="0 0 24 24" fill="none" stroke="#a2c7ff" strokeWidth={2}>
            <Path d="m14 2-10 12h7l-1 8 10-12h-7z" />
          </Svg>
        </View>

        <View style={styles.textContainer}>
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
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    width: '100%',
  },
  compactContainer: {
    paddingHorizontal: 0,
    gap: 6,
  },
  button: {
    flex: 1,
    height: 70,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  compactButton: {
    height: 38,
    paddingHorizontal: 6,
    gap: 5,
    borderRadius: 7,
  },
  burnoutBtn: {
    backgroundColor: '#272023',
    borderColor: '#4e3939',
  },
  nitroBtn: {
    backgroundColor: '#20242e',
    borderColor: '#3c475e',
  },
  firingBurnout: {
    borderColor: '#ff684b',
    backgroundColor: '#352528',
  },
  firingNitro: {
    borderColor: '#6ea8ff',
    backgroundColor: '#252e3d',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  progressBurnout: {
    backgroundColor: 'rgba(255, 104, 75, 0.28)',
  },
  progressNitro: {
    backgroundColor: 'rgba(110, 168, 255, 0.28)',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 119, 99, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 139, 127, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactIconBox: {
    width: 22,
    height: 22,
    borderRadius: 5,
  },
  nitroIconBox: {
    backgroundColor: 'rgba(145, 186, 255, 0.08)',
    borderColor: 'rgba(145, 186, 255, 0.2)',
  },
  wheelImg: {
    width: 24,
    height: 24,
    tintColor: '#ef8a80',
  },
  compactWheelImg: {
    width: 14,
    height: 14,
  },
  textContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  titleBurnout: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#ffdeda',
  },
  titleNitro: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#e2edff',
  },
  compactTitle: {
    fontSize: 9,
    letterSpacing: 0.3,
  },
  subtitleBurnout: {
    fontSize: 7.5,
    color: '#aa9497',
    marginTop: 2,
  },
  subtitleNitro: {
    fontSize: 7.5,
    color: '#909fb9',
    marginTop: 2,
  },
  compactSubtitle: {
    fontSize: 6,
    marginTop: 1,
  },
  highlight: {
    color: '#cba9a7',
    fontWeight: '700',
  },
  highlightNitro: {
    color: '#adbfdb',
    fontWeight: '700',
  },
});
