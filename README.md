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
It is built with angular.js and is a completely standalone application that
uses only HTTP to communicate with the backend.  There is no server side
rendering component.

# Requirements

Node.js 20 or newer (see `.nvmrc`).  Run `npm install` to install the build
tools and the browser libraries.

# Building

`npm run build` produces a UI distribution in the `dist` directory.  Add
`-- --docpath ../sis-api/docs` to render the SIS API documentation into the UI.

The build does not include `app/js/config.js`; deployments provide their own
(see [Configuration](#configuration)).

# Configuration

Configuration for the SIS UI is specified via the angular `sisconfig` module
defined in `src/app/js/config.js`.  The only configuration required is the
SIS backend URL.  See `src/app/js/config.js.sample` for an example.

# Running the server

`npm run serve` builds the UI, serves it on http://127.0.0.1:9000/ and
rebuilds and reloads the browser when files in `src` change.  It uses
`src/app/js/config.js`; pass `--api-url` to point at a SIS API instead, and
`--docpath` to include the API documentation.  For example:

`npm run serve -- --api-url http://localhost:3000 --docpath ../sis-api/docs`

Use `--port` and `--host` to change where it listens.

The UI is being rewritten in Vue 3 and TypeScript (in `vue/`).  Start its
development server with `SIS_API_URL=http://localhost:3000 npm run dev:vue`
(http://127.0.0.1:9001/; add `SIS_DOCPATH=../sis-api/docs` for the API
documentation) and build it with `npm run build:vue` (into
`dist-vue`).  It reads the same `config.js` as the current UI.

# Testing

- `npm run lint` checks the code with eslint, and `npm run typecheck` the
  TypeScript of the Vue rewrite.
- `npm test` runs the unit tests: mocha with jsdom for the current UI
  (services, filters, directives, the query language and the build scripts),
  then Vitest for the Vue rewrite.
- `npm run test:e2e` runs the end-to-end tests (Playwright).  They drive the
  built UI in Chromium against a real SIS API and MongoDB, which the test setup
  starts and seeds itself.  They need:
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
