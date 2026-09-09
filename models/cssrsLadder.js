// ================================================================
//  C-SSRS SEVERITY LADDER
//
//  The Columbia-Suicide Severity Rating Scale (C-SSRS) is not a single
//  0-100 score - it is an ORDINAL ladder. A clinician using the real
//  instrument asks a specific sequence of questions and records the
//  HIGHEST rung reached, because rung 5 (a specific plan) is a
//  categorically different, more urgent situation than rung 1 (passive
//  wish to be dead), even if both would otherwise blend into a similar
//  aggregate "suicidal_ideation" keyword score.
//
//  This module is a TEXT-BASED APPROXIMATION of that ladder structure,
//  not the real interview-administered instrument, which requires a
//  trained clinician asking follow-up questions a person's own written
//  words can't substitute for. It classifies each already-curated
//  suicide-related phrase from textAnalyzer.js's keyword list onto the
//  rung it best corresponds to, then reports the HIGHEST rung whose
//  phrases appear in the text - never a diagnosis, never a replacement
//  for a real C-SSRS administration or clinical judgment.
//
//  Real C-SSRS rungs (Ideation subscale, simplified for a screening
//  tool - the real instrument also has a separate Behavior subscale for
//  preparatory acts/attempts, which rung 5 below folds in rather than
//  tracking as a fully separate axis, since both warrant the same
//  emergency response in a triage context):
//    1 - Wish to be dead (passive)
//    2 - Non-specific active suicidal thoughts (no method)
//    3 - Active ideation with a method, but no plan or intent
//    4 - Active ideation with some intent to act, no specific plan
//    5 - Active ideation with a specific plan and intent, OR
//        preparatory behavior (giving away belongings, a goodbye
//        letter, saying goodbye)
// ================================================================

class CSSRSLadder {
    constructor() {
        this.rungInfo = {
            1: { label: 'Wish to be dead', description: 'Passive wish to be dead or not wake up, without active thoughts of self-directed action to cause it.' },
            2: { label: 'Non-specific active suicidal thoughts', description: 'Active, general thoughts of ending one\'s life, without a stated method.' },
            3: { label: 'Active ideation with method (no plan/intent)', description: 'Active thoughts of suicide with a specific method mentioned, but no plan or intent to act.' },
            4: { label: 'Active ideation with some intent', description: 'Active suicidal thoughts with some intent to act, without a fully worked-out plan.' },
            5: { label: 'Active ideation with plan and intent, or preparatory behavior', description: 'A specific plan and intent to act, or preparatory behavior (giving away belongings, a goodbye letter/message) - the most urgent tier.' }
        };

        // Every phrase below is drawn from services/textAnalyzer.js's
        // existing, curated suicide keyword list - classified onto the
        // rung it best fits, not re-curated from scratch. Overly generic
        // single words already in that list ('suicide', 'give up') are
        // deliberately left off THIS ladder even though they still
        // contribute to the blended keyword score elsewhere - the ladder
        // exists to be more precise than the blended score, so it only
        // uses phrases specific enough to place with real confidence.
        this.phrasesByRung = {
            1: {
                en: ['better off dead', 'death wish', 'tired of living', 'not worth living',
                    'no reason to live', 'no point in living', "what's the point of living",
                    'what is the point of living',
                    "what's the point anymore", "wish i was dead", "wish i were dead",
                    "wish i wasn't alive", "wish i weren't alive"],
                hi: ['जीने का मन नहीं']
            },
            2: {
                en: ['suicidal', 'want to die', "don't want to live", "i don't want to exist anymore",
                    'want to disappear forever', 'everyone would be better off without me',
                    "everyone's better off without me", 'everyone better off without me',
                    "i'm a burden to everyone", "i'm just a burden",
                    'no one would notice if i was gone', 'nobody would notice if i disappeared',
                    "i have nothing to live for", 'done with my life', 'done with life',
                    'sleep and never wake up', 'never wake up again',
                    "wish i wouldn't wake up", "hope i don't wake up",
                    'want everything to stop', 'want it all to stop',
                    'i just want it to end', 'just want it all to end',
                    'want the pain to end', 'want the pain to stop', 'want it to be over',
                    'nobody would care if i disappeared', 'no one would care if i disappeared',
                    'everyone would be happier without me', 'everyone happier without me',
                    'ending it all', "don't want to be here", "don't want to exist",
                    'kill myself', 'end my life', 'take my life', 'unalive myself',
                    'want to unalive myself', 'thinking about unaliving myself',
                    'gonna unalive myself', 'unalive me', 'self-deleting', 'self delete',
                    'deleting myself', "can't see a future for myself", 'no future for me',
                    "can't go on", "can't do this anymore", 'give up on life'],
                hi: ['आत्महत्या', 'मर जाना', 'जान ले लेना', 'मरना चाहता हूँ', 'खत्म कर देना']
            },
            3: {
                en: ['cut myself', 'overdose', 'hang myself', 'hurt myself', 'harm myself',
                    'urge to self harm', 'self harm urges', 'wanted to hurt myself',
                    'self-harm', 'self harm'],
                hi: ['खुद को नुकसान']
            },
            4: {
                en: ["won't be here much longer", "not gonna make it another day",
                    "i'm not gonna make it", "don't think i'm gonna make it",
                    'signing off for good', 'final goodbye'],
                hi: ['आत्महत्या कर लूंगा']
            },
            5: {
                en: ['have a plan to end my life', 'giving away my things',
                    'giving away my belongings', 'saying goodbye to everyone',
                    'wrote a goodbye letter'],
                hi: []
            }
        };
    }

    // Same word-boundary + apostrophe-insensitive matching used throughout
    // this codebase (textAnalyzer.js, scstTrainer.js each keep their own
    // small copy of this rather than sharing a module, to keep each
    // engine self-contained - this follows that existing pattern).
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
    // rung 0 (no ladder-specific phrase matched) if none are. rung 0 does
    // NOT mean "no suicide risk" - it means this more precise ladder
    // didn't find one of its specifically-classified phrases; the
    // caller (clinicalScales.js) still falls back to the blended keyword
    // score for that case, so nothing regresses for phrases not yet
    // classified onto the ladder.
    classify(text, lang = 'en') {
        if (!text) return { rung: 0, rungLabel: null, description: null, matchedPhrase: null };

        const normalized = this._stripApostrophes(text.toLowerCase());

        for (const rung of [5, 4, 3, 2, 1]) {
            const phrases = (this.phrasesByRung[rung] && this.phrasesByRung[rung][lang]) || [];
            for (const phrase of phrases) {
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

export default CSSRSLadder;
