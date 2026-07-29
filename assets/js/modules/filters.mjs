/**
 * Functions for the filters panel in the UI
 */
document.addEventListener( 'spacesloaded', () => {
    document.addEventListener( 'filtersloaded', () => {
        renderFilters();
        setupFilters();
    });
    loadFilters();
});

/**
 * Gets the current status of all filters
 * @return {Object} activeFilters
 */
function getFilterStatus() {
    splog( 'getFilterStatus', 'filters.js' );
    const filters = document.querySelectorAll( '#filters input[type=checkbox]' );
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
    let inputvalue = document.getElementById( 'search-input' ).value.trim();
    if ( inputvalue.length > 1 ) {
        activeFilters.push({
            name: 'search',
            value: inputvalue.split( ' ' )
        });
    }
    return activeFilters;
}

/**
 * Loads all filter data from a single JSON file
 */
function loadFilters() {
    splog( 'loadFilters', 'filters.js' );
    getJSON( { key: 'filters', url: spacefinder.filtersurl, callback: data => {
        if ( data.length ) {
            spacefinder.filters = data;
            spacefinder.filtersLoaded = true;
            /* fire the filtersloaded event */
            document.dispatchEvent( new Event( 'filtersloaded' ) );
        }
    } } );
}

/**
 * Builds the filters panel
 */
function renderFilters() {
    splog( 'renderFilters', 'filters.js' );
    if ( spacefinder.filters.length ) {
        let filterForm = document.createElement( 'form' );
        filterForm.setAttribute( 'id', 'filter-options-form' );
        filterForm.setAttribute( 'role', 'search' );
        filterForm.setAttribute( 'aria-label', 'Search and filter spaces' );
        let controlsContainer = document.createElement( 'div' );
        controlsContainer.classList.add( 'top-controls' );
        controlsContainer.innerHTML = '<div><label for="search-input" class="visuallyhidden">Search University spaces</label><input id="search-input" type="search" placeholder="Search"></div><div class="searchbuttons"><button type="reset" id="search-reset" class="btn" disabled>Reset<span class="visuallyhidden"> University spaces search and filters</span></button><button type="submit" id="search-submit" class="btn" aria-controls="searchResultsSummary" disabled>Search<span class="visuallyhidden"> University spaces</span></button></div></div>';
        filterForm.appendChild( controlsContainer );
        let panelContainer = document.createElement( 'div' );
        panelContainer.classList.add( 'panel-content' );
        spacefinder.filters.forEach( filter => {
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
        filterForm.appendChild( panelContainer );
        document.getElementById( 'filters' ).appendChild( filterForm );
        /* fire the filtersloaded event */
        document.dispatchEvent( new Event( 'filtersrendered' ) );
    }
}

/**
 * Set up event listeners on filters
 */
function setupFilters() {
    splog( 'setupFilters', 'filters.js' );
    /* event listener for filter changes */
    document.addEventListener( 'filtersapplied', event => {
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

    /* add radio button behaviour to checkboxes with exclusive attribute */
    const filters = document.querySelectorAll( '#filters input[type=checkbox]' );
    for (const cbx of filters) {
        /* add/remove visible focus styles to list items when a checkbox is focussed */
        cbx.addEventListener( 'focus', eventElement => {
            eventElement.target.closest( 'li' ).classList.add( 'focus' );
            /* make elements scroll into view when focussed */
            eventElement.target.closest( 'li' ).scrollIntoView(false);
        });
        cbx.addEventListener( 'blur', eventElement => {
            document.querySelectorAll( '#filters li' ).forEach( el => el.classList.remove( 'focus' ) );
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
        const filters = document.querySelectorAll( '#filters input[type=checkbox]' );
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
            const checkedfilters = document.querySelectorAll( '#filters input[type=checkbox]:checked' );
            if ( checkedfilters == null ) {
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
        splog( inputvalue, 'filters.js' );
        if ( inputvalue.length > 1 ) {
            document.getElementById( 'search-input' ).value = inputvalue;
            /* trigger the viewfilter event */
            event.target.dispatchEvent( new Event( 'viewfilter', { bubbles: true } ) );
            document.dispatchEvent( new CustomEvent( 'sfanalytics', {
                detail: {
                    type: 'search',
                    terms: inputvalue
                }
            }));

        }
        /* switch to list view on mobile / tablet */
        if ( window.innerWidth < spacefinder.breakpoints.large ) {
            document.getElementById( 'top-bar' ).dispatchEvent( new CustomEvent( 'viewchange', {
                bubbles: true,
                cancelable: true,
                composed: false,
                detail: {
                    view: 'list'
                }
            } ) );
        }
    });
    /* init accordions */
	const accordions = document.querySelectorAll( '.accordion' );
	accordions.forEach( accordionEl => {
		new Accordion( accordionEl );
	});
}

