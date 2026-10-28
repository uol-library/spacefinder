/**
 * Routing tests
 *
 * Builds the site twice with Jekyll (routing: "hash" and routing: "history"),
 * serves each build the way GitHub Pages does (unknown paths get 404.html),
 * then drives headless Chrome over the DevTools protocol through the same
 * scenarios in both modes.
 *
 * Needs Ruby/Bundler (for Jekyll), Google Chrome and Node 22+ (for WebSocket).
 * Run from the repository root:
 *
 *   npm run test:routing
 *   npm run test:routing -- --no-build    (reuse the last builds)
 *
 * Builds go in _tests/build/, which git ignores. The tests expect the data
 * currently in assets/data (68 spaces, 95 buildings, 22 artworks).
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn, execFileSync } from 'child_process';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ROOT = path.join(REPO, '_tests', 'build');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };

function serve(dir, port) {
    return new Promise(res => http.createServer((req, resp) => {
        let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
        let f = path.join(dir, p);
        if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
        if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
        if (fs.existsSync(f)) {
            resp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
            fs.createReadStream(f).pipe(resp);
        } else {
            resp.writeHead(404, { 'Content-Type': 'text/html' });
            fs.createReadStream(path.join(dir, '404.html')).pipe(resp);
        }
    }).listen(port, res));
}


/* builds the hash version from the repo, and the history version from a copy with routing changed */
function build() {
    fs.mkdirSync(ROOT, { recursive: true });
    const src = path.join(ROOT, 'src');
    execFileSync('rsync', ['-a', '--delete', '--exclude=.git', '--exclude=_site', '--exclude=node_modules', '--exclude=vendor', '--exclude=_tests', '--exclude=.jekyll-cache', REPO + '/', src + '/'], { stdio: 'inherit' });
    const config = path.join(src, '_data', 'config.yml');
    fs.writeFileSync(config, fs.readFileSync(config, 'utf8').replace(/^routing:.*$/m, 'routing: "history"'));
    for (const [dir, out] of [[REPO, 'hash'], [src, 'history']]) {
        console.log('Building ' + out + ' version');
        execFileSync('bundle', ['exec', 'jekyll', 'build', '-q', '-s', dir, '-d', path.join(ROOT, out)], { cwd: REPO, stdio: 'inherit' });
    }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function chrome() {
    const proc = spawn('google-chrome', ['--headless=new', '--remote-debugging-port=9333', '--user-data-dir=' + path.join(ROOT, 'chrome-profile'), '--no-first-run', '--window-size=1400,1000', 'about:blank'], { stdio: 'ignore' });
    for (let i = 0; i < 50; i++) {
        try { await (await fetch('http://127.0.0.1:9333/json/version')).json(); break; } catch { await sleep(200); }
    }
    const targets = await (await fetch('http://127.0.0.1:9333/json')).json();
    const page = targets.find(t => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => ws.addEventListener('open', r));
    let id = 0; const pending = {}; const errors = [];
    ws.addEventListener('message', m => {
        const d = JSON.parse(m.data);
        if (d.id && pending[d.id]) { pending[d.id](d); delete pending[d.id]; }
        if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception ? d.params.exceptionDetails.exception.description.split('\n')[0] : d.params.exceptionDetails.text);
        if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push('console.error: ' + d.params.args.map(a => a.value || a.description).join(' '));
    });
    const send = (method, params = {}) => new Promise(r => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
    await send('Runtime.enable'); await send('Page.enable');
    const evaluate = async expr => {
        const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
        if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception.description);
        return r.result.result.value;
    };
    const waitFor = async (expr, timeout = 15000) => {
        const end = Date.now() + timeout;
        while (Date.now() < end) { try { if (await evaluate(expr)) return true; } catch {} await sleep(150); }
        return false;
    };
    const goto = async url => { await send('Page.navigate', { url }); await sleep(300); };
    return { proc, evaluate, waitFor, goto, errors };
}

const results = [];
function check(mode, name, ok, detail = '') { results.push({ mode, name, ok, detail }); }

const STATE = `(() => ({
    url: location.pathname + location.search + location.hash,
    places: document.querySelectorAll('.list-place').length,
    active: (document.querySelector('.list-place.active .place-title') || {}).dataset?.slug || null,
    infoVisible: [...document.querySelectorAll('.additionalInfo')].filter(e => !e.hidden).map(e => e.id),
    about: document.getElementById('about-page').getAttribute('aria-hidden'),
    alert: (document.getElementById('sfalertdialog') || {}).getAttribute?.('aria-hidden'),
}))()`;

async function run(mode, port) {
    const base = `http://127.0.0.1:${port}/`;
    const r = (route) => mode === 'history' ? base + route : base + (route ? '#/' + route : '');
    const urlOf = (route) => new URL(r(route)).pathname + new URL(r(route)).hash;
    const b = await chrome();
    const ready = n => b.waitFor(`document.querySelectorAll('.list-place').length === ${n} && document.querySelector('.leaflet-container') !== null`);
    const st = () => b.evaluate(STATE);
    try {
        await b.goto(base);
        check(mode, 'home page loads spaces', await ready(68), JSON.stringify(await st()));

        // select a place from the list
        const first = await b.evaluate(`document.querySelector('.list-place .place-title').dataset.slug`);
        await b.evaluate(`document.querySelector('.list-place .place-title').click()`);
        await b.waitFor(`document.querySelector('.list-place.active') !== null`);
        let s = await st();
        check(mode, 'clicking a place sets URL and shows details', s.url === urlOf('spaces/' + first) && s.infoVisible.length === 1, JSON.stringify(s));

        // select another, then back twice
        const second = await b.evaluate(`document.querySelectorAll('.list-place .place-title')[3].dataset.slug`);
        await b.evaluate(`document.querySelectorAll('.list-place .place-title')[3].click()`);
        await sleep(600);
        s = await st();
        check(mode, 'clicking another place selects it', s.active === second && s.url === urlOf('spaces/' + second) && s.infoVisible.length === 1, JSON.stringify(s));
        await b.evaluate(`history.back()`); await sleep(600);
        s = await st();
        check(mode, 'back selects previous place', s.active === first && s.url === urlOf('spaces/' + first) && s.infoVisible.length === 1, JSON.stringify(s));
        await b.evaluate(`history.back()`); await sleep(600);
        s = await st();
        check(mode, 'back again deselects (home URL)', s.active === null && s.url === urlOf('') && s.infoVisible.length === 0, JSON.stringify(s));
        await b.evaluate(`history.forward()`); await sleep(600);
        s = await st();
        check(mode, 'forward reselects', s.active === first, JSON.stringify(s));

        // collapse by clicking the title again
        await b.evaluate(`document.querySelector('.list-place.active .place-title')?.click()`); await sleep(300);
        s = await st();
        check(mode, 'clicking an open place closes it and resets URL', s.active === null && s.url === urlOf('') && s.infoVisible.length === 0, JSON.stringify(s));

        // search ignores hidden details
        await b.evaluate(`(() => { const i = document.getElementById('search-input'); i.value = 'Monday'; i.dispatchEvent(new Event('input', {bubbles: true})); document.getElementById('search-submit').click(); })()`);
        await sleep(400);
        const shown = await b.evaluate(`document.querySelectorAll('.list-place:not(.hidden)').length`);
        check(mode, 'search does not match hidden details ("Monday" is only in one visible description)', shown === 1, 'shown ' + shown);
        await b.evaluate(`document.getElementById('search-reset').click()`); await sleep(300);

        // place type filter
        await b.evaluate(`document.getElementById('place_type_library').click()`); await sleep(400);
        const libs = await b.evaluate(`document.querySelectorAll('.list-place:not(.hidden)').length`);
        check(mode, 'place type filter works (libraries)', libs > 0 && libs < 68, 'shown ' + libs);
        await b.evaluate(`document.getElementById('place_type_library').click()`); await sleep(300);

        // information page
        await b.evaluate(`document.querySelector('.modal-trigger[data-dialoghash="about"]').click()`); await sleep(400);
        s = await st();
        check(mode, 'about page opens with page/about URL', s.about !== 'true' && s.url === urlOf('page/about'), JSON.stringify(s));
        await b.evaluate(`history.back()`); await sleep(500);
        s = await st();
        check(mode, 'back closes about page', s.about === 'true' && s.url === urlOf(''), JSON.stringify(s));
        await b.evaluate(`document.querySelector('.modal-trigger[data-dialoghash="about"]').click()`); await sleep(300);
        await b.evaluate(`document.querySelector('#about-page .dialog-close').click()`); await sleep(400);
        s = await st();
        check(mode, 'closing about page restores URL', s.about === 'true' && s.url === urlOf(''), JSON.stringify(s));

        // direct visits
        await b.goto(r('spaces/1915'));
        await ready(68); await b.waitFor(`document.querySelector('.list-place.active') !== null`);
        s = await st();
        check(mode, 'direct visit to spaces/1915', s.active === '1915' && s.url === urlOf('spaces/1915') && s.infoVisible.length === 1, JSON.stringify(s));

        await b.goto(r('buildings/parkinson-building'));
        await ready(95); await b.waitFor(`document.querySelector('.list-place.active') !== null`);
        s = await st();
        check(mode, 'direct visit to buildings/parkinson-building', s.active === 'parkinson-building' && s.places === 95, JSON.stringify(s));

        await b.goto(r('art'));
        check(mode, 'direct visit to art', await ready(22), JSON.stringify(await st()));

        await b.goto(r('page/about'));
        await ready(68); await sleep(500);
        s = await st();
        check(mode, 'direct visit to page/about', s.about !== 'true', JSON.stringify(s));

        await b.goto(r('spaces/no-such-place'));
        await ready(68); await sleep(800);
        s = await st();
        check(mode, 'unknown place shows alert and goes home', s.alert !== 'true' && s.url === urlOf(''), JSON.stringify(s));

        // back across datasets reloads into the other dataset
        await b.goto(r('art/a-spire'));
        await ready(22); await b.waitFor(`document.querySelector('.list-place.active') !== null`);
        await b.goto(r('spaces/1915'));
        await ready(68); await sleep(500);
        await b.evaluate(`history.back()`); await sleep(500);
        await ready(22); await b.waitFor(`document.querySelector('.list-place.active') !== null`);
        s = await st();
        check(mode, 'back to another dataset reloads it', s.places === 22 && s.active === 'a-spire', JSON.stringify(s));

        // old URLs
        await b.goto(base + '#/space/1915');
        await ready(68); await b.waitFor(`document.querySelector('.list-place.active') !== null`);
        s = await st();
        check(mode, 'old #/space/1915 link', s.active === '1915' && s.url === urlOf('spaces/1915'), JSON.stringify(s));
    } catch (e) {
        check(mode, 'test script stopped', false, e.message);
    } finally {
        const errs = [...new Set(b.errors)];
        check(mode, 'no JavaScript errors', errs.length === 0, errs.slice(0, 5).join(' | '));
        b.proc.kill();
        await sleep(500);
    }
}

if (!process.argv.includes('--no-build')) build();
await serve(path.join(ROOT, 'hash'), 4101);
await serve(path.join(ROOT, 'history'), 4102);
await run('hash', 4101);
await run('history', 4102);
for (const x of results) console.log((x.ok ? 'PASS ' : 'FAIL ') + x.mode.padEnd(8) + x.name + (x.ok ? '' : '\n        ' + x.detail));
process.exit(results.every(x => x.ok) ? 0 : 1);
