import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.fiskalniracun.app',
  appName: 'Fiskalni račun',
  webDir: 'dist',

  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
    hostname: 'app.fiskalniracun.rs',
    allowNavigation: ['*.google.com', '*.sentry.io'],
  },

  // ⭐ iOS specifičnosti
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
  },

  // ⭐ Android specifičnosti
  android: {
    allowMixedContent: false,
    captureInput: true,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0ea5e9',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Camera: {
      saveToGallery: false,
      quality: 90,
    },
    Keyboard: {
      // Resize the web view when the keyboard appears
      resize: 'body',
      // iOS: scroll to focused input
      scrollAssist: true,
      // Hide accessory bar on iOS
      hideAccessoryBarOnIOS: false,
    },
    StatusBar: {
      // Use overlay for transparent status bar on Android
      overlay: false,
      // Default style
      style: 'dark',
    },
    Haptics: {
      // Enable haptic feedback
      enable: true,
    },
  },
}

export default config
