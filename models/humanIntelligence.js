// ================================================================
//  HUMAN INTELLIGENCE - Clinical Reasoning Engine
//  Simulates expert clinical judgment and reasoning
//
//  ⚠️ IMPORTANT: despite the name, this class does not involve any real
//  clinician, human reviewer, or external input. It is a deterministic
//  heuristic layer that re-weights the AI scores using fixed rules. Do not
//  surface its output to end users or caseworkers as if a human clinician
//  reviewed the case - label it as automated heuristic adjustment, and
//  route anything above a "Moderate" threshold to an actual human reviewer.
//
//  This file incorporates two real, published assessment methodologies as
//  STRUCTURAL GUIDES for what to look for - not as the validated
//  instruments themselves, which require trained administration:
//
//  1. DSM-5 PTSD symptom clusters (Criteria B-E: intrusion, avoidance,
//     negative alterations in cognition/mood, arousal/reactivity) - see
//     _assessSymptomPattern(). Real diagnosis requires a clinical
//     interview, duration/impairment criteria this tool cannot assess,
//     and is never made from text analysis alone.
//
//  2. Campbell's Danger Assessment (the validated instrument used by DV
//     advocates to gauge intimate-partner-violence lethality risk) - see
//     _assessDangerFactors(). This is a SIMPLIFIED, text-based
//     approximation of a subset of its risk factors, not the 20-item
//     instrument itself (which is administered in a structured interview
//     with a trained advocate and a weighted calendar of violence). It is
//     included to flag known lethality risk markers - such as strangulation,
//     which research shows sharply increases risk of future lethal
//     violence - so a case doesn't sit at a moderate score just because no
//     single distress category crossed a high threshold.
//
//  3. A structured risk/protective factor checklist (see
//     riskFormulation.js) - replaces what used to be a flat "count how
//     many of 12 unrelated score categories exceed 0.5" heuristic with
//     real detection of specific static/dynamic risk factors and
//     protective factors, the way an actual risk formulation separates
//     them.
// ================================================================

import RiskFormulation from './riskFormulation.js';

class HumanIntelligence {
    constructor() {
        this.riskFormulation = new RiskFormulation();
        this.knowledgeBase = {
            riskFactors: [
                'prior_trauma', 'family_history', 'substance_use',
                'poor_social_support', 'recent_loss', 'chronic_stress',
                'financial_distress', 'unemployment', 'homelessness'
            ],
            protectiveFactors: [
                'social_support', 'coping_skills', 'resilience',
                'help_seeking', 'insight', 'treatment_engagement'
            ],
            warningSigns: [
                'suicidal_ideation', 'psychosis', 'severe_depression',
                'panic_attacks', 'dissociative_episodes'
            ]
        };

        this.heuristicWeights = {
            severity: 0.25,
            risk_accumulation: 0.20,
            protective_factors: -0.15,
            temporal: 0.15,
            clinical_intuition: 0.15,
            contextual: 0.10
        };

        // ============================================================
        //  DANGER ASSESSMENT-INSPIRED RISK FACTORS (intimate partner
        //  violence lethality). Each factor below corresponds to an item
        //  from Campbell's Danger Assessment or its supporting research
        //  literature. Strangulation in particular is included because
        //  published DA research found it associated with roughly a
        //  seven-fold increase in risk of attempted/completed homicide by
        //  an intimate partner - it is treated as a single strong signal
        //  on its own, not just one item among many.
        // ============================================================
        this.dangerAssessmentFactors = {
            strangulation: {
                phrases: ['choked me', 'strangled me', 'choking me', 'strangling me',
                    'put his hands around my neck', 'couldn\'t breathe when he'],
                weight: 3  // counts as 3 factors alone - strangulation is an
                           // outsized, independently validated lethality marker
            },
            weapon: {
                phrases: ['pointed a gun', 'threatened me with a knife', 'showed me a gun',
                    'threatened me with a weapon', 'has a gun', 'brought a knife'],
                weight: 2
            },
            deathThreat: {
                phrases: ['threatened to kill me', 'said he would kill me', 'threatened to kill us both',
                    'said he\'d kill me', 'told me he would kill me'],
                weight: 2
            },
            victimBelievesLethal: {
                phrases: ['i think he could kill me', 'i believe he will kill me',
                    'afraid he will kill me', 'scared he might kill me', 'he could kill me'],
                weight: 2
            },
            escalatingViolence: {
                phrases: ['getting worse', 'worse than before', 'more often now',
                    'happening more frequently', 'never used to hit'],
                weight: 1
            },
            recentSeparation: {
                phrases: ['since i left him', 'after i left', 'tried to leave', 'left him last',
                    'after the separation', 'ever since i moved out'],
                weight: 1
            },
            stalkingBehavior: {
                phrases: ['tracks my location', 'follows me everywhere', 'shows up unannounced',
                    'watches my house', 'waits outside my'],
                weight: 1
            },
            controllingBehavior: {
                phrases: ['controls my finances', 'controls all the money', "won't let me work",
                    'controls who i talk to', 'keeps me from leaving'],
                weight: 1
            },
            forcedSex: {
                phrases: ['forced me', 'forced himself on me', 'against my will'],
                weight: 1
            }
        };
    }

    _isLetterOrDigit(ch) {
        return !!ch && /[\p{L}\p{N}]/u.test(ch);
    }

    _containsWord(text, phrase) {
        let fromIndex = 0;
        while (true) {
            const pos = text.indexOf(phrase, fromIndex);
            if (pos === -1) return false;
            const before = pos > 0 ? text[pos - 1] : '';
            const after = pos + phrase.length < text.length ? text[pos + phrase.length] : '';
            if (!this._isLetterOrDigit(before) && !this._isLetterOrDigit(after)) return true;
            fromIndex = pos + 1;
        }
    }

    // Returns which Danger-Assessment-inspired factors are present, a
    // weighted count, and a plain-language flag. NOT the validated
    // instrument - see the file header caveat.
    _assessDangerFactors(text) {
        const textLower = (text || '').toLowerCase();
        const factorsPresent = [];
        let weightedCount = 0;

        for (const [factorName, factor] of Object.entries(this.dangerAssessmentFactors)) {
            const matched = factor.phrases.some(p => this._containsWord(textLower, p));
            if (matched) {
                factorsPresent.push(factorName);
                weightedCount += factor.weight;
            }
        }

        return {
            factorsPresent,
            weightedCount,
            // Threshold chosen conservatively: strangulation alone (weight 3)
            // or any 3 lower-weight factors together crosses it.
            elevatedLethalityRisk: weightedCount >= 3,
            methodology: 'Simplified automated approximation inspired by Campbell\'s Danger Assessment risk factors - not the validated instrument, not a substitute for assessment by a trained domestic violence advocate.'
        };
    }

    // DSM-5-informed check for whether language spans multiple PTSD
    // symptom clusters, rather than just one strong "trauma" reading.
    // Real diagnosis additionally requires duration (>1 month), functional
    // impairment, and a clinical interview - none of which this tool can
    // assess from a single piece of text. This is a STRUCTURAL PATTERN
    // FLAG only, phrased accordingly, never a diagnosis.
    _assessSymptomPattern(scores) {
        const CLUSTER_THRESHOLD = 0.3;
        const clusters = {
            intrusion: scores.trauma || 0,          // nightmares, flashbacks, intrusive memories
            avoidance: scores.avoidance || 0,        // avoiding reminders, people, places
            negativeAlterations: Math.max(scores.dissociation || 0, scores.depression || 0),
            arousal: scores.hyperarousal || 0        // hypervigilance, startle, sleep disruption
        };
        const clustersPresent = Object.entries(clusters)
            .filter(([, v]) => v >= CLUSTER_THRESHOLD)
            .map(([k]) => k);

        return {
            clusters,
            clustersPresent,
            // Real DSM-5 criteria require presence across ALL FOUR clusters
            // (with specific minimum symptom counts in some). Flagging at
            // 3-of-4 here is deliberately more conservative/lower-stakes
            // than a diagnosis - framed as "resembles a pattern", not "meets criteria".
            resemblesPTSDPattern: clustersPresent.length >= 3,
            note: 'Structural language pattern only - not a diagnosis. PTSD diagnosis requires a clinical interview, and duration/impairment criteria this tool cannot assess.'
        };
    }

    synthesize(aiResult, expertRules, text = '') {
        const scores = aiResult.scores || {};
        const svi = aiResult.svi ?? 50;

        // Apply clinical intuition
        const intuition = {};
        for (const [key, value] of Object.entries(scores)) {
            if (key === 'trauma' && value > 0.7) {
                intuition[key] = Math.min(value + 0.1, 1);
            } else if (key === 'suicidal_ideation' && value > 0.5) {
                intuition[key] = Math.min(value + 0.15, 1);
            } else if (key === 'depression' && value > 0.6) {
                intuition[key] = Math.min(value + 0.05, 1);
            } else {
                intuition[key] = value;
            }
        }

        // ✅ FIX: this used to be `riskCount = how many of the 12 score
        // categories exceed 0.5`, then a flat 3-tier multiplier - not a
        // risk formulation, just a threshold count blind to WHICH factors
        // were present (a mildly elevated anxiety score counted the same
        // as active homelessness). Now uses a real structured risk/
        // protective checklist - see riskFormulation.js.
        const riskAssessment = this.riskFormulation.assess(text);
        const multiplier = riskAssessment.multiplier;

        const riskScores = {};
        for (const [key, value] of Object.entries(scores)) {
            riskScores[key] = key === 'protective_factors' ? value : Math.min(value * multiplier, 1);
        }

        // ✅ FIX: this used to filter this.knowledgeBase.protectiveFactors
        // (key names like 'social_support', 'coping_skills') against
        // `scores`, which never contained any of those keys - the
        // reduction was always 0, silently doing nothing since it was
        // written. It now reads the real protective_factors score textAnalyzer
        // produces (see its `protective` keyword category).
        const protectiveScore = Math.min(scores.protective_factors || 0, 1);

        const reduction = Math.min(protectiveScore * 0.3, 0.3);

        // Protective_factors itself is an input signal, not a distress
        // category - it's excluded from the reduction (reducing "how
        // protected someone is" by their own protectedness is circular)
        // and passed through unchanged in finalScores for transparency.
        const finalScores = {};
        for (const [key, value] of Object.entries(scores)) {
            finalScores[key] = key === 'protective_factors' ? value : Math.max(value - reduction, 0);
        }

        // Generate impressions
        const impressions = [];
        if (scores.suicidal_ideation > 0.6) {
            impressions.push('⚠️ HIGH SUICIDE RISK - Immediate intervention required');
        }

        // ✅ FIX: this used to be `scores.trauma > 0.7 && scores.dissociation
        // > 0.6`, but scores.dissociation was ALWAYS 0 (see textAnalyzer.js -
        // the field existed but nothing populated it), so this could never
        // fire regardless of input. Now uses the real cross-cluster check.
        const symptomPattern = this._assessSymptomPattern(scores);
        if (symptomPattern.resemblesPTSDPattern) {
            impressions.push(`Language pattern spans multiple trauma symptom clusters (${symptomPattern.clustersPresent.join(', ')}) - resembles a PTSD-consistent pattern, not a diagnosis`);
        }

        if (scores.depression > 0.7 && scores.anxiety > 0.7) {
            impressions.push('Comorbid depression and anxiety');
        }
        if (riskAssessment.riskFactorCount > 0) {
            const allRisk = [...riskAssessment.staticRiskFactors, ...riskAssessment.dynamicRiskFactors];
            impressions.push(`Risk factors present: ${allRisk.join(', ')}`);
        }
        if (riskAssessment.protectiveFactorCount > 0) {
            impressions.push(`Protective factors present: ${riskAssessment.protectiveFactors.join(', ')}`);
        }

        // ✅ NEW: Danger Assessment-inspired lethality risk check (intimate
        // partner violence). See file header for methodology and caveats.
        const dangerAssessment = this._assessDangerFactors(text);
        if (dangerAssessment.elevatedLethalityRisk) {
            impressions.push(`⚠️ Elevated intimate-partner lethality risk indicators present (${dangerAssessment.factorsPresent.join(', ')}) - consider safety planning and DV advocate referral`);
        }

        // Calculate confidence
        let confidence = 0.6;
        const activeRules = expertRules.filter(r => r.activated);
        confidence += Math.min(activeRules.length * 0.05, 0.15);
        if (impressions.length > 0) confidence += 0.05;

        return {
            scores: finalScores,
            intuition: intuition,
            riskScores: riskScores,
            impressions: impressions.join('; ') || 'No significant clinical findings',
            confidence: Math.min(confidence, 0.95),
            // ✅ NEW: structured data for the methodology integrations
            // above, so callers (controller/frontend) can act on them
            // directly rather than parsing the impressions string.
            symptomPattern: symptomPattern,
            dangerAssessment: dangerAssessment,
            riskFormulation: riskAssessment
        };
    }
}

export default HumanIntelligence;