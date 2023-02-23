/**
 * Templates used to render spaces in the list.
 * 
 * Three fundtions should be defined in this file:
 * - getSpaceHTML - assembles HTML for the list view
 * - getAdditionalInfo - assembles HTML for expanded view
 * - getClassList - assembles classnames for each space container to allow filtering
 */

/**
 * Renders list view for a space
 * @param {Object} space
 * @return {Element} HTML element
 */
function getSpaceHTML( space ) {
    spaceContainer = document.createElement('div');
    spaceContainer.setAttribute( 'data-id', space.id );
    spaceContainer.setAttribute( 'id', 'space' + space.id );
    spaceContainer.setAttribute( 'data-sortalpha', space.sortKey );
    spaceContainer.setAttribute( 'class', getClassList( space ) );
    let spaceHTML = '<div class="space-summary"><h3><button data-slug="' + space.slug + '" class="accordion-trigger space-title load-info" aria-expanded="false" aria-controls="additionalInfo' + space.id + '" data-spaceid="' + space.id + '">' + space.title + '</button></h3>';
    spaceHTML += '<p class="space-info"><span class="space-type space-type-' + space.space_type.replace( /[^0-9a-zA-Z]/g, '').toLowerCase() + '">' + space.space_type + '<span class="distance" id="distance' + space.id +'"></span></span>';
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
    spaceHTML += '<div class="space-details">';
    if ( space.image != '' ) {
        spaceHTML += '<img src="' + spacefinder.imageBaseURL + space.image + '" class="space-image" loading="lazy" alt="' + space.imagealt + '">';
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
function getAdditionalInfo( space ) {
    splog( 'getAdditionalInfo', 'templates.js' );
    let spaceHTML = '';
    let spacenode = getSpaceNodeById( space.id );
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
        spaceHTML += '<li class="icon-link"><a target="spaceurl" href="' + space.url + '">' + space.url_text + '</a></li>';
    }
    if ( space.campusmap_url != '' ) {
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
    var classList = 'list-space ';
    if ( space.space_type ) {
        classList += 'space_type_' + space.space_type.replace( /[^0-9a-zA-Z]/g, '' ).toLowerCase() + ' ';
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
