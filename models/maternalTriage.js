// ================================================================
//  MATERNAL TRIAGE SYNTHESIS
//
//  Combines maternalHybridAssessment (vitals+text blend), the risk/
//  protective checklist (maternalRiskFormulation), the danger-sign ladder
//  (maternalDangerLadder), and the rule engine (maternalExpertSystem)
//  into one final severity decision - same "worst signal wins, never
//  quietly downgrade" principle the mental-health pipeline uses in
//  controllers/nhaa.controller.js's _hybridDecision/_getSeverity.
//
//  ⚠️ This is an automated screening/prioritization aid, not a diagnosis
//  and not a replacement for a trained health worker's assessment. Any
//  Critical/Severe result should always be treated as "go to a facility
//  now", regardless of how confident the underlying score is.
// ================================================================

class MaternalTriage {
    _applyRiskMultiplier(scores, multiplier) {
        const adjusted = {};
        for (const [key, value] of Object.entries(scores)) {
            adjusted[key] = Math.min(value * multiplier, 1);
        }
        return adjusted;
    }

    _levelForRung(rung) {
        switch (rung) {
            case 5: return { risk: 'Critical', level: 7 };
            case 4: return { risk: 'Critical', level: 7 };
            case 3: return { risk: 'High', level: 5 };
            case 2: return { risk: 'Moderate', level: 3 };
            case 1: return { risk: 'Mild', level: 2 };
            default: return { risk: 'Low', level: 1 };
        }
    }

    _tierForMri(mri) {
        if (mri > 75) return 'Critical';
        if (mri > 50) return 'Severe';
        if (mri > 30) return 'Moderate';
        if (mri > 15) return 'Mild';
        return 'Minimal';
    }

    synthesize(hybridResult, riskFormulation, ladderResult, expertRules) {
        const levelOrder = ['Minimal', 'Mild', 'Moderate', 'Severe', 'Critical'];
        const meta = {
            Critical: { emoji: '🔴', color: '#d63031', priority: 'emergency' },
            Severe: { emoji: '🟠', color: '#e17055', priority: 'high' },
            Moderate: { emoji: '🟡', color: '#fdcb6e', priority: 'medium' },
            Mild: { emoji: '🟢', color: '#00b894', priority: 'low' },
            Minimal: { emoji: '🟢', color: '#00b894', priority: 'normal' }
        };

        // Risk-formulation multiplier is applied to the blended scores
        // before the danger-ladder/expert-rule escalation runs, so a
        // woman with several static+dynamic risk factors present has her
        // symptom scores amplified accordingly - same order of operations
        // as humanIntelligence.js's riskScores step.
        const adjustedScores = this._applyRiskMultiplier(hybridResult.scores, riskFormulation.multiplier);
        const adjustedMri = Math.min(Math.round(hybridResult.mri * riskFormulation.multiplier), 100);

        let level = this._tierForMri(adjustedMri);
        const originalLevel = level;
        let escalatedBy = null;

        // Danger-ladder rungs 4-5 are WHO-recognized emergency danger
        // signs - they must never be capped by a lower blended average
        // just because only one category carried the signal.
        if (ladderResult.rung > 0) {
            const fromRung = this._levelForRung(ladderResult.rung);
            const rungLevel = fromRung.level >= 6 ? 'Critical' :
                fromRung.level >= 5 ? 'Severe' :
                fromRung.level >= 3 ? 'Moderate' :
                fromRung.level >= 2 ? 'Mild' : 'Minimal';
            if (levelOrder.indexOf(rungLevel) > levelOrder.indexOf(level)) {
                level = rungLevel;
                escalatedBy = 'danger_ladder';
            }
        }

        // Any activated expert rule escalates the overall level to at
        // least its own severity (Moderate/Severe/Critical map straight
        // onto levelOrder) - worst-signal-wins, same reasoning as the
        // danger-ladder escalation above. Without this, a single flagged
        // rule (e.g. borderline hypertension, reduced fetal movement)
        // could sit hidden under a "Minimal" headline just because it's
        // one of several mostly-zero weighted categories in the blend.
        let worstRule = null;
        for (const rule of expertRules) {
            if (!rule.activated) continue;
            if (!worstRule || levelOrder.indexOf(rule.severity) > levelOrder.indexOf(worstRule.severity)) {
                worstRule = rule;
            }
        }
        if (worstRule && levelOrder.indexOf(worstRule.severity) > levelOrder.indexOf(level)) {
            level = worstRule.severity;
            escalatedBy = worstRule.id;
        }

        const TIER_FLOOR = { Critical: 80, Severe: 60, Moderate: 40, Mild: 20, Minimal: 0 };
        const displayMri = level !== originalLevel ? Math.max(adjustedMri, TIER_FLOOR[level]) : adjustedMri;

        const concernKeys = Object.keys(adjustedScores);
        const maxConcernValue = concernKeys.length > 0 ? Math.max(...concernKeys.map(k => adjustedScores[k])) : 0;
        const primaryConcern = maxConcernValue > 0
            ? concernKeys.reduce((a, b) => adjustedScores[a] >= adjustedScores[b] ? a : b)
            : 'none';

        return {
            finalScores: adjustedScores,
            mri: displayMri,
            severity: { level, ...meta[level], escalatedBy },
            primaryConcern,
            dangerLadder: ladderResult,
            riskFormulation,
            activeExpertRules: expertRules.filter(r => r.activated),
            recommendations: this._generateRecommendations(level, primaryConcern, adjustedScores, expertRules, ladderResult),
            methodology: 'Automated screening/prioritization aid combining vitals, symptom narrative, obstetric risk-factor checklist, WHO danger-sign ladder, and a rule-based engine. Not a diagnosis - a Critical/Severe result always means seek facility care now.'
        };
    }

    _generateRecommendations(level, primaryConcern, scores, expertRules, ladderResult) {
        const recs = [];

        if (level === 'Critical') {
            recs.push('🚨 EMERGENCY: Go to the nearest facility now or call for emergency transport (108/102)');
        } else if (level === 'Severe') {
            recs.push('⚠️ Go to a health facility today - do not wait for the next scheduled ANC visit');
        } else if (level === 'Moderate') {
            recs.push('Contact your ASHA/ANM or health worker soon and arrange a facility check');
        } else {
            recs.push('Continue routine ANC visits and monitor for any new or worsening symptoms');
        }

        for (const rule of expertRules) {
            if (rule.activated) recs.push(`${rule.name}: ${rule.intervention}`);
        }

        if (ladderResult.rung >= 4) {
            recs.push(`Danger sign identified: ${ladderResult.rungLabel} - this is one of the WHO recognized emergency signs in pregnancy`);
        }

        if (recs.length === 1) {
            recs.push('No danger signs identified from the information provided - keep attending scheduled ANC visits');
        }

        return recs;
    }
}

export default MaternalTriage;
