// ================================================================
//  CONSENSUS BUILDER - Expert Opinions
//
//  ⚠️ IMPORTANT: the "experts" here are five hardcoded specialty-weight
//  profiles, not real clinicians - _simulateExpertOpinion() re-weights the
//  same AI scores five different ways and calls the result a "consensus."
//  No external human opinion is ever consulted. Do not present this output
//  as multi-clinician agreement to end users or caseworkers.
// ================================================================

class ConsensusBuilder {
    constructor() {
        this.experts = [
            { id: 'expert_1', specialty: 'trauma', weight: 0.9 },
            { id: 'expert_2', specialty: 'depression', weight: 0.85 },
            { id: 'expert_3', specialty: 'anxiety', weight: 0.85 },
            { id: 'expert_4', specialty: 'suicide_risk', weight: 0.9 },
            { id: 'expert_5', specialty: 'general', weight: 0.8 }
        ];
    }

    getExpertOpinions(aiResult, expertRules) {
        const scores = aiResult.scores || {};
        const opinions = [];

        for (const expert of this.experts) {
            const opinion = this._simulateExpertOpinion(scores, expert);
            opinions.push({
                expert: expert.id,
                specialty: expert.specialty,
                opinion: opinion,
                weight: expert.weight
            });
        }

        return opinions;
    }

    _simulateExpertOpinion(scores, expert) {
        const specialtyWeights = {
            trauma: { trauma: 1.5, dissociation: 1.3 },
            depression: { depression: 1.5, hopelessness: 1.4 },
            anxiety: { anxiety: 1.5, panic: 1.4 },
            suicide_risk: { suicidal_ideation: 1.8, hopelessness: 1.5 },
            general: {}
        };

        const weights = specialtyWeights[expert.specialty] || {};
        const adjusted = {};
        
        for (const [key, value] of Object.entries(scores)) {
            adjusted[key] = weights[key] ? Math.min(value * weights[key], 1) : value;
        }

        // ✅ FIX: when every score is genuinely 0 (no real signal at all),
        // forcing a pick here injects a phantom "concern" that later gets
        // blended into the final score at 10% weight - which is how
        // completely neutral text ("the weather is nice") ended up showing
        // a nonzero trauma reading. If there's no signal, say so instead of
        // manufacturing a winner.
        const concernKeys = Object.keys(adjusted).filter(k => k !== 'protective_factors');
        const maxValue = concernKeys.length > 0 ? Math.max(...concernKeys.map(k => adjusted[k])) : 0;
        const primaryConcern = maxValue > 0
            ? concernKeys.reduce((a, b) => adjusted[a] >= adjusted[b] ? a : b)
            : 'none';

        const severity = this._getSeverity(adjusted[primaryConcern] || 0);

        return {
            primaryConcern: primaryConcern,
            severity: severity,
            confidence: 0.7 + (adjusted[primaryConcern] || 0) * 0.2
        };
    }

    _getSeverity(score) {
        if (score > 0.8) return 'Critical';
        if (score > 0.6) return 'Severe';
        if (score > 0.4) return 'Moderate';
        if (score > 0.2) return 'Mild';
        return 'Minimal';
    }

    buildConsensus(expertOpinions) {
        const concerns = {};
        const severityCounts = {
            Critical: 0,
            Severe: 0,
            Moderate: 0,
            Mild: 0,
            Minimal: 0
        };

        for (const opinion of expertOpinions) {
            const concern = opinion.opinion.primaryConcern;
            const severity = opinion.opinion.severity;
            const weight = opinion.weight;

            // ✅ FIX: 'none' means that expert found no real signal at all -
            // tallying it as a "concern" anyway is what let a completely
            // neutral text end up with a phantom weighted category once
            // divided by totalWeight below.
            if (concern !== 'none') {
                concerns[concern] = (concerns[concern] || 0) + weight;
            }
            severityCounts[severity] = (severityCounts[severity] || 0) + 1;
        }

        const totalWeight = Object.values(concerns).reduce((a, b) => a + b, 0);
        if (totalWeight > 0) {
            for (const key of Object.keys(concerns)) {
                concerns[key] = concerns[key] / totalWeight;
            }
        }

        let consensusSeverity = 'Mild';
        if (severityCounts.Critical >= 2) consensusSeverity = 'Critical';
        else if (severityCounts.Severe >= 3) consensusSeverity = 'Severe';
        else if (severityCounts.Moderate >= 3) consensusSeverity = 'Moderate';

        const concernKeys = Object.keys(concerns);
        const primaryConcern = concernKeys.length > 0
            ? concernKeys.reduce((a, b) => concerns[a] >= concerns[b] ? a : b)
            : 'none';

        return {
            consensusReached: concerns[primaryConcern] > 0.6,
            primaryConcern: primaryConcern,
            concerns: concerns,
            consensusSeverity: consensusSeverity,
            agreementLevel: concerns[primaryConcern] || 0
        };
    }
}

export default ConsensusBuilder;