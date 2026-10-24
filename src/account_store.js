const { DatabaseSync } = require('node:sqlite');
const { mkdirSync } = require('node:fs');
const path = require('node:path');
const { randomBytes, randomUUID, createHash, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const deriveKey = promisify(scrypt);
const SESSION_AGE = 7 * 24 * 60 * 60 * 1000;
const tokenHash = (token) => createHash('sha256').update(token).digest('hex');

function fail(status, message) {
    const error = new Error(message);
    error.status = status;
    error.accountError = true;
    throw error;
}

function createAccountStore(
    filename = process.env.DATABASE_PATH || path.join(__dirname, '../data/app.sqlite')
) {
    if (filename !== ':memory:')
        mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
    const db = new DatabaseSync(filename);
    db.exec(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE,
            salt TEXT NOT NULL, password_hash TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sessions (
            token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL,
            messages TEXT NOT NULL, preferences TEXT NOT NULL, updated INTEGER NOT NULL, revision INTEGER NOT NULL DEFAULT 1
        );
        CREATE INDEX IF NOT EXISTS conversation_owner ON conversations(user_id, updated DESC);
    `);

    function issueSession(user) {
        db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());
        const token = randomBytes(32).toString('hex');
        db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(
            tokenHash(token),
            user.id,
            Date.now() + SESSION_AGE
        );
        return { user: { id: user.id, username: user.username }, token };
    }

    return {
        async register(username, password) {
            if (typeof username !== 'string' || !/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
                fail(400, 'Use a username with 3–30 letters, numbers or underscores.');
            }
            if (typeof password !== 'string' || password.length < 10 || password.length > 128) {
                fail(400, 'Use a password with 10–128 characters.');
            }
            username = username.toLowerCase();
            const salt = randomBytes(16).toString('hex');
            const hash = (await deriveKey(password, salt, 64)).toString('hex');
            const user = { id: randomUUID(), username };
            try {
                db.prepare('INSERT INTO users VALUES (?, ?, ?, ?)').run(
                    user.id,
                    username,
                    salt,
                    hash
                );
            } catch (error) {
                if (error.code?.startsWith('ERR_SQLITE') && /UNIQUE/.test(error.message))
                    fail(409, 'That username is unavailable.');
                throw error;
            }
            return issueSession(user);
        },
        async login(username, password) {
            if (
                typeof username !== 'string' ||
                typeof password !== 'string' ||
                password.length > 128
            )
                fail(401, 'Invalid username or password.');
            const user = db
                .prepare('SELECT * FROM users WHERE username = ?')
                .get(username.toLowerCase());
            // Derive a hash even for unknown users to avoid a fast username-existence check.
            const hash = await deriveKey(password, user?.salt || 'missing-user-dummy-salt', 64);
            if (!user || !timingSafeEqual(hash, Buffer.from(user.password_hash, 'hex')))
                fail(401, 'Invalid username or password.');
            return issueSession(user);
        },
        getUser(token) {
            if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
            return (
                db
                    .prepare(
                        `SELECT users.id, users.username FROM sessions JOIN users ON users.id = sessions.user_id
                WHERE sessions.token_hash = ? AND sessions.expires > ?`
                    )
                    .get(tokenHash(token), Date.now()) || null
            );
        },
        logout(token) {
            if (token)
                db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash(token));
        },
        list(userId, cursor) {
            let boundary = null;
            if (cursor) {
                try {
                    if (typeof cursor !== 'string' || cursor.length > 300) throw new Error();
                    boundary = JSON.parse(Buffer.from(cursor, 'base64url').toString());
                    if (
                        !Number.isSafeInteger(boundary.updated) ||
                        typeof boundary.id !== 'string' ||
                        boundary.id.length > 50
                    )
                        throw new Error();
                } catch {
                    fail(400, 'Invalid conversation cursor.');
                }
            }
            const rows = boundary
                ? db
                      .prepare(
                          `SELECT id, title, updated, revision FROM conversations
                    WHERE user_id = ? AND (updated < ? OR (updated = ? AND id < ?))
                    ORDER BY updated DESC, id DESC LIMIT 6`
                      )
                      .all(userId, boundary.updated, boundary.updated, boundary.id)
                : db
                      .prepare(
                          `SELECT id, title, updated, revision FROM conversations
                    WHERE user_id = ? ORDER BY updated DESC, id DESC LIMIT 6`
                      )
                      .all(userId);
            const conversations = rows.slice(0, 5);
            const last = conversations.at(-1);
            return {
                conversations,
                nextCursor:
                    rows.length > 5
                        ? Buffer.from(
                              JSON.stringify({ updated: last.updated, id: last.id })
                          ).toString('base64url')
                        : null,
            };
        },
        get(userId, id) {
            const row = db
                .prepare('SELECT * FROM conversations WHERE user_id = ? AND id = ?')
                .get(userId, id);
            if (!row) fail(404, 'Conversation not found.');
            return {
                id: row.id,
                title: row.title,
                updated: row.updated,
                revision: row.revision,
                messages: JSON.parse(row.messages),
                preferences: JSON.parse(row.preferences),
            };
        },
        save(userId, id, messages, preferences, revision) {
            const title =
                messages.find((message) => message.role === 'user')?.text.slice(0, 70) ||
                'New reflection';
            const updated = Date.now();
            if (id) {
                const result = db
                    .prepare(
                        `UPDATE conversations SET title = ?, messages = ?, preferences = ?, updated = ?, revision = revision + 1
                    WHERE id = ? AND user_id = ? AND revision = ?`
                    )
                    .run(
                        title,
                        JSON.stringify(messages),
                        JSON.stringify(preferences),
                        updated,
                        id,
                        userId,
                        revision
                    );
                if (!result.changes)
                    fail(409, 'This conversation changed. Reload it before sending again.');
            } else {
                id = randomUUID();
                db.prepare(
                    'INSERT INTO conversations (id, user_id, title, messages, preferences, updated) VALUES (?, ?, ?, ?, ?, ?)'
                ).run(
                    id,
                    userId,
                    title,
                    JSON.stringify(messages),
                    JSON.stringify(preferences),
                    updated
                );
            }
            return this.get(userId, id);
        },
        remove(userId, id) {
            db.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?').run(id, userId);
        },
        close() {
            db.close();
        },
    };
}

module.exports = { createAccountStore, SESSION_AGE, fail };
