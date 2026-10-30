/**
 * Example dataset: cafés.
 *
 * Shows how a dataset module renders schema.org JSON-LD places, with
 * filters made from amenityFeature and opening hours from
 * openingHoursSpecification. The cafés are made up. See the "Adding a
 * dataset" guide in the documentation for what each function does.
 */
import { spacefinder } from '../../js/modules/config.mjs';
import { splog, escapeHTML as esc, getDirectionsLink, createPlaceElement, getInfoWindowHTML, getFilterData } from '../../js/modules/utilities.mjs';
import { getPublishedEntities, getFeatureKeys } from '../../js/modules/jsonld.mjs';

export const namespace = 'cafes';

/**
 * Makes a URL slug from a plain text title
 * @param {String} str
 * @return {String}
 */
function slugify( str ) {
    return str.normalize( 'NFKD' ).replace( /[̀-ͯ]/g, '' ).toLowerCase().replace( /[^a-z0-9]+/g, '-' ).replace( /^-|-$/g, '' );
}

/**
 * Called with the contents of data.json: makes a place object for each café
 * @param {Array} data JSON-LD Articles
 */
export function onloadPlaceData( data ) {
    splog( 'onloadPlaceData (cafes module)' );
    spacefinder.data[namespace].places = getPublishedEntities( data ).map( ld => ( {
        id: ld.identifier,
        slug: slugify( ld.name ),
        title: ld.name,
        lat: Number( ld.geo.latitude ),
        lng: Number( ld.geo.longitude ),
        facilities: getFeatureKeys( ld ),
        ld: ld
    } ) );
}

/**
 * Renders the list view for a café
 * @param {Object} cafe
 * @return {Element} HTML element
 */
export function getPlaceHTML( cafe ) {
    return createPlaceElement( cafe, {
        /* filters.json has a "facilities" filter, so a café with wifi gets the class facilities_wifi */
        classList: cafe.facilities.map( key => 'facilities_' + key ).join( ' ' ),
        typeLabel: 'Café',
        typeClass: 'cafe',
        address: esc( cafe.ld.address.streetAddress ),
        details: '<p class="description">' + esc( cafe.ld.description ) + '</p>'
    } );
}

/**
 * Gets the details shown when a café is selected
 * @param {Object} cafe
 * @return {String} HTML
 */
export function getAdditionalInfo( cafe ) {
    let html = '<section class="section-facts"><h4>Key Facts</h4><ul class="bulleticons">';
    html += '<li class="icon-marker switch-view"><a class="show-map" href="#">Show on map</a></li>';
    html += '<li class="icon-address">' + esc( cafe.ld.address.streetAddress ) + ' (' + getDirectionsLink( cafe.lat, cafe.lng ) + ')</li>';
    html += '</ul></section>';
    html += '<section class="section-opening"><h4>Opening Hours</h4><ul class="bulleticons">';
    cafe.ld.openingHoursSpecification.forEach( spec => {
        let day = spec.dayOfWeek.replace( /^https?:\/\/schema.org\//, '' );
        let times = spec.opens ? spec.opens.slice( 0, 5 ) + ' to ' + spec.closes.slice( 0, 5 ): 'Closed';
        html += '<li class="icon-time-short">' + day + ': ' + times + '</li>';
    });
    html += '</ul></section>';
    if ( cafe.facilities.length ) {
        html += '<section class="section-facilities"><h4>Facilities</h4><ul class="bulleticons">';
        cafe.facilities.forEach( key => {
            let option = getFilterData( 'facilities', key );
            if ( option ) {
                html += '<li class="' + option.icon + '">' + option.label + '</li>';
            }
        });
        html += '</ul></section>';
    }
    return html;
}

/**
 * Gets the content of a café's popup on the map
 * @param {Object} cafe
 * @return {String} HTML
 */
export function getInfoWindowContent( cafe ) {
    return getInfoWindowHTML( cafe.title, [ 'Café', esc( cafe.ld.address.streetAddress ) ] );
}
