// src/tray.js
const { Tray, Menu, app } = require('electron');
const path = require('path');
const { fetchMissedMessages } = require('./relay');

let tray = null;

function setupTray(win) {
    const iconPath = path.join(__dirname, '../renderer/assets/icons/icon.png');

    tray = new Tray(iconPath);
    const menu = Menu.buildFromTemplate([
        { label: 'Refresh Messages', click: async () => win.webContents.send('refresh-messages') },
        { label: 'Open Swalert', click: () => win.show() },
        { type: 'separator' },
        { label: 'Quit', click: () => app.quit() },
    ]);

    tray.setToolTip('Swalert Running');
    tray.setContextMenu(menu);

    tray.on('double-click', () => win.show());

    console.log('[Swalert] Tray initialized');
}

module.exports = { setupTray };
