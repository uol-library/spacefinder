/**
 * Routing requests
 */
document.addEventListener( 'sfmapready', (event) => {
    splog('Map is ready - load initial page/space', 'routing.js');
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
                let space = getSpaceBySlug( hp[2] );
                let spacenode = getSpaceNodeById( space.id );
                splog( 'Checking to see if the space is already active', 'routing.js' );
                if ( ! spacenode.classList.contains( 'active' ) ) {
                    splog( 'Activating space', 'routing.js' );
                    document.dispatchEvent( new CustomEvent( 'spaceSelected', { bubbles: true, detail: { id: space.id, src: 'load' } } ) );
                    setElementFocus( 'space' + space.id );
                } else {
                    splog( 'Space is already active', 'routing.js' );
                }
            }
        }
    }
    return true;
}
