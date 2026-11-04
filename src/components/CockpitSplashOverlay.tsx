import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  Animated,
  Pressable,
} from 'react-native';

interface CockpitSplashOverlayProps {
  onFinish?: () => void;
}

export const CockpitSplashOverlay: React.FC<CockpitSplashOverlayProps> = ({ onFinish }) => {
  const [visible, setVisible] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate progress line and scale
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: false,
      }),
    ]).start(() => {
      // Fade out smoothly
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
        onFinish?.();
      });
    });
  }, [fadeAnim, scaleAnim, progressAnim, onFinish]);

  if (!visible) return null;

  const dismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      onFinish?.();
    });
  };

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
        },
      ]}>
      <Pressable style={styles.pressable} onPress={dismiss}>
        <Animated.View
          style={[
            styles.content,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}>
          <Image
            source={require('@/assets/images/splash.png')}
            style={styles.splashImage}
            resizeMode="contain"
          />

          <View style={styles.bootMeta}>
            <View style={styles.bootRow}>
              <View style={styles.liveIndicator} />
              <Text style={styles.bootText}>ESP32 RC COCKPIT · 100 HZ ACTIVE TELEMETRY</Text>
            </View>

            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0c0e12',
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressable: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  splashImage: {
    width: '68%',
    height: '70%',
    maxWidth: 520,
    maxHeight: 280,
  },
  bootMeta: {
    position: 'absolute',
    bottom: 22,
    alignItems: 'center',
    gap: 7,
  },
  bootRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6ea8ff',
  },
  bootText: {
    fontSize: 9,
    fontFamily: 'monospace',
    letterSpacing: 1.2,
    color: '#8e98a7',
    fontWeight: '700',
  },
  progressTrack: {
    width: 180,
    height: 2.5,
    backgroundColor: '#1b1f28',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#ff684b',
    borderRadius: 1.5,
  },
});
