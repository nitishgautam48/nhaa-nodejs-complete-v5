// ================================================================
//  MATERNAL RISK FORMULATION - Structured Risk/Protective Checklist
//
//  Direct maternal-health counterpart to models/riskFormulation.js, same
//  three-way split:
//   - STATIC risk factors: obstetric HISTORY that doesn't change this
//     pregnancy (a prior C-section, a prior stillbirth) - contributes
//     background risk.
//   - DYNAMIC risk factors: CURRENT, changeable conditions this pregnancy
//     (no antenatal care, malnutrition signs, an unbooked pregnancy) -
//     drive immediate risk level and are what a health worker's follow-up
//     plan targets.
//   - PROTECTIVE factors: reduce risk without erasing it - regular ANC
//     attendance, a birth-preparedness plan, family/transport support.
//
//  Detection works two ways, same as the rest of this codebase's
//  free-text-plus-structured-input pattern (see maternalTextAnalyzer.js /
//  maternalVitalsRules.js): phrase-matching over a free-text narrative,
//  OR direct boolean flags from a structured history form - whichever is
//  available. A factor counts once it's true either way.
// ================================================================

class MaternalRiskFormulation {
    constructor() {
        this.staticRiskFactors = {
            prior_csection: ['had a c-section before', 'previous c-section', 'past cesarean',
                'delivered by c-section before', 'prior caesarean'],
            prior_preeclampsia: ['had pre-eclampsia before', 'preeclampsia in last pregnancy',
                'high bp in last pregnancy', 'toxemia before'],
            prior_pph: ['bled heavily after last delivery', 'postpartum hemorrhage before',
                'heavy bleeding after my last baby'],
            prior_stillbirth_or_loss: ['had a stillbirth', 'lost a baby before', 'previous miscarriage',
                'miscarried before', 'lost a pregnancy before'],
            chronic_hypertension: ['history of high blood pressure', 'have chronic hypertension',
                'bp problems before pregnancy', 'hypertensive before this pregnancy'],
            pre_existing_diabetes: ['diabetic before pregnancy', 'have diabetes',
                'history of diabetes', 'sugar problem before pregnancy'],
            grand_multipara: ['this is my fifth pregnancy', 'this is my sixth pregnancy',
                'had many pregnancies before', 'many children already'],
            teenage_or_advanced_age: ['i am under 18', 'i am over 35', 'very young mother',
                'older first-time mother']
        };

        this.dynamicRiskFactors = {
            no_antenatal_care: ["haven't had any checkups", 'no anc visits', 'never went for checkup',
                "haven't seen a doctor this pregnancy", 'no prenatal checkups', 'unbooked pregnancy'],
            malnutrition_signs: ['not eating well', 'very thin', 'losing weight', 'barely eating',
                'not getting enough food', 'malnourished'],
            anemia_symptoms: ['always tired', 'feel weak all the time', 'pale skin', 'breathless easily'],
            unregistered_or_late_booking: ['just found out i was pregnant late', 'booked very late',
                'first checkup was very late'],
            teen_or_unsupported_pregnancy: ['no one knows i am pregnant', 'hiding my pregnancy',
                'family does not know', 'alone in this pregnancy'],
            high_risk_symptoms_reported: ['severe headache', 'blurred vision', 'heavy bleeding',
                'baby stopped moving', 'convulsions', 'high fever', 'severe abdominal pain']
        };

        this.protectiveFactors = {
            regular_anc_visits: ['going for regular checkups', 'attend all my anc visits',
                'never miss a checkup', 'anc visits are regular', 'monthly checkups'],
            iron_folic_supplementation: ['taking my iron tablets', 'taking folic acid',
                'taking my supplements regularly'],
            institutional_delivery_plan: ['planning to deliver at the hospital',
                'plan to deliver at the phc', 'registered at a hospital for delivery'],
            birth_preparedness_plan: ['have a birth plan', 'saved money for delivery',
                'arranged transport for delivery', 'birth preparedness plan ready'],
            family_support: ['my husband supports me', 'family is helping me',
                'my mother-in-law helps me', 'supportive family'],
            asha_or_health_worker_contact: ['asha worker visits me', 'in touch with asha didi',
                'anm checks on me', 'health worker visits regularly']
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

    _detectFromText(text, factorDefs) {
        const present = [];
        for (const [factorName, phrases] of Object.entries(factorDefs)) {
            if (phrases.some(p => this._containsPhrase(text, p))) {
                present.push(factorName);
            }
        }
        return present;
    }

    // `history` is an optional structured-flags object (from a booking
    // form) whose boolean keys map 1:1 onto factor names above - e.g.
    // { prior_csection: true, regular_anc_visits: true }. Either source
    // (text phrase match OR a true flag) is enough for a factor to count.
    assess(text, history = {}) {
        const normalized = this._stripApostrophes((text || '').toLowerCase());

        const mergeWithFlags = (fromText, factorDefs) => {
            const set = new Set(fromText);
            for (const factorName of Object.keys(factorDefs)) {
                if (history[factorName] === true) set.add(factorName);
            }
            return [...set];
        };

        const staticPresent = mergeWithFlags(
            this._detectFromText(normalized, this.staticRiskFactors), this.staticRiskFactors);
        const dynamicPresent = mergeWithFlags(
            this._detectFromText(normalized, this.dynamicRiskFactors), this.dynamicRiskFactors);
        const protectivePresent = mergeWithFlags(
            this._detectFromText(normalized, this.protectiveFactors), this.protectiveFactors);

        // Same graduated-multiplier shape as riskFormulation.js: dynamic
        // (current) factors weighted slightly higher than static
        // (historical) ones, protective factors offset but never below 1.0.
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
            methodology: 'Structured obstetric risk/protective factor checklist, detected from free-text narrative and/or a structured history form - not a substitute for an ANC booking interview.'
        };
    }
}

export default MaternalRiskFormulation;
