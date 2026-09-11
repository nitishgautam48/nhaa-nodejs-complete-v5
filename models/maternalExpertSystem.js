// ================================================================
//  MATERNAL EXPERT SYSTEM - Obstetric Rules Engine
//
//  Same rule-list shape as models/expertSystem.js, but severity is
//  graded directly off the underlying condition score rather than off
//  confidence*weight: most rules here have only 1-2 conditions (a
//  continuous vital-sign-derived score, not a multi-symptom co-occurrence
//  count), so a confidence*weight scheme collapses to "met the one
//  condition => automatically Critical" the instant it activates at all -
//  unable to tell a borderline BP reading (140/90) from an eclamptic one
//  (170/115). Grading directly off the max condition score keeps that
//  distinction: `threshold` is the activation/Moderate cutoff, 0.65 is
//  Severe, 0.85 is Critical - the same tiering used throughout this
//  codebase's clinical-scale mapping.
// ================================================================

class MaternalExpertSystem {
    constructor() {
        this.rules = [
            {
                id: 'preeclampsia_rule',
                name: 'Pre-eclampsia / Eclampsia Risk',
                conditions: ['hypertensive_disorder'],
                threshold: 0.5,
                intervention: 'Urgent BP recheck and urine protein test; refer to facility for pre-eclampsia workup. Emergency transport if BP severe range or convulsions present.'
            },
            {
                id: 'pph_rule',
                name: 'Postpartum/Antepartum Hemorrhage Risk',
                conditions: ['hemorrhage', 'anemia'],
                threshold: 0.4,
                intervention: 'Emergency referral - uterotonic administration and IV fluids at nearest facility; do not wait for bleeding to worsen.'
            },
            {
                id: 'sepsis_rule',
                name: 'Puerperal / Obstetric Sepsis Risk',
                conditions: ['infection'],
                threshold: 0.4,
                intervention: 'Facility evaluation for infection - antibiotics and monitoring; do not manage fever/foul discharge at home.'
            },
            {
                id: 'fetal_distress_rule',
                name: 'Fetal Distress',
                conditions: ['fetal_distress'],
                threshold: 0.4,
                intervention: 'Immediate facility visit for fetal heart rate monitoring - reduced/absent movement needs same-day evaluation.'
            },
            {
                id: 'obstructed_labor_rule',
                name: 'Obstructed / Prolonged Labor Risk',
                conditions: ['obstructed_labor'],
                threshold: 0.5,
                intervention: 'Emergency transport to a facility with emergency obstetric care (possible instrumental delivery/C-section).'
            },
            {
                id: 'severe_anemia_rule',
                name: 'Severe Anemia in Pregnancy',
                conditions: ['anemia'],
                threshold: 0.5,
                intervention: 'Facility evaluation for hemoglobin testing and iron therapy or transfusion; increases hemorrhage risk at delivery.'
            }
        ];
    }

    applyRules(hybridResult) {
        const scores = hybridResult.scores || {};
        const results = [];

        for (const rule of this.rules) {
            const conditionScores = [];
            let metConditions = 0;

            for (const condition of rule.conditions) {
                if (scores[condition] !== undefined) {
                    conditionScores.push(scores[condition]);
                    if (scores[condition] > rule.threshold) metConditions++;
                }
            }

            const measuredConditions = conditionScores.length;
            const maxScore = measuredConditions > 0 ? Math.max(...conditionScores) : 0;
            const confidence = measuredConditions > 0 ? metConditions / measuredConditions : 0;
            const activated = measuredConditions > 0 && maxScore > rule.threshold;

            const severity = maxScore >= 0.85 ? 'Critical' :
                            maxScore >= 0.65 ? 'Severe' :
                            activated ? 'Moderate' : 'Low';

            if (activated) {
                results.push({
                    id: rule.id,
                    name: rule.name,
                    activated: true,
                    confidence,
                    maxScore,
                    measuredConditions,
                    totalConditions: rule.conditions.length,
                    severity,
                    intervention: rule.intervention
                });
            } else {
                results.push({
                    id: rule.id,
                    name: rule.name,
                    activated: false,
                    confidence,
                    maxScore,
                    measuredConditions,
                    totalConditions: rule.conditions.length
                });
            }
        }

        return results;
    }
}

export default MaternalExpertSystem;
