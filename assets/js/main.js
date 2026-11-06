import './modules/cookieconsent.mjs';
import './modules/analytics.mjs';
import './modules/components.mjs';
import './modules/layout.mjs';
import './modules/filters.mjs';
import './modules/places.mjs';
import './modules/datasources.mjs';
import './modules/overlays.mjs';
import './modules/routing.mjs';
import './modules/api.mjs';
import './modules/embed.mjs';
import { initMap } from './modules/map.mjs';

document.addEventListener( 'DOMContentLoaded', () => {
    initMap();
});
