---
title: Development roadmap
parent: Project
nav_order: 4
---

# Development roadmap

## Refactor Javascript

In light of widespread browser support for ESM, and the [modernisation of Leaflet in version 2.0](https://leafletjs.com/2025/05/18/leaflet-2.0.0-alpha.html), refactoring Spacefinder as an ESM application in vanilla Javascript has become a priority. This also provides a way to load JavaScript which is specific to the data format

### Proposed changes

1. Use a new data format (based on schema.org) for space data
2. Refactor JavaScript to use ESM and Leaflet 2.0 to create the basic map
3. Use ESM plugins for full screen mode and geolocation to replace the current implementation of these features
4. Add the ability to load different datasets (with different schemas) into the application by using a data folder containing:
    - The data for each of the POIs in the dataset
    - Images used in the POIs for each element in the dataset
    - All data format specific JavaScript (building the filters and lists, hooking into geolocation, etc.) using [on demand loading of modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import#importing_on-demand_in_response_to_user_action)

**Revised Deadline: December 2026**

## Redevelop the UI

A redesign of Spacefinder to use the University of Leeds Design System requires redevelopment of the UI collapsible list/map/filters panels of the original application in a more conventional layout. The adoption of this layout puts an additional requirement on the map element to be able to go "fullscreen" to facilitate easier clutter-free navigation on mobile devices. In fullscreen mode, all information needs to be presented as overlays and map controls.

**Deadline: December 2026**

## Release version 1.0

Version 1.0.0 of spacefinder will include additional features

**Deadline: December 2026**

## Improve Accessibility

It is essential to improve the accessibility of the application so that it passes the WCAG 2.2 AA standard. The main development required in this respect is to improve support for screen reading software and improve keyboard navigation.

**Deadline: End August 2022** - _achieved in **Release 0.2.0**

## Use a free mapping provider

The cost of continuing to use Google Maps for the application is uncertain, as this is linked directly with the level of usage of the application. Google Maps was used in the pilot as it is well suited to rapid application development and was the platform of choice in the original application. One alternative which has potential to replace this is [leaflet](https://leafletjs.com/), a leading open-source JavaScript library for mobile-friendly interactive maps, along with [OpenStreetMap](https://www.openstreetmap.org/) as a tile provider.

The use of marker clustering to allow the initial display of the map to be zoomed out to include St. James's and Chapel Allerton campuses is being worked on with leaflet.

**Deadline: End August 2022** - _achieved in **Release 0.2.0**
