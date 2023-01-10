/**
 * Tool used to process JSON files in spaces directory
 */
const fs = require('fs');
const path = require('path');

/* get a list of files from the spaces directory */
const spacefiles = fs.readdirSync( path.resolve( __dirname, '../spaces' ), { encoding: 'utf8' } );
/* loop through the files */
spacefiles.forEach( filename => {
    if ( filename !== '.' && filename !== '..' ) {
        /* read file */
        let spaceData = fs.readFileSync( path.resolve( __dirname, '../spaces/', filename ) );
        /* parse file contents */
        const spaceJSON = JSON.parse( spaceData );
        /* parse GeoJSON string in location */
        let geoJSON = JSON.parse( spaceJSON.location );

        /*--------------*/
        /* process data */
        /*--------------*/

        /* write results to file */
        fs.writeFile( path.resolve( __dirname, '../spaces/'+spaceJSON.id+'.json' ), JSON.stringify( spaceJSON, null, '    ' ), err => {
            if (err) {
                console.error( err );
                return;
            }
        });
    }
});

/**
 * Helper function to create page slugs from titles
 * @param {String} str 
 * @returns {String}
 */
function string_to_slug (str) {
    str = str.replace(/^\s+|\s+$/g, ''); // trim
    str = str.toLowerCase();
  
    /* remove accents, swap ñ for n, etc. */
    var from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
    var to   = "aaaaeeeeiiiioooouuuunc------";
    for (var i=0, l=from.length ; i<l ; i++) {
        str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
    }

    str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
        .replace(/\s+/g, '-') // collapse whitespace and replace by -
        .replace(/-+/g, '-'); // collapse dashes

    return str;
}
