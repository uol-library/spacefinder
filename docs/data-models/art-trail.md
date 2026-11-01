---
title: Art trail data model
parent: Data models
nav_order: 2
---

# Art trail data model

## Introduction

Each artwork on the public art trail is a schema.org
[Article](https://schema.org/Article) about the work. Its
[mainEntity](https://schema.org/mainEntity) is a
[VisualArtwork](https://schema.org/VisualArtwork), and the work's location
is a [Place](https://schema.org/Place) in its
[spatial](https://schema.org/spatial) property.

The Leeds data is in `assets/data/art/data/` in the
[spacefinder.leeds.ac.uk](https://github.com/uol-library/spacefinder.leeds.ac.uk)
repository, one file per artwork, and is combined into `data.json`. It was
put together by hand.

## Schema

```json
{
    "@context": "https://schema.org",
    "@type": "Article",
    "creativeWorkStatus": "Published",
    "mainEntity": {
        "@type": "VisualArtwork",
        "identifier": 2,
        "name": "Converse Column",
        "alternateName": "",
        "description": "<p>...</p>",
        "image": {
            "@type": "ImageObject",
            "contentUrl": "/assets/data/art/images/converse-column.jpg",
            "description": ""
        },
        "artform": "Sculpture",
        "artMedium": "Laser-cut painted aluminium, stainless steel with LED lighting and turntable mechanism.",
        "dateCreated": "2019",
        "temporal": "",
        "creator": {
            "@type": "Person",
            "name": "Liliane Lijn",
            "birthDate": "1939",
            "deathDate": ""
        },
        "contributor": {
            "@type": "Organization",
            "name": "Neon Circus",
            "description": "Fabricated by Neon Circus"
        },
        "spatial": {
            "@type": "Place",
            "address": {
                "@type": "PostalAddress",
                "addressLocality": "University of Leeds",
                "addressRegion": "Leeds, West Yorkshire",
                "postalCode": "LS2 9JT",
                "streetAddress": "Discovery Way, outside NEXUS Building"
            },
            "geo": {
                "@type": "GeoCoordinates",
                "latitude": "53.80520007237692",
                "longitude": "-1.5490120797785778"
            }
        }
    }
}
```

## Properties

| Property | Notes |
|---|---|
| `identifier` | A unique number for the work. The app uses it as the place's `id`. Unlike the spaces and buildings data, it's a plain number, not a `PropertyValue`. |
| `name` | The title of the work, as HTML. The app turns it into plain text, and makes the place's `slug` from it. |
| `alternateName` | Optional. Another title the work is known by. |
| `description` | HTML: one or more paragraphs. |
| `image` | One [ImageObject](https://schema.org/ImageObject), or an array of them. The first is shown in the list; when there is more than one, all of them are shown in the details with their descriptions as captions. `contentUrl` starts at the site root. |
| `artform` | For example Sculpture or Relief. |
| `artMedium` | The materials. The material filter matches words in this text (bronze, stone, metal, modern materials such as fibreglass or resin, and wood). |
| `dateCreated` | A year, or a range such as `1962-1963`. The period filter uses the first year. |
| `temporal` | Optional. A note on the date, such as `recast of 1968 original`. |
| `creator` | The artist, a [Person](https://schema.org/Person) with `birthDate` and, if they have died, `deathDate`. |
| `contributor` | Optional. A [Person](https://schema.org/Person) or [Organization](https://schema.org/Organization), or an array of them. One with a `description` (such as "Gift of Stanley Burton, 1989") is shown as that description; the rest are listed as collaborators. |
| `spatial` | Where the work is: its `address` (`streetAddress` says where on campus) and its `geo` coordinates. Coordinates are strings. |

The coordinates are where the work is, which isn't always where people stand
to look at it. Hermes, for example, is on the wall of the Roger Stevens
Building above a pond.

## The trail route

The walking route is kept separately from the artworks, in the same folder:

| File | Contents |
|---|---|
| `route.geojson` | The full trail: a GeoJSON LineString, which starts and finishes at Walking Figure in the Parkinson Building and avoids steps. |
| `shortroute.geojson` | A shorter version, without the Western Campus works and the walk up Woodhouse Lane. |
| `route.gpx`, `route.kml`, `shortroute.gpx`, `shortroute.kml` | The routes for walking and mapping apps, with a numbered waypoint for each artwork on the route. |

Two scripts in the site repository keep these up to date after a route or an
artwork changes:

- `npm run routeStats` adds statistics to each route's properties:
  `length_m`, `artwork_count` (artworks within 50 m of the line),
  `walking_speed_mps`, `walking_time_min`, `minutes_per_artwork` and
  `total_time_min`.
- `npm run routeExport` writes the GPX and KML files.
