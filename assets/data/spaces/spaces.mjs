/**
 * Templates used to render spaces in the list.
 *
 * The following functions can be defined in this file:
 * - getPlaceHTML (mandatory) - assembles HTML for the list view (short) and returns a HTML Element
 * - getAdditionalInfo - assembles HTML for expanded view and returns an HTML String
 * - onloadPlaceData - called when the data is loaded, can be used to set up any additional data structures or intervals
 * - onrenderPlaceData - called when the data is rendered, can be used to set up any additional data structures or intervals
 * - onunloadPlaceData - called when the data is unloaded, can be used to clear any intervals or event listeners
 */
import { spacefinder } from '../../js/modules/config.mjs';
import { getPlaceNodeById, getFilterData, splog } from '../../js/modules/utilities.mjs';

const namespace = 'spaces';

/**
 * Renders list view for a space
 * @param {Object} space
 * @return {Element} HTML element
 */
export function getPlaceHTML( space ) {
    splog( 'getPlaceHTML (spaces module)' );
    let spaceContainer = document.createElement('div');
    spaceContainer.setAttribute( 'data-id', space.id );
    spaceContainer.setAttribute( 'id', 'place' + space.id );
    spaceContainer.setAttribute( 'data-sortalpha', space.sortKey );
    spaceContainer.setAttribute( 'class', getClassList( space ) );
    let spaceHTML = '<div class="place-summary"><h3><button data-slug="' + space.slug + '" class="accordion-trigger place-title load-info" aria-expanded="false" aria-controls="additionalInfo' + space.id + '" data-placeid="' + space.id + '">' + space.title + '</button></h3>';
    spaceHTML += '<p class="place-info"><span class="place-type place-type-' + space.space_type.replace( /[^0-9a-zA-Z]/g, '').toLowerCase() + '">' + space.space_type + '<span class="distance" id="distance' + space.id +'"></span></span>';
    spaceHTML += '';
    let loc = '';
    if ( space.floor !== '' ) {
        loc += '<span class="address-floor">' + space.floor + '</span>, ';
    }
    if ( space.building !== '' ) {
        loc += '<span class="address-building">' + space.building + '</span>, ';
    }
    if ( space.address !== '' ) {
        loc += '<span class="address-location">' + space.address + '</span>';
    }
    spaceHTML += '<span class="address">' + loc + '</span></p>';
    spaceHTML += '<div class="place-details">';
    if ( space.image != '' ) {
        spaceHTML += '<img src="' + spacefinder.dataDir + 'spaces/images/' + space.image + '" class="place-image" loading="lazy" alt="' + space.imagealt + '">';
    }
    spaceHTML += '<p class="description">' + space.description + '</p></div></div>';
    spaceHTML += '<div class="additionalInfo" id="additionalInfo' + space.id + '"></div>';
    spaceHTML += '</div>';
    spaceContainer.innerHTML = spaceHTML;
    return spaceContainer;
}

/**
 * Gets additional information about a space.
 * The main listing only contains a minimal amount of information about spaces - 
 * when a space is clicked on, this is augmented by additional data.
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
    loc += ' (<a target="googlemaps" href="https://www.google.com/maps/dir/?api=1&amp;destination=' + space.lat + '%2c' + space.lng + '&amp;travelmode=walking">get directions</a>)';
    spaceHTML += '<li class="icon-address">' + loc + '</li>';
    if ( space.url !== "" && space.url_text !== '' ) {
        spaceHTML += '<li class="icon-link"><a target="placeurl" href="' + space.url + '">' + space.url_text + '</a></li>';
    }
    if ( space.campusmap_url !== undefined && space.campusmap_url !== '') {
        let campusmap_ref = space.campusmap_ref !== '' ? ' (map reference ' + space.campusmap_ref + ')': '';
        spaceHTML += '<li class="icon-uol-logo-mark"><a target="campusmap" href="' + space.campusmap_url + '">View on the University campus map</a>' + campusmap_ref + '<li>';
    }
    if ( space.restricted ) {
        spaceHTML += '<li class="icon-public">Open to ' + space.access;
        if ( space.restriction ) {
            spaceHTML += ' (' + space.restriction + ')';
        }
        spaceHTML += '</li>';
    } else {
        spaceHTML += '<li class="icon-public">Open to ' + space.access + '<li>';
    }
    spaceHTML += '</ul></section>';

    spaceHTML += '<section class="section-opening"><h4>Opening Times</h4>';
    spaceHTML += '<p class="icon-time-short" data-openmsg-id="' + space.id + '">' + spacenode.getAttribute( 'data-openmsg' ) + '</p>';
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
    if ( space.phone_number !== '' || space.twitter_screen_name !== '' || space.facebook_url !== '' ) {
        spaceHTML += '<section class="section-contact"><h4>Contact</h4><ul class="bulleticons">';
        if ( space.phone_number !== '' ) {
            let phoneattr = space.phone_number.replace( /[^0-9]+/g, '' ).replace( /^0/, '+44' );
            spaceHTML += '<li class="icon-phone"><a href="tel:' + phoneattr + '">' +space.phone_text + ' on ' + space.phone_number + '</a></li>';
        }
        if ( space.twitter_screen_name !== '' ) {
            spaceHTML += '<li class="icon-twitter"><a href="https://twitter.com/' + space.twitter_screen_name + '">Follow ' + space.twitter_screen_name + ' on twitter</a></li>';
        }
        if ( space.facebook_url !== '' ) {
            let facebookName = space.facebook_url.replace( 'https://www.facebook.com/', '' );
            spaceHTML += '<li class="icon-facebook-squared"><a href="' + space.facebook_url + '">Follow ' + facebookName + ' on facebook</a></li>';
        }
        spaceHTML += '</ul></section>'
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
 * Gets a list of classes for a space container to facilitate filtering
 * @param {Object} space Space data
 * @return {String} classList Space separated list of classnames
 */
function getClassList( space ) {
    var classList = 'list-place ';
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

/**
 * Function called when the data is loaded
 * can be used to set up any additional data structures or intervals
 * @param {*} data - JSON data for the spaces
 */
export function onloadPlaceData( data ) {
    splog( 'onloadPlaceData (spaces module)' );
    spacefinder.data[namespace].places = [];
    data.forEach( (place, index) => {
        spacefinder.data[namespace].places[index] = place;
        spacefinder.data[namespace].places[index].sortKey = place.title.replace( /[^0-9a-zA-Z]/g, '' ).toLowerCase();
    });
    spacefinder.data[namespace].places.sort( (a, b) => {
        if ( a.sortKey < b.sortKey ) {
            return -1;
        }
        if ( a.sortKey > b.sortKey ) {
            return 1;
        }
        return 0;
    } );
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


