/**
 * Routing requests
 *
 * Routes are:
 *   (empty)                     the default dataset
 *   <dataset>                   another dataset, e.g. buildings
 *   <dataset>/<slug>            a place, e.g. spaces/1915
 *   page/<page>                 an information page (modal), e.g. page/about
 *
 * These appear in URLs as /spaces/1915 (spacefinder.routing = "history") or
 * /#/spaces/1915 (spacefinder.routing = "hash") - see _data/config.yml.
 *
 * The dataset is set from the URL when this module is loaded, so that the
 * right data is loaded. Changing to a different dataset with the back and
 * forward buttons currently reloads the page.
 */
import { spacefinder } from './config.mjs';
import { getPlaceBySlug, getPlaceNodeById, splog, setElementFocus, getRoute, setRoute, getDataSourceRoute, setDataSourceNames } from './utilities.mjs';
import { openAlertDialog } from './components.mjs';

restoreRoute();
spacefinder.currentDataSource = getRouteDataSource( getRoute() );
setDataSourceNames();

document.addEventListener( 'sfmapready', () => {
    splog( 'Map is ready - load initial page/place' );
    applyRoute();
    window.addEventListener( 'popstate', applyRoute );
});

/**
 * Checks whether a key is a registered dataset
 * @param {string} key
 * @return {boolean}
 */
function isDataSource( key ) {
    return spacefinder.dataSources.some( ds => ds.key === key );
}

/**
 * Gets the dataset for a route (the default dataset for pages and the home page)
 * @param {Array} route
 * @return {string} dataset key
 */
function getRouteDataSource( route ) {
    return ( route.length && isDataSource( route[0] ) ) ? route[0]: spacefinder.defaultDataSource;
}

/**
 * Puts the URL into the current form before anything else uses it:
 * - a path passed on by 404.html (?route=...) when using history routing
 * - hash URLs (#/...) when using history routing, e.g. from old links
 * - #/space/<slug>, used by earlier versions, becomes spaces/<slug>
 */
function restoreRoute() {
    let params = new URLSearchParams( window.location.search );
    let route = null;
    if ( params.has( 'route' ) ) {
        route = params.get( 'route' );
    } else if ( spacefinder.routing === 'history' && window.location.hash.indexOf( '#/' ) === 0 ) {
        route = window.location.hash.slice( 2 );
    }
    if ( route === null && window.location.hash.indexOf( '#/space/' ) === 0 ) {
        route = window.location.hash.slice( 2 );
    }
    if ( route !== null ) {
        route = route.replace( /^space\//, 'spaces/' ).replace( /\/$/, '' );
        splog( 'Restoring route ' + route );
        setRoute( route, true );
    }
}

/**
 * Shows whatever the current URL refers to
 */
function applyRoute() {
    /* the hash can be changed without reloading the page, so old URLs need restoring here too */
    restoreRoute();
    let route = getRoute();
    splog( 'Applying route /' + route.join( '/' ) );

    /* information pages */
    if ( route[0] === 'page' ) {
        document.dispatchEvent( new CustomEvent( 'sfshowpage', { detail: { page: route[1] } } ) );
        return;
    }
    document.dispatchEvent( new Event( 'sfhidepages' ) );

    if ( route.length && ! isDataSource( route[0] ) ) {
        notFound();
        return;
    }

    /* switching datasets isn't possible without a reload yet */
    let dataSource = getRouteDataSource( route );
    if ( dataSource !== spacefinder.currentDataSource ) {
        window.location.reload();
        return;
    }

    if ( route.length > 1 ) {
        let place = getPlaceBySlug( route[1] );
        if ( ! place ) {
            notFound();
            return;
        }
        let placenode = getPlaceNodeById( place.id );
        if ( ! placenode.classList.contains( 'active' ) ) {
            splog( 'Activating place' );
            document.dispatchEvent( new CustomEvent( 'placeSelected', { bubbles: true, detail: { id: place.id, src: 'load' } } ) );
            setElementFocus( 'place' + place.id );
        }
    } else {
        document.dispatchEvent( new CustomEvent( 'placeDeselected', { bubbles: true, detail: false } ) );
    }
}

/**
 * Tells the user that the URL doesn't match anything, and goes to the current dataset
 */
function notFound() {
    splog( 'Route not found' );
    setRoute( getDataSourceRoute( spacefinder.currentDataSource ), true );
    openAlertDialog( 'Not found', 'Sorry, the page or place you were looking for could not be found.' );
}
