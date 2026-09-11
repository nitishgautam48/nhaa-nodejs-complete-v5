// ================================================================
//  MATERNAL HYBRID ASSESSMENT - blends vitals + text signals
//
//  Same pattern as models/hybridAI.js: two independent signals (here,
//  measured-vitals scoring and symptom-narrative text scoring) are
//  blended with Math.max per category, never averaged - a real reported
//  symptom must never be diluted by a missing/normal vital, and a
//  clinical vital reading must never be hidden by imprecise wording.
//  Then a single Maternal Risk Index (0-100) is computed from clinically
//  weighted categories, mirroring hybridAI.js's SVI.
// ================================================================

class MaternalHybridAssessment {
    constructor() {
        // malnutrition is tracked but excluded from the headline index
        // (feeds maternalRiskFormulation.js's dynamic-factor checklist
        // instead) - same design choice hybridAI.js makes for
        // dissociation/hyperarousal/avoidance.
        this.weights = {
            hemorrhage: 0.28,
            hypertensive_disorder: 0.25,
            fetal_distress: 0.17,
            infection: 0.15,
            obstructed_labor: 0.10,
            anemia: 0.05
        };
    }

    assess(vitalsResult, textResult) {
        const scores = {
            hypertensive_disorder: 0,
            hemorrhage: 0,
            infection: 0,
            anemia: 0,
            fetal_distress: 0,
            obstructed_labor: 0,
            malnutrition: 0
        };

        const vitalsScores = (vitalsResult && vitalsResult.scores) || {};
        const textScores = (textResult && textResult.scores) || {};

        for (const key of Object.keys(scores)) {
            scores[key] = Math.max(vitalsScores[key] || 0, textScores[key] || 0);
        }

        const mri = this._calculateMRI(scores);

        return {
            scores,
            mri,
            severity: this._getSeverity(mri),
            confidence: this._calculateConfidence(vitalsResult, textResult)
        };
    }

    _calculateMRI(scores) {
        let mri = 0;
        for (const [key, weight] of Object.entries(this.weights)) {
            mri += (scores[key] || 0) * weight * 100;
        }
        return Math.min(Math.round(mri), 100);
    }

    _calculateConfidence(vitalsResult, textResult) {
        let confidence = 0.5;
        if (vitalsResult) confidence += 0.3;
        if (textResult) confidence += 0.15;
        return Math.min(confidence, 0.95);
    }

    _getSeverity(mri) {
        if (mri > 75) return 'Critical';
        if (mri > 50) return 'Severe';
        if (mri > 30) return 'Moderate';
        if (mri > 15) return 'Mild';
        return 'Minimal';
    }
}

export default MaternalHybridAssessment;
