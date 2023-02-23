/**
 * SpaceFinder configuration
 */
const spacefinder = {
    debug: {% if site.environment == "development" %}true{% else %}false{% endif %},
    /**
     * global closure dates - these will affect ALL spaces
     * Dates should be in the format DD-MM-YYYY
     */
    closureDates: [],

    /* CSS breakpoints */
    breakpoints: {
        large: 1000,
        med: 600,
        small: 400
    },

    /**
     * whether the application can use local storage
     * defaults to false here, but can be determined by cookie policy
     * this function should be redefined in cookieconsent-init.js
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

    /* space related config */
    spaces: [],
    spacesLoaded: false,
    spacesurl: '{{ site.url }}{{ site.baseurl }}/spaces.json',
    imageBaseURL: '{{ site.url }}{{ site.baseurl }}',

    /* filter related config */
    filters: [],
    filtersLoaded: false,
    filtersurl: '{{ site.url }}{{ site.baseurl }}/filters.json'
};