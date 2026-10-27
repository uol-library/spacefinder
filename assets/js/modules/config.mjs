---
---
/**
 * SpaceFinder configuration
 */
export const spacefinder = {
    debug: {% if site.environment == "development" %}true{% else %}false{% endif %},

    /* CSS breakpoints */
    breakpoints: {
        large: 1000,
        med: 600,
        small: 400
    },

    /**
     * whether the application can use local storage
     * defaults to false here, but can be determined by cookie policy
     * this function should be redefined in cookieconsent.mjs
     */
    canUseLocalStorage: function() { return false; },
    
    /* map related config */
    map: null,
    osm: null,
    esri_sat: null,
    currentLoc: {'lat': {{ site.data.config.map.startLat }}, 'lng': {{ site.data.config.map.startLng }} },
    startZoom: {{ site.data.config.map.startZoom }},
    mapBounds: null,
    mapZoom: null,
    mapLoaded: false,
    mapReady: false,
    resizeTimeout: null,

    /* geolocation related config */
    personLoc: {'lat': {{ site.data.config.map.startLat }}, 'lng': {{ site.data.config.map.startLng }} },
    personMarker: null,
    personWatcher: false,
    geoActive: false,
    watchID: false,
    permission: false,

    /* data related config */
    data: {},
    /* datasets, from _data/config.yml - the first is the default */
    dataSources: {{ site.data.config.datasources | jsonify }},
    defaultDataSource: {{ site.data.config.datasources[0].key | jsonify }},
    /* set from the URL by routing.mjs before the data is loaded */
    currentDataSource: {{ site.data.config.datasources[0].key | jsonify }},
    dataDir: '{{ site.url }}{{ site.baseurl }}/assets/data/',
    /* path of the site, which routes (e.g. spaces/1915) are added to */
    basePath: '{{ site.baseurl }}/',
    /* "history" for URLs like /spaces/1915, "hash" for URLs like /#/spaces/1915 */
    routing: {{ site.data.config.routing | default: "hash" | jsonify }},
    spaces: [],
    placesLoaded: false,
    spacesurl: '{{ site.url }}{{ site.baseurl }}/spaces.json',
    imageBaseURL: '{{ site.url }}{{ site.baseurl }}',

    /* filter related config */
    filters: [],
    filtersLoaded: false,
    filtersurl: '{{ site.url }}{{ site.baseurl }}/filters.json'
};