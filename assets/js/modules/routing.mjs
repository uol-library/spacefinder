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
 * /#/spaces/1915 (spacefinder.routing = "hash") - see _data/config.yml. With
 * "none", the route isn't kept in the URL (for an app embedded in another
 * page), but the first route can be given as ?route=spaces/1915.
 *
 * The dataset is set from the URL when this module is loaded, so that the
 * right data is loaded. When the URL changes to another dataset (with the
 * back and forward buttons), it switches to that dataset, and shows the place
 * in the URL once the dataset has loaded.
 */
import { spacefinder } from './config.mjs';
import { getPlaceBySlug, getPlaceNodeById, getLogger, sendEvent, setElementFocus, getRoute, setRoute, getDataSourceRoute, setDataSourceNames } from './utilities.mjs';
import { openAlertDialog, showPage, hidePages } from './components.mjs';
import { switchDataSource, selectPlace, deselectPlaces } from './places.mjs';

const log = getLogger( 'routing' );

restoreRoute();
spacefinder.currentDataSource = getRouteDataSource( getRoute() );
setDataSourceNames();

/* sfdatasourceready is sent each time a dataset has loaded */
document.addEventListener( 'sfdatasourceready', applyRoute );
document.addEventListener( 'sfdatasourceready', () => {
    window.addEventListener( 'popstate', () => {
        sendEvent( 'sfroutechange', { route: getRoute().join( '/' ) } );
        applyRoute();
    });
}, { once: true } );

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
 * - routes starting with a key in spacefinder.routeAliases, which is
 *   replaced by its value (e.g. space/1915 becomes spaces/1915)
 */
function restoreRoute() {
    let params = new URLSearchParams( window.location.search );
    let route = null;
    if ( params.has( 'route' ) ) {
        route = params.get( 'route' );
    } else if ( spacefinder.routing === 'history' && window.location.hash.indexOf( '#/' ) === 0 ) {
        route = window.location.hash.slice( 2 );
    }
    if ( route === null && Object.hasOwn( spacefinder.routeAliases, getRoute()[0] ) ) {
        route = getRoute().join( '/' );
    }
    if ( route !== null ) {
        route = route.replace( /\/$/, '' ).replace( /^[^\/]+/, first => Object.hasOwn( spacefinder.routeAliases, first ) ? spacefinder.routeAliases[ first ]: first );
        log( 'Restoring the route ' + route );
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
    log( 'Applying the route /' + route.join( '/' ) );

    /* information pages */
    if ( route[0] === 'page' ) {
        showPage( route[1] );
        return;
    }
    hidePages();

    if ( route.length && ! isDataSource( route[0] ) ) {
        notFound();
        return;
    }

    /* the rest of the route is applied when the other dataset has loaded (on sfdatasourceready) */
    let dataSource = getRouteDataSource( route );
    if ( dataSource !== spacefinder.currentDataSource ) {
        switchDataSource( dataSource );
        return;
    }
    /* a dataset is still loading: the route is applied when it has loaded */
    if ( ! spacefinder.mapReady ) {
        return;
    }

    if ( route.length > 1 ) {
        let place = getPlaceBySlug( route[1] );
        if ( ! place ) {
            notFound();
            return;
        }
        if ( ! getPlaceNodeById( place.id ).classList.contains( 'active' ) ) {
            selectPlace( place.id, 'route' );
            setElementFocus( 'place' + place.id );
        }
    } else {
        deselectPlaces( false, 'route' );
    }
}

/**
 * Goes to a route, and shows what it refers to (for the API)
 * @param {string} route e.g. trees/copper-beech, or page/about
 */
export function goToRoute( route ) {
    setRoute( route );
    applyRoute();
}

/**
 * Tells the user that the URL doesn't match anything, and goes to the current dataset
 */
function notFound() {
    log.warn( 'Nothing matches the route /' + getRoute().join( '/' ) );
    setRoute( getDataSourceRoute( spacefinder.currentDataSource ), true );
    openAlertDialog( 'Not found', 'Sorry, the page or place you were looking for could not be found.' );
}
