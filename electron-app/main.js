const {app, BrowserWindow, Notification, Tray, Menu} = require('electron');
const WebSocket = require('ws');
const axios = require('axios');

const NTFY_TOPIC = 'swalert-phone-to-pc';

let tray = null;

function createWindow() {
    const win = new BrowserWindow({
        width: 400,
        height: 300,
        webPreferences: {preload: __dirname + 'preload.js'},
    });
    win.loadFile('renderer/index.html');
    win.setMenu(null);
    return win;
}

function setupTray(win) {
    tray = new Tray('renderer/icon.png');
    const menu = Menu.buildFromTemplate([
        {label : 'Open Swalert', click: () => win.show() },{
        label : 'Quit', click: () => app.quit()
        },
    ]);
    tray.setToolTip('Swalert Running');
    tray.setContextMenu(menu);
}

function startWebSocket() {
    console.log('Connecting to ntfy...');
    const ws = new WebSocket(`wss://ntfy.sh/${NTFY_TOPIC}/ws`, {
        headers: { 'Cache-Control': 'no-cache' }
    });

    ws.on('message', (data) => {
        const msg = JSON.parse(data);
        console.log('Received', msg);

        new Notification({
            title: msg.title || 'Swalert Incoming 🚨',
            body: msg.message || msg,
        }).show();
    });

    ws.on('close', () => {
        console.log('Connection closed. Reconnecting in 5s...');
        setTimeout(startWebSocket, 5000);
    });

    ws.on('error', (err) => {
        console.error('Error: ', err.message);
    });
}

async function fetchMissedMessages() {
    const urlJson = `https://ntfy.sh/${NTFY_TOPIC}/json`;
    console.log('[Swalert] Fetching missed messages from', urlJson);

    // helper: try to parse text as JSON array or NDJSON
    function parseJsonOrNdjson(text) {
        text = String(text || '').trim();
        if (!text) return [];
        // try full-array JSON first
        try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) return parsed;
        } catch (e) { /* not a JSON array */ }

        // fallback: NDJSON (one json object per line)
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const out = [];
        for (const ln of lines) {
            try {
                out.push(JSON.parse(ln));
            } catch (e) {
                // ignore bad lines
            }
        }
        return out;
    }

    // helper: crude HTML fallback scraper (no new deps)
    function parseHtmlFallback(html) {
        const s = String(html || '');
        // try to find <pre> ... </pre> which sometimes contains NDJSON/JSON
        const preMatch = s.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
        if (preMatch && preMatch[1]) {
            return parseJsonOrNdjson(preMatch[1]);
        }

        // otherwise try to extract <li> blocks or other message-like nodes
        const liMatches = [...s.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
        if (liMatches.length) {
            return liMatches.map((m, i) => {
                // strip tags from innerHTML
                const inner = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                return { id: `html-${i}-${Date.now()}`, title: undefined, message: inner };
            });
        }

        // last-ditch: try any text nodes that look like JSON lines
        const textOnly = s.replace(/<[^>]+>/g, '\n').replace(/\s+\n\s+/g, '\n').trim();
        return parseJsonOrNdjson(textOnly);
    }

    try {
        // Try GET as text (avoid axios auto-stream behavior)
        const res = await axios.get(urlJson, {
            responseType: 'text',
            timeout: 7000,
            validateStatus: () => true, // handle non-2xx gracefully
        });

        const text = String(res.data || '').trim();
        let messages = parseJsonOrNdjson(text);

        // if nothing useful, try HTML fallback
        if (!messages || messages.length === 0) {
            messages = parseHtmlFallback(res.data);
        }

        if (!messages || messages.length === 0) {
            console.log('[Swalert] No missed messages found (backlog empty or not available).');
            return;
        }

        console.log(`[Swalert] Found ${messages.length} backlog messages (showing them).`);
        for (const msg of messages) {
            // defensive access: handle different shapes
            const title = msg && (msg.title || msg.t || msg.head) || 'Swalert Missed Alert';
            const body = msg && (msg.message || msg.msg || msg.body || (typeof msg === 'string' ? msg : undefined)) || '(no body)';
            new Notification({ title, body }).show();
        }
    } catch (err) {
        // safe, non-throwing failure mode — log and continue
        console.error('[Swalert] Failed to fetch missed:', err && err.message ? err.message : err);
    }
}

app.whenReady().then(async () => {
    const win = createWindow();
    setupTray(win);
    console.log('[Swalert] App ready. Fetching missed messages...');
    await fetchMissedMessages();
    console.log('[Swalert] Missed messages done. Starting live stream...');

    startWebSocket();
});