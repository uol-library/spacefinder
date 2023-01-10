/**
 * Minifies javascript using UglifyJS
 */
const fs = require('fs');
const path = require('path');
const UglifyJS = require("uglify-js");
const jsdir = '../_includes/javascript/';
fs.writeFileSync( path.resolve( __dirname, '../assets/scripts/bundle.min.js' ), UglifyJS.minify({
    "utilities.js": fs.readFileSync( path.resolve( __dirname, jsdir, 'utilities.js' ), "utf8" ),
    "layout.js": fs.readFileSync( path.resolve( __dirname, jsdir, 'layout.js' ), "utf8" ),
    "filters.js": fs.readFileSync( path.resolve( __dirname, jsdir, 'filters.js' ), "utf8" ),
    "spaces.js ": fs.readFileSync( path.resolve( __dirname, jsdir, 'spaces.js' ), "utf8" ),
    "map.js": fs.readFileSync( path.resolve( __dirname, jsdir, 'map.js' ), "utf8" ),
    "routing.js": fs.readFileSync( path.resolve( __dirname, jsdir, 'routing.js' ), "utf8" ),
    "analytics.js": fs.readFileSync( path.resolve( __dirname, jsdir, 'analytics.js' ), "utf8" ),
    "accordion.js": fs.readFileSync( path.resolve( __dirname, jsdir, 'components/accordion.js' ), "utf8" ),
    "modal.js": fs.readFileSync( path.resolve( __dirname, jsdir, 'components/modal.js' ), "utf8" )
}, { toplevel: true } ).code, "utf8" );
