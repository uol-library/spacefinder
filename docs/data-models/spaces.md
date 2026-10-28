---
title: Spaces data model
parent: Data models
nav_order: 1
---

# Spaces data model

## Introduction

The data model employed in spacefinder was taken largely from the one employed by Cambridge in the original application. This was an essentially flat JSON data structure consisting of key-value pairs, with a few keys represented by multiple values (arrays). This document outlines the intersections between this data model and the schema.org [Article](https://schema.org/Article) and [Place](https://schema.org/Place) schemas, in an attempt to model the data for spaces within the application using JSON-LD.

## Article information

As each block of data relating to a space could be classified as an [Article](https://schema.org/Article) about that space, this seems the best choice for the class, with the [mainEntity](https://schema.org/mainEntity) being the [Place](https://schema.org/Place). This allows the application to use [creativeWorkStatus](https://schema.org/creativeWorkStatus) to describe whether the space is published.

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "creativeWorkStatus": "Draft|Published"
  "mainEntity": "[Place]"
}
```

## Core Place Information

These are property/value pairs which exist in the current schema and have a direct correspondence with properties in the [Place](https://schema.org/Place) schema.

### Existing Data Model

```json
{
    "id": 1,
    "title": "Baines Wing Café",
    "description": "Situated between the School of Healthcare and the Great Hall, Baines Wing Café has a large seating area including its own secluded courtyard which is perfect to enjoy the sunny weather.\n\nMixture of group seating around tables, sofas and some high level desking with 6 workstations.",
    "slug": "baines-wing-cafe",
    "image": "/assets/photos/Baines-Wing-Cafe.jpg",
    "imagealt": "Interior photograph of the Baines Wing Café showing students seated at a round table in front of the serving area and chiller cabinets",
    "url": "https://gfal.leeds.ac.uk/where-to-eat/cafes/baineswing/",
    "campusmap_url": "https://www.leeds.ac.uk/campusmap?location=18467",
    "access": "Anyone (public)",
    "phone_number": "",
}
```

### Using schema.org's Place

These properties of the original Spacefinder data model can be mapped directly to [Place](https://schema.org/Place) properties - although the `image url` and `alt text` is now described in an [ImageObject](https://schema.org/ImageObject). 

```json
{
    "@context": "https://schema.org",
    "@type": "Place",
    "identifier": "https://spacefinder.leeds.ac.uk/spaces/1",
    "name": "Baines Wing Café",
    "description": "Situated between the School of Healthcare and the Great Hall, Baines Wing Café has a large seating area including its own secluded courtyard which is perfect to enjoy the sunny weather.\n\nMixture of group seating around tables, sofas and some high level desking with 6 workstations.",
    "alternateName": "baines-wing-cafe",
    "image": {
        "@type": "ImageObject",
        "contentUrl": "/assets/photos/Baines-Wing-Cafe.jpg",
        "description": "Interior photograph of the Baines Wing Café showing students seated at a round table in front of the serving area and chiller cabinets"
    },
    "url": "https://gfal.leeds.ac.uk/where-to-eat/cafes/baineswing/",
    "sameAs": "https://www.leeds.ac.uk/campusmap?location=18467",
    "publicAccess": true
}

```

### Types of Place

In order to use some properties which are only available in the [Organisation](https://schema.org/Organization) schema (like `telephone`, `email` and `contactPoint`), we need to use more specific types of place for the `@type` context in the Article's `mainEntity`. These are mapped as follows:

* Café - [CafeOrCoffeeShop](https://schema.org/CafeOrCoffeeShop)
* Library - [Library](https://schema.org/Library)
* IT Cluster, Seating areas - [CollegeOrUniversity](https://schema.org/CollegeOrUniversity)

In order to distinguish between IT Clusters and indoor / outdoor seating areas, we need to use an `additionalProperty`.

## Features

There are a few different classes of feature used in the current data model, relating to noise levels, atmosphere, suitability for different study types and amenities available. The easiest to map to schema.org are the `facilities`, using [amenityFeature](https://schema.org/amenityFeature).

### Facilities data model

```json
    "facilities": [
        "food_drink",
        "daylight",
        "views",
        "signal",
        "wheelchair_accessible",
        "bike_racks"
    ],
```

### Facilities as amenityFeatures

Each facility is represented by a [LocationFeatureSpecification](https://schema.org/LocationFeatureSpecification). The [alternateName](https://schema.org/alternateName) property is used here to provide an alias for the facility which can be used in forms and CSS classes.

```json
"amenityFeature": [
    { 
        "@type": "LocationFeatureSpecification",
        "name": "Food & drink allowed",
        "alternateName": "food_drink",
        "value": true
    },
    { 
        "@type": "LocationFeatureSpecification",
        "name": "Natural daylight",
        "alternateName": "daylight",
        "value": true
    },
    { 
        "@type": "LocationFeatureSpecification",
        "name": "Attractive views out of the window",
        "alternateName": "views",
        "value": true
    },
    { 
        "@type": "LocationFeatureSpecification",
        "name": "Phone signal",
        "alternateName": "signal",
        "value": true
    },
   { 
        "@type": "LocationFeatureSpecification",
        "name": "Wheelchair accessible",
        "alternateName": "wheelchair_accessible",
        "value": true
    },
    { 
        "@type": "LocationFeatureSpecification",
        "name": "Bike racks",
        "alternateName": "bike_racks",
        "value": true
    }
]
```

## Geographical Location Information

* The original data model encapsulated the locations as [GeoJSON](https://geojson.org/), which can represent Points, Lines, Polygons, and multiple instances of these features.
* Schema.org represents Points as [GeoCoordinates](https://schema.org/GeoCoordinates), whereas other types (box, circle, line and polygon) can be represented by a [GeoShape](https://schema.org/GeoShape)

### Original Data Model

```json
    "location": "{\"type\":\"Point\",\"coordinates\":[-1.553855264,53.80745464]}",
```

### Schema.org Data Model

A Point, or marker is described by [GeoCoordinates](https://schema.org/GeoCoordinates)
```json
"geo": {
    "@type": "GeoCoordinates",
    "latitude": "53.80745464",
    "longitude": "-1.553855264"
}
```

Whereas more complex features are described by a [GeoShape](https://schema.org/GeoShape)

```json
"geo": {
    "@type": "GeoShape",
    "polygon": "17.052154541015,42.984695434571 17.108459472656,42.969589233399 17.140045166015,42.962722778321 17.166137695312,42.942123413087 17.181243896484,42.929763793946 17.212829589844,42.922897338868 17.208709716797,42.898178100587 17.177124023437,42.898178100587 17.090606689453,42.895431518555 16.964263916015,42.911911010743 16.839294433594,42.87208557129 16.833801269531,42.888565063477 16.732177734375,42.895431518555 16.725311279297,42.892684936524 16.670379638672,42.910537719727 16.656646728515,42.896804809571 16.618194580078,42.927017211915 16.658020019531,42.95997619629 16.658020019531,42.962722778321 16.603088378906,43.001174926758 16.658020019531,43.008041381837 16.857147216797,42.979202270508 17.052154541015,42.984695434571"
}
```

## Address Information

### Original Data Model

```json
    "floor": "Ground floor",
    "building": "Baines Wing",
    "address": "University of Leeds, LS2 9JT",
```

### Schema.org model


```json
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "University of Leeds",
    "addressRegion": "Leeds, West Yorkshire",
    "postalCode": "LS2 9JT",
    "streetAddress": "Ground Floor, Baines Wing"
  },

```

## Opening Hours

### Original Data Model

```json
"opening_hours": {
    "monday": {
        "open": true,
        "from": "8:30",
        "to": "15:00"
    },
    "tuesday": {
        "open": true,
        "from": "8:30",
        "to": "15:00"
    },
    "wednesday": {
        "open": true,
        "from": "8:30",
         "to": "15:00"
    },
    "thursday": {
        "open": true,
        "from": "8:30",
        "to": "15:00"
    },
    "friday": {
        "open": true,
        "from": "8:30",
        "to": "15:00"
    },
    "saturday": {
        "open": false,
        "from": "",
        "to": ""
    },
    "sunday": {
        "open": false,
        "from": "",
        "to": ""
    }
},
```

### Schema.org model - openingHoursSpecification

* This does not explicitly cover closing times, so some additional processing is required to determine the open or closed status of a space
* The time specification is `hh:mm:ss`, which will need parsing to get the format currently used in the application

```json
"openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": "https://schema.org/Monday",
      "opens":  "08:30:00",
      "closes":  "15:00:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": "https://schema.org/Tuesday",
      "opens":  "08:30:00",
      "closes":  "15:00:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek":  "https://schema.org/Wednesday",
      "opens":  "08:30:00",
      "closes":  "15:00:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": "https://schema.org/Thursday",
      "opens":  "08:30:00",
      "closes":  "15:00:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek":  "https://schema.org/Friday",
      "opens":  "08:30:00",
      "closes":  "15:00:00"
    }
]
```

## Contact Information

Contact information in the current model is handled by the `email_address`, `phone_number`, `twitter_screen_name` and `facebook_url`. `email_address` and `phone_number` can be mapped to the Place directly (to `email` and `telephone`) - others can be mapped to [ContactPoint](https://schema.org/ContactPoint) in schema.org, all of which are part of the [Organisation](https://schema.org/Organization) schema.

```json
[
    {
        "@type": "ContactPoint",
        "contactType": "Follow us on facebook",
        "url": "https://www.facebook.com/leedsuniversityunion/"
    },
    {
        "@type": "ContactPoint",
        "contactType": "Follow us on X (formerly Twitter)",
        "url": "https://twitter.com/LeedsUniUnion"
    }
]
```

## Remaining properties

As there is no Place type in schema.org for "General Seating Area", "IT Cluster" or "Outdoor Seating Area", spaces classified as such are all treated as "CollegeOrUniversity" Place types, then these sub-types are given in the `space_type` property in `additionalProperty`.

Spaces with restricted access described the nature of the restriction in the `access` field in the original schema, but the `publicAccess` field of a Place can only contain a boolean value. So if this is `false` (i.e. access is restricted) the `restriction` field is concatenated with the `access` field and stored here.

### Original schema

I can't find any equivalence for these other properties in schema.org, so they are added as `additionalProperty` name/value pairs.

```json
{
    "campusmap_url": "https://www.leeds.ac.uk/campusmap?location=17411",
    "campusmap_ref": "83",
    "what3words": "///toned.duty.fats",
    "restriction": "Library Card needed",
}
```
### Additional properties

```json
[
    {
        "@type": "PropertyValue",
        "name": "space_type",
        "value": "IT Cluster"
    },
    {
        "@type": "PropertyValue",
        "name": "what3words",
        "value": "///toned.duty.fats"
    },
    {
        "@type": "PropertyValue",
        "name": "restriction",
        "value": "University Staff and Students (library card needed)"
    },
    {
        "@type": "PropertyValue",
        "name": "campusmap_url",
        "value": "https://www.leeds.ac.uk/campusmap?location=17411"
    },
    {
        "@type": "PropertyValue",
        "name": "campusmap_ref",
        "value": "83"
    }
]
```

## Full Example

### Existing data schema

```json
{
    "facilities": [
        "food_drink",
        "daylight",
        "views",
        "free_wifi",
        "laptops_allowed",
        "signal",
        "outdoor_seating",
        "toilets",
        "refreshments",
        "computers",
        "sockets",
        "wheelchair_accessible",
        "bike_racks",
        "gender_neutral_toilets"
    ],
    "atmosphere": [
        "relaxed",
        "social",
        "friendly",
        "modern"
    ],
    "access": "Anyone (public)",
    "disabled_access": true,
    "opening_hours": {
        "monday": {
            "open": true,
            "from": "8:30",
            "to": "15:00"
        },
        "tuesday": {
            "open": true,
            "from": "8:30",
            "to": "15:00"
        },
        "wednesday": {
            "open": true,
            "from": "8:30",
            "to": "15:00"
        },
        "thursday": {
            "open": true,
            "from": "8:30",
            "to": "15:00"
        },
        "friday": {
            "open": true,
            "from": "8:30",
            "to": "15:00"
        },
        "saturday": {
            "open": false,
            "from": "",
            "to": ""
        },
        "sunday": {
            "open": false,
            "from": "",
            "to": ""
        }
    },
    "slug": "baines-wing-cafe",
    "floor": "Ground floor",
    "restriction": "",
    "campusmap_url": "https://www.leeds.ac.uk/campusmap?location=18467",
    "imagealt": "Interior photograph of the Baines Wing Café showing students seated at a round table in front of the serving area and chiller cabinets",
    "url": "https://gfal.leeds.ac.uk/where-to-eat/cafes/baineswing/",
    "campusmap_ref": "58",
    "email_address": "gfal@leeds.ac.uk",
    "work": [
        "close",
        "friends",
        "group"
    ],
    "twitter_screen_name": "GreatFoodLeeds",
    "space_type": "Café",
    "building": "Baines Wing",
    "address": "University of Leeds, LS2 9JT",
    "location": "{\"type\":\"Point\",\"coordinates\":[-1.553855264,53.80745464]}",
    "facebook_url": "https://www.facebook.com/greatfoodleeds",
    "title": "Baines Wing Café",
    "tags": [],
    "what3words": "///toned.duty.fats.",
    "noise": "Animated discussion",
    "phone_number": "",
    "restricted": false,
    "id": 1,
    "image": "/assets/photos/Baines-Wing-Cafe.jpg",
    "description": "Situated between the School of Healthcare and the Great Hall, Baines Wing Café has a large seating area including its own secluded courtyard which is perfect to enjoy the sunny weather.\n\nMixture of group seating around tables, sofas and some high level desking with 6 workstations.",
    "published": true,
    "url_text": "Visit the Baines Wing Café web site",
    "phone_text": ""
}
```

### Using schema.org

```json
{
    "@context": "https://schema.org",
    "@type": "Article",
    "creativeWorkStatus": "Published",
    "mainEntity": {
        "@type": "CafeOrCoffeeShop",
        "name": "Baines Wing Café",
        "description": "Situated between the School of Healthcare and the Great Hall, Baines Wing Café has a large seating area including its own secluded courtyard which is perfect to enjoy the sunny weather.\n\nMixture of group seating around tables, sofas and some high level desking with 6 workstations.",
        "alternateName": "baines-wing-cafe",
        "url": "https://gfal.leeds.ac.uk/where-to-eat/cafes/baineswing/",
        "sameAs": "https://www.leeds.ac.uk/campusmap?location=18467",
        "publicAccess": true,
        "telephone": "",
        "email": "gfal@leeds.ac.uk",
        "image": {
            "@type": "ImageObject",
            "contentUrl": "/assets/photos/Baines-Wing-Cafe.jpg",
            "description": "Interior photograph of the Baines Wing Café showing students seated at a round table in front of the serving area and chiller cabinets"
        },
        "address": {
            "@type": "PostalAddress",
            "addressLocality": "University of Leeds",
            "addressRegion": "Leeds, West Yorkshire",
            "postalCode": "LS2 9JT",
            "streetAddress": "Ground floor, Baines Wing"
        },
        "geo": {
            "@type": "GeoCoordinates",
            "latitude": 53.80745464,
            "longitude": -1.553855264
        },
        "contactPoint": [
            {
                "@type": "ContactPoint",
                "contactType": "Follow us on facebook",
                "url": "https://www.facebook.com/greatfoodleeds"
            },
            {
                "@type": "ContactPoint",
                "contactType": "Follow us on X (formerly Twitter)",
                "url": "https://twitter.com/GreatFoodLeeds"
            }
        ],
        "amenityFeature": [
            {
                "@type": "LocationFeatureSpecification",
                "name": "Food &amp; drink allowed",
                "alternateName": "food_drink",
                "value": true
            },
            {
                "@type": "LocationFeatureSpecification",
                "name": "Natural daylight",
                "alternateName": "daylight",
                "value": true
            },
            {
                "@type": "LocationFeatureSpecification",
                "name": "Attractive views out of the window",
                "alternateName": "views",
                "value": true
            },
            {
                "@type": "LocationFeatureSpecification",
                "name": "Phone signal",
                "alternateName": "signal",
                "value": true
            },
            {
                "@type": "LocationFeatureSpecification",
                "name": "Outdoor seating",
                "alternateName": "outdoor_seating",
                "value": true
            },
            {
                "@type": "LocationFeatureSpecification",
                "name": "Toilets nearby",
                "alternateName": "toilets",
                "value": true
            },
            {
                "@type": "LocationFeatureSpecification",
                "name": "Close to refreshments",
                "alternateName": "refreshments",
                "value": true
            },
            {
                "@type": "LocationFeatureSpecification",
                "name": "Computers",
                "alternateName": "computers",
                "value": true
            },
            {
                "@type": "LocationFeatureSpecification",
                "name": "Plug Sockets",
                "alternateName": "sockets",
                "value": true
            },
            {
                "@type": "LocationFeatureSpecification",
                "name": "Wheelchair accessible",
                "alternateName": "wheelchair_accessible",
                "value": true
            },
            {
                "@type": "LocationFeatureSpecification",
                "name": "Bike racks",
                "alternateName": "bike_racks",
                "value": true
            },
            {
                "@type": "LocationFeatureSpecification",
                "name": "Gender neutral toilets",
                "alternateName": "gender_neutral_toilets",
                "value": true
            },
            {
                "@type": "LocationFeatureSpecification",
                "name": "Animated discussion",
                "alternateName": "animateddiscussion",
                "value": true
            },
            {
                "@type": "LocationFeatureSpecification",
                "name": "Where others are working",
                "alternateName": "close",
                "value": true
            },
            {
                "@type": "LocationFeatureSpecification",
                "name": "With friends",
                "alternateName": "friends",
                "value": true
            },
            {
                "@type": "LocationFeatureSpecification",
                "name": "On a group project",
                "alternateName": "group",
                "value": true
            },
            {
                "@type": "LocationFeatureSpecification",
                "name": "Relaxed",
                "alternateName": "relaxed",
                "value": true
            },
            {
                "@type": "LocationFeatureSpecification",
                "name": "Social",
                "alternateName": "social",
                "value": true
            },
            {
                "@type": "LocationFeatureSpecification",
                "name": "Friendly",
                "alternateName": "friendly",
                "value": true
            },
            {
                "@type": "LocationFeatureSpecification",
                "name": "Modern",
                "alternateName": "modern",
                "value": true
            }
        ],
        "openingHoursSpecification": [
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": "https://schema.org/Monday",
                "opens": "08:30:00",
                "closes": "15:00:00"
            },
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": "https://schema.org/Tuesday",
                "opens": "08:30:00",
                "closes": "15:00:00"
            },
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": "https://schema.org/Wednesday",
                "opens": "08:30:00",
                "closes": "15:00:00"
            },
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": "https://schema.org/Thursday",
                "opens": "08:30:00",
                "closes": "15:00:00"
            },
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": "https://schema.org/Friday",
                "opens": "08:30:00",
                "closes": "15:00:00"
            },
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": "https://schema.org/Saturday"
            },
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": "https://schema.org/Sunday"
            }
        ]
    }
}
```
