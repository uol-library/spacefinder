# Spacefinder theme: notes for Claude

Read this first, then `TODO.md` (what's next) and `_sessions/summary.md`
(what has been done, and why).

## What this repo is

- A **Jekyll theme** for a map and list of places. It started as a
  rewrite of Cambridge's Spacefinder UI.
- The live site, spacefinder.leeds.ac.uk, lives in the sibling repo
  `../spacefinder.leeds.ac.uk`. It loads this theme with `remote_theme`,
  and holds the data and the daily jobs (LibCal opening hours, cron). The
  theme should eventually ship **without data**; for now the data is here
  while it's developed.
- `../spacefinder-ds` is an earlier attempt to fit the app into the
  University Design System. The map was too small there, which is why the
  list, filters and search are to move into Leaflet controls, with a
  full-screen map.
- **Work happens on `develop`.** `main` is what the live site uses as its
  theme, so don't merge or push to `main` unless asked. The user's global
  GitHub Pages instructions are for `e-2-org` repos and don't apply here
  (this repo is `uol-library`).
- The user commits their own work, so don't commit unless asked.

## Architecture

- **Datasets** are folders in `assets/data/<key>/`, each with:
  - `data.json`: an array of schema.org JSON-LD Articles, whose
    `mainEntity` is the place;
  - `filters.json`;
  - `<key>.mjs`;
  - optionally `data/` (one file per place) and `images/`.

  They're registered under `datasources` in `_data/config.yml`, and the
  first one is the default. Currently: `spaces`, `buildings`, `art`.
- **Dataset module API:**
  - Required: `onloadPlaceData(data)`, which fills
    `spacefinder.data[ns].places` with objects that have `id`, `slug`,
    `title`, `lat` and `lng`, plus anything else the module needs (often
    `ld`). Also `getPlaceHTML(place)` (use `createPlaceElement`),
    `getAdditionalInfo(place)` and `getInfoWindowContent(place)` (use
    `getInfoWindowHTML`).
  - Optional: `onrenderPlaceData()` and `onunloadPlaceData()`.
  - The full guide is `docs/guides/adding-a-dataset.md`.
- **Core modules** are in `assets/js/modules/`, and the entry point is
  `assets/js/main.js`.
  - `config.mjs` contains Liquid. The IDE shows errors on it; these are
    expected.
  - `places.mjs`: list, selection, search and filter application.
  - `filters.mjs`: the filters panel.
  - `map.mjs`: Leaflet 2.0, using its own `clusterer.mjs`.
  - `routing.mjs`
  - `components.mjs`: dialogs and the accordion.
  - `utilities.mjs` and `jsonld.mjs`: shared helpers.
- **Filtering** uses classes of the form `<filterkey>_<optionkey>` on
  `.list-place`. Search reads `data-search`, or the `.place-summary` text if
  there isn't one. Details (`.additionalInfo`) are pre-rendered hidden once
  the filters have loaded, and aren't searched.
- **Routing** is set by `routing` in `_data/config.yml`:
  - `hash` (`/#/spaces/1915`) is the theme default;
  - `history` (`/spaces/1915`) relies on `404.html` redirecting to
    `?route=`, then `restoreRoute()` puts the URL back.
  - Routes: empty, `<dataset>`, `<dataset>/<slug>` and `page/<name>`.
  - Moving to another dataset with Back or Forward currently reloads the
    page, until `switchDataSource` exists.
- **Interface wording** says "places", or uses the current dataset's name
  (`getDataSourceName()` and `setDataSourceNames()`, which fill
  `.datasource-name` and `[data-datasource-title]`). Don't hard-code
  "spaces".
- **Events** are dispatched on `document`, including `sfmapready`,
  `placesLoaded`, `filtersloaded`, `placeSelected`, `placeDeselected`,
  `placeSelectedOnMap`, `placeDeselectedFromMap`, `sfshowpage`,
  `sfhidepages` and `sfselectpage`. Opening a Leaflet popup closes the
  previous one, which fires `placeDeselectedFromMap`. `deselectPlaces`
  ignores deselections for a place that isn't the active one, so that
  doesn't add extra history entries.

## Commands

| Command | Notes |
|---|---|
| `npm run serve` / `npm run build` | Jekyll (Bundler) |
| `npm run test:routing` | Builds the site in both routing modes into `_tests/build/` and drives headless Chrome over the DevTools protocol: 21 scenarios per mode, 42 in all. Add `-- --no-build` to reuse the builds. Run it after any change to JS or templates. |
| `npm run docs` | Regenerates `docs/api/*.md` from JSDoc with jsdoc-to-markdown. Don't edit those pages by hand. |
| `npm run docs:serve` | Previews the docs site (Just the Docs theme). |
| `npm run osm`, `npm run buildings`, `npm run sustainability` | Data builders. They need network access, and write nothing if a source fails. |

## Conventions

- **Code style:** match the surrounding code. JS uses 4-space indentation,
  `function( arg )` spacing, JSDoc on every function, and a comment at the
  top of each module (it becomes the intro on the generated API page).
- **Data:**
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
