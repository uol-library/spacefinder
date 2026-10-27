import { spacefinder } from './config.mjs';

/**
 * Checks to see if localStorage is available
 * 
 * @param {string} type (localStorage or sessionStorage)
 * @returns {boolean}
 */
function storageAvailable( type ) {
    if ( ! spacefinder.canUseLocalStorage() ) {
        return false;
    }
    var storage;
    try {
        storage = window[ type ];
        var x = '__storage_test__';
        storage.setItem( x, x );
        storage.removeItem( x );
        return true;
    }
    catch(e) {
        return e instanceof DOMException && (
            // everything except Firefox
            e.code === 22 ||
            // Firefox
            e.code === 1014 ||
            // test name field too, because code might not be present
            // everything except Firefox
            e.name === 'QuotaExceededError' ||
            // Firefox
            e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
            // acknowledge QuotaExceededError only if there's something already stored
            ( storage && storage.length !== 0 );
    }
}

/**
 * Sets a value in localStorage but adds expiry date
 * 
 * @param {string} key localStorage key
 * @param {string} value to set
 * @param {int} ttl Time to live (in hours)
 */
function setWithExpiry( key, value, ttl ) {
    const now = new Date()
    const item = {
        value: value,
        expiry: now.getTime() + ( ttl * 60 * 60 * 1000 ),
    }
    localStorage.setItem( key, JSON.stringify( item ) )
}

/**
 * Gets a value in localStorage but checks expiry date
 * first. If expired, localStorage key is removed and
 * null returned.
 * 
 * @param {string} key localStorage key
 */
function getWithExpiry( key ) {
    const itemStr = localStorage.getItem( key )
    if ( ! itemStr ) {
        return null;
    }
    const item = JSON.parse( itemStr )
    const now = new Date()
    if ( now.getTime() > item.expiry ) {
        localStorage.removeItem( key )
        return null
    }
    return item.value;
}

/**
 * Uses the haversine formula to calculate the distance between 2 points on a
 * sphere given their longitudes and latitudes
 * 
 * @param {{lat: float, lng: float}} mk1 point one
 * @param {{lat: float, lng: float}} mk2 point 2
 * @returns {Float} distance between mk1 and mk2 in metres
 */
export function haversine_distance( mk1, mk2 ) {
    var R = 6371071; // Radius of the Earth in metres
    var rlat1 = mk1.lat * ( Math.PI / 180 ); // Convert degrees to radians
    var rlat2 = mk2.lat * ( Math.PI / 180 ); // Convert degrees to radians
    var difflat = rlat2 - rlat1; // Radian difference (latitudes)
    var difflon = ( mk2.lng - mk1.lng ) * ( Math.PI / 180 ); // Radian difference (longitudes)
    var d = 2 * R * Math.asin( Math.sqrt( Math.sin( difflat / 2 ) * Math.sin( difflat / 2 ) + Math.cos( rlat1 ) * Math.cos( rlat2 ) * Math.sin( difflon / 2 ) * Math.sin( difflon / 2 ) ) );
    return Math.round( d );
}

/**
 * Gets a JSON data file from a remote URL. Utilises localstorage
 * to cache the results.
 * @param {Object} options Information about the JSON file
 * @param {String} options.key Unique key used to store the data in localstorage (required)
 * @param {String} options.url URL of the JSON file (required)
 * @param {Integer} options.expiry How long to cache the results (in hours) default: 24
 * @param {Function} options.callback callback function with one parameter (JSON parsed response)
 */
export function getJSON( options ) {
    return new Promise( ( resolve, reject ) => {
        if ( ! options.hasOwnProperty( 'key' ) || ! options.hasOwnProperty( 'url' ) ) {
            reject({
                status: 'Missing parameters',
                statusText: 'To fetch a remote JSON file you need to supply a key and a URL in the options parameter'
            });
        }
        if ( ! options.hasOwnProperty( 'expires' ) ) {
            options.expires = 24;
        }
        if ( storageAvailable( 'localStorage' ) && getWithExpiry( options.key ) ) {
            splog( `getting data ${options.key} from local storage` );
            let data = JSON.parse( getWithExpiry( options.key ) );
            if ( options.callback ) {
                options.callback( data );
            }
            resolve( data );
        } else {
            splog( `getting data ${options.key} from ${options.url}` );
            var xhr = new XMLHttpRequest();
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    if ( storageAvailable( 'localStorage' ) ) {
                        var expires = new Date().getTime() + ( options.expires * 60 * 60 * 1000 );
                        splog( `storing data ${options.key} in localstorage - expires ${new Date( expires).toLocaleDateString("en-UK")}` );
                        setWithExpiry( options.key, xhr.responseText, options.expires );
                    }
                    let data = JSON.parse( xhr.responseText );
                    if ( options.callback ) {
                        options.callback( data );
                    }
                    resolve( data );
                } else {
                    reject({
                        status: xhr.status,
                        statusText: xhr.statusText
                    });
                }
            };
            xhr.onerror = () => {
                reject({
                    status: xhr.status,
                    statusText: xhr.statusText
                });
            };
            xhr.open( 'GET', options.url );
            xhr.send();
        }
    });
}

/**
 * Returns a place object given a property and value
 * @param {Object} object with property p and value v
 * @returns {Object} place object
 */
function getPlace( f ) {
    let placeData = spacefinder.data[spacefinder.currentDataSource].places;
    for (let i = 0; i < placeData.length; i++ ) {
        if ( placeData[i][f.p] == f.v ) {
            return placeData[i];
        }
    }
    return false;
}

/**
 * Returns a place object given a valid ID
 * @param {integer} id 
 * @returns {Object} place object
 */
export function getPlaceById( id ) {
    return getPlace( { p: 'id', v: id });
}

/**
 * Returns a place object given a valid slug
 * @param {string} slug 
 * @returns {Object} place object
 */
export function getPlaceBySlug( slug ) {
    return getPlace( { p: 'slug', v: slug } );
}

/**
 * Returns a place DOM node given a valid ID
 * @param {integer} id 
 * @returns {Object} DOM node
 */
export function getPlaceNodeById( id ) {
    return document.querySelector( '[data-id="' + id + '"]' );
}

/**
 * Returns filter data
 * @param {string} filterkey
 * @param {string} optionkey
 * @return {Object} filter option object
 */
export function getFilterData( filterkey, optionkey ) {
    let filterData = spacefinder.data[spacefinder.currentDataSource].filters;
    for (let i = 0; i < filterData.length; i++ ) {
        if ( filterData[i].key == filterkey ) {
            if ( typeof optionkey !== 'undefined' ) {
                for (let j = 0; j < filterData[i].options.length; j++ ) {
                    if ( filterData[i].options[j].key == optionkey ) {
                        return filterData[i].options[j];
                    }
                }
            } else {
                return filterData[i];
            }
        }
    }
    return false;
}

/**
 * Escapes a string for use in HTML text or attribute values
 * @param {string} str
 * @return {string} escaped string
 */
export function escapeHTML( str ) {
    return String( str ).replace( /&/g, '&amp;' ).replace( /</g, '&lt;' ).replace( />/g, '&gt;' ).replace( /"/g, '&quot;' );
}

/**
 * Converts HTML (e.g. text containing entities such as &rsquo;) to plain text
 * @param {string} html
 * @return {string} text
 */
export function decodeHTML( html ) {
    return new DOMParser().parseFromString( html, 'text/html' ).documentElement.textContent;
}

/**
 * Returns a link to Google Maps walking directions to a location
 * @param {number} lat
 * @param {number} lng
 * @return {string} HTML
 */
export function getDirectionsLink( lat, lng ) {
    return '<a target="googlemaps" href="https://www.google.com/maps/dir/?api=1&amp;destination=' + lat + '%2c' + lng + '&amp;travelmode=walking">get directions</a>';
}

/**
 * Creates the list view element for a place. The ids, classes and data
 * attributes used here are relied on by places.mjs, map.mjs and routing.mjs,
 * so data modules should use this rather than building their own.
 * @param {Object} place place data (id, slug, title and sortKey are used)
 * @param {Object} content
 * @param {string} content.classList classes used for filtering
 * @param {string} content.typeLabel type of place shown in the list (HTML)
 * @param {string} content.typeClass used to make the place-type-* class
 * @param {string} content.address address (HTML)
 * @param {string} content.details image, description etc. (HTML)
 * @param {string} content.search optional text to search instead of the place summary
 * @return {Element} HTML element
 */
export function createPlaceElement( place, content ) {
    let container = document.createElement( 'div' );
    container.setAttribute( 'data-id', place.id );
    container.setAttribute( 'id', 'place' + place.id );
    container.setAttribute( 'data-sortalpha', place.sortKey );
    container.setAttribute( 'class', ( 'list-place ' + ( content.classList || '' ) ).trim() );
    if ( content.search ) {
        container.setAttribute( 'data-search', content.search );
    }
    let html = '<div class="place-summary"><h3><button data-slug="' + place.slug + '" class="accordion-trigger place-title load-info" aria-expanded="false" aria-controls="additionalInfo' + place.id + '" data-placeid="' + place.id + '">' + escapeHTML( place.title ) + '</button></h3>';
    html += '<p class="place-info"><span class="place-type place-type-' + content.typeClass.replace( /[^0-9a-zA-Z]/g, '' ).toLowerCase() + '">' + content.typeLabel + '<span class="distance" id="distance' + place.id + '"></span></span>';
    html += '<span class="address">' + ( content.address || '' ) + '</span></p>';
    html += '<div class="place-details">' + ( content.details || '' ) + '</div></div>';
    html += '<div class="additionalInfo" id="additionalInfo' + place.id + '"></div>';
    container.innerHTML = html;
    return container;
}

/**
 * Returns HTML for a place's map infoWindow. The show-list button is used by map.mjs.
 * @param {string} title place title
 * @param {Array} info short facts about the place (HTML), shown comma separated
 * @param {string} description optional description (HTML)
 * @return {string} HTML
 */
export function getInfoWindowHTML( title, info, description ) {
    let content = '<div class="placeInfoWindow"><h3>' + escapeHTML( title ) + '</h3>';
    content += '<p class="info">' + info.filter( Boolean ).join( ', ' ) + '</p>';
    if ( description ) {
        content += '<p class="description">' + description + '</p>';
    }
    content += '<button class="show-list">More info&hellip;</button></div>';
    return content;
}

/**
 * Sets focus on an element
 */
export function setElementFocus( id ) {
    splog( "Setting element focus on #" + id );
	if ( document.getElementById( id ) !== null ) {
		document.getElementById( id ).setAttribute( 'tabindex', '-1' );
		document.getElementById( id ).focus();
	}
}

/**
 * Acticvates / deactivates a panel in the view
 */
export function togglePanel( panel, active ) {
    if ( [ 'filters', 'list', 'map' ].indexOf( panel ) !== -1 ) {
        let activeclass = active ? 'active': 'inactive';
        let inactiveclass = active ? 'inactive': 'active';
        document.querySelector( '#top-bar .navbutton[data-view="' + panel + '"]' ).classList.remove( inactiveclass );
        document.querySelector( '#top-bar .navbutton[data-view="' + panel + '"]' ).classList.add( activeclass );
        document.getElementById( panel ).classList.remove( inactiveclass );
        document.getElementById( panel ).classList.add( activeclass );
    }
}

/**
 * Gets the current route from the URL, e.g. [ 'spaces', '1915' ] from
 * /spaces/1915 (history routing) or /#/spaces/1915 (hash routing)
 * @return {Array} route segments
 */
export function getRoute() {
    let path = '';
    if ( spacefinder.routing === 'history' ) {
        path = window.location.pathname;
        if ( path.indexOf( spacefinder.basePath ) === 0 ) {
            path = path.slice( spacefinder.basePath.length );
        }
    } else {
        path = window.location.hash.replace( /^#\/?/, '' );
    }
    return path.split( '/' ).filter( Boolean ).map( decodeURIComponent );
}

/**
 * Returns the URL for a route
 * @param {string} route e.g. spaces/1915 (empty for the home page)
 * @return {string} URL
 */
export function getRouteURL( route ) {
    if ( spacefinder.routing === 'history' ) {
        return spacefinder.basePath + route;
    }
    return spacefinder.basePath + ( route ? '#/' + route: '' );
}

/**
 * Sets the route in the URL, adding a history entry if it has changed
 * @param {string} route e.g. spaces/1915 (empty for the home page)
 * @param {boolean} replace replace the current history entry rather than adding one
 */
export function setRoute( route, replace ) {
    let url = getRouteURL( route );
    if ( url !== window.location.pathname + window.location.search + window.location.hash ) {
        if ( replace ) {
            history.replaceState( null, '', url );
        } else {
            history.pushState( null, '', url );
        }
    }
}

/**
 * Returns the route for a dataset - the default dataset is the home page
 * @param {string} key dataset key
 * @return {string} route
 */
export function getDataSourceRoute( key ) {
    return key === spacefinder.defaultDataSource ? '': key;
}

/**
 * Logs messages to console if debug flag is set
 * @param {string} message
 */
export function splog( message ) {
    if ( spacefinder.debug ) {
        let now = new Date();
        console.log( now.getHours() + ':' + now.getMinutes().toString().padStart(2, '0') + ':' + now.getSeconds().toString().padStart(2, '0') + '.' + now.getMilliseconds().toString().padStart(3, '0') + ' - ' + message );
    }
}
