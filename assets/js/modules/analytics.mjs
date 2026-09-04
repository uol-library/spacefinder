/**
 * Google Analytics event triggers
 *
 * Adds event listeners for various events to be logged to GA.
 *
 * Custom Eventa contain information in the detail property:
 *
 * @param e.detail.terms the terms used in the search or filter for the search and filter types
 * @param e.detail.filtername the name of the filter for the filter type
 * @param e.detail.src the selection source for the select type (map or list)
 * @param e.detail.id the ID of the space selected for the select type
 * @param e.detail.name the title of the space selected for the select type
 */
document.addEventListener('DOMContentLoaded', () => {
    if ( typeof gtag == 'function' ) {
        document.addEventListener( 'sfselectitem', e => {
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
        });
        document.addEventListener( 'sfselectpage', e => {
            gtag('event', 'select_item', {
                items: [
                    {
                        item_id: e.detail.id,
                        item_name: e.detail.name
                    }
                ]
            });
        });
        document.addEventListener( 'sfsearch', e => {
            gtag('event','search', {
                search_term: e.detail.terms
            });
        });
        document.addEventListener( 'sffilter', e => {
            gtag('event','select_content', {
                'content_type': e.detail.filtername,
                'item_id': e.detail.terms
            });
        });
        document.addEventListener( 'sfgeostart', e => {
            gtag('event','level_start', {
                'level_name': 'Geolocation activated'
            });
        });
        document.addEventListener( 'sfgeoend', e => {
            gtag('event','level_end', {
                'level_name': 'Geolocation deactivated'
            });
        });
    }
});
function gtag() {
    console.log( 'gtag called with arguments:', arguments );
}
