// ================================================================
//  AUDIO ANALYZER - Speech Analysis (Fixed Import)
//  Extracts acoustic features from audio
// ================================================================

import fs from 'fs';
import wav from 'node-wav';

// Fix: Import pitchfinder differently
import pitchfinder from 'pitchfinder';
const detectPitch = pitchfinder.detectPitch;

class AudioAnalyzer {
    constructor() {
        this.sampleRate = 16000;
    }

    async analyze(filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                return this._getDefault();
            }

            const buffer = fs.readFileSync(filePath);
            let result;

            try {
                result = wav.decode(buffer);
            } catch (err) {
                console.warn('Invalid WAV file, using default features');
                return this._getDefault();
            }

            const audioData = result.channelData[0];
            const sampleRate = result.sampleRate || this.sampleRate;

            if (!audioData || audioData.length < 100) {
                return this._getDefault();
            }

            // Extract features
            const features = this._extractFeatures(audioData, sampleRate);
            const scores = this._calculateScores(features);

            return {
                features: features,
                scores: scores,
                duration: audioData.length / sampleRate,
                reliable: true,
                error: null
            };

        } catch (error) {
            console.error('Audio analysis error:', error);
            return this._getDefault(error.message);
        }
    }

    _extractFeatures(audioData, sampleRate) {
        // RMS (Energy)
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) {
            sum += audioData[i] * audioData[i];
        }
        const rms = Math.sqrt(sum / audioData.length);

        // Zero-Crossing Rate
        let crossings = 0;
        for (let i = 1; i < audioData.length; i++) {
            if ((audioData[i] > 0 && audioData[i - 1] < 0) ||
                (audioData[i] < 0 && audioData[i - 1] > 0)) {
                crossings++;
            }
        }
        const zcr = crossings / audioData.length;

        // Pitch standard deviation
        let pitchStd = 0;
        try {
            const detect = detectPitch({ frequency: sampleRate });
            const pitches = [];
            const chunkSize = 1024;

            for (let i = 0; i < audioData.length; i += chunkSize) {
                const chunk = audioData.slice(i, i + chunkSize);
                if (chunk.length < 512) break;
                try {
                    const pitch = detect(chunk);
                    if (pitch !== null && pitch > 50 && pitch < 800) {
                        pitches.push(pitch);
                    }
                } catch (e) { /* skip */ }
            }

            if (pitches.length > 0) {
                const avg = pitches.reduce((a, b) => a + b, 0) / pitches.length;
                const variance = pitches.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / pitches.length;
                pitchStd = Math.sqrt(variance);
            }
        } catch (_) { /* skip */ }

        return {
            rms: rms,
            zcr: zcr,
            pitchStd: pitchStd
        };
    }

    _calculateScores(features) {
        const { rms, zcr, pitchStd } = features;

        // ✅ FIX: previously these started at a 0.5 "baseline floor" - the same
        // problem that was already fixed in textAnalyzer.js/hybridAI.js. That
        // meant every audio clip, including calm/low-signal speech, scored at
        // least 50/100 on every category before any acoustic feature was even
        // considered. Categories now start at 0 so the actual features drive
        // the score, consistent with how text scoring works.
        let depression = 0;
        let anxiety = 0;
        let trauma = 0;
        let stress = 0;

        if (rms < 0.02) {
            depression += 0.3;
            trauma += 0.2;
        } else if (rms < 0.04) {
            depression += 0.15;
            trauma += 0.1;
        }

        if (zcr > 0.15) {
            anxiety += 0.3;
            stress += 0.2;
        }

        if (pitchStd < 15) {
            depression += 0.15;
            trauma += 0.15;
        }

        return {
            depression: Math.min(depression * 100, 100),
            anxiety: Math.min(anxiety * 100, 100),
            trauma: Math.min(trauma * 100, 100),
            stress: Math.min(stress * 100, 100)
        };
    }

    // ✅ FIX: the old default returned a flat 50/100 on every category when
    // audio was missing, unreadable, or corrupt - indistinguishable from a
    // real "moderate distress" reading. It now returns 0s (no signal) and
    // `reliable: false` so callers (see HybridAIService) can tell this wasn't
    // a real measurement and shouldn't count toward assessment confidence.
    _getDefault(error = null) {
        return {
            features: { rms: 0.05, zcr: 0.08, pitchStd: 30 },
            scores: {
                depression: 0,
                anxiety: 0,
                trauma: 0,
                stress: 0
            },
            duration: 0,
            reliable: false,
            error: error
        };
    }
}

export default AudioAnalyzer;