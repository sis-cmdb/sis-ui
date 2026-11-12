# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A standalone AngularJS 1.2 single-page UI for the SIS CMDB backend (schemas, entities, hooks, scripts, users, tokens). It talks to the backend only over HTTP via the `sis` JS client (`SIS.client`, npm package `sis`), which uses its own XMLHttpRequest calls, not `$http`. There is no server-side rendering. The backend lives in the sibling repo `../sis-api` (Node 20+, Mongoose 8, JWT sessions).

## Commands

Node 20+ (`.nvmrc` says 24; the default `node` on this machine may be an old nvm version, so check `node -v`).

- `npm install` - build tools plus the browser libraries, pinned to the exact versions the old Bower setup used. Three are pinned to git commits and `angular-ui-bootstrap` 0.11.2 is vendored in `vendor/` because those versions are not on npm.
- `npm run build` - build into `dist/`. `-- --docpath ../sis-api/docs` renders the API docs; `-- --with-config` copies `src/app/js/config.js`.
- `npm run serve -- --api-url http://localhost:3000 [--docpath ../sis-api/docs]` - build, serve on 127.0.0.1:9000, rebuild and live reload on changes under `src/`. Without `--api-url` it needs `src/app/js/config.js` (copy `config.js.sample`; gitignored).
- `npm run lint` - eslint (flat config, `eslint.config.js`). App code is linted as ES5 browser scripts.
- `npm test` - mocha unit tests (`test/unit`). Single file: `npx mocha test/unit/user.test.js`; single test: add `-g "<name>"`.
- `npm run test:e2e` - Playwright (`test/e2e`, `playwright.config.js`). Single test: `npx playwright test test/e2e/auth.spec.js` or `-g "<name>"`. Needs `../sis-api` (or `SIS_API_DIR`) with `npm install` done and a MongoDB at `SIS_E2E_MONGO_URL` (default `mongodb://localhost:27017/sis-ui-e2e`; this database is dropped every run). On this machine MongoDB runs in podman on port 27018: `SIS_E2E_MONGO_URL=mongodb://localhost:27018/sis-ui-e2e npm run test:e2e`.

## Build pipeline (scripts/build.js)

- The app bundle is `src/app/js/app.js`, `components/*.js`, the generated query parser, the compiled templates, then `controllers/*.js`, **in that order**, minified with terser (`mangle: false`) into `dist/app/js/sisui.min.js` + source map. New JS files only need to be in those directories. `appSources()` / `appBundleParts()` are the single source of that order; the unit test harness uses them too.
- `src/app/partials/*.html` become `$templateCache` entries (`app/partials/<name>`), so `templateUrl`s resolve from the cache. The minifier uses `conservativeCollapse` so whitespace renders like the source (gaps between inline-block buttons depend on it).
- `VENDOR_JS` lists the third party libraries concatenated, in order, into `vendor-libs.js`. Ace is copied separately and loaded by its own script tag.
- `src/pegjs/query.pegjs` is compiled with peggy into the `SisQueryParser` factory (wrapped in parentheses because peggy emits a leading comment).
- `src/index.njk` and `src/docs/docs.njk` are nunjucks templates (autoescape off). Docs pages are written extensionless to `dist/app/docs/<name>`; `scripts/serve.js` serves them as HTML.
- `config.js` (module `sisconfig`, constant `API_URL`) is deliberately not bundled so deployments can swap it. If `API_URL` is falsy, `SisApi` uses the page's own URL.

## App architecture (src/app/js)

- `app.js` declares the `sisui` module, all ui-router states (abstract root `app`, nested `app.schemas.*`, `app.entities.*`, ...) and a `run` block. The root state's resolve handles `?username=&token=` login; `?embed=true` hides header, footer and sidebar. The run block records `$rootScope.previousState`, which `SisUtil.goBack()` uses to decide between `history.back()` and a fallback state (never call `history.back()` directly: a page opened from a link would leave the app).
- `components/`:
  - `SisApi` wraps `SIS.client` endpoints into `$q` promises; `endSession()` (logout) uses `$http`.
  - `SisUser` keeps the login in localStorage (`t`). Session tokens are JWTs (not stored by the API): they are validated with `GET /users/<name>/tokens` and their expiry is read from the token; logout calls `DELETE /users/auth_token`. Persistent (opaque) tokens are looked up via `/tokens/<token>` and are never revoked on logout.
  - `SisSession` is an in-memory TTL cache (schemas, current schema/entity).
  - `SisUtil` has descriptor helpers, permission checks, `goBack`, `escapeHtml`, `escapeDeltaKeys`, `validationMessage`.
  - `EndpointPager` drives smart-table list pages and turns filter text into SIS queries (`parseSearch`).
  - `directives.js` has the recursive schema/entity form directives (hence `digestTtl(200)`), `sisCodeEditor` (Ace) and `sisDocumentation`.
- `controllers/` has one controller per partial with matching names.
- Implicit (non-annotated) DI only works because terser runs with `mangle: false`; keep it or add `["dep", function(dep){}]` annotations.
- HTML from data must be escaped before `$sce.trustAsHtml` (see `commit-list.js`). The jsondiffpatch formatter does not escape keys, hence `escapeDeltaKeys`.
- Anchors used as buttons need `href=""` so they are focusable and reachable as links.

## Tests

- Unit (`test/unit`): `helpers/app.js` loads the vendor libs, angular-mocks and the app sources into jsdom and returns `injector(...overrides)` for a fresh `ng`+`ngMock`+`sisui` injector. Objects from the page live in another realm, so compare with `JSON.parse(JSON.stringify(x))` or `Array.from`, and create arrays with `app.window.Array` when `instanceof Array` matters.
- E2E (`test/e2e`): `support/global-setup.js` builds into `.e2e/dist`, drops the database, seeds a super user with sis-api's `tools/useradmin.js`, and starts sis-api and the UI server on free ports. Fixtures (`fixtures.js`): `api` (REST client as super user; what it creates is deleted after the test), `uniqueName`, `createUser`, `signIn(page, user?)`, and `pageErrors` (any console error or uncaught exception fails the test; `pageErrors.allow(/re/)` for expected ones). Tests run fully parallel, so use unique names and never log out the shared super user (logout ends all of a user's sessions); create a user instead. `support/pages.js` locates form fields by their label text, because inputs are not linked to labels.
