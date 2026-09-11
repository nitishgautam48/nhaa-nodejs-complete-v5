// ================================================================
//  MATERNAL DANGER-SIGN LADDER
//
//  WHO/India RMNCH+A community-health-worker training defines a fixed
//  set of pregnancy/postpartum "danger signs" that mean go to a facility
//  NOW: severe vaginal bleeding, convulsions, severe headache with
//  blurred vision, high fever with weakness, severe abdominal pain, and
//  fast/difficult breathing. In practice a woman's own words rarely land
//  neatly on "danger sign present / absent" - they range from an early,
//  vague symptom to a full emergency description.
//
//  This module is the maternal-health counterpart to models/cssrsLadder.js:
//  an ORDINAL ladder rather than a single blended score, because rung 5
//  (convulsions, unconsciousness, soaking-a-pad-an-hour bleeding) is a
//  categorically more urgent situation than rung 1 (mild ankle swelling),
//  even if a keyword-only scorer might weigh them similarly. It reports
//  the HIGHEST rung whose phrases appear in the text - never a diagnosis,
//  always in addition to (never instead of) an actual BP/urine/fetal
//  heart-rate check by a trained health worker.
//
//  Rungs (screening simplification of the WHO danger-sign set):
//    1 - Mild/early warning (mild swelling, occasional mild headache)
//    2 - Persistent non-specific concern (persistent headache, reduced
//        fetal movement noticed, mild spotting, mild fever)
//    3 - Specific concerning symptom (blurred vision, facial/hand
//        swelling, moderate bleeding, high fever with chills)
//    4 - WHO danger sign present (severe headache + blurred vision,
//        severe abdominal pain, heavy bleeding, absent fetal movement,
//        fast/difficult breathing, foul discharge with fever)
//    5 - Emergency / life-threatening (convulsions/fits, unconsciousness,
//        signs of shock, prolonged obstructed labor) - call for
//        emergency transport immediately, do not wait.
// ================================================================

class MaternalDangerLadder {
    constructor() {
        this.rungInfo = {
            1: { label: 'Mild/early warning', description: 'A mild, early symptom - continue monitoring and keep the next ANC visit.' },
            2: { label: 'Persistent non-specific concern', description: 'A persistent or repeated symptom that warrants contacting the ASHA/ANM or health worker.' },
            3: { label: 'Specific concerning symptom', description: 'A specific symptom that warrants a facility visit today, not just a phone check-in.' },
            4: { label: 'WHO danger sign present', description: 'A recognized obstetric danger sign - go to the nearest facility now.' },
            5: { label: 'Emergency / life-threatening', description: 'A life-threatening emergency sign - call for emergency transport (108/102) immediately.' }
        };

        this.phrasesByRung = {
            1: ['mild swelling', 'feet are a little swollen', 'occasional mild headache',
                'slight fatigue', 'a bit tired', 'mild nausea'],
            2: ['persistent headache', 'headache that won\'t go away', 'less movement than usual',
                'fewer kicks today', 'mild spotting', 'mild fever', 'feeling feverish', 'slight fever'],
            3: ['blurred vision', 'vision is blurry', 'seeing spots', 'face is swollen',
                'hands are swollen', 'moderate bleeding', 'high fever with chills', 'high fever'],
            4: ['severe headache', "can't see properly", 'severe abdominal pain', 'heavy bleeding',
                'bleeding heavily', 'soaked through a pad', 'soaking a pad every hour',
                'baby stopped moving', 'no movement since yesterday', "can't feel the baby move",
                'fast breathing', 'difficulty breathing', 'trouble breathing',
                'foul smelling discharge', 'discharge smells bad', 'too weak to get out of bed'],
            5: ['convulsions', 'had a fit', 'seizure', 'lost consciousness', 'blacked out',
                'fainted', 'cold and clammy', 'labor for more than a day', 'stuck baby',
                'baby not coming out', 'bleeding and passed out']
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

    // Returns the HIGHEST rung whose phrases are found in the text, or
    // rung 0 if none matched (does NOT mean "no risk" - the caller still
    // falls back to the blended vitals/text scores for that case).
    classify(text) {
        if (!text) return { rung: 0, rungLabel: null, description: null, matchedPhrase: null };

        const normalized = this._stripApostrophes(text.toLowerCase());

        for (const rung of [5, 4, 3, 2, 1]) {
            for (const phrase of this.phrasesByRung[rung]) {
                if (this._containsPhrase(normalized, phrase)) {
                    return {
                        rung,
                        rungLabel: this.rungInfo[rung].label,
                        description: this.rungInfo[rung].description,
                        matchedPhrase: phrase
                    };
                }
            }
        }

        return { rung: 0, rungLabel: null, description: null, matchedPhrase: null };
    }
}

export default MaternalDangerLadder;
