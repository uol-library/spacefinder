# TODO

Where things were left on 1 November 2026 (`develop` branch).

The aim: core scripts plus datasets that can be added by putting a folder in
`assets/data/<key>/` (`data.json`, `filters.json`, `<key>.mjs`, optional
`images/`; the theme's own examples are in `examples/`) and listing it under `datasources` in `_data/config.yml`.

## Next steps

1. **Full screen.** The list and filters are now a Leaflet control on the
   map (`layout.mjs`), so the map can go full screen with them. Check the
   fullscreen control keeps the panel usable (it uses the Fullscreen API on
   the map container), especially on phones, where the panel and the
   controls on the right don't both fit.
2. **Mounting the app in another page.** The events, the API
   (`window.spacefinderAPI`), the `postMessage` bridge for iframes and
   `routing: "none"` are done (see `docs/guides/embedding.md`). Still to do:
   starting the app in a given container element with options (the
   datasets, the routing mode, the start route), so a page can place the
   map itself without an iframe. The page's markup (`#map`, `#sfpanel`, the
   dialogs) comes from the Jekyll layout, so it would need building in JS,
   and the CSS would need scoping to the container. Decide first whether
   the iframe is enough.

## Art trail

- The route is done for now: `route.geojson` (full) and `shortroute.geojson`
  in the site repo, fitted to OpenStreetMap and step-free, with statistics
  (`npm run routeStats`) and GPX/KML exports (`npm run routeExport`).
- Still to check on the ground: the estimated west pavement of Woodhouse
  Lane beside the steps at way/985764210, and the end of the flight near
  Hermes (way/22951906). The accessible path beside the Clarendon Building
  is missing from OSM (it's being added); check the route against it
  afterwards.
- Walk the route and record the viewing point coordinates.
- Then decide how to show each artwork's description: either when the user
  gets near it, or as clickable pins beside the route. The route stays
  separate from the artwork pins. Hermes can't go on the route because it's
  on a wall above a pond.
- Show the routes in the app, with links to download the GPX and KML files.

## spacefinder.leeds.ac.uk (the site repo)

The data, its scripts and the daily jobs now live there, and `develop`
builds with this repo's `develop` branch as its theme. Done: the scripts use
the JSON-LD in `assets/data/*/data`, `_config_dev.yml` holds only the
overrides, and `.github/workflows/build.yml` builds the site and pushes it
to the `build` (from `main`) or `build-dev` (from `develop`) branch for the
Apache servers to copy. Still to do there:

- **Deployment:** set up the servers to pull the build branches and copy
  them to the DocumentRoot.
- **Data fixes:** wrong campus map entries are matched to `relation/7686369`
  in `assets/data/campusmap/osm/campusmap-osm.json`. See
  `campusmap-osm-review.md`.
- **Release:** when the theme is ready, merge it to this repo's `main`,
  then change the site's `remote_theme` back to `uol-library/spacefinder`
  and merge the site's `develop`. The site's dataset modules use
  `getSiteURL()`, which is only in this repo's `develop`, so push it before
  the site's `develop`.
- Checking the campus map for updates is on hold, because its data isn't
  reliable.

## Documentation site

The site is in `docs/` (Just the Docs theme): the old wiki pages, guides,
and API pages generated with `npm run docs`. Preview it with
`npm run docs:serve`.

- To publish it: merge to `main`, then turn on GitHub Pages for `main`,
  `/docs`. It will be at <https://uol-library.github.io/spacefinder/>.
- Once it's live, replace the GitHub wiki with a link to it, or turn the
  wiki off, so there's only one copy to keep up to date.
- Add the data model pages for any new datasets.

## Testing

`npm run test:routing` builds the site in the three routing modes and runs
109 browser scenarios, using headless Chrome and the example datasets,
including the app in an iframe.
It needs Bundler and Chrome. `-- --no-build` reuses the last builds. It
doesn't test clicking map markers, or the Apache rewrite rules.
