// src/db.js
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { app } = require('electron');

let db;

/**
 * Initialize SQLite database.
 * Creates the file if not present and ensures the table exists.
 */
function initDatabase() {
    const DB_PATH = path.join(app.getPath('userData'), 'swalert.sqlite');

    db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error('[Swalert][DB] Error opening database:', err.message);
        } else {
            console.log('[Swalert][DB] Connected to SQLite at', DB_PATH);

            db.run(`
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    msg TEXT NOT NULL,
                    timestamp INTEGER NOT NULL,
                    source TEXT NOT NULL DEFAULT 'local',
                    deleted INTEGER DEFAULT 0,
                    UNIQUE(timestamp, msg) ON CONFLICT IGNORE
                )
            `, (err) => {
                if (err) console.error('[Swalert][DB] Error creating table:', err.message);
                else console.log('[Swalert][DB] Table ready.');
            });
        }
    });
}

/**
 * Insert a message into the database.
 */
function saveMessageDB(msg, timestamp = Date.now(), source = 'local') {
    return new Promise((resolve, reject) => {
        const query = `INSERT INTO messages (msg, timestamp, source) VALUES (?, ?, ?)`;
        db.run(query, [msg, timestamp, source], function (err) {
            if (err) {
                console.error('[Swalert][DB] Error inserting message:', err.message);
                reject(err);
            } else {
                console.log('[Swalert][DB] Message saved:', msg);
                resolve(this.lastID);
            }
        });
    });
}

/**
 * Retrieve all messages (optionally including deleted).
 */
function getMessagesDB(includeDeleted = false) {
    return new Promise((resolve, reject) => {
        const query = includeDeleted
            ? 'SELECT * FROM messages ORDER BY timestamp ASC'
            : 'SELECT * FROM messages WHERE deleted = 0 ORDER BY timestamp ASC';

        db.all(query, [], (err, rows) => {
            if (err) {
                console.error('[Swalert][DB] Error fetching messages:', err.message);
                reject(err);
            } else {
                resolve(rows || []);
            }
        });
    });
}

/**
 * Soft delete a message by marking it as deleted.
 */
function softDeleteMessageDB(id) {
    return new Promise((resolve, reject) => {
        db.run('UPDATE messages SET deleted = 1 WHERE id = ?', [id], function (err) {
            if (err) {
                console.error('[Swalert][DB] Error deleting message:', err.message);
                reject(err);
            } else {
                resolve(this.changes > 0);
            }
        });
    });
}

module.exports = {
    initDatabase,
    saveMessageDB,
    getMessagesDB,
    softDeleteMessageDB,
};