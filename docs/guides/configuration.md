---
title: Configuration
parent: Guides
nav_order: 1
---

# Configuration

A site that uses the Spacefinder theme sets its options in
`_data/config.yml`. The theme's copy has the defaults. `config.mjs` reads the
file when Jekyll builds the site, and turns it into the `spacefinder` object
that every module uses.

## Map

```yaml
map:
  startLat: 53.806529
  startLng: -1.555291
  startZoom: 16
```

Where the map is centred, and how far it is zoomed in, when the site opens.

## Routing

```yaml
routing: "hash"
```

How the selected dataset, place or page is shown in the URL. Both settings
use the same routes:

| Route | Shows |
|---|---|
| (empty) | the first dataset |
| `trees` | another dataset |
| `cafes/courtyard-coffee` | a place in a dataset |
| `page/about` | an information page |

- **`hash`** (the default) gives URLs like `/#/cafes/courtyard-coffee`. It
  works on any static host with no server set-up.
- **`history`** gives URLs like `/cafes/courtyard-coffee`, using the History
  API. These URLs don't exist as files, so the server has to send
  `index.html` for them. On Apache, put this in an `.htaccess` file in the
  site's root (Jekyll copies it into the build):

  ```apache
  RewriteEngine On
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . index.html [L]
  ```

  On a host that can't do this, such as GitHub Pages, the host sends
  `404.html` instead. It redirects to the site with
  `?route=cafes%2Fcourtyard-coffee`, and the app then restores the URL. The
  theme's `404.html` isn't included in a site that uses the theme with
  `remote_theme`, so copy it into the site.

Hash URLs work in both modes, so links made with `hash` still work after
switching to `history`. Links from the earliest version of the Leeds site,
such as `/#/space/1915`, are turned into `spaces/1915`.

## Datasets

```yaml
datasources:
  - key: "cafes"
    label: "Cafés"
    icon: "icon-coffee"
  - key: "trees"
    label: "Trees"
    icon: "icon-views"
```

The datasets the site can show. The first one is shown when the site opens.
The theme's own `_data/config.yml` lists its example datasets; a site lists
its own.

| Property | Use |
|---|---|
| `key` | the name of the dataset's folder in `assets/data`, and its route |
| `label` | the dataset's name in the interface, e.g. on the dataset switcher |
| `name` | optional; the name used in sentences, such as "List of study spaces". Defaults to the label in lower case. Set it if the label has capitals that should stay. |
| `icon` | the icon class for the dataset |

See [Adding a dataset](adding-a-dataset.html) for what goes in each folder.
