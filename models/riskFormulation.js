// ================================================================
//  RISK FORMULATION - Structured Risk/Protective Factor Checklist
//
//  ⚠️ humanIntelligence.js has long defined a knowledgeBase with
//  riskFactors/protectiveFactors/warningSigns category NAMES, and a
//  heuristicWeights object - but neither was ever actually read
//  anywhere in synthesize(). They were dead scaffolding: the real logic
//  was just `riskCount = how many of the 12 SCORE categories exceed
//  0.5`, then a flat 3-tier multiplier (1.5/1.2/1) - not a risk
//  formulation, just a threshold count with no distinction between,
//  say, current homelessness and a mildly elevated anxiety score.
//
//  Real clinical risk formulation separates:
//   - STATIC risk factors: historical, don't change day to day (a prior
//     suicide attempt, family history) - contribute background risk.
//   - DYNAMIC risk factors: current, changeable (recent loss,
//     unemployment, active substance use, homelessness) - drive
//     immediate risk level and are what safety planning targets.
//   - PROTECTIVE factors: reduce risk, but do not erase it - reasons
//     for living, social support, treatment engagement, help-seeking.
//
//  This module gives humanIntelligence.js's existing category names
//  real, text-based detection (same phrase-matching approach as
//  cssrsLadder.js and clinicalDomainMapper.js) and a graduated
//  multiplier based on WHICH factors are present, not just a raw count
//  of unrelated score categories crossing 0.5. Still a text-based
//  approximation, not a substitute for a clinician's actual risk
//  assessment interview, which asks about history no single piece of
//  text can fully capture.
// ================================================================

class RiskFormulation {
    constructor() {
        this.staticRiskFactors = {
            prior_trauma: ["isn't the first time", 'happened to me before', 'happened before too',
                'not the first time this happened', 'previous trauma', 'abused before',
                'been abused before', 'long history of abuse'],
            family_history: ['runs in my family', 'family history of depression',
                'family history of suicide', 'my mother also struggled', 'my father also struggled',
                'mental illness runs in my family', 'my sibling also struggles'],
            prior_attempt: ['tried before', 'attempted before', 'tried to kill myself before',
                'previous attempt', "isn't my first attempt", 'tried once before']
        };

        this.dynamicRiskFactors = {
            substance_use: ['drinking more than usual', 'using drugs to cope', 'started drinking again',
                'relying on alcohol', 'using substances to cope', 'drinking to numb the pain'],
            poor_social_support: ['have no one', 'no one checks on me', 'no one to turn to',
                'completely alone in this', 'no support system'],
            recent_loss: ['recently lost', 'passed away recently', 'death in the family',
                'recently divorced', 'recently separated', 'my relationship just ended'],
            chronic_stress: ['stress for months', 'stress for years', 'nonstop pressure',
                'never ending stress', 'overwhelmed for months'],
            financial_distress: ["can't pay my bills", 'in debt', 'financial trouble',
                "can't afford", 'money problems', 'broke and stressed'],
            unemployment: ['lost my job', 'unemployed', "can't find a job", 'out of work'],
            homelessness: ['no place to live', 'homeless', 'nowhere to stay',
                'living on the street', 'about to be homeless']
        };

        this.protectiveFactors = {
            social_support: ['my friends are there for me', 'my family supports me',
                'people who care about me', 'not alone in this', 'support', 'supportive',
                'family support', 'friends help'],
            coping_skills: ['able to cope', 'using healthy coping', 'journaling helps',
                'exercise helps me cope', 'coping'],
            resilience: ['i am resilient', 'i will get through this', 'i have survived worse',
                'resilient', 'resilience'],
            help_seeking: ['sought help', 'seeing a therapist', 'talked to a counselor',
                'reached out for help', 'reached out', 'seeking help'],
            insight: ['i know i need help', 'i realize i need support', "i understand this isn't normal"],
            treatment_engagement: ['in therapy', 'taking my medication', 'seeing my psychiatrist',
                'attending sessions', 'in counseling'],
            // Not one of the original 6 categories, but a well-established
            // protective factor in clinical suicide-risk literature
            // (reasons for living / responsibility to others).
            reasons_for_living: ['for my kids', 'because of my children', 'my family needs me',
                'i want to see my kids grow up', 'i have so much to live for']
        };
    }

    _stripApostrophes(s) {
        return s.replace(/['’‘]/g, '');
    }

    _isLetterOrDigit(ch) {
        return !!ch && /[\p{L}\p{N}]/u.test(ch);
    }

    _containsPhrase(text, phrase) {
        const cleanPhrase = this._stripApostrophes(phrase);
        let fromIndex = 0;
        while (true) {
            const pos = text.indexOf(cleanPhrase, fromIndex);
            if (pos === -1) return false;
            const before = pos > 0 ? text[pos - 1] : '';
            const after = pos + cleanPhrase.length < text.length ? text[pos + cleanPhrase.length] : '';
            if (!this._isLetterOrDigit(before) && !this._isLetterOrDigit(after)) return true;
            fromIndex = pos + 1;
        }
    }

    _detectFactors(text, factorDefs) {
        const present = [];
        for (const [factorName, phrases] of Object.entries(factorDefs)) {
            if (phrases.some(p => this._containsPhrase(text, p))) {
                present.push(factorName);
            }
        }
        return present;
    }

    // Returns the full checklist plus a graduated multiplier. Dynamic
    // (current) factors are weighted slightly higher than static
    // (historical) ones for a CURRENT crisis screening tool - each
    // protective factor found offsets, but the floor keeps the
    // multiplier from ever dropping below 1.0 (protective factors
    // reduce risk accumulation, they do not erase the underlying signal
    // itself - the same principle scstTrainer.js already applies to
    // caste-based vulnerability).
    assess(text) {
        const normalized = this._stripApostrophes((text || '').toLowerCase());

        const staticPresent = this._detectFactors(normalized, this.staticRiskFactors);
        const dynamicPresent = this._detectFactors(normalized, this.dynamicRiskFactors);
        const protectivePresent = this._detectFactors(normalized, this.protectiveFactors);

        const weightedRisk = (staticPresent.length * 1.0) + (dynamicPresent.length * 1.2);
        const rawMultiplier = 1 + Math.min(weightedRisk * 0.15, 0.6);
        const protectiveOffset = protectivePresent.length * 0.08;
        const multiplier = Math.max(rawMultiplier - protectiveOffset, 1.0);

        return {
            staticRiskFactors: staticPresent,
            dynamicRiskFactors: dynamicPresent,
            protectiveFactors: protectivePresent,
            riskFactorCount: staticPresent.length + dynamicPresent.length,
            protectiveFactorCount: protectivePresent.length,
            multiplier,
            methodology: 'Text-based approximation of a clinical risk/protective factor checklist - not a substitute for a clinician\'s risk assessment interview, which asks about history no single piece of text can fully capture.'
        };
    }
}

export default RiskFormulation;
