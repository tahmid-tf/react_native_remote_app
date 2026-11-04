import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as DocumentPicker from 'expo-document-picker';
import {
  FirmwareInfo,
  fetchFirmwareInfo,
  lockFirmware,
  unlockFirmware,
  sendFirmwareUpload,
  confirmRestart,
  validateFirmwareBytes,
} from '@/services/firmware';

interface FirmwareModalProps {
  visible: boolean;
  onClose: () => void;
  isLive: boolean;
  serverUrl: string;
  onPauseControls: (paused: boolean) => void;
}

export const FirmwareModal: React.FC<FirmwareModalProps> = ({
  visible,
  onClose,
  isLive,
  serverUrl,
  onPauseControls,
}) => {
  const [file, setFile] = useState<{
    name: string;
    size: number;
    bytes: Uint8Array | null;
  } | null>(null);

  const [firmwareInfo, setFirmwareInfo] = useState<FirmwareInfo | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [ready, setReady] = useState<boolean>(!isLive);
  const [message, setMessage] = useState<string>('Controls are paused while this panel is open.');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressPhase, setProgressPhase] = useState<string>('Uploading');
  const [showProgress, setShowProgress] = useState<boolean>(false);
  const [rebootConfirmed, setRebootConfirmed] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      onPauseControls(true);
      if (isLive) {
        initLiveLock();
      } else {
        setMessage('Controls are paused while this panel is open.');
        setReady(true);
      }
    } else {
      onPauseControls(false);
      resetState();
    }
  }, [visible, isLive]);

  const resetState = () => {
    setFile(null);
    setBusy(false);
    setReady(!isLive);
    setShowProgress(false);
    setProgressPercent(0);
    setRebootConfirmed(false);
  };

  const initLiveLock = async () => {
    setReady(false);
    setMessage('Connecting to controller and pausing motors…');
    try {
      const info = await fetchFirmwareInfo(serverUrl);
      setFirmwareInfo(info);
      await lockFirmware(serverUrl, info.token);
      setReady(true);
      setMessage('Motors locked. Choose firmware.bin from your PlatformIO build.');
    } catch (err: any) {
      setMessage(`${err?.message || 'Error'}. Reopen this panel to retry.`);
    }
  };

  const handlePickFile = async () => {
    try {
      setShowProgress(false);
      setFile(null);

      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const name = asset.name;
      const size = asset.size || 0;

      if (!name.toLowerCase().endsWith('.bin') || size < 288) {
        setMessage('Choose the application firmware.bin, not a bootloader or partition file.');
        return;
      }

      if (isLive && firmwareInfo && size > firmwareInfo.maxSize) {
        setMessage(`This file is too large. The OTA slot holds ${(firmwareInfo.maxSize / 1024).toFixed(0)} KB.`);
        return;
      }

      // Read file bytes to validate
      let bytes: Uint8Array | null = null;
      if (Platform.OS === 'web' && (asset as any).file) {
        const rawFile: File = (asset as any).file;
        const buf = await rawFile.arrayBuffer();
        bytes = new Uint8Array(buf);
      } else if (asset.uri) {
        // Fetch local URI as arrayBuffer
        const res = await fetch(asset.uri);
        const buf = await res.arrayBuffer();
        bytes = new Uint8Array(buf);
      }

      if (bytes) {
        const check = validateFirmwareBytes(bytes);
        if (!check.valid) {
          setMessage(check.error || 'Invalid firmware file.');
          return;
        }
      }

      setFile({ name, size, bytes });
      setMessage(
        isLive
          ? 'File ready. Keep car powered and stay connected until restart is confirmed.'
          : 'File ready. This local demo previews the upload without updating a device.'
      );
    } catch (err: any) {
      setMessage('Could not read this file. Select it again.');
    }
  };

  const handleUpload = async () => {
    if (!file || busy || !ready) return;
    setBusy(true);
    setShowProgress(true);
    setProgressPercent(0);
    setRebootConfirmed(false);

    if (!isLive) {
      setMessage('Preview running. Simulating firmware upload…');
      let pct = 0;
      const timer = setInterval(() => {
        pct = Math.min(100, pct + 5);
        setProgressPercent(pct);
        setProgressPhase(pct === 100 ? 'Preview complete' : 'Simulating upload');
        if (pct === 100) {
          clearInterval(timer);
          setBusy(false);
          setMessage('Demo complete. A real update will verify the image and restart the controller.');
        }
      }, 100);
      return;
    }

    try {
      if (!firmwareInfo) throw new Error('No firmware session info');
      setProgressPhase('Uploading firmware');
      setMessage('Motors locked. Keep power connected while firmware is written…');

      await sendFirmwareUpload(
        serverUrl,
        firmwareInfo.token,
        file.name,
        file.size,
        file.bytes || new Uint8Array(0),
        (pct, phase) => {
          setProgressPercent(pct);
          setProgressPhase(phase);
        }
      );

      setProgressPercent(100);
      setProgressPhase('Waiting for restart');
      setMessage('Firmware accepted. Waiting for the controller to restart…');

      const confirmed = await confirmRestart(serverUrl, firmwareInfo.bootId);
      setRebootConfirmed(confirmed);
      setReady(false);
      setProgressPhase(confirmed ? 'Restart confirmed' : 'Restart not confirmed');
      setMessage(
        confirmed
          ? 'Update complete! The controller restarted successfully. Close this panel to drive.'
          : 'Firmware was accepted, but restart could not be confirmed. Reconnect Wi-Fi.'
      );
    } catch (err: any) {
      setReady(false);
      setProgressPhase('Update failed');
      setMessage(`${err?.message || 'Upload error'}. Driving remains paused.`);
    } finally {
      setBusy(false);
    }
  };

  const handleDismiss = async () => {
    if (busy) return;
    if (isLive && !rebootConfirmed && firmwareInfo) {
      try {
        await unlockFirmware(serverUrl, firmwareInfo.token);
      } catch {}
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.eyebrow}>SUPER CAR / SYSTEM</Text>
              <TouchableOpacity
                disabled={busy}
                onPress={handleDismiss}
                style={[styles.closeBtn, busy && styles.closeBtnDisabled]}>
                <Text style={styles.closeBtnText}>×</Text>
              </TouchableOpacity>
            </View>

            {/* Emblem */}
            <View style={styles.emblem}>
              <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#a1c2f4" strokeWidth={2}>
                <Path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5" />
              </Svg>
            </View>

            <Text style={styles.title}>
              Update firmware<Text style={styles.accentDot}>.</Text>
            </Text>
            <Text style={styles.description}>
              A new build. A better drive.{'\n'}Choose your ESP32 firmware to get started.
            </Text>

            {/* Device Info */}
            <View style={styles.deviceRow}>
              <View style={styles.deviceIndicator}>
                <View style={styles.greenDot} />
                <Text style={styles.deviceTitle}>SUPER CAR</Text>
              </View>
              <Text style={styles.deviceBuild}>
                {firmwareInfo?.build || 'ESP32-WROOM-32'}
              </Text>
            </View>

            {/* File Picker */}
            <TouchableOpacity
              activeOpacity={0.7}
              disabled={busy}
              onPress={handlePickFile}
              style={[styles.filePicker, busy && styles.pickerDisabled]}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#8daccd" strokeWidth={2}>
                <Path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5" />
              </Svg>
              <Text style={styles.pickerFilename}>
                {file ? file.name : 'Choose a .bin file'}
              </Text>
              <Text style={styles.pickerDetail}>
                {file
                  ? `${(file.size / 1024).toFixed(1)} KB · ESP32 application`
                  : 'Browse device · ESP32 application firmware'}
              </Text>
            </TouchableOpacity>

            {/* Progress Bar */}
            {showProgress && (
              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressPhase}>{progressPhase}</Text>
                  <Text style={styles.progressPercent}>{progressPercent}%</Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                </View>
              </View>
            )}

            {/* Status Message */}
            <Text style={styles.messageText}>{message}</Text>

            {/* Submit Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={!file || busy || !ready}
              onPress={handleUpload}
              style={[
                styles.submitBtn,
                (!file || busy || !ready) && styles.submitBtnDisabled,
              ]}>
              {busy ? (
                <ActivityIndicator color="#101a2a" size="small" />
              ) : (
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#101a2a" strokeWidth={2.2}>
                  <Path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5" />
                </Svg>
              )}
              <Text style={styles.submitBtnText}>Upload firmware</Text>
            </TouchableOpacity>

            {/* Footer Note */}
            <Text style={styles.footerNote}>
              {isLive
                ? 'WI-FI UPDATE · Use firmware.bin · Keep power connected'
                : 'DEMO PREVIEW · No firmware is sent to a device.'}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 8, 11, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#191c22',
    borderWidth: 1,
    borderColor: '#414854',
    borderRadius: 22,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    overflow: 'hidden',
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 1.8,
    color: '#81868f',
    fontWeight: '700',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#252932',
    borderWidth: 1,
    borderColor: '#3c424d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnDisabled: {
    opacity: 0.4,
  },
  closeBtnText: {
    fontSize: 20,
    color: '#9da7b7',
    lineHeight: 22,
  },
  emblem: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(110, 168, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(123, 168, 237, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#eceef0',
    letterSpacing: -0.5,
  },
  accentDot: {
    color: '#ff684b',
  },
  description: {
    fontSize: 11,
    lineHeight: 18,
    color: '#9ca6b5',
    marginTop: 8,
    marginBottom: 16,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 14,
    marginBottom: 14,
  },
  deviceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8ad8b1',
  },
  deviceTitle: {
    fontSize: 9,
    letterSpacing: 1,
    color: '#8ad8b1',
    fontWeight: '700',
  },
  deviceBuild: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: '#7c889b',
  },
  filePicker: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#627087',
    borderRadius: 12,
    backgroundColor: 'rgba(14, 18, 24, 0.4)',
    alignItems: 'center',
    paddingVertical: 22,
    paddingHorizontal: 12,
    gap: 8,
  },
  pickerDisabled: {
    opacity: 0.5,
  },
  pickerFilename: {
    fontSize: 12,
    fontWeight: '600',
    color: '#eceef0',
    textAlign: 'center',
  },
  pickerDetail: {
    fontSize: 9,
    color: '#7f8b9d',
    textAlign: 'center',
  },
  progressContainer: {
    marginTop: 14,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressPhase: {
    fontSize: 10,
    color: '#9bb8e0',
  },
  progressPercent: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#9bb8e0',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#303a48',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#8bb8f7',
    borderRadius: 3,
  },
  messageText: {
    fontSize: 10,
    lineHeight: 16,
    color: '#9aa8bb',
    marginVertical: 14,
    minHeight: 32,
  },
  submitBtn: {
    height: 46,
    borderRadius: 9,
    backgroundColor: '#8fb5ed',
    borderWidth: 1,
    borderColor: '#b4d0f5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnDisabled: {
    backgroundColor: '#2c3441',
    borderColor: '#404b5d',
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#101a2a',
  },
  footerNote: {
    fontSize: 7,
    letterSpacing: 0.5,
    color: '#929ba9',
    textAlign: 'center',
    marginTop: 14,
  },
});
