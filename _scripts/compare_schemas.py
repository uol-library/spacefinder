#!/usr/bin/env python3 -I
"""Compare data/ (schema.org JSON-LD) vs _data/ (flat JSON) for all space files.

Run from any directory:
    python3 -I spacefinder/_scripts/compare_schemas.py
"""

import json
import sys
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DATA_DIR = REPO / "assets/data/spaces/data"
FLAT_DIR = REPO / "assets/data/spaces/_data"

mismatches = []
warnings = []

def add_mismatch(file_id, field, schema_val, flat_val):
    mismatches.append({"file": file_id, "field": field, "schema_org": schema_val, "flat": flat_val})

def add_warning(file_id, msg):
    warnings.append({"file": file_id, "msg": msg})

def norm_time(t):
    """Normalise '08:30:00' and '8:30' to 'H:MM'."""
    if not t:
        return ""
    parts = t.split(":")
    hour = parts[0].lstrip("0") or "0"
    minute = parts[1] if len(parts) > 1 else "00"
    return f"{hour}:{minute}"

def get_feature_alts(amenity, file_id):
    """Return set of alternateName values where value is true; warn on malformed entries."""
    result = set()
    for f in amenity:
        if f.get("value") is not True:
            continue
        alt = f.get("alternateName")
        if alt:
            result.add(alt)
        else:
            add_warning(file_id, f"amenityFeature entry has value=true but no alternateName: {f}")
    return result

NOISE_ALTS = {"quiet", "backgroundchatter", "noisy", "whispers", "animateddiscussion", "strictlysilent"}

def get_noise_from_amenity(amenity):
    for f in amenity:
        if f.get("alternateName") in NOISE_ALTS and f.get("value") is True:
            return f.get("name", "")
    return ""

def get_contact_url(contacts, kind):
    for c in contacts:
        if kind in c.get("contactType", "").lower():
            return c.get("url", "")
    return ""

def twitter_handle(url):
    return url.rstrip("/").split("/")[-1] if url else ""

DAY_URL_MAP = {
    "https://schema.org/Monday": "monday",
    "https://schema.org/Tuesday": "tuesday",
    "https://schema.org/Wednesday": "wednesday",
    "https://schema.org/Thursday": "thursday",
    "https://schema.org/Friday": "friday",
    "https://schema.org/Saturday": "saturday",
    "https://schema.org/Sunday": "sunday",
}
DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

WORK_ALTS = {"close", "friends", "group", "alone", "quiet_spot", "focus"}
ATMOS_ALTS = {"relaxed", "modern", "cosy", "social", "friendly", "productive", "inspiring", "calm", "vibrant"}
FACILITY_ALTS = {
    "food_drink", "views", "large_desks", "sockets", "signal", "toilets",
    "refreshments", "break", "bike_racks", "gender_neutral_toilets",
    "wheelchair_accessible", "printing", "lockers", "showers", "baby_change", "prayer_room",
}
# free_wifi and laptops_allowed exist only in _data, not in schema.org — excluded from comparison

files = sorted(DATA_DIR.glob("*.json"), key=lambda p: int(p.stem))

for schema_path in files:
    fid = schema_path.stem
    flat_path = FLAT_DIR / schema_path.name

    if not flat_path.exists():
        add_mismatch(fid, "FILE_MISSING", str(schema_path.name), "MISSING in _data/")
        continue

    schema = json.loads(schema_path.read_text())
    flat = json.loads(flat_path.read_text())

    me = schema.get("mainEntity", {})
    amenity = me.get("amenityFeature", [])
    contacts = me.get("contactPoint", [])
    address = me.get("address", {})
    geo = me.get("geo", {})
    ohs = me.get("openingHoursSpecification", [])
    feature_alts = get_feature_alts(amenity, fid)

    checks = [
        ("title",        me.get("name"),             flat.get("title")),
        ("description",  me.get("description"),      flat.get("description")),
        ("slug",         me.get("alternateName"),     flat.get("slug")),
        ("url",          me.get("url"),               flat.get("url")),
        ("campusmap_url",me.get("sameAs"),            flat.get("campusmap_url")),
        ("phone_number", me.get("telephone"),         flat.get("phone_number")),
    ]
    for field, sv, fv in checks:
        if sv != fv:
            add_mismatch(fid, field, sv, fv)

    # image
    img = me.get("image", {})
    schema_img_url = img.get("contentUrl", "") if isinstance(img, dict) else img
    schema_img_alt = img.get("description", "") if isinstance(img, dict) else ""
    if schema_img_url != flat.get("image"):
        add_mismatch(fid, "image", schema_img_url, flat.get("image"))
    if schema_img_alt != flat.get("imagealt"):
        add_mismatch(fid, "imagealt", schema_img_alt, flat.get("imagealt"))

    # address
    schema_address = f"{address.get('addressLocality', '')}, {address.get('postalCode', '')}"
    if schema_address != flat.get("address"):
        add_mismatch(fid, "address", schema_address, flat.get("address"))

    # floor + building
    schema_street = address.get("streetAddress", "")
    floor, building = flat.get("floor", ""), flat.get("building", "")
    flat_street = f"{floor}, {building}" if floor else building
    if schema_street != flat_street:
        add_mismatch(fid, "floor+building (streetAddress)", schema_street, flat_street)

    # geo coordinates
    try:
        flat_loc = json.loads(flat.get("location", "{}"))
        coords = flat_loc.get("coordinates", [None, None])
        flat_lon, flat_lat = coords[0], coords[1]
    except Exception:
        flat_lon = flat_lat = None
    if geo.get("latitude") != flat_lat:
        add_mismatch(fid, "latitude", geo.get("latitude"), flat_lat)
    if geo.get("longitude") != flat_lon:
        add_mismatch(fid, "longitude", geo.get("longitude"), flat_lon)

    # published
    if (schema.get("creativeWorkStatus") == "Published") != flat.get("published", False):
        add_mismatch(fid, "published", schema.get("creativeWorkStatus"), flat.get("published"))

    # publicAccess / restricted (treat empty string as False)
    pub_access = me.get("publicAccess")
    if pub_access is not None and (not pub_access) != bool(flat.get("restricted", False)):
        add_mismatch(fid, "restricted/publicAccess",
                     f"publicAccess={pub_access}", f"restricted={flat.get('restricted')}")

    # social
    schema_twitter = twitter_handle(get_contact_url(contacts, "twitter"))
    if schema_twitter != flat.get("twitter_screen_name"):
        add_mismatch(fid, "twitter_screen_name", schema_twitter, flat.get("twitter_screen_name"))
    schema_fb = get_contact_url(contacts, "facebook")
    if schema_fb != flat.get("facebook_url"):
        add_mismatch(fid, "facebook_url", schema_fb, flat.get("facebook_url"))

    # noise (treat empty string and None as equivalent)
    schema_noise = get_noise_from_amenity(amenity)
    flat_noise = flat.get("noise") or ""
    if schema_noise != flat_noise:
        add_mismatch(fid, "noise", schema_noise, flat.get("noise"))

    # work / atmosphere / facilities
    for label, alts, flat_key in [
        ("work",        WORK_ALTS,     "work"),
        ("atmosphere",  ATMOS_ALTS,    "atmosphere"),
        ("facilities",  FACILITY_ALTS, "facilities"),
    ]:
        sv = sorted(feature_alts & alts)
        fv = sorted([x for x in flat.get(flat_key, []) if x in alts])
        if sv != fv:
            add_mismatch(fid, label, sv, fv)

    # opening hours
    schema_oh = {}
    for spec in ohs:
        day = DAY_URL_MAP.get(spec.get("dayOfWeek"))
        if day:
            opens, closes = spec.get("opens", ""), spec.get("closes", "")
            schema_oh[day] = {"open": bool(opens and closes), "from": norm_time(opens), "to": norm_time(closes)}
    flat_oh = flat.get("opening_hours", {})
    for day in DAY_ORDER:
        s, fd = schema_oh.get(day), flat_oh.get(day)
        if s is None and fd is None:
            continue
        if s is None or fd is None:
            add_mismatch(fid, f"opening_hours.{day}", s, fd)
            continue
        if s["open"] != fd.get("open"):
            add_mismatch(fid, f"opening_hours.{day}.open", s["open"], fd.get("open"))
        if s["open"]:
            if s["from"] != norm_time(fd.get("from", "")):
                add_mismatch(fid, f"opening_hours.{day}.from", s["from"], fd.get("from"))
            if s["to"] != norm_time(fd.get("to", "")):
                add_mismatch(fid, f"opening_hours.{day}.to", s["to"], fd.get("to"))

# --- Report ---
if warnings:
    print(f"WARNINGS ({len(warnings)}):\n")
    for w in warnings:
        print(f"  {w['file']}.json: {w['msg']}")
    print()

if not mismatches:
    print("All comparable data points match across both schemas.")
else:
    print(f"MISMATCHES ({len(mismatches)} total):\n")
    by_file = defaultdict(list)
    for m in mismatches:
        by_file[m["file"]].append(m)
    for fid in sorted(by_file, key=lambda x: int(x)):
        print(f"  File {fid}.json  ({len(by_file[fid])} issue(s)):")
        for m in by_file[fid]:
            print(f"    [{m['field']}]")
            print(f"      schema.org: {m['schema_org']!r}")
            print(f"      flat (_data): {m['flat']!r}")
        print()

print(f"\nChecked {len(files)} files.")
if mismatches:
    sys.exit(1)
