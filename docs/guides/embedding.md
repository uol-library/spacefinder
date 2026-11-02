---
title: Embedding the app
parent: Guides
nav_order: 3
---

# Embedding the app
{: .no_toc }

Another page can follow what the user does in the app, with its
[events](#events), and control it, with its [API](#the-api). This works on
the app's own page, or with the app in an [iframe](#in-an-iframe) on
another site.

1. TOC
{:toc}

## Events

The app sends these events on `document`. Each is a `CustomEvent`, and its
data is in `event.detail`:

```js
document.addEventListener( 'sfplaceselect', event => {
    console.log( 'Selected ' + event.detail.title + ' from the ' + event.detail.source );
});
```

| Event | When | `detail` |
|---|---|---|
| `sfready` | once, when the first dataset has loaded and the [API](#the-api) can be used | `dataSource` |
| `sfplacesloaded` | a dataset's places have loaded | `dataSource`, `count` |
| `sffiltersloaded` | a dataset's filters have loaded (none if it has no `filters.json`) | `dataSource`, `filters` (their keys) |
| `sfdatasourceready` | a dataset has loaded and its places are on the map | `dataSource`, `count` |
| `sfdatasourceunload` | the app is about to switch to another dataset | `from`, `to` (dataset keys) |
| `sfdatasourcechange` | the app has switched dataset, and is loading the new one | `from`, `to` |
| `sfplaceselect` | a place has been selected | `dataSource`, `id`, `slug`, `title`, `source` |
| `sfplacedeselect` | the selected place has been deselected | `dataSource`, `id`, `slug`, `title`, `source` |
| `sffilterchange` | the search or filters have changed, and been applied | `dataSource`, `filters`, `search`, `shown`, `total` |
| `sfsearch` | the user has submitted a search | `dataSource`, `terms` |
| `sfroutechange` | the route has changed (see [Routing](configuration.html#routing)) | `route`, e.g. `cafes/courtyard-coffee` |
| `sfpaneltoggle` | the panel with the list has opened or closed | `open` |
| `sfpageshow` | an information page has opened | `page`, `title` |
| `sfpagehide` | an information page has closed | `page`, `title` |
| `sfgeostart` | the app has started using the user's location | |
| `sfgeoend` | the app has stopped using the user's location | |
| `sffullscreen` | the map has gone full screen, or back | `fullscreen` |
| `sfresize` | the window has been resized (sent once the resizing stops) | `width`, `height` |

- **`source`** says what selected or deselected the place: `list`, `map`,
  `route` (the URL, or Back and Forward) or `api`.
- **`filters`** in `sffilterchange` has the key of each filter in use, with
  the keys of its checked options, e.g. `{ "facilities": [ "wifi" ] }`.
  `search` is the search terms, `shown` the number of places that match,
  and `total` the number of places in the dataset.
- **When the app switches dataset**, it sends `sfdatasourceunload` and
  `sfdatasourcechange`, then `sfplacesloaded`, `sffiltersloaded` and
  `sfdatasourceready` again, for the new dataset.

All the events' names start with `sf`, and are in lower case. The app's
Google Analytics events (`analytics.mjs`) are made from them.

## The API

The API is `window.spacefinderAPI`. Most of its methods need the dataset to
have loaded, so wait for `spacefinderAPI.ready` (a Promise) or the `sfready`
event first:

```js
spacefinderAPI.ready.then( api => {
    api.setFilters( { facilities: [ 'wifi' ] } );
    api.selectPlace( 'courtyard-coffee' );
});
```

While a dataset is loading, for example just after `switchDataSource`, those
methods return `false`; wait for `sfdatasourceready`.

| Method | Does | Returns |
|---|---|---|
| `getDataSources()` | | the datasets: `key`, `label`, `name`, and `current` (`true` for the one being shown) |
| `getDataSource()` | | the key of the dataset being shown |
| `switchDataSource( key )` | switches to another dataset | whether it switched |
| `getPlaces()` | | the places in the dataset: `id`, `slug`, `title`, `lat`, `lng`, `shown` (whether it matches the filters) and `selected` |
| `getSelectedPlace()` | | the selected place's `id`, `slug` and `title`, or `null` |
| `selectPlace( place )` | selects a place, by its slug or ID, which shows its details and its popup | whether there is such a place |
| `deselectPlace()` | deselects the selected place | |
| `getFilters()` | | the dataset's filters: `key`, `label`, `exclusive`, `additive` and `options` (each with `key` and `label`) |
| `getFilterState()` | | the same as the `detail` of `sffilterchange` |
| `setFilters( filters )` | checks the given filter options, e.g. `{ facilities: [ 'wifi' ] }`, and unchecks the rest. The search stays as it is. | the new filter state |
| `setSearch( text )` | searches the dataset. The filters stay as they are. | the new filter state |
| `clearFilters()` | unchecks all the filters, and clears the search | the new filter state |
| `openPanel()`, `closePanel()` | opens or closes the panel with the list | |
| `isPanelOpen()` | | whether the panel is open |
| `toggleFullscreen()` | switches the map to full screen, or back | |
| `getRoute()` | | the current route, e.g. `cafes/courtyard-coffee` |
| `goTo( route )` | goes to a route: a dataset, a place or a page, e.g. `page/about` | |

The methods do what the user could do, and send the same events. For
example, `selectPlace` sends `sfplaceselect`, with `source: 'api'`, and
changes the route.

Browsers only allow full screen in response to something the user did, such
as a click, so `toggleFullscreen` has to be called from a click handler on
the same page.

The API is also a module, so a script on the app's page can import it:

```js
import { api } from '/assets/js/modules/api.mjs';
```

## In an iframe

A page on another site can show the app in an iframe, and use the same
events and methods with `postMessage`. List the page's origin in the
app's `_data/config.yml`:

```yaml
embed:
  origins:
    - "https://www.example.ac.uk"
```

The app only answers calls from these origins, and only sends its events
to them. `"*"` allows any page, which is safe, as the methods can only do
what a user of the app could do, but any page could then use the app in an
iframe and follow what its users do.

[Routing](configuration.html#routing) set to `"none"` is usually best for an
app in an iframe: otherwise each place selected in the app adds an entry to
the browser's history, so the Back button goes back through the app before
it leaves the page. With `"none"`, the first route can be given in the
iframe's URL, e.g. `?route=cafes/courtyard-coffee`.

### Calling methods

Send a message to the iframe with `app: 'spacefinder'`, `type: 'call'`, the
method's name, its arguments in an array, and an `id` to match the answer
to the call. The answer has the same `id`, and either the method's
`result` or an `error`. Calling `ready` waits until the app's first dataset
has loaded.

```html
<iframe id="spacefinder" src="https://spacefinder.example.ac.uk/" allow="fullscreen geolocation"></iframe>
<script>
const app = document.getElementById( 'spacefinder' );
const origin = 'https://spacefinder.example.ac.uk';
const waiting = {};
let lastId = 0;

/* calls a method of the app's API, and returns a Promise of its result */
function call( method, ...args ) {
    return new Promise( ( resolve, reject ) => {
        const id = ++lastId;
        waiting[ id ] = { resolve, reject };
        app.contentWindow.postMessage( { app: 'spacefinder', type: 'call', id, method, args }, origin );
    });
}

window.addEventListener( 'message', event => {
    if ( event.origin !== origin || ! event.data || event.data.app !== 'spacefinder' ) {
        return;
    }
    const message = event.data;
    if ( message.type === 'result' && waiting[ message.id ] ) {
        if ( message.error ) {
            waiting[ message.id ].reject( new Error( message.error ) );
        } else {
            waiting[ message.id ].resolve( message.result );
        }
        delete waiting[ message.id ];
    } else if ( message.type === 'event' && message.name === 'sfplaceselect' ) {
        console.log( 'Selected ' + message.detail.title );
    }
});

call( 'ready' ).then( () => call( 'selectPlace', 'courtyard-coffee' ) );
</script>
```

### Receiving events

Each of the app's [events](#events) is sent to the page as a message with
`app: 'spacefinder'`, `type: 'event'`, the event's `name` and its `detail`,
as in the example above. Check the message's origin before using it.

The iframe needs `allow="fullscreen"` for the map's full screen button to
work, and `allow="geolocation"` for the app to use the user's location.
