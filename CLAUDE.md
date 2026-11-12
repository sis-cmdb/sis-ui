# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A standalone AngularJS 1.2 single-page UI for the SIS CMDB backend (schemas, entities, hooks, scripts, users, tokens). It talks to the backend only over HTTP via the `sis` JS client (`SIS.client`, npm package `sis`), which uses its own XMLHttpRequest calls, not `$http`. There is no server-side rendering. The backend lives in the sibling repo `../sis-api` (Node 20+, Mongoose 8, JWT sessions).

It is being rewritten in Vue 3 + TypeScript + Vite in `vue/` (see "Vue rewrite" below); the AngularJS app in `src/` stays the shipped UI until the rewrite replaces it. Keep the same look and every existing URL.

## Commands

Node 20+ (`.nvmrc` says 24; the default `node` on this machine may be an old nvm version, so check `node -v`).

- `npm install` - build tools plus the browser libraries, pinned to the exact versions the old Bower setup used. Three are pinned to git commits and `angular-ui-bootstrap` 0.11.2 is vendored in `vendor/` because those versions are not on npm.
- `npm run build` - build into `dist/`. `-- --docpath ../sis-api/docs` renders the API docs; `-- --with-config` copies `src/app/js/config.js`.
- `npm run serve -- --api-url http://localhost:3000 [--docpath ../sis-api/docs]` - build, serve on 127.0.0.1:9000, rebuild and live reload on changes under `src/`. Without `--api-url` it needs `src/app/js/config.js` (copy `config.js.sample`; gitignored).
- `npm run dev:vue` - Vite dev server for the Vue rewrite on 127.0.0.1:9001; `SIS_API_URL=http://localhost:3000 npm run dev:vue` generates its `config.js`. `npm run build:vue` type checks and builds into `dist-vue/`; `npm run typecheck` only type checks (`vue-tsc --build`, `tsconfig.*.json`).
- `npm run lint` - eslint (flat config, `eslint.config.js`), fails on warnings. AngularJS app code is linted as ES5 browser scripts, `vue/` with typescript-eslint and eslint-plugin-vue.
- `npm test` - mocha unit tests (`test/unit`, AngularJS) then Vitest (`vue/src/**/*.test.ts`). Single file: `npx mocha test/unit/user.test.js` or `npx vitest run vue/src/lib/session.test.ts`; single test: add `-g "<name>"` / `-t "<name>"`.
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

## Vue rewrite (vue/)

- `vite.config.mts` (root `vue/`; `.mts` because package.json is CommonJS). `@` is `vue/src`; `@grammar` is `src/pegjs`, whose `query.pegjs` is compiled on import by the `sis-peggy` plugin, so both apps share one grammar.
- Runtime config: `vue/index.html` loads `public/config-compat.js` and then the deployment's unbundled `config.js` (`vite-ignore`). `config.js` may set `window.SIS_CONFIG = { API_URL }` or use the AngularJS format (`angular.module('sisconfig', []).constant('API_URL', ...)`), which the shim captures, so existing deployments need no change. Without `API_URL` the API is expected in the directory the UI was loaded from.
- `vue/src/lib/` is framework free and unit tested: `api/client.ts` (typed fetch client replacing the `sis` package: `SisClient` with `schemas`, `hooks`, `scripts`, `users`, `entities(name)`, `tokens(user)`, `.commits(id)`, `list` returns `{ results, totalCount }`, errors are `SisApiError` with `status` 0 when unreachable), `session.ts` (the login; same localStorage key `t` and format as `SisUser`, so logins carry over), `permissions.ts` (all permission rules, taking the user explicitly), `query/parseSearch.ts`, `format.ts` (`fromNow` reproduces moment 2.8.4's wording exactly, checked against moment in the tests), `schema.ts`. `vue/src/services.ts` holds the app's instances.
- Build info for the footer is `__UI_BUILD__` (same fields as the AngularJS `build.json`).

## Tests

- Unit (`test/unit`): `helpers/app.js` loads the vendor libs, angular-mocks and the app sources into jsdom and returns `injector(...overrides)` for a fresh `ng`+`ngMock`+`sisui` injector. Objects from the page live in another realm, so compare with `JSON.parse(JSON.stringify(x))` or `Array.from`, and create arrays with `app.window.Array` when `instanceof Array` matters.
- E2E (`test/e2e`): `support/global-setup.js` builds into `.e2e/dist`, drops the database, seeds a super user with sis-api's `tools/useradmin.js`, and starts sis-api and the UI server on free ports. Fixtures (`fixtures.js`): `api` (REST client as super user; what it creates is deleted after the test), `uniqueName`, `createUser`, `signIn(page, user?)`, and `pageErrors` (any console error or uncaught exception fails the test; `pageErrors.allow(/re/)` for expected ones). Tests run fully parallel, so use unique names and never log out the shared super user (logout ends all of a user's sessions); create a user instead.
- E2E tests are the spec for the planned Vue rewrite, so they must not depend on the framework: locate by label, role and accessible name (`support/pages.js`: `form(page, "Fields" | "SIS fields")`, `entityInput`, `entityGroup`, `definitionNames`, ...), never by `ng-*`/`st-*`/`sis-*` attributes or Angular classes. Bootstrap classes are fine (the look stays). The markup supports this: every input has a linked `<label>` or an `aria-label`, document/array fields are `role="group"`, errors are linked with `aria-describedby` and invalid inputs carry `aria-invalid`. Keep that when changing partials. `routes.spec.js` opens every URL the UI serves; existing URLs must keep working.
- Playwright projects: `chromium` (the AngularJS app), `visual` (see below) and `vue` (`test/e2e/vue/`, the rewrite). Global setup builds and serves both apps; the `ui` fixture option ("angular" or "vue") picks the app a project's `baseURL` points at.
- Visual baselines (`visual.spec.js`, project `visual`, one worker, fixed names, per platform snapshots in `visual.spec.js-snapshots/`): after an intended look change, `SIS_E2E_MONGO_URL=... npx playwright test --project visual --update-snapshots`, then look at every changed image. Dialogs are shot viewport only; ids and timestamps are masked.
