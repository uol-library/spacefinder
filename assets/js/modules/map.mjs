/**
 * The map
 *
 * Creates the Leaflet map, adds a marker and popup for each place (using the
 * dataset module's getInfoWindowContent), keeps the markers in step with the
 * list when places are selected or filtered, and handles geolocation. The
 * map is created once; the markers are replaced when the dataset changes.
 *
 * The list and filters panel (see layout.mjs) is on the left of the map, so
 * the map's own controls are on the right.
 *
 * Sends sfdatasourceready (each time a dataset's markers are on the map),
 * sfgeostart, sfgeoend and sffullscreen.
 */
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
import { getPlaceById, getLogger, sendEvent, haversine_distance } from './utilities.mjs';
import { openAlertDialog } from './components.mjs';
import { activateSort, sortPlaces, selectPlace, deselectPlaces } from './places.mjs';
import { SimpleMarkerClusterGroup } from './clusterer.mjs';
import { addPanel, getPanelWidth } from './layout.mjs';

const log = getLogger( 'map' );

/**
 * Initialise map and set listeners to set up markers when loaded
 */
export function initMap() {
    log( 'Creating the map' );
    document.addEventListener( 'sffilterchange', filterMarkers );
    document.addEventListener( 'sfplacesloaded', maybeSetupMap );
    document.addEventListener( 'sffiltersloaded', maybeSetupMap );
    document.addEventListener( 'sfdatasourceunload', removeMarkers );
    spacefinder.map = new Map( 'map', { zoomControl: false } ).setView([spacefinder.currentLoc.lat, spacefinder.currentLoc.lng], spacefinder.startZoom );
    /* the list and filters panel, and the button which opens and closes it */
    addPanel( spacefinder.map );
    new Control.Zoom( { position: 'topright' } ).addTo( spacefinder.map );
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
        position: 'topright'
    }).addTo(spacefinder.map);
    spacefinder.map.on( 'enterFullscreen', () => sendEvent( 'sffullscreen', { fullscreen: true } ) );
    spacefinder.map.on( 'exitFullscreen', () => sendEvent( 'sffullscreen', { fullscreen: false } ) );
    spacefinder.locateControl = new LocateControl({
        position: 'topright',
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
        {position: 'bottomright'}
    ).addTo(spacefinder.map);
    /* use popupopen and popupclose events to select and deselect places from map */
    spacefinder.map.on( 'popupopen', event => {
        /* a popup from a dataset that has been replaced (e.g. opened at the end of a zoom that started before the switch) */
        if ( event.popup.dataSource !== spacefinder.currentDataSource ) {
            log( 'Closing a popup from ' + event.popup.dataSource + ', as the dataset has changed' );
            spacefinder.map.closePopup( event.popup );
            return;
        }
        zoomMapToPlace( event.popup.placeID );
        selectPlace( event.popup.placeID, 'map' );
    });
    spacefinder.map.on( 'popupclose', event => {
        if ( event.popup.dataSource === spacefinder.currentDataSource ) {
            deselectPlaces( event.popup.placeID, 'map' );
        }
    });

    /* show the popup for a place selected in the list (or from the URL or the API), and close it when it is deselected */
    document.addEventListener( 'sfplaceselect', event => {
        if ( event.detail.source !== 'map' ) {
            zoomMapToPlace( event.detail.id );
        }
    });
    document.addEventListener( 'sfplacedeselect', () => spacefinder.map.closePopup() );

    /**
     * Add a button to recentre the map when geolocation is active and the user
     * drags the map off centre (the map should be centred on the user position)
     */
    spacefinder.map.on( 'dragend', event => {
        if ( spacefinder.geoActive && ! spacefinder.recentreControl ) {
            log( 'Adding the recentre control, as the map was dragged' );
            spacefinder.recentreControl = new RecentreControl( { position: 'bottomright' } ).addTo( spacefinder.map );
        }
    });
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

    /**
     * Add a button to switch base layers between streets (OpenStreetMap)
     * and satellite (ESRI).
     */
    new MapTypeControl( { position: 'topright' } ).addTo( spacefinder.map );

    /**
     * Add click listeners
     */
    document.addEventListener( 'click', event => {
        /* prevents the close button on popups changing the anchor */
        if ( event.target.classList.contains( 'leaflet-popup-close-button' ) || ( event.target.parentNode && event.target.parentNode.classList && event.target.parentNode.classList.contains( 'leaflet-popup-close-button' ) ) ) {
            event.preventDefault();
        }
    });

    /**
     * make sure the map knows about resizing, and keep popups clear of the
     * panel when it opens or closes, or the window is resized
     */
    document.addEventListener( 'sfresize', () => {
        spacefinder.map.invalidateSize( true );
        updatePopupPadding();
    });
    document.addEventListener( 'sfpaneltoggle', updatePopupPadding );
    updatePopupPadding();

    checkGeo();
    maybeSetupMap();
}

/**
 * Sets up the map with markers for each place. Needs to run when
 * the map is fully loaded and the place data is fully loaded, and
 * again when the dataset changes.
 */
function maybeSetupMap() {
    if ( spacefinder.mapLoaded && spacefinder.placesLoaded && spacefinder.filtersLoaded ) {

        /* collect latLng coordinates here to define map bounds */
        let pointsArray = [];

        /**
         * Initialise marker cluster group
         * @see ./clusterer.mjs
         */
        spacefinder.data[spacefinder.currentDataSource].markergroup = new SimpleMarkerClusterGroup({
			disableClusteringAtZoom: 17,
			zoomToBoundsOnClick: true
		});

        /* add each place to the map using a marker */
        for ( let i = 0; i < spacefinder.data[spacefinder.currentDataSource].places.length; i++ ) {
            if ( spacefinder.data[spacefinder.currentDataSource].places[i].lat && spacefinder.data[spacefinder.currentDataSource].places[i].lng ) {
                var placePosition = new LatLng( spacefinder.data[spacefinder.currentDataSource].places[i].lat, spacefinder.data[spacefinder.currentDataSource].places[i].lng );
                pointsArray.push( [ spacefinder.data[spacefinder.currentDataSource].places[i].lat, spacefinder.data[spacefinder.currentDataSource].places[i].lng ] );
                spacefinder.data[spacefinder.currentDataSource].places[i].marker = new Marker( placePosition, {
                    alt: spacefinder.data[spacefinder.currentDataSource].places[i].title,
                    title: spacefinder.data[spacefinder.currentDataSource].places[i].title,
                    icon: getSVGIcon( 'place-marker' )
                });
                spacefinder.data[spacefinder.currentDataSource].markergroup.addLayer( spacefinder.data[spacefinder.currentDataSource].places[i].marker );
                /* set the popup for the marker */
                spacefinder.data[spacefinder.currentDataSource].places[i].popup = new Popup( { autoPanPaddingTopLeft: spacefinder.popupPadding } ).setContent( spacefinder.data[spacefinder.currentDataSource].module.getInfoWindowContent( spacefinder.data[spacefinder.currentDataSource].places[i] ) );
                spacefinder.data[spacefinder.currentDataSource].places[i].popup.placeID = spacefinder.data[spacefinder.currentDataSource].places[i].id;
                spacefinder.data[spacefinder.currentDataSource].places[i].popup.dataSource = spacefinder.currentDataSource;
                spacefinder.data[spacefinder.currentDataSource].places[i].marker.bindPopup( spacefinder.data[spacefinder.currentDataSource].places[i].popup );
            }
        }

        /* add the markers to the map */
        spacefinder.map.addLayer( spacefinder.data[spacefinder.currentDataSource].markergroup );

        /* Make sure the map view encompasses all markers */
        if ( pointsArray.length ) {
            /* leave room for the panel */
            spacefinder.map.fitBounds( pointsArray, { paddingTopLeft: [ getPanelWidth(), 0 ] } );
        }

        /* save the map bounds and zoom to enable resetting */
        spacefinder.mapBounds = spacefinder.map.getBounds();
        spacefinder.mapZoom = parseInt( spacefinder.map.getZoom() );

        /* let everyone know we are ready */
        spacefinder.mapReady = true;
        log( 'Added ' + pointsArray.length + ' markers for ' + spacefinder.currentDataSource );
        sendEvent( 'sfdatasourceready', { dataSource: spacefinder.currentDataSource, count: spacefinder.data[spacefinder.currentDataSource].places.length } );
    }
}

/**
 * Keeps popups clear of the panel when the map pans to show them. Every
 * popup's autoPanPaddingTopLeft option is this same array, so changing it
 * changes them all.
 */
function updatePopupPadding() {
    if ( ! spacefinder.popupPadding ) {
        spacefinder.popupPadding = [ 5, 5 ];
    }
    spacefinder.popupPadding[0] = getPanelWidth() + 5;
}

/**
 * Closes any popup and removes the markers for the old dataset when
 * switching to another
 * @param {CustomEvent} event sfdatasourceunload event (detail.from is the old dataset)
 */
function removeMarkers( event ) {
    log( 'Removing the markers for ' + event.detail.from );
    spacefinder.map.closePopup();
    let data = spacefinder.data[ event.detail.from ];
    if ( data && data.markergroup ) {
        spacefinder.map.removeLayer( data.markergroup );
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
        log( 'Removing the recentre control' );
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
 * Zooms the map to show a particular place
 * @param {string} placeid
 */
function zoomMapToPlace( placeid ) {
    let place = getPlaceById( placeid );
    if ( ! place || ! place.marker ) {
        return;
    }
    const dataSource = spacefinder.currentDataSource;
    spacefinder.data[dataSource].markergroup.zoomToShowLayer( place.marker, function(){
        /* the zoom can end after switching to another dataset */
        if ( dataSource !== spacefinder.currentDataSource ) {
            return;
        }
        let newCenter = new LatLng( place.lat, place.lng );
        place.popup.setLatLng( newCenter ).openOn( spacefinder.map );
    });
}


/**
 * Filters the markers on the map
 */
function filterMarkers() {
    if ( ! spacefinder.data[spacefinder.currentDataSource] || ! spacefinder.data[spacefinder.currentDataSource].markergroup ) {
        return;
    }
    let markersToAdd = [];
    document.querySelectorAll( '.list-place' ).forEach( element => {
        let place = getPlaceById( element.getAttribute( 'data-id' ) );
        if ( ! element.classList.contains( 'hidden' ) ) {
            markersToAdd.push( place.marker );
        }
    });
    spacefinder.data[spacefinder.currentDataSource].markergroup.clearLayers();
    spacefinder.data[spacefinder.currentDataSource].markergroup.addLayers( markersToAdd );
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
 * Updates the data-sortdistance attribute for all places relative
 * to the user position.
 */
export function updateDistances() {
    if ( spacefinder.geoActive ) {
        spacefinder.data[spacefinder.currentDataSource].places.forEach( (place, index) => {
            let d = haversine_distance( spacefinder.personLoc, { lat: place.lat, lng: place.lng } );
            document.querySelector( '[data-id="' + place.id + '"]').setAttribute( 'data-sortdistance', d );
            var dist = ( d > 1000 ) ? ( ( d / 1000 ).toFixed(2) + 'km  away' ) : ( d > 1 ? d + ' metres away': ( d === 1 ? d + ' metre away': 'You are here!' ) );
            document.getElementById( 'distance' + place.id ).innerHTML = dist;
        });
    } else {
        let placenodes = document.querySelectorAll( '.list-place' );
        if ( placenodes !== null ) {
            placenodes.forEach( element => element.setAttribute( 'data-sortdistance', '' ) );
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
    log( 'Geolocation started' );
    spacefinder.geoActive = true;
    document.querySelectorAll( '.geo-button' ).forEach( element => {
        element.classList.add( 'active' );
        element.setAttribute( 'aria-label', 'Stop using my location' );
        element.setAttribute( 'title', 'Stop using my location' );
    });
    sendEvent( 'sfgeostart' );
    activateSort( true, 'distance' );
}

/**
 * Called when LocateControl stops tracking the user's position.
 */
function onGeoDeactivate() {
    log( 'Geolocation stopped' );
    spacefinder.geoActive = false;
    document.querySelectorAll( '.geo-button' ).forEach( element => {
        element.classList.remove( 'active' );
        element.setAttribute( 'aria-label', 'Use my location' );
        element.setAttribute( 'title', 'Use my location' );
    });
    document.getElementById( 'sortdistance' ).setAttribute( 'data-sortdir', '' );
    sendEvent( 'sfgeoend' );
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
    log( 'Location found', event.latlng );
    if ( spacefinder.mapBounds && ! spacefinder.mapBounds.contains( event.latlng ) ) {
        log( 'The location is outside the map, so geolocation has been stopped' );
        spacefinder.locateControl.stop();
        openAlertDialog( 'Sorry...', 'You need to be a bit nearer to use this feature.' );
        return;
    }
    spacefinder.personLoc.lat = event.latlng.lat;
    spacefinder.personLoc.lng = event.latlng.lng;
    updateDistances();
    /* see if the places are sorted by distance */
    let btn = document.querySelector( '#sortdistance[data-sortdir$="sc"' );
    if ( btn !== null ) {
        let sortdir = document.getElementById( 'sortdistance' ).getAttribute( 'data-sortdir' );
        let dir = ( sortdir == 'desc' ) ? false: true;
        sortPlaces( 'sortdistance', dir );
    }
}

/**
 * Called when LocateControl fails to get the user's position (permission
 * denied, position unavailable, or timeout).
 * @param {Object} error
 */
function onGeoError( error ) {
    log.warn( 'Geolocation error: ' + error.message, error );
    if ( error.code === 1 || error.code === 2 ) {
        toggleGeoButton( false );
    }
}

/**
 * Performs checks for geolocation permissions and services when the map has loaded
 */
function checkGeo() {
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
    /* check for permissions query */
    if ( 'permissions' in navigator && navigator.permissions.query ) {
        /* query geolocation permissions */
        navigator.permissions.query( {
            name: 'geolocation'
        } ).then( result => {
            /* save permission state (denied, granted or prompt) */
            spacefinder.permission = result.state;
            log( 'Geolocation permission: ' + result.state );
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
        log( 'Geolocation is not available' );
        toggleGeoButton( false );
    }
}
