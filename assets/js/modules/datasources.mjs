/**
 * The dataset switcher
 *
 * When the site has more than one dataset, adds a link to each one at the
 * top of the filters panel. Each link goes to the dataset's route, so it can
 * be opened in a new tab; clicking it switches to the dataset without
 * reloading the page. The current dataset's link has aria-current="page".
 */
import { spacefinder } from './config.mjs';
import { splog, escapeHTML, getRouteURL, getDataSourceRoute, setRoute } from './utilities.mjs';
import { switchDataSource } from './places.mjs';

document.addEventListener( 'DOMContentLoaded', renderDataSourceSwitcher );
document.addEventListener( 'datasourcechange', updateDataSourceSwitcher );

/**
 * Adds the dataset links to the filters panel
 */
function renderDataSourceSwitcher() {
    if ( spacefinder.dataSources.length < 2 ) {
        return;
    }
    splog( 'renderDataSourceSwitcher' );
    let nav = document.createElement( 'nav' );
    nav.setAttribute( 'id', 'datasources' );
    nav.setAttribute( 'aria-label', 'Datasets' );
    let links = '';
    spacefinder.dataSources.forEach( ds => {
        let icon = ds.icon ? ' class="' + escapeHTML( ds.icon ) + '"': '';
        links += '<li><a href="' + getRouteURL( getDataSourceRoute( ds.key ) ) + '" data-datasource="' + escapeHTML( ds.key ) + '"' + icon + '>' + escapeHTML( ds.label ) + '</a></li>';
    });
    nav.innerHTML = '<ul>' + links + '</ul>';
    nav.addEventListener( 'click', onDataSourceClick );
    /* the filters form is added after this, when the filters have loaded */
    document.getElementById( 'filters' ).appendChild( nav );
    updateDataSourceSwitcher();
}

/**
 * Switches dataset when one of the links is clicked (unless it is being
 * opened in a new tab or window)
 * @param {MouseEvent} event
 */
function onDataSourceClick( event ) {
    let link = event.target.closest( 'a[data-datasource]' );
    if ( ! link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey ) {
        return;
    }
    event.preventDefault();
    let key = link.getAttribute( 'data-datasource' );
    if ( key !== spacefinder.currentDataSource ) {
        setRoute( getDataSourceRoute( key ) );
        switchDataSource( key );
    }
    /* show the list on smaller screens, where the filters panel takes up the whole view */
    if ( window.innerWidth < spacefinder.breakpoints.large ) {
        document.dispatchEvent( new CustomEvent( 'viewchange', {
            bubbles: true,
            cancelable: true,
            composed: false,
            detail: {
                view: 'list'
            }
        } ) );
    }
}

/**
 * Marks the current dataset's link
 */
function updateDataSourceSwitcher() {
    document.querySelectorAll( '#datasources a' ).forEach( link => {
        if ( link.getAttribute( 'data-datasource' ) === spacefinder.currentDataSource ) {
            link.setAttribute( 'aria-current', 'page' );
        } else {
            link.removeAttribute( 'aria-current' );
        }
    });
}
