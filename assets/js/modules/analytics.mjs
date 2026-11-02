/**
 * Google Analytics events
 *
 * Sends some of the app's events (see the Embedding guide in the documentation)
 * to Google Analytics, when the site has a google_analytics ID and the user
 * has accepted analytics cookies (the gtag function is defined by
 * _includes/google-analytics.html). In debug mode, the events that would be
 * sent are logged.
 */
import { getLogger } from './utilities.mjs';

const log = getLogger( 'analytics' );

/**
 * Sends an event to Google Analytics, if gtag has been loaded
 * @param {string} name GA event name
 * @param {Object} params GA event parameters
 */
function track( name, params ) {
    log( 'GA event ' + name + ( typeof window.gtag === 'function' ? '': ' (not sent: GA is not loaded)' ), params );
    if ( typeof window.gtag === 'function' ) {
        window.gtag( 'event', name, params );
    }
}

document.addEventListener( 'sfplaceselect', e => {
    track( 'select_item', {
        item_list_id: e.detail.source,
        item_list_name: e.detail.source,
        items: [
            {
                item_id: e.detail.id,
                item_name: e.detail.title
            }
        ]
    });
});
document.addEventListener( 'sfpageshow', e => {
    track( 'select_item', {
        items: [
            {
                item_id: e.detail.page,
                item_name: e.detail.title
            }
        ]
    });
});
document.addEventListener( 'sfsearch', e => {
    track( 'search', {
        search_term: e.detail.terms
    });
});
document.addEventListener( 'sffilterchange', e => {
    Object.entries( e.detail.filters ).forEach( ( [ key, options ] ) => {
        track( 'select_content', {
            content_type: key,
            item_id: options.join( ', ' )
        });
    });
});
document.addEventListener( 'sfgeostart', () => {
    track( 'level_start', {
        level_name: 'Geolocation activated'
    });
});
document.addEventListener( 'sfgeoend', () => {
    track( 'level_end', {
        level_name: 'Geolocation deactivated'
    });
});
