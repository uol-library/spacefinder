/**
 * Downloads building outlines and their entrances from OpenStreetMap for the
 * buildings listed in the campusmap-to-OSM lookup, and writes them as GeoJSON
 * to assets/data/osm.
 *
 * Data comes from the Overpass API; if every Overpass server fails, it falls
 * back to the main OSM API's map download for a box around the buildings. If
 * both fail, or too many buildings are missing, nothing is written, so the
 * previous files stay in place.
 *
 * Output is sorted by OSM id and leaves out version and timestamp metadata so
 * that the files only change when the mapped data changes.
 *
 * OSM data is © OpenStreetMap contributors and available under the ODbL; the
 * files written here are covered by the same licence.
 *
 * Run from any directory:
 *   node spacefinder/_scripts/osm.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const LOOKUP_FILE    = path.resolve(__dirname, '../assets/data/campusmap/osm/campusmap-osm.json');
const OUTPUT_DIR     = path.resolve(__dirname, '../assets/data/osm');
const OVERPASS_URLS  = [
    'https://overpass-api.de/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];
const OSM_API_URL    = 'https://api.openstreetmap.org/api/0.6/map.json';
const USER_AGENT     = 'spacefinder (https://github.com/uol-library/spacefinder)';
const TIMEOUT        = 120000;
// Don't write anything if more than this fraction of the lookup's buildings are missing
const MAX_MISSING    = 0.2;
const ATTRIBUTION    = '© OpenStreetMap contributors';
const LICENSE        = 'ODbL-1.0';

async function overpass(lookupIds) {
    const ways = lookupIds.filter(id => id.startsWith('way/')).map(id => id.split('/')[1]);
    const rels = lookupIds.filter(id => id.startsWith('relation/')).map(id => id.split('/')[1]);
    // The buildings, then everything below them: member ways and all their nodes (including entrances)
    const query = `[out:json][timeout:90];
(way(id:${ways.join(',')});relation(id:${rels.join(',')}););
(._;>;);
out body qt;`;
    for (const url of OVERPASS_URLS) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'data=' + encodeURIComponent(query),
                signal: AbortSignal.timeout(TIMEOUT),
            });
            if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
            return { source: url, elements: (await response.json()).elements };
        } catch (err) {
            console.warn(`Overpass ${url} failed: ${err.message}`);
        }
    }
    return null;
}

async function osmApi(lookup) {
    const located = lookup.filter(m => m.osm);
    const lats = located.map(m => Number(m.lat));
    const lngs = located.map(m => Number(m.lng));
    const margin = 0.001;
    const bbox = [Math.min(...lngs) - margin, Math.min(...lats) - margin,
                  Math.max(...lngs) + margin, Math.max(...lats) + margin].map(n => n.toFixed(4)).join(',');
    try {
        const response = await fetch(`${OSM_API_URL}?bbox=${bbox}`, {
            headers: { 'User-Agent': USER_AGENT },
            signal: AbortSignal.timeout(TIMEOUT),
        });
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        return { source: OSM_API_URL, elements: (await response.json()).elements };
    } catch (err) {
        console.warn(`OSM API failed: ${err.message}`);
        return null;
    }
}

// Join ways into closed rings (relation members are not always closed ways on their own)
function rings(wayNodeLists) {
    const pending = wayNodeLists.map(w => w.slice());
    const result = [];
    while (pending.length) {
        let ring = pending.shift();
        let joined = true;
        while (ring[0] !== ring[ring.length - 1] && joined) {
            joined = false;
            for (let i = 0; i < pending.length; i++) {
                const w = pending[i];
                const end = ring[ring.length - 1];
                if (w[0] === end) ring = ring.concat(w.slice(1));
                else if (w[w.length - 1] === end) ring = ring.concat(w.slice(0, -1).reverse());
                else continue;
                pending.splice(i, 1);
                joined = true;
                break;
            }
        }
        if (ring.length > 3 && ring[0] === ring[ring.length - 1]) result.push(ring);
    }
    return result;
}

// Overpass and the OSM API list tags in different orders
function sortedTags(tags) {
    return Object.fromEntries(Object.entries(tags).sort(([a], [b]) => a.localeCompare(b)));
}

function build(elements, lookup) {
    const nodes = new Map(), ways = new Map(), relations = new Map();
    elements.forEach(e => {
        if (e.type === 'node') nodes.set(e.id, e);
        else if (e.type === 'way') ways.set(e.id, e);
        else if (e.type === 'relation') relations.set(e.id, e);
    });
    const coords = ring => ring.map(id => [nodes.get(id).lon, nodes.get(id).lat]);
    const complete = ring => ring.every(id => nodes.has(id));

    const byOutline = new Map();
    lookup.filter(m => m.osm).forEach(m => {
        if (!byOutline.has(m.osm)) byOutline.set(m.osm, []);
        byOutline.get(m.osm).push(m);
    });

    const buildings = [], entrances = [], missing = [];
    const seenEntrances = new Set();
    [...byOutline.keys()].sort().forEach(osmId => {
        const [type, idStr] = osmId.split('/');
        const id = Number(idStr);
        let element, geometry, wayIds;
        if (type === 'way' && ways.has(id) && complete(ways.get(id).nodes)) {
            element = ways.get(id);
            wayIds = [id];
            geometry = { type: 'Polygon', coordinates: [coords(element.nodes)] };
        } else if (type === 'relation' && relations.has(id)) {
            element = relations.get(id);
            const members = element.members.filter(m => m.type === 'way' && ways.has(m.ref) && complete(ways.get(m.ref).nodes));
            wayIds = members.map(m => m.ref);
            const outer = rings(members.filter(m => m.role === 'outer').map(m => ways.get(m.ref).nodes));
            const inner = rings(members.filter(m => m.role === 'inner').map(m => ways.get(m.ref).nodes));
            if (outer.length) {
                // Inner rings are attached to the first outer ring; campus buildings rarely have more than one
                geometry = outer.length === 1
                    ? { type: 'Polygon', coordinates: [coords(outer[0]), ...inner.map(coords)] }
                    : { type: 'MultiPolygon', coordinates: outer.map((r, i) => i === 0 ? [coords(r), ...inner.map(coords)] : [coords(r)]) };
            }
        }
        if (!geometry) {
            missing.push(osmId);
            return;
        }

        const entranceIds = [...new Set(wayIds.flatMap(w => ways.get(w).nodes))]
            .filter(n => nodes.get(n).tags && nodes.get(n).tags.entrance)
            .sort((a, b) => a - b);
        entranceIds.forEach(n => {
            if (seenEntrances.has(n)) return;
            seenEntrances.add(n);
            const node = nodes.get(n);
            entrances.push({
                type: 'Feature',
                id: `node/${n}`,
                properties: { osm: `node/${n}`, building: osmId, tags: sortedTags(node.tags) },
                geometry: { type: 'Point', coordinates: [node.lon, node.lat] },
            });
        });

        buildings.push({
            type: 'Feature',
            id: osmId,
            properties: {
                osm: osmId,
                name: element.tags.name || null,
                tags: sortedTags(element.tags),
                entrances: entranceIds.map(n => `node/${n}`),
                campusmap: byOutline.get(osmId).map(m => ({
                    campusmapId: m.campusmapId,
                    title:       m.title,
                    categories:  m.categories,
                    accessable:  m.accessable,
                    match:       m.match,
                })),
            },
            geometry: geometry,
        });
    });
    return { buildings, entrances, missing, total: byOutline.size };
}

function write(file, features) {
    const geojson = { type: 'FeatureCollection', attribution: ATTRIBUTION, license: LICENSE, features: features };
    fs.writeFileSync(path.join(OUTPUT_DIR, file), JSON.stringify(geojson, null, 4));
}

async function main() {
    const lookup = JSON.parse(fs.readFileSync(LOOKUP_FILE, 'utf8'));
    const lookupIds = [...new Set(lookup.filter(m => m.osm).map(m => m.osm))];

    const data = await overpass(lookupIds) || await osmApi(lookup);
    if (!data) {
        throw new Error('Could not download OSM data; existing files left unchanged');
    }

    const result = build(data.elements, lookup);
    if (result.missing.length) {
        console.warn(`Not found in OSM data (deleted, redrawn or outside the download): ${result.missing.join(', ')}`);
    }
    if (result.missing.length > result.total * MAX_MISSING) {
        throw new Error(`${result.missing.length} of ${result.total} buildings missing; existing files left unchanged`);
    }

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    write('buildings.geojson', result.buildings);
    write('entrances.geojson', result.entrances);

    const wheelchair = {};
    result.entrances.forEach(e => {
        const w = e.properties.tags.wheelchair || 'untagged';
        wheelchair[w] = (wheelchair[w] || 0) + 1;
    });
    console.log(`Source: ${data.source}`);
    console.log(`Wrote ${result.buildings.length} buildings and ${result.entrances.length} entrances to ${path.relative(process.cwd(), OUTPUT_DIR)}`);
    console.log(`  Entrances by wheelchair tag: ${Object.entries(wheelchair).map(([k, n]) => `${k} ${n}`).join(', ')}`);
}

main().catch(err => {
    console.error(err.message);
    process.exit(1);
});
