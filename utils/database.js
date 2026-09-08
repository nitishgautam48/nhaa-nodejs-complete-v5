// ================================================================
//  DATABASE - Simple JSON Storage
// ================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Database {
    constructor() {
        this.dataDir = path.join(__dirname, '../data');
        this.casesFile = path.join(this.dataDir, 'cases.json');
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

    saveCase(caseData) {
        const cases = this.getAllCases();
        const newCase = {
            id: caseData.id || `CASE-${Date.now().toString().slice(-8)}`,
            timestamp: new Date().toISOString(),
            ...caseData
        };
        cases.unshift(newCase);
        if (cases.length > 100) cases.splice(100);
        fs.writeFileSync(this.casesFile, JSON.stringify(cases, null, 2));
        return newCase;
    }

    getAllCases() {
        try {
            return JSON.parse(fs.readFileSync(this.casesFile, 'utf8'));
        } catch {
            return [];
        }
    }

    getCase(id) {
        return this.getAllCases().find(c => c.id === id) || null;
    }

    deleteCase(id) {
        let cases = this.getAllCases();
        cases = cases.filter(c => c.id !== id);
        fs.writeFileSync(this.casesFile, JSON.stringify(cases, null, 2));
        return true;
    }

    getStats() {
        const cases = this.getAllCases();
        return {
            total: cases.length,
            lastUpdated: new Date().toISOString()
        };
    }
}

export default Database;