/**
 * Google Analytics event triggers
 * 
 * Adds an event listener for the sfanalytics event, which is called throughout
 * SpaceFinder when things happen which should be logged to GA.
 * 
 * sfanalytics is a Custom Event which contains information in the detail property:
 * 
 * @param {Custom Event} e sfanalytics event
 * @param e.detail.type the type of event being logged (search, filter, geostart, geoend, select)
 * @param e.detail.terms the terms used in the search or filter for the search and filter types
 * @param e.detail.filtername the name of the filter for the filter type
 * @param e.detail.src the selection source for the select type (map or list)
 * @param e.detail.id the ID of the space selected for the select type
 * @param e.detail.name the title of the space selected for the select type
 */
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener( 'sfanalytics', e => {
        if ( typeof gtag == 'function' ) {
            if ( e.detail.type == 'search' ) {
                gtag('event','search', {
                    search_term: e.detail.terms
                });
            } else if ( e.detail.type == 'filter' ) {
                gtag('event','select_content', {
                    'content_type': e.detail.filtername,
                    'item_id': e.detail.terms
                });
            } else if ( e.detail.type == 'geostart' ) {
                gtag('event','level_start', {
                    'level_name': 'Geolocation activated'
                });
            } else if ( e.detail.type == 'geoend' ) {
                gtag('event','level_end', {
                    'level_name': 'Geolocation deactivated'
                });
            } else if (e.detail.type == 'select') {
                gtag('event', 'select_item', {
                    item_list_id: e.detail.src,
                    item_list_name: e.detail.src,
                    items: [
                        {
                            item_id: e.detail.id,
                            item_name: e.detail.name
                        }
                    ]
                });
            }
        }
    });
});