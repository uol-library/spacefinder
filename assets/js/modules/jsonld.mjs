/**
 * Helpers for reading the schema.org JSON-LD used for place data.
 *
 * Each place is an Article whose mainEntity is the place itself; Articles
 * whose creativeWorkStatus is not "Published" are drafts.
 */

/**
 * Returns the places (mainEntity) of all published Articles
 * @param {Array} data array of JSON-LD Articles
 * @return {Array} places
 */
export function getPublishedEntities( data ) {
    return data.filter( article => article.creativeWorkStatus === 'Published' ).map( article => article.mainEntity );
}

/**
 * Returns the value of a PropertyValue with the given propertyID, from a
 * property such as identifier or additionalProperty
 * @param {Array|Object} values one or more PropertyValues
 * @param {string} propertyID
 * @return {*} value, or undefined if not found
 */
export function getPropertyValue( values, propertyID ) {
    let list = Array.isArray( values ) ? values: ( values ? [ values ]: [] );
    let found = list.find( pv => pv.propertyID === propertyID );
    return found ? found.value: undefined;
}

/**
 * Returns the value of an amenityFeature, using its alternateName as the key
 * @param {Object} entity JSON-LD place
 * @param {string} key
 * @return {*} value, or undefined if not found
 */
export function getFeatureValue( entity, key ) {
    let found = ( entity.amenityFeature || [] ).find( f => f.alternateName === key );
    return found ? found.value: undefined;
}

/**
 * Returns the keys (alternateName) of all amenityFeatures whose value is true
 * @param {Object} entity JSON-LD place
 * @return {Array} keys
 */
export function getFeatureKeys( entity ) {
    return ( entity.amenityFeature || [] ).filter( f => f.value === true ).map( f => f.alternateName );
}
