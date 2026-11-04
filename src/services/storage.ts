import AsyncStorage from '@react-native-async-storage/async-storage';

const DRIVE_MODE_KEY = '@supercar_drive_mode';
const SERVER_URL_KEY = '@supercar_server_url';
const LIVE_MODE_KEY = '@supercar_live_mode';

export type DriveMode = 'mecanum' | 'classic';

export const AppStorage = {
  async getDriveMode(): Promise<DriveMode> {
    try {
      const value = await AsyncStorage.getItem(DRIVE_MODE_KEY);
      if (value === 'classic' || value === 'mecanum') {
        return value;
      }
    } catch {}
    return 'mecanum';
  },

  async setDriveMode(mode: DriveMode): Promise<void> {
    try {
      await AsyncStorage.setItem(DRIVE_MODE_KEY, mode);
    } catch {}
  },

  async getServerUrl(): Promise<string> {
    try {
      const value = await AsyncStorage.getItem(SERVER_URL_KEY);
      if (value) return value;
    } catch {}
    return 'http://192.168.4.1';
  },

  async setServerUrl(url: string): Promise<void> {
    try {
      await AsyncStorage.setItem(SERVER_URL_KEY, url);
    } catch {}
  },

  async getIsLiveMode(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(LIVE_MODE_KEY);
      if (value !== null) return value === 'true';
    } catch {}
    return true;
  },

  async setIsLiveMode(live: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(LIVE_MODE_KEY, String(live));
    } catch {}
  },
};
