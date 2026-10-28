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
| `buildings` | another dataset |
| `spaces/1915` | a place in a dataset |
| `page/about` | an information page |

- **`hash`** (the default) gives URLs like `/#/spaces/1915`. It works on any
  static host, including GitHub Pages, with no server set-up.
- **`history`** gives URLs like `/spaces/1915`, using the History API. These
  URLs don't exist as files. If someone visits one directly, the host sends
  `404.html`, which redirects to the site with `?route=spaces%2F1915`, and the
  app then restores the URL. To avoid the redirect, the host can send
  `index.html` for these paths instead. On Azure Static Web Apps, add this to
  `staticwebapp.config.json`:

  ```json
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/assets/*", "/*.{json,xml,css,js,mjs,png,jpg,svg,ico,txt}"]
  }
  ```

Links from earlier versions, such as `/#/space/1915`, still work in both
modes.

## Datasets

```yaml
datasources:
  - key: "spaces"
    label: "Study spaces"
    icon: "icon-desk"
  - key: "buildings"
    label: "Buildings"
    icon: "icon-marker"
```

The datasets the site can show. The first one is shown when the site opens.

| Property | Use |
|---|---|
| `key` | the name of the dataset's folder in `assets/data`, and its route |
| `label` | the dataset's name in the interface, e.g. on the dataset switcher |
| `name` | optional; the name used in sentences, such as "List of study spaces". Defaults to the label in lower case. Set it if the label has capitals that should stay. |
| `icon` | the icon class for the dataset |

See [Adding a dataset](adding-a-dataset.html) for what goes in each folder.

## Filters

The `filters` list in `_data/config.yml` is left over from earlier versions.
Each dataset now has its own `filters.json` (see
[Adding a dataset](adding-a-dataset.html#filtersjson)).
