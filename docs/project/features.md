---
title: Features
parent: Project
nav_order: 3
---

# Features

## Development goals

* Improve the accessibility of the application UI to bring it in line with current Accessibility best practice. This required fundamental changes to the way the UI operates, for example moving all filtering options into a form (rather than using Javascript) to make them accessible to assistive technologies. It also required a review of the colour contrast of the site and the addition of keyboard navigation support to all interactive elements.
* Remove any reliance on Javascript libraries (e.g. jQuery) and old components (jQuery UI, Infobubble) and replace with ES6 code to bring the code up to date and make it easier to maintain.
* Recreate the application as a static, single-page web application to increase its responsiveness to user interactions and provide instant feedback.
* Add space sorting tools and additional filtering options as well as a text based search.

These goals have been met in the [v0.1.0 release](https://github.com/uol-library/spacefinder/releases/tag/v0.1.0)

## Changes made to the original application

* The major change is the decoupling of the application into user interface and server-side components. Here, the data for all spaces is served as a single JSON file rather than using a data endpoint driven by a server-side application.
* Other parts of the application which were originally driven by AJAX calls (the loading of templates) or static pages (terms & feedback page) have been altered so all application data is preloaded into the UI.
* Data from the original app included some user-generated content and the ability for users to add tags to spaces - this has been removed.

## Impacts of these changes

The main impact is the facilitation of alternative methods to deliver the space data and the UI - this implementation uses Github Pages and Jekyll, and the editing of space data is facilitated using NetlifyCMS with these systems.

* The initial load time for the application has been decreased - the payload in the Leeds version is roughly 30% of that in the original. This is down to code optimisations, lazy loading images, and the removal of Javascript libraries.
* Rather than loading 35 spaces at a time, data for all spaces is loaded, which makes the map look much busier than it does in the live application.
* Searching/filtering has been decoupled from the server - all this now takes place in the browser which makes the UI more responsive.

_Netlify CMS was later dropped, as hardly anyone used it. Data is now edited directly as JSON-LD files (see [Data models](../data-models/))._

## Additional Features

* The main purpose of this repository is to develop the UI of the application to make it accessible. List views, single space views and filtering controls have been changed enable this (maps are considered to be exempt). Colour contrast has been improved, and conformance with WAI-ARIA added.
* The ability to sort spaces alphabetically or by distance from the user (if geolocation services are enabled) has been added.
* If geolocation services are enabled, the position of a user is updated as they move, and if spaces have been sorted by distance their order is updated as the user moves
* The ability to search spaces by keyword, filter spaces to show only those currently open, and filter spaces by type has been added.
* User feedback in the list view to show which search terms or filters are used, and allow them to be removed, has been added.
* Some additional icons have been added to the custom font using [fontello](https://fontello.com/) (fontello configuration files have been added to the repository to facilitate further updates in future).
