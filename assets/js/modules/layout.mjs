/**
 * Spacefinder layout
 *
 * The page is the top bar, the map and the footer. The list and the filters
 * are in a panel on the left of the map (a Leaflet control), which a button
 * beside it opens and closes. The map pans by half the panel's width when
 * it opens or closes, so the places in view stay in the middle of the part
 * of the map that can be seen.
 */
import { Control, DomEvent, DomUtil } from 'leaflet';
import { spacefinder } from './config.mjs';
import { getLogger, sendEvent, getDataSourceName, getPlaceById } from './utilities.mjs';

const log = getLogger( 'layout' );

document.addEventListener( 'DOMContentLoaded', () => {
    window.addEventListener( 'resize', () => {
        clearTimeout( spacefinder.resizeTimeout );
        spacefinder.resizeTimeout = setTimeout( () => {
            sendEvent( 'sfresize', { width: window.innerWidth, height: window.innerHeight } );
        }, 200);
    });
    document.addEventListener( 'click', event => {
        /* "Show on map" links in a place's details close the panel and centre the map on the place */
        if ( event.target.classList.contains( 'show-map' ) ) {
            event.preventDefault();
            closePanel( false );
            let active = document.querySelector( '.list-place.active' );
            let place = active ? getPlaceById( active.getAttribute( 'data-id' ) ): false;
            if ( place && place.lat && place.lng ) {
                spacefinder.map.panTo( [ place.lat, place.lng ] );
            }
        /* "More info" buttons in map popups open it (places.mjs scrolls to the selected place), and move the focus to the place */
        } else if ( event.target.classList.contains( 'show-list' ) ) {
            event.preventDefault();
            openPanel();
            let title = document.querySelector( '.list-place.active button.place-title' );
            if ( title ) {
                title.focus( { preventScroll: true } );
            }
        /* the skip link goes to the list, so the panel needs to be open */
        } else if ( event.target.closest( '#skip a' ) ) {
            openPanel( false );
        }
    });
    /* the toggle's label has the dataset's name */
    document.addEventListener( 'sfdatasourcechange', () => setPanelState( isPanelOpen() ) );
});

/**
 * The panel with the list and the filters. The panel's markup is in the
 * page (#sfpanel, from the spacefinder layout); this moves it into the
 * map's top left corner.
 */
export class PanelControl extends Control {
    onAdd( map ) {
        const container = document.getElementById( 'sfpanel' );
        /* stop clicks, drags and scrolling in the panel reaching the map */
        DomEvent.disableClickPropagation( container );
        DomEvent.disableScrollPropagation( container );
        return container;
    }
}

/**
 * The button that opens and closes the panel
 */
export class PanelToggleControl extends Control {
    onAdd( map ) {
        const container = DomUtil.create( 'div', 'leaflet-bar leaflet-control-panel-toggle' );
        this._button = DomUtil.create( 'button', 'panel-toggle icon-list', container );
        this._button.setAttribute( 'type', 'button' );
        this._button.setAttribute( 'aria-controls', 'sfpanel' );
        DomEvent.disableClickPropagation( container );
        DomEvent.on( this._button, 'click', () => togglePanel() );
        return container;
    }
}

/**
 * Adds the panel and its button to the map. The panel starts open, unless
 * the window is narrower than the small breakpoint.
 * @param {Map} map
 */
export function addPanel( map ) {
    spacefinder.panelControl = new PanelControl( { position: 'topleft' } ).addTo( map );
    spacefinder.panelToggleControl = new PanelToggleControl( { position: 'topleft' } ).addTo( map );
    setPanelState( window.innerWidth >= spacefinder.breakpoints.small );
}

/**
 * Whether the panel is open
 * @return {boolean}
 */
export function isPanelOpen() {
    return document.getElementById( 'map' ).classList.contains( 'sfpanel-open' );
}

/**
 * Gets the width of the map covered by the panel, for padding when the
 * map fits its view to places, and for popups
 * @return {number} pixels
 */
export function getPanelWidth() {
    return isPanelOpen() ? document.getElementById( 'sfpanel' ).offsetWidth: 0;
}

/**
 * Opens the panel
 * @param {boolean} pan whether to pan the map (default true)
 */
export function openPanel( pan = true ) {
    if ( ! isPanelOpen() ) {
        togglePanel( pan );
    }
}

/**
 * Closes the panel
 * @param {boolean} pan whether to pan the map (default true)
 */
export function closePanel( pan = true ) {
    if ( isPanelOpen() ) {
        togglePanel( pan );
    }
}

/**
 * Opens the panel if it is closed, or closes it if it is open, and pans the
 * map so the middle of the part that can be seen stays in the same place
 * @param {boolean} pan whether to pan the map (default true)
 */
export function togglePanel( pan = true ) {
    const opening = ! isPanelOpen();
    /* the panel's width when open (it isn't measured while it is hidden) */
    const width = opening ? 0: getPanelWidth();
    setPanelState( opening );
    const offset = ( opening ? getPanelWidth(): width ) / 2;
    if ( pan && spacefinder.map && offset ) {
        spacefinder.map.panBy( [ opening ? -offset: offset, 0 ] );
    }
    sendEvent( 'sfpaneltoggle', { open: opening } );
}

/**
 * Shows or hides the panel, and updates its button
 * @param {boolean} open
 */
function setPanelState( open ) {
    log( 'The panel is ' + ( open ? 'open': 'closed' ) );
    document.getElementById( 'map' ).classList.toggle( 'sfpanel-open', open );
    document.getElementById( 'sfpanel' ).hidden = ! open;
    const button = document.querySelector( '.panel-toggle' );
    if ( button ) {
        const label = ( open ? 'Hide': 'Show' ) + ' the list of ' + getDataSourceName();
        button.setAttribute( 'aria-expanded', open ? 'true': 'false' );
        /* the list icon opens the panel, and an X closes it */
        button.classList.toggle( 'icon-list', ! open );
        button.classList.toggle( 'icon-close', open );
        button.setAttribute( 'aria-label', label );
        button.setAttribute( 'title', label );
    }
}
