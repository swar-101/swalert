const path = require('path');
// const Database = require('better-sqlite3');
const sqlite3 = require('sqlite3').verbose();
const { app } = require('electron');

let db;

function initDatabase() {
    const DB_PATH = path.join(app.getPath('userData'), 'swalert.sqlite');
    db = new sqlite3.Database(DB_PATH);
    db.prepare(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            msg TEXT NOT NULL, 
            timestamp INTEGER NOT NULL, 
            source TEXT NOT NULL DEFAULT 'local',
            deleted INTEGER DEFAULT 0, 
            UNIQUE(timestamp, msg) ON CONFLICT IGNORE
        )
    `).run();
    console.log('[Swalert] DB initialized at', DB_PATH);
}

function saveMessageDB(msg, timestamp = Date.now(), source = 'local') {
    const stmt = db.prepare('INSERT INTO messages (msg, timestamp, source) VALUES (?, ?, ?)');
    const info = stmt.run(msg, timestamp, source);
    console.log('[Swalert][DB] message getting saved...')
    return info.lastInsertRowid;
}

function getMessagesDB(includeDeleted = false) {
    const query = includeDeleted
        ? 'SELECT * FROM messages ORDER BY timestamp ASC'
        : 'SELECT * FROM messages WHERE deleted = 0 ORDER BY timestamp ASC';
    return db.prepare(query).all();
}

function softDeleteMessageDB(id) {
    db.prepare('UPDATE messages SET deleted = 1 WHERE id = ?').run(id);
    return true;
}

module.exports = {
    initDatabase,
    saveMessageDB,
    getMessagesDB,
    softDeleteMessageDB,
};
