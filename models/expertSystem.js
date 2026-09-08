// ================================================================
//  EXPERT SYSTEM - Clinical Rules Engine
// ================================================================

class ExpertSystem {
    constructor() {
        this.rules = [
            {
                id: 'ptsd_rule',
                name: 'PTSD Detection',
                conditions: ['trauma', 'hyperarousal', 'avoidance', 'flashbacks'],
                threshold: 0.5,
                weight: 1.5,
                intervention: 'Trauma-focused CBT or EMDR therapy'
            },
            {
                id: 'depression_rule',
                name: 'Major Depressive Disorder',
                conditions: ['depression', 'anhedonia', 'suicidal_ideation', 'fatigue'],
                threshold: 0.5,
                weight: 2.0,
                intervention: 'Immediate suicide risk assessment and CBT'
            },
            {
                id: 'anxiety_rule',
                name: 'Generalized Anxiety Disorder',
                conditions: ['anxiety', 'panic', 'hyperarousal', 'avoidance'],
                threshold: 0.6,
                weight: 1.3,
                intervention: 'CBT for anxiety with relaxation training'
            },
            {
                id: 'suicide_rule',
                name: 'Acute Suicide Risk',
                conditions: ['suicidal_ideation', 'hopelessness', 'worthlessness', 'social_isolation'],
                threshold: 0.4,
                weight: 2.5,
                intervention: 'Emergency crisis intervention and safety planning'
            }
        ];
    }

    applyRules(aiResult) {
        const scores = aiResult.scores || {};
        const results = [];

        for (const rule of this.rules) {
            let metConditions = 0;
            let measuredConditions = 0;
            let conditionScores = [];

            for (const condition of rule.conditions) {
                if (scores[condition] !== undefined) {
                    measuredConditions++;
                    const score = scores[condition];
                    conditionScores.push(score);
                    if (score > rule.threshold) {
                        metConditions++;
                    }
                }
            }

            // ✅ FIX: confidence used to divide by rule.conditions.length (the
            // full listed condition set), even though several conditions -
            // e.g. anhedonia/hopelessness/worthlessness/panic/fatigue/
            // flashbacks - are never populated anywhere upstream. That meant
            // rules referencing them (depression_rule, suicide_rule, etc.)
            // had a hard ceiling on confidence regardless of how strong the
            // measurable signal was. Now divides by the conditions that were
            // actually measurable for this case; a rule with zero measurable
            // conditions can't be evaluated at all, so it's left inactive
            // rather than silently scored as 0/N.
            const confidence = measuredConditions > 0 ? metConditions / measuredConditions : 0;
            const severityScore = confidence * rule.weight;

            const severity = severityScore > 0.8 ? 'Critical' :
                            severityScore > 0.6 ? 'Severe' :
                            severityScore > 0.4 ? 'Moderate' : 'Low';

            if (measuredConditions > 0 && confidence >= 0.4) {
                results.push({
                    id: rule.id,
                    name: rule.name,
                    activated: true,
                    confidence: confidence,
                    measuredConditions: measuredConditions,
                    totalConditions: rule.conditions.length,
                    severity: severity,
                    intervention: rule.intervention
                });
            } else {
                results.push({
                    id: rule.id,
                    name: rule.name,
                    activated: false,
                    confidence: confidence,
                    measuredConditions: measuredConditions,
                    totalConditions: rule.conditions.length
                });
            }
        }

        return results;
    }
}

export default ExpertSystem;