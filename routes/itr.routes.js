// ================================================================
//  ITR ASSISTANT ROUTES
//  Isolated from the SC/ST case-management API (nhaa.routes.js) -
//  a different product living in the same server for now.
// ================================================================

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import ItrController from '../controllers/itr.controller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const controller = new ItrController();

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
    const allowed = ['application/pdf'];
    if (allowed.includes(file.mimetype) || /\.pdf$/i.test(file.originalname)) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are allowed for Form 16'), false);
    }
};
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 }, fileFilter });

router.post('/form16', upload.single('form16'), controller.uploadForm16.bind(controller));
router.get('/case/:id', controller.getCase.bind(controller));
router.patch('/case/:id/fields', controller.updateFields.bind(controller));
router.post('/case/:id/compute', controller.computeTax.bind(controller));
router.patch('/case/:id/regime', controller.selectRegime.bind(controller));
router.get('/case/:id/prefill', controller.getPrefill.bind(controller));

export default router;
