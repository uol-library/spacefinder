/**
 * Routing requests
 */
export function setUpRouter() {
    document.body.addEventListener( 'click', (e) => {
        if ( e.target.matches( '[data-link]' ) ) {
            e.preventDefault();
            navigateTo( e.target.href );
        }
    });
    window.addEventListener("popstate", router);
    router();
}

/**
 * Navigate to a given URL (from an anchor with the data-link attribute)
 * @param String url
 */
const navigateTo = ( url ) => {
    window.history.pushState( null, null, url );
    router();
}

/**
 * 
 */
const router = () => {
    const path = window.location.pathname;

    /* get the data source from the first part of the path */
    if ( ! dataSource ) {
        dataSource = spacefinder.defaultDataSource;
        loadData( dataSource ).then( loadDataModule ( dataSource ) );

    }
}

/**
 * 
 */
const loadData( src ) {
    return new Promise( ( resolve, reject ) -> {
        
    }
}
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
