# Work log: October 2026 (Claude sessions)

Work carried out with Claude Code on the `develop` branch, 27 and
28 October 2026. The user committed it in these commits:
- 83a566f
- 9003a45 "Started to sort out routing"
- 6b54fa3 "Work on data from OSM and sustainability map…"
- d127e9f "Improved module documentation…"
- fd1020f "Updated TODO"

Open work is in `TODO.md`.

## 1. Art descriptions (`assets/data/art/`)

- **Compared three sources:**
  - the artwork JSON;
  - the Campus Public Art Trail leaflet (PDF, now in
    `assets/data/art/data/`);
  - the University campus map (www.leeds.ac.uk/campusmap; its data is in
    the page's HTML).
- **`description` now holds merged text** from the campus map and the
  leaflet. The temporary comparison properties were removed, and the user
  kept the earlier version in git. Hermes uses the leaflet's wording, as
  the user asked, so the campus map's Hermes quote is left out.
- **Added `tree-carving.json`** ("Tree Carving", Shane Green, wood, 2018).
  OSM calls it "Sustainability". Its coordinates come from OSM.
- **`art/data.json` is rebuilt from `data/*.json`,** keeping only records
  with a `mainEntity`, so `route.json` is left out.
- **The art trail route** stays separate from the artwork pins. The user
  will record viewing points while walking the route. Hermes can't be on
  the route, because it's on a wall above a pond.

## 2. Campus map and OSM matching (`assets/data/campusmap/`)

- **`data-10-2026.json`:** a snapshot of the live campus map data.
- **`osm/campusmap-osm.json`:** a lookup from campus map entries to OSM
  ids. It has a review list (`campusmap-osm-review.md`) and the matched
  polygons (`campusmap-buildings.geojson`).
- **Known problem:** `relation/7686369` has the wrong entries matched to
  it.
- **Which data to use:**
  - accommodation, libraries, culture and sport are categories in the
    buildings dataset;
  - parking might be useful;
  - disabled toilets, baby changing and prayer rooms aren't trusted;
  - food is already in Spacefinder.
- **Syncing with the campus map** is on hold, because it isn't reliable.

## 3. Data scripts (`_scripts/`)

- **`sustainability.js`** (`npm run sustainability`):
  - downloads the Sustainability Service's Google My Maps as KML (map id
    `1-8z7E-07p6NCXwpV3dJHHyMKArmHLXo`);
  - writes `assets/data/sustainability/sustainable-travel.geojson`: 378
    features, with `layer`, `name`, `description`, `colour` and `icon`;
  - leaves out image URLs, because they change on every download, so the
    output only changes when the map does;
  - the user prefers this over OSM for cycle parking, because the owner is
    known and keeps it up to date.
- **`osm.js`** (`npm run osm`):
  - gets building outlines (95) and entrances (68) from Overpass, trying
    overpass-api.de and then maps.mail.ru, and falls back to the OSM API's
    `map.json`;
  - sorts the tags, so the output is the same whichever source answers;
  - writes nothing if more than 20% of the buildings are missing;
  - writes to `assets/data/osm/`;
  - the aim: once accessible entrances are mapped in OSM, they come
    through to Spacefinder.
- **`buildings.js`** (`npm run buildings`):
  - builds `assets/data/buildings/data/<slug>.json` (95 files),
    `data.json` and `images/` (36 photos from Wikimedia Commons, with
    attribution);
  - uses OSM, the campus map lookup and Wikidata (P18 for images);
  - its JSON-LD follows `template.json`, which it keeps, and it removes
    files that are no longer generated;
  - identifiers are PropertyValues: `slug`, `osm`, `wikidata` and `uprn`;
  - writes nothing if Wikidata or Commons can't be reached.
- **`convert.js`** (the spaces conversion):
  - adds `additionalType` (the space type);
  - sets `publicAccess` to true when access is "Anyone (public)";
  - puts the restriction note in an `additionalProperty` with
    `propertyID: "restriction"`;
  - the spaces `data/` folder and `data.json` were regenerated.
- **These scripts should move** to spacefinder.leeds.ac.uk, along with the
  data.

## 4. Datasets and modules

- **Buildings:**
  - `assets/data/buildings/filters.json`, written by hand:
    - `category`: accommodation, libraries, culture, sport;
    - `accessibility` (additive): wheelchair entrance, AccessAble guide,
      entrances.
  - `buildings.mjs`:
    - the place id is the OSM id with `/` replaced by `-`;
    - the summary lists what else is in the building ("Also here: …"), so
      searching for a department finds its building.
- **Art:**
  - `art.mjs` and `filters.json`;
  - filters:
    - material: bronze, stone, metal, modern or wood, matched against
      `artMedium` with regular expressions;
    - period: before 1960, 1960–89, 1990–2009, since 2010;
  - the title is the name decoded from HTML, and the slug is made from the
    title;
  - the details show the artist's dates, contributor credits and an image
    gallery.
- **Spaces:**
  - `spaces.mjs` now reads JSON-LD, using `getSpaceFromJSONLD(ld)`;
  - fixed a broken closing `</li>` tag;
  - the opening-times message falls back to `''` when there isn't one;
  - the filter key `space_type` was renamed `place_type`, which fixed the
    type filter (broken before these sessions).
- **Shared code:**
  - `assets/js/modules/jsonld.mjs` is new: `getPublishedEntities`,
    `getPropertyValue`, `getFeatureValue` and `getFeatureKeys`;
  - added to `utilities.mjs`: `escapeHTML`, `decodeHTML`,
    `getDirectionsLink`, `createPlaceElement` and `getInfoWindowHTML`.
- **Details panel:**
  - `getAdditionalInfo` output is rendered for every place but hidden,
    then shown with the `hidden` attribute;
  - it's rendered on `filtersloaded`, because the spaces details need the
    filter definitions;
  - search covers only the summary, or `data-search`.
- **Places are sorted** by title after `onloadPlaceData`.

## 5. Dataset registration and routing

- **Registering datasets:** `datasources` in `_data/config.yml` (`key`,
  `label`, `icon`, and an optional `name`) feeds `spacefinder.dataSources`
  and `defaultDataSource` in `config.mjs`.
- **Routing mode:** `routing: "hash"` (the theme default) or `"history"`.
  - `utilities.mjs` has `getRoute`, `getRouteURL`, `setRoute` and
    `getDataSourceRoute`, which replace `setHash`.
  - `routing.mjs` was rewritten:
    - it sets the dataset from the URL before the data loads;
    - `applyRoute` runs on `sfmapready` and `popstate`;
    - unknown places or paths show a "Not found" message;
    - old `#/space/<slug>` links are converted;
    - moving to another dataset reloads the page.
  - `404.html`: in history mode, it redirects to `?route=`.
  - The optional Azure `navigationFallback` setting is written up in
    `docs/guides/configuration.md`.
- **Information pages** use the route `page/<name>`. Closing a page, or
  going Back, returns to the previous route (`components.mjs`).
- **Bugs fixed along the way:**
  - selecting a second place added an extra home entry to the history (the
    map popup close was treated as a deselection);
  - deep links were broken on `develop` before this work: `#/space/` versus
    `#/spaces/`, and the wrong element was focused.

## 6. Interface wording

- **"spaces" is gone** from the interface text:
  - the dataset's name is used in the skip link, the screen-reader
    headings, the hidden text on the navigation buttons, the Map button's
    tooltip and the search form;
  - "places" is used where the text isn't about one dataset, such as map
    cluster labels and result counts.
- **How the name gets there:** `_includes/datasource-name.html` renders the
  default dataset's name when the site is built. `setDataSourceNames()`
  swaps in the current dataset's name when the app loads.
- **Internal names:** `space` and `spaceID` became `place` and `placeID`
  in `map.mjs`.

## 7. Tests (`_tests/routing.mjs`, `npm run test:routing`)

- **What it does:**
  - builds the hash version from the repo, and the history version from a
    copy with `routing: "history"`, both into `_tests/build/` (which git
    ignores);
  - serves each build the way GitHub Pages does;
  - drives headless Chrome through 21 scenarios in each mode.
- **Scenarios:**
  - selecting places, Back and Forward;
  - search and filters;
  - the information pages;
  - direct visits to each dataset;
  - unknown places;
  - Back into another dataset;
  - old links;
  - the dataset's name in the interface;
  - no JavaScript errors.
- **Last run:** all 42 passed.
- **Not covered:** clicking map markers, and the Azure fallback.
- **The tests depend on the current data:** they expect 68 spaces, 95
  buildings and 22 artworks.

## 8. Documentation site (`docs/`)

- **Set-up:**
  - Just the Docs, loaded with `remote_theme` (v0.12.0);
  - `baseurl: /spacefinder`;
  - the main site's Jekyll build leaves `docs/` out.
- **Content:**
  - Home, Project and Data models pages, from the GitHub wiki;
  - a note on the Features page that Netlify CMS was dropped and data is
    edited as JSON;
  - three guides, written new: Configuration, Adding a dataset,
    Development;
  - API pages: `_scripts/docs.js` runs jsdoc-to-markdown on each core
    module except `config.mjs`.
- **How the API pages are made:**
  - each page starts with the module's top comment, followed by its
    exports;
  - the script removes `export` from `export class` in the copy it reads,
    to work around a JSDoc bug that drops exported classes;
  - the whole page is wrapped in `{% raw %}`.
- **Not done yet:** GitHub Pages isn't switched on. The plan is to publish
  from `main`, `/docs` once it's merged. The wiki is still there.

## 9. Other

- `TODO.md` holds the roadmap and small fixes, and is excluded from the
  Jekyll build.
- `package.json` has the scripts listed above, and jsdoc-to-markdown as a
  dev dependency.
- `README.md` is out of date: it still describes `spaces/`, `templates.js`
  and filters defined in config. It should point to the docs site instead.
