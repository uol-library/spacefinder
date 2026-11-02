# Changelog

Notable changes to the Spacefinder theme. For more detail, see the git
history and the [documentation](docs/).

## Unreleased (`develop`)

A rewrite of the theme, so that it can show any number of datasets, not
just study spaces. A site's study spaces data now lives in the site, not the
theme (for Leeds, in
[spacefinder.leeds.ac.uk](https://github.com/uol-library/spacefinder.leeds.ac.uk)).

### Added

- **Datasets:** a site can show several datasets, each a folder of JSON-LD
  data, optional filters and its own JavaScript module, listed under
  `datasources` in `_data/config.yml`. See
  [Adding a dataset](docs/guides/adding-a-dataset.md).
- A dataset switcher at the top of the panel (links for two datasets, a
  dropdown for more). Switching doesn't reload the page.
- Example datasets (`cafes` and `trees`) in `examples/`, used by the tests.
- `matchFilter` in dataset modules, for filters that classes can't express,
  such as "open now".
- `filters.json` is optional, and `filters: false` on a dataset stops the
  app requesting it.
- **Routing:** `routing` in `_data/config.yml` chooses hash URLs
  (`/#/cafes/courtyard-coffee`) or history URLs (`/cafes/courtyard-coffee`).
  `routeAliases` keeps old links working after a dataset is renamed.
- `dataDir` sets the folder the datasets are in.
- `getSiteURL()`, for URLs that need the site's `baseurl`.
- `site_logo_position` in `_config.yml` puts the site's logo on the left or
  right of the top bar. The logos are in their own includes, so a site can
  replace `_includes/site-logo.html` with its own.
- **Embedding:** public events (`sfplaceselect`, `sffilterchange`,
  `sfdatasourceready` and others, all on `document`), an API at
  `window.spacefinderAPI` for selecting places, setting filters and the
  search, switching dataset and opening the panel, and a `postMessage`
  bridge so a page on another site can do the same with the app in an
  iframe (`embed: origins` in `_data/config.yml`). See
  [Embedding the app](docs/guides/embedding.md).
- `routing: "none"`, which leaves the URL alone, for an app in an iframe.
- **Debug logging:** `getLogger( module )` logs what each module does, with
  its data, and every event the app sends. Debug mode can be switched on
  with `?sfdebug` in the URL.
- A documentation site in `docs/`, with guides and API pages generated
  from JSDoc (`npm run docs`).
- Browser tests (`npm run test:routing`) for both routing modes.

### Changed

- **Layout:** the top bar, the map and the footer fill the window. The list,
  search and filters are in a panel on the left of the map, which a button
  opens and closes. The filters open over the list from a Filters button,
  which shows how many are in use. The other map controls are on the right.
- Leaflet 2 (2.0.0-alpha.1), with ES modules and an import map.
- The JavaScript is split into modules in `assets/js/modules/`, and the CSS
  into modules in `assets/css/modules/`.
- The interface says "places", or uses the dataset's name, instead of
  "spaces".
- Data and image URLs are relative to the site, so it works when it isn't
  at the root of its domain.
- The app's events have one naming convention (`sf` and lower case), and
  modules call each other's functions instead of sending each other events.
  Selecting a place sends one event, where it used to send two from the
  list and the map.
- Google Analytics events are sent through the real `gtag` function. A
  local function of the same name stopped any events reaching Google
  Analytics, and logged them in the console instead. The selection source
  `load` is now `route`.
- Switching dataset while the map was zooming to a place could open that
  place's popup afterwards, and select the place with the same ID in the
  new dataset.

### Removed

- The separate Search, List and Map views and their buttons in the top bar,
  and the `viewchange` event. The panel replaces them, and sends
  `sfpaneltoggle` when it opens or closes.
- Leeds data, data scripts and scheduled jobs, which moved to the site's
  repository.

## 0.9.1 (21 February 2023)

The last tagged release, for Leeds study spaces only. Since then, `main`
has also gained a fix for selecting a space from the URL hash, and icons
for Bluesky, Instagram, X and email.
