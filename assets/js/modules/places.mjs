
import { spacefinder } from './config.mjs';
import { splog, getJSON, getFilterData, setHash, getPlaceById, getPlaceNodeById } from './utilities.mjs';
import { getFilterStatus } from './filters.mjs';
import { updateDistances } from './map.mjs';

/* setup */
document.addEventListener( 'DOMContentLoaded', () => {
    document.addEventListener( 'placesLoaded', () => {
        renderList();
        updateDistances();
        activateSort(true, 'alpha');
    });
    loadPlaces();
    /* event listener for search + filter changes */
    document.addEventListener( 'viewfilter', applyFilters );
    document.addEventListener( 'filtersapplied', updateListFilterMessage );

    /* event listeners for place selection and deselection */
    document.addEventListener( 'placeSelected', event => { selectPlace( event.detail.id, event.detail.src ) } );
    document.addEventListener( 'placeDeselected', event => { deselectPlaces( event.detail ) }  );
    document.addEventListener( 'placeSelectedOnMap', event => { selectPlace( event.detail.id, 'map' ) } );
    document.addEventListener( 'placeDeselectedFromMap', event => { deselectPlaces( event.detail ) }  );
    /* set up click events for places */
    document.addEventListener( 'click', event => {
        /**
         * Show place on map button (only visible on smaller screens)
         * Changes the view to show the map pane
         */
        if ( event.target.classList.contains( 'show-map' ) ) {
            event.preventDefault();
            document.dispatchEvent( new CustomEvent( 'viewchange', {
                bubbles: true,
                cancelable: true,
                composed: false,
                detail: {
                    view: 'map'
                }
            } ) );
        /**
         * Event listener to show/hide place detail
         * Added to load-info class which is on place headings
         */
        } else if ( event.target.classList.contains( 'load-info' ) ) {
            event.preventDefault();
            if ( event.target.getAttribute( 'aria-expanded' ) === 'true' ) {
                let placeID = event.target.getAttribute( 'data-placeid' );
                document.dispatchEvent( new CustomEvent( 'placeDeselected', { bubbles: true, detail: placeID } ) );
                event.target.setAttribute( 'aria-expanded', 'false' );
                setHash( '' );
            } else {
                let placeID = event.target.getAttribute( 'data-placeid' );
                let placenode = document.querySelector( '[data-id="' + placeID + '"]' );
                if ( ! placenode.classList.contains( 'active' ) ) {
                    document.dispatchEvent( new CustomEvent( 'placeSelected', { bubbles: true, detail: { id: placeID, src: 'list' } } ) );
                }
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
            document.dispatchEvent( new Event( 'viewfilter', { bubbles: true } ) );
        } else if ( event.target.classList.contains( 'filter-term' ) ) {
            event.preventDefault();
            let termid = event.target.getAttribute( 'data-termid' );
            document.getElementById( termid ).checked = false;
            document.dispatchEvent( new Event( 'viewfilter', { bubbles: true } ) );
        }
    });
});

/**
 * Applies filters to the list of places
 */
function applyFilters() {
    splog( 'applyFilters' );
    const activeFilters = getFilterStatus();
    document.getElementById( 'listcontainer' ).scrollTop = 0;
    let searchcondition = '';
    if ( activeFilters.length ) {
        activeFilters.forEach( filtergroup => {
            if ( filtergroup.name !== 'search' ) {
                document.dispatchEvent(new CustomEvent('sffilter', {
                    detail: {
                        type: 'filter',
                        filtername: filtergroup.name,
                        terms: filtergroup.value.join(', ')
                    }
                }));
            }
        });
        document.querySelectorAll( '.list-place' ).forEach( el => {
            el.classList.remove( 'hidden' );
            let showEl = true;
            activeFilters.forEach( filtergroup => {
                if ( filtergroup.name == 'search' ) {
                    let foundKw = false;
                    filtergroup.value.forEach( term => {
                        if ( el.textContent.toLowerCase().indexOf( term.toLowerCase() ) != -1 ) {
                            foundKw = true;
                        }
                    });
                    if ( ! foundKw ) {
                        showEl = false;
                    }
                } else if ( filtergroup.name == 'open' ) {
                    if ( el.getAttribute( 'data-openclass' ) != 'open' ) {
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
    document.dispatchEvent( new CustomEvent( 'placeDeselected', { bubbles: true, detail: false } ) );
    document.dispatchEvent( new Event( 'filtersapplied' ) );
}

/**
 * Updates the message above the list of places to show what 
 * search terms and filters are active
 */
function updateListFilterMessage() {
    splog( 'updateListFilterMessage' );
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
 * Selects a place in the list
 * @param {integer} placeid ID of place to be selected
 * @param {string} source Source of selection (map, list, load)
 */
function selectPlace( placeid, source ) {
    splog( 'selectPlace' );
    let place = getPlaceById( placeid );
    if ( ! place ) {
        splog( 'selectPlace - no place found with ID ' + placeid );
        return;
    }
    document.dispatchEvent(new CustomEvent( 'sfselectitem', {
        detail: {
            id: placeid,
            name: place.title,
            src: source
        }
    }));
    renderAdditionalInfo( place.id );
    let placenode = document.querySelector( '[data-id="' + place.id + '"]' );
    document.querySelectorAll( '.list-place' ).forEach( sp => {
        sp.classList.remove( 'active' );
    });
    placenode.classList.add( 'active' );
    placenode.querySelector( 'button.place-title' ).setAttribute( 'aria-expanded', true );
    /* find distance from top of listcontainer */
    let scrollingElement = document.getElementById( 'listcontainer' );
    let listContainer = document.getElementById( 'listcontent' );
    let listFilters = document.getElementById( 'listfilters' );
    let totop = ( placenode.offsetTop + listFilters.offsetHeight ) - listContainer.offsetTop;
    scrollingElement.scrollTop = totop;
    setHash( '/' + spacefinder.currentDataSource + '/' + place.slug );
}

/**
 * Deselects a place in the list, an optionally scrolls the list to the top
 * and recentres the map.
 * @param {integer} placeid ID of place which has been deselected
 */
function deselectPlaces( placeid ) {
    splog( 'deselectPlaces' );
    if ( document.querySelector( '.list-place.active' ) ) {
        document.querySelectorAll( '.additionalInfo' ).forEach( el => {
            el.textContent = '';
        });
        document.querySelectorAll( '.list-place' ).forEach( sp => {
            sp.classList.remove( 'active' );
        });
        document.querySelectorAll( 'button.place-title' ).forEach( st => {
            st.setAttribute( 'aria-expanded', false );
        });
        let deselectedSpace = document.querySelector( '.place-title[data-placeid="' + parseInt( placeid ) + '"]' );
    }
    setHash( '' );
}

/**
 * Activates sorting the list of places in the UI.
 * @param {boolean} activate whether to activate of deactivate sorting.
 * @param {string} sorttype either alpha or distance.
 */
export function activateSort( activate, sorttype ) {
    splog( 'activateSort - sorting places by ' + sorttype + ' ' + ( activate? 'activated': 'deactivated' ) );
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
    splog( 'sortPlacesListener' );
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
    splog( 'sortPlaces' );
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
    document.dispatchEvent( new Event( 'placeDeselected' ) );
}

/**
 * Comparer function
 * @param {boolean} asc ascending or decending sort mode
 * @param {string} attr attribute name for sort key
 * @returns sorting function for Array.sort()
 */
function comparer( asc, attr ) {
    splog( 'comparer' );
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
 * Loads all place data from a single JSON file
 */
function loadPlaces() {
    splog( 'loadPlaces' );
    if ( Object.hasOwn(spacefinder.data, spacefinder.currentDataSource) ) {
        splog( 'loadPlaces - data already loaded for ' + spacefinder.currentDataSource );
        return;
    } else {
        spacefinder.data[spacefinder.currentDataSource] = { places: [] };
    }
    getJSON( {
        key: spacefinder.currentDataSource,
        url: spacefinder.dataDir + spacefinder.currentDataSource + '/data.json'
    } ).then( data => {
        if ( data.length ) {
            console.log( spacefinder.dataDir + spacefinder.currentDataSource + '/' + spacefinder.currentDataSource + '.mjs' );
            import(spacefinder.dataDir + spacefinder.currentDataSource + '/' + spacefinder.currentDataSource + '.mjs')
                .then( module => {
                    spacefinder.data[spacefinder.currentDataSource].module = module;
                    spacefinder.data[spacefinder.currentDataSource].module.onloadPlaceData( data );
                    spacefinder.placesLoaded = true;
                    /* fire the placesLoaded event */
                    document.getElementById( 'list' ).dispatchEvent( new Event( 'placesLoaded', {
                        bubbles: true,
                        cancelable: true,
                        composed: false,
                    } ) );
               } )
                .catch( error => {
                    console.error( `Error loading module for ${spacefinder.currentDataSource} - status: ${error.status}, message: ${error.statusText}` );
                } );
         }
    } ).catch( error => {
        console.log( error );
        console.error( `Error loading place data - status: ${error.status}, message: ${error.statusText}` );
    } );
}

/**
 * Renders list view for places
 */
function renderList() {
    splog( 'renderList' );
    let listContainer = document.getElementById( 'listcontent' );
    let placetotal = spacefinder.data[spacefinder.currentDataSource].places.length;
    spacefinder.data[spacefinder.currentDataSource].places.forEach( place => {
        listContainer.appendChild( spacefinder.data[spacefinder.currentDataSource].module.getPlaceHTML( place ) );
    });
    document.getElementById( 'searchResultsSummary' ).innerHTML = 'Showing ' + placetotal + ' of ' + placetotal + ' places';
    if ( Object.hasOwn( spacefinder.data[spacefinder.currentDataSource].module, 'onrenderPlaceData' ) ) {
        spacefinder.data[spacefinder.currentDataSource].module.onrenderPlaceData();
    }
}

/**
 * Renders additional information about a place.
 * The main listing only contains a minimal amount of information about places - 
 * when a place is clicked on, this is augmented by additional data.
 * @param {integer} placeid ID of place
 */
function renderAdditionalInfo( placeid ) {
    splog( 'renderAdditionalInfo' );
    /* clear any additional data currently displayed */
    document.querySelectorAll( '.additionalInfo' ).forEach( el => {
        if ( el.replaceChildren ) {
            el.replaceChildren();
        } else {
            el.textContent = '';
        }
    });

    if ( placeid !== false ) {
        /* get place data */
        let place = getPlaceById( placeid );
        let placenode = getPlaceNodeById( placeid );
        placenode.querySelector( '.additionalInfo' ).innerHTML = spacefinder.data[spacefinder.currentDataSource].module.getAdditionalInfo( place );
    }
}

