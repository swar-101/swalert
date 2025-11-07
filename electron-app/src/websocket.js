// src/websocket.js
const WebSocket = require('ws');
const { showNotification } = require('./utils');
const { saveMessageDB } = require('./db');
const { NTFY_TOPIC } = require('../config');

let ws = null;  // single persistent connection
let reconnectTimer = null;

function startWebSocket(onMessage) {
    if (ws) {
        console.log('[Swalert] WebSocket already running.');
        return;
    }

    console.log('[Swalert] Connecting to ntfy...');
    ws = new WebSocket(`wss://ntfy.sh/${NTFY_TOPIC}/ws`, {
        headers: { 'Cache-Control': 'no-cache' },
    });

    ws.on('open', () => {
        console.log('[Swalert] WebSocket connected ✅');
    });

    ws.on('message', async (data) => {
        try {
            const msg = JSON.parse(data);
            console.log('[Swalert] Live message received:', msg);

            // Extract meaningful content
            const content = msg.message || JSON.stringify(msg);
            const title = msg.title || 'Swalert Incoming 🚨';

            // ✅ Show desktop notification
            showNotification(title, content);

            // ✅ Save to database
            await saveMessageDB(content, Date.now(), 'relay');

            // ✅ Push to renderer if callback exists
            if (typeof onMessage === 'function') {
                onMessage({ title, content, timestamp: Date.now(), source: 'relay' });
            }
        } catch (err) {
            console.error('[Swalert] Bad WS message:', err);
        }
    });

    ws.on('close', () => {
        console.warn('[Swalert] WS closed. Attempting reconnect in 5s...');
        ws = null;

        // avoid stacking reconnects
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
            startWebSocket(onMessage);
        }, 5000);
    });

    ws.on('error', (err) => {
        console.error('[Swalert] WebSocket error:', err.message);
    });
}

module.exports = { startWebSocket };