// ================================================================
//  HYBRID AI MODEL - Core Assessment Engine
// ================================================================

class HybridAIService {
    constructor() {
        this.weights = {
            trauma: 0.25,
            depression: 0.20,
            anxiety: 0.15,
            suicidal_ideation: 0.15,
            vulnerability: 0.10,
            intimidation: 0.10,
            stress: 0.05
        };
    }

    // semanticAnalysis is optional (see services/semanticAnalyzer.js) - an
    // embedding-based paraphrase signal that runs ALONGSIDE the keyword
    // system (textAnalysis), never in place of it. Passing null/undefined
    // here (disabled, still loading, or the call timed out) behaves
    // exactly as before this parameter existed.
    assess(textAnalysis, audioAnalysis, learnedAdjustments = {}, semanticAnalysis = null) {
        let scores = this._calculateScores(textAnalysis, audioAnalysis, semanticAnalysis);
        scores = this._applyLearnedAdjustments(scores, learnedAdjustments);
        const svi = this._calculateSVI(scores);
        const confidence = this._calculateConfidence(textAnalysis, audioAnalysis);

        return {
            scores: scores,
            svi: svi,
            confidence: confidence,
            severity: this._getSeverity(svi),
            // Passthrough for transparency (e.g. a future "why did this
            // escalate" view) - which reference phrase each category's
            // semantic score was closest to, and how similar. Not
            // currently rendered anywhere; harmless to include.
            semanticTopMatches: semanticAnalysis ? semanticAnalysis.topMatches : null
        };
    }

    // ✅ NEW: FeedbackLearning was computing learnedParameters from caseworker
    // corrections but nothing ever applied them - feedback had zero effect on
    // future scores. This applies each learned adjustment (already clamped to
    // +/-0.15 in FeedbackLearning) as an additive nudge, then re-clips to
    // [0, 1] so it can never push a score out of range.
    _applyLearnedAdjustments(scores, learnedAdjustments) {
        if (!learnedAdjustments || Object.keys(learnedAdjustments).length === 0) {
            return scores;
        }
        const adjusted = { ...scores };
        for (const [key, delta] of Object.entries(learnedAdjustments)) {
            if (key in adjusted) {
                adjusted[key] = Math.min(Math.max(adjusted[key] + delta, 0), 1);
            }
        }
        return adjusted;
    }

    _calculateScores(textAnalysis, audioAnalysis, semanticAnalysis) {
        // NOTE: previously these started at a 0.1 / 0.05 "baseline floor" and used
        // Math.max(floor, realValue). Since real per-text values were often small,
        // that floor dominated the result and made almost every text score nearly
        // the same. Categories now start at 0 so the actual analysis drives the score.
        const scores = {
            trauma: 0,
            depression: 0,
            anxiety: 0,
            suicidal_ideation: 0,
            vulnerability: 0,
            intimidation: 0,
            stress: 0,
            fear: 0,
            social_isolation: 0,
            dissociation: 0,
            hyperarousal: 0,
            avoidance: 0,
            // ✅ NEW: passthrough for textAnalyzer's protective-factor score,
            // so humanIntelligence.js's reduction (previously always 0 - see
            // its note) has a real signal to read.
            protective_factors: 0,
            // ✅ NEW: same silent-drop bug as dissociation/hyperarousal/
            // avoidance/protective_factors above - textAnalyzer.js started
            // producing these six DSM-5 symptom scores (flashbacks,
            // anhedonia, fatigue, panic, hopelessness, worthlessness) so
            // models/expertSystem.js's rule conditions could finally be
            // measured, but this whitelist (a second, separate copy of
            // "which score keys survive") would have silently filtered
            // every one of them right back out before expertSystem.js ever
            // saw them - `key in scores` below only keeps keys already
            // listed here.
            flashbacks: 0,
            anhedonia: 0,
            fatigue: 0,
            panic: 0,
            hopelessness: 0,
            worthlessness: 0
        };

        if (textAnalysis && textAnalysis.scores) {
            const textScores = textAnalysis.scores;
            for (const [key, value] of Object.entries(textScores)) {
                if (key in scores) {
                    scores[key] = Math.max(scores[key], value);
                }
            }
        }

        // Same Math.max blend as audio below: the stronger signal wins.
        // This is precisely how a paraphrase the keyword list never
        // anticipated (semantic score high, keyword score 0) still moves
        // the outcome, without a semantic false-positive ever being able
        // to REDUCE a keyword-driven score.
        if (semanticAnalysis && semanticAnalysis.scores) {
            for (const [key, value] of Object.entries(semanticAnalysis.scores)) {
                if (key in scores) {
                    scores[key] = Math.max(scores[key], value);
                }
            }
        }

        if (audioAnalysis && audioAnalysis.scores) {
            const audioScores = audioAnalysis.scores;
            if (audioScores.depression) {
                scores.depression = Math.max(scores.depression, audioScores.depression / 100);
            }
            if (audioScores.anxiety) {
                scores.anxiety = Math.max(scores.anxiety, audioScores.anxiety / 100);
            }
            if (audioScores.trauma) {
                scores.trauma = Math.max(scores.trauma, audioScores.trauma / 100);
            }
            if (audioScores.stress) {
                scores.stress = Math.max(scores.stress, audioScores.stress / 100);
            }
        }

        for (const key of Object.keys(scores)) {
            scores[key] = Math.min(Math.max(scores[key], 0), 1);
        }

        return scores;
    }

    _calculateSVI(scores) {
        let svi = 0;
        for (const [key, weight] of Object.entries(this.weights)) {
            if (key in scores) {
                svi += scores[key] * weight * 100;
            }
        }
        return Math.min(Math.round(svi), 100);
    }

    _calculateConfidence(textAnalysis, audioAnalysis) {
        // ✅ FIX: audioAnalysis used to boost confidence just for being
        // present/truthy - but AudioAnalyzer now returns a real object (with
        // reliable: false) even when the file was missing, unreadable, or
        // corrupt. That's not evidence, so it shouldn't earn a confidence
        // boost anymore.
        let confidence = 0.5;
        if (textAnalysis) confidence += 0.25;
        if (audioAnalysis && audioAnalysis.reliable) confidence += 0.25;
        return Math.min(confidence, 0.95);
    }

    _getSeverity(svi) {
        if (svi > 75) return 'Critical';
        if (svi > 50) return 'Severe';
        if (svi > 30) return 'Moderate';
        if (svi > 15) return 'Mild';
        return 'Minimal';
    }
}

export default HybridAIService;