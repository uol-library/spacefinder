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
 * Sets the hash in the URL
 */
export function setHash( val ) {
    if ( val !== '' ) {
        window.location.hash = val;
    } else {
        if ( 'pushState' in history ) {
            history.pushState('', document.title, window.location.pathname );
        } else {
            window.location.hash = val;
        }
    }
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
