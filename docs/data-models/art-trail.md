---
title: Art trail data model
parent: Data models
nav_order: 2
---

# Art trail data model

## Introduction

The data model employed in the Art Trail can use the schema.org [Article](https://schema.org/Article), [VisualArtwork](https://schema.org/VisualArtwork) and [Place](https://schema.org/Place) schemas, for the location of art works within the application using JSON-LD.

## Schema

Each block of data relating to a work of art could be classified as an [Article](https://schema.org/Article) about that work, this seems the best choice for the class, with the [mainEntity](https://schema.org/mainEntity) being the [VisualArtwork](https://schema.org/VisualArtwork), and the location of that work specified as a [Place](https://schema.org/Place) in its [spatial](https://schema.org/spatial) property.

```json
{
    "@context": "https://schema.org",
    "@type": "Article",
    "creativeWorkStatus": "Published",
    "mainEntity": {
        "@type": "VisualArtwork",
        "name": "",
        "description": "",
        "image": {
            "@type": "ImageObject",
            "contentUrl": "",
            "description": ""
        },
        "artform": "",
        "artMedium": "",
        "dateCreated": "",
        "temporal": "",
        "creator": {
            "@type": "Person",
            "name": "",
            "birthDate": "",
            "deathDate": ""
        },
        "contributor": {
            "@type": "Person",
            "name": "",
            "description": ""
        },
        "spatial": {
            "@type": "Place",
            "address": {
                "@type": "PostalAddress",
                "addressLocality": "University of Leeds",
                "addressRegion": "Leeds, West Yorkshire",
                "postalCode": "LS2 9JT",
                "streetAddress": ""
            },
            "geo": {
                "@type": "GeoCoordinates",
                "latitude": "",
                "longitude": ""
            }
        }
    }
}
```
