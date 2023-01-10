/**
 * Routing requests
 */
document.addEventListener( 'DOMContentLoaded', () => {
    checkInitialPageLoad();
});

function checkInitialPageLoad() {
    /* load spaces and pages from URL anchor */
    document.addEventListener( 'sfmapready', event => {
        if ( window.location.hash ) {
            let hp = window.location.hash.split( '/' );
            if ( hp.length === 3 ) {
                if ( hp[1] == 'space' ) {
                    let space = getSpaceBySlug( hp[2] );
                    document.dispatchEvent( new CustomEvent( 'spaceSelected', { bubbles: true, detail: { id: space.id, src: 'load' } } ) );
                    setElementFocus( 'space' + space.id );
                }
                if ( hp[1] == 'page' ) {
                    let pagedialog = document.getElementById( hp[2] + '-page' );
                    if ( pagedialog !== null ) {
                        let dialog = new A11yDialog( pagedialog );
                        dialog.show();
                        dialog.on('hide', (element, event) => {
                            setHash( '' );
                        });
                    }
                }
            }
        }
    });
}
