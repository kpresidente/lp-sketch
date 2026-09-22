/* @refresh reload */
import { render } from 'solid-js/web'
import '@lp-sketch/editor/styles.css'
import { App, AppErrorBoundary, installGlobalErrorTelemetry } from '@lp-sketch/editor'

const root = document.getElementById('root')
installGlobalErrorTelemetry()

render(
  () => (
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  ),
  root!,
)
