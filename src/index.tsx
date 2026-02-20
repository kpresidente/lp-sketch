/* @refresh reload */
import { render } from 'solid-js/web'
import '@tabler/icons-webfont/dist/tabler-icons.min.css'
import './index.css'
import App from './App.tsx'
import AppErrorBoundary from './components/AppErrorBoundary.tsx'
import { installGlobalErrorTelemetry } from './lib/telemetry.ts'

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
