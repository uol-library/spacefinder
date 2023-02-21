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
