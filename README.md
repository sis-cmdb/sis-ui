Table of Contents
=================

- [Description](#description)
- [Requirements](#requirements)
- [Building](#building)
- [Configuration](#configuration)
- [Running the server](#running-the-server)
- [Testing](#testing)
- [LICENSE](#license)

# Description

The sis-ui is a generic UI that lets users create schemas, hooks, and entities.
It is built with Vue 3 and TypeScript and is a completely standalone
application that uses only HTTP to communicate with the backend.  There is no
server side rendering component.

# Requirements

Node.js 20 or newer (see `.nvmrc`).  Run `npm install` to install the build
tools and the browser libraries.

# Building

`npm run build` type checks the code and produces a UI distribution in the
`dist` directory.  Add `-- --docpath ../sis-api/docs` to render the SIS API
documentation into the UI.

The build does not include `app/js/config.js`; deployments provide their own
(see [Configuration](#configuration)).  `-- --with-config` copies `config.js`
from the project into the build instead.

`dist/build.json` has the version and build information, which the footer
shows.  Set `BUILD_NUMBER`, `GIT_COMMIT_HASH` and `BUILD_ID` when building to
fill it in.

# Configuration

The SIS UI reads `app/js/config.js` (next to `index.html`) when it starts.  The
only configuration required is the SIS backend URL:

```javascript
window.SIS_CONFIG = {
    API_URL: "https://sis.example.com"
};
```

The format of earlier versions of the UI keeps working:

```javascript
angular.module('sisconfig', [])
    .constant("API_URL", "https://sis.example.com");
```

Without an `API_URL` the UI expects the API at the URL it was loaded from.  See
`config.js.sample`.

# Running the server

`npm run serve` serves the UI on http://127.0.0.1:9000/ and updates the browser
when files in `src` change.  It uses `config.js` in the project (copy
`config.js.sample`); pass `--api-url` to point at a SIS API instead, and
`--docpath` to include the API documentation.  For example:

`npm run serve -- --api-url http://localhost:3000 --docpath ../sis-api/docs`

Use `--port` and `--host` to change where it listens.  `npm run preview`
serves the last build.

# Testing

- `npm run lint` checks the code with eslint, and `npm run typecheck` the
  TypeScript.
- `npm test` runs the unit tests (Vitest).
- `npm run test:e2e` runs the end-to-end tests (Playwright).  They drive the
  built UI in Chromium against a real SIS API and MongoDB, which the test setup
  starts and seeds itself, and compare every page with screenshot baselines.
  They need:
    - a checkout of [sis-api](https://github.com/sis-cmdb/sis-api) with
      `npm install` done, at `../sis-api` or in `SIS_API_DIR`
    - a MongoDB server.  The tests drop and recreate the database given by
      `SIS_E2E_MONGO_URL` (default `mongodb://localhost:27017/sis-ui-e2e`)
    - Chromium for Playwright: `npx playwright install chromium`
- `npm run test:all` runs all of these.

Run one end-to-end file or test with `npx playwright test test/e2e/auth.spec.js`
or `npx playwright test -g "survives a page reload"`.  Failed tests keep a
screenshot and a trace in `test-results`; open a trace with
`npx playwright show-trace <path>`.

# LICENSE

This software is licensed under the BSD 3-Clause license.  Please refer to the [LICENSE](./LICENSE) for more information.
