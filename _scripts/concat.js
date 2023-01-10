/**
 * This script takes all the files within the spaces directory and compiles a master data file
 * in the root of the repository called spaces.json
 */
const fs = require('fs');
const path = require('path');
const spacefiles = fs.readdirSync( path.resolve( __dirname, '../spaces' ), { encoding: 'utf8' } );
const allSpaces = [];
spacefiles.forEach( filename => {
    if ( filename !== '.' && filename !== '..' ) {
        var data = fs.readFileSync( path.resolve( __dirname, '../spaces/', filename ) );
        var jsondata = JSON.parse( data );
        if ( jsondata.published ) {
            var geodata = JSON.parse( jsondata.location );
            if ( geodata && geodata.coordinates && geodata.coordinates.length == 2 ) {
                jsondata.lat = geodata.coordinates[1];
                jsondata.lng = geodata.coordinates[0];
            } else {
                jsondata.lat = '';
                jsondata.lng = '';
            }
            allSpaces.push( jsondata );
        }
    }
});
fs.writeFileSync( path.resolve( __dirname, '../spaces.json' ), JSON.stringify( allSpaces ) );



