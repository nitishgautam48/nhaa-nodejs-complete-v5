// ================================================================
//  MATERNAL TEXT ANALYZER - keyword-based symptom narrative scoring
//
//  Same phrase-matching approach as services/textAnalyzer.js: a curated
//  phrase list per risk category, matched with word-boundary/apostrophe-
//  insensitive substring matching. This is a text-based APPROXIMATION of
//  a symptom history a health worker would ask about directly - not a
//  diagnosis, and never a substitute for an in-person clinical check
//  (BP reading, urine protein, hemoglobin test, fetal heart rate).
//
//  Each category has 'moderate' phrases (early/non-specific wording) and
//  'severe' phrases (an explicit WHO obstetric danger sign) - the higher
//  of the two matched tiers wins, same worst-case-wins principle used
//  throughout this codebase (never quietly downgrade a stronger signal).
// ================================================================

class MaternalTextAnalyzer {
    constructor() {
        this.categories = {
            hypertensive_disorder: {
                moderate: ['mild headache', 'feet are swollen', 'swelling in my feet',
                    'hands feel swollen', 'a bit dizzy', 'occasional headache'],
                severe: ['severe headache', 'blurred vision', 'seeing spots',
                    'vision is blurry', "can't see properly", 'face is swollen',
                    'swelling in my face', 'sudden swelling', 'convulsions', 'had a fit',
                    'seizure', 'lost consciousness', 'blacked out']
            },
            hemorrhage: {
                moderate: ['light bleeding', 'spotting', 'slight bleeding', 'little bit of blood'],
                severe: ['heavy bleeding', 'bleeding a lot', 'soaked through a pad',
                    'soaking a pad every hour', 'blood clots', 'bleeding heavily',
                    'feel dizzy and bleeding', 'bleeding and weak', 'passed out from bleeding']
            },
            infection: {
                moderate: ['mild fever', 'feeling feverish', 'slight fever', 'chills'],
                severe: ['high fever', 'foul smelling discharge', 'bad smelling discharge',
                    'discharge smells bad', 'too weak to get out of bed', 'burning while urinating',
                    'wound is not healing', 'pus from the wound', 'severe abdominal pain with fever']
            },
            anemia: {
                moderate: ['feel tired all the time', 'always tired', 'weak and tired', 'pale skin'],
                severe: ['extremely weak', 'breathless even resting', 'short of breath easily',
                    'heart racing', 'fainting spells', 'very pale']
            },
            fetal_distress: {
                moderate: ['baby is moving less', 'less movement than usual', 'fewer kicks today'],
                severe: ['baby stopped moving', 'no movement since yesterday', "can't feel the baby move",
                    'no kicks at all', 'baby not moving at all']
            },
            obstructed_labor: {
                moderate: ['labor pains for a long time', 'contractions for hours', 'long labor'],
                severe: ['labor for more than a day', 'stuck baby', 'baby not coming out',
                    'severe abdominal pain during labor', 'no progress in labor', 'exhausted from labor']
            },
            malnutrition: {
                moderate: ['not eating well', 'loss of appetite', 'eating very little'],
                severe: ['barely eating anything', 'severe weight loss', 'very thin', 'malnourished']
            }
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

    analyze(text) {
        const normalized = this._stripApostrophes((text || '').toLowerCase());
        const scores = {};
        const matchedPhrases = {};

        for (const [category, tiers] of Object.entries(this.categories)) {
            let score = 0;
            let matched = null;

            for (const phrase of tiers.severe) {
                if (this._containsPhrase(normalized, phrase)) {
                    score = 0.85;
                    matched = phrase;
                    break;
                }
            }
            if (score === 0) {
                for (const phrase of tiers.moderate) {
                    if (this._containsPhrase(normalized, phrase)) {
                        score = 0.45;
                        matched = phrase;
                        break;
                    }
                }
            }

            scores[category] = score;
            matchedPhrases[category] = matched;
        }

        return {
            scores,
            matchedPhrases,
            methodology: 'Text-based approximation of a maternal danger-sign symptom history - not a diagnosis, and never a substitute for an in-person BP/urine/hemoglobin check or fetal heart rate monitoring.'
        };
    }
}

export default MaternalTextAnalyzer;
