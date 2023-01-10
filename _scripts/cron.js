/**
 * Scheduled jobs for Spacefinder
 * 
 * Cron-style update tool used to process JSON files in spaces directory
 * according to settings in the "crontab" (_data/crontab.json).
 * 
 * Each "job" should be a JSON object with a date (d-m-yyyy) and updates array.
 * 
 * Updates match spaces on whatever field is specified in the match property of
 * an update, with the value given in the term property of the update. This way, 
 * multiple spaces can be matched to update them with the same information. 
 * 
 * Updates can be carried out on a single field or multiple fields for each space
 * matched - single fields use the properties field and value, multiple fields use
 * the properties fields and values (which must be identically sized arrays).
 * 
 * This is run daily by the GitHub action cron-updates (.github/workflows/cronUpdates.yml).
 */
const fs = require('fs');
const path = require('path');
const { exit } = require('process');

const crontab = fs.readFileSync( path.resolve( __dirname, '../_data/crontab.json' ), { encoding: 'utf8' } );
const spacefiles = fs.readdirSync( path.resolve( __dirname, '../spaces' ), { encoding: 'utf8' } );
const cronJSON = JSON.parse( crontab );
const today = new Date();
const checkDay = today.getDate() + '-' + ( today.getMonth() + 1 ) + '-' + today.getFullYear();
const newCrontab = {jobs:[]};
let updateCrontab = false;
cronJSON.jobs.forEach( job => {
    /* first match the date */
    if ( job.date == checkDay ) {
        /* match for today - flag crontab file for update and loop through space files */
        updateCrontab = true;
        const spacefiles = fs.readdirSync( path.resolve( __dirname, '../spaces' ), { encoding: 'utf8' } );
        spacefiles.forEach( filename => {
            if ( filename !== '.' && filename !== '..' ) {
                /* get and parse data for space */
                let spaceData = fs.readFileSync( path.resolve( __dirname, '../spaces/', filename ) );
                const spaceJSON = JSON.parse( spaceData );
                /* go through jobs looking for matches */
                job.updates.forEach( s => {
                    if ( spaceJSON[s.match] == s.term ) {
                        if ( s.hasOwnProperty( 'field' ) && s.hasOwnProperty( 'value' ) ) {
                            spaceJSON[s.field] = s.value;
                        } else if ( s.hasOwnProperty( 'fields' ) && s.hasOwnProperty( 'values' ) ) {
                            if ( s.fields.length == s.values.length ) {
                                for ( let i = 0; i < s.fields.length; i++ ) {
                                    spaceJSON[s.fields[i]] = s.values[i];
                                }
                            }
                        }
                        /* write changes back to filesystem */
                        fs.writeFile( path.resolve( __dirname, '../spaces/'+spaceJSON.id+'.json' ), JSON.stringify( spaceJSON, null, '    ' ), err => {
                            if (err) {
                                console.error( err );
                                return;
                            }
                        });
                    }
                });
            }
        });
    } else {
        /* retain any non-matching jobs */
        newCrontab.jobs.push(job);
    }
});
/* if any dates have been processed, rewrite the crontab file omitting the matched data */
if ( updateCrontab ) {
    fs.writeFile( path.resolve( __dirname, '../_data/crontab.json' ), JSON.stringify( newCrontab, null, '    ' ), err => {
        if (err) {
            console.error( err );
            return;
        }
    });
}
