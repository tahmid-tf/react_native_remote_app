import { useState, useEffect, useCallback } from 'react';
import { useWindowDimensions, Platform } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

export function useOrientation() {
  const dimensions = useWindowDimensions();
  const autoLandscape = dimensions.width > dimensions.height;

  // Manual orientation override state (null = follow device)
  const [manualOrientation, setManualOrientation] = useState<'portrait' | 'landscape' | null>(null);

  // Compute active orientation
  const isLandscape = manualOrientation !== null
    ? manualOrientation === 'landscape'
    : autoLandscape;

  useEffect(() => {
    // Listen to physical orientation changes
    const subscription = ScreenOrientation.addOrientationChangeListener((evt) => {
      const orientation = evt.orientationInfo.orientation;
      const isLand =
        orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
        orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
      setManualOrientation(isLand ? 'landscape' : 'portrait');
    });

    return () => {
      ScreenOrientation.removeOrientationChangeListener(subscription);
    };
  }, []);

  const toggleOrientation = useCallback(async () => {
    const next = isLandscape ? 'portrait' : 'landscape';
    setManualOrientation(next);

    try {
      if (Platform.OS !== 'web') {
        if (next === 'landscape') {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        } else {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        }
      }
    } catch {
      // Graceful fallback if device locks are restricted
    }
  }, [isLandscape]);

  const unlockOrientation = useCallback(async () => {
    setManualOrientation(null);
    try {
      if (Platform.OS !== 'web') {
        await ScreenOrientation.unlockAsync();
      }
    } catch {}
  }, []);

  return {
    isLandscape,
    toggleOrientation,
    unlockOrientation,
    width: dimensions.width,
    height: dimensions.height,
  };
}
