Spacefinder
===========

This repository contains a version of the UI for the Cambridge Spacefinder application (https://spacefinder.lib.cam.ac.uk/). It has been built to investigate possibilities for development of the application to make it usable in other higher education contexts.

The major change made to the original application (https://github.com/cambridge-collection/spacefinder/) is the decoupling of the application into User Interface and server-side components. Here, the data for all spaces is served as JSON files rather than using a data endpoint driven by a server-side application.

For more information about the project, [please visit the Spacefinder UI wiki](https://github.com/uol-library/spacefinder-ui/wiki/)

Using this repository
---------------------

This repository can be forked or used as a template in GitHub to create a custom wayfinding application. Key files which require customising with your own information are:

* **_config.yml** - the main Jekyll configuration file
* **_includes/pages/** - directory containing your about page, accessibility statement and privacy statement
* **_includes/favicons.html** - site icon collection
* **_includes/top-bar.html** - site logo (inline SVG or images)

Data configuration
------------------

* Data for spaces is kept in JSON files within the `spaces` directory. 
* Spaces are rendered using functions in the file `_includes/javascript/templates.js`
* Filters for spaces are defined in the file `_data/config.yml`

Spaces **must** have the following pieces of metadata defined for them:

* **id** - a unique numerical identifier for each space. This is used in the filename of the JSON file in the `spaces` directory, i.e. a space with the ID of `2` stors its data in the file `spaces/2.json`
* **title** - name of the space
* **slug** - usually the lower case title with all special characters and spaces removed
* **location** - latitude / longitude values in GeoJSON format.
* **description** - Short description of the space
* **opening_hours** - this is a JSON data structure consisting of weekday names as keys, and properties `open` (boolean), `from` (time in HH:MM format) and `to` (time in HH:MM format).

Other metadata fields can be defined in the JSON data, along with filter information for each space (using keys defined in `_data/config.yml`). This data should then be incorporated somehow into the output of the templates in `_includes/javascript/templates.js`.

Icon Font
---------

Spacefinder uses a font to display different icons which can be customised using https://fontello.com.

The fontello configuration is in the file `assets/font/src/config.json` which you can import into fontello if you want to add and remove icons. Once you have finished customising the font, download the package from fontello and replace the content of your `assets/font/src` folder with it. The package contains the font (in five formats) and a CSS file `assets/font/src/css/spacefinder.css` which can be used to replace the icon CSS file in `_sass/spacefinder.scss`. The only change made to this file is applying the global icon style to the `::before` **and** `::after` pseudo-elements which allows for the inclusion of two icons together in parts of the UI.

Changelog
---------

### 0.9 (10/1/2023)

* Initial release of code based on https://github.com/uol-library/spacefinder-ui

