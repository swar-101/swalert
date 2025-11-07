
const {app, BrowserWindow, Notification, Tray, Menu, ipcMain} = require("electron");
const WebSocket = require("ws");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const {globalShortcut} = require('electron');

// app.commandLine.appendSwitch('force-device-scale-factor', '1');

// ✅ Import environment config
const CONFIG = require("./config");
const {NTFY_TOPIC, RELAY_URL, MODE} = CONFIG;

console.log(`[Swalert] Running in ${MODE} mode`);
console.log(`[Swalert] Using relay: ${RELAY_URL}`);

const LAST_SEEN_FILE = path.join(app.getPath("userData"), "lastSeen.json");
let tray = null;

// --- Helper functions ---
function showNotification(title, body) {
    new Notification({title, body}).show();
}

function getLastSeen() {
    try {
        if (fs.existsSync(LAST_SEEN_FILE)) {
            const data = JSON.parse(fs.readFileSync(LAST_SEEN_FILE, "utf8"));
            return data.lastSeen || 0;
        }
    } catch (e) {
        console.error("Failed to read lastSeen:", e);
    }
    return 0;
}

function setLastSeen(ts) {
    try {
        fs.writeFileSync(LAST_SEEN_FILE, JSON.stringify({lastSeen: ts}), "utf8");
    } catch (e) {
        console.error("Failed to save lastSeen:", e);
    }
}

// --- Window + Tray setup ---
function createWindow() {
    const win = new BrowserWindow({
        width: 400,
        height: 400,
        frame: false, // remove the native title bar
        titleBarStyle: 'hidden',
        backgroundColor: '#3F403E',

        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
    });

    // win.loadFile("renderer/index.html");
    win.loadURL(`file://${path.join(__dirname, "renderer", "index.html")}`);


    win.setMenu(null);
    return win;
}

function setupTray(win) {
    tray = new Tray(path.join(__dirname, "renderer/icon.png"))
    const menu = Menu.buildFromTemplate([
        {label: "Refresh Messages", click: async () => await fetchMissedMessages()},
        {label: "Open Swalert", click: () => win.show()},
        {type: "separator"},
        {label: "Quit", click: () => app.quit()},
    ]);

    tray.setToolTip("Swalert Running");
    tray.setContextMenu(menu);
}

// --- Core message sync logic ---
async function fetchMissedMessages() {
    const lastSeen = getLastSeen();
    console.log(`[Swalert] Last seen: ${lastSeen}`);

    try {
        const res = await axios.get(RELAY_URL, {
            params: {topic: NTFY_TOPIC, since: lastSeen},
        });
        let messages = res.data;
        if (!Array.isArray(messages)) {
            console.warn('[Swalert] Unexpected response format:', messages);
            messages = [];
        }

        if (messages.length === 0) {
            console.log("[Swalert] No new messages.");
            return;
        }

        messages.sort((a, b) => a.time - b.time);
        console.log(`[Swalert] ${messages.length} new messages.`);

        for (const msg of messages) {
            showNotification(msg.title || "Swalert Sync ⚡", msg.body || "[No content]");
            setLastSeen(msg.time);
        }

        console.log("[Swalert] Sync complete.");
    } catch (err) {
        console.error("[Swalert] Error fetching missed messages:", err.message);
    }
}

// --- Live updates via ntfy websocket ---
function startWebSocket() {
    console.log("[Swalert] Connecting to ntfy...");
    const ws = new WebSocket(`wss://ntfy.sh/${NTFY_TOPIC}/ws`, {
        headers: {"Cache-Control": "no-cache"},
    });

    ws.on("message", (data) => {
        try {
            const msg = JSON.parse(data);
            console.log("Received:", msg);

            showNotification(msg.title || "Swalert Incoming 🚨", msg.message || JSON.stringify(msg));
        } catch (e) {
            console.error("Bad WS message:", e);
        }
    });

    ws.on("close", () => {
        console.log("[Swalert] Connection closed. Reconnecting in 5s...");
        setTimeout(startWebSocket, 5000);
    });

    ws.on("error", (err) => {
        console.error("[Swalert] WebSocket error:", err.message);
    });
}

// --- IPC bindings ---
ipcMain.on("refresh-messages", async () => {
    console.log("[Swalert] Manual refresh requested");
    await fetchMissedMessages();
});

ipcMain.on("send-message", async (event, msgBody) => {
    console.log(`[Swalert] Sending message: ${msgBody}`);

    try {
        await axios.post(`${RELAY_URL}?topic=${NTFY_TOPIC}`, {
            title: "User Message",
            body: msgBody,
            sender: "ElectronApp",
        });
        console.log("[Swalert] Message sent.");
    } catch (err) {
        console.error("[Swalert] Failed to send message:", err.message);
    }
});

app.commandLine.appendSwitch('allow-file-access-from-files');

// --- App startup ---
app.whenReady().then(async () => {
    const win = createWindow();
    setupTray(win);
    console.log('[Swalert Dev] Press Ctrl + Shift + R to reload UI');

    globalShortcut.register('CommandOrControl+Shift+I', () => {
        const focused = BrowserWindow.getFocusedWindow();
        if (focused) focused.webContents.toggleDevTools();
    });

    globalShortcut.register('CommandOrControl+Shift+R', () => {
        const [win] = BrowserWindow.getAllWindows();
        if (win) {
            console.log('[Swalert Dev] Reloading renderer...');
            win.reload(); // ✅ reloads UI instantly
        }
    });

    console.log("[Swalert] App ready. Fetching missed messages...");
    await fetchMissedMessages();

    console.log("[Swalert] Starting live WebSocket stream...");
    startWebSocket();
});

app.on("window-all-closed", () => {
    // On macOS, it's common to keep apps alive in tray, but let's exit cleanly for now.
    if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
    // Re-create a window if clicked on dock icon (macOS)
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});