/**
 * Converts flat JSON files from assets/data/spaces/_current into schema.org
 * JSON-LD files in assets/data/spaces/data, one file per space.
 *
 * Run from any directory:
 *   node spacefinder/_scripts/convert.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const INPUT_DIR  = path.resolve(__dirname, '../assets/data/spaces/_current');
const OUTPUT_DIR = path.resolve(__dirname, '../assets/data/spaces/data');

const CONTACT_TYPE_LABELS = {
    'icon-facebook-squared': 'Follow us on Facebook',
    'icon-x':                'Follow us on X (formerly Twitter)',
    'icon-instagram':        'Follow us on Instagram',
    'icon-bluesky':          'Follow us on Bluesky',
};

const FACILITY_NAMES = {
    "food_drink":             "Food &amp; drink allowed",
    "daylight":               "Natural daylight",
    "views":                  "Attractive views out of the window",
    "large_desks":            "Large desks",
    "adjustable_furniture":   "Adjustable furniture",
    "computers":              "Computers",
    "sockets":                "Plug Sockets",
    "signal":                 "Phone signal",
    "printers_copiers":       "Printers and copiers",
    "whiteboards":            "Whiteboards",
    "projector":              "Projector",
    "outdoor_seating":        "Outdoor seating",
    "refreshments":           "Close to refreshments",
    "break":                  "Close to a place to take a break",
    "bookable":               "Bookable",
    "individual_study_space": "Individual study spaces available",
    "toilets":                "Toilets nearby",
    "gender_neutral_toilets": "Gender neutral toilets",
    "baby_changing":          "Baby changing facilities",
    "wheelchair_accessible":  "Wheelchair accessible",
    "blue_badge_parking":     "Parking for blue badge holders",
    "accessible_toilets":     "Toilets accessible to disabled people",
    "induction_loops":        "Induction loops",
    "bike_racks":             "Bike racks",
    "prayer_room":            "Prayer room"
};

const KEYWORD_NAMES = {
    "private":            "Alone, in private",
    "close":              "Where others are working",
    "friends":            "With friends",
    "group":              "On a group project",
    "disciplined":        "Disciplined",
    "relaxed":            "Relaxed",
    "historic":           "Historic",
    "modern":             "Modern",
    "inspiring":          "Inspiring",
    "cosy":               "Cosy",
    "social":             "Social",
    "friendly":           "Friendly",
    "strictlysilent":     "Strictly silent",
    "whispers":           "Whispers",
    "backgroundchatter":  "Background chatter",
    "animateddiscussion": "Animated discussion",
    "musicplaying":       "Music playing"
};

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const restrictions = {};
const files = fs.readdirSync(INPUT_DIR, { encoding: 'utf8' })
    .filter(f => f.endsWith('.json') && f !== '.gitkeep');

files.forEach(filename => {
    const jsondata = JSON.parse(fs.readFileSync(path.join(INPUT_DIR, filename)));

    const geodata = JSON.parse(jsondata.location || '{}');
    if (geodata && geodata.coordinates && geodata.coordinates.length === 2) {
        jsondata.lat = geodata.coordinates[1];
        jsondata.lng = geodata.coordinates[0];
    } else {
        jsondata.lat = '';
        jsondata.lng = '';
    }

    if (jsondata.restriction) {
        if (!restrictions[jsondata.restriction]) {
            restrictions[jsondata.restriction] = [filename];
        } else {
            restrictions[jsondata.restriction].push(filename);
        }
    }

    fs.writeFileSync(
        path.join(OUTPUT_DIR, filename),
        JSON.stringify(convertObj(jsondata), null, 4)
    );
});

console.log('Restrictions:', restrictions);
console.log(`Converted ${files.length} files.`);

// ---------------------------------------------------------------------------

function convertObj(spaceJSON) {
    const addr    = parseAddress(spaceJSON.address || '');
    const image   = (spaceJSON.images && spaceJSON.images[0]) || {};
    const mainUrl = getLinkByClass(spaceJSON.links, 'icon-link');
    const mapUrl  = getLinkByClass(spaceJSON.links, 'icon-uol-logo-mark');
    const phone   = getContactByClass(spaceJSON.contacts, 'icon-phone');
    const email   = getContactByClass(spaceJSON.contacts, 'icon-email');

    const template = {
        "@context": "https://schema.org",
        "@type": "Article",
        "creativeWorkStatus": spaceJSON.published ? "Published" : "Draft",
        "mainEntity": {
            "@type": getType(spaceJSON.space_type),
            "identifier": spaceJSON.id || '',
            "name": spaceJSON.title || '',
            "description": spaceJSON.description || '',
            "alternateName": spaceJSON.slug || '',
            "url": mainUrl ? mainUrl.url : '',
            "sameAs": mapUrl ? mapUrl.url : '',
            "publicAccess": !spaceJSON.restricted,
            "telephone": phone ? phone.url : '',
            "email": email ? email.url.replace(/^mailto:/i, '') : '',
            "image": {
                "@type": "ImageObject",
                "contentUrl": image.url || '',
                "description": image.alt || ''
            },
            "address": {
                "@type": "PostalAddress",
                "addressLocality": addr.locality,
                "addressRegion": "Leeds, West Yorkshire",
                "postalCode": addr.postcode,
                "streetAddress": buildStreetAddress(spaceJSON)
            },
            "geo": {
                "@type": "GeoCoordinates",
                "latitude": spaceJSON.lat,
                "longitude": spaceJSON.lng
            }
        }
    };

    const contactPoints = buildContactPoints(spaceJSON.contacts);
    if (contactPoints.length) {
        template.mainEntity.contactPoint = contactPoints;
    }

    template.mainEntity.amenityFeature = buildAmenityFeatures(spaceJSON);
    template.mainEntity.openingHoursSpecification = buildOpeningHours(spaceJSON.opening_hours);

    return template;
}

// Extract the main URL for a given icon class from a links array.
function getLinkByClass(links, cls) {
    if (!links) return null;
    return links.find(l => l.class === cls) || null;
}

// Extract a contact entry for a given icon class from a contacts array.
function getContactByClass(contacts, cls) {
    if (!contacts) return null;
    return contacts.find(c => c.class === cls) || null;
}

// Parse a free-form UK address string into { locality, postcode }.
function parseAddress(addressStr) {
    const match = addressStr.match(/([A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2})/i);
    if (match) {
        const postcode  = match[1].toUpperCase();
        const locality  = addressStr.replace(match[0], '').replace(/[,\s]+$/, '').trim();
        return { locality, postcode };
    }
    return { locality: addressStr, postcode: '' };
}

// Build streetAddress from floor and building, omitting blank parts.
function buildStreetAddress(spaceJSON) {
    const parts = [];
    if (spaceJSON.floor)    parts.push(spaceJSON.floor);
    if (spaceJSON.building) parts.push(spaceJSON.building);
    return parts.join(', ');
}

// Build contactPoint array from contacts, excluding phone/email (handled separately).
function buildContactPoints(contacts) {
    if (!contacts) return [];
    return contacts
        .filter(c => CONTACT_TYPE_LABELS[c.class])
        .map(c => ({
            "@type": "ContactPoint",
            "contactType": CONTACT_TYPE_LABELS[c.class],
            "url": c.url
        }));
}

// Build amenityFeature array from facilities, work, atmosphere and noise.
function buildAmenityFeatures(spaceJSON) {
    const features = [];

    (spaceJSON.facilities || []).forEach(f => {
        const name = FACILITY_NAMES[f];
        if (name) {
            features.push({ "@type": "LocationFeatureSpecification", "name": name, "alternateName": f, "value": true });
        }
    });

    const noiseKey = spaceJSON.noise ? Object.keys(KEYWORD_NAMES).find(k => KEYWORD_NAMES[k] === spaceJSON.noise) : null;
    if (noiseKey) {
        features.push({ "@type": "LocationFeatureSpecification", "name": KEYWORD_NAMES[noiseKey], "alternateName": noiseKey, "value": true });
    }

    (spaceJSON.work || []).forEach(w => {
        if (KEYWORD_NAMES[w]) {
            features.push({ "@type": "LocationFeatureSpecification", "name": KEYWORD_NAMES[w], "alternateName": w, "value": true });
        }
    });

    (spaceJSON.atmosphere || []).forEach(a => {
        if (KEYWORD_NAMES[a]) {
            features.push({ "@type": "LocationFeatureSpecification", "name": KEYWORD_NAMES[a], "alternateName": a, "value": true });
        }
    });

    return features;
}

// Build openingHoursSpecification array from the opening_hours object.
function buildOpeningHours(openingHours) {
    if (!openingHours) return [];
    return Object.keys(openingHours).map(day => {
        const dayOfWeek = 'https://schema.org/' + day.charAt(0).toUpperCase() + day.slice(1);
        const spec = { "@type": "OpeningHoursSpecification", "dayOfWeek": dayOfWeek };
        if (openingHours[day].open) {
            spec.opens  = formatTime(openingHours[day].from);
            spec.closes = formatTime(openingHours[day].to);
        }
        return spec;
    });
}

function formatTime(timestr) {
    if (!timestr) return '';
    const hm    = timestr.split(':');
    const hours = hm[0].length === 1 ? '0' + hm[0] : hm[0];
    return hours + ':' + hm[1] + ':00';
}

function getType(sftype) {
    const types = {
        "Café":                  "CafeOrCoffeeShop",
        "Library":               "Library",
        "IT Cluster":            "CollegeOrUniversity",
        "General Seating Area":  "CollegeOrUniversity",
        "Outdoor Seating Area":  "CollegeOrUniversity"
    };
    return types[sftype] || "Place";
}

