import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useCarController } from '@/hooks/useCarController';
import { useOrientation } from '@/hooks/useOrientation';
import { TopBar } from '@/components/TopBar';
import { CarStage } from '@/components/CarStage';
import { RotationJoystick, MovementJoystick } from '@/components/Joystick';
import { ActionDeck } from '@/components/ActionDeck';
import { PresetDeck } from '@/components/PresetDeck';
import { FirmwareModal } from '@/components/FirmwareModal';
import { SettingsModal } from '@/components/SettingsModal';

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

  const { isLandscape, toggleOrientation, width, height } = useOrientation();
  const insets = useSafeAreaInsets();

  const [firmwareModalOpen, setFirmwareModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Compute responsive joystick size
  const landscapeAvailableH = height - (isLandscape ? 40 : insets.top) - insets.bottom;
  const joystickSize = isLandscape
    ? Math.max(120, Math.min(145, landscapeAvailableH * 0.48))
    : Math.max(140, Math.min(185, (width - 48) / 2));

  const isClassic = driveMode === 'classic';

  return (
    <View style={styles.safeArea}>
      <StatusBar hidden={isLandscape} style="light" />
      <View
        style={[
          styles.container,
          {
            paddingTop: isLandscape ? Math.max(insets.top, 2) : insets.top,
            paddingBottom: Math.max(insets.bottom, 2),
            paddingLeft: Math.max(insets.left, 6),
            paddingRight: Math.max(insets.right, 6),
          },
        ]}>
        {/* Top Navigation Bar */}
        <TopBar
          connected={connected}
          onToggleConnection={toggleConnection}
          onOpenFirmware={() => setFirmwareModalOpen(true)}
          onOpenSettings={() => setSettingsModalOpen(true)}
          isLandscape={isLandscape}
          onToggleOrientation={toggleOrientation}
          compact={isLandscape}
        />

        {/* Dynamic Orientation Views */}
        {isLandscape ? (
          /* ======================================================== */
          /* LANDSCAPE (HORIZONTAL) CONTROLLER CONSOLE LAYOUT         */
          /* ======================================================== */
          <View style={styles.landscapeContainer}>
            {/* LEFT COCKPIT: Left Joystick (Steering / Yaw) & Actions */}
            <View style={styles.landscapeLeftWing}>
              <RotationJoystick
                value={steering}
                onChange={setSteeringInput}
                disabled={!connected || maintenance || !!action || !!quick}
                driveMode={driveMode}
                size={joystickSize}
                compact={true}
              />
              <View style={styles.landscapeActionBox}>
                <ActionDeck
                  action={action}
                  onTrigger={startAction}
                  disabled={!connected || maintenance}
                  compact={true}
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
                  disabled={!connected || maintenance || !!action}
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
                disabled={!connected || maintenance || !!action || !!quick}
                driveMode={driveMode}
                size={joystickSize}
                compact={true}
              />
              <View style={styles.landscapeRightFooter}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  disabled={!connected || maintenance}
                  onPress={() => stopAll('Emergency stop activated.')}
                  style={styles.landscapeStopBtn}>
                  <Svg width={12} height={12} viewBox="0 0 24 24" fill="#ff684b">
                    <Path d="M6 6h12v12H6z" />
                  </Svg>
                  <Text numberOfLines={1} adjustsFontSizeToFit style={styles.landscapeStopBtnText}>
                    STOP / NEUTRAL
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          /* ======================================================== */
          /* PORTRAIT (VERTICAL) SCREEN LAYOUT                        */
          /* ======================================================== */
          <ScrollView
            style={styles.portraitScroll}
            contentContainerStyle={styles.portraitContent}
            showsVerticalScrollIndicator={false}>
            {/* Intro Headline & Network Status */}
            <View style={styles.introSection}>
              <View>
                <Text style={styles.eyebrow}>YOUR DRIVE. YOUR RULES.</Text>
                <Text style={styles.mainHeading}>
                  Take the wheel<Text style={styles.accentDot}>.</Text>
                </Text>
              </View>

              <View style={styles.networkBox}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#646a76" strokeWidth={2}>
                  <Path d="M3 8a15 15 0 0 1 18 0M6 12a10 10 0 0 1 12 0m-9 4a5 5 0 0 1 6 0M12 20h.01" />
                </Svg>
                <View>
                  <Text style={styles.networkName}>Super Car</Text>
                  <Text style={styles.networkDetail}>
                    {serverUrl.replace(/^https?:\/\//, '')}{' '}
                    <Text style={styles.networkDot}>•</Text>{' '}
                    {isLiveMode ? 'Wi-Fi AP' : 'AP preview'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Remote Controller Card */}
            <View style={styles.remoteCard}>
              {/* Console Header */}
              <View style={styles.consoleHead}>
                <View style={styles.driveControlTag}>
                  <View style={styles.tinySquare} />
                  <Text style={styles.consoleTitle}>DRIVE CONTROL</Text>
                </View>

                <View style={styles.driveStatePill}>
                  <Text
                    style={[
                      styles.driveStateText,
                      driveStateText !== 'STANDBY' && styles.driveStateActive,
                    ]}>
                    {driveStateText}
                  </Text>
                </View>

                <Text style={styles.pwmLimit}>
                  PWM LIMIT <Text style={styles.pwmLimitBold}>80%</Text>
                </Text>
              </View>

              {/* Mode Bar */}
              <View style={styles.modeBar}>
                <Text style={styles.modeHelp}>
                  {isClassic
                    ? 'CLASSIC · LEFT STEERS / RIGHT DRIVES'
                    : 'MECANUM · TRANSLATE + ROTATE'}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.75}
                  disabled={maintenance || !connected}
                  onPress={toggleDriveMode}
                  style={styles.modeBtn}>
                  <Text style={styles.modeBtnText}>
                    {isClassic ? 'Mode: Classic ⇄' : 'Mode: Mecanum ⇄'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Vehicle Stage */}
              <View style={styles.carStageWrapperPortrait}>
                <CarStage
                  outputs={motorOutputs}
                  throttle={throttle}
                  strafe={strafe}
                  steering={steering}
                  action={action}
                  isLive={isLiveMode}
                />
              </View>

              {/* Joystick Deck */}
              <View style={styles.joystickDeck}>
                <RotationJoystick
                  value={steering}
                  onChange={setSteeringInput}
                  disabled={!connected || maintenance || !!action || !!quick}
                  driveMode={driveMode}
                  size={joystickSize}
                />

                <MovementJoystick
                  throttle={throttle}
                  strafe={strafe}
                  onChange={setThrottleAndStrafe}
                  disabled={!connected || maintenance || !!action || !!quick}
                  driveMode={driveMode}
                  size={joystickSize}
                />
              </View>

              {/* Deck Caption */}
              <View style={styles.deckCaption}>
                <View style={styles.deckCaptionRow}>
                  <View style={styles.captionDot} />
                  <Text style={styles.deckCaptionText}>RELEASE JOYSTICKS TO STOP</Text>
                </View>
                <Text style={styles.deckCaptionText}>
                  VARIABLE PWM <Text style={styles.deckCaptionBold}>40 — 80%</Text>
                </Text>
              </View>

              {/* Action Buttons: Burnout & Nitro */}
              <ActionDeck
                action={action}
                onTrigger={startAction}
                disabled={!connected || maintenance}
              />

              {/* Presets: Quick Moves */}
              <PresetDeck
                currentQuick={quick}
                onStart={startQuick}
                onStop={stopQuick}
                disabled={!connected || maintenance || !!action}
                driveMode={driveMode}
              />
            </View>

            {/* Announcement text */}
            <Text style={styles.announcementText}>{announcement}</Text>

            {/* Footer */}
            <View style={styles.footer}>
              <View style={styles.footerNoteRow}>
                <View style={styles.footerDot} />
                <Text style={styles.footerNote}>
                  {isLiveMode
                    ? 'SUPER CAR / 100 Hz PWM / RELEASE TO STOP'
                    : 'INTERACTIVE DEMO / No hardware commands sent'}
                </Text>
              </View>
            </View>
          </ScrollView>
        )}

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
  portraitScroll: {
    flex: 1,
  },
  portraitContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  introSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 18,
  },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 2,
    color: '#81868f',
    fontWeight: '700',
    marginBottom: 4,
  },
  mainHeading: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.8,
    color: '#eceef0',
  },
  accentDot: {
    color: '#ff684b',
  },
  networkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  networkName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#bdc4cf',
  },
  networkDetail: {
    fontSize: 8,
    fontFamily: 'monospace',
    color: '#767d88',
    marginTop: 2,
  },
  networkDot: {
    color: '#444a55',
  },
  remoteCard: {
    backgroundColor: '#17191d',
    borderWidth: 1,
    borderColor: '#34373e',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
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
  pwmLimit: {
    fontSize: 7,
    letterSpacing: 1,
    color: '#707784',
    fontWeight: '600',
  },
  pwmLimitBold: {
    color: '#c1c5cd',
    fontWeight: '700',
  },
  modeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  modeHelp: {
    fontSize: 7,
    letterSpacing: 1,
    color: '#81868f',
    fontWeight: '600',
  },
  modeBtn: {
    borderWidth: 1,
    borderColor: '#52657e',
    backgroundColor: 'rgba(110, 168, 255, 0.08)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  modeBtnText: {
    fontSize: 8,
    color: '#afcdf7',
    fontWeight: '700',
  },
  carStageWrapperPortrait: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  joystickDeck: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deckCaption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    marginVertical: 12,
  },
  deckCaptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  captionDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#747e8b',
  },
  deckCaptionText: {
    fontSize: 7,
    letterSpacing: 1.2,
    color: '#68717e',
    fontWeight: '600',
  },
  deckCaptionBold: {
    color: '#9da5b2',
    fontWeight: '700',
  },
  announcementText: {
    fontSize: 9,
    color: '#86909d',
    textAlign: 'center',
    marginTop: 14,
    minHeight: 16,
  },
  footer: {
    marginTop: 12,
    alignItems: 'center',
  },
  footerNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cf9a65',
  },
  footerNote: {
    fontSize: 7,
    letterSpacing: 0.5,
    color: '#737c89',
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
    backgroundColor: '#16181c',
    borderWidth: 1,
    borderColor: '#2b2e35',
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginHorizontal: 4,
    alignSelf: 'stretch',
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
    borderRadius: 7,
    backgroundColor: '#271b1d',
    borderWidth: 1,
    borderColor: '#542d32',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  landscapeStopBtnText: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#ff8a75',
  },
});
