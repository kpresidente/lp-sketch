/// <reference types="@capacitor/status-bar" />
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // The preview ID is for unsigned builds. TestFlight requires IOS_BUNDLE_ID.
  appId: process.env.IOS_BUNDLE_ID || 'app.lpsketch.preview',
  appName: 'LP Sketch',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      // Reserve the OS-reported status bar height outside the editor viewport.
      overlaysWebView: false,
      // LIGHT means dark system icons on a light background.
      style: 'LIGHT',
      backgroundColor: '#eef1f5',
    },
  },
}

export default config
