// ================================================================
//  MATERNAL RISK TRIAGE ROUTES
// ================================================================

import express from 'express';
import MaternalController from '../controllers/maternal.controller.js';

const router = express.Router();
const controller = new MaternalController();

router.post('/assess', controller.assess.bind(controller));
router.get('/helplines', controller.getHelplines.bind(controller));

router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Maternal risk triage API is working!', timestamp: new Date().toISOString() });
});

export default router;
