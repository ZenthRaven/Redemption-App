import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zenthraven.redemption',
  appName: 'Redemption',
  webDir: 'dist',
  backgroundColor: '#07080b',
  android: {
    backgroundColor: '#07080b',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_redemption',
      iconColor: '#FF4A2B',
    },
  },
};

export default config;
