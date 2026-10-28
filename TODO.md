# TODO

Where things were left on 27 October 2026 (`develop` branch).

The aim: core scripts plus datasets that can be added by putting a folder in
`assets/data/<key>/` (`data.json`, `filters.json`, `<key>.mjs`, optional
`images/`) and listing it under `datasources` in `_data/config.yml`.

## Next steps

1. **Switch between datasets in the app.** Add `switchDataSource(key)` and a
   control in the interface that lists `spacefinder.dataSources`. Switching
   should:
   - call the current module's `onunloadPlaceData`, which removes listeners
     and anything else the module added;
   - clear the list, the map markers and the filters;
   - load the new dataset's `data.json`, `filters.json` and module;
   - call `setDataSourceNames()` (in `utilities.mjs`) so the interface text
     uses the new dataset's name. The filters panel builds its text when it
     is rendered, so rendering it again covers that.

   Once this works, `applyRoute` in `assets/js/modules/routing.mjs` can call
   it instead of `window.location.reload()` when Back or Forward goes to a
   different dataset.
2. **Filters that belong to a module.** `applyFilters` treats the "open"
   filter as a special case. Instead, let a module export an optional
   `matchFilter(place, key, value)`, so that a dataset can define filters that
   CSS classes can't express.
3. **Optional filters.** Make `filters.json` optional. A dataset without one
   would just show the list view, with no filters panel or filter controls.
4. **List and filters as Leaflet controls.** Move the list and the filters
   onto the map as Leaflet controls, instead of separate panels in the page
   layout:
   - put the search box at the top of the list view;
   - maybe show the filters in the list view, collapsed under the dataset
     controls and the search box, so there is one panel.

   This fits well with item 1, since the dataset switcher could go in the same
   control.

   The main reason for doing this is a full-screen map. In spacefinder-ds,
   which uses the University Design System, the map was too small within the
   page design. With everything in map controls, the map can go full screen,
   using the Fullscreen API on the map container, and the list, search and
   filters stay available.
5. **Hooks for embedding the app in other pages.** Let a page that embeds
   the app (for example one built with the Design System) share data with it,
   so the app doesn't need its own page design. spacefinder-ds took the
   opposite approach: static pages styled to match the Design System.
   - **Events from the app:** the app already sends events on `document`,
     such as `sfmapready`, `placesLoaded`, `filtersloaded`, `placeSelected`
     and `sfselectpage`. Decide which ones are public and what data each
     carries, document them, and use one naming convention. Add events for a
     changed dataset, a changed filter or search, and a changed route.
   - **Methods the page can call:** for example, select a place, set filters
     or a search, switch dataset, and go full screen. These could sit on
     `spacefinder` or on an object returned by an `init`/mount function.
   - **Mounting:** start the app in a given container element with options
     (the datasets, the routing mode, the start route), so the page decides
     where the map goes and how big it is. In an embedded app, routing could
     be optional, so the app doesn't take over the page's URL.
   - **An iframe as well?** If the app is embedded in an iframe, the same
     events and methods could be sent with `postMessage`.
6. **Rationalise logging in debug mode.** `splog` (in `utilities.mjs`) logs
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
   - this fits with documenting events for the embedding hooks (item 5).

## Small fixes

- [ ] `README.md` still describes the old set-up: the `spaces/` folder,
  `_includes/javascript/templates.js`, and filters defined in
  `_data/config.yml`. It also links to the wiki. Shorten it and point to
  the docs site.

- [ ] Three art files spell the contributor `@type` as `"Organisation"`; it should be `"Organization"`:
  `converse-column.json`, `dual-form.json`, `three-piece-reclining-figure-bridge-prop.json`.
- [ ] `_scripts/concat.js` includes `template.json` and `route.json` in
  `data.json`. Only include records that have a `mainEntity`, as the art
  rebuild did.
- [ ] Remove the unused entries in `_data/config.yml`: `spaces`, `spacesurl`,
  `filters`, `filtersurl` and `imageBaseURL`.
- [ ] Image URLs start at the site root, so they break if `baseurl` isn't
  empty. Prefix them with `spacefinder.basePath`.
- [ ] Wrong campus map entries are matched to `relation/7686369` in
  `assets/data/campusmap/osm/campusmap-osm.json`. See
  `campusmap-osm-review.md`.

## Art trail

- Walk the route and record the viewing point coordinates (for `route.json`).
- Then decide how to show each artwork's description: either when the user
  gets near it, or as clickable pins beside the route. The route stays
  separate from the artwork pins. Hermes can't go on the route because it's
  on a wall above a pond.

## spacefinder.leeds.ac.uk (the site repo)

- **Build a demonstration site for the on-campus development server.** Use
  the site repo's `develop` branch with this repo's `develop` branch as its
  theme.
  - **Bring `develop` up to date with `main` first:** it's 12 commits
    behind, mostly the bot's opening-hours updates.
  - **Point it at the new theme:** change `remote_theme` in `_config.yml`
    from `uol-library/spacefinder` to `uol-library/spacefinder@develop`.
    Leave `main` on the current theme until the new one is released.
  - **Remove the old overrides:** the site repo has its own copies of theme
    files, written for the old code, and these would hide the new theme's
    versions. Remove them or bring them up to date:
    - `_includes/head.html`, `foot.html` and `top-bar.html`
    - `_layouts/spacefinder.html`
    - `_includes/javascript/` (the old `templates.js`, `modal.js` and
      `cookieconsent-init.js`)
    - `_sass/spaces.scss`

    Keep the site's own content: the pages in `_includes/pages/`,
    `favicons.html`, `custom-head.html` and `google-analytics.html`, if they
    still fit the new theme.
  - **Settings:** add `routing: "history"` and the `datasources` list to
    its `_data/config.yml`.
  - **Server set-up:** check how the development server serves the site.
    If it can send `index.html` for unknown paths, history routing works
    without the `404.html` redirect. If not, the redirect handles it.
- **Move the data to the site repo** at the same stage. That covers:
  - `assets/data/spaces`, `buildings` and `art`, with their modules and
    images;
  - the source data in `campusmap`, `osm` and `sustainability`;
  - the data scripts: `osm.js`, `buildings.js`, `sustainability.js`,
    `convert.js` and `concat.js`.

  Check the existing workflows (`concat.yml`, `cronUpdates.yml`, and the
  LibCal opening-hours jobs) still work with the new data format, since
  they were written for the old one.
- **Then clean up the theme**, so it ships with no data:
  - remove the moved files, `spaces.json`, `filters.json` and the old
    `filters` list in `_data/config.yml`;
  - keep a small example dataset, so the theme still runs and the routing
    tests still have data. The tests currently expect 68 spaces, 95
    buildings and 22 artworks, so they need updating to match;
  - update the guides in `docs/` to say where the data now lives.
- Optional: so that direct visits to URLs like `/spaces/1915` don't redirect
  through `404.html`, add this to `staticwebapp.config.json`:

  ```json
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/assets/*", "/*.{json,xml,css,js,mjs,png,jpg,svg,ico,txt}"]
  }
  ```

- Data building (`npm run osm`, `npm run buildings` and
  `npm run sustainability`) and the daily jobs belong there, not in the theme,
  which ships with no data. Move the scripts across when the theme is ready.
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
- The art trail data model page (from the wiki) is older than the data. The
  real files have `identifier`, an array of `image` objects, and
  `contributor` as either an object or an array. Update the page to match,
  and add a page for the buildings data model.
- Add the data model pages for any new datasets, and update the guides when
  the dataset switcher, optional filters and Leaflet controls are done.

## Testing

`npm run test:routing` builds the site in both routing modes and runs 21
browser scenarios in each, using headless Chrome. It needs Bundler and Chrome.
`-- --no-build` reuses the last builds. It doesn't test clicking map markers
or the Azure fallback.
