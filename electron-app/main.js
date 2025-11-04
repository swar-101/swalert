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
    try {
        const response = await axios.get(`https://ntfy.sh/${NTFY_TOPIC}/json`);
        const messages = response.data;
        messages.forEach(msg => {
            new Notification({
                title: msg.title || 'Swalert Missed Alert',
                body: msg.message || msg,
            }).show();
        });
    } catch (e) {
        console.error('Failed to fetch missed:', e.message);
    }
}

app.whenReady().then(async () => {
    const win = createWindow();
    setupTray(win);
    await fetchMissedMessages();
    startWebSocket();
});