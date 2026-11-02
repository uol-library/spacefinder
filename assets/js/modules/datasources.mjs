/**
 * The dataset switcher
 *
 * When the site has more than one dataset, adds a switcher at the top of the
 * panel. With two datasets it is a link to each one, which goes to the
 * dataset's route, so it can be opened in a new tab; clicking it switches to
 * the dataset without reloading the page. The current dataset's link has
 * aria-current="page". With more than two, it is a dropdown.
 */
import { spacefinder } from './config.mjs';
import { escapeHTML, getRouteURL, getDataSourceRoute, setRoute } from './utilities.mjs';
import { switchDataSource } from './places.mjs';

document.addEventListener( 'DOMContentLoaded', renderDataSourceSwitcher );
document.addEventListener( 'sfdatasourcechange', updateDataSourceSwitcher );

/**
 * Adds the dataset links (or dropdown) to the top of the panel
 */
function renderDataSourceSwitcher() {
    if ( spacefinder.dataSources.length < 2 ) {
        return;
    }
    let nav = document.createElement( 'nav' );
    nav.setAttribute( 'id', 'datasources' );
    nav.setAttribute( 'aria-label', 'Datasets' );
    if ( spacefinder.dataSources.length > 2 ) {
        let options = '';
        spacefinder.dataSources.forEach( ds => {
            options += '<option value="' + escapeHTML( ds.key ) + '">' + escapeHTML( ds.label ) + '</option>';
        });
        nav.innerHTML = '<label for="datasource-select" class="visuallyhidden">Dataset</label><select id="datasource-select">' + options + '</select>';
        nav.querySelector( 'select' ).addEventListener( 'change', event => changeDataSource( event.target.value ) );
    } else {
        let links = '';
        spacefinder.dataSources.forEach( ds => {
            let icon = ds.icon ? ' class="' + escapeHTML( ds.icon ) + '"': '';
            links += '<li><a href="' + getRouteURL( getDataSourceRoute( ds.key ) ) + '" data-datasource="' + escapeHTML( ds.key ) + '"' + icon + '>' + escapeHTML( ds.label ) + '</a></li>';
        });
        nav.innerHTML = '<ul>' + links + '</ul>';
        nav.addEventListener( 'click', onDataSourceClick );
    }
    /* the search form is added after this, when the filters have loaded */
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
    changeDataSource( link.getAttribute( 'data-datasource' ) );
}

/**
 * Switches to a dataset and changes the URL to its route
 * @param {String} key
 * @return {boolean} whether the dataset was switched (false if it is the current one, or isn't a dataset)
 */
export function changeDataSource( key ) {
    if ( key === spacefinder.currentDataSource || ! spacefinder.dataSources.some( ds => ds.key === key ) ) {
        return false;
    }
    setRoute( getDataSourceRoute( key ) );
    return switchDataSource( key );
}

/**
 * Marks the current dataset's link, or selects it in the dropdown
 */
function updateDataSourceSwitcher() {
    let select = document.getElementById( 'datasource-select' );
    if ( select ) {
        select.value = spacefinder.currentDataSource;
    }
    document.querySelectorAll( '#datasources a' ).forEach( link => {
        if ( link.getAttribute( 'data-datasource' ) === spacefinder.currentDataSource ) {
            link.setAttribute( 'aria-current', 'page' );
        } else {
            link.removeAttribute( 'aria-current' );
        }
    });
}
