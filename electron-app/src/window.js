// src/window.js
const { BrowserWindow } = require('electron');
const path = require('path');

function createMainWindow() {
    const win = new BrowserWindow({
        width: 400,
        height: 400,
        frame: false, // no native title bar
        titleBarStyle: 'hidden',
        backgroundColor: '#3F403E',
        webPreferences: {
            preload: path.join(__dirname, '../preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
    });

    win.loadURL(`file://${path.join(__dirname, '../renderer/index.html')}`);
    win.setMenu(null);

    win.webContents.on('did-finish-load', () => {
        console.log('[Swalert] Renderer loaded');
    });

    return win;
}

module.exports = { createMainWindow };
