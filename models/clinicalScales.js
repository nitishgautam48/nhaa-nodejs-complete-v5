// ================================================================
//  CLINICAL SCALES - PHQ-9, GAD-7, PCL-5, C-SSRS
// ================================================================

import CSSRSLadder from './cssrsLadder.js';

class ClinicalScales {
    constructor() {
        this.cssrsLadder = new CSSRSLadder();
        this.scaleRanges = {
            phq9: {
                minimal: [0, 4],
                mild: [5, 9],
                moderate: [10, 14],
                severe: [15, 19],
                critical: [20, 27]
            },
            gad7: {
                minimal: [0, 4],
                mild: [5, 9],
                moderate: [10, 14],
                severe: [15, 21]
            },
            pcl5: {
                minimal: [0, 15],
                mild: [16, 25],
                moderate: [26, 35],
                severe: [36, 50],
                critical: [51, 80]
            }
        };
    }

    // `text` is optional (defaults to '') so any existing caller that only
    // passes aiResult still works exactly as before - it just won't get
    // the ladder-based C-SSRS classification, falling back entirely to
    // the score-based severity as it already did.
    calculate(aiResult, text = '') {
        const scores = aiResult.scores || {};

        // Use ?? instead of || so a genuine 0 score (no signal detected) stays 0
        // instead of being silently replaced with a fake 0.5 "Moderate" baseline.
        const phq9 = this._mapToScale(scores.depression ?? 0.5, this.scaleRanges.phq9);
        const gad7 = this._mapToScale(scores.anxiety ?? 0.5, this.scaleRanges.gad7);
        const pcl5 = this._mapToScale(scores.trauma ?? 0.5, this.scaleRanges.pcl5);

        return {
            phq9: {
                score: phq9,
                severity: this._getScaleSeverity(phq9, this.scaleRanges.phq9)
            },
            gad7: {
                score: gad7,
                severity: this._getScaleSeverity(gad7, this.scaleRanges.gad7)
            },
            pcl5: {
                score: pcl5,
                severity: this._getScaleSeverity(pcl5, this.scaleRanges.pcl5)
            },
            cssrs: this._calculateCSSRS(scores, text)
        };
    }

    _mapToScale(score, ranges) {
        let maxScore = 0;
        for (const [severity, [min, max]] of Object.entries(ranges)) {
            maxScore = Math.max(maxScore, max || 0);
        }
        return Math.round(score * maxScore);
    }

    _getScaleSeverity(score, ranges) {
        for (const [severity, [min, max]] of Object.entries(ranges)) {
            if (score >= min && score <= max) {
                return severity.charAt(0).toUpperCase() + severity.slice(1);
            }
        }
        return 'Unknown';
    }

    // Maps a real C-SSRS ladder rung (see cssrsLadder.js) to a level/risk
    // label. Rungs 4-5 (intent/plan/preparatory behavior) are both
    // Critical - the real instrument treats them as distinct but both
    // warrant the same immediate emergency response in a triage context.
    // Rung 1 (passive wish to be dead) still returns requires_intervention:
    // true - real risk-assessment practice does NOT ignore a passive death
    // wish, it's the entry point that triggers further questioning.
    _levelForRung(rung) {
        switch (rung) {
            case 5: return { risk: 'Critical', level: 7 };
            case 4: return { risk: 'Critical', level: 7 };
            case 3: return { risk: 'High', level: 6 };
            case 2: return { risk: 'High', level: 5 };
            case 1: return { risk: 'Moderate', level: 3 };
            default: return { risk: 'Low', level: 1 };
        }
    }

    // Same score-based severity this always used, kept as a fallback for
    // when no ladder phrase matched (rung 0) - e.g. a suicide signal that
    // came from the semantic-similarity layer or a keyword not yet
    // classified onto the ladder (see cssrsLadder.js's header on why it
    // deliberately only classifies specific-enough phrases).
    _levelForScore(score) {
        if (score > 0.7) return { risk: 'Critical', level: 7 };
        if (score > 0.5) return { risk: 'High', level: 5 };
        if (score > 0.3) return { risk: 'Moderate', level: 3 };
        return { risk: 'Low', level: 1 };
    }

    // ⚠️ Text-based approximation of the C-SSRS ladder structure, not the
    // real interview-administered instrument - see cssrsLadder.js's file
    // header for the full methodology note.
    _calculateCSSRS(scores, text) {
        const score = scores.suicidal_ideation || 0;
        const ladderResult = this.cssrsLadder.classify(text);

        const fromRung = ladderResult.rung > 0 ? this._levelForRung(ladderResult.rung) : null;
        const fromScore = this._levelForScore(score);

        // Whichever signal is worse (higher level) wins - the ladder can
        // only ever ADD precision/urgency, never quietly downgrade a
        // score-driven severity the rest of the app already computed.
        const chosen = (fromRung && fromRung.level >= fromScore.level) ? fromRung : fromScore;

        return {
            risk: chosen.risk,
            level: chosen.level,
            requires_intervention: chosen.level >= 3,
            ladder: {
                rung: ladderResult.rung,
                rungLabel: ladderResult.rungLabel,
                description: ladderResult.description,
                matchedPhrase: ladderResult.matchedPhrase
            },
            methodology: 'Text-based approximation of the C-SSRS severity ladder structure - not the validated, interview-administered instrument. See models/cssrsLadder.js for the full methodology note.'
        };
    }
}

export default ClinicalScales;