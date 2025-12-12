import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.afonso.qzerocerto',
  appName: 'QZero',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    hostname: 'app.qzero.local',
    allowNavigation: [
      'https://waitless-qzero.com',
      'https://*.waitless-qzero.com',
      'https://q-zero-afonsomarques80.replit.app',
      'https://*.replit.dev',
      'https://*.replit.app',
      'https://*.stripe.com',
      'https://js.stripe.com',
      'https://api.stripe.com',
      'https://maps.googleapis.com',
      'https://*.googleapis.com',
      'https://translation.googleapis.com'
    ]
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#3b82f6",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true
    },
    CapacitorHttp: {
      enabled: true
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: false
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    backgroundColor: "#ffffff",
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined
    }
  },
  ios: {
    scrollEnabled: true,
    allowsLinkPreview: true,
    backgroundColor: "#ffffff",
    preferredContentMode: 'mobile',
    scheme: 'qzero'
  }
};

export default config;
