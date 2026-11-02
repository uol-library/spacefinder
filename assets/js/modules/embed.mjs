/**
 * The app in an iframe
 *
 * When the app is in an iframe, and the site lists the parent page's origin
 * under embed: origins in _data/config.yml, the parent page can call the
 * API's methods (see api.mjs) and receive the app's events with postMessage.
 *
 * The parent sends:
 *     { app: 'spacefinder', type: 'call', id: 1, method: 'selectPlace', args: [ 'copper-beech' ] }
 * and receives the result, with the same id:
 *     { app: 'spacefinder', type: 'result', id: 1, result: true }
 * or { app: 'spacefinder', type: 'result', id: 1, error: '...' }
 * Calling the method "ready" waits until the first dataset has loaded.
 *
 * Each of the app's events is sent to the parent as:
 *     { app: 'spacefinder', type: 'event', name: 'sfplaceselect', detail: { ... } }
 */
import { spacefinder } from './config.mjs';
import { getLogger } from './utilities.mjs';
import { api } from './api.mjs';

const log = getLogger( 'embed' );

/* the events sent to the parent page (see the Embedding guide in the documentation) */
export const EVENTS = [
    'sfready',
    'sfdatasourceunload',
    'sfdatasourcechange',
    'sfplacesloaded',
    'sffiltersloaded',
    'sfdatasourceready',
    'sfplaceselect',
    'sfplacedeselect',
    'sffilterchange',
    'sfsearch',
    'sfroutechange',
    'sfpaneltoggle',
    'sfpageshow',
    'sfpagehide',
    'sfgeostart',
    'sfgeoend',
    'sffullscreen',
    'sfresize'
];

const origins = spacefinder.embedOrigins;

if ( window.parent !== window && origins.length ) {
    log( 'In an iframe: sending events to, and taking calls from ' + origins.join( ', ' ) );
    EVENTS.forEach( name => {
        document.addEventListener( name, event => {
            /* the message is only delivered if the parent page has one of the origins */
            origins.forEach( origin => post( { type: 'event', name: name, detail: event.detail }, origin ) );
        });
    });
    window.addEventListener( 'message', onMessage );
}

/**
 * Sends a message to the parent page
 * @param {Object} message
 * @param {string} origin the parent page's origin (or *)
 */
function post( message, origin ) {
    window.parent.postMessage( Object.assign( { app: 'spacefinder' }, message ), origin );
}

/**
 * Calls an API method for the parent page, and sends it the result
 * @param {MessageEvent} event
 */
function onMessage( event ) {
    let data = event.data;
    if ( event.source !== window.parent || ! data || data.app !== 'spacefinder' || data.type !== 'call' ) {
        return;
    }
    if ( ! origins.includes( '*' ) && ! origins.includes( event.origin ) ) {
        log.warn( 'Ignoring a call from ' + event.origin + ', which is not in embed: origins' );
        return;
    }
    log( 'Call from ' + event.origin + ': ' + data.method, data.args );
    let call;
    if ( data.method === 'ready' ) {
        call = api.ready.then( () => true );
    } else if ( typeof api[ data.method ] === 'function' ) {
        call = Promise.resolve().then( () => api[ data.method ]( ...( Array.isArray( data.args ) ? data.args: [] ) ) );
    } else {
        call = Promise.reject( new Error( 'There is no method ' + data.method ) );
    }
    call.then(
        result => post( { type: 'result', id: data.id, result: result === undefined ? null: result }, event.origin ),
        error => post( { type: 'result', id: data.id, error: String( error.message || error ) }, event.origin )
    );
}
