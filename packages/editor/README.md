# Shared editor

Owns the SolidJS application, components, pointer controllers, reactive hooks, PDF and annotation rendering, and export generation. Both the browser application and the future Capacitor application use this package.

The public entry point exports `App`, `AppErrorBoundary`, and `installGlobalErrorTelemetry`. Load `@lp-sketch/editor/styles.css` once in each application entry point. The shared help build plugin is exported as `@lp-sketch/editor/help/vite-plugin`; it writes generated help into the consuming application's Vite `publicDir`.

This initial migration preserves existing browser file and autosave behavior in the editor's hooks and library modules. Those integrations will be extracted behind platform services when native document handling is implemented. This package is not yet a complete mobile editor.

Input behavior should respond to mouse, pen, and touch capabilities independently of whether the app runs in a browser or Capacitor. Avoid app-specific checks throughout drawing logic.
