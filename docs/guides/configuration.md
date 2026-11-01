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
switching to `history`.

## Route aliases

```yaml
routeAliases:
  space: spaces
```

Optional. Keeps old links working after a dataset's key changes: a route
whose first part is a key here has it replaced by the value. With the
example above, `/#/space/1915` (from an earlier version of the Leeds site)
becomes `spaces/1915`.

## Data directory

```yaml
dataDir: "examples/"
```

Optional. The folder the datasets are in, from the site root and ending with
`/`. The default is `assets/data/`, which is where a site's datasets should
go. The theme sets it to `examples/` for its example datasets: Jekyll copies
everything in a theme's `assets` folder into the site, so examples in
`assets/data` would be published on every site that uses the theme.

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
When there is more than one, a switcher appears at the top of the panel
(links for two datasets, a dropdown for more), and choosing one switches
dataset without reloading the page.
The theme's own `_data/config.yml` lists its example datasets; a site lists
its own.

| Property | Use |
|---|---|
| `key` | the name of the dataset's folder in the [data directory](#data-directory), and its route |
| `label` | the dataset's name in the interface, e.g. on the dataset switcher |
| `name` | optional; the name used in sentences, such as "List of study spaces". Defaults to the label in lower case. Set it if the label has capitals that should stay. |
| `icon` | the icon class for the dataset |
| `filters` | optional; `false` if the dataset has no filters, so the app doesn't request its `filters.json` |

See [Adding a dataset](adding-a-dataset.html) for what goes in each folder.

## Top bar

The top bar has the Spacefinder logo at one end and the site's logo at the
other. This setting goes in the site's `_config.yml`, not
`_data/config.yml`:

```yaml
site_logo_position: "left"
```

`right` (the default) puts the site's logo on the right, and `left` puts it
on the left, with the Spacefinder logo on the right. The logos are in
`_includes/site-logo.html` and `_includes/spacefinder-logo.html`. The theme's
site logo is a placeholder, so put your own in `_includes/site-logo.html` in
your site, keeping the `<li class="site-logo">` around it.
