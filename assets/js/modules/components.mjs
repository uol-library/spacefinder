/**
 * Modal
 */
import A11yDialog from 'a11y-dialog';

document.addEventListener('DOMContentLoaded', () => {
    /* change location hash when modals are activated */
    document.querySelectorAll('.modal-trigger').forEach( mb => {
        let dialogid = mb.getAttribute('data-dialogid');
        let pagehash = mb.getAttribute('data-dialoghash');
        let dialog = new A11yDialog( document.getElementById( dialogid ) );
        mb.addEventListener('click', e => {
            dialog.show();
            dialog.originalpagehash = window.location.hash;
            window.location.hash = '#/page/'+pagehash;
            document.dispatchEvent(new CustomEvent('sfselectpage', {
                detail: {
                    id: pagehash,
                    name: e.target.textContent
                }
            }));
        });
        dialog.on('hide', (element, event) => {
            window.location.hash = dialog.originalpagehash
        });
    });
});

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
 * Accordion
 */
export class Accordion {
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