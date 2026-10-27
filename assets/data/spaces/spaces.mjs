/**
 * Templates used to render spaces in the list.
 *
 * The following functions are defined in this file:
 * 
 * - getPlaceHTML - assembles HTML for the list view (short) and returns a HTML Element
 * - getAdditionalInfo - assembles HTML for expanded view and returns an HTML String (rendered hidden with the list, shown when the place is selected)
 * - getInfoWindowContent - assembles HTML for the map infoWindow and returns an HTML String
 * - onloadPlaceData - called when the data is loaded, can be used to set up any additional data structures or intervals
 * - onrenderPlaceData - called when the data is rendered, can be used to set up any additional data structures or intervals
 * - onunloadPlaceData - called when the data is unloaded, can be used to clear any intervals or event listeners
 * 
 * These are called using the module namespace object, which is added to the spacefinder.data object when this module is loaded.
 * i.e. spacefinder.data.spaces.getPlaceHTML( space ) will call the getPlaceHTML function in this module.
 * 
 * All the above are mandatory for dynamically loaded modules, apart from the onunloadPlaceData function, which is optional.
 */
import { spacefinder } from '../../js/modules/config.mjs';
import { getPlaceNodeById, getFilterData, splog, escapeHTML, getDirectionsLink, createPlaceElement, getInfoWindowHTML } from '../../js/modules/utilities.mjs';
import { getPublishedEntities, getPropertyValue, getFeatureKeys } from '../../js/modules/jsonld.mjs';

export const namespace = 'spaces';

/**
 * Renders list view for a space
 * @param {Object} space
 * @return {Element} HTML element
 */
export function getPlaceHTML( space ) {
    splog( 'getPlaceHTML (spaces module)' );
    let loc = '';
    if ( space.floor !== '' ) {
        loc += '<span class="address-floor">' + escapeHTML( space.floor ) + '</span>, ';
    }
    if ( space.building !== '' ) {
        loc += '<span class="address-building">' + escapeHTML( space.building ) + '</span>, ';
    }
    if ( space.address !== '' ) {
        loc += '<span class="address-location">' + escapeHTML( space.address ) + '</span>';
    }
    let details = '';
    if ( space.images && space.images.length ) {
        details += '<img src="' + space.images[0].url + '" class="place-image" loading="lazy" alt="' + escapeHTML( space.images[0].alt ) + '">';
    }
    details += '<p class="description">' + space.description + '</p>';
    return createPlaceElement( space, {
        classList: getClassList( space ),
        typeLabel: escapeHTML( space.space_type ),
        typeClass: space.space_type,
        address: loc,
        details: details
    } );
}

/**
 * Gets additional information about a space.
 * This is rendered (hidden) with the list, and shown when a space is selected.
 * @param {Object} space space data
 * @return {String} HTML
 */
export function getAdditionalInfo( space ) {
    splog( 'getAdditionalInfo (spaces module)' );
    let spaceHTML = '';
    let spacenode = getPlaceNodeById( space.id );
    spaceHTML += '<section class="section-facts"><h4>Key Facts</h4><ul class="bulleticons"><li class="icon-marker switch-view"><a class="show-map" href="#">Show on map</a></li>';
    let loc = '';
    if ( space.floor !== '' ) {
        loc += space.floor + ', ';
    }
    if ( space.building !== '' ) {
        loc += space.building + ', ';
    }
    if ( space.address !== '' ) {
        loc += space.address;
    }
    loc += ' (' + getDirectionsLink( space.lat, space.lng ) + ')';
    spaceHTML += '<li class="icon-address">' + loc + '</li>';
    if ( space.links && space.links.length ) {
        space.links.forEach( link => {
            spaceHTML += '<li class="' + link.class + '"><a target="placeurl" href="' + link.url + '">' + link.link_text + '</a></li>';
        });
    }
    if ( space.restricted ) {
        spaceHTML += '<li class="icon-public">Open to ' + space.access;
        if ( space.restriction ) {
            spaceHTML += ' (' + space.restriction + ')';
        }
        spaceHTML += '</li>';
    } else {
        spaceHTML += '<li class="icon-public">Open to ' + space.access + '</li>';
    }
    spaceHTML += '</ul></section>';

    spaceHTML += '<section class="section-opening"><h4>Opening Times</h4>';
    spaceHTML += '<p class="icon-time-short" data-openmsg-id="' + space.id + '">' + ( spacenode.getAttribute( 'data-openmsg' ) || '' ) + '</p>';
    spaceHTML += '<ul class="opening-times">';
    [ 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday' ].forEach( (day, idx) => {
        let today = new Date().getDay();
        let todayidx = ( ( idx + 1 ) < 7 ) ? ( idx + 1 ): 0;
        let istodayclass = ( todayidx === today ) ? ' class="today"': '';
        if ( space.opening_hours[day].open ) {
            spaceHTML += '<li' + istodayclass + '><span class="dayname">' + day.charAt(0).toUpperCase() + day.slice(1) + '</span> <span class="opening">' + space.opening_hours[ day ].from + ' - ' + space.opening_hours[ day ].to +'</span></li>';
        } else {
            spaceHTML += '<li' + istodayclass + '><span class="dayname">' + day.charAt(0).toUpperCase() + day.slice(1) + '</span> <span class="opening">Closed</span></li>';
        }
    });
    spaceHTML += '</ul></section>';
    if ( space.contacts && space.contacts.length ) {
        spaceHTML += '<section class="section-contact"><h4>Contact</h4><ul class="bulleticons">';
        space.contacts.forEach( contact => {
            spaceHTML += '<li class="' + contact.class + '"><a href="' + contact.url + '">' + contact.link_text + '</a></li>';
        });
        spaceHTML += '</ul></section>';
    }

    if ( space.facilities.length ) {
        let facilitieslist = '';
        space.facilities.forEach( fac => {
            let filterData = getFilterData( 'facilities', fac );
            if ( filterData ) {
                facilitieslist += '<li class="' + filterData.icon  + '">' + filterData.label + '</li>';
            }
        });
        if ( facilitieslist != '' ) {
            spaceHTML += '<section class="section-facilities"><h4>Facilities Available</h4><ul class="bulleticons">' + facilitieslist + '</ul></section>';
        }
    }
    return spaceHTML;
}

/**
 * Returns HTML for an individual space's infoWindow
 * @param {Object} space
 * @returns {String} HTML content for space infoWindow
 */
export function getInfoWindowContent( space ) {
    let info = [ space.space_type, space.floor, space.building ].map( escapeHTML );
    return getInfoWindowHTML( space.title, info, space.description );
}

/**
 * Gets a list of classes for a space container to facilitate filtering
 * @param {Object} space Space data
 * @return {String} classList Space separated list of classnames
 */
function getClassList( space ) {
    var classList = '';
    if ( space.space_type ) {
        classList += 'place_type_' + space.space_type.replace( /[^0-9a-zA-Z]/g, '' ).toLowerCase() + ' ';
    }
    if ( space.work.length ){
        classList += 'work_' + space.work.join( ' work_' ) + ' ';
    }
    if ( space.facilities.length ){
        classList += 'facilities_' + space.facilities.join( ' facilities_' ) + ' ';
    }
    if ( space.atmosphere.length ){
        classList += 'atmosphere_' + space.atmosphere.join( ' atmosphere_' ) + ' ';
    }
    if ( space.noise ) {
        classList += 'noise_' + space.noise.replace( /\W/g, '' ).toLowerCase();
    }
    return classList;
}

/* amenityFeature keys (alternateName) which are not facilities - these match the keys in filters.json */
const WORK_KEYS = [ 'private', 'close', 'friends', 'group' ];
const ATMOSPHERE_KEYS = [ 'disciplined', 'relaxed', 'historic', 'modern', 'inspiring', 'cosy', 'social', 'friendly' ];
const NOISE_KEYS = [ 'strictlysilent', 'whispers', 'backgroundchatter', 'animateddiscussion', 'musicplaying' ];

/* icon classes for social media contactPoints, by contactType */
const CONTACT_CLASSES = {
    'Follow us on Facebook': 'icon-facebook-squared',
    'Follow us on X (formerly Twitter)': 'icon-x',
    'Follow us on Instagram': 'icon-instagram',
    'Follow us on Bluesky': 'icon-bluesky'
};

/**
 * Formats a tel: URL as a UK phone number, e.g. tel:+441133435260 becomes 0113 343 5260
 * @param {String} tel
 * @return {String}
 */
function formatPhone( tel ) {
    let num = tel.replace( /^tel:/, '' ).replace( /^\+44/, '0' ).replace( /\D/g, '' );
    return num.replace( /^(0\d{3})(\d{3})(\d+)$/, '$1 $2 $3' );
}

/**
 * Converts a JSON-LD space to the data structure used by the templates in this module
 * @param {Object} ld JSON-LD for a space (the mainEntity of its Article)
 * @return {Object} space
 */
function getSpaceFromJSONLD( ld ) {
    let restriction = getPropertyValue( ld.additionalProperty, 'restriction' );
    let space = {
        id: ld.identifier,
        slug: ld.alternateName,
        title: ld.name,
        description: ld.description,
        space_type: ld.additionalType,
        floor: '',
        building: ld.address.streetAddress,
        address: [ ld.address.addressLocality, ld.address.postalCode ].filter( Boolean ).join( ', ' ),
        lat: ld.geo.latitude,
        lng: ld.geo.longitude,
        access: ld.publicAccess ? 'Anyone (public)': 'University Staff and Students',
        restricted: !! restriction,
        restriction: restriction || '',
        images: [],
        links: [],
        contacts: [],
        facilities: [],
        work: [],
        atmosphere: [],
        noise: '',
        opening_hours: {},
        ld: ld
    };
    if ( ld.image && ld.image.contentUrl ) {
        space.images.push( { url: ld.image.contentUrl, alt: ld.image.description } );
    }
    if ( ld.url ) {
        let linkText = ld.url.indexOf( 'mytimetable' ) !== -1 ? 'View timetable for ' + ld.name: 'Visit the ' + ld.name + ' web site';
        space.links.push( { class: 'icon-link', url: ld.url, link_text: linkText } );
    }
    if ( ld.sameAs ) {
        space.links.push( { class: 'icon-uol-logo-mark', url: ld.sameAs, link_text: 'View on the University campus map' } );
    }
    if ( ld.telephone ) {
        space.contacts.push( { class: 'icon-phone', url: ld.telephone, link_text: 'Call us on ' + formatPhone( ld.telephone ) } );
    }
    if ( ld.email ) {
        space.contacts.push( { class: 'icon-email', url: 'mailto:' + ld.email, link_text: 'Email us at ' + ld.email } );
    }
    ( ld.contactPoint || [] ).forEach( cp => {
        space.contacts.push( { class: CONTACT_CLASSES[ cp.contactType ] || 'icon-link', url: cp.url, link_text: cp.contactType } );
    });
    getFeatureKeys( ld ).forEach( key => {
        if ( WORK_KEYS.includes( key ) ) {
            space.work.push( key );
        } else if ( ATMOSPHERE_KEYS.includes( key ) ) {
            space.atmosphere.push( key );
        } else if ( NOISE_KEYS.includes( key ) ) {
            space.noise = ld.amenityFeature.find( f => f.alternateName === key ).name;
        } else {
            space.facilities.push( key );
        }
    });
    [ 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday' ].forEach( day => {
        space.opening_hours[ day ] = { open: false, from: '', to: '' };
    });
    ( ld.openingHoursSpecification || [] ).forEach( spec => {
        let day = spec.dayOfWeek.replace( /^https?:\/\/schema.org\//, '' ).toLowerCase();
        if ( spec.opens && spec.closes ) {
            space.opening_hours[ day ] = { open: true, from: spec.opens.slice( 0, 5 ), to: spec.closes.slice( 0, 5 ) };
        }
    });
    return space;
}

/**
 * Function called when the data is loaded
 * can be used to set up any additional data structures or intervals
 * @param {*} data - JSON-LD data for the spaces
 */
export function onloadPlaceData( data ) {
    splog( 'onloadPlaceData (spaces module)' );
    spacefinder.data[namespace].places = getPublishedEntities( data ).map( getSpaceFromJSONLD );
    spacefinder.data[namespace].getTimeFromString = function( str ) {
        let parts = str.split( ':' );
        return ( parseInt( parts[0] ) * 60 ) + parseInt( parts[1] );
    };
    spacefinder.data[namespace].checkOpeningHours = function() {
        splog( 'checkOpeningHours (spaces module)' );
        if ( ! spacefinder.data[namespace].places.length ) {
            return;
        }
        let today = new Date();
        let daynames = [ 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday' ];
        let todaysday = daynames[ today.getDay() ];
        let timenow = ( today.getHours() * 60 ) + today.getMinutes();
        spacefinder.data[namespace].places.forEach( space => {
            let openmsg = '';
            let openclass = 'currently-closed';
            let currentClass = document.querySelector( '[data-id="' + space.id + '"]' ).getAttribute( 'data-openclass' );
            if ( space.opening_hours ) {
                if ( space.opening_hours[ todaysday ].open ) {
                    let open_from = spacefinder.data[namespace].getTimeFromString( space.opening_hours[ todaysday ].from );
                    let open_to = spacefinder.data[namespace].getTimeFromString( space.opening_hours[ todaysday ].to );
                    if ( open_from > timenow ) {
                        let openingin = '';
                        let openinmins = ( open_from - timenow ) % 60;
                        let openinhrs = Math.floor( ( ( open_from - timenow ) / 60 ) );
                        let pl = '';
                        if ( openinhrs > 0 ) {
                            pl = ( openinhrs == 1 )? '': 's';
                            openingin += openinhrs + 'hr' + pl + ' ';
                        }
                        pl = ( openinmins == 1 ) ? '': 's';
                        if ( openinmins > 0 ) {
                            openingin += openinmins + 'min' + pl;
                        }
                        openmsg = 'Currently closed (opens in ' + openingin + ')';
                        openclass = 'opening-later';
                    } else if ( open_to < ( timenow + 60 ) ) {
                        let closingin = '';
                        let closinginmins = ( open_to - timenow ) % 60;
                        let pl = ( closinginmins == 1 ) ? '': 's';
                        if ( closinginmins > 0 ) {
                            closingin += closinginmins + ' min' + pl;
                        }
                        openmsg = 'Currently open (closes in ' + closingin + ')';
                        openclass = 'open';
                    } else if ( open_to < timenow ) {
                        openclass = 'closed';
                        openmsg = 'Currently closed';
                    } else {
                        openclass = 'open';
                        openmsg = 'Currently open';
                    }
                } else {
                    openmsg = 'Closed all day';
                }
            }
            document.querySelector( '[data-id="' + space.id + '"]' ).setAttribute( 'data-openmsg', openmsg );
            document.querySelector( '[data-id="' + space.id + '"]' ).setAttribute( 'data-openclass', openclass );
            /* change message in any spaces showing additional info */
            if ( document.querySelector( '[data-openmsg-id="' + space.id + '"]' ) != null ) {
                document.querySelector( '[data-openmsg-id="' + space.id + '"]' ).textContent = openmsg;
                document.querySelector( '[data-openmsg-id="' + space.id + '"]' ).classList.remove( currentClass );
                document.querySelector( '[data-openmsg-id="' + space.id + '"]' ).classList.add( openclass );
                
            }
        });
    };
}

/**
 * Function called after the data is rendered
 * Can be used to set up any additional data structures or intervals
 */
export function onrenderPlaceData() {
    splog( 'onrenderPlaceData (spaces module)' );
    spacefinder.data[namespace].checkOpeningHours();
    spacefinder.data[namespace].openingHoursInterval = setInterval( spacefinder.data[namespace].checkOpeningHours, (30*1000) );
}

/**
 * Function called when the data is unloaded
 * Can be used to clear any intervals or event listeners
 */
export function onunloadPlaceData( ) {
    splog( 'onunloadPlaceData (spaces module)' );
    clearInterval( spacefinder.data[namespace].openingHoursInterval );
}



