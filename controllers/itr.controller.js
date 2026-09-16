// ================================================================
//  ITR CONTROLLER
//  Upload Form 16 -> extract -> review/correct -> compute tax
//  (old vs new regime) -> ITR-1 prefill JSON.
// ================================================================

import fs from 'fs';
import DocumentParser from '../services/documentParser.js';
import { extractForm16Fields } from '../services/itr/formSixteenExtractor.js';
import { computeRegimeComparison, supportedAssessmentYears } from '../services/itr/taxEngine.js';
import { buildItrOnePrefill } from '../models/itr/itrOneMapper.js';
import ItrDatabase from '../utils/itrDatabase.js';

const DEFAULT_ASSESSMENT_YEAR = '2026-27';

function mergeEffectiveFields(extractedFields, overrides) {
    const effective = {};
    for (const [key, field] of Object.entries(extractedFields)) {
        if (overrides && Object.prototype.hasOwnProperty.call(overrides, key)) {
            effective[key] = { value: overrides[key], confidence: 'user' };
        } else {
            effective[key] = field;
        }
    }
    return effective;
}

class ItrController {
    constructor() {
        this.db = new ItrDatabase();
        this.documentParser = new DocumentParser();
    }

    async uploadForm16(req, res) {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded. Attach the Form 16 PDF as "form16".' });
        }

        try {
            const { text, warning } = await this.documentParser.extractText(req.file.path, req.file.mimetype, req.file.originalname);
            const { fields, warnings } = extractForm16Fields(text);

            const assessmentYear = req.body.assessmentYear || DEFAULT_ASSESSMENT_YEAR;
            if (!supportedAssessmentYears().includes(assessmentYear)) {
                return res.status(400).json({ success: false, error: `Unsupported assessment year. Supported: ${supportedAssessmentYears().join(', ')}` });
            }

            const itrCase = this.db.createCase({
                assessmentYear,
                documentName: req.file.originalname,
                status: 'uploaded',
                extractedFields: fields,
                overrides: {},
                otherIncome: 0,
                computation: null,
                selectedRegime: null,
                warnings: warning ? [...warnings, warning] : warnings
            });

            res.json({ success: true, case: this._withEffectiveFields(itrCase) });
        } catch (error) {
            console.error('Form 16 upload error:', error.message);
            res.status(500).json({ success: false, error: 'Could not process the uploaded document.' });
        } finally {
            // Financial PII - don't retain the raw PDF on disk once its
            // text has been extracted into the case record.
            fs.unlink(req.file.path, () => {});
        }
    }

    getCase(req, res) {
        const itrCase = this.db.getCase(req.params.id);
        if (!itrCase) return res.status(404).json({ success: false, error: 'Case not found' });
        res.json({ success: true, case: this._withEffectiveFields(itrCase) });
    }

    updateFields(req, res) {
        const itrCase = this.db.getCase(req.params.id);
        if (!itrCase) return res.status(404).json({ success: false, error: 'Case not found' });

        const overrides = { ...itrCase.overrides, ...(req.body.overrides || {}) };
        const patch = { overrides, status: 'reviewed' };
        if (typeof req.body.otherIncome === 'number') {
            patch.otherIncome = req.body.otherIncome;
        }
        // Field values changed - any previous computation is now stale.
        patch.computation = null;
        patch.selectedRegime = null;

        const updated = this.db.updateCase(req.params.id, patch);
        res.json({ success: true, case: this._withEffectiveFields(updated) });
    }

    computeTax(req, res) {
        const itrCase = this.db.getCase(req.params.id);
        if (!itrCase) return res.status(404).json({ success: false, error: 'Case not found' });

        const effectiveFields = mergeEffectiveFields(itrCase.extractedFields, itrCase.overrides);
        const grossSalary = effectiveFields.grossSalary?.value;
        if (grossSalary == null) {
            return res.status(400).json({ success: false, error: 'Gross salary is missing - fill it in via PATCH /fields before computing tax.' });
        }

        const computation = computeRegimeComparison({
            assessmentYear: itrCase.assessmentYear,
            grossSalary,
            otherIncome: itrCase.otherIncome || 0,
            chapterVIADeductions: effectiveFields.totalChapterVIADeductions?.value || 0
        });

        const updated = this.db.updateCase(req.params.id, {
            computation,
            selectedRegime: computation.recommended,
            status: 'computed'
        });

        res.json({ success: true, case: this._withEffectiveFields(updated) });
    }

    selectRegime(req, res) {
        const { regime } = req.body;
        if (!['old', 'new'].includes(regime)) {
            return res.status(400).json({ success: false, error: 'regime must be "old" or "new"' });
        }
        const itrCase = this.db.getCase(req.params.id);
        if (!itrCase) return res.status(404).json({ success: false, error: 'Case not found' });
        if (!itrCase.computation) {
            return res.status(400).json({ success: false, error: 'Compute tax first via POST /compute' });
        }
        const updated = this.db.updateCase(req.params.id, { selectedRegime: regime });
        res.json({ success: true, case: this._withEffectiveFields(updated) });
    }

    getPrefill(req, res) {
        const itrCase = this.db.getCase(req.params.id);
        if (!itrCase) return res.status(404).json({ success: false, error: 'Case not found' });
        if (!itrCase.computation) {
            return res.status(400).json({ success: false, error: 'Compute tax first via POST /compute' });
        }

        const withEffective = this._withEffectiveFields(itrCase);
        const prefill = buildItrOnePrefill({
            ...withEffective,
            computation: { regime: itrCase.selectedRegime, ...itrCase.computation }
        });
        res.json({ success: true, prefill });
    }

    _withEffectiveFields(itrCase) {
        return {
            ...itrCase,
            effectiveFields: mergeEffectiveFields(itrCase.extractedFields, itrCase.overrides)
        };
    }
}

export default ItrController;
