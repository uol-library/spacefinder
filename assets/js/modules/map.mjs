import {
    Control,
    Map,
    TileLayer,
    DivIcon,
    Marker,
    Popup,
    LatLng,
    DomUtil,
    DomEvent
} from 'leaflet';
import { FullScreen } from 'leaflet.fullscreen';
import { LocateControl } from 'leaflet.locatecontrol';
import { spacefinder } from './config.mjs';
import { getPlaceById, splog, haversine_distance } from './utilities.mjs';
import { openAlertDialog } from './components.mjs';
import { activateSort, sortSpaces } from './spaces.mjs';
import { SimpleMarkerClusterGroup } from './clusterer.mjs';

/**
 * Initialise map and set listeners to set up markers when loaded
 */
export function initMap() {
    splog( 'initMap', 'map.js' );
    document.addEventListener( 'sfmaploaded', checkGeo );
    document.addEventListener( 'filtersapplied', filterMarkers );
    document.addEventListener( 'placesLoaded', maybeSetupMap );
    document.addEventListener( 'filtersloaded', maybeSetupMap );
    document.addEventListener( 'sfmaploaded', maybeSetupMap );
    spacefinder.map = new Map( 'map' ).setView([spacefinder.currentLoc.lat, spacefinder.currentLoc.lng], spacefinder.startZoom );
    /* change leaflet attribution */
    spacefinder.map.attributionControl.setPrefix( '<a href="https://leafletjs.com" target="external" title="A JavaScript library for interactive maps" aria-label="Leaflet - a JavaScript library for interactive maps"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="12" height="8"><path fill="#4C7BE1" d="M0 0h12v4H0z"></path><path fill="#FFD500" d="M0 4h12v3H0z"></path><path fill="#E0BC00" d="M0 7h12v1H0z"></path></svg> Leaflet</a>' );
    spacefinder.osm = new TileLayer( 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© <a target="external" href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo( spacefinder.map );
    spacefinder.esri_sat = new TileLayer( 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
	    attribution: 'Tiles © Esri - Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });
    spacefinder.fullscreencontrol = new FullScreen({
        position: 'topleft'
    }).addTo(spacefinder.map);
    spacefinder.locateControl = new LocateControl({
        position: 'topleft',
        strings: {
            title: 'Use my location'
        },
        locateOptions: {
            watch: true,
            enableHighAccuracy: true
        },
        setView: false,
        onLocationError: onGeoError
    }).addTo(spacefinder.map);
    spacefinder.map.on( 'locateactivate', onGeoActivate );
    spacefinder.map.on( 'locatedeactivate', onGeoDeactivate );
    spacefinder.map.on( 'locationfound', onGeoLocationFound );
    spacefinder.scalecontrol = new Control.Scale(
        {position: 'bottomleft'}
    ).addTo(spacefinder.map);
    spacefinder.mapLoaded = true;
    spacefinder.viewdata = {
        'street': {
            btnText: 'Street',
            btnLabel: 'Switch to Street View',
            btnClass: 'maptype-street',
            tileLayer: spacefinder.osm
        },
        'satellite': {
            btnText: 'Satellite',
            btnLabel: 'Switch to Satellite View',
            btnClass: 'maptype-satellite',
            tileLayer: spacefinder.esri_sat
        }
    };

    document.dispatchEvent( new Event( 'sfmaploaded' ) );

    /**
     * Add click listeners
     */
    document.addEventListener( 'click', event => {
        /* Returns to list view from map "more info" button */
        if ( event.target.classList.contains( 'show-list' ) ) {
            event.preventDefault();
            document.dispatchEvent( new CustomEvent( 'viewchange', {
                bubbles: true,
                cancelable: true,
                composed: false,
                detail: {
                    view: 'list'
                }
            } ) );
        }
        /* prevents the close button on popups changing the anchor */
        if ( event.target.classList.contains( 'leaflet-popup-close-button' ) || ( event.target.parentNode && event.target.parentNode.classList && event.target.parentNode.classList.contains( 'leaflet-popup-close-button' ) ) ) {
            event.preventDefault();
        }
    });

    /**
     * make sure the map knows about resizing, both of the main
     * window, and when a change in view happens (which may reduce
     * the area taken up by the map component)
     */
    document.addEventListener( 'sfresize', () => {
        spacefinder.map.invalidateSize( true );
    });
    document.addEventListener( 'viewchange', () => {
        splog( 'view changed', 'map.js' );
        window.setTimeout( () => {
            splog( 'invalidating map size - viewchange event', 'map.js' );
            spacefinder.map.invalidateSize( true );
        }, 500);
    });
}

/**
 * Sets up te map with markers for each space. Needs to run when
 * the map is fully loaded and the space data is fully loaded.
 */
function maybeSetupMap() {
    splog( 'maybeSetupMap', 'map.js' );
    if ( spacefinder.mapLoaded && spacefinder.placesLoaded && spacefinder.filtersLoaded ) {

        /* collect latLng coordinates here to define map bounds */
        let pointsArray = [];

        /**
         * Initialise marker cluster group
         * @see ./clusterer.mjs
         */
        spacefinder.markergroup = new SimpleMarkerClusterGroup({
			disableClusteringAtZoom: 17,
			zoomToBoundsOnClick: true
		});

        /* add each space to the map using a marker */
        for ( let i = 0; i < spacefinder.data[spacefinder.currentDataSource].length; i++ ) {
            if ( spacefinder.spaces[i].lat && spacefinder.spaces[i].lng ) {
                var spacePosition = new LatLng( spacefinder.spaces[i].lat, spacefinder.spaces[i].lng );
                pointsArray.push( [ spacefinder.spaces[i].lat, spacefinder.spaces[i].lng ] );
                spacefinder.spaces[i].marker = new Marker( spacePosition, {
                    alt: spacefinder.spaces[i].title,
                    title: spacefinder.spaces[i].title,
                    icon: getSVGIcon( 'space-marker' )
                });
                spacefinder.markergroup.addLayer( spacefinder.spaces[i].marker );
                /* set the popup for the marker */
                spacefinder.spaces[i].popup = new Popup().setContent( getSpaceInfoWindowContent( spacefinder.spaces[i] ) );
                spacefinder.spaces[i].popup.spaceID = spacefinder.spaces[i].id;
                spacefinder.spaces[i].marker.bindPopup( spacefinder.spaces[i].popup );
            }
        }

        /* add the markers to the map */
        spacefinder.map.addLayer( spacefinder.markergroup );

        /* use popupopen and popupclose events to select and deselect spaces from map */
        spacefinder.map.on( 'popupopen', event => {
            zoomMapToSpace( event.popup.spaceID );
            document.dispatchEvent( new CustomEvent( 'spaceSelectedOnMap', { bubbles: true, detail: { id: event.popup.spaceID, src: 'map' } } ) );
        });
        spacefinder.map.on( 'popupclose', event => {
            document.dispatchEvent( new CustomEvent( 'spaceDeselectedFromMap', { bubbles: true, detail: { id: event.popup.spaceID } } ) );
        });

        /* respond to corresponding events from list */
        document.addEventListener( 'spaceSelected', event => { zoomMapToSpace( event.detail.id ) } );
        document.addEventListener( 'spaceDeselected', deselectSpacesFromMap );

        /* Make sure the map view encompasses all markers */
        if ( pointsArray.length ) {
            spacefinder.map.fitBounds( pointsArray );
        }

        /* save the map bounds and zoom to enable resetting */
        spacefinder.mapBounds = spacefinder.map.getBounds();
        spacefinder.mapZoom = parseInt( spacefinder.map.getZoom() );

        /**
         * Add a button to recentre the map when geolocation is active and the user
         * drags the map off centre (the map should be centred on the user position)
         */
        spacefinder.map.on( 'dragend', event => {
            if ( spacefinder.geoActive && ! spacefinder.recentreControl ) {
                splog( 'adding recentre control as map was dragged by user', 'map.js' );
                spacefinder.recentreControl = new RecentreControl( { position: 'bottomleft' } ).addTo( spacefinder.map );
            }
        });

        /**
         * Add a button to switch base layers between streets (OpenStreetMap)
         * and satellite (ESRI).
         */
        new MapTypeControl( { position: 'topright' } ).addTo( spacefinder.map );

        /* let eveyone know we are ready */
        spacefinder.mapReady = true;
        document.dispatchEvent( new Event( 'sfmapready' ) );
    }
}

/**
 * Button to recentre the map when geolocation is active and the user
 * drags the map off centre.
 */
class RecentreControl extends Control {
    onAdd( map ) {
        const container = DomUtil.create( 'div', 'leaflet-control-recentre' );
        this._recentreButton = DomUtil.create( 'button', 'maprecentre-button icon-direction', container );
        this._recentreButton.innerHTML = 'Recentre';
        this._recentreButton.setAttribute( 'aria-label', 'Recentre map on my location' );
        this._recentreButton.setAttribute( 'title', 'Recentre map on my location' );
        DomEvent.on( this._recentreButton, 'mousedown dblclick', DomEvent.stopPropagation )
            .on( this._recentreButton, 'click', DomEvent.stop )
            .on( this._recentreButton, 'click', this._recentreMap, this );
        return container;
    }
    onRemove( map ) {
        splog( 'removing recentre control', 'map.js' );
        DomEvent.off( this._recentreButton, 'click mousedown dblclick' );
    }
    _recentreMap() {
        let newCenter = spacefinder.geoActive ? spacefinder.personLoc: spacefinder.currentLoc;
        spacefinder.map.panTo( newCenter );
        spacefinder.recentreControl = null;
        this.remove();
    }
}

/**
 * Button to switch base layers between streets (OpenStreetMap) and
 * satellite (ESRI).
 */
class MapTypeControl extends Control {
    onAdd( map ) {
        let sd = spacefinder.viewdata.satellite;
        const container = DomUtil.create( 'div', 'leaflet-control-maptype' );
        this._mapTypeButton = DomUtil.create( 'button', 'maptype-button ' + sd.btnClass, container );
        this._mapTypeButton.innerHTML = sd.btnText;
        this._mapTypeButton.setAttribute( 'aria-label', sd.btnLabel );
        this._mapTypeButton.setAttribute( 'title', sd.btnLabel );
        this._mapTypeButton.setAttribute( 'data-currentType', 'street' );
        DomEvent.on( this._mapTypeButton, 'mousedown dblclick', DomEvent.stopPropagation )
            .on( this._mapTypeButton, 'click', DomEvent.stop )
            .on( this._mapTypeButton, 'click', this._switchType, this );
        return container;
    }
    onRemove( map ) {
        DomEvent.off( this._mapTypeButton, 'click mousedown dblclick' );
    }
    _switchType() {
        let currentType = this._mapTypeButton.getAttribute( 'data-currentType' );
        let newType = currentType == 'street' ? 'satellite': 'street';
        this._mapTypeButton.classList.replace( spacefinder.viewdata[ newType ].btnClass, spacefinder.viewdata[ currentType ].btnClass );
        this._mapTypeButton.innerHTML = spacefinder.viewdata[ currentType ].btnText;
        this._mapTypeButton.setAttribute( 'aria-label', spacefinder.viewdata[ currentType ].btnLabel );
        this._mapTypeButton.setAttribute( 'title', spacefinder.viewdata[ currentType ].btnLabel );
        this._mapTypeButton.setAttribute( 'data-currentType', newType );
        spacefinder.viewdata[currentType].tileLayer.removeFrom( spacefinder.map );
        spacefinder.viewdata[newType].tileLayer.addTo( spacefinder.map );
    }
}

/**
 * Returns HTML for an individual space's infoWindow
 * @param {Object} space
 * @returns {String} HTML content for space infoWindow
 */
function getSpaceInfoWindowContent( space ) {
	let info = [];
	info.push( space.space_type );
	if ( space.floor !== '' ) {
		info.push( space.floor );
	}
	if ( space.building !== '' ) {
		info.push( space.building );
	}
	let content = '<div class="spaceInfoWindow"><h3>'+space.title+'</h3>';
	content += '<p class="info">' + info.join(', ') + '</p>';
	content += '<p class="description">' + space.description + '</p>';
	content += '<button class="show-list">More info&hellip;</button></div>';
	return content;
}

/**
 * Returns an object to be used in the map to make a leaflet icon
 * @param {String} className CSS class to be used on the icon
 * @return {Object}
 */
function getSVGIcon( c ) {
	return new DivIcon({
  		html: `<svg width="32" height="32" viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="10" stroke-width="6"></circle></svg>`,
		className: c,
  		iconSize: [32, 32],
  		iconAnchor: [16, 16]
	});
}

/**
 * Re-centres map
 */
function recentreMap() {
    splog( 'recentreMap', 'map.js' );
    let newCenter = spacefinder.geoActive ? spacefinder.personLoc: spacefinder.currentLoc;
    spacefinder.map.panTo( newCenter );
}

/**
 * Zooms the map to show a particular space
 * @param {Object} space
 */
function zoomMapToSpace( spaceid ) {
    splog( 'zoomMapToSpace', 'map.js' );
    let space = getPlaceById( spaceid );
    spacefinder.markergroup.zoomToShowLayer( space.marker, function(){
        let newCenter = new LatLng( space.lat, space.lng );
        space.popup.setLatLng( newCenter ).openOn( spacefinder.map );
    });
}


/**
 * Resets the map after a space has been selected
 */
 function deselectSpacesFromMap() {
    splog( 'deselectSpacesFromMap', 'map.js' );
    spacefinder.map.closePopup();
}

/**
 * Filters the markers on the map
 */
function filterMarkers() {
    splog( 'filterMarkers', 'map.js' );
    let markersToAdd = [];
    document.querySelectorAll( '.list-space' ).forEach( element => {
        let space = getPlaceById( element.getAttribute( 'data-id' ) );
        if ( ! element.classList.contains( 'hidden' ) ) {
            markersToAdd.push( space.marker );
        }
    });
    spacefinder.markergroup.clearLayers();
    spacefinder.markergroup.addLayers( markersToAdd );
}

/*******************************************************************
 * GEOLOCATION
 *
 * Geolocation is handled by the leaflet.locatecontrol plugin, which
 * provides the map's own "use my location" button. This section wires
 * that up to the app's list-view geolocation button, distance
 * sorting, and analytics events.
 *******************************************************************/

/**
 * Updates the data-sortdistance attribute for all spaces relative
 * to the user position.
 */
export function updateDistances() {
    splog( 'updateDistances', 'map.js' );
    if ( spacefinder.geoActive ) {
        spacefinder.data[spacefinder.currentDataSource].forEach( (space, index) => {
            let d = haversine_distance( spacefinder.personLoc, { lat: space.lat, lng: space.lng } );
            document.querySelector( '[data-id="' + space.id + '"]').setAttribute( 'data-sortdistance', d );
            var dist = ( d > 1000 ) ? ( ( d / 1000 ).toFixed(2) + 'km  away' ) : ( d > 1 ? d + ' metres away': ( d === 1 ? d + ' metre away': 'You are here!' ) );
            document.getElementById( 'distance' + space.id ).innerHTML = dist;
        });
    } else {
        let spacenodes = document.querySelectorAll( '.list-space' );
        if ( spacenodes !== null ) {
            spacenodes.forEach( element => element.setAttribute( 'data-sortdistance', '' ) );
        }
    }
}

/**
 * Toggles the disabled attribute of the geolocation button in the list
 * view. The map's own geolocation control is managed by LocateControl.
 * @param {boolean} enable
 */
function toggleGeoButton( enable ) {
    document.querySelectorAll( '.geo-button' ).forEach( element => element.disabled = ! enable );
}

/**
 * Called when LocateControl starts tracking the user's position.
 */
function onGeoActivate() {
    splog( 'onGeoActivate', 'map.js' );
    spacefinder.geoActive = true;
    document.querySelectorAll( '.geo-button' ).forEach( element => {
        element.classList.add( 'active' );
        element.setAttribute( 'aria-label', 'Stop using my location' );
        element.setAttribute( 'title', 'Stop using my location' );
    });
    document.dispatchEvent(new CustomEvent( 'sfanalytics', {
        detail: {
            type: 'geostart'
        }
    }));
    activateSort( true, 'distance' );
}

/**
 * Called when LocateControl stops tracking the user's position.
 */
function onGeoDeactivate() {
    splog( 'onGeoDeactivate', 'map.js' );
    spacefinder.geoActive = false;
    document.querySelectorAll( '.geo-button' ).forEach( element => {
        element.classList.remove( 'active' );
        element.setAttribute( 'aria-label', 'Use my location' );
        element.setAttribute( 'title', 'Use my location' );
    });
    document.getElementById( 'sortdistance' ).setAttribute( 'data-sortdir', '' );
    document.dispatchEvent(new CustomEvent( 'sfanalytics', {
        detail: {
            type: 'geoend'
        }
    }));
    activateSort( false, 'distance' );
    updateDistances();
}

/**
 * Called whenever the browser reports the user's position. Updates
 * distances, keeps the list sorted by distance if that sort is
 * active, and enforces the "must be near campus" restriction.
 * @param {Object} event Leaflet locationfound event
 */
function onGeoLocationFound( event ) {
    splog( 'onGeoLocationFound', 'map.js' );
    if ( spacefinder.mapBounds && ! spacefinder.mapBounds.contains( event.latlng ) ) {
        spacefinder.locateControl.stop();
        openAlertDialog( 'Sorry...', 'You need to be a bit nearer to use this feature.' );
        return;
    }
    spacefinder.personLoc.lat = event.latlng.lat;
    spacefinder.personLoc.lng = event.latlng.lng;
    updateDistances();
    /* see if the spaces are sorted by distance */
    let btn = document.querySelector( '#sortdistance[data-sortdir$="sc"' );
    if ( btn !== null ) {
        let sortdir = document.getElementById( 'sortdistance' ).getAttribute( 'data-sortdir' );
        let dir = ( sortdir == 'desc' ) ? false: true;
        sortSpaces( 'sortdistance', dir );
    }
}

/**
 * Called when LocateControl fails to get the user's position (permission
 * denied, position unavailable, or timeout).
 * @param {Object} error
 */
function onGeoError( error ) {
    splog( 'onGeoError', 'map.js' );
    if ( error.code === 1 || error.code === 2 ) {
        toggleGeoButton( false );
    }
}

/**
 * Performs checks for geolocation permissions and services when the map has loaded
 */
function checkGeo() {
    splog( 'checkGeo', 'map.js' );
    /* first see if geolocation is available on the device */
    checkGeoAvailable();
    /* check to see if it is enabled to determine initial button states */
    checkGeoPermissions();
}

/**
 * Checks permissions to see if geolocation services are permitted.
 * If they have been denied, geolocation is disabled. Also
 * watches for updates to permissions.
 */
function checkGeoPermissions() {
    splog( 'checkGeoPermissions', 'map.js' );
    /* check for permissions query */
    if ( 'permissions' in navigator && navigator.permissions.query ) {
        /* query geolocation permissions */
        navigator.permissions.query( {
            name: 'geolocation'
        } ).then( result => {
            /* save permission state (denied, granted or prompt) */
            spacefinder.permission = result.state;
            toggleGeoButton( 'denied' !== result.state );
            result.onchange = function() {
                spacefinder.permission = result.state;
                toggleGeoButton( 'denied' !== result.state );
            }
        }).catch(error => {
            toggleGeoButton( false );
        });
    }
}

/**
 * Tests for availability of geolocation on client. If available,
 * wires up the list-view geolocation button.
 */
function checkGeoAvailable() {
    splog( 'checkGeoAvailable', 'map.js' );
    if ( 'geolocation' in navigator ) {
        /* add listener to buttons to toggle geolocation */
        document.addEventListener( 'click', event => {
            if ( event.target.matches( '.geo-button' ) ) {
                if ( event.target.disabled ) {
                    return;
                }
                if ( spacefinder.geoActive ) {
                    spacefinder.locateControl.stop();
                } else {
                    spacefinder.locateControl.start();
                }
            }
        });
    } else {
        toggleGeoButton( false );
    }
}
