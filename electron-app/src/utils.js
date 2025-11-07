// src/utils.js
const { Notification } = require('electron');

function showNotification(title, body) {
    try {
        new Notification({ title, body }).show();
    } catch (err) {
        console.error('[Swalert] Notification error:', err);
    }
}

module.exports = { showNotification };