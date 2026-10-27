/**
 * Scans each subfolder of assets/data that contains a data/ directory,
 * reads all JSON files from it, and writes them as a JSON array to
 * assets/data/{subfolder}/data.json.
 *
 * Run from any directory:
 *   node spacefinder/_scripts/concat.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ASSETS_DATA = path.resolve(__dirname, '../assets/data');

const subfolders = fs.readdirSync(ASSETS_DATA, { encoding: 'utf8', withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);

subfolders.forEach(subfolder => {
    const dataDir = path.join(ASSETS_DATA, subfolder, 'data');
    if (!fs.existsSync(dataDir) || !fs.statSync(dataDir).isDirectory()) return;

    const items = fs.readdirSync(dataDir, { encoding: 'utf8' })
        .filter(f => f.endsWith('.json') && f !== '.gitkeep')
        .sort()
        .map(filename => JSON.parse(fs.readFileSync(path.join(dataDir, filename))));

    const outPath = path.join(ASSETS_DATA, subfolder, 'data.json');
    fs.writeFileSync(outPath, JSON.stringify(items, null, 4));
    console.log(`${subfolder}/data.json — ${items.length} items`);
});
