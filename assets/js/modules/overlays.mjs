/**
 * Overlays: GeoJSON files shown with a dataset
 *
 * Any .geojson file in a dataset's data folder (assets/data/<key>/data/) is an
 * overlay. When the dataset loads, its overlays are listed above the places,
 * each with a button which shows or hides it on the map, and they are removed
 * when the dataset is unloaded. The files are found when the site is built
 * (overlayFiles in config.mjs), and are listed in the order of their names.
 *
 * Optional members of the FeatureCollection describe the overlay:
 * - title: its name in the list (the file name if there isn't one)
 * - description: HTML shown after the title
 * - downloads: links shown after the description, as [{ "label": "GPX", "href": "route.gpx" }],
 *   with href relative to the GeoJSON file
 * - style: Leaflet path options for its lines, shapes and points, e.g.
 *   { "color": "#b0127a", "weight": 8, "dashArray": "0 16", "lineCap": "round" }
 *   (points are circles, and radius sets their size)
 * - visible: true to show it when the dataset loads
 * - group: overlays in the same group are shown one at a time, so choosing
 *   one hides the others
 *
 * A feature with a name property has a popup with its name and description
 * (HTML); other features have the overlay's title as a tooltip.
 *
 * The list of overlays can have a heading and an introduction, set by
 * overlays.title and overlays.description in the dataset's entry under
 * datasources in _data/config.yml.
 *
 * Lines and shapes have the class names sf-overlay and sf-overlay-<file name>,
 * so they can also be styled with CSS.
 */
import { GeoJSON, CircleMarker } from 'leaflet';
import { spacefinder } from './config.mjs';
import { getLogger, getJSON, escapeHTML } from './utilities.mjs';

const log = getLogger( 'overlays' );

/* the current dataset's overlays: { name, title, group, layer } */
let overlays = [];

/* counts loads, so overlays for a dataset that has since been unloaded are ignored */
let overlayLoad = 0;

document.addEventListener( 'DOMContentLoaded', () => {
    /* places.mjs renders the list on sfplacesloaded, and its listener is added first */
    document.addEventListener( 'sfplacesloaded', event => loadOverlays( event.detail.dataSource ) );
    document.addEventListener( 'sfdatasourceunload', unloadOverlays );
});

/**
 * Loads a dataset's overlays, lists them and shows the visible ones on the map
 * @param {String} key dataset key
 */
async function loadOverlays( key ) {
    let files = ( spacefinder.overlayFiles || {} )[ key ] || [];
    if ( ! files.length ) {
        return;
    }
    let load = ++overlayLoad;
    let loaded = await Promise.all( files.map( file => {
        let url = spacefinder.dataDir + file;
        return getJSON( { key: 'overlay-' + file, url: url } )
            .then( geojson => getOverlay( file, url, geojson ) )
            .catch( error => {
                log.error( 'Could not load the overlay ' + url + ' - ' + error.statusText );
                return null;
            });
    }) );
    if ( load !== overlayLoad || key !== spacefinder.currentDataSource ) {
        return;
    }
    overlays = loaded.filter( Boolean );
    renderOverlays( key );
    let shown = new Set();
    overlays.forEach( overlay => {
        if ( overlay.visible && ! ( overlay.group && shown.has( overlay.group ) ) ) {
            showOverlay( overlay.name );
            shown.add( overlay.group );
        }
    });
    log( 'Loaded ' + overlays.length + ' overlays for ' + key );
}

/**
 * Makes an overlay's map layer from its GeoJSON
 * @param {String} file path of the file, relative to the data directory
 * @param {String} url URL of the file
 * @param {Object} geojson
 * @return {Object} the overlay
 */
function getOverlay( file, url, geojson ) {
    let name = file.split( '/' ).pop().replace( /\.geojson$/, '' );
    let style = Object.assign( {}, geojson.style || {} );
    let title = geojson.title || name;
    let layer = new GeoJSON( geojson, {
        className: 'sf-overlay sf-overlay-' + name,
        style: () => style,
        pointToLayer: ( feature, latlng ) => new CircleMarker( latlng, Object.assign( { radius: 6, fillOpacity: .8 }, style ) ),
        onEachFeature: ( feature, featureLayer ) => {
            let props = feature.properties || {};
            if ( props.name ) {
                featureLayer.bindPopup( '<h3>' + escapeHTML( props.name ) + '</h3>' + ( props.description || '' ) );
            } else {
                featureLayer.bindTooltip( escapeHTML( title ), { sticky: true } );
            }
        }
    });
    let base = new URL( url, window.location.href );
    return {
        name: name,
        title: title,
        description: geojson.description || '',
        downloads: ( geojson.downloads || [] ).map( d => ( { label: d.label, href: new URL( d.href, base ).href } ) ),
        colour: style.color || '',
        visible: geojson.visible === true,
        group: geojson.group || '',
        layer: layer
    };
}

/**
 * Lists the overlays above the places
 * @param {String} key dataset key
 */
function renderOverlays( key ) {
    let ds = spacefinder.dataSources.find( d => d.key === key ) || {};
    let intro = ds.overlays || {};
    let html = '';
    if ( intro.title ) {
        html += '<h3>' + escapeHTML( intro.title ) + '</h3>';
    }
    if ( intro.description ) {
        html += '<p>' + intro.description + '</p>';
    }
    html += '<ul>';
    overlays.forEach( overlay => {
        let colour = overlay.colour ? ' style="--overlay-colour: ' + escapeHTML( overlay.colour ) + '"': '';
        html += '<li class="overlay overlay-' + escapeHTML( overlay.name ) + '"' + colour + '>';
        html += '<button class="overlay-toggle" data-overlay="' + escapeHTML( overlay.name ) + '" aria-pressed="false" title="Show this on the map">' + escapeHTML( overlay.title ) + '</button> ';
        if ( overlay.description ) {
            html += '<span class="overlay-description">' + overlay.description + '</span>';
        }
        if ( overlay.downloads.length ) {
            html += '<span class="overlay-links">' + overlay.downloads.map( d => '<a href="' + escapeHTML( d.href ) + '" download>' + escapeHTML( d.label ) + '</a>' ).join( ' ' ) + '</span>';
        }
        html += '</li>';
    });
    html += '</ul>';
    let section = document.createElement( 'section' );
    section.id = 'overlays';
    section.innerHTML = html;
    section.addEventListener( 'click', event => {
        let button = event.target.closest( '.overlay-toggle' );
        if ( ! button ) {
            return;
        }
        let name = button.getAttribute( 'data-overlay' );
        if ( button.getAttribute( 'aria-pressed' ) === 'true' ) {
            /* one of a group stays shown until another is chosen */
            if ( ! overlays.find( o => o.name === name ).group ) {
                hideOverlay( name );
            }
        } else {
            showOverlay( name );
        }
    });
    document.getElementById( 'listcontent' ).prepend( section );
}

/**
 * Shows an overlay on the map, and hides the others in its group
 * @param {String} name overlay name (its file name)
 */
function showOverlay( name ) {
    let overlay = overlays.find( o => o.name === name );
    if ( ! overlay ) {
        return;
    }
    if ( overlay.group ) {
        overlays.filter( o => o.group === overlay.group && o !== overlay ).forEach( o => hideOverlay( o.name ) );
    }
    overlay.layer.addTo( spacefinder.map );
    setPressed( name, true );
}

/**
 * Hides an overlay
 * @param {String} name overlay name (its file name)
 */
function hideOverlay( name ) {
    let overlay = overlays.find( o => o.name === name );
    if ( overlay ) {
        overlay.layer.remove();
        setPressed( name, false );
    }
}

/**
 * Sets the pressed state of an overlay's button
 * @param {String} name overlay name
 * @param {boolean} pressed
 */
function setPressed( name, pressed ) {
    let button = document.querySelector( '#overlays .overlay-toggle[data-overlay="' + CSS.escape( name ) + '"]' );
    if ( button ) {
        button.setAttribute( 'aria-pressed', pressed );
    }
}

/**
 * Removes the overlays when the dataset is unloaded (the list is cleared by places.mjs)
 */
function unloadOverlays() {
    overlayLoad++;
    overlays.forEach( overlay => overlay.layer.remove() );
    overlays = [];
}
