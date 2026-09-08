// ================================================================
//  NHAA COMPLETE SERVER
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
        message: 'NHAA Complete System is running',
        version: '3.0.0',
        timestamp: new Date().toISOString()
    });
});

// Frontend
app.use(express.static('frontend'));

app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🧠 NHAA Complete System');
    console.log('='.repeat(60));
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api/v1`);
    console.log(`📊 Health: http://localhost:${PORT}/ping`);
    console.log('\n🌐 Frontend Pages:');
    console.log(`   🏠 Landing: http://localhost:${PORT}/landing.html`);
    console.log(`   📝 Assessment: http://localhost:${PORT}/index.html`);
    console.log(`   🏛️ Authority: http://localhost:${PORT}/authority_dashboard.html`);
    console.log(`   🧠 Advanced: http://localhost:${PORT}/advanced_dashboard.html`);
    console.log('='.repeat(60) + '\n');
});

export default app;