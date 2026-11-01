---
title: Buildings data model
parent: Data models
nav_order: 3
---

# Buildings data model

## Introduction

Each building is a schema.org [Article](https://schema.org/Article) whose
[mainEntity](https://schema.org/mainEntity) is the building: a
[Place](https://schema.org/Place), or one of its more specific types.

The Leeds data is in `assets/data/buildings/` in the
[spacefinder.leeds.ac.uk](https://github.com/uol-library/spacefinder.leeds.ac.uk)
repository. It isn't edited by hand: `npm run buildings` builds it from:

- OpenStreetMap: building outlines, entrances and their access tags;
- the University's campus map: the departments and services in each
  building;
- Wikidata and Wikimedia Commons: a photo of the building, with its credit
  and licence.

It writes one file per building to `data/`, all of them to `data.json`, and
the photos to `images/`. `data/template.json` is an older template in a
different format, not a building, so it's left out of `data.json`.

## Schema

A shortened example:

```json
{
    "@context": "https://schema.org",
    "@type": "Article",
    "creativeWorkStatus": "Published",
    "mainEntity": {
        "@type": "Accommodation",
        "identifier": [
            { "@type": "PropertyValue", "propertyID": "slug", "value": "the-edge" },
            { "@type": "PropertyValue", "propertyID": "osm", "value": "way/29042490" },
            { "@type": "PropertyValue", "propertyID": "wikidata", "value": "Q26262673" }
        ],
        "name": "The Edge",
        "description": "Willow Terrace Road<br>Leeds<br>LS2 9JT<br>...",
        "address": {
            "@type": "PostalAddress",
            "addressLocality": "University of Leeds",
            "addressRegion": "Leeds, West Yorkshire",
            "streetAddress": "",
            "postalCode": "LS2 9JT"
        },
        "latitude": 53.8042394,
        "longitude": -1.5532624,
        "geo": {
            "@type": "GeoShape",
            "polygon": [ "53.8040485 -1.5535487 53.8040475 -1.5541098 ... 53.8040485 -1.5535487" ]
        },
        "sameAs": [
            "https://www.openstreetmap.org/way/29042490",
            "https://www.wikidata.org/wiki/Q26262673",
            "https://www.leeds.ac.uk/campusmap?location=17568"
        ],
        "url": "https://sport.leeds.ac.uk/",
        "additionalProperty": [
            {
                "@type": "PropertyValue",
                "propertyID": "accessable",
                "name": "AccessAble access guide",
                "value": "https://www.accessable.co.uk/university-of-leeds/access-guides/the-edge"
            }
        ],
        "image": {
            "@type": "ImageObject",
            "contentUrl": "/assets/data/buildings/images/university-of-leeds-11th-august-2015-019.jpg",
            "description": "The Edge, University of Leeds, Leeds, West Yorkshire.",
            "creditText": "Mtaylor848, CC BY-SA 4.0, via Wikimedia Commons",
            "license": "https://creativecommons.org/licenses/by-sa/4.0",
            "acquireLicensePage": "https://commons.wikimedia.org/wiki/File:University_of_Leeds_(11th_August_2015)_019.JPG"
        },
        "amenityFeature": [
            { "@type": "LocationFeatureSpecification", "name": "Sport", "alternateName": "sport", "value": true },
            { "@type": "LocationFeatureSpecification", "name": "Entrances mapped", "alternateName": "entrances", "value": true }
        ],
        "containsPlace": [
            {
                "@type": "Place",
                "additionalType": "https://wiki.openstreetmap.org/wiki/Key:entrance",
                "name": "Main entrance",
                "identifier": { "@type": "PropertyValue", "propertyID": "osm", "value": "node/8156215174" },
                "latitude": 53.8044815,
                "longitude": -1.5535516,
                "amenityFeature": [
                    { "@type": "LocationFeatureSpecification", "name": "Entrance type", "alternateName": "entrance", "value": "main" }
                ]
            },
            {
                "@type": "Place",
                "name": "Central Village",
                "identifier": { "@type": "PropertyValue", "propertyID": "campusmap", "value": "17374" },
                "sameAs": "https://www.leeds.ac.uk/campusmap?location=17374",
                "description": "Woodhouse Lane<br>Leeds<br>LS2 3AB<br>Accommodation<br>...",
                "latitude": 53.8041697,
                "longitude": -1.5534876
            }
        ]
    }
}
```

## Properties

| Property | Notes |
|---|---|
| `@type` | `CivicStructure` (a University building), `Accommodation`, `LandmarksOrHistoricalBuildings` or `Place`. The app shows a label for each. |
| `identifier` | An array of `PropertyValue`s. `slug` is used in URLs. `osm` is the OpenStreetMap way or relation, and gives the place's `id` (with `/` changed to `-`). Some buildings also have `wikidata` and `uprn` (Unique Property Reference Number). |
| `name` | The building's name. |
| `alternateName` | Optional. Another name for the building. |
| `description` | HTML, from the campus map. |
| `address` | A [PostalAddress](https://schema.org/PostalAddress). |
| `latitude`, `longitude` | Numbers: the point where the building's pin goes. |
| `geo` | A [GeoShape](https://schema.org/GeoShape) with the building's outline, as a `polygon` string of `latitude longitude` pairs. |
| `sameAs` | Links to the building in OpenStreetMap, Wikidata and the campus map. |
| `url` | Optional. The building's own website. |
| `additionalProperty` | Optional `PropertyValue`s: `accessable` (a link to the AccessAble access guide), `building:levels` (the number of floors) and `wheelchair`. |
| `image` | Optional. One [ImageObject](https://schema.org/ImageObject), with `creditText`, `license` and `acquireLicensePage` from Commons. `contentUrl` starts at the site root. |
| `amenityFeature` | `LocationFeatureSpecification`s whose `alternateName` is a filter option in `filters.json`: the building type (`accommodation`, `libraries`, `culture`, `sport`) and accessibility (`wheelchair_entrance`, `accessable`, `entrances`). |
| `containsPlace` | Optional. The building's entrances and the campus map entries inside it (see below). |

### Entrances

An entrance has `additionalType`
`https://wiki.openstreetmap.org/wiki/Key:entrance` and an `osm` identifier.
Its `amenityFeature`s are copied from these OpenStreetMap tags, with the tag
as the `alternateName` and the tag's value as the `value`: `entrance`,
`wheelchair`, `automatic_door`, `door`, `ramp`, `step_count`, `level` and
`access`. The app lists the entrances in the building's details, with
directions to each, and describes their access from `wheelchair`,
`automatic_door`, `ramp` and `step_count`.

### Campus map entries

Other places in `containsPlace` are departments, services and other entries
from the campus map, with a `campusmap` identifier, a `sameAs` link to the
campus map and, usually, a `description`.
