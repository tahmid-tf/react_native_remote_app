import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface TopBarProps {
  connected: boolean;
  onToggleConnection: () => void;
  onOpenFirmware: () => void;
  onOpenSettings: () => void;
  isLandscape: boolean;
  onToggleOrientation: () => void;
  compact?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  connected,
  onToggleConnection,
  onOpenFirmware,
  onOpenSettings,
  isLandscape,
  onToggleOrientation,
  compact = false,
}) => {
  return (
    <View style={[styles.topbar, compact && styles.compactTopbar]}>
      {/* Brand */}
      <View style={styles.brand}>
        <View style={styles.brandMark}>
          <View style={[styles.brandBar, styles.bar1]} />
          <View style={[styles.brandBar, styles.bar2]} />
          <View style={[styles.brandBar, styles.bar3]} />
        </View>
        <View>
          <Text style={[styles.brandName, compact && styles.compactBrandName]}>
            SUPER<Text style={styles.brandLight}>CAR</Text>
          </Text>
          {!compact && <Text style={styles.brandSubtitle}>REMOTE CONTROL</Text>}
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
          {connected ? 'CAR CONNECTED' : 'DISCONNECTED'}
        </Text>
        <Svg width={compact ? 12 : 14} height={compact ? 12 : 14} viewBox="0 0 24 24" fill="none" stroke={connected ? '#8ad8b1' : '#e68c83'} strokeWidth={2}>
          <Path d="M3 8a15 15 0 0 1 18 0M6 12a10 10 0 0 1 12 0m-9 4a5 5 0 0 1 6 0M12 20h.01" />
        </Svg>
      </TouchableOpacity>

      {/* Tools */}
      <View style={[styles.tools, compact && styles.compactTools]}>
        {/* Orientation Toggle Button */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onToggleOrientation}
          style={[styles.toolBtn, compact && styles.compactToolBtn]}
          accessibilityLabel="Toggle vertical / horizontal orientation">
          <Svg width={compact ? 12 : 14} height={compact ? 12 : 14} viewBox="0 0 24 24" fill="none" stroke="#bdc4cf" strokeWidth={2}>
            {isLandscape ? (
              // Portrait phone icon
              <Path d="M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM12 18h.01" />
            ) : (
              // Landscape phone icon / rotate icon
              <Path d="M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6zM18 12h.01" />
            )}
          </Svg>
          <Text style={[styles.toolBtnText, compact && styles.compactToolBtnText]}>{isLandscape ? 'Portrait' : 'Landscape'}</Text>
        </TouchableOpacity>

        {/* Firmware Button */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onOpenFirmware}
          style={[styles.toolBtn, compact && styles.compactToolBtn]}>
          <Svg width={compact ? 12 : 14} height={compact ? 12 : 14} viewBox="0 0 24 24" fill="none" stroke="#bdc4cf" strokeWidth={2}>
            <Path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5" />
          </Svg>
          <Text style={[styles.toolBtnText, compact && styles.compactToolBtnText]}>Firmware</Text>
        </TouchableOpacity>

        {/* Settings Button */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onOpenSettings}
          style={[styles.iconBtn, compact && styles.compactIconBtn]}>
          <Svg width={compact ? 14 : 16} height={compact ? 14 : 16} viewBox="0 0 24 24" fill="none" stroke="#8c929e" strokeWidth={2}>
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
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  compactTopbar: {
    height: 40,
    paddingHorizontal: 12,
  },
  compactBrandName: {
    fontSize: 13,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    transform: [{ skewX: '-20deg' }],
  },
  brandBar: {
    width: 4,
    backgroundColor: '#ff684b',
    borderRadius: 1,
  },
  bar1: {
    height: 14,
    opacity: 0.4,
  },
  bar2: {
    height: 18,
    opacity: 0.7,
  },
  bar3: {
    height: 22,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#eceef0',
  },
  brandLight: {
    color: '#b6bbc2',
    fontWeight: '400',
  },
  brandSubtitle: {
    fontSize: 6,
    letterSpacing: 1.5,
    color: '#6f757f',
    fontWeight: '600',
    marginTop: 2,
  },
  connectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(138, 216, 177, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(138, 216, 177, 0.25)',
  },
  compactConnectionPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 4,
  },
  compactConnectionText: {
    fontSize: 7,
  },
  pillDisconnected: {
    backgroundColor: 'rgba(230, 140, 131, 0.06)',
    borderColor: 'rgba(230, 140, 131, 0.25)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8ad8b1',
  },
  dotDisconnected: {
    backgroundColor: '#e68c83',
  },
  connectionText: {
    fontSize: 8,
    letterSpacing: 1,
    color: '#8ad8b1',
    fontWeight: '700',
  },
  textDisconnected: {
    color: '#e68c83',
  },
  tools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactTools: {
    gap: 5,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#23262d',
    borderWidth: 1,
    borderColor: '#3b424e',
    borderRadius: 6,
  },
  compactToolBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 4,
  },
  toolBtnText: {
    fontSize: 9,
    color: '#c6ccd6',
    fontWeight: '600',
  },
  compactToolBtnText: {
    fontSize: 8,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#23262d',
    borderWidth: 1,
    borderColor: '#3b424e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactIconBtn: {
    width: 26,
    height: 26,
  },
});
