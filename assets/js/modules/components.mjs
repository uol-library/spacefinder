/**
 * Modal
 */
import A11yDialog from 'a11y-dialog';
import { spacefinder } from './config.mjs';
import { getRoute, setRoute, getDataSourceRoute } from './utilities.mjs';

/* page dialogs, keyed by page name (the route is page/<name>) */
const pageDialogs = {};

document.addEventListener('DOMContentLoaded', () => {
    /* set the route when page modals are opened, and go back to the previous route when they are closed */
    document.querySelectorAll('.modal-trigger').forEach( mb => {
        let page = mb.getAttribute('data-dialoghash');
        let dialog = getPageDialog( page, mb.getAttribute('data-dialogid') );
        mb.addEventListener('click', e => {
            dialog.previousRoute = getRoute().join( '/' );
            dialog.show();
            setRoute( 'page/' + page );
            document.dispatchEvent(new CustomEvent('sfselectpage', {
                detail: {
                    id: page,
                    name: e.target.textContent
                }
            }));
        });
    });
    /* show and hide pages from the URL (see routing.mjs) */
    document.addEventListener( 'sfshowpage', event => {
        let dialog = pageDialogs[ event.detail.page ];
        if ( dialog && ! dialog.shown ) {
            /* the page was opened directly, so closing it goes to the current dataset */
            dialog.previousRoute = getDataSourceRoute( spacefinder.currentDataSource );
            dialog.show();
        }
    });
    document.addEventListener( 'sfhidepages', () => {
        Object.values( pageDialogs ).forEach( dialog => {
            if ( dialog.shown ) {
                dialog.hide();
            }
        });
    });
});

/**
 * Gets the dialog for a page, creating it if needed
 * (more than one button can open the same page)
 * @param {String} page page name
 * @param {String} dialogid id of the dialog element
 * @return {A11yDialog}
 */
function getPageDialog( page, dialogid ) {
    if ( ! pageDialogs[ page ] ) {
        let dialog = new A11yDialog( document.getElementById( dialogid ) );
        dialog.on('hide', () => {
            /* only change the URL if it is still the page's (it won't be when going back in history) */
            if ( getRoute()[0] === 'page' ) {
                setRoute( dialog.previousRoute || '' );
            }
        });
        pageDialogs[ page ] = dialog;
    }
    return pageDialogs[ page ];
}

/**
 * Re-usable alert dialog
 * @param {String} title 
 * @param {String} content 
 */
export function openAlertDialog( title, content ) {
    document.getElementById('sfalertdialog-title').textContent = title;
    document.getElementById('sfalertdialog-description').innerHTML = content;
    let dialog = new A11yDialog( document.getElementById( 'sfalertdialog' ) );
    dialog.show();
    dialog.on('hide', (element, event) => {
        document.getElementById('sfalertdialog-title').textContent = 'Dialog title';
        document.getElementById('sfalertdialog-description').textContent = 'Dialog description';
    });
}

/**
 * Accordion: a button (with aria-expanded and aria-controls) which shows and
 * hides the content it controls
 */
export class Accordion {
	/**
	 * @param {Element} domNode element containing the button
	 */
	constructor(domNode) {
		this.rootEl = domNode;
		this.buttonEl = this.rootEl.querySelector('button[aria-expanded]');

		const controlsId = this.buttonEl.getAttribute('aria-controls');
		this.contentEl = document.getElementById(controlsId);

		this.open = this.buttonEl.getAttribute('aria-expanded') === 'true';

		// add event listeners
		this.buttonEl.addEventListener('click', this.onButtonClick.bind(this));
	}

	onButtonClick( event ) {
		event.preventDefault();
		this.toggle(!this.open);
	}

	toggle(open) {
		// don't do anything if the open state doesn't change
		if (open === this.open) {
			return;
		}

		// update the internal state
		this.open = open;

		// handle DOM updates
		this.buttonEl.setAttribute('aria-expanded', (open ? 'true': 'false' ));
		if (open) {
			this.contentEl.removeAttribute('hidden');
		} else {
			this.contentEl.setAttribute('hidden','');
		}
	}

	// Add public open and close methods for convenience
	open() {
		this.toggle(true);
	}

	close() {
		this.toggle(false);
	}
}