/* @refresh reload */
import { render } from 'solid-js/web'
import '@lp-sketch/editor/styles.css'
import { App, AppErrorBoundary, installGlobalErrorTelemetry } from '@lp-sketch/editor'
import { Capacitor } from '@capacitor/core'
import { exportNativeFile } from './nativeFileExport'

const root = document.getElementById('root')
installGlobalErrorTelemetry()

render(
  () => (
    <AppErrorBoundary>
      <App exportFile={Capacitor.isNativePlatform() ? exportNativeFile : undefined} />
    </AppErrorBoundary>
  ),
  root!,
)
