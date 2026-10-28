/**
 * Builds the buildings dataset in assets/data/buildings from OpenStreetMap
 * outlines and entrances (assets/data/osm, made by osm.js), the University
 * campus map (assets/data/campusmap) and photos from Wikimedia Commons.
 *
 * Writes one schema.org JSON-LD file per building to data/, all of them to
 * data.json, and the photos they use to images/. Files in data/ and images/
 * that are no longer used are removed (apart from data/template.json).
 *
 * Photos come from each building's Wikidata item (property P18), and are only
 * downloaded if they aren't already in images/. If Wikidata or Commons can't
 * be reached, nothing is written, so a failed run doesn't remove photos.
 *
 * Building outlines and entrances are © OpenStreetMap contributors (ODbL);
 * photos are credited with their author and licence from Commons.
 *
 * Run from any directory:
 *   node spacefinder/_scripts/buildings.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const OSM_DIR       = path.resolve(__dirname, '../assets/data/osm');
const CAMPUSMAP_DIR = path.resolve(__dirname, '../assets/data/campusmap');
const OUTPUT_DIR    = path.resolve(__dirname, '../assets/data/buildings');
const DATA_DIR      = path.join(OUTPUT_DIR, 'data');
const IMAGE_DIR     = path.join(OUTPUT_DIR, 'images');
const IMAGE_URL     = '/assets/data/buildings/images/';
const KEEP_FILES    = ['template.json'];
const IMAGE_WIDTH   = 1024;
const USER_AGENT    = 'spacefinder (https://github.com/uol-library/spacefinder)';
const CAMPUSMAP_URL = 'https://www.leeds.ac.uk/campusmap?location=';

const ENTRANCE_NAMES = {
    main:      'Main entrance',
    service:   'Service entrance',
    emergency: 'Emergency exit',
    exit:      'Exit',
};

// Campus map groups that become building categories (filter keys in filters.json)
const CATEGORIES = {
    Accommodation: 'accommodation',
    Libraries:     'libraries',
    Culture:       'culture',
    Sport:         'sport',
};

/* ---------- helpers ---------- */

function slugify(str) {
    return str.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
        .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const normalise = str => slugify(str || '').replace(/-/g, '');

function stripTags(html) {
    return (html || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();
}

// Campus map descriptions end with a What3Words block, and use assorted line breaks
function cleanDescription(html) {
    return (html || '')
        .replace(/<strong>What3Words<\/strong>[\s\S]*$/i, '')
        .replace(/\r?\n/g, '')
        .replace(/<br\s*\/?>\s*<\/br>/gi, '<br>')
        .replace(/<br\s*\/?>/gi, '<br>')
        .replace(/(<br>\s*)+$/i, '')
        .trim();
}

// The campus map snapshots aren't always valid JSON: some end with a stray ";" (and "}")
function readCampusmap() {
    const files = fs.readdirSync(CAMPUSMAP_DIR).filter(f => /^data-\d{2}-\d{4}\.json$/.test(f));
    const snapshots = files.map(f => {
        const text = fs.readFileSync(path.join(CAMPUSMAP_DIR, f), 'utf8');
        let data;
        try {
            data = JSON.parse(text);
        } catch (err) {
            data = JSON.parse(text.slice(0, text.lastIndexOf('};') + 1));
        }
        return { file: f, data: data };
    });
    if (!snapshots.length) {
        throw new Error(`No campus map snapshot (data-MM-YYYY.json) in ${CAMPUSMAP_DIR}`);
    }
    snapshots.sort((a, b) => a.data._docs[0].lastUpdated.localeCompare(b.data._docs[0].lastUpdated));
    return snapshots[snapshots.length - 1];
}

async function getJSON(url) {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText} from ${url}`);
    return response.json();
}

function chunks(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

// Area-weighted centroid of a ring of [lon, lat] points
function centroid(ring) {
    let a = 0, x = 0, y = 0;
    for (let i = 0; i < ring.length - 1; i++) {
        const [x1, y1] = ring[i], [x2, y2] = ring[i + 1];
        const f = x1 * y2 - x2 * y1;
        a += f; x += (x1 + x2) * f; y += (y1 + y2) * f;
    }
    if (a === 0) return ring[0];
    return [x / (3 * a), y / (3 * a)];
}

const round = n => Math.round(n * 1e7) / 1e7;

// schema.org GeoShape polygons are "lat lon" pairs separated by spaces
const shape = ring => ring.map(([lon, lat]) => `${lat} ${lon}`).join(' ');

/* ---------- photos from Wikidata / Commons ---------- */

async function getPhotos(wikidataIds) {
    const files = {};
    for (const ids of chunks(wikidataIds, 50)) {
        const data = await getJSON(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids.join('|')}&props=claims&format=json`);
        Object.entries(data.entities).forEach(([id, entity]) => {
            const p18 = entity.claims && entity.claims.P18;
            if (p18) files[id] = p18[0].mainsnak.datavalue.value;
        });
    }
    const info = {};
    for (const titles of chunks([...new Set(Object.values(files))], 50)) {
        const t = titles.map(f => encodeURIComponent('File:' + f)).join('|');
        const data = await getJSON(`https://commons.wikimedia.org/w/api.php?action=query&titles=${t}&prop=imageinfo&iiprop=url|extmetadata|mime&iiurlwidth=${IMAGE_WIDTH}&format=json`);
        const normalised = {};
        (data.query.normalized || []).forEach(n => normalised[n.to] = n.from);
        Object.values(data.query.pages).forEach(page => {
            if (!page.imageinfo) return;
            const i = page.imageinfo[0], m = i.extmetadata;
            const value = k => m[k] ? m[k].value : '';
            const original = (normalised[page.title] || page.title).replace(/^File:/, '');
            info[original] = {
                thumb:       i.thumburl,
                mime:        i.mime,
                page:        i.descriptionurl,
                title:       page.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, ''),
                description: stripTags(value('ImageDescription')).split('\n')[0],
                artist:      stripTags(value('Artist')),
                license:     value('LicenseShortName'),
                licenseUrl:  value('LicenseUrl'),
            };
        });
    }
    const photos = {};
    Object.entries(files).forEach(([id, file]) => {
        if (info[file]) photos[id] = info[file];
    });
    return photos;
}

async function savePhoto(photo) {
    const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[photo.mime] || '.jpg';
    const filename = slugify(photo.title) + ext;
    const file = path.join(IMAGE_DIR, filename);
    if (!fs.existsSync(file)) {
        const response = await fetch(photo.thumb, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(60000) });
        if (!response.ok) throw new Error(`${response.status} ${response.statusText} downloading ${photo.thumb}`);
        fs.writeFileSync(file, Buffer.from(await response.arrayBuffer()));
        console.log(`  downloaded ${filename}`);
    }
    return filename;
}

function imageObject(photo, filename, buildingName) {
    const credit = [photo.artist, photo.license].filter(Boolean).join(', ');
    return {
        '@type':              'ImageObject',
        contentUrl:           IMAGE_URL + filename,
        description:          photo.description || buildingName,
        creditText:           credit + ', via Wikimedia Commons',
        license:              photo.licenseUrl,
        acquireLicensePage:   photo.page,
    };
}

/* ---------- building records ---------- */

function schemaType(tags, categories) {
    if (categories.includes('accommodation') || ['residential', 'dormitory', 'apartments'].includes(tags.building)) {
        return 'Accommodation';
    }
    if (tags.heritage || tags.listed_status) {
        return 'LandmarksOrHistoricalBuildings';
    }
    if (['university', 'college', 'school', 'civic', 'public', 'library', 'church', 'chapel', 'sports_centre'].includes(tags.building)) {
        return 'CivicStructure';
    }
    return 'Place';
}

const propertyValue = (propertyID, value, name) =>
    ({ '@type': 'PropertyValue', propertyID: propertyID, ...(name ? { name: name } : {}), value: value });

const feature = (key, name) =>
    ({ '@type': 'LocationFeatureSpecification', name: name, alternateName: key, value: true });

function address(tags) {
    const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
    const addr = {
        '@type':          'PostalAddress',
        addressLocality:  'University of Leeds',
        addressRegion:    'Leeds, West Yorkshire',
        streetAddress:    [tags['addr:housename'], street].filter(Boolean).join(', '),
    };
    if (tags['addr:postcode']) addr.postalCode = tags['addr:postcode'];
    return addr;
}

function entrancePlace(entrance) {
    const tags = entrance.properties.tags;
    const [lon, lat] = entrance.geometry.coordinates;
    const place = {
        '@type':          'Place',
        additionalType:   'https://wiki.openstreetmap.org/wiki/Key:entrance',
        name:             tags.name || ENTRANCE_NAMES[tags.entrance] || 'Entrance',
        identifier:       propertyValue('osm', entrance.properties.osm),
        latitude:         round(lat),
        longitude:        round(lon),
    };
    const features = [];
    if (tags.entrance) features.push({ ...feature('entrance', 'Entrance type'), value: tags.entrance });
    ['wheelchair', 'automatic_door', 'door', 'ramp', 'step_count', 'level', 'access']
        .filter(k => tags[k] !== undefined)
        .forEach(k => features.push({ '@type': 'LocationFeatureSpecification', name: k, alternateName: k, value: tags[k] }));
    if (features.length) place.amenityFeature = features;
    if (tags['wheelchair:description']) place.description = tags['wheelchair:description'];
    return place;
}

function campusmapPlace(entry, record) {
    const place = {
        '@type':      'Place',
        name:         entry.title,
        identifier:   propertyValue('campusmap', entry.campusmapId),
        sameAs:       CAMPUSMAP_URL + entry.campusmapId,
    };
    const desc = cleanDescription(record && record.desc);
    if (desc) place.description = desc;
    if (record) {
        place.latitude = Number(record.lat);
        place.longitude = Number(record.lng);
    }
    return place;
}

function buildingRecord(building, entrances, campusmap, photos, slug) {
    const p = building.properties;
    const tags = p.tags;
    const name = p.name || (p.campusmap[0] && p.campusmap[0].title) || 'Unnamed building';
    const categories = [...new Set(p.campusmap.flatMap(c => c.categories).map(c => CATEGORIES[c]).filter(Boolean))].sort();

    // The building's own description comes from the campus map entry with the same name
    const own = p.campusmap.find(c => normalise(c.title) === normalise(name));
    const accessable = (own && own.accessable) || (p.campusmap.find(c => c.accessable) || {}).accessable;

    const outer = building.geometry.type === 'Polygon' ? [building.geometry.coordinates[0]] : building.geometry.coordinates.map(poly => poly[0]);
    const [lon, lat] = centroid(outer[0]);

    const place = {
        '@type':      schemaType(tags, categories),
        identifier:   [propertyValue('slug', slug), propertyValue('osm', p.osm)],
        name:         name,
        description:  own ? cleanDescription((campusmap.get(own.campusmapId) || {}).desc) : '',
        address:      address(tags),
        latitude:     round(lat),
        longitude:    round(lon),
        geo:          { '@type': 'GeoShape', polygon: outer.map(shape) },
        sameAs:       [`https://www.openstreetmap.org/${p.osm}`],
    };
    if (tags.alt_name) place.alternateName = tags.alt_name;
    if (tags.wikidata) {
        place.identifier.push(propertyValue('wikidata', tags.wikidata));
        place.sameAs.push(`https://www.wikidata.org/wiki/${tags.wikidata}`);
    }
    if (tags['ref:GB:uprn']) place.identifier.push(propertyValue('uprn', tags['ref:GB:uprn']));
    if (own) place.sameAs.push(CAMPUSMAP_URL + own.campusmapId);
    if (tags.website) place.url = tags.website;

    const additional = [];
    if (tags['building:levels']) additional.push(propertyValue('building:levels', Number(tags['building:levels']) || tags['building:levels'], 'Levels'));
    if (tags.wheelchair) additional.push(propertyValue('wheelchair', tags.wheelchair, 'Wheelchair access'));
    if (accessable) additional.push(propertyValue('accessable', accessable, 'AccessAble access guide'));
    if (additional.length) place.additionalProperty = additional;

    if (tags.wikidata && photos[tags.wikidata]) {
        place.image = imageObject(photos[tags.wikidata], photos[tags.wikidata].filename, name);
    }

    // Filter values (keys match filters.json)
    const filterFeatures = categories.map(c => feature(c, Object.keys(CATEGORIES).find(k => CATEGORIES[k] === c)));
    if (entrances.length) filterFeatures.push(feature('entrances', 'Entrances mapped'));
    if (entrances.some(e => e.properties.tags.wheelchair === 'yes')) filterFeatures.push(feature('wheelchair_entrance', 'Wheelchair accessible entrance'));
    if (accessable) filterFeatures.push(feature('accessable', 'AccessAble access guide'));
    if (filterFeatures.length) place.amenityFeature = filterFeatures;

    const contained = [
        ...entrances.map(entrancePlace),
        ...p.campusmap.filter(c => c !== own).map(c => campusmapPlace(c, campusmap.get(c.campusmapId))),
    ];
    if (contained.length) place.containsPlace = contained;

    return {
        '@context':          'https://schema.org',
        '@type':             'Article',
        creativeWorkStatus:  'Published',
        mainEntity:          place,
    };
}

/* ---------- main ---------- */

async function main() {
    const buildings = JSON.parse(fs.readFileSync(path.join(OSM_DIR, 'buildings.geojson'), 'utf8')).features;
    const entrances = JSON.parse(fs.readFileSync(path.join(OSM_DIR, 'entrances.geojson'), 'utf8')).features;
    const snapshot = readCampusmap();
    const campusmap = new Map();
    snapshot.data.buildings.forEach(e => campusmap.set(e.id, e));
    snapshot.data.marker_groups.forEach(g => g.group_contents.forEach(e => {
        if (!campusmap.has(e.id)) campusmap.set(e.id, e);
    }));

    // Fetch all photo details before writing anything
    const wikidataIds = [...new Set(buildings.map(b => b.properties.tags.wikidata).filter(Boolean))].sort();
    const photos = await getPhotos(wikidataIds);
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.mkdirSync(IMAGE_DIR, { recursive: true });
    for (const id of Object.keys(photos).sort()) {
        photos[id].filename = await savePhoto(photos[id]);
    }

    // Slugs are made in OSM id order so that the same building keeps the same slug
    const used = new Set();
    const slugs = new Map();
    [...buildings].sort((a, b) => a.properties.osm.localeCompare(b.properties.osm)).forEach(b => {
        const base = slugify(b.properties.name || (b.properties.campusmap[0] && b.properties.campusmap[0].title) || b.properties.osm);
        let slug = base, n = 2;
        while (used.has(slug)) slug = `${base}-${n++}`;
        used.add(slug);
        slugs.set(b.properties.osm, slug);
    });

    const entrancesById = new Map(entrances.map(e => [e.properties.osm, e]));
    const records = buildings
        .map(b => ({
            slug: slugs.get(b.properties.osm),
            record: buildingRecord(b, b.properties.entrances.map(id => entrancesById.get(id)).filter(Boolean), campusmap, photos, slugs.get(b.properties.osm)),
        }))
        .sort((a, b) => a.slug.localeCompare(b.slug));

    const written = new Set(KEEP_FILES);
    records.forEach(({ slug, record }) => {
        fs.writeFileSync(path.join(DATA_DIR, slug + '.json'), JSON.stringify(record, null, 4));
        written.add(slug + '.json');
    });
    fs.writeFileSync(path.join(OUTPUT_DIR, 'data.json'), JSON.stringify(records.map(r => r.record), null, 4));

    const removed = [];
    fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && !written.has(f)).forEach(f => {
        fs.unlinkSync(path.join(DATA_DIR, f));
        removed.push('data/' + f);
    });
    const usedImages = new Set(Object.values(photos).map(p => p.filename));
    fs.readdirSync(IMAGE_DIR).filter(f => !usedImages.has(f)).forEach(f => {
        fs.unlinkSync(path.join(IMAGE_DIR, f));
        removed.push('images/' + f);
    });

    console.log(`Campus map snapshot: ${snapshot.file}`);
    console.log(`Wrote ${records.length} buildings (${records.filter(r => r.record.mainEntity.image).length} with photos) to ${path.relative(process.cwd(), OUTPUT_DIR)}`);
    if (removed.length) console.log(`Removed: ${removed.join(', ')}`);
}

main().catch(err => {
    console.error(err.message);
    process.exit(1);
});
