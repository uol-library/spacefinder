# TODO

Where things were left on 1 November 2026 (`develop` branch).

The aim: core scripts plus datasets that can be added by putting a folder in
`assets/data/<key>/` (`data.json`, `filters.json`, `<key>.mjs`, optional
`images/`; the theme's own examples are in `examples/`) and listing it under `datasources` in `_data/config.yml`.

## Next steps

1. **List and filters as Leaflet controls.** Move the list and the filters
   onto the map as Leaflet controls, instead of separate panels in the page
   layout:
   - put the search box at the top of the list view;
   - maybe show the filters in the list view, collapsed under the dataset
     controls and the search box, so there is one panel.

   The dataset switcher (`datasources.mjs`), now at the top of the filters
   panel, could go in the same control.

   The main reason for doing this is a full-screen map. In spacefinder-ds,
   which uses the University Design System, the map was too small within the
   page design. With everything in map controls, the map can go full screen,
   using the Fullscreen API on the map container, and the list, search and
   filters stay available.
2. **Hooks for embedding the app in other pages.** Let a page that embeds
   the app (for example one built with the Design System) share data with it,
   so the app doesn't need its own page design. spacefinder-ds took the
   opposite approach: static pages styled to match the Design System.
   - **Events from the app:** the app already sends events on `document`,
     such as `sfmapready`, `placesLoaded`, `filtersloaded`, `placeSelected`,
     `sfselectpage`, `datasourceunload` and `datasourcechange`. Decide which
     ones are public and what data each carries, document them, and use one
     naming convention. Add events for a changed filter or search, and a
     changed route.
   - **Methods the page can call:** for example, select a place, set filters
     or a search, switch dataset, and go full screen. These could sit on
     `spacefinder` or on an object returned by an `init`/mount function.
   - **Mounting:** start the app in a given container element with options
     (the datasets, the routing mode, the start route), so the page decides
     where the map goes and how big it is. In an embedded app, routing could
     be optional, so the app doesn't take over the page's URL.
   - **An iframe as well?** If the app is embedded in an iframe, the same
     events and methods could be sent with `postMessage`.
3. **Rationalise logging in debug mode.** `splog` (in `utilities.mjs`) logs
   when `spacefinder.debug` is on, which it is when `environment` is
   `development` in `_config.yml`. But it's used unevenly: 18 calls in
   `map.mjs`, none in `components.mjs`, `analytics.mjs` or
   `cookieconsent.mjs`. Most calls just log a function name. There are
   also a few `console.log`/`console.error` calls that bypass it, including
   one in `loadPlaces` in `places.mjs` that logs every time. Make debug mode
   more verbose and consistent:
   - log the module and what happened, with the data that matters (the
     route being applied, the dataset loaded and how many places it has,
     the filters and search terms applied and how many places match,
     events sent and received);
   - maybe add levels (e.g. `splog( message, 'warn' )`) or group related
     messages with `console.group`;
   - replace the stray `console.log` calls with `splog`, and keep
     `console.error` for real errors;
   - this fits with documenting events for the embedding hooks (item 2).

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
- Add the data model pages for any new datasets, and update the guides when
  the Leaflet controls are done.

## Testing

`npm run test:routing` builds the site in both routing modes and runs 32
browser scenarios in each, using headless Chrome and the example datasets.
It needs Bundler and Chrome. `-- --no-build` reuses the last builds. It
doesn't test clicking map markers, or the Apache rewrite rules.
