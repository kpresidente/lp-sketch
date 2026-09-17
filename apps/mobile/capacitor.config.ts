import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // The preview ID is for unsigned builds. TestFlight requires IOS_BUNDLE_ID.
  appId: process.env.IOS_BUNDLE_ID || 'app.lpsketch.preview',
  appName: 'LP Sketch',
  webDir: 'dist',
}

export default config
