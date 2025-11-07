console.log('[Preload] Loaded successfully.');

// preload.js
const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

// Safe import of config.js (relative to main process root)
const CONFIG = require(path.join(__dirname, 'config.js'));

// Expose limited API to renderer
contextBridge.exposeInMainWorld('swalertAPI', {
    refresh: () => ipcRenderer.send('refresh-messages'),
    sendMessage: (message) => ipcRenderer.send('send-message', message),
    getConfig: () => Promise.resolve(CONFIG),
});
