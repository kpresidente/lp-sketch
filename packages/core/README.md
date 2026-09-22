# Shared core

Owns project types, schema validation and migration, history operations, geometry, snapping, spacing, and other calculations that do not access a UI or persistent storage.

Consumers import the project API from `@lp-sketch/core` or focused modules such as `@lp-sketch/core/lib/geometry` and `@lp-sketch/core/types/project`. Package exports resolve TypeScript source directly through the consuming application's bundler; these private packages are not published.

Dependencies flow from applications to editor to core. Core must not import an application, editor, SolidJS, or Capacitor. Browser rendering, font measurement, storage, and file dialogs belong outside this package. Standard runtime APIs such as `structuredClone` and `crypto` are shared by the supported environments.

Tests remain beside their implementation and run through the root Vitest configuration. The project schema and migration pipeline are shared by every application; introducing a mobile app does not create a new file format.
