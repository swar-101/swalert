const axios = require('axios');
const { showNotification } = require('./utils');
const { saveMessageDB, getMessagesDB } = require('./db');
const { NTFY_TOPIC, RELAY_URL } = require('../config');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const LAST_SEEN_FILE = path.join(app.getPath('userData'), 'lastSeen.json');

function getLastSeen() {
    try {
        if (fs.existsSync(LAST_SEEN_FILE)) {
            const data = JSON.parse(fs.readFileSync(LAST_SEEN_FILE, 'utf8'));
            return data.lastSeen || 0;
        }
    } catch {}
    return 0;
}

function setLastSeen(ts) {
    fs.writeFileSync(LAST_SEEN_FILE, JSON.stringify({ lastSeen: ts }));
}

async function fetchMissedMessages() {
    const lastSeen = getLastSeen();
    console.log(`[Swalert] Fetching missed messages since: ${lastSeen}`);

    try {
        const res = await axios.get(RELAY_URL, {
            params: { topic: NTFY_TOPIC, since: lastSeen },
        });

        let messages = Array.isArray(res.data) ? res.data : [];
        if (!messages.length) {
            console.log('[Swalert] No new messages.');
            return getMessagesDB(); // ✅ return current DB messages anyway
        }

        messages.sort((a, b) => a.time - b.time);
        console.log(`[Swalert] ${messages.length} new messages.`);

        for (const msg of messages) {
            const content = msg.body || msg.message || JSON.stringify(msg);
            showNotification(msg.title || 'Swalert Sync ⚡', content);
            saveMessageDB(content, msg.time * 1000, 'relay');
            setLastSeen(msg.time);
        }

        console.log('[Swalert] Sync complete.');

        // ✅ Return updated messages so UI can refresh
        return getMessagesDB();
    } catch (err) {
        console.error('[Swalert] Error fetching missed messages:', err.message);
        return getMessagesDB(); // fallback, still return current data
    }
}

async function sendMessage(msgBody) {
    try {
        console.log(`[Swalert] Sending message: ${msgBody}`);
        await axios.post(`${RELAY_URL}?topic=${NTFY_TOPIC}`, {
            title: 'User Message',
            body: msgBody,
            sender: 'ElectronApp',
        });
        console.log('[Swalert] Message sent.');
    } catch (err) {
        console.error('[Swalert] Failed to send message:', err.message);
    }
}

module.exports = { fetchMissedMessages, sendMessage };
