import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.fiskalniracun.app',
  appName: 'Fiskalni račun',
  webDir: 'dist',

  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
    hostname: 'app.fiskalniracun.rs',
    allowNavigation: ['*.supabase.co', '*.google.com', '*.sentry.io'],
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
  },
}

export default config
