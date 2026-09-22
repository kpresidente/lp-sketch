# Browser application

The browser entry point mounts `@lp-sketch/editor`. This workspace owns the HTML document, static public assets, and Vite configuration.

From the repository root, run `npm run dev`, `npm run build`, or `npm run preview`. Arguments such as `npm run dev -- --host 127.0.0.1 --port 4173` are forwarded to Vite.

Vite reads environment files from the repository root and writes the browser production build to the root `dist/` directory, preserving the existing Azure Static Web Apps configuration. The reporting API remains at the root `api/` directory.
