// ================================================================
//  AUDIO ANALYZER - Speech Analysis (Fixed Import)
//  Extracts acoustic features from audio
//
//  ⚠️ METHODOLOGY NOTE: this only ever measures ACOUSTIC/prosodic
//  features (loudness, zero-crossing rate, pitch variance) - it has no
//  way to read what was said (see services/speechToText.js's removal
//  from this app for why: real transcription needs a model too heavy
//  for this app's hosting memory budget). The thresholds below (0.02,
//  0.04, 0.15, 15) are heuristic estimates, not independently validated
//  against real recorded speech with known clinical outcomes - same
//  caveat as services/semanticAnalyzer.js's SIMILARITY_FLOOR/CEILING.
//  Treat this as a coarse, secondary signal that blends additively with
//  the text/keyword engine (see hybridAI.js's Math.max blend), never as
//  a standalone diagnosis.
// ================================================================

import fs from 'fs';
import wav from 'node-wav';

// ✅ FIX: `pitchfinder` has no `detectPitch` export at all (confirmed
// against the installed v2.3.4 - its actual exports are named algorithm
// factories: YIN, AMDF, ACF2PLUS, DynamicWavelet, Macleod). This made
// `detectPitch` `undefined`, so calling it below always threw a
// TypeError, silently swallowed by the surrounding try/catch - pitch
// detection has never actually run in this codebase; pitchStd was
// always its initialized 0, on every single audio submission ever
// processed, which is exactly what made the `pitchStd < 15` "flat
// affect" bonus fire unconditionally for every clip regardless of
// content (see _calculateScores's own fix for why that mattered).
// YIN is the library's recommended default (README: "best balance of
// accuracy and speed").
import pitchfinder from 'pitchfinder';
const createYinDetector = pitchfinder.YIN;

class AudioAnalyzer {
    constructor() {
        this.sampleRate = 16000;
        // ✅ FIX: below this RMS, treat the clip as effectively silent
        // (no real speech energy) rather than as evidence of low mood -
        // see _calculateScores's header comment for the bug this closes.
        this.SILENCE_RMS_FLOOR = 0.003;
        // ✅ FIX: pitchfinder returning fewer than this many valid pitch
        // readings across the whole clip means "couldn't find a pitch",
        // not "found a genuinely flat/monotone pitch" - see the same
        // comment below.
        this.MIN_PITCH_SAMPLES = 3;
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

            // ✅ FIX: 100 samples is 6ms at 16kHz (or ~2ms at 44.1kHz) -
            // nowhere near enough audio to compute a meaningful RMS/ZCR/
            // pitch reading, so virtually any non-empty clip passed this
            // gate and got scored as if it were a real measurement.
            // Requires ~0.3s instead - still well under the frontend's
            // realistic shortest recordings, but enough to rule out a
            // near-instant or effectively-empty clip.
            const minSamples = Math.floor(sampleRate * 0.3);
            if (!audioData || audioData.length < minSamples) {
                return this._getDefault();
            }

            // Extract features
            const features = this._extractFeatures(audioData, sampleRate);
            const scores = this._calculateScores(features);

            // ✅ FIX: `reliable: true` was previously set unconditionally
            // whenever the file decoded, even for a clip with no usable
            // pitch signal at all and near-silent energy - HybridAIService.
            // _calculateConfidence() then boosted overall confidence for
            // what amounts to an empty reading. A clip with essentially no
            // energy AND no detectable pitch isn't a real measurement of
            // anything - the audio equivalent of an empty text field.
            const hasSignal = features.rms >= this.SILENCE_RMS_FLOOR || features.pitchSampleCount >= this.MIN_PITCH_SAMPLES;

            return {
                features: features,
                scores: scores,
                duration: audioData.length / sampleRate,
                reliable: hasSignal,
                error: hasSignal ? null : 'No discernible speech signal in this recording (near-silent, no detectable pitch) - scores reflect an empty/near-empty clip, not a real reading.'
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
        let pitchSampleCount = 0;
        try {
            // ✅ FIX: was `detectPitch({ frequency: sampleRate })` -
            // wrong function entirely (see the import fix above) AND the
            // wrong option key (YIN's config option is `sampleRate`, not
            // `frequency` - confirmed against the library's README/source).
            const detect = createYinDetector({ sampleRate });
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

            // ✅ NEW: how many chunks actually yielded a pitch, separate
            // from pitchStd itself - see _calculateScores's header for why
            // this distinction matters (0 detected pitches and "found
            // pitches with 0 variance" both left pitchStd at/near 0
            // before, even though only one of those is a real signal).
            pitchSampleCount = pitches.length;

            if (pitches.length > 0) {
                const avg = pitches.reduce((a, b) => a + b, 0) / pitches.length;
                const variance = pitches.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / pitches.length;
                pitchStd = Math.sqrt(variance);
            }
        } catch (_) { /* skip */ }

        return {
            rms: rms,
            zcr: zcr,
            pitchStd: pitchStd,
            pitchSampleCount: pitchSampleCount
        };
    }

    _calculateScores(features) {
        const { rms, zcr, pitchStd, pitchSampleCount } = features;

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

        // ✅ FIX: a genuinely silent or near-silent clip (someone who
        // recorded almost nothing, a muted mic, mostly background noise)
        // used to fall into the SAME `rms < 0.02` branch as real quiet-
        // but-present speech, scoring 30% depression / 20% trauma for
        // literal silence. Below SILENCE_RMS_FLOOR there's no speech
        // energy to read at all, so this contributes nothing rather than
        // treating "no signal" as "low energy = possible flat affect."
        if (rms >= this.SILENCE_RMS_FLOOR) {
            if (rms < 0.02) {
                depression += 0.3;
                trauma += 0.2;
            } else if (rms < 0.04) {
                depression += 0.15;
                trauma += 0.1;
            }
        }

        if (zcr > 0.15) {
            anxiety += 0.3;
            stress += 0.2;
        }

        // ✅ FIX: pitchStd stayed at its initialized 0 whenever pitchfinder
        // couldn't detect ANY pitch in the clip (silence, noise, a clip
        // too short/quiet for reliable detection) - indistinguishable from
        // "detected plenty of pitches and they were all genuinely close
        // together" (real monotone/flat-affect speech). Both read as
        // `pitchStd < 15` before, so "couldn't measure pitch at all" was
        // silently treated as "found a flat, possibly-depressed voice."
        // Only apply this signal once there are enough actual pitch
        // readings for pitchStd to mean something.
        if (pitchSampleCount >= this.MIN_PITCH_SAMPLES && pitchStd < 15) {
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
            features: { rms: 0.05, zcr: 0.08, pitchStd: 30, pitchSampleCount: 0 },
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