# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A standalone single-page UI (Vue 3 + TypeScript + Vite) for the SIS CMDB backend (schemas, entities, hooks, scripts, users, tokens). It talks to the backend only over HTTP with its own typed fetch client. There is no server-side rendering. The backend lives in the sibling repo `../sis-api` (Node 20+, Mongoose 8, JWT sessions).

It replaced an AngularJS 1.2 UI and keeps its look pixel for pixel, its urls, its deployment config and its login storage; comments that mention "the AngularJS UI" explain behavior kept for that reason. Keep all of these when changing things.

## Commands

Node 20+ (`.nvmrc` says 24; the default `node` on this machine may be an old nvm version, so check `node -v`).

- `npm install` - `ace-builds` and `bootswatch` are pinned to git commits (the versions the old UI used; the look depends on them).
- `npm run build` - type check (`vue-tsc --build`) and build into `dist/` (`scripts/build.mjs`). `-- --docpath ../sis-api/docs` renders the API docs; `-- --with-config` copies `config.js` from the project into `dist/app/js/`.
- `npm run serve -- --api-url http://localhost:3000 [--docpath ../sis-api/docs]` - Vite dev server on 127.0.0.1:9000 (`scripts/serve.mjs`). Without `--api-url` it serves `config.js` from the project (copy `config.js.sample`; gitignored). `npm run preview` serves the last build.
- `npm run typecheck`, `npm run lint` (eslint flat config, fails on warnings).
- `npm test` - Vitest (`src/**/*.test.ts`, `scripts/**/*.test.mts`; runs in America/New_York, see `src/lib/format.moment.json`). Single file: `npx vitest run src/lib/session.test.ts`; single test: add `-t "<name>"`.
- `npm run test:e2e` - Playwright (`test/e2e`, `playwright.config.js`). Single test: `npx playwright test test/e2e/auth.spec.js` or `-g "<name>"`. Needs `../sis-api` (or `SIS_API_DIR`) with `npm install` done and a MongoDB at `SIS_E2E_MONGO_URL` (default `mongodb://localhost:27017/sis-ui-e2e`; this database is dropped every run). On this machine MongoDB runs in podman on port 27018: `SIS_E2E_MONGO_URL=mongodb://localhost:27018/sis-ui-e2e npm run test:e2e`.

## Build (vite.config.mts)

- `.mts` (also `scripts/docs.mts`) because package.json is CommonJS (the eslint and Playwright configs and e2e tests are CommonJS). `@` is `src`.
- Plugins: `sis-peggy` compiles imported `.pegjs` (the filter query grammar, `src/lib/query/query.pegjs`); `sis-dev-config` answers `app/js/config.js` in the dev and preview servers from `SIS_API_URL` or the project's `config.js`; `sis-static` serves/copies the Bootswatch themes, glyphicon fonts and Ace (`app/js/vendor/ace/`, loaded on first use by `lib/ace.ts`) at the old UI's paths and writes `dist/build.json`; `sis-docs` renders the markdown from `SIS_DOCPATH` (`scripts/docs.mts`) into `virtual:sis-docs` (list plus one lazily loaded chunk per page).
- Templates are compiled with whitespace preserved: the gaps between inline-block buttons depend on it, so do not reformat templates. eslint-plugin-vue runs its `essential` rules only for that reason.
- Runtime config: `index.html` loads `public/app/js/config-compat.js` and then the deployment's unbundled `app/js/config.js` (`vite-ignore`). It may set `window.SIS_CONFIG = { API_URL }` or use the old format (`angular.module('sisconfig', []).constant('API_URL', ...)`), which the shim captures. Without `API_URL` the API is expected in the directory the UI was loaded from (`lib/config.ts`). `__UI_BUILD__` (footer) and `__THEMES__` are defined at build time.

## App (src/)

- `lib/` is framework free and unit tested: `api/client.ts` (`SisClient`: `schemas`, `hooks`, `scripts`, `users`, `entities(name)`, `tokens(user)`, `.commits(id)`; `list` returns `{ results, totalCount }`; errors are `SisApiError`, `status` 0 when unreachable), `session.ts` (the login in localStorage `t`; session tokens are JWTs checked with an authenticated request, expiry read from the token, logout ends them with `DELETE /users/auth_token`; persistent tokens are looked up and never revoked on logout), `permissions.ts` (every permission rule, taking the user explicitly), `query/parseSearch.ts`, `format.ts` (`fromNow` reproduces moment 2.8.4's wording, checked against `format.moment.json`), `schema.ts` (`describeFields` normalizes definitions), `url.ts` (queries encoded as AngularJS did, e.g. `?q=env%20%3D%20prod&p=2`), `entityForm.ts`, `schemaForm.ts`, `equals.ts` (angular.equals semantics).
- `services.ts` (config, API client, session instances), `state.ts` (logged in user, embed mode, theme), `router.ts` (hash history at the old urls; a `beforeEach` takes `?embed=true` and `?username=&token=` off the url; `goBack()` returns within the app or goes to a fallback; never call `history.back()` directly: a page opened from a link would leave the app).
- `pages/`: `AppLayout` keys pages by path (a new path builds a fresh page; query changes don't), and pages read their route params once, since loading can outlive a navigation. Lists use `composables/usePagedList.ts` (filter and page in `?q=&p=`).
- Forms: `lib/entityForm.ts` (defaults, shown vs stored values, validation: trimmed text, parsed numbers, `ip-address` as sis-api uses, label widths, SIS fields) with the recursive `components/EntityField.vue` serve `EntityFormPage`/`EntityViewPage` for entities, hooks and scripts. `lib/schemaForm.ts` (the definition as an editable tree; mutations go through it) with `SchemaDefinitionField.vue`/`SchemaValueRow.vue` serve `SchemaFormPage`. Fields report validity through `composables/useFormValidity.ts`; Save needs every field valid and a change (references compare as ids). Clone is `?clone=<id>`.
- `dialogs.ts` + `components/DialogHost.vue` render modals with ui-bootstrap's markup and behavior (focus, Escape, backdrop); `components/dialogs/` has the dialogs.
- Same look: markup and classes follow the old templates (Bootstrap 3 + Bootswatch). Use `v-show` where the old template hid rather than removed, `lib/sorted.ts` where it repeated an object (AngularJS sorted the keys), and `aria-invalid` for invalid inputs (`styles/style.css` gives them the red border).
- HTML from data must be escaped before `v-html` (`escapeHtml`); jsondiffpatch 0.7's formatter escapes keys and values itself.
- Anchors used as buttons need `href=""` (and `.prevent`) so they are focusable and reachable as links.

## Tests

- E2E (`test/e2e`): `support/global-setup.js` builds into `.e2e/dist` (`scripts/build.mjs`, with the sis-api docs), drops the database, seeds a super user with sis-api's `tools/useradmin.js`, and starts sis-api and `vite preview` on free ports. Fixtures (`fixtures.js`): `api` (REST client as super user; what it creates is deleted after the test), `uniqueName`, `createUser`, `signIn(page, user?)`, and `pageErrors` (any console error or uncaught exception fails the test; `pageErrors.allow(/re/)` for expected ones). Tests run fully parallel, so use unique names and never log out the shared super user (logout ends all of a user's sessions); create a user instead.
- Locate by label, role and accessible name (`support/pages.js`: `form(page, "Fields" | "SIS fields")`, `entityInput`, `entityGroup`, `definitionNames`, ...). The markup supports this: every input has a linked `<label>` or an `aria-label`, document/array fields are `role="group"`, errors are linked with `aria-describedby`. Bootstrap classes are fine. `routes.spec.js` opens every URL the UI serves; existing URLs must keep working. `config.spec.js` covers both config formats.
- Visual baselines (`visual.spec.js`, project `visual`, one worker, fixed names, per platform snapshots in `visual.spec.js-snapshots/`, taken from the old UI): after an intended look change, `SIS_E2E_MONGO_URL=... npx playwright test --project visual --update-snapshots`, then look at every changed image. Dialogs are shot viewport only; ids and timestamps are masked.
