import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { DiagnosticsData, fetchDiagnostics } from '@/services/diagnostics';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  isLive: boolean;
  onToggleLive: (live: boolean) => void;
  serverUrl: string;
  onUpdateServerUrl: (url: string) => void;
  connected: boolean;
  onReconnect: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  isLive,
  onToggleLive,
  serverUrl,
  onUpdateServerUrl,
  connected,
  onReconnect,
}) => {
  const [urlInput, setUrlInput] = useState<string>(serverUrl);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [diagLoading, setDiagLoading] = useState<boolean>(false);
  const [diagError, setDiagError] = useState<string | null>(null);

  // Keep the input in sync with the saved URL (which is restored from storage
  // after mount) and discard unsaved edits each time the dialog is reopened.
  const [syncedUrl, setSyncedUrl] = useState<string>(serverUrl);
  const [wasVisible, setWasVisible] = useState<boolean>(visible);
  if (syncedUrl !== serverUrl || wasVisible !== visible) {
    setSyncedUrl(serverUrl);
    setWasVisible(visible);
    if (visible || syncedUrl !== serverUrl) {
      setUrlInput(serverUrl);
      setUrlError(null);
    }
  }

  const handleSaveUrl = () => {
    let clean = urlInput.trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(clean)) {
      clean = `http://${clean}`;
    }
    // Host (IPv4 or name) with optional port; the API path is added by the app.
    if (!/^https?:\/\/[a-z0-9.-]+(:\d{1,5})?$/i.test(clean)) {
      setUrlError('Enter an address like 192.168.4.1 or http://192.168.4.1:80');
      return;
    }
    setUrlError(null);
    setUrlInput(clean);
    onUpdateServerUrl(clean);
  };

  const handleLoadDiagnostics = async () => {
    setDiagLoading(true);
    setDiagError(null);
    try {
      const data = await fetchDiagnostics(serverUrl);
      setDiagnostics(data);
    } catch (err: any) {
      setDiagError(err?.message || 'Failed to fetch diagnostics from ESP32');
    } finally {
      setDiagLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.eyebrow}>CONFIGURATION & TELEMETRY</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>×</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.title}>Controller Settings</Text>

            {/* Operating Mode Switch */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>OPERATING MODE</Text>
              <View style={styles.modeToggleRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => onToggleLive(false)}
                  style={[styles.modeBtn, !isLive && styles.modeBtnActive]}>
                  <Text style={[styles.modeBtnText, !isLive && styles.modeBtnTextActive]}>
                    Simulated Demo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => onToggleLive(true)}
                  style={[styles.modeBtn, isLive && styles.modeBtnActive]}>
                  <Text style={[styles.modeBtnText, isLive && styles.modeBtnTextActive]}>
                    Live ESP32 Wi-Fi
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.modeHint}>
                {isLive
                  ? 'Connects directly to the ESP32 Access Point (192.168.4.1) or home Wi-Fi IP.'
                  : 'Runs offline simulation with full mixing, animations, and zero hardware required.'}
              </Text>
            </View>

            {/* ESP32 Endpoint Settings */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ESP32 AP / IP ADDRESS</Text>
              <View style={styles.inputRow}>
                <TextInput
                  value={urlInput}
                  onChangeText={setUrlInput}
                  placeholder="http://192.168.4.1"
                  placeholderTextColor="#5a6270"
                  style={styles.textInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={handleSaveUrl}
                  style={styles.saveBtn}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
              {urlError && <Text style={styles.errorText}>{urlError}</Text>}
            </View>

            {/* Diagnostics Section */}
            <View style={styles.section}>
              <View style={styles.diagHeader}>
                <Text style={styles.sectionTitle}>ESP32 DIAGNOSTICS</Text>
                <TouchableOpacity
                  disabled={diagLoading}
                  onPress={handleLoadDiagnostics}
                  style={styles.fetchDiagBtn}>
                  {diagLoading ? (
                    <ActivityIndicator size="small" color="#6ea8ff" />
                  ) : (
                    <Text style={styles.fetchDiagText}>Poll ESP32</Text>
                  )}
                </TouchableOpacity>
              </View>

              {diagError && <Text style={styles.errorText}>{diagError}</Text>}

              {diagnostics ? (
                <View style={styles.diagBox}>
                  <View style={styles.diagRow}>
                    <Text style={styles.diagKey}>Reset Reason:</Text>
                    <Text style={styles.diagVal}>{diagnostics.resetReason}</Text>
                  </View>
                  <View style={styles.diagRow}>
                    <Text style={styles.diagKey}>Uptime:</Text>
                    <Text style={styles.diagVal}>{(diagnostics.uptimeMs / 1000).toFixed(1)}s</Text>
                  </View>
                  <View style={styles.diagRow}>
                    <Text style={styles.diagKey}>Free Heap:</Text>
                    <Text style={styles.diagVal}>{diagnostics.freeHeap} bytes</Text>
                  </View>
                  <View style={styles.diagRow}>
                    <Text style={styles.diagKey}>Boot Count:</Text>
                    <Text style={styles.diagVal}>{diagnostics.bootCount}</Text>
                  </View>
                  <View style={styles.diagRow}>
                    <Text style={styles.diagKey}>Heartbeat Age:</Text>
                    <Text style={styles.diagVal}>{diagnostics.motorHeartbeatAgeMs} ms</Text>
                  </View>
                  <View style={styles.diagRow}>
                    <Text style={styles.diagKey}>System Stop:</Text>
                    <Text style={styles.diagVal}>{diagnostics.systemStop ? 'TRUE' : 'FALSE'}</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.noDiagText}>
                  Tap &quot;Poll ESP32&quot; when connected to retrieve live hardware statistics.
                </Text>
              )}
            </View>

            {/* Reconnect Action */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                onReconnect();
                onClose();
              }}
              style={styles.reconnectBtn}>
              <Text style={styles.reconnectText}>
                {connected ? 'Force Reconnect' : 'Connect to Car'}
              </Text>
            </TouchableOpacity>
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
  closeBtnText: {
    fontSize: 20,
    color: '#9da7b7',
    lineHeight: 22,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#eceef0',
    marginTop: 12,
    marginBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 8,
    letterSpacing: 1.5,
    color: '#767d88',
    fontWeight: '700',
    marginBottom: 8,
  },
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#121418',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#2e333d',
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeBtnActive: {
    backgroundColor: '#252932',
    borderWidth: 1,
    borderColor: '#444d5c',
  },
  modeBtnText: {
    fontSize: 11,
    color: '#79818e',
    fontWeight: '600',
  },
  modeBtnTextActive: {
    color: '#6ea8ff',
  },
  modeHint: {
    fontSize: 9,
    color: '#828a97',
    lineHeight: 14,
    marginTop: 6,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  textInput: {
    flex: 1,
    height: 42,
    backgroundColor: '#121418',
    borderWidth: 1,
    borderColor: '#2e333d',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#eceef0',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  saveBtn: {
    backgroundColor: '#252932',
    borderWidth: 1,
    borderColor: '#414854',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#eceef0',
  },
  diagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fetchDiagBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(110, 168, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(110, 168, 255, 0.3)',
  },
  fetchDiagText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#6ea8ff',
  },
  diagBox: {
    backgroundColor: '#121418',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2e333d',
    gap: 6,
  },
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  diagKey: {
    fontSize: 9,
    color: '#7e8794',
    fontFamily: 'monospace',
  },
  diagVal: {
    fontSize: 9,
    color: '#a1c2f4',
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  noDiagText: {
    fontSize: 9,
    color: '#676e7a',
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 9,
    color: '#ff684b',
    marginBottom: 8,
  },
  reconnectBtn: {
    height: 44,
    borderRadius: 8,
    backgroundColor: '#212630',
    borderWidth: 1,
    borderColor: '#3c4554',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  reconnectText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#cad4e0',
  },
});
