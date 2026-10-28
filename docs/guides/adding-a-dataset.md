---
title: Adding a dataset
parent: Guides
nav_order: 2
---

# Adding a dataset
{: .no_toc }

A dataset is a folder in `assets/data`, listed in `_data/config.yml`. The
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
├── filters.json   the filters for the filters panel
├── trees.mjs      the module that renders the places
├── data/          optional: one JSON-LD file per place, combined into data.json
└── images/        optional: images the data refers to
```

## 2. Register it

Add the dataset to `datasources` in `_data/config.yml`:

```yaml
datasources:
  - key: "spaces"
    label: "Study spaces"
    icon: "icon-desk"
  - key: "trees"
    label: "Campus trees"
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
            "description": "A large copper beech planted in 1926.",
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

An array of filters, which make up the filters panel:

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
            { "key": "oak", "label": "Oak", "icon": "icon-tree" }
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
[getPlaceHTML](#getplacehtml-place-)).

At the moment a dataset needs a `filters.json`. If it has no filters, use an
empty array (`[]`).

## The dataset module

`<key>.mjs` is loaded when the dataset is shown. It can import from the core
modules, for example:

```js
import { spacefinder } from '../../js/modules/config.mjs';
import { createPlaceElement, getInfoWindowHTML, getDirectionsLink } from '../../js/modules/utilities.mjs';
import { getPublishedEntities } from '../../js/modules/jsonld.mjs';

export const namespace = 'trees';
```

It has to export the functions below. The modules for
[spaces](https://github.com/uol-library/spacefinder/blob/develop/assets/data/spaces/spaces.mjs),
[buildings](https://github.com/uol-library/spacefinder/blob/develop/assets/data/buildings/buildings.mjs)
and [art](https://github.com/uol-library/spacefinder/blob/develop/assets/data/art/art.mjs)
are complete examples.

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
property (the art and buildings modules use `ld`) is often simplest.

```js
export function onloadPlaceData( data ) {
    spacefinder.data[namespace].places = getPublishedEntities( data ).map( ld => ( {
        id: ld.identifier,
        slug: ld.name.toLowerCase().replace( /[^a-z0-9]+/g, '-' ),
        title: ld.name,
        lat: Number( ld.geo.latitude ),
        lng: Number( ld.geo.longitude ),
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
        classList: 'species_' + place.ld.species,
        typeLabel: 'Tree',
        typeClass: 'tree',
        address: place.ld.address || '',
        details: '<p class="description">' + place.ld.description + '</p>'
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
    return getInfoWindowHTML( place.title, [ 'Tree', place.ld.species ] );
}
```

### onrenderPlaceData()

Optional. Called after the list has been rendered, for example to start a
timer that keeps something up to date (the spaces module updates whether
each space is open).

### onunloadPlaceData()

Optional. Will be called before the app switches to another dataset, to
remove timers, event listeners and anything else the module added. Switching
datasets without reloading the page isn't built yet.

## Images

Put images in the dataset's `images` folder and refer to them from the data,
for example `/assets/data/trees/images/copper-beech.jpg`. At the moment these
paths only work if the site's `baseurl` is empty.

## Check it

Run the site with `npm run serve` and open `/#/trees`, or `/trees` with
history routing. `npm run test:routing` tests the existing datasets (see
[Development](development.html)).
