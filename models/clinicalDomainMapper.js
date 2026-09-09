// ================================================================
//  PHQ-9 / GAD-7 DOMAIN MAPPER
//
//  Like cssrsLadder.js, this is a text-based approximation of a real
//  clinical instrument's STRUCTURE, not the instrument itself. The
//  actual PHQ-9 asks 9 separate questions (anhedonia, depressed mood,
//  sleep, fatigue, appetite, guilt/worthlessness, concentration,
//  psychomotor change, suicidal ideation), each rated 0-3 for how many
//  days in the last two weeks it applied. The actual GAD-7 asks 7
//  separate questions (nervousness, uncontrollable worry, worrying too
//  much, trouble relaxing, restlessness, irritability, fear something
//  awful will happen), same 0-3 rating.
//
//  clinicalScales.js previously collapsed each scale into ONE blended
//  keyword score and linearly rescaled it onto the total range - so
//  someone whose text touched only ONE domain very intensely (e.g. just
//  anhedonia) could produce the same PHQ-9 number as someone whose text
//  showed mild signal spread across several domains, even though the
//  real instrument's total is a SUM of independently-rated items and
//  the pattern across domains is itself clinically meaningful (breadth,
//  not just intensity).
//
//  This module classifies text against each domain separately using the
//  same curated phrases already in textAnalyzer.js's depression/anxiety
//  keyword lists (reused, not re-authored), plus a small number of new
//  phrases for domains that had no existing coverage at all
//  (concentration, psychomotor change, irritability - see the comments
//  at each domain below). A domain's item score (0-3) is derived from
//  the weight of its strongest matched phrase - NOT from real
//  day-frequency data, which text alone cannot reliably provide. This
//  is explicitly an approximation of breadth-and-intensity, not a
//  substitute for someone actually answering "how many days out of the
//  last two weeks".
// ================================================================

class ClinicalDomainMapper {
    constructor() {
        // PHQ-9's 9 domains. Suicidal ideation (item 9) is deliberately
        // NOT duplicated here - it's already handled far more precisely
        // by the C-SSRS ladder (cssrsLadder.js) and the dedicated suicide
        // keyword category, so clinicalScales.js sources that item from
        // there directly instead of re-deriving it from depression text.
        this.phq9Domains = {
            anhedonia: {
                label: 'Little interest or pleasure in doing things',
                phrases: ['meaningless', 'anhedonia', 'lost interest in everything',
                    "can't find joy in anything", 'everything feels pointless',
                    "i don't care about anything anymore", 'nothing matters anymore',
                    'nothing matters', 'no motivation for anything',
                    "don't see the point in getting up", 'no point in getting up',
                    "don't see the point anymore", 'feels like a waste of time',
                    'everything feels like a waste', 'not vibing with life',
                    'life feels grey', 'everything is grey']
            },
            depressedMood: {
                label: 'Feeling down, depressed, or hopeless',
                phrases: ['depressed', 'sad', 'down', 'gloomy', 'despair', 'miserable',
                    'sorrow', 'despondent', 'crying', 'tears', 'grief', 'not okay',
                    'not doing okay', 'not doing good mentally', "i'm not okay bestie",
                    'in a dark place', 'rock bottom', 'at rock bottom', 'falling apart',
                    'breaking down', 'at my breaking point', 'not in a good headspace',
                    'bad headspace', 'crying every day', 'cry myself to sleep',
                    'so done with everything', 'done with everything', 'feel hollow',
                    'empty', 'empty inside', 'feel empty inside', 'i feel nothing',
                    'feel like a ghost', 'numb to everything', "don't feel anything anymore",
                    'empty husk', 'feel like an empty husk', 'hopeless',
                    'lonely', 'isolated', 'feel disconnected from everyone',
                    'stopped talking to everyone', "don't feel like myself",
                    'existing not living', 'surviving not living']
            },
            sleep: {
                label: 'Trouble sleeping, or sleeping too much',
                phrases: ["can't get out of bed", "don't want to get out of bed",
                    'sleeping all day', "can't sleep at all"]
            },
            fatigue: {
                label: 'Feeling tired or having little energy',
                phrases: ['exhausted', 'fatigue', 'tired', 'burnt out', 'burnout',
                    'mentally drained', 'emotionally drained', 'running on empty',
                    'checked out', "don't have energy for anything", 'no energy for anything',
                    'lost all my energy', 'living in survival mode', 'survival mode',
                    'running on fumes', 'barely functioning', "can't function",
                    'struggling to get through the day']
            },
            appetite: {
                label: 'Poor appetite or overeating',
                phrases: ['lost my appetite', 'stopped eating']
            },
            guiltWorthlessness: {
                label: 'Feeling bad about yourself, or that you are a failure',
                phrases: ['worthless', 'burden', 'feel like a failure', 'feel like nothing',
                    'feel unworthy', 'never good enough', 'not good enough',
                    'feel inadequate', 'feel inferior', 'feel incompetent']
            },
            // ✅ NEW: no existing depression keyword covered this domain at
            // all - a real structural gap, not just a phrasing variant of
            // something already there.
            concentration: {
                label: 'Trouble concentrating on things',
                phrases: ['trouble concentrating', "can't focus on anything",
                    'mind keeps wandering', "can't think straight", "can't concentrate on anything"]
            },
            // ✅ NEW: same real gap as concentration above.
            psychomotor: {
                label: 'Moving/speaking noticeably slower, or being unusually fidgety/restless',
                phrases: ['moving in slow motion', 'everything feels like effort',
                    "can't sit still", 'everything takes so much effort']
            }
        };

        // GAD-7's 7 domains. Somatic anxiety phrases (racing heart,
        // breathing difficulty) are intentionally kept OUT of these 7 -
        // the real GAD-7 is a purely cognitive/behavioral worry scale and
        // doesn't ask about physical symptoms, so folding them in here
        // would misrepresent what this number is supposed to measure.
        this.gad7Domains = {
            nervousness: {
                label: 'Feeling nervous, anxious, or on edge',
                phrases: ['anxiety', 'nervous', 'agitated', 'tense',
                    'anxiety is through the roof', 'panic mode', 'anxious af',
                    'stressed tf out', 'stressed af', 'overwhelmed', 'overwhelmed af',
                    "can't handle this rn", 'constantly on edge']
            },
            uncontrollableWorry: {
                label: 'Not being able to stop or control worrying',
                phrases: ['worried', 'worry', "can't stop worrying", 'worried sick',
                    "mind won't stop racing", "mind won't stop", 'racing thoughts',
                    'intrusive thoughts', "can't shut my brain off", "brain won't shut off"]
            },
            worryingTooMuch: {
                label: 'Worrying too much about different things',
                phrases: ['overthinking everything', "can't stop overthinking",
                    'imagining the worst happening', 'keep imagining the worst',
                    'worst case scenario']
            },
            troubleRelaxing: {
                label: 'Trouble relaxing',
                phrases: ['brain fog', 'nervous system is fried', 'nervous system fried']
            },
            restlessness: {
                label: 'Being so restless that it is hard to sit still',
                phrases: ['restless', 'trembling', 'shaking with anxiety', 'spiraling',
                    'spiraling out of control', 'losing it', 'freaking out']
            },
            // ✅ NEW: no existing anxiety keyword covered this domain -
            // real structural gap.
            irritability: {
                label: 'Becoming easily annoyed or irritable',
                phrases: ['irritable', 'snapping at everyone', 'on edge with everyone',
                    'easily annoyed', 'short temper lately']
            },
            fearOfAwfulThing: {
                label: 'Feeling afraid something awful might happen',
                phrases: ['fear', 'frightened', 'phobia', 'dread', 'dread going',
                    'afraid something bad will happen', 'panic', 'panic attacks',
                    'having panic attacks']
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

    // Approximates a 0-3 PHQ-9/GAD-7 item rating from whether the domain's
    // phrases matched at all - NOT from real day-frequency data. Any match
    // is scored 2 ("more than half the days") as a middle-ground estimate,
    // since disclosing a symptom in free text at all is a reasonably
    // strong signal it isn't merely "not at all" (0) or a single passing
    // day (1) - but text alone can't distinguish 2 from the maximum 3
    // ("nearly every day") without explicit frequency language, so 3 is
    // reserved for phrases that themselves state frequency/severity
    // (e.g. "crying every day", "sleeping all day").
    _itemScoreForDomain(text, domain) {
        const dailyPhrases = ['every day', 'all day', 'every night', 'all the time', 'constantly'];
        let matched = false;
        let matchedPhrase = null;
        let dailyIndicated = false;

        for (const phrase of domain.phrases) {
            if (this._containsPhrase(text, phrase)) {
                matched = true;
                matchedPhrase = phrase;
                if (dailyPhrases.some(d => phrase.includes(d))) dailyIndicated = true;
                break;
            }
        }

        if (!matched) return { score: 0, matchedPhrase: null };
        return { score: dailyIndicated ? 3 : 2, matchedPhrase };
    }

    // Returns { total, domains: { <domainKey>: { label, score, matchedPhrase } } }
    _mapDomains(text, domainDefs) {
        const normalized = this._stripApostrophes((text || '').toLowerCase());
        const domains = {};
        let total = 0;

        for (const [key, domain] of Object.entries(domainDefs)) {
            const { score, matchedPhrase } = this._itemScoreForDomain(normalized, domain);
            domains[key] = { label: domain.label, score, matchedPhrase };
            total += score;
        }

        return { total, domains };
    }

    mapPHQ9(text) {
        return this._mapDomains(text, this.phq9Domains);
    }

    mapGAD7(text) {
        return this._mapDomains(text, this.gad7Domains);
    }
}

export default ClinicalDomainMapper;
