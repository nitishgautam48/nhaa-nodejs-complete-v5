// ================================================================
//  USER STORE - Simple JSON Storage for Optional Victim Accounts
//
//  Same pattern as utils/database.js's case storage. Accounts here are
//  entirely OPTIONAL - the assessment tool works fully anonymously
//  without one (see frontend/advanced_dashboard.html's account widget).
//  Passwords are bcrypt-hashed before ever touching disk; the plaintext
//  password is never stored or logged.
// ================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UserStore {
    constructor() {
        this.dataDir = path.join(__dirname, '../data');
        this.usersFile = path.join(this.dataDir, 'users.json');
        this._ensureDirectory();
        this._initializeFile();
    }

    _ensureDirectory() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    _initializeFile() {
        if (!fs.existsSync(this.usersFile)) {
            fs.writeFileSync(this.usersFile, JSON.stringify([], null, 2));
        }
    }

    _readAll() {
        try {
            return JSON.parse(fs.readFileSync(this.usersFile, 'utf8'));
        } catch {
            return [];
        }
    }

    _writeAll(users) {
        fs.writeFileSync(this.usersFile, JSON.stringify(users, null, 2));
    }

    findByEmail(email) {
        const normalized = (email || '').trim().toLowerCase();
        return this._readAll().find(u => u.email === normalized) || null;
    }

    // `passwordHash` must already be a bcrypt hash - this store never
    // hashes or verifies passwords itself, see services/auth.js.
    createUser({ email, mobile, passwordHash }) {
        const users = this._readAll();
        const normalizedEmail = (email || '').trim().toLowerCase();
        const user = {
            id: `USER-${Date.now().toString().slice(-8)}-${Math.round(Math.random() * 1e4)}`,
            email: normalizedEmail,
            mobile: (mobile || '').trim(),
            passwordHash,
            createdAt: new Date().toISOString()
        };
        users.push(user);
        this._writeAll(users);
        return user;
    }
}

export default UserStore;
