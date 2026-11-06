---
title: Adding a dataset
parent: Guides
nav_order: 2
---

# Adding a dataset
{: .no_toc }

A dataset is a folder in `assets/data` (or the folder set by
[`dataDir`](configuration.html#data-directory)), listed in
`_data/config.yml`. The
core modules load its data, show it in the list and on the map, and handle
search, filters and routing. The dataset's own module decides how each place
looks.

1. TOC
{:toc}

## 1. Create the folder

The folder's name is the dataset's key, which is also used in URLs. For a
dataset with the key `trees`:

```
assets/data/trees/
├── data.json      the places, as an array of JSON-LD records
├── filters.json   optional: the filters
├── trees.mjs      the module that renders the places
├── data/          optional: one JSON-LD file per place, combined into data.json,
│                  and any overlays (.geojson files)
└── images/        optional: images the data refers to
```

## 2. Register it

Add the dataset to `datasources` in `_data/config.yml`:

```yaml
datasources:
  - key: "cafes"
    label: "Cafés"
    icon: "icon-coffee"
  - key: "trees"
    label: "Trees"
    icon: "icon-views"
```

It's then available at `/trees` (or `/#/trees` with hash routing), and each
place at `/trees/<slug>`. See [Configuration](configuration.html#datasets)
for the other properties.

## data.json

An array of schema.org [Articles](https://schema.org/Article), one for each
place. The `mainEntity` is the place itself, using whichever schema.org type
fits, and only Articles whose `creativeWorkStatus` is `Published` are shown:

```json
[
    {
        "@context": "https://schema.org",
        "@type": "Article",
        "creativeWorkStatus": "Published",
        "mainEntity": {
            "@type": "Place",
            "identifier": 1,
            "name": "Copper beech",
            "description": "A large copper beech, planted in 1926.",
            "additionalProperty": [
                {
                    "@type": "PropertyValue",
                    "propertyID": "species",
                    "name": "Species",
                    "value": "Beech"
                }
            ],
            "geo": {
                "@type": "GeoCoordinates",
                "latitude": 53.8067,
                "longitude": -1.5549
            }
        }
    }
]
```

The core modules don't read the JSON-LD themselves. The dataset module turns
it into place objects (see [onloadPlaceData](#onloadplacedata-data-)), so the
data can use any properties the module understands. The
[Data models](../data-models/) pages describe the models used so far.

`getPublishedEntities` in [jsonld.mjs](../api/jsonld.html) returns the places
from the published Articles. `getPropertyValue`, `getFeatureValue` and
`getFeatureKeys` read `PropertyValue` and `LocationFeatureSpecification`
lists.

## filters.json

An array of filters. They are shown over the list when the Filters button
is pressed:

```json
[
    {
        "key": "species",
        "label": "Species",
        "message": "Showing trees of species: ",
        "exclusive": false,
        "additive": false,
        "open": true,
        "options": [
            { "key": "beech", "label": "Beech" },
            { "key": "oak", "label": "Oak", "icon": "icon-views" }
        ]
    }
]
```

| Property | Use |
|---|---|
| `key` | the filter's id, used in classes and form controls |
| `label` | the filter's heading in the panel |
| `message` | shown above the list while the filter is in use |
| `exclusive` | if `true`, only one option can be chosen |
| `additive` | if `true`, a place has to match every chosen option, rather than any of them |
| `open` | if `true`, the filter's options are shown when the panel opens |
| `options` | the options, each with a `key`, a `label` and an optional `icon` class |

Filtering works with classes: a place matches option `beech` of filter
`species` if its list element has the class `species_beech`. The module
adds these classes when it renders each place (see
[getPlaceHTML](#getplacehtml-place-)). For a filter that classes can't
express, such as whether a place is open now, the module can match it in
code instead (see [matchFilter](#matchfilter-place-key-values-element-)).

`filters.json` is optional. Without it (or with an empty array), the
panel has just the search box, and no Filters button. If a dataset has no filters, you can
also set `filters: false` for it in the
[configuration](configuration.html#datasets), so the app doesn't request
the file.

## The dataset module

`<key>.mjs` is loaded when the dataset is shown. It can import from the core
modules, for example:

```js
import { spacefinder } from '../../js/modules/config.mjs';
import { escapeHTML as esc, createPlaceElement, getInfoWindowHTML, getDirectionsLink } from '../../js/modules/utilities.mjs';
import { getPublishedEntities, getPropertyValue } from '../../js/modules/jsonld.mjs';

export const namespace = 'trees';
```

It has to export the functions below. The theme's example datasets are
complete examples:
[trees](https://github.com/uol-library/spacefinder/blob/develop/examples/trees/trees.mjs)
is the code on this page, and
[cafés](https://github.com/uol-library/spacefinder/blob/develop/examples/cafes/cafes.mjs)
adds filters from `amenityFeature`, opening hours and an "Open now"
filter. The Leeds datasets
(spaces, buildings and art) are in the
[spacefinder.leeds.ac.uk](https://github.com/uol-library/spacefinder.leeds.ac.uk)
repository. The examples are in the theme's `examples` folder, rather than
`assets/data`, so their imports start `../../assets/js/modules/`.

### onloadPlaceData( data )

Required. Called with the contents of `data.json` once it has loaded. It
fills `spacefinder.data[namespace].places` with a place object for each
place. The core modules use these properties:

| Property | Use |
|---|---|
| `id` | a unique id, used in element ids and events |
| `slug` | used in the place's URL, e.g. `trees/copper-beech` |
| `title` | plain text title, used in the list, on the map and for sorting |
| `lat`, `lng` | the place's position (numbers). Places without them aren't shown on the map. |

Add anything else the other functions need. Keeping the JSON-LD in a
property (here `ld`) is often simplest.

```js
export function onloadPlaceData( data ) {
    spacefinder.data[namespace].places = getPublishedEntities( data ).map( ld => ( {
        id: ld.identifier,
        slug: ld.name.toLowerCase().replace( /[^a-z0-9]+/g, '-' ),
        title: ld.name,
        lat: Number( ld.geo.latitude ),
        lng: Number( ld.geo.longitude ),
        species: getPropertyValue( ld.additionalProperty, 'species' ),
        ld: ld
    } ) );
}
```

The places are sorted by title after this.

### getPlaceHTML( place )

Required. Returns the place's element in the list. Use `createPlaceElement`
from [utilities.mjs](../api/utilities.html#createPlaceElement). The other
modules rely on the ids, classes and attributes it sets.

```js
export function getPlaceHTML( place ) {
    return createPlaceElement( place, {
        classList: 'species_' + place.species.toLowerCase(),
        typeLabel: 'Tree',
        typeClass: 'tree',
        details: '<p class="description">' + esc( place.ld.description ) + '</p>'
    } );
}
```

`classList` holds the filter classes. Search looks at the summary shown in
the list. To search different text instead, pass it as `search`.

### getAdditionalInfo( place )

Required. Returns the HTML for the details shown when the place is selected.
It is rendered for every place, hidden, once the filters have loaded, so it
can use `getFilterData` to look up filter labels and icons. It isn't
searched.

### getInfoWindowContent( place )

Required. Returns the HTML for the place's popup on the map. Use
`getInfoWindowHTML` from [utilities.mjs](../api/utilities.html#getInfoWindowHTML).

```js
export function getInfoWindowContent( place ) {
    return getInfoWindowHTML( place.title, [ 'Tree', esc( place.species ) ] );
}
```

### onrenderPlaceData()

Optional. Called after the list has been rendered, for example to start a
timer that keeps something up to date (the Leeds spaces module updates
whether each space is open).

### onunloadPlaceData()

Optional. Called before the app switches to another dataset, to remove
timers, event listeners and anything else the module added. The app then
clears the list, the filters and the map markers itself, and forgets the
dataset's places. If the user comes back to the dataset, it is loaded again
and `onloadPlaceData` is called again, so reset anything the module keeps
between calls here.

### matchFilter( place, key, values, element )

Optional. Called for each place and each active filter when the filters are
applied, before the class matching. `key` is the filter's key, `values` the
keys of its checked options, and `element` the place's list element. Return
`true` or `false` to decide whether the place matches, or `undefined` (or
nothing) to leave the filter to the class matching. The cafés example uses
it for an "Open now" filter:

```js
export function matchFilter( cafe, key, values ) {
    if ( key === 'open' ) {
        return isOpen( cafe, new Date() );
    }
}
```

The filter still needs an entry in `filters.json`, so that it appears in
the filters.

## Overlays

Any `.geojson` file in the dataset's `data/` folder is an overlay, such as
a walking route or a set of points. When the dataset loads, its overlays
are listed above the places, each with a button which shows or hides it on
the map. The files are found when the site is built, so adding one needs no
other change, and they are listed in the order of their file names.

Optional members of the FeatureCollection describe the overlay:

```json
{
    "type": "FeatureCollection",
    "title": "Full route",
    "description": "4.6 km, 22 artworks, about 2 hours",
    "downloads": [ { "label": "GPX", "href": "route.gpx" } ],
    "style": { "color": "#b0127a", "weight": 8, "dashArray": "0 16", "lineCap": "round" },
    "visible": true,
    "group": "routes",
    "features": [ ]
}
```

- `title` is its name in the list (the file name if there isn't one), and
  `description` (HTML) follows it.
- `downloads` are links shown after the description. Each `href` is
  relative to the GeoJSON file.
- `style` holds Leaflet path options for its lines, shapes and points.
  Points are drawn as circles, and `radius` sets their size.
- `visible: true` shows it when the dataset loads.
- Overlays with the same `group` are shown one at a time: choosing one
  hides the others. Overlays without a group are shown and hidden
  independently.

A feature with a `name` property has a popup with its name and
`description` (HTML). Other features have the overlay's title as a
tooltip. Lines and shapes have the classes `sf-overlay` and
`sf-overlay-<file name>`, so they can also be styled with CSS.

The list can have a heading and an introduction, set in the dataset's
entry in `_data/config.yml`:

```yaml
  - key: "art"
    label: "Public Art Trail"
    overlays:
      title: "Public Art Trail"
      description: "Two step-free walks around the artworks."
```

## Images

Put images in the dataset's `images` folder and refer to them from the data,
for example `/assets/data/trees/images/copper-beech.jpg`. In the module, pass
these URLs through `getSiteURL()` (from `utilities.mjs`), which adds the
site's `baseurl`, so they still work when the site isn't at the root of its
domain:

```js
'<img src="' + getSiteURL( ld.image.contentUrl ) + '" alt="' + esc( ld.image.description ) + '">'
```

## Logging

To log what the module does in [debug mode](development.html#debugging),
get a logger with the module's name. Anything after the message is logged
as data, which can be opened in the console:

```js
import { getLogger } from '../../js/modules/utilities.mjs';

const log = getLogger( 'trees' );

log( 'Loaded ' + places.length + ' trees', places );
log.warn( 'No species for ' + ld.name );
log.error( 'Could not read the opening hours', error );
```

Errors are logged whether debug mode is on or not. `splog( message )` still
works, and logs without a module name.

## Check it

Run the site with `npm run serve` and open `/#/trees`, or `/trees` with
history routing. `npm run test:routing` tests the theme with its example
datasets (see [Development](development.html)).
