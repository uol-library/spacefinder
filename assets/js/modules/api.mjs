/**
 * The API for pages that embed the app
 *
 * A page can control the app with these methods, which are on
 * window.spacefinderAPI (or can be imported from this module), and follow
 * what the user does with the app's events (see the Embedding guide in the
 * documentation). In an iframe, embed.mjs makes the same methods and events
 * available with postMessage.
 *
 * Most methods need the current dataset to have loaded: wait for
 * spacefinderAPI.ready (a Promise), or the sfready event, before using
 * them. While a dataset is loading (for example after switchDataSource),
 * they return false.
 *
 * Everything the methods return can be copied with structuredClone, so it
 * can be sent with postMessage.
 */
import { spacefinder } from './config.mjs';
import { getLogger, sendEvent, getPlaceById, getPlaceBySlug, getRoute, getDataSourceName } from './utilities.mjs';
import { selectPlace as select, deselectPlaces, getFilterChangeDetail } from './places.mjs';
import { setFilterState } from './filters.mjs';
import { changeDataSource } from './datasources.mjs';
import { openPanel as open, closePanel as close, isPanelOpen as panelOpen } from './layout.mjs';
import { goToRoute } from './routing.mjs';

const log = getLogger( 'api' );

let resolveReady;

/**
 * Checks that the current dataset has loaded
 * @param {string} method the method's name, for the log
 * @return {boolean}
 */
function isReady( method ) {
    if ( ! spacefinder.mapReady ) {
        log.warn( method + ' - the dataset has not loaded yet' );
        return false;
    }
    return true;
}

/**
 * Finds a place in the current dataset by its slug, or its ID
 * @param {string|number} place slug or ID
 * @return {Object|false} place
 */
function findPlace( place ) {
    return getPlaceBySlug( place ) || getPlaceById( place );
}

/**
 * The API's methods (window.spacefinderAPI)
 * @namespace api
 */
export const api = {
    /**
     * Resolves (with the API) when the first dataset has loaded
     * @type {Promise}
     */
    ready: new Promise( resolve => resolveReady = resolve ),

    /**
     * Gets the datasets the site can show
     * @return {Array} objects with key, label, name and current (true for the dataset being shown)
     */
    getDataSources() {
        return spacefinder.dataSources.map( ds => ( {
            key: ds.key,
            label: ds.label,
            name: getDataSourceName( ds.key ),
            current: ds.key === spacefinder.currentDataSource
        } ) );
    },

    /**
     * Gets the key of the dataset being shown
     * @return {string}
     */
    getDataSource() {
        return spacefinder.currentDataSource;
    },

    /**
     * Switches to another dataset. The other methods return false until it
     * has loaded (sfdatasourceready).
     * @param {string} key dataset key
     * @return {boolean} whether it switched (false if it is the current dataset, or isn't one)
     */
    switchDataSource( key ) {
        return changeDataSource( key );
    },

    /**
     * Gets the places in the current dataset
     * @return {Array|false} objects with id, slug, title, lat, lng, shown (whether it matches the filters) and selected
     */
    getPlaces() {
        if ( ! isReady( 'getPlaces' ) ) {
            return false;
        }
        return spacefinder.data[ spacefinder.currentDataSource ].places.map( place => {
            let node = document.getElementById( 'place' + place.id );
            return {
                id: place.id,
                slug: place.slug,
                title: place.title,
                lat: place.lat,
                lng: place.lng,
                shown: node ? ! node.classList.contains( 'hidden' ): false,
                selected: node ? node.classList.contains( 'active' ): false
            };
        });
    },

    /**
     * Gets the selected place
     * @return {Object|null} id, slug and title, or null if no place is selected
     */
    getSelectedPlace() {
        let active = document.querySelector( '.list-place.active' );
        let place = active ? getPlaceById( active.getAttribute( 'data-id' ) ): false;
        return place ? { id: place.id, slug: place.slug, title: place.title }: null;
    },

    /**
     * Selects a place in the current dataset, which shows its details in the
     * list and its popup on the map
     * @param {string|number} place the place's slug or ID
     * @return {boolean} whether there is a place with that slug or ID
     */
    selectPlace( place ) {
        if ( ! isReady( 'selectPlace' ) ) {
            return false;
        }
        let found = findPlace( place );
        if ( ! found ) {
            log.warn( 'selectPlace - there is no place ' + place + ' in ' + spacefinder.currentDataSource );
            return false;
        }
        return select( found.id, 'api' );
    },

    /**
     * Deselects the selected place
     */
    deselectPlace() {
        deselectPlaces( false, 'api' );
    },

    /**
     * Gets the current dataset's filters
     * @return {Array|false} objects with key, label, exclusive, additive and options (each with key and label)
     */
    getFilters() {
        if ( ! isReady( 'getFilters' ) ) {
            return false;
        }
        return spacefinder.data[ spacefinder.currentDataSource ].filters.map( f => ( {
            key: f.key,
            label: f.label,
            exclusive: !! f.exclusive,
            additive: !! f.additive,
            options: f.options.map( o => ( { key: o.key, label: o.label } ) )
        } ) );
    },

    /**
     * Gets the checked filters and the search terms, and how many places match
     * @return {Object|false} the same as the detail of sffilterchange: dataSource, filters, search, shown and total
     */
    getFilterState() {
        if ( ! isReady( 'getFilterState' ) ) {
            return false;
        }
        return getFilterChangeDetail();
    },

    /**
     * Sets which filters are checked (the search is left as it is)
     * @param {Object} filters filter key: array of option keys, e.g. { facilities: [ 'wifi' ] }. Options not given are unchecked.
     * @return {Object|false} the new filter state (see getFilterState)
     */
    setFilters( filters ) {
        if ( ! isReady( 'setFilters' ) || ! setFilterState( filters || {}, null ) ) {
            return false;
        }
        return getFilterChangeDetail();
    },

    /**
     * Searches the current dataset (the filters are left as they are)
     * @param {string} text the search (letters, numbers and spaces; other characters are removed)
     * @return {Object|false} the new filter state (see getFilterState)
     */
    setSearch( text ) {
        if ( ! isReady( 'setSearch' ) || ! setFilterState( null, text || '' ) ) {
            return false;
        }
        return getFilterChangeDetail();
    },

    /**
     * Unchecks all the filters and clears the search
     * @return {Object|false} the new filter state (see getFilterState)
     */
    clearFilters() {
        if ( ! isReady( 'clearFilters' ) || ! setFilterState( {}, '' ) ) {
            return false;
        }
        return getFilterChangeDetail();
    },

    /**
     * Opens the panel with the list and the filters
     */
    openPanel() {
        open();
    },

    /**
     * Closes the panel with the list and the filters
     */
    closePanel() {
        close();
    },

    /**
     * Whether the panel with the list and the filters is open
     * @return {boolean}
     */
    isPanelOpen() {
        return panelOpen();
    },

    /**
     * Switches the map to full screen, or back. Browsers only allow this in
     * response to something the user did, such as a click, in the same
     * window, so it can't be done with postMessage from a page that embeds
     * the app in an iframe (the iframe needs allow="fullscreen" for the
     * app's own full screen button).
     */
    toggleFullscreen() {
        spacefinder.fullscreencontrol.toggleFullScreen();
    },

    /**
     * Gets the current route, e.g. cafes/courtyard-coffee (see routing.mjs)
     * @return {string}
     */
    getRoute() {
        return getRoute().join( '/' );
    },

    /**
     * Goes to a route: a dataset, a place (dataset/slug) or a page (page/name)
     * @param {string} route e.g. trees/copper-beech, or page/about
     */
    goTo( route ) {
        goToRoute( String( route ).replace( /^\/+|\/+$/g, '' ) );
    }
};

window.spacefinderAPI = api;

document.addEventListener( 'sfdatasourceready', () => {
    log( 'The API is ready' );
    resolveReady( api );
    sendEvent( 'sfready', { dataSource: spacefinder.currentDataSource } );
}, { once: true } );
