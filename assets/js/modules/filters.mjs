/**
 * Search and filters
 *
 * The search form is at the top of the panel (in #filters). The filters are
 * in an overlay on the list (#filter-panel), which the Filters button in the
 * list controls opens; the button at the top of the overlay closes it and
 * shows how many places match. The filters are loaded once the places have
 * loaded, and the search form and filters are built again for each dataset.
 */
import { spacefinder } from './config.mjs';
import { splog, getJSON, getDataSourceName } from './utilities.mjs';
import { Accordion } from './components.mjs';

document.addEventListener( 'placesLoaded', loadFilters );
document.addEventListener( 'filtersloaded', () => {
    renderFilters();
    setupFilters();
});
/* the reset and search buttons are enabled while any search or filter is active */
document.addEventListener( 'filtersapplied', () => {
    if ( ! document.getElementById( 'filter-options-form' ) ) {
        return;
    }
    updateFilterCounts();
    const activeFilters = getFilterStatus();
    if ( activeFilters.length ) {
        document.getElementById( 'search-reset' ).removeAttribute( 'disabled' );
        document.getElementById( 'search-submit' ).removeAttribute( 'disabled' );
    } else {
        let inputvalue = document.getElementById( 'search-input' ).value.trim();
        if ( inputvalue.length < 2 ) {
            document.getElementById( 'search-reset' ).setAttribute( 'disabled', '' );
            document.getElementById( 'search-submit' ).setAttribute( 'disabled', '' );
        }
    }
});
/* remove the old dataset's search form and filters when switching to another */
document.addEventListener( 'datasourceunload', () => {
    toggleFilterPanel( false, false );
    [ 'filter-options-form', 'filter-panel' ].forEach( id => {
        let el = document.getElementById( id );
        if ( el ) {
            el.remove();
        }
    });
    document.getElementById( 'filter-toggle' ).hidden = true;
});
document.addEventListener( 'DOMContentLoaded', () => {
    document.getElementById( 'filter-toggle' ).addEventListener( 'click', () => toggleFilterPanel() );
});

/**
 * Gets the current status of all filters
 * @return {Object} activeFilters
 */
export function getFilterStatus() {
    splog( 'getFilterStatus' );
    const filters = document.querySelectorAll( '#filter-panel input[type=checkbox]' );
    const activeFilters = [];
    for (const cbx of filters) {
        if (cbx.checked) {
            const filterName = cbx.getAttribute( 'data-filterkey' );
            const filterValue = cbx.getAttribute( 'data-optionkey' );
            let appended = false;
            if ( activeFilters.length ) {
                for ( let i = 0; i < activeFilters.length; i++ ) {
                    if ( activeFilters[i].name == filterName && activeFilters[i].value.indexOf( filterValue ) == -1 ) {
                        activeFilters[i].value.push( filterValue );
                        appended = true;
                    }
                }
            }
            if ( ! appended ) {
                activeFilters.push({
                    name: filterName,
                    value: [filterValue]
                });
            }
        }
    }
    let searchinput = document.getElementById( 'search-input' );
    let inputvalue = searchinput ? searchinput.value.trim(): '';
    if ( inputvalue.length > 1 ) {
        activeFilters.push({
            name: 'search',
            value: inputvalue.split( ' ' )
        });
    }
    return activeFilters;
}

/**
 * Loads the dataset's filters from filters.json. The file is optional: if it
 * is missing, or the dataset has "filters: false" in the config, the dataset
 * has no filters, and the panel only has the search box.
 */
function loadFilters() {
    splog( 'loadFilters' );
    /* the dataset being loaded - if it changes before loading finishes, the result is ignored */
    const key = spacefinder.currentDataSource;
    const dataSource = spacefinder.dataSources.find( ds => ds.key === key );
    const request = ( dataSource && dataSource.filters === false ) ? Promise.resolve( [] ): getJSON( {
        key: key + '_filters',
        url: spacefinder.dataDir + key + '/filters.json'
    } ).catch( error => {
        if ( error.status !== 404 ) {
            console.error( `Error loading filters for ${key} - status: ${error.status}, message: ${error.statusText}` );
        } else {
            splog( `loadFilters - ${key} has no filters.json` );
        }
        return [];
    } );
    request.then( data => {
        if ( key !== spacefinder.currentDataSource ) {
            splog( 'loadFilters - ignoring ' + key + ', as the dataset has changed' );
            return;
        }
        spacefinder.data[key].filters = Array.isArray( data ) ? data: [];
        spacefinder.filtersLoaded = true;
        /* fire the filtersloaded event */
        document.dispatchEvent( new Event( 'filtersloaded' ) );
    } );
}

/**
 * Builds the search form, and the filters overlay if the dataset has filters
 */
function renderFilters() {
    splog( 'renderFilters' );
    let filters = spacefinder.data[spacefinder.currentDataSource].filters;
    let name = getDataSourceName();
    let filterForm = document.createElement( 'form' );
    filterForm.setAttribute( 'id', 'filter-options-form' );
    filterForm.setAttribute( 'role', 'search' );
    filterForm.setAttribute( 'aria-label', ( filters.length ? 'Search and filter ': 'Search ' ) + name );
    filterForm.innerHTML = '<label for="search-input" class="visuallyhidden">Search ' + name + '</label><input id="search-input" type="search" placeholder="Search"><button type="submit" id="search-submit" class="btn" aria-controls="searchResultsSummary" disabled>Search<span class="visuallyhidden"> ' + name + '</span></button><button type="reset" id="search-reset" class="btn" disabled>Reset<span class="visuallyhidden"> ' + name + ' search and filters</span></button>';
    document.getElementById( 'filters' ).appendChild( filterForm );
    /* a dataset without filters just has the search box */
    if ( filters.length ) {
        let filterPanel = document.createElement( 'div' );
        filterPanel.setAttribute( 'id', 'filter-panel' );
        filterPanel.setAttribute( 'role', 'region' );
        filterPanel.setAttribute( 'aria-label', 'Filter ' + name );
        filterPanel.hidden = true;
        filterPanel.innerHTML = '<div class="top-controls"><button type="button" id="filter-apply" class="btn">Show places</button></div>';
        let panelContainer = document.createElement( 'div' );
        panelContainer.classList.add( 'panel-content' );
        filters.forEach( filter => {
            let fs = document.createElement( 'fieldset' );
            fs.classList.add( 'filter-options' );
            fs.classList.add( filter.key + '-filter-options' );
            let ld = document.createElement( 'legend' );
            let fl = document.createElement( 'ul' );
            fl.setAttribute( 'id', 'filters-' + filter.key );
            if ( filter.options.length === 1 ) {
                ld.classList.add( 'visuallyhidden' );
                ld.appendChild( document.createTextNode( filter.label ) );
            } else {
                fs.classList.add( 'accordion' );
                ld.innerHTML = '<button type="button" class="accordion-trigger" id="trigger-' + filter.key + '" aria-controls="filters-' + filter.key + '" aria-expanded="' + ( filter.open ? 'true': 'false' ) + '" tabindex="0"><span>' + filter.label + '</span></button>';
                fl.classList.add( 'accordion-content' );
                fl.setAttribute( 'aria-hidden', ( filter.open ? 'false': 'true' ) );
                fl.setAttribute( 'aria-labelledby', 'trigger-' + filter.key );
                if ( ! filter.open ) {
                    fl.setAttribute( 'hidden', '' );
                }
            }
            fs.appendChild( ld );
            let filterOptions = '';
            let excl = filter.exclusive ? ' class="exclusive"': '';
            filter.options.forEach( option => {
                filterOptions += '<li class="filter-option ' + filter.key + ' ' + filter.key + '_' + option.key + '" data-id="' + filter.key + '_' + option.key + '">';
                filterOptions += '<input type="checkbox" data-filterkey="' + filter.key + '" data-optionkey="' + option.key + '" id="' + filter.key + '_' + option.key + '" name="' + filter.key + '_' + option.key + '" value="' + filter.key + '_' + option.key + '"' + excl + '>';
                let icon = option.icon ? option.icon: 'icon-tick';
                filterOptions += '<span class="' + icon + '"></span><label for="' + filter.key + '_' + option.key + '">' + option.label + '</label>';
                filterOptions += '</li>';
            });
            fl.innerHTML = filterOptions;
            fs.appendChild( fl );
            panelContainer.appendChild( fs );
        });
        filterPanel.appendChild( panelContainer );
        document.getElementById( 'listbody' ).appendChild( filterPanel );
        document.getElementById( 'filter-toggle' ).hidden = false;
        updateFilterCounts();
    }
    /* fire the filtersrendered event */
    document.dispatchEvent( new Event( 'filtersrendered' ) );
}

/**
 * Opens or closes the filters overlay
 * @param {boolean} open whether to open it (default: open it if it is closed)
 * @param {boolean} focus whether to move the focus into it, or back to the Filters button (default true)
 */
export function toggleFilterPanel( open, focus = true ) {
    let panel = document.getElementById( 'filter-panel' );
    let button = document.getElementById( 'filter-toggle' );
    if ( ! panel ) {
        return;
    }
    if ( typeof open === 'undefined' ) {
        open = panel.hidden;
    }
    panel.hidden = ! open;
    button.setAttribute( 'aria-expanded', open ? 'true': 'false' );
    if ( focus ) {
        ( open ? document.getElementById( 'filter-apply' ): button ).focus();
    }
}

/**
 * Updates the number of active filters on the Filters button, and the number
 * of matching places on the button that closes the filters overlay
 */
function updateFilterCounts() {
    let applyButton = document.getElementById( 'filter-apply' );
    if ( ! applyButton ) {
        return;
    }
    let checked = document.querySelectorAll( '#filter-panel input[type=checkbox]:checked' ).length;
    document.querySelector( '#filter-toggle .filter-count' ).textContent = checked ? ' (' + checked + ')': '';
    let shown = document.querySelectorAll( '#listcontent .list-place:not(.hidden)' ).length;
    applyButton.textContent = 'Show ' + shown + ' ' + ( shown === 1 ? 'place': 'places' );
}

/**
 * Set up event listeners on filters
 */
function setupFilters() {
    splog( 'setupFilters' );
    /* add radio button behaviour to checkboxes with exclusive attribute */
    const filters = document.querySelectorAll( '#filter-panel input[type=checkbox]' );
    for (const cbx of filters) {
        /* add/remove visible focus styles to list items when a checkbox is focussed */
        cbx.addEventListener( 'focus', eventElement => {
            eventElement.target.closest( 'li' ).classList.add( 'focus' );
            /* make elements scroll into view when focussed */
            eventElement.target.closest( 'li' ).scrollIntoView(false);
        });
        cbx.addEventListener( 'blur', eventElement => {
            document.querySelectorAll( '#filter-panel li' ).forEach( el => el.classList.remove( 'focus' ) );
        });

        cbx.addEventListener( 'change', eventElement => {
            const item = eventElement.target;
            if (item.matches( '.exclusive' ) ) {
                const itemStatus = item.checked;
                const sibs = item.closest( 'ul' ).querySelectorAll( 'input[type=checkbox].exclusive' );
                for (const sib of sibs) {
                    sib.checked = false;
                }
                item.checked = itemStatus;
            }
            /* trigger the viewfilter event */
            item.dispatchEvent( new Event( 'viewfilter', { bubbles: true } ) );
        })
    }
    /* reset button */
    document.getElementById( 'search-reset' ).addEventListener( 'click', event => {
        event.preventDefault();
        document.getElementById( 'filter-options-form' ).reset();
        const filters = document.querySelectorAll( '#filter-panel input[type=checkbox]' );
        for (const cbx of filters) {
            cbx.checked = false;
        }
        /* trigger the viewfilter event */
        event.target.dispatchEvent( new Event( 'viewfilter', { bubbles: true }  ) );
    });
    /* search, reset and view results buttons activation */
    document.getElementById( 'search-input' ).addEventListener( 'input', event => {
        let inputvalue = document.getElementById( 'search-input' ).value.trim();
        if ( inputvalue.length > 1 ) {
            document.getElementById( 'search-reset' ).removeAttribute( 'disabled' );
            document.getElementById( 'search-submit' ).removeAttribute( 'disabled' );
        } else {
            const checkedfilters = document.querySelectorAll( '#filter-panel input[type=checkbox]:checked' );
            if ( ! checkedfilters.length ) {
                document.getElementById( 'search-reset' ).setAttribute( 'disabled', '' );
                document.getElementById( 'search-submit' ).setAttribute( 'disabled', '' );
            }
            if ( inputvalue.length == 0 ) {
                /* search has been cleared */
                event.target.dispatchEvent( new Event( 'viewfilter', { bubbles: true } ) );
            }
        }
    });
    /* search action */
    document.getElementById( 'search-submit' ).addEventListener( 'click', event => {
        event.preventDefault();
        let inputvalue = document.getElementById( 'search-input' ).value.replace( /[^a-zA-Z0-9 ]/g, '' ).trim();
        splog( `Search for ${inputvalue}` );
        if ( inputvalue.length > 1 ) {
            document.getElementById( 'search-input' ).value = inputvalue;
            /* trigger the viewfilter event */
            event.target.dispatchEvent( new Event( 'viewfilter', { bubbles: true } ) );
            document.dispatchEvent( new CustomEvent( 'sfsearch', {
                detail: {
                    terms: inputvalue
                }
            }));

        }
    });
    /* the button at the top of the filters overlay, and the Escape key, close it */
    let filterPanel = document.getElementById( 'filter-panel' );
    if ( filterPanel ) {
        document.getElementById( 'filter-apply' ).addEventListener( 'click', () => toggleFilterPanel( false ) );
        filterPanel.addEventListener( 'keydown', event => {
            if ( event.key === 'Escape' ) {
                toggleFilterPanel( false );
            }
        });
    }
    /* init accordions */
	const accordions = document.querySelectorAll( '.accordion' );
	accordions.forEach( accordionEl => {
		new Accordion( accordionEl );
	});
}

