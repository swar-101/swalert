const {app, BrowserWindow, ipcMain} = require("electron");
const {globalShortcut} = require('electron');
const {fetchMissedMessages, sendMessage} = require('./src/relay');
const {setupTray} = require('./src/tray');
const {startWebSocket} = require('./src/websocket');
const {initDatabase, getMessagesDB, saveMessageDB, softDeleteMessageDB} = require("./src/db");
const {createMainWindow} = require('./src/window');

let mainWindow; // 🔁 global ref for push events

app.commandLine.appendSwitch('allow-file-access-from-files');

app.whenReady().then(async () => {
    initDatabase();

    mainWindow = createMainWindow();
    setupTray(mainWindow);

    console.log(`[Swalert] Database ready with ${getMessagesDB().length} records.`);
    console.log('[Swalert Dev] Press Ctrl + Shift + R to reload UI');


    // IPC bindings
    ipcMain.handle('db-get-messages', () => getMessagesDB());
    ipcMain.handle('db-save-message', (event, {msg}) => saveMessageDB(msg));
    ipcMain.handle('db-soft-delete', (event, {id}) => softDeleteMessageDB(id));

    ipcMain.on('refresh-messages', async () => {
        try {
            console.log('[Swalert Debug] Refresh triggered');
            const messages = await fetchMissedMessages();
            console.log('[Swalert Debug] fetchMissedMessages() returned:', messages);

            if (mainWindow && Array.isArray(messages)) {
                mainWindow.webContents.send('messages-refreshed', messages);
            } else {
                console.warn('[Swalert Debug] No messages returned from fetchMissedMessages()');
            }
        } catch (err) {
            console.error('[Swalert Debug] Error during refresh:', err);
        }
    });

    ipcMain.on('send-message', async (e, msg) => {
        console.log('[Swalert] Sending message:', msg);
        const success = await sendMessage(msg);
        if (mainWindow) {
            mainWindow.webContents.send('message-sent', { msg, success });
        }
    });

    // Dev Shortcuts
    globalShortcut.register('CommandOrControl+Shift+I', () => mainWindow.webContents.toggleDevTools());
    globalShortcut.register('CommandOrControl+Shift+R', () => mainWindow.reload());

    // -- initial sync
    console.log("[Swalert] App ready. Fetching missed messages...");
    await fetchMissedMessages();

    // -- websocket stream
    console.log("[Swalert] Starting live WebSocket stream...");
    startWebSocket((msg) => {
        if (mainWindow)
            mainWindow.webContents.send('new-message', msg);
    });
});

app.on("window-all-closed", () => {
    // On macOS, it's common to keep apps alive in tray, but let's exit cleanly for now.
    if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
    // Re-create a window if clicked on dock icon (macOS)
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});