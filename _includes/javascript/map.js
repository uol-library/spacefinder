/**
 * Leafletjs functions for SpaceFinder
 */
document.addEventListener( 'DOMContentLoaded', () => {
    initMap();
});

/**
 * Initialise map and set listeners to set up markers when loaded
 */
function initMap() {
    splog( 'initMap', 'map.js' );
    document.addEventListener( 'sfmaploaded', checkGeo );
    document.addEventListener( 'filtersapplied', filterMarkers );
    document.addEventListener( 'spacesloaded', maybeSetupMap );
    document.addEventListener( 'filtersloaded', maybeSetupMap );
    document.addEventListener( 'sfmaploaded', maybeSetupMap );
    spacefinder.map = L.map( 'map' ).setView([spacefinder.currentLoc.lat, spacefinder.currentLoc.lng], spacefinder.startZoom );
    /* change leaflet attribution */
    spacefinder.map.attributionControl.setPrefix( '<a href="https://leafletjs.com" target="external" title="A JavaScript library for interactive maps" aria-label="Leaflet - a JavaScript library for interactive maps"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="12" height="8"><path fill="#4C7BE1" d="M0 0h12v4H0z"></path><path fill="#FFD500" d="M0 4h12v3H0z"></path><path fill="#E0BC00" d="M0 7h12v1H0z"></path></svg> Leaflet</a>' );
    spacefinder.osm = L.tileLayer( 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© <a target="external" href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo( spacefinder.map );
    spacefinder.esri_sat = L.tileLayer( 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
	    attribution: 'Tiles © Esri - Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });
    spacefinder.map.addControl( new L.Control.Fullscreen( { position: 'topright' } ) );
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
    if ( spacefinder.mapLoaded && spacefinder.spacesLoaded && spacefinder.filtersLoaded ) {

        /* collect latLng coordinates here to define map bounds */
        let pointsArray = [];
        
        /**
         * Initialise marker cluster group
         * @see https://github.com/Leaflet/Leaflet.markercluster
         */
        spacefinder.markergroup = L.markerClusterGroup({
			disableClusteringAtZoom: 17,
			zoomToBoundsOnClick: true,
			spiderfyOnMaxZoom: false,
			polygonOptions: {
				color: '#c70000',
				fillColor: '#c70000'
			}
		});
        
        /* add each space to the map using a marker */
        for ( let i = 0; i < spacefinder.spaces.length; i++ ) {
            if ( spacefinder.spaces[i].lat && spacefinder.spaces[i].lng ) {
                var spacePosition = L.latLng( spacefinder.spaces[i].lat, spacefinder.spaces[i].lng );
                pointsArray.push( [ spacefinder.spaces[i].lat, spacefinder.spaces[i].lng ] );
                spacefinder.spaces[i].marker = L.marker( spacePosition, {
                    alt: spacefinder.spaces[i].title,
                    title: spacefinder.spaces[i].title,
                    icon: getSVGIcon( 'space-marker' )
                });
                spacefinder.markergroup.addLayer( spacefinder.spaces[i].marker );
                /* set the popup for the marker */
                spacefinder.spaces[i].popup = L.popup().setContent( getSpaceInfoWindowContent( spacefinder.spaces[i] ) );
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
         * Create a button to recentre the map when geolocation is active and the user
         * drags the map off centre (the map should be centred on the user position)
         */
        L.Control.RecentreControl = L.Control.extend({
            onAdd: function(map) {
                var container = L.DomUtil.create( 'div', 'leaflet-control-recentre' );
                this._recentreButton = L.DomUtil.create( 'button', 'maprecentre-button icon-direction', container );
                this._recentreButton.innerHTML = 'Recentre';
                this._recentreButton.setAttribute( 'aria-label', 'Recentre map on my location' );
                this._recentreButton.setAttribute( 'title', 'Recentre map on my location' );
                L.DomEvent.on( this._recentreButton, 'mousedown dblclick', L.DomEvent.stopPropagation )
                    .on( this._recentreButton, 'click', L.DomEvent.stop )
                    .on( this._recentreButton, 'click', this._recentreMap, this );
                return container;
            },
            onRemove: function( map ) {
                splog( 'removing recentre control', 'map.js' );
                L.DomEvent.off( this._recentreButton, 'click mousedown dblclick' );
            },
            _recentreMap: function() {
                let newCenter = geolocationActive() ? spacefinder.personLoc: spacefinder.currentLoc;
                spacefinder.map.panTo( newCenter );
                spacefinder.recentreControl = null;
                this.remove();
            }
        });

        /* constructor */
        L.control.recentreControl = function( opts ) {
            return new L.Control.RecentreControl( opts );
        }

        /* add recentre button when map is moved */
        spacefinder.map.on( 'dragend', event => {
            if ( geolocationActive() && ! spacefinder.recentreControl ) {
                splog( 'adding recentre control as map was dragged by user', 'map.js' );
                spacefinder.recentreControl = L.control.recentreControl( { position: 'bottomleft' } ).addTo( spacefinder.map );
            }
        });
        
        /**
         * Create a button to switch base layers between streets (OpenStreetMap)
         * and satellite (ESRI).
         */
        L.Control.MapTypeControl = L.Control.extend({
            onAdd: function(map) {
                let sd = spacefinder.viewdata.satellite;
                var container = L.DomUtil.create('div', 'leaflet-control-maptype');
                this._mapTypeButton = L.DomUtil.create( 'button', 'maptype-button ' + sd.btnClass, container );
                const mapTypeButton = document.createElement( 'button' );
                this._mapTypeButton.innerHTML = sd.btnText;
                this._mapTypeButton.setAttribute( 'aria-label', sd.btnLabel );
                this._mapTypeButton.setAttribute( 'title', sd.btnLabel );
                this._mapTypeButton.setAttribute( 'data-currentType', 'street' );
                L.DomEvent.on( this._mapTypeButton, 'mousedown dblclick', L.DomEvent.stopPropagation )
                    .on( this._mapTypeButton, 'click', L.DomEvent.stop )
                    .on( this._mapTypeButton, 'click', this._switchType, this );
                return container;
            },
            onRemove: function( map ) {
                L.DomEvent.off( this._mapTypeButton, 'click mousedown dblclick' );
            },
            _switchType: function() {
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
        });

        /* constructor */
        L.control.mapTypeControl = function( opts ) {
            return new L.Control.MapTypeControl( opts );
        }

        /* add to map */
        L.control.mapTypeControl( { position: 'topright' } ).addTo( spacefinder.map );

        
        /* let eveyone know we are ready */
        spacefinder.mapReady = true;
        document.dispatchEvent( new Event( 'sfmapready' ) );
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
	return L.divIcon({
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
    let newCenter = geolocationActive() ? spacefinder.personLoc: spacefinder.currentLoc;
    spacefinder.map.panTo( newCenter );
}

/**
 * Zooms the map to show a particular space
 * @param {Object} space
 */
 function zoomMapToSpace( spaceid ) {
    splog( 'zoomMapToSpace', 'map.js' );
    let space = getSpaceById( spaceid );
    spacefinder.markergroup.zoomToShowLayer( space.marker, function(){
        let newCenter = L.latLng( space.lat, space.lng );
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
        let space = getSpaceById( element.getAttribute( 'data-id' ) );
        if ( ! element.classList.contains( 'hidden' ) ) {
            markersToAdd.push( space.marker );
        }
    });
    spacefinder.markergroup.clearLayers();
    spacefinder.markergroup.addLayers( markersToAdd );
}

/*******************************************************************
 * GEOLOCATION
 *******************************************************************/

/**
 * Toggle the disabled attribute of the geolocation control
 * @param {boolean} enable which way to toggle
 */
function toggleGeolocation( enable ) {
    splog( 'toggleGeolocation', 'map.js' );
    if ( enable ) {
        document.querySelectorAll( '.geo-button' ).forEach( element => element.disabled = false );
    } else {
        document.querySelectorAll( '.geo-button' ).forEach( element => element.disabled = true );
    }
}

/**
 * Toggle the active class of the geolocation control.
 * Also adds/removes the event listener to update the user's position
 * and adds / removes the person marker.
 * @param {boolean} activate which way to toggle
 */
function activateGeolocation( activate ) {
    splog( 'activateGeolocation', 'map.js' );
    if ( activate ) {
        document.querySelectorAll( '.geo-button' ).forEach( element => {
            element.classList.add( 'active' );
            element.setAttribute( 'aria-label', 'Stop using my location' );
            element.setAttribute( 'title', 'Stop using my location' );
        });
        document.addEventListener( 'userlocationchanged', movePersonMarker );
        document.dispatchEvent(new CustomEvent( 'sfanalytics', {
            detail: {
                type: 'geostart'
            }
        }));
    } else {
        document.querySelectorAll( '.geo-button' ).forEach( element => {
            element.classList.remove( 'active' );
            element.setAttribute( 'aria-label', 'Use my location' );
            element.setAttribute( 'title', 'Use my location' );
        });
        document.removeEventListener( 'userlocationchanged', movePersonMarker );
        /* remove sorting indicator from all buttons */
        document.getElementById( 'sortdistance' ).setAttribute( 'data-sortdir', '' );
        document.dispatchEvent(new CustomEvent( 'sfanalytics', {
            detail: {
                type: 'geoend'
            }
        }));
    }
    updateDistances();
    activateSort( activate, 'distance' );
}

/**
 * Moves the person marker to the user's position and centres the 
 * map on that position. The property spacefinder.personLoc is used
 * for the user position - this is updated in the geolocation.watchPosition
 * event listener. In addition to moving the person marker, distances
 * from the person to each space are updated, and if spaces are sorted
 * by distance, the sort order is updated.
 * @see getUserPosition()
 */
function movePersonMarker() {
    splog( 'movePersonMarker', 'map.js' );
    /* move person marker */
    if ( spacefinder.personMarker ) {
        spacefinder.personMarker.setLatLng( spacefinder.personLoc );
    }
    /* update distances to each space */
    updateDistances();
    /* see if the spaces are sorted by distance */
    let btn = document.querySelector( '#sortdistance[data-sortdir$="sc"' );
    if ( btn !== null ) {
        /* determine direction from current attribute value */
        let sortdir = document.getElementById( 'sortdistance' ).getAttribute( 'data-sortdir' );
        let dir = ( sortdir == 'desc' ) ? false: true;
        /* re-sort spaces */
        sortSpaces( 'sortdistance', dir );
    }
    /* centre the map on the person */
    spacefinder.map.panTo( spacefinder.personLoc );
}

/**
 * Test to see if geolocation services are enabled
 * @returns {boolean}
 */
function geolocationEnabled() {
    splog( 'geolocationEnabled', 'map.js' );
    const btn = document.querySelector( '.geo-button' );
    if ( btn !== null ) {
        return btn.disabled == false;
    }
    return false;
}

/**
 * Test to see if geolocation services are active
 * @returns {boolean}
 */
function geolocationActive() {
    splog( 'geolocationActive', 'map.js' );
    return ( document.querySelector( '.geo-button.active' ) !== null ? true: false );
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
            if ( 'denied' == result.state ) {
                toggleGeolocation( false );
            } else {
                toggleGeolocation( true );
            }
            result.onchange = function() {
                spacefinder.permission = result.state;
                if ( 'denied' == result.state ) {
                    toggleGeolocation( false );
                } else {
                    toggleGeolocation( true );
                }
            }
        }).catch(error => {
            toggleGeolocation( false );
        });
    }
}

/**
 * Tests for availability of geolocation on client. If available,
 * adds buttons to activate it and adds listeners to buttons.
 */
function checkGeoAvailable() {
    splog( 'checkGeoAvailable', 'map.js' );
    if ( 'geolocation' in navigator ) {
        /* make button for map to let user activate geolocation */
        L.Control.geoControl = L.Control.extend({
            onAdd: function(map) {
                var container = L.DomUtil.create('div', 'leaflet-control-geolocation');
                const locationButton = document.createElement( 'button' );
                locationButton.innerHTML = '';
                locationButton.classList.add( 'geo-button' );
                locationButton.classList.add( 'icon-my-location' );
                locationButton.setAttribute( 'aria-label', 'Use my location' );
                locationButton.setAttribute( 'title', 'Use my location' );
                container.appendChild( locationButton );
                return container;
            },
            onRemove: function(map) {}
        });
        L.control.geoControl = function(opts) {
            return new L.Control.geoControl(opts);
        }
        L.control.geoControl( { position: 'topright' } ).addTo( spacefinder.map );

        /* add listener to buttons to toggle geolocation */
        document.addEventListener( 'click', event => {
            if ( event.target.matches( '.geo-button' ) ) {
                if ( ! geolocationEnabled() ) {
                    return;
                }
                if ( geolocationActive() ) {
                    /* disable geolocation */
                    forgetUserPosition()
                } else {
                    /* get the current position */
                    getUserPosition();
                }
            }
        });

    } else {
        activateGeolocation( false );
        toggleGeolocation( false );
    }
}

/**
 * Cancels the watchPosition listener, removes the person marker,
 * and deactivates geolocation controls.
 */
function forgetUserPosition() {
    splog( 'forgetUserPosition', 'map.js' );
    /* stop watching user position */
    navigator.geolocation.clearWatch( spacefinder.watchID );
    /* remove person marker from map */
    spacefinder.personMarker.remove();
    /* remove recentre control if it is on the map */
    if ( spacefinder.recentreControl ) {
        spacefinder.recentreControl.remove();
        spacefinder.recentreControl = null;
    }
    /* make location buttons inactive */
    activateGeolocation( false );
    /* re-centre map */
    spacefinder.map.panTo( spacefinder.currentLoc );
}
/**
 * Gets the current position of the user device, centres the
 * map on that position and adds a marker. Then sets a 
 * geolocation.watchPosition listener to update the position 
 * when it changes.
 * TODO: watch for dragging of map by user - this should disable
 * recentring the map on the user position and (possibly) show a 
 * button to recentre? (but not moving the marker)
 */
function getUserPosition() {
    splog( 'getUserPosition', 'map.js' );
	navigator.geolocation.getCurrentPosition( position => {
        /* centre the map on the user coordinates */
		spacefinder.personLoc.lat = position.coords.latitude;
		spacefinder.personLoc.lng = position.coords.longitude;
        if ( ! spacefinder.mapBounds.contains( spacefinder.personLoc ) ) {
            toggleGeolocation( false );
            openAlertDialog( 'Sorry...', 'You need to be a bit nearer to use this feature.' );
            return;
        }
        /* centre the map on the user position */
		spacefinder.map.panTo( spacefinder.personLoc );
        /* add a person marker */
		spacefinder.personMarker = L.marker( spacefinder.personLoc, {
            alt:   'Your location',
            title: 'Your location',
            icon:  getSVGIcon( 'person-marker' )
        } ).addTo( spacefinder.map );
        activateGeolocation( true );
        /* watch for changes in the user position and update the map by firing an event */
		spacefinder.watchID = navigator.geolocation.watchPosition( position => {
            if ( ! ( spacefinder.personLoc.lat == position.coords.latitude && spacefinder.personLoc.lng == position.coords.longitude ) ) {
                spacefinder.personLoc.lat = position.coords.latitude;
                spacefinder.personLoc.lng = position.coords.longitude;
                document.dispatchEvent( new Event( 'userlocationchanged' ) );
            }
        }, error => {
			navigator.geolocation.clearWatch( spacefinder.watchID );
            activateGeolocation( false );
		});

    }, (error) => {
        activateGeolocation( false );
		switch (error.code) {
			case 1:
				// Permission denied - The acquisition of the geolocation information failed because the page didn't have the permission to do it.
			case 2:
				// Position unavailable - The acquisition of the geolocation failed because at least one internal source of position returned an internal error.
                toggleGeolocation( false );
                break;
			case 3:
				// Timeout - The time allowed to acquire the geolocation was reached before the information was obtained.
		}
	});
}

/**
 * Updates the data-sortdistance attribute for all spaces relative
 * to the user position.
 */
function updateDistances() {
    splog( 'updateDistances', 'map.js' );
    if ( geolocationActive() ) {
        spacefinder.spaces.forEach( (space, index) => {
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
/********************************************************
 * Leaflet fullscreen plugin
 * 
 * Modified to use a button rather than a link
 * 
 * @see https://github.com/Leaflet/Leaflet.fullscreen
 * 
 ********************************************************/
(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(['leaflet'], factory);
    } else if (typeof module !== 'undefined') {
        // Node/CommonJS
        module.exports = factory(require('leaflet'));
    } else {
        // Browser globals
        if (typeof window.L === 'undefined') {
            throw new Error('Leaflet must be loaded first');
        }
        factory(window.L);
    }
}(function (L) {
    L.Control.Fullscreen = L.Control.extend({
        options: {
            position: 'topleft',
            title: {
                'false': 'View Fullscreen',
                'true': 'Exit Fullscreen'
            }
        },

        onAdd: function (map) {
            var container = L.DomUtil.create('div', 'leaflet-control-fullscreen');
            this.fsbutton = document.createElement( 'button' );
            this.fsbutton.innerHTML = '<span class="visuallyhidden"></span>';
            this.fsbutton.classList.add( 'mapfullscreen-button' );
            this.fsbutton.classList.add( 'icon-resize-full' );
            container.appendChild( this.fsbutton );
        
            this._map = map;
            this._map.on('fullscreenchange', this._toggleTitle, this);
            this._toggleTitle();

            L.DomEvent.on(this.fsbutton, 'click', this._click, this);

            return container;
        },

        _click: function (e) {
            L.DomEvent.stopPropagation(e);
            L.DomEvent.preventDefault(e);
            this._map.toggleFullscreen(this.options);
        },

        _toggleTitle: function() {
            if ( this._map.isFullscreen() ) {
                this.fsbutton.classList.remove( 'icon-resize-full' );
                this.fsbutton.classList.add( 'icon-resize-small' );
            } else {
                this.fsbutton.classList.remove( 'icon-resize-small' );
                this.fsbutton.classList.add( 'icon-resize-full' );
            }
            this.fsbutton.setAttribute( 'aria-label', this.options.title[this._map.isFullscreen()] );
            this.fsbutton.setAttribute( 'title', this.options.title[this._map.isFullscreen()] );
            this.fsbutton.querySelector( 'span' ).innerText = this.options.title[this._map.isFullscreen()];
        }
    });

    L.Map.include({
        isFullscreen: function () {
            return this._isFullscreen || false;
        },

        toggleFullscreen: function (options) {
            var container = this.getContainer();
            if (this.isFullscreen()) {
                if (options && options.pseudoFullscreen) {
                    this._disablePseudoFullscreen(container);
                } else if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.webkitCancelFullScreen) {
                    document.webkitCancelFullScreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                } else {
                    this._disablePseudoFullscreen(container);
                }
            } else {
                if (options && options.pseudoFullscreen) {
                    this._enablePseudoFullscreen(container);
                } else if (container.requestFullscreen) {
                    container.requestFullscreen();
                } else if (container.mozRequestFullScreen) {
                    container.mozRequestFullScreen();
                } else if (container.webkitRequestFullscreen) {
                    container.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
                } else if (container.msRequestFullscreen) {
                    container.msRequestFullscreen();
                } else {
                    this._enablePseudoFullscreen(container);
                }
            }

        },

        _enablePseudoFullscreen: function (container) {
            L.DomUtil.addClass(container, 'leaflet-pseudo-fullscreen');
            this._setFullscreen(true);
            this.fire('fullscreenchange');
        },

        _disablePseudoFullscreen: function (container) {
            L.DomUtil.removeClass(container, 'leaflet-pseudo-fullscreen');
            this._setFullscreen(false);
            this.fire('fullscreenchange');
        },

        _setFullscreen: function(fullscreen) {
            this._isFullscreen = fullscreen;
            var container = this.getContainer();
            if (fullscreen) {
                L.DomUtil.addClass(container, 'leaflet-fullscreen-on');
            } else {
                L.DomUtil.removeClass(container, 'leaflet-fullscreen-on');
            }
            this.invalidateSize();
        },

        _onFullscreenChange: function (e) {
            var fullscreenElement =
                document.fullscreenElement ||
                document.mozFullScreenElement ||
                document.webkitFullscreenElement ||
                document.msFullscreenElement;

            if (fullscreenElement === this.getContainer() && !this._isFullscreen) {
                this._setFullscreen(true);
                this.fire('fullscreenchange');
            } else if (fullscreenElement !== this.getContainer() && this._isFullscreen) {
                this._setFullscreen(false);
                this.fire('fullscreenchange');
            }
        }
    });

    L.Map.mergeOptions({
        fullscreenControl: false
    });

    L.Map.addInitHook(function () {
        if (this.options.fullscreenControl) {
            this.fullscreenControl = new L.Control.Fullscreen(this.options.fullscreenControl);
            this.addControl(this.fullscreenControl);
        }

        var fullscreenchange;

        if ('onfullscreenchange' in document) {
            fullscreenchange = 'fullscreenchange';
        } else if ('onmozfullscreenchange' in document) {
            fullscreenchange = 'mozfullscreenchange';
        } else if ('onwebkitfullscreenchange' in document) {
            fullscreenchange = 'webkitfullscreenchange';
        } else if ('onmsfullscreenchange' in document) {
            fullscreenchange = 'MSFullscreenChange';
        }

        if (fullscreenchange) {
            var onFullscreenChange = L.bind(this._onFullscreenChange, this);

            this.whenReady(function () {
                L.DomEvent.on(document, fullscreenchange, onFullscreenChange);
            });

            this.on('unload', function () {
                L.DomEvent.off(document, fullscreenchange, onFullscreenChange);
            });
        }
    });

    L.control.fullscreen = function (options) {
        return new L.Control.Fullscreen(options);
    };
}));