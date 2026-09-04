/**
 * Spacefinder layout setup
 * Sets event listeners on top bar navigation buttons
 */
import { spacefinder } from './config.mjs';
import { splog, togglePanel } from './utilities.mjs';

document.addEventListener( 'DOMContentLoaded', () => {
	setupLayout();
    document.addEventListener( 'placesLoaded', setView );
    document.addEventListener( 'sfmapready', setView );
    document.addEventListener( 'filtersloaded', setView );
	document.addEventListener( 'sfresize', setView );
    window.addEventListener( 'resize', () => {
        clearTimeout( spacefinder.resizeTimeout );
        spacefinder.resizeTimeout = setTimeout( () => {
            splog( 'Resize event' );
			document.dispatchEvent( new Event( 'sfresize' ) );
        }, 200);
    });
});

/**
 * Sets up layout event listeners
 */
function setupLayout() {
    /* event listener for top nav buttons */
	document.querySelectorAll( '#top-bar .navbutton' ).forEach( el => {
        el.addEventListener( 'click', event => {
            event.preventDefault();
            /* Dispatch a custom event (viewchange) with the name of the active view */
            document.getElementById( 'top-bar' ).dispatchEvent( new CustomEvent( 'viewchange', {
                bubbles: true,
                cancelable: true,
                composed: false,
                detail: {
                    view: el.getAttribute( 'data-view' )
                }
            } ) );
        });
    });
	/* event listener for view changes triggered by top nav */
	document.addEventListener( 'viewchange', event => {
		let views = [ 'filters', 'list', 'map' ];
		if ( views.indexOf( event.detail.view ) === -1 ) {
			splog( 'Invalid view: ' + event.detail.view );
			return;
		}
		splog( 'View change event: ' + event.detail.view );
		togglePanel( event.detail.view, document.querySelector( '#top-bar .navbutton[data-view="' + event.detail.view + '"]' ).classList.contains( 'inactive' ) );
		if ( window.innerWidth < spacefinder.breakpoints.large ) {
			views.forEach(view => {
				if ( view !== event.detail.view ) {
					togglePanel( view, false );
				}
			});
		}
		/* special case for closing filters view */
		// if ( 0 && event.detail.view == 'filters' && document.querySelector( '#top-bar .navbutton[data-view="filters"]' ).classList.contains( 'active' ) ) {
		// 	togglePanel( 'filters', false );
		// 	togglePanel( 'list', true );
		// } else {
		// 	// views.forEach(view => {
		// 	// 	togglePanel( view, false );
		// 	// });
		// 	togglePanel( event.detail.view, true );
		// 	if ( event.detail.view == 'filters' ) {
		// 		window.setTimeout( function() { 
		// 			document.getElementById( 'search-input' ).focus(); 
		// 		}, 1000 );
		// 	}
		// }
	});
}

/**
 * Sets the initial view of the app
 */
function setView() {
	if ( spacefinder.mapReady && spacefinder.placesLoaded && spacefinder.filtersLoaded ) {
		splog('Setting view' );
		if ( window.innerWidth >= spacefinder.breakpoints.large ) {
			splog('Showing filters panel' );
			togglePanel( 'filters', true );
		} else {
			splog('Hiding filters panel');
			togglePanel( 'filters', false );
		}
		if ( window.innerWidth >= spacefinder.breakpoints.small ) {
			splog('Showing list panel' );
			togglePanel( 'list', true );
		}
	}
}
