# Spacefinder theme: notes for Claude

Read this first, then `TODO.md` (what's next) and `_sessions/summary.md`
(what has been done, and why).

## What this repo is

- A **Jekyll theme** for a map and list of places. It started as a
  rewrite of Cambridge's Spacefinder UI.
- The live site, spacefinder.leeds.ac.uk, lives in the sibling repo
  `../spacefinder.leeds.ac.uk`. It loads this theme with `remote_theme`,
  and holds the real data (spaces, buildings, art), the data scripts and
  the daily jobs (LibCal opening hours, cron). Its `develop` branch uses
  this repo's `develop` as its theme, and its live site will be served by
  Apache.
- This repo has only **example data**: `cafes` and `trees` in `examples/`,
  which are made up and used by the tests.
- `../spacefinder-ds` is an earlier attempt to fit the app into the
  University Design System. The map was too small there, which is why the
  list, filters and search are to move into Leaflet controls, with a
  full-screen map.
- **Work happens on `develop`.** `main` is what the live site uses as its
  theme, so don't merge or push to `main` unless asked. The user's global
  GitHub Pages instructions are for `e-2-org` repos and don't apply here
  (this repo is `uol-library`).
- **Commits:**
  - Commit to `develop` at the end of each piece of work.
  - Keep commit messages brief: a short summary line, plus a few lines of
    body only if they're really needed.
  - Don't push unless asked.

## Architecture

- **Datasets** are folders in `assets/data/<key>/`, each with:
  - `data.json`: an array of schema.org JSON-LD Articles, whose
    `mainEntity` is the place;
  - optionally `filters.json` (without it, or with `filters: false` on
    the datasource, the panel has just the search box);
  - `<key>.mjs`;
  - optionally `data/` (one file per place) and `images/`.

  They're registered under `datasources` in `_data/config.yml`, and the
  first one is the default. Here: `cafes` and `trees`, which are in
  `examples/` instead (`dataDir` in `_data/config.yml`), because Jekyll
  copies a theme's `assets/` into every site that uses it. Their imports
  start `../../assets/js/modules/`.
- **Dataset module API:**
  - Required: `onloadPlaceData(data)`, which fills
    `spacefinder.data[ns].places` with objects that have `id`, `slug`,
    `title`, `lat` and `lng`, plus anything else the module needs (often
    `ld`). Also `getPlaceHTML(place)` (use `createPlaceElement`),
    `getAdditionalInfo(place)` and `getInfoWindowContent(place)` (use
    `getInfoWindowHTML`).
  - Optional: `onrenderPlaceData()`, `onunloadPlaceData()` and
    `matchFilter(place, key, values, element)`, which returns true/false
    for filters that CSS classes can't express (e.g. "open now"), or
    undefined to fall back to class matching. `applyFilters` has no
    special cases for particular filters.
  - The full guide is `docs/guides/adding-a-dataset.md`.
- **Core modules** are in `assets/js/modules/`, and the entry point is
  `assets/js/main.js`.
  - `config.mjs` contains Liquid. The IDE shows errors on it; these are
    expected.
  - `places.mjs`: list, selection, search and filter application.
  - `filters.mjs`: the search form, and the filters overlay on the list.
  - `layout.mjs`: the panel (`PanelControl`) and its toggle
    (`PanelToggleControl`), and `openPanel`/`closePanel`/`togglePanel`.
  - `datasources.mjs`: the dataset switcher (links, or a dropdown for
    more than two datasets).
  - `map.mjs`: Leaflet 2.0, using its own `clusterer.mjs`.
  - `routing.mjs`
  - `components.mjs`: dialogs (`showPage`, `hidePages`) and the accordion.
  - `api.mjs` and `embed.mjs`: the API for embedding pages, and the
    `postMessage` bridge for iframes.
  - `analytics.mjs`: Google Analytics events, made from the app's events.
  - `utilities.mjs` and `jsonld.mjs`: shared helpers.
- **Layout:** the page is the top bar, the map and the footer, in a
  full-height flex column. The top bar's logos are in
  `_includes/spacefinder-logo.html` and `_includes/site-logo.html`;
  `site_logo_position` in `_config.yml` (`right` or `left`) sets their order. The list and filters (`#sfpanel`, in the
  `spacefinder` layout) are a Leaflet control in the map's top left
  corner, with a toggle button beside it; the map's other controls are on
  the right. Opening or closing the panel pans the map by half its width
  and sends `sfpaneltoggle`. `fitBounds` and popups use the panel's width
  as padding (`getPanelWidth()`). There are no separate views any more
  (no `viewchange`): "Show on map" and "More info" open and close the
  panel. Clicks in the panel still bubble to `document` (Leaflet's
  `disableClickPropagation` only stops `pointerdown`).
- **Filtering** uses classes of the form `<filterkey>_<optionkey>` on
  `.list-place`. Search reads `data-search`, or the `.place-summary` text if
  there isn't one. Details (`.additionalInfo`) are pre-rendered hidden once
  the filters have loaded, and aren't searched.
- **Routing** is set by `routing` in `_data/config.yml`:
  - `hash` (`/#/cafes/courtyard-coffee`) is the theme default;
  - `history` (`/cafes/courtyard-coffee`) needs the server to send
    `index.html` for these paths (Apache rewrite rules), or else
    `404.html` redirects to `?route=` and `restoreRoute()` puts the URL
    back.
  - Routes: empty, `<dataset>`, `<dataset>/<slug>` and `page/<name>`.
  - A route for another dataset (from the switcher, or Back and Forward)
    calls `switchDataSource` (in `places.mjs`); the rest of the route is
    applied on the next `sfdatasourceready`.
- **URLs** for the app's own files are relative to the page's origin
  (`dataDir`, `main.js`, `main.css`), so that the dataset modules import
  the same copy of `config.mjs` as `main.js`. Don't use `site.url` for
  them.
- **Interface wording** says "places", or uses the current dataset's name
  (`getDataSourceName()` and `setDataSourceNames()`, which fill
  `.datasource-name` and `[data-datasource-title]`). Don't hard-code
  "spaces".
- **Switching datasets** happens without a reload. `switchDataSource` sends
  `sfdatasourceunload` (the search form, filters overlay and markers are
  removed), calls the module's `onunloadPlaceData`, clears the list, deletes
  `spacefinder.data[old]`, resets the `placesLoaded`/`filtersLoaded`/
  `mapReady` flags, sends `sfdatasourcechange` and loads the new dataset, so
  `sfplacesloaded`, `sffiltersloaded` and `sfdatasourceready` fire again. So:
  - add `document` listeners and map handlers once (at module load or in
    `initMap`), never inside a handler for one of those events;
  - async loads check that the dataset hasn't changed before using the
    result.
  The switcher (`datasources.mjs`) is at the top of `#filters`: links for
  two datasets, a dropdown for more.
- **Events** are public notifications, documented in
  `docs/guides/embedding.md`: `sf` + lower case (`sfplaceselect`,
  `sffilterchange`, `sfdatasourceready`...), always a `CustomEvent` on
  `document`, sent with `sendEvent( name, detail )` from `utilities.mjs`
  (which logs them). The list is `EVENTS` in `embed.mjs`; keep it, the
  guide and the tests in step. Modules call each other's functions for
  commands (`selectPlace`, `deselectPlaces`, `applyFilters`, `showPage`),
  rather than sending events to each other. `selectPlace` does nothing if
  the place is already selected, and `deselectPlaces` ignores a place that
  isn't the selected one (opening a popup closes the previous one), so
  each sends its event once.
- **Embedding:** `api.mjs` is `window.spacefinderAPI` (methods return
  plain, cloneable data, or `false` until the dataset has loaded);
  `embed.mjs` makes it and the events available with `postMessage` to the
  origins in `embed: origins`. `routing: "none"` keeps the route in
  `utilities.mjs` instead of the URL. Mounting the app in a container on
  another page isn't done (see TODO.md).
- **Logging:** `const log = getLogger( 'module' )`, then `log( message,
  ...data )`, `log.warn`, `log.error` (always shown). Debug mode is
  `environment: development` or `?sfdebug`. Log what happened and the data
  that matters, not function names. Don't use `console.*` directly.

## Commands

| Command | Notes |
|---|---|
| `npm run serve` / `npm run build` | Jekyll (Bundler) |
| `npm run test:routing` | Builds the site in the three routing modes into `_tests/build/` and drives headless Chrome over the DevTools protocol: 50 scenarios each for hash and history, and 9 for none (including the app in an iframe), 109 in all. Add `-- --no-build` to reuse the builds. Run it after any change to JS or templates. |
| `npm run docs` | Regenerates `docs/api/*.md` from JSDoc with jsdoc-to-markdown. Don't edit those pages by hand. |
| `npm run docs:serve` | Previews the docs site (Just the Docs theme). |

## Conventions

- **Code style:** match the surrounding code. JS uses 4-space indentation,
  `function( arg )` spacing, JSDoc on every function, and a comment at the
  top of each module (it becomes the intro on the generated API page).
- **Data** (mostly in the site repo):
  - Text in the JSON-LD is HTML (it uses entities).
  - Identifiers are `PropertyValue`s with a `propertyID`.
  - Features are `LocationFeatureSpecification`s, with the filter key in
    `alternateName`.
  - The art data was finalised by hand: don't regenerate it from the campus
    map.
- **Don't trust the campus map data** for disabled toilets, baby changing
  or prayer rooms. Cycle parking comes from the Sustainability Service map,
  not OSM.
- **Jekyll publishes Markdown at the root**, so add new top-level `.md`
  files to `exclude` in `_config.yml` (as `TODO.md` and `CLAUDE.md` are).
  Folders starting with `_` are skipped automatically.
