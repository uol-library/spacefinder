---
title: API
nav_order: 5
has_children: true
permalink: /api/
---

# API

The core JavaScript modules in `assets/js/modules`. These pages are generated
from the JSDoc comments in the code, so edit the comments rather than these
pages, then run `npm run docs` to update them.

Dataset modules can import the functions in
[utilities.mjs](utilities.html) and [jsonld.mjs](jsonld.html). See
[Adding a dataset](../guides/adding-a-dataset.html) for the functions a
dataset module has to export.

`config.mjs` isn't included, because it contains Liquid which JSDoc can't
read. It sets up the `spacefinder` object from `_data/config.yml` (see
[Configuration](../guides/configuration.html)).
