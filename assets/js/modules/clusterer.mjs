/**
 * Minimal marker clustering for Leaflet 2.0.
 *
 * Leaflet.markercluster has no Leaflet 2.0-compatible release (it still
 * depends on the global L and factory methods removed in 2.0), so this is a
 * small grid-based clusterer covering just what Spacefinder needs: grouping
 * markers into clusters at low zoom levels, expanding to individual markers
 * at spacefinder.markergroup's `disableClusteringAtZoom`, zooming to a
 * cluster's bounds on click, and zooming a specific marker into view.
 * Spiderfying and cluster-boundary polygons are intentionally not
 * implemented - Spacefinder doesn't use them (spiderfyOnMaxZoom is off).
 */
import { LayerGroup, Marker, DivIcon, LatLngBounds } from 'leaflet';

export class SimpleMarkerClusterGroup extends LayerGroup {
    constructor( options = {} ) {
        super();
        this.options = Object.assign({
            maxClusterRadius: 80,
            disableClusteringAtZoom: 18,
            zoomToBoundsOnClick: true
        }, options );
        this._markers = [];
        this._renderLayer = new LayerGroup();
        this._recluster = this._recluster.bind( this );
    }

    onAdd( map ) {
        this._map = map;
        this._renderLayer.addTo( map );
        map.on( 'zoomend moveend', this._recluster );
        this._recluster();
        return this;
    }

    onRemove( map ) {
        map.off( 'zoomend moveend', this._recluster );
        this._renderLayer.remove();
        this._map = null;
        return this;
    }

    addLayer( marker ) {
        this._markers.push( marker );
        this._recluster();
        return this;
    }

    addLayers( markers ) {
        this._markers = this._markers.concat( markers );
        this._recluster();
        return this;
    }

    clearLayers() {
        this._markers = [];
        this._recluster();
        return this;
    }

    /**
     * Zooms/pans until the given marker is shown individually (not part of
     * a cluster), then calls the callback.
     * @param {Marker} marker
     * @param {Function} callback
     */
    zoomToShowLayer( marker, callback ) {
        const isVisible = zoom => this._clusterAtZoom( zoom ).some( c => c.markers.length === 1 && c.markers[0] === marker );
        /* already shown individually at the current view - nothing to do */
        if ( isVisible( this._map.getZoom() ) ) {
            callback();
            return;
        }
        const maxZoom = this._map.getMaxZoom() || this.options.disableClusteringAtZoom;
        let targetZoom = this.options.disableClusteringAtZoom;
        for ( let z = this._map.getZoom(); z <= maxZoom; z++ ) {
            if ( isVisible( z ) ) {
                targetZoom = z;
                break;
            }
        }
        this._map.once( 'moveend', callback );
        this._map.setView( marker.getLatLng(), targetZoom );
    }

    /**
     * Groups the current markers into clusters as they would appear at a
     * given zoom level, without changing the map's view.
     * @param {Number} zoom
     * @returns {Array} array of { latlng, markers } cluster descriptors
     */
    _clusterAtZoom( zoom ) {
        if ( zoom >= this.options.disableClusteringAtZoom ) {
            return this._markers.map( marker => ({ latlng: marker.getLatLng(), markers: [ marker ] }) );
        }
        const cellSize = this.options.maxClusterRadius;
        const cells = new Map();
        this._markers.forEach( marker => {
            const point = this._map.project( marker.getLatLng(), zoom );
            const key = Math.floor( point.x / cellSize ) + ':' + Math.floor( point.y / cellSize );
            if ( ! cells.has( key ) ) {
                cells.set( key, [] );
            }
            cells.get( key ).push( marker );
        });
        return Array.from( cells.values() ).map( markers => {
            const bounds = new LatLngBounds( markers[0].getLatLng(), markers[0].getLatLng() );
            markers.forEach( marker => bounds.extend( marker.getLatLng() ) );
            return { latlng: bounds.getCenter(), markers };
        });
    }

    /**
     * Rebuilds the rendered layer to match the current clustering, but only
     * touches layers that actually need to change. Removing and re-adding a
     * marker that already has an open popup would close that popup (Leaflet
     * closes a marker's bound popup whenever the marker is removed from the
     * map), so unchanged individual markers are left exactly as they are.
     */
    _recluster() {
        if ( ! this._map ) {
            return;
        }
        const desired = new Set();
        this._clusterAtZoom( this._map.getZoom() ).forEach( cluster => {
            desired.add( cluster.markers.length === 1 ? cluster.markers[0] : this._createClusterMarker( cluster ) );
        });
        this._renderLayer.eachLayer( layer => {
            if ( ! desired.has( layer ) ) {
                this._renderLayer.removeLayer( layer );
            }
        });
        desired.forEach( layer => {
            if ( ! this._renderLayer.hasLayer( layer ) ) {
                this._renderLayer.addLayer( layer );
            }
        });
    }

    _createClusterMarker( cluster ) {
        const count = cluster.markers.length;
        const sizeClass = count < 10 ? 'marker-cluster-small' : ( count < 100 ? 'marker-cluster-medium' : 'marker-cluster-large' );
        const icon = new DivIcon({
            html: `<div><span>${count}</span></div>`,
            className: 'marker-cluster ' + sizeClass,
            iconSize: [ 40, 40 ]
        });
        const clusterMarker = new Marker( cluster.latlng, { icon, alt: count + ' spaces' } );
        clusterMarker.on( 'click', () => this._onClusterClick( cluster ) );
        return clusterMarker;
    }

    _onClusterClick( cluster ) {
        if ( ! this.options.zoomToBoundsOnClick ) {
            return;
        }
        const bounds = new LatLngBounds( cluster.markers[0].getLatLng(), cluster.markers[0].getLatLng() );
        cluster.markers.forEach( marker => bounds.extend( marker.getLatLng() ) );
        this._map.fitBounds( bounds, { padding: [ 20, 20 ] } );
    }
}
