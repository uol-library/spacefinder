/**
 * Example dataset: trees.
 *
 * The smallest useful dataset module, as described in the "Adding a
 * dataset" guide in the documentation. The trees are made up.
 */
import { spacefinder } from '../../js/modules/config.mjs';
import { escapeHTML as esc, getDirectionsLink, createPlaceElement, getInfoWindowHTML } from '../../js/modules/utilities.mjs';
import { getPublishedEntities, getPropertyValue } from '../../js/modules/jsonld.mjs';

export const namespace = 'trees';

/**
 * Called with the contents of data.json: makes a place object for each tree
 * @param {Array} data JSON-LD Articles
 */
export function onloadPlaceData( data ) {
    spacefinder.data[namespace].places = getPublishedEntities( data ).map( ld => ( {
        id: ld.identifier,
        slug: ld.name.toLowerCase().replace( /[^a-z0-9]+/g, '-' ),
        title: ld.name,
        lat: Number( ld.geo.latitude ),
        lng: Number( ld.geo.longitude ),
        species: getPropertyValue( ld.additionalProperty, 'species' ),
        ld: ld
    } ) );
}

/**
 * Renders the list view for a tree
 * @param {Object} tree
 * @return {Element} HTML element
 */
export function getPlaceHTML( tree ) {
    return createPlaceElement( tree, {
        /* filters.json has a "species" filter, so an oak gets the class species_oak */
        classList: 'species_' + tree.species.toLowerCase(),
        typeLabel: 'Tree',
        typeClass: 'tree',
        details: '<p class="description">' + esc( tree.ld.description ) + '</p>'
    } );
}

/**
 * Gets the details shown when a tree is selected
 * @param {Object} tree
 * @return {String} HTML
 */
export function getAdditionalInfo( tree ) {
    let html = '<section class="section-facts"><h4>Key Facts</h4><ul class="bulleticons">';
    html += '<li class="icon-marker switch-view"><a class="show-map" href="#">Show on map</a></li>';
    html += '<li class="icon-info-circled">' + esc( tree.species ) + '</li>';
    html += '<li class="icon-direction">' + getDirectionsLink( tree.lat, tree.lng ) + '</li>';
    html += '</ul></section>';
    return html;
}

/**
 * Gets the content of a tree's popup on the map
 * @param {Object} tree
 * @return {String} HTML
 */
export function getInfoWindowContent( tree ) {
    return getInfoWindowHTML( tree.title, [ 'Tree', esc( tree.species ) ] );
}
