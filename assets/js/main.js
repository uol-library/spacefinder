import './modules/cookieconsent.mjs';
import './modules/analytics.mjs';
import './modules/components.mjs';
import './modules/layout.mjs';
import './modules/filters.mjs';
import './modules/spaces.mjs';
import './modules/routing.mjs';
import { initMap } from './modules/map.mjs';

document.addEventListener( 'DOMContentLoaded', () => {
    initMap();
});
