import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

interface TopBarProps {
  connected: boolean;
  onToggleConnection: () => void;
  onOpenFirmware: () => void;
  onOpenSettings: () => void;
  compact?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  connected,
  onToggleConnection,
  onOpenFirmware,
  onOpenSettings,
  compact = true,
}) => {
  return (
    <View style={[styles.topbar, compact && styles.compactTopbar]}>
      {/* Brand & Cockpit Badge */}
      <View style={styles.brand}>
        <View style={styles.brandMark}>
          <View style={[styles.brandBar, styles.bar1]} />
          <View style={[styles.brandBar, styles.bar2]} />
          <View style={[styles.brandBar, styles.bar3]} />
        </View>
        <View style={styles.brandTextCol}>
          <View style={styles.brandTitleRow}>
            <Text style={[styles.brandName, compact && styles.compactBrandName]}>
              SUPER<Text style={styles.brandAccent}>CAR</Text>
            </Text>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          </View>
          <Text style={styles.brandSubtitle}>ESP32 RC COCKPIT</Text>
        </View>
      </View>

      {/* Connection Pill */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onToggleConnection}
        style={[
          styles.connectionPill,
          compact && styles.compactConnectionPill,
          !connected && styles.pillDisconnected,
        ]}>
        <View style={[styles.statusDot, !connected && styles.dotDisconnected]} />
        <Text style={[styles.connectionText, compact && styles.compactConnectionText, !connected && styles.textDisconnected]}>
          {connected ? 'LINK ACTIVE' : 'DISCONNECTED'}
        </Text>
        <Svg width={compact ? 13 : 15} height={compact ? 13 : 15} viewBox="0 0 24 24" fill="none" stroke={connected ? '#80e0b0' : '#e68c83'} strokeWidth={2.2}>
          <Path d="M3 8a15 15 0 0 1 18 0M6 12a10 10 0 0 1 12 0m-9 4a5 5 0 0 1 6 0M12 20h.01" />
        </Svg>
      </TouchableOpacity>

      {/* Tools */}
      <View style={[styles.tools, compact && styles.compactTools]}>
        {/* Firmware Button */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onOpenFirmware}
          style={[styles.toolBtn, compact && styles.compactToolBtn]}>
          <Svg width={compact ? 12 : 14} height={compact ? 12 : 14} viewBox="0 0 24 24" fill="none" stroke="#6ea8ff" strokeWidth={2}>
            <Path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5" />
          </Svg>
          <Text style={[styles.toolBtnText, compact && styles.compactToolBtnText]}>OTA</Text>
        </TouchableOpacity>

        {/* Settings Button */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onOpenSettings}
          style={[styles.iconBtn, compact && styles.compactIconBtn]}>
          <Svg width={compact ? 13 : 15} height={compact ? 13 : 15} viewBox="0 0 24 24" fill="none" stroke="#a0aab8" strokeWidth={2}>
            <Path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
            <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </Svg>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  topbar: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(16, 18, 22, 0.85)',
  },
  compactTopbar: {
    height: 36,
    paddingHorizontal: 10,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTextCol: {
    justifyContent: 'center',
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  brandMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
    transform: [{ skewX: '-22deg' }],
  },
  brandBar: {
    width: 3.5,
    backgroundColor: '#ff684b',
    borderRadius: 1,
  },
  bar1: {
    height: 11,
    opacity: 0.35,
  },
  bar2: {
    height: 15,
    opacity: 0.7,
  },
  bar3: {
    height: 19,
    backgroundColor: '#ff7a5c',
  },
  brandName: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: '#ffffff',
  },
  compactBrandName: {
    fontSize: 12.5,
  },
  brandAccent: {
    color: '#ff684b',
    fontWeight: '900',
  },
  proBadge: {
    backgroundColor: 'rgba(255, 104, 75, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 104, 75, 0.35)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  proBadgeText: {
    fontSize: 6.5,
    fontWeight: '800',
    color: '#ff927a',
    letterSpacing: 0.6,
  },
  brandSubtitle: {
    fontSize: 5.5,
    letterSpacing: 1.2,
    color: '#6e7683',
    fontWeight: '700',
    marginTop: 0.5,
  },
  connectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(128, 224, 176, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(128, 224, 176, 0.35)',
  },
  compactConnectionPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  compactConnectionText: {
    fontSize: 7.5,
  },
  pillDisconnected: {
    backgroundColor: 'rgba(230, 140, 131, 0.07)',
    borderColor: 'rgba(230, 140, 131, 0.3)',
  },
  statusDot: {
    width: 5.5,
    height: 5.5,
    borderRadius: 2.75,
    backgroundColor: '#80e0b0',
    shadowColor: '#80e0b0',
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  dotDisconnected: {
    backgroundColor: '#e68c83',
    shadowColor: '#e68c83',
  },
  connectionText: {
    fontSize: 8,
    letterSpacing: 0.8,
    color: '#9deac2',
    fontWeight: '800',
  },
  textDisconnected: {
    color: '#f09b93',
  },
  tools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactTools: {
    gap: 5,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    backgroundColor: '#1b1e25',
    borderWidth: 1,
    borderColor: '#313744',
    borderRadius: 6,
  },
  compactToolBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 3,
  },
  toolBtnText: {
    fontSize: 8,
    color: '#98c1fe',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  compactToolBtnText: {
    fontSize: 7.5,
  },
  iconBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#1b1e25',
    borderWidth: 1,
    borderColor: '#313744',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactIconBtn: {
    width: 24,
    height: 24,
  },
});
