# TODO

Where things were left on 27 October 2026 (`develop` branch).

The aim: core scripts plus datasets that can be added by putting a folder in
`assets/data/<key>/` (`data.json`, `filters.json`, `<key>.mjs`, optional
`images/`) and listing it under `datasources` in `_data/config.yml`.

## Not yet committed

These are still untracked, so check them and commit them:

- `_scripts/buildings.js`, `_scripts/osm.js` and `_scripts/sustainability.js`
- `assets/data/buildings/`, `assets/data/osm/` and `assets/data/sustainability/`
- `assets/data/art/art.mjs`, `assets/data/art/filters.json` and
  `assets/data/art/data/tree-carving.json`
- `assets/data/campusmap/data-10-2026.json` and `assets/data/campusmap/osm/*`
- `assets/js/modules/jsonld.mjs`
- `_tests/` and the `test:routing` script in `package.json`
- `assets/data/art/data/Campus_Public_Art_Trail_Leaflet.pdf`. The last commit
  removed it from `assets/data/art/`, and this untracked copy is in `data/`.
  Should it go back up a level?

## Next steps

1. **Switch between datasets in the app.** Add `switchDataSource(key)` and a
   control in the interface that lists `spacefinder.dataSources`. Switching
   should:
   - call the current module's `onunloadPlaceData`, which removes listeners
     and anything else the module added;
   - clear the list, the map markers and the filters;
   - load the new dataset's `data.json`, `filters.json` and module.

   Once this works, `applyRoute` in `assets/js/modules/routing.mjs` can call
   it instead of `window.location.reload()` when Back or Forward goes to a
   different dataset.
2. **Filters that belong to a module.** `applyFilters` treats the "open"
   filter as a special case. Instead, let a module export an optional
   `matchFilter(place, key, value)`, so that a dataset can define filters that
   CSS classes can't express.
3. **Dataset names in the interface.** "spaces" is still hard-coded in
   `filters.mjs`, `_includes/top-bar.html` and the layout. Use the current
   dataset's `label` from `_data/config.yml` instead.

## Small fixes

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

- Add `routing: "history"` and the `datasources` list to its
  `_data/config.yml`.
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

## Testing

`npm run test:routing` builds the site in both routing modes and runs 20
browser scenarios in each, using headless Chrome. It needs Bundler and Chrome.
`-- --no-build` reuses the last builds. It doesn't test clicking map markers
or the Azure fallback.
