import React, { useState, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useCarController } from '@/hooks/useCarController';
import { TopBar } from '@/components/TopBar';
import { CarStage } from '@/components/CarStage';
import { RotationJoystick, MovementJoystick } from '@/components/Joystick';
import { ActionDeck } from '@/components/ActionDeck';
import { PresetDeck } from '@/components/PresetDeck';
import { FirmwareModal } from '@/components/FirmwareModal';
import { SettingsModal } from '@/components/SettingsModal';
import { CockpitSplashOverlay } from '@/components/CockpitSplashOverlay';

export default function RemoteScreen() {
  const {
    connected,
    isLiveMode,
    setIsLiveMode,
    serverUrl,
    setServerUrl,
    driveMode,
    toggleDriveMode,
    throttle,
    strafe,
    steering,
    motorOutputs,
    driveStateText,
    action,
    quick,
    maintenance,
    setMaintenance,
    announcement,
    setThrottleAndStrafe,
    setSteeringInput,
    startAction,
    startQuick,
    stopQuick,
    toggleConnection,
    stopAll,
  } = useCarController();

  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [firmwareModalOpen, setFirmwareModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Gesture references for simultaneous multi-touch orchestration
  const steerGestureRef = useRef<any>(null);
  const moveGestureRef = useRef<any>(null);
  const burnoutGestureRef = useRef<any>(null);
  const nitroGestureRef = useRef<any>(null);
  const stopGestureRef = useRef<any>(null);

  const stopGesture = useMemo(() => {
    let g = Gesture.Pan()
      .minDistance(0)
      .minPointers(1)
      .maxPointers(1)
      .shouldCancelWhenOutside(false)
      .runOnJS(true)
      .withRef(stopGestureRef);

    g = g.simultaneousWithExternalGesture(
      steerGestureRef,
      moveGestureRef,
      burnoutGestureRef,
      nitroGestureRef
    );

    return g.onBegin(() => {
      stopAll('Emergency stop activated.');
    });
  }, [stopAll]);

  // Compute responsive joystick size for dedicated landscape screen
  const availableHeight = height - 40 - Math.max(insets.top, 2) - Math.max(insets.bottom, 2);
  const joystickSize = Math.max(120, Math.min(145, availableHeight * 0.52));

  const isClassic = driveMode === 'classic';

  return (
    <View style={styles.safeArea}>
      <StatusBar hidden={true} style="light" />
      <View
        // @ts-ignore
        style={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 2),
            paddingBottom: Math.max(insets.bottom, 2),
            paddingLeft: Math.max(insets.left, 6),
            paddingRight: Math.max(insets.right, 6),
            touchAction: 'none',
            userSelect: 'none',
          },
        ]}>
        {/* Top Navigation Bar */}
        <TopBar
          connected={connected}
          onToggleConnection={toggleConnection}
          onOpenFirmware={() => setFirmwareModalOpen(true)}
          onOpenSettings={() => setSettingsModalOpen(true)}
          compact={true}
        />

        {/* ======================================================== */}
        {/* DEDICATED LANDSCAPE CONTROLLER CONSOLE LAYOUT           */}
        {/* ======================================================== */}
        <View style={styles.landscapeContainer}>
          {/* LEFT COCKPIT: Left Joystick (Steering / Yaw) & Action Deck */}
          <View style={styles.landscapeLeftWing}>
            <RotationJoystick
              value={steering}
              onChange={setSteeringInput}
              disabled={!connected || maintenance || !!quick}
              driveMode={driveMode}
              size={joystickSize}
              compact={true}
              gestureRef={steerGestureRef}
              simultaneousHandlers={[moveGestureRef, burnoutGestureRef, nitroGestureRef, stopGestureRef]}
            />
            <View style={styles.landscapeActionBox}>
              <ActionDeck
                action={action}
                onTrigger={startAction}
                disabled={!connected || maintenance}
                compact={true}
                burnoutGestureRef={burnoutGestureRef}
                nitroGestureRef={nitroGestureRef}
                simultaneousHandlers={[steerGestureRef, moveGestureRef, stopGestureRef]}
              />
            </View>
          </View>

          {/* CENTER COCKPIT: Telemetry, Car Visualizer & Quick Presets */}
          <View style={styles.landscapeCenter}>
            {/* Drive status bar & Mode Switch */}
            <View style={styles.landscapeCenterHead}>
              <View style={styles.driveControlTag}>
                <View style={styles.tinySquare} />
                <Text style={styles.consoleTitle}>DRIVE CONTROL</Text>
                <View style={styles.driveStatePill}>
                  <Text
                    style={[
                      styles.driveStateText,
                      driveStateText !== 'STANDBY' && styles.driveStateActive,
                    ]}>
                    {driveStateText}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.75}
                disabled={maintenance || !connected}
                onPress={toggleDriveMode}
                style={styles.modeBtnCompact}>
                <Text style={styles.modeBtnText}>
                  {isClassic ? 'Classic ⇄' : 'Mecanum ⇄'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Car Stage Visualizer */}
            <View style={styles.carStageWrapper}>
              <CarStage
                outputs={motorOutputs}
                throttle={throttle}
                strafe={strafe}
                steering={steering}
                action={action}
                isLive={isLiveMode}
                compact={true}
              />
            </View>

            {/* Quick Moves Ribbon */}
            <View style={styles.landscapePresetBox}>
              <PresetDeck
                currentQuick={quick}
                onStart={startQuick}
                onStop={stopQuick}
                disabled={!connected || maintenance}
                driveMode={driveMode}
                compact={true}
              />
            </View>

            {/* Announcement status */}
            <Text style={styles.landscapeAnnouncementText} numberOfLines={1}>
              {announcement}
            </Text>
          </View>

          {/* RIGHT COCKPIT: Right Joystick (Movement / Planar) & Emergency Stop */}
          <View style={styles.landscapeRightWing}>
            <MovementJoystick
              throttle={throttle}
              strafe={strafe}
              onChange={setThrottleAndStrafe}
              disabled={!connected || maintenance || !!quick}
              driveMode={driveMode}
              size={joystickSize}
              compact={true}
              gestureRef={moveGestureRef}
              simultaneousHandlers={[steerGestureRef, burnoutGestureRef, nitroGestureRef, stopGestureRef]}
            />
            <View style={styles.landscapeRightFooter}>
              <GestureDetector gesture={stopGesture}>
                <View
                  // @ts-ignore
                  style={[styles.landscapeStopBtn, { touchAction: 'none', userSelect: 'none' }]}>
                  <Svg width={12} height={12} viewBox="0 0 24 24" fill="#ff684b">
                    <Path d="M6 6h12v12H6z" />
                  </Svg>
                  <Text numberOfLines={1} adjustsFontSizeToFit style={styles.landscapeStopBtnText}>
                    STOP / NEUTRAL
                  </Text>
                </View>
              </GestureDetector>
            </View>
          </View>
        </View>

        {/* Firmware OTA Update Modal */}
        <FirmwareModal
          visible={firmwareModalOpen}
          onClose={() => setFirmwareModalOpen(false)}
          isLive={isLiveMode}
          serverUrl={serverUrl}
          onPauseControls={(paused) => setMaintenance(paused)}
        />

        {/* Settings & Diagnostics Modal */}
        <SettingsModal
          visible={settingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
          isLive={isLiveMode}
          onToggleLive={setIsLiveMode}
          serverUrl={serverUrl}
          onUpdateServerUrl={setServerUrl}
          connected={connected}
          onReconnect={toggleConnection}
        />

        {/* Animated Boot / Splash Screen Overlay */}
        <CockpitSplashOverlay />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#101114',
  },
  container: {
    flex: 1,
    backgroundColor: '#101114',
  },
  consoleHead: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  driveControlTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tinySquare: {
    width: 5,
    height: 5,
    backgroundColor: '#ff684b',
    borderRadius: 1,
  },
  consoleTitle: {
    fontSize: 8,
    letterSpacing: 1.5,
    color: '#9a9fa9',
    fontWeight: '700',
  },
  driveStatePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  driveStateText: {
    fontSize: 8,
    letterSpacing: 1.5,
    color: '#81868f',
    fontWeight: '700',
  },
  driveStateActive: {
    color: '#ff684b',
  },

  /* ======================================= */
  /* Landscape Cockpit Layout Styles         */
  /* ======================================= */
  landscapeContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  landscapeLeftWing: {
    width: '31%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  landscapeActionBox: {
    width: '100%',
    marginTop: 4,
  },
  landscapeCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#121419',
    borderWidth: 1,
    borderColor: '#262a34',
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginHorizontal: 5,
    alignSelf: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  landscapeCenterHead: {
    width: '100%',
    height: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  modeBtnCompact: {
    borderWidth: 1,
    borderColor: '#52657e',
    backgroundColor: 'rgba(110, 168, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  modeBtnText: {
    fontSize: 8,
    color: '#afcdf7',
    fontWeight: '700',
  },
  carStageWrapper: {
    marginVertical: 2,
    alignItems: 'center',
  },
  landscapePresetBox: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  landscapeAnnouncementText: {
    fontSize: 8,
    color: '#86909d',
    textAlign: 'center',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  landscapeRightWing: {
    width: '31%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  landscapeRightFooter: {
    width: '100%',
    marginTop: 4,
  },
  landscapeStopBtn: {
    height: 38,
    borderRadius: 8,
    backgroundColor: '#271719',
    borderWidth: 1.5,
    borderColor: '#6b2d2f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#ff4433',
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  landscapeStopBtnText: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#ff927e',
  },
});
