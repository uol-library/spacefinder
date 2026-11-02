/**
 * The list of places
 *
 * Loads the current dataset's data.json and module, renders the list view,
 * and handles selecting, searching, filtering and sorting places. The dataset
 * module turns the data into place objects (onloadPlaceData) and supplies
 * the HTML for each place (getPlaceHTML and getAdditionalInfo).
 *
 * switchDataSource changes to another dataset without reloading the page.
 *
 * Sends sfplacesloaded, sfplaceselect, sfplacedeselect, sffilterchange,
 * sfdatasourceunload and sfdatasourcechange (see the Embedding guide in the
 * documentation).
 */
import { spacefinder } from './config.mjs';
import { getLogger, sendEvent, getJSON, getFilterData, getRoute, setRoute, getDataSourceRoute, getPlaceById, getPlaceNodeById, setDataSourceNames } from './utilities.mjs';
import { getFilterStatus } from './filters.mjs';
import { updateDistances } from './map.mjs';

const log = getLogger( 'places' );

/* setup */
document.addEventListener( 'DOMContentLoaded', () => {
    document.addEventListener( 'sfplacesloaded', () => {
        renderList();
        updateDistances();
        activateSort(true, 'alpha');
    });
    /* additional info can use filter data (e.g. labels and icons), so is rendered when the filters have loaded */
    document.addEventListener( 'sffiltersloaded', renderAdditionalInfo );
    loadPlaces();
    document.addEventListener( 'sffilterchange', updateListFilterMessage );
    /* the list can't be scrolled while the panel is closed, so a place selected on the map is scrolled to when it opens */
    document.addEventListener( 'sfpaneltoggle', event => {
        let active = document.querySelector( '.list-place.active' );
        if ( event.detail.open && active ) {
            scrollToPlace( active.getAttribute( 'data-id' ) );
        }
    });
    /* set up click events for places */
    document.addEventListener( 'click', event => {
        /**
         * Event listener to show/hide place detail
         * Added to load-info class which is on place headings
         */
        if ( event.target.classList.contains( 'load-info' ) ) {
            event.preventDefault();
            if ( event.target.getAttribute( 'aria-expanded' ) === 'true' ) {
                deselectPlaces( event.target.getAttribute( 'data-placeid' ) );
                event.target.setAttribute( 'aria-expanded', 'false' );
            } else {
                selectPlace( event.target.getAttribute( 'data-placeid' ), 'list' );
                event.target.setAttribute( 'aria-expanded', 'true' );
            }
        /**
         * These remove search terms or filter terms when one of them is
         * clicked in the filter status message. Maybe need to refactor filter
         * status message and these events to filters.js?
         */
        } else if ( event.target.classList.contains( 'search-term' ) ) {
            event.preventDefault();
            let searchtext = event.target.getAttribute( 'data-searchtext' );
            let searchinput = document.getElementById( 'search-input' ).value.trim();
            let searchterms = searchinput.split( ' ' );
            let newsearchterms = [];
            searchterms.forEach( term => {
                if ( term != searchtext ) {
                    newsearchterms.push( term );
                }
            });
            document.getElementById( 'search-input' ).value = newsearchterms.join(' ');
            applyFilters();
        } else if ( event.target.classList.contains( 'filter-term' ) ) {
            event.preventDefault();
            let termid = event.target.getAttribute( 'data-termid' );
            document.getElementById( termid ).checked = false;
            applyFilters();
        }
    });
});

/**
 * Applies the search and the checked filters to the list of places (the
 * map's markers follow the list), then sends sffilterchange
 */
export function applyFilters() {
    const activeFilters = getFilterStatus();
    document.getElementById( 'listcontainer' ).scrollTop = 0;
    if ( activeFilters.length ) {
        document.querySelectorAll( '.list-place' ).forEach( el => {
            el.classList.remove( 'hidden' );
            let showEl = true;
            let moduleMatch;
            activeFilters.forEach( filtergroup => {
                if ( filtergroup.name == 'search' ) {
                    /* search the place summary (not the hidden additional info), or the module's own search text */
                    let searchText = ( el.getAttribute( 'data-search' ) || el.querySelector( '.place-summary' ).textContent ).toLowerCase();
                    let foundKw = false;
                    filtergroup.value.forEach( term => {
                        if ( searchText.indexOf( term.toLowerCase() ) != -1 ) {
                            foundKw = true;
                        }
                    });
                    if ( ! foundKw ) {
                        showEl = false;
                    }
                } else if ( ( moduleMatch = matchModuleFilter( el, filtergroup ) ) !== undefined ) {
                    /* the dataset module decided whether this place matches */
                    if ( ! moduleMatch ) {
                        showEl = false;
                    }
                } else {
                    let filterdata = getFilterData( filtergroup.name );
                    if ( filterdata.additive ) {
                        // if the filter is additive, only show if all filters are true
                        let miss = false;
                        filtergroup.value.forEach( val => {
                            if ( ! el.classList.contains( filtergroup.name + '_' + val ) ) {
                                miss = true;
                            }
                        });
                        if ( miss === true ) {
                            showEl = false;
                        }
                    } else {
                        // not additive - match any
                        let regex = filtergroup.name+'_('+filtergroup.value.join('|')+')';
                        if ( ! el.className.match(regex) ) {
                            showEl = false;
                        }
                    }
                }
            });
            if ( ! showEl ) {
                el.classList.add('hidden' );
            }
        });
    } else {
        document.querySelectorAll( '.list-place' ).forEach( el => {
            el.classList.remove( 'hidden' );
        });
    }
    deselectPlaces( false );
    const detail = getFilterChangeDetail( activeFilters );
    log( 'Filters applied: ' + detail.shown + ' of ' + detail.total + ' places match', detail );
    sendEvent( 'sffilterchange', detail );
}

/**
 * Gets the active filters and search terms, and the number of places they
 * match, for sffilterchange and the API
 * @param {Array} activeFilters from getFilterStatus()
 * @return {Object} dataSource, filters (filter key: checked option keys), search (terms), shown and total
 */
export function getFilterChangeDetail( activeFilters = getFilterStatus() ) {
    let filters = {};
    let search = [];
    activeFilters.forEach( f => {
        if ( f.name === 'search' ) {
            search = f.value;
        } else {
            filters[ f.name ] = f.value;
        }
    });
    return {
        dataSource: spacefinder.currentDataSource,
        filters: filters,
        search: search,
        shown: document.querySelectorAll( '.list-place:not(.hidden)' ).length,
        total: document.querySelectorAll( '.list-place' ).length
    };
}

/**
 * Asks the dataset module whether a place matches a filter, for filters that
 * can't be matched with CSS classes. A module can export
 * matchFilter( place, key, values, element ), which returns true or false, or
 * undefined to leave the filter to the default class matching.
 * @param {Element} el the place's element in the list
 * @param {Object} filtergroup the filter key (name) and checked option keys (value)
 * @return {boolean|undefined}
 */
function matchModuleFilter( el, filtergroup ) {
    const module = spacefinder.data[spacefinder.currentDataSource].module;
    if ( ! module || typeof module.matchFilter !== 'function' ) {
        return undefined;
    }
    return module.matchFilter( getPlaceById( el.getAttribute( 'data-id' ) ), filtergroup.name, filtergroup.value, el );
}

/**
 * Updates the message above the list of places to show what 
 * search terms and filters are active
 */
function updateListFilterMessage() {
    let activeFilters = getFilterStatus();
    let container = document.getElementById( 'listfilters' );
    /* empty any existing messages and hide */
    container.textContent = '';
    container.setAttribute( 'hidden', '' );
    let searchmessage = '', filtermessage = '', resultsmessage = '';
    if ( activeFilters.length ) {
        /* add search and filter messages - buttons will remove filters/terms */
        activeFilters.forEach( f => {
            if ( f.name == 'search' ) {
                let pl = f.value.length > 1 ? 's': '';
                searchmessage = '<p>Searching places which contain text: ';
                let termlist = [];
                f.value.forEach( term => {
                    termlist.push( '<button class="search-term icon-remove" data-searchtext="' + term + '">' + term + '</button>' );
                });
                searchmessage += termlist.join( ' or ' ) + '</p>';
            } else {
                let filterdata = getFilterData( f.name );
                if ( filterdata.options.length === 1 ) {
                    filtermessage += '<p><button class="filter-term icon-remove" data-termid="' + f.name + '_' + f.value + '">' + filterdata.message + '</button>';
                } else {
                    filtermessage += '<p>' + filterdata.message;
                    let termlist = [];
                    f.value.forEach( term => {
                        let termdata = getFilterData( f.name, term );
                        if ( termdata ) {
                            termlist.push( '<button class="filter-term icon-remove" data-termid="' + f.name + '_' + term + '">' + termdata.label + '</button>' );
                        }
                    });
                    filtermessage += termlist.join( filterdata.additive ? ' and ': ' or ' ) + '</p>';
                }
            }
        });
    }
    /* get count of places */
    let placetotal = document.querySelectorAll( '.list-place' ).length;
    let placesShowing = placetotal;
    /* decrease places count if some are hidden */
    if ( document.querySelectorAll( '.list-place.hidden' ) != null ) {
        placesShowing -= document.querySelectorAll( '.list-place.hidden' ).length;
        /* show zero results message */
        if ( placesShowing == 0 ) {
            resultsmessage = '<p class="noresults">Sorry, your search has found no results - try removing some of your search criteria.</p>';
        }
    }
    /* add filter, search and results messages */
    if ( ( searchmessage + filtermessage + resultsmessage ) != '' ) {
        container.innerHTML = searchmessage + filtermessage + resultsmessage;
        container.removeAttribute( 'hidden' );
    }
    /* update places showing count */
    document.getElementById( 'searchResultsSummary' ).textContent = 'Showing ' + placesShowing + ' of ' + placetotal + ' places';
}

/**
 * Selects a place: shows its details in the list, and sends sfplaceselect,
 * which the map uses to show its popup. Does nothing if the place is already
 * selected.
 * @param {integer|string} placeid ID of place to be selected
 * @param {string} source what selected it: list, map, route or api
 * @return {boolean} whether the place exists
 */
export function selectPlace( placeid, source ) {
    let place = getPlaceById( placeid );
    if ( ! place ) {
        log.warn( 'selectPlace - no place with ID ' + placeid );
        return false;
    }
    let placenode = getPlaceNodeById( place.id );
    if ( placenode.classList.contains( 'active' ) ) {
        return true;
    }
    log( 'Selecting ' + place.title + ' (from ' + source + ')', place );
    showAdditionalInfo( place.id );
    document.querySelectorAll( '.list-place' ).forEach( sp => {
        sp.classList.remove( 'active' );
    });
    placenode.classList.add( 'active' );
    placenode.querySelector( 'button.place-title' ).setAttribute( 'aria-expanded', true );
    scrollToPlace( place.id );
    setRoute( spacefinder.currentDataSource + '/' + place.slug );
    sendEvent( 'sfplaceselect', getPlaceDetail( place, source ) );
    return true;
}

/**
 * Scrolls the list so a place is at the top. This does nothing while the
 * panel is closed, so it is called again when the panel opens.
 * @param {string|number} placeid
 */
export function scrollToPlace( placeid ) {
    let placenode = getPlaceNodeById( placeid );
    if ( ! placenode ) {
        return;
    }
    let scrollingElement = document.getElementById( 'listcontainer' );
    let listContainer = document.getElementById( 'listcontent' );
    let listFilters = document.getElementById( 'listfilters' );
    scrollingElement.scrollTop = ( placenode.offsetTop + listFilters.offsetHeight ) - listContainer.offsetTop;
}

/**
 * Gets the data about a place sent with sfplaceselect and sfplacedeselect
 * @param {Object} place
 * @param {string} source what selected or deselected it
 * @return {Object}
 */
function getPlaceDetail( place, source ) {
    return {
        dataSource: spacefinder.currentDataSource,
        id: place.id,
        slug: place.slug,
        title: place.title,
        source: source
    };
}

/**
 * Deselects the selected place, and sends sfplacedeselect (which closes its
 * popup on the map) if there was one
 * @param {integer|string|boolean} id ID of the place to deselect, or false to
 * deselect any place
 * @param {string} source what deselected it: list, map, route or api
 */
export function deselectPlaces( id = false, source = 'list' ) {
    let active = document.querySelector( '.list-place.active' );
    /* opening a map popup closes the previous one - ignore that if another place is already selected */
    if ( active && id !== false && String( active.getAttribute( 'data-id' ) ) !== String( id ) ) {
        log( 'deselectPlaces - place ' + id + ' is not selected' );
        return;
    }
    let deselected = active ? getPlaceById( active.getAttribute( 'data-id' ) ): false;
    if ( active ) {
        log( 'Deselecting ' + deselected.title + ' (from ' + source + ')' );
        showAdditionalInfo( false );
        document.querySelectorAll( '.list-place' ).forEach( sp => {
            sp.classList.remove( 'active' );
        });
        document.querySelectorAll( 'button.place-title' ).forEach( st => {
            st.setAttribute( 'aria-expanded', false );
        });
    }
    /* if the URL is for the place that was deselected, change it to the dataset - unless another
       place has been selected in the meantime (when going back in history, or switching to another
       dataset, the URL will already have changed) */
    let dataSource = spacefinder.currentDataSource;
    let slug = deselected ? deselected.slug: null;
    if ( deselected ) {
        sendEvent( 'sfplacedeselect', getPlaceDetail( deselected, source ) );
    }
    setTimeout( () => {
        let route = getRoute();
        if ( slug && ! document.querySelector( '.list-place.active' ) && route[0] === dataSource && route[1] === slug ) {
            setRoute( getDataSourceRoute( dataSource ) );
        }
    }, 0 );
}

/**
 * Activates sorting the list of places in the UI.
 * @param {boolean} activate whether to activate of deactivate sorting.
 * @param {string} sorttype either alpha or distance.
 */
export function activateSort( activate, sorttype ) {
    log( 'Sorting by ' + sorttype + ' ' + ( activate? 'enabled': 'disabled' ) );
    const sortbutton = document.getElementById( 'sort' + sorttype );
    if ( ! activate ) {
        sortbutton.disabled = true;
        sortbutton.removeEventListener( 'click', sortPlacesListener );
        if ( 'distance' === sorttype ) {
            sortbutton.setAttribute( 'title', 'Sort by distance (nearest to farthest)' );
            sortbutton.setAttribute( 'aria-label', 'Sort by distance (nearest to farthest)' );
        }
    } else {
        sortbutton.disabled = false;
        sortbutton.addEventListener( 'click', sortPlacesListener );
    }
}
/**
 * Function used as an event listener on the sorting buttons
 * @param {Event} event event from button click
 */
function sortPlacesListener( event ) {
    event.preventDefault();
    /* get all the data we need to perform the sort */
    let sortdir = event.target.getAttribute( 'data-sortdir' );
    let sortby = event.target.getAttribute( 'id' );
    /* determine direction from current attribute value */
    let dir = ( sortdir == 'desc' || sortdir == '' ) ? true: false;
	if ( 'sortalpha' === sortby ) {
		let sortmsg = dir? 'Sort alphabetically (descending, z to a)': 'Sort alphabetically (ascending, a to z)';
		let addbtnclass = dir? 'icon-sort-name-down': 'icon-sort-name-up';
		let delbtnclass = dir? 'icon-sort-name-up': 'icon-sort-name-down';
		event.target.setAttribute( 'title', sortmsg );
		event.target.setAttribute( 'aria-label', sortmsg );
		event.target.classList.remove( delbtnclass );
		event.target.classList.add( addbtnclass );
	} else if ( 'sortdistance' === sortby ) {
		let sortmsg = dir? 'Sort by distance (farthest to nearest)': 'Sort by distance (nearest to farthest)';
		event.target.setAttribute( 'title', sortmsg );
		event.target.setAttribute( 'aria-label', sortmsg );
        let sortAlphaButton = document.getElementById( 'sortalpha' );
		sortAlphaButton.setAttribute( 'title', 'Sort alphabetically (ascending, a to z)' );
		sortAlphaButton.setAttribute( 'aria-label', 'Sort alphabetically (ascending, a to z)' );
		sortAlphaButton.classList.remove( 'icon-sort-name-down' );
		sortAlphaButton.classList.add( 'icon-sort-name-up' );
        sortAlphaButton.setAttribute( 'data-sortdir', 'desc' );
    }
    /* perform the sort */
    sortPlaces( sortby, dir );
}

/**
 * Function to sort places. Sorts using data attributes on 
 * place containers (sortalpha, sortdistance)
 * @param {string} sortby property we are using to sort the list (needs to be part of a data attribute)
 * @param {boolean} dir sort direction (true = asc, false = desc)
 */
export function sortPlaces( sortby, dir ) {
    log( 'Sorting places by ' + sortby.replace( 'sort', '' ) + ( dir ? ' (ascending)': ' (descending)' ) );
    /* first update the sorting buttons */
    document.querySelectorAll( '.sortbutton' ).forEach( el => el.setAttribute( 'data-sortdir', '' ) );
    let dirAttr = dir ? 'asc': 'desc';
    document.getElementById( sortby ).setAttribute( 'data-sortdir', dirAttr );
    /* get all the things we need to perform the sort */
    let listcontainer = document.getElementById( 'listcontent' );
    let listitems = document.querySelectorAll( '#listcontent>div' );
    /* sort the list items */
    let listitemsArray = Array.prototype.slice.call(listitems).sort( comparer( dir, 'data-' + sortby ) );
    /* add back to the DOM */
    listitemsArray.forEach( el => {
        listcontainer.appendChild( el );
    });
    deselectPlaces( false );
}

/**
 * Comparer function
 * @param {boolean} asc ascending or decending sort mode
 * @param {string} attr attribute name for sort key
 * @returns sorting function for Array.sort()
 */
function comparer( asc, attr ) {
    /**
     * the function to perform the comparison
     * @param {(integer|string)} a first value to sort
     * @param {(integer|string)} b second value to sort
     * @returns {integer} -1, 0 or 1
     */
    return function ( a, b ) {
        /**
         * Main comparison function. Uses isNaN to distinguish between
         * numeric and alphabetic sorting modes, and localeCompare() to
         * compare strings. 
         * switches between asc / desc ordering
         * @param {(integer|string)} v1 first value to sort
         * @param {(integer|string)} v2 second value to sort
         */
        let aval = asc ? a.getAttribute( attr ): b.getAttribute( attr );
        let bval = asc ? b.getAttribute( attr ): a.getAttribute( attr );
        return function( v1, v2 ) {
            return v1 !== '' && v2 !== '' && ! isNaN( v1 ) && ! isNaN( v2 ) ? v1 - v2 : v1.toString().localeCompare( v2 );
        }( aval, bval );
    };
};

/**
 * Adds a sort key to each place (from its title) and sorts the places alphabetically
 * @param {Array} places
 */
function sortPlacesByTitle( places ) {
    places.forEach( place => {
        place.sortKey = place.title.replace( /[^0-9a-zA-Z]/g, '' ).toLowerCase();
    });
    places.sort( (a, b) => {
        if ( a.sortKey < b.sortKey ) {
            return -1;
        }
        if ( a.sortKey > b.sortKey ) {
            return 1;
        }
        return 0;
    } );
}

/**
 * Switches to another dataset without reloading the page.
 *
 * Sends sfdatasourceunload (detail: from and to, the dataset keys) so
 * that the filters and the map can remove what they added for the old
 * dataset, then calls the old dataset module's onunloadPlaceData, clears the
 * list and forgets the old dataset. Then it sends sfdatasourcechange (with the
 * same detail) and loads the new dataset, which sends sfplacesloaded,
 * sffiltersloaded and sfdatasourceready as it does when the page loads.
 *
 * The URL isn't changed: set the route first if it should change.
 * @param {string} key dataset key
 * @return {boolean} whether the dataset was switched (false if it is already the current one, or isn't a dataset)
 */
export function switchDataSource( key ) {
    let from = spacefinder.currentDataSource;
    if ( key === from || ! spacefinder.dataSources.some( ds => ds.key === key ) ) {
        return false;
    }
    log( 'Switching dataset from ' + from + ' to ' + key );
    let detail = { from: from, to: key };
    sendEvent( 'sfdatasourceunload', detail );
    let old = spacefinder.data[ from ];
    if ( old && old.module && Object.hasOwn( old.module, 'onunloadPlaceData' ) ) {
        old.module.onunloadPlaceData();
    }
    delete spacefinder.data[ from ];
    document.getElementById( 'listcontent' ).textContent = '';
    document.getElementById( 'listfilters' ).textContent = '';
    document.getElementById( 'listfilters' ).setAttribute( 'hidden', '' );
    resetSort();
    spacefinder.placesLoaded = false;
    spacefinder.filtersLoaded = false;
    spacefinder.mapReady = false;
    spacefinder.currentDataSource = key;
    setDataSourceNames();
    sendEvent( 'sfdatasourcechange', detail );
    loadPlaces();
    return true;
}

/**
 * Puts the sort buttons back as they are when the page loads (places are
 * listed alphabetically when they are loaded)
 */
function resetSort() {
    let sortalpha = document.getElementById( 'sortalpha' );
    sortalpha.setAttribute( 'data-sortdir', 'asc' );
    sortalpha.classList.remove( 'icon-sort-name-up' );
    sortalpha.classList.add( 'icon-sort-name-down' );
    sortalpha.setAttribute( 'title', 'Sort alphabetically (descending, z to a)' );
    sortalpha.setAttribute( 'aria-label', 'Sort alphabetically (descending, z to a)' );
    let sortdistance = document.getElementById( 'sortdistance' );
    sortdistance.setAttribute( 'data-sortdir', '' );
    sortdistance.setAttribute( 'title', 'Sort by distance (nearest to farthest)' );
    sortdistance.setAttribute( 'aria-label', 'Sort by distance (nearest to farthest)' );
}

/**
 * Loads all place data from a single JSON file
 */
function loadPlaces() {
    /* the dataset being loaded - if it changes before loading finishes, the result is ignored */
    const key = spacefinder.currentDataSource;
    if ( Object.hasOwn( spacefinder.data, key ) ) {
        log( 'loadPlaces - ' + key + ' is already loaded' );
        return;
    } else {
        spacefinder.data[key] = { places: [] };
    }
    getJSON( {
        key: key,
        url: spacefinder.dataDir + key + '/data.json'
    } ).then( data => {
        if ( ! data.length ) {
            log.warn( key + '/data.json has no records' );
            return;
        }
        import(spacefinder.dataDir + key + '/' + key + '.mjs')
            .then( module => {
                if ( key !== spacefinder.currentDataSource ) {
                    log( 'loadPlaces - ignoring ' + key + ', as the dataset has changed' );
                    return;
                }
                spacefinder.data[key].module = module;
                spacefinder.data[key].module.onloadPlaceData( data );
                sortPlacesByTitle( spacefinder.data[key].places );
                spacefinder.placesLoaded = true;
                log( 'Loaded ' + spacefinder.data[key].places.length + ' places for ' + key + ' (from ' + data.length + ' records)', spacefinder.data[key].places );
                sendEvent( 'sfplacesloaded', { dataSource: key, count: spacefinder.data[key].places.length } );
            } )
            .catch( error => {
                log.error( 'Error loading or running the module for ' + key, error );
            } );
    } ).catch( error => {
        log.error( 'Error loading ' + key + '/data.json - status: ' + error.status + ', message: ' + error.statusText );
    } );
}

/**
 * Renders list view for places
 */
function renderList() {
    let listContainer = document.getElementById( 'listcontent' );
    let placetotal = spacefinder.data[spacefinder.currentDataSource].places.length;
    spacefinder.data[spacefinder.currentDataSource].places.forEach( place => {
        let placenode = listContainer.appendChild( spacefinder.data[spacefinder.currentDataSource].module.getPlaceHTML( place ) );
        /* additional info is rendered by renderAdditionalInfo, and shown when the place is selected */
        placenode.querySelector( '.additionalInfo' ).hidden = true;
    });
    document.getElementById( 'searchResultsSummary' ).innerHTML = 'Showing ' + placetotal + ' of ' + placetotal + ' places';
    if ( Object.hasOwn( spacefinder.data[spacefinder.currentDataSource].module, 'onrenderPlaceData' ) ) {
        spacefinder.data[spacefinder.currentDataSource].module.onrenderPlaceData();
    }
}

/**
 * Renders additional information for all places (hidden until a place is selected)
 */
function renderAdditionalInfo() {
    spacefinder.data[spacefinder.currentDataSource].places.forEach( place => {
        getPlaceNodeById( place.id ).querySelector( '.additionalInfo' ).innerHTML = spacefinder.data[spacefinder.currentDataSource].module.getAdditionalInfo( place );
    });
}

/**
 * Shows additional information about a place.
 * Additional information is rendered with the list (hidden) - when a place
 * is selected, its additional information is shown and all others are hidden.
 * @param {integer} placeid ID of place, or false to hide all
 */
function showAdditionalInfo( placeid ) {
    document.querySelectorAll( '.additionalInfo' ).forEach( el => {
        el.hidden = true;
    });
    if ( placeid !== false ) {
        getPlaceNodeById( placeid ).querySelector( '.additionalInfo' ).hidden = false;
    }
}

