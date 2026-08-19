import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lonewolffsd.soundwave',
  appName: 'Soundwave Music',
  webDir: 'dist',

  server: {
    url: 'https://soundwave.lonewolffsd.in',
    cleartext: true,
    androidScheme: 'https',
    // THIS IS THE KEY: It allows the app to navigate to Google without jumping out
    allowNavigation: [
      'accounts.google.com',
      '*.firebaseapp.com',
      '*.vercel.app',
      "*.youtube.com",
      "*.youtube-nocookie.com",
      "*.googlevideo.com"
    ]
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#000000",
      androidScaleType: "CENTER_CROP",
      showSpinner: false
    }
  }
};

export default config;