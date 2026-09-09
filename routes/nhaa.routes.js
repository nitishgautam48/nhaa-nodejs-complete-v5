// ================================================================
//  NHAA ROUTES - Complete API Endpoints
// ================================================================

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import NHHAController from '../controllers/nhaa.controller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const controller = new NHHAController();

// Multer config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/m4a', 'audio/webm'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only audio files allowed'), false);
    }
};

const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 }, fileFilter });

// Assessment endpoints
router.post('/hybrid/assess', upload.single('audio'), controller.hybridAssessment.bind(controller));
router.post('/assess/text', controller.textAssessment.bind(controller));

// SC/ST endpoints
router.post('/scst/analyze', controller.scstAnalyze.bind(controller));

// Legal Redressal endpoints
// - /legal/guidance: standalone lookup for the dashboard's Legal tab. Takes
//   { text } (analyzed fresh) or { finalScores } (reuse a prior assessment's
//   scores) - see NHHAController.legalGuidanceLookup.
// - /legal/redressal-channels: static directory (FIR rights, NCSC, NCST,
//   NALSA, NHRC, compensation, cybercrime portal, etc.) independent of any
//   specific case, for populating the tab before the user types anything.
router.post('/legal/guidance', controller.legalGuidanceLookup.bind(controller));
router.get('/legal/redressal-channels', controller.getRedressalChannels.bind(controller));

// Helplines and resources
router.get('/helplines', controller.getHelplines.bind(controller));
router.get('/resources', controller.getResources.bind(controller));
router.get('/languages', controller.getLanguages.bind(controller));

// Case management (authority dashboard) - real server-side records,
// shared across browsers/devices, replacing the old localStorage-only demo
// data. The dashboard collects a self-reported name/authority/state/
// district/designation before showing this data (see authority_dashboard.html)
// as an identification step, not an access-control check - these endpoints
// are otherwise open, same as every other endpoint in this file.
router.get('/cases', controller.listCases.bind(controller));
router.get('/cases/:id', controller.getCaseById.bind(controller));
router.patch('/cases/:id', controller.updateCase.bind(controller));
router.delete('/cases/:id', controller.deleteCaseRecord.bind(controller));

// Test endpoint
router.get('/test', (req, res) => {
    res.json({ success: true, message: 'API is working!', timestamp: new Date().toISOString() });
});

export default router;