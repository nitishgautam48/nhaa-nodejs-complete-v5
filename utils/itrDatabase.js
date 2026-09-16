// ================================================================
//  ITR DATABASE - Simple JSON Storage for ITR assistant cases
//  (mirrors utils/database.js's pattern, separate file so this
//  feature never touches the SC/ST case store)
// ================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ItrDatabase {
    constructor() {
        this.dataDir = path.join(__dirname, '../data/itr');
        this.casesFile = path.join(this.dataDir, 'itrCases.json');
        this._ensureDirectory();
        this._initializeFile();
    }

    _ensureDirectory() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    _initializeFile() {
        if (!fs.existsSync(this.casesFile)) {
            fs.writeFileSync(this.casesFile, JSON.stringify([], null, 2));
        }
    }

    _readAll() {
        try {
            return JSON.parse(fs.readFileSync(this.casesFile, 'utf8'));
        } catch {
            return [];
        }
    }

    _writeAll(cases) {
        fs.writeFileSync(this.casesFile, JSON.stringify(cases, null, 2));
    }

    createCase(record) {
        const cases = this._readAll();
        const now = new Date().toISOString();
        const newCase = {
            id: `ITR-${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`,
            createdAt: now,
            updatedAt: now,
            ...record
        };
        cases.unshift(newCase);
        if (cases.length > 200) cases.splice(200);
        this._writeAll(cases);
        return newCase;
    }

    getCase(id) {
        return this._readAll().find(c => c.id === id) || null;
    }

    updateCase(id, patch) {
        const cases = this._readAll();
        const idx = cases.findIndex(c => c.id === id);
        if (idx === -1) return null;
        cases[idx] = { ...cases[idx], ...patch, id, updatedAt: new Date().toISOString() };
        this._writeAll(cases);
        return cases[idx];
    }
}

export default ItrDatabase;
