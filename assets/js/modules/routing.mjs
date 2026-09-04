/**
 * Routing requests
 */
import { getPlaceBySlug, getPlaceNodeById, splog, setElementFocus } from './utilities.mjs';

document.addEventListener( 'sfmapready', (event) => {
    splog('Map is ready - load initial page/space');
    on_hash_change( event );
    window.addEventListener( 'hashchange', event => {
        on_hash_change( event );
    });
});

/**
 * Loads a space when the hash changes (if it is not already selected)
 * or activates page modal
 */
function on_hash_change( event ) {
    if ( window.location.hash ) {
        let hp = window.location.hash.split( '/' );
        if ( hp.length === 3 ) {
            if ( hp[1] == 'space' ) {
                let space = getPlaceBySlug( hp[2] );
                let spacenode = getPlaceNodeById( space.id );
                splog( 'Checking to see if the space is already active' );
                if ( ! spacenode.classList.contains( 'active' ) ) {
                    splog( 'Activating space' );
                    document.dispatchEvent( new CustomEvent( 'placeSelected', { bubbles: true, detail: { id: space.id, src: 'load' } } ) );
                    setElementFocus( 'space' + space.id );
                } else {
                    splog( 'Space is already active' );
                }
            }
        }
    }
    return true;
}
