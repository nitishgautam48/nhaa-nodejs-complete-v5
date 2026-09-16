// ================================================================
//  RAKSHAK AI COMPLETE SERVER
//  Node.js Implementation with Human Intelligence
// ================================================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import nhaaRoutes from './routes/nhaa.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// CORS
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/v1', nhaaRoutes);

// Health Check
app.get('/ping', (req, res) => {
    res.json({
        status: 'ok',
        message: 'RAKSHAK AI Complete System is running',
        version: '3.0.0',
        timestamp: new Date().toISOString()
    });
});

// Frontend
const frontendDir = path.join(__dirname, 'frontend');
app.use(express.static(frontendDir));

// Clean, systematic routes for the three pages, instead of only reaching
// them via a raw *.html filename. The static middleware above still serves
// the *.html paths directly too, so existing bookmarks/links keep working.
app.get('/', (req, res) => res.sendFile(path.join(frontendDir, 'landing.html')));
app.get('/assessment', (req, res) => res.sendFile(path.join(frontendDir, 'advanced_dashboard.html')));
app.get('/authority', (req, res) => res.sendFile(path.join(frontendDir, 'authority_dashboard.html')));
// ✅ Lawyer Assistant (SC/ST quick pattern check + case document summary)
// moved to its own dedicated page - it's a tool for lawyers, not the
// victim-facing assessment flow it used to live inside as a tab. /scst
// keeps working as an alias (Quick Pattern Check is the default mode),
// since landing.html's "Lawyer Assistant" card and any existing links
// still point at /lawyer directly.
app.get('/lawyer', (req, res) => res.sendFile(path.join(frontendDir, 'lawyer_dashboard.html')));
app.get('/scst', (req, res) => res.redirect('/lawyer'));

// ✅ NEW: with no error-handling middleware at all, an error thrown
// synchronously in middleware (e.g. multer's fileFilter rejecting an
// unsupported upload) fell through to Express's default handler, which
// returns a raw HTML page with a full stack trace instead of a JSON
// error the frontend can actually parse and show the person. Any route
// handler that calls `next(err)` or throws synchronously now gets a
// clean JSON response instead - existing routes that already send their
// own res.status(...).json(...) on error are unaffected, since this only
// runs when nothing else has already handled the error.
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message);
    res.status(400).json({ success: false, error: err.message || 'Request failed' });
});

app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🧠 RAKSHAK AI Complete System');
    console.log('='.repeat(60));
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api/v1`);
    console.log(`📊 Health: http://localhost:${PORT}/ping`);
    console.log('\n🌐 Frontend Pages:');
    console.log(`   🏠 Landing: http://localhost:${PORT}/`);
    console.log(`   📝 Assessment: http://localhost:${PORT}/assessment`);
    console.log(`   🏛️ Authority: http://localhost:${PORT}/authority`);
    console.log('='.repeat(60) + '\n');
});

export default app;