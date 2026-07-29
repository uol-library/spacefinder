/**
 * Modal
 */
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
            document.dispatchEvent(new CustomEvent('sfanalytics', {
                detail: {
                    type: 'select',
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
function openAlertDialog( title, content ) {
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

/**
 * Cookie Consent configuration
 * @see https://github.com/orestbida/cookieconsent
 */
var cc = initCookieConsent();

cc.run({
    current_lang: 'en',
    page_scripts: true,
    gui_options: {
        consent_modal: {
            layout: 'box', 
            position: 'bottom center',
            transition: 'slide', 
            swap_buttons: false
        },
        settings_modal: {
            layout: 'bar',
            position: 'left',
            transition: 'slide'
        }
    },
    onAccept: focusOnMain,
    onChange: focusOnMain,
    onFirstAction: focusOnMain,
    languages: {
        'en': {
            consent_modal: {
                title: 'Tell us whether you accept cookies',
                description: 'This website uses essential cookies to ensure its proper operation, performance cookies to help it work faster, and tracking cookies to understand how you interact with it. Performance and tracking cookies are set automatically as this application is currently being assessed in a pilot, but you can opt out at any stage. <button type="button" data-cc="c-settings" class="cc-link">Let me choose</button>',
                primary_btn: {
                    text: 'Accept all',
                    role: 'accept_all'
                },
                secondary_btn: {
                    text: 'Reject all',
                    role: 'accept_necessary'
                }
            },
            settings_modal: {
                title: 'Cookie preferences',
                save_settings_btn: 'Save settings',
                accept_all_btn: 'Accept all',
                reject_all_btn: 'Reject all',
                close_btn_label: 'Close',
                blocks: [
                    {
                        title: 'Cookie usage',
                        description: 'This website uses cookies to enhance your online experience. You can choose for each category to opt-in/out whenever you want. For more details relative to cookies and other sensitive data, please read the full <a href="#" class="cc-link modal-trigger" data-dialoghash="privacy" data-dialogid="privacy-page">privacy policy</a>.'
                    }, {
                        title: 'Strictly necessary cookies',
                        description: 'These cookies are essential for the proper functioning of this website. Without these cookies, the website would not remember your cookie preferences.',
                        toggle: {
                            value: 'necessary',
                            enabled: true,
                            readonly: true
                        }
                    }, {
                        title: 'Performance cookies',
                        description: 'These cookies allow the website to store data so the website works more efficiently between visits.',
                        toggle: {
                            value: 'performance',
                            enabled: false,
                            readonly: false
                        }
                    }, {
                        title: 'Analytics cookies',
                        description: 'Analytics tools set cookies that store anonymised information about how you got to the site and what you click on while you are visiting the site. We do not allow other organisations to use or share the data about how you use this site.',
                        toggle: {
                            value: 'analytics',
                            enabled: false,
                            readonly: false
                        }
                    }, {
                        title: 'More information',
                        description: 'You can manage your privacy settings, including cookies, through your browser settings. Further information about cookies can be found on the <a target="_ico" href="https://ico.org.uk/">Information Commissioners Office website</a>.',
                    }
                ]
            }
        }
    }
});
spacefinder.canUseLocalStorage = function(){
    return cc.allowedCategory('performance');
}
function showCookieSettings() {
    cc.showSettings();
}
function focusOnMain() {
    document.getElementById( 'maincontainer' ).setAttribute( 'tabindex', '-1' );
    document.getElementById( 'maincontainer' ).focus();
}

/**
 * Google Analytics event triggers
 * 
 * Adds an event listener for the sfanalytics event, which is called throughout
 * SpaceFinder when things happen which should be logged to GA.
 * 
 * sfanalytics is a Custom Event which contains information in the detail property:
 * 
 * @param {Custom Event} e sfanalytics event
 * @param e.detail.type the type of event being logged (search, filter, geostart, geoend, select)
 * @param e.detail.terms the terms used in the search or filter for the search and filter types
 * @param e.detail.filtername the name of the filter for the filter type
 * @param e.detail.src the selection source for the select type (map or list)
 * @param e.detail.id the ID of the space selected for the select type
 * @param e.detail.name the title of the space selected for the select type
 */
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener( 'sfanalytics', e => {
        if ( typeof gtag == 'function' ) {
            if ( e.detail.type == 'search' ) {
                gtag('event','search', {
                    search_term: e.detail.terms
                });
            } else if ( e.detail.type == 'filter' ) {
                gtag('event','select_content', {
                    'content_type': e.detail.filtername,
                    'item_id': e.detail.terms
                });
            } else if ( e.detail.type == 'geostart' ) {
                gtag('event','level_start', {
                    'level_name': 'Geolocation activated'
                });
            } else if ( e.detail.type == 'geoend' ) {
                gtag('event','level_end', {
                    'level_name': 'Geolocation deactivated'
                });
            } else if (e.detail.type == 'select') {
                gtag('event', 'select_item', {
                    item_list_id: e.detail.src,
                    item_list_name: e.detail.src,
                    items: [
                        {
                            item_id: e.detail.id,
                            item_name: e.detail.name
                        }
                    ]
                });
            }
        }
    });
});