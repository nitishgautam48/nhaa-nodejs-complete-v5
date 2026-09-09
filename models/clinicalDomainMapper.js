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

        // PCL-5's real 20 items grouped into DSM-5's 4 clusters, with
        // their REAL item counts (Intrusion=5, Avoidance=2, Negative
        // Alterations in Cognition/Mood=7, Arousal/Reactivity=6) - reuses
        // the already-curated trauma/dissociation/depression/hyperarousal/
        // avoidance phrases from textAnalyzer.js per item, plus a small
        // number of new phrases for the two items (distorted self-blame,
        // reckless/self-destructive behavior) that had no existing
        // coverage anywhere in this codebase.
        this.pcl5Clusters = {
            intrusion: {
                label: 'Intrusion (Criterion B)',
                items: {
                    intrusiveMemories: {
                        label: 'Repeated, disturbing memories of the event',
                        phrases: ["can't stop thinking about it", 'keeps replaying in my head',
                            "can't forget", 'still see it']
                    },
                    nightmares: { label: 'Repeated, disturbing dreams', phrases: ['nightmare', 'nightmares'] },
                    flashbacks: { label: 'Feeling or acting as if the event were happening again', phrases: ['flashback', 'relive it', 'like watching a movie'] },
                    distressAtCues: { label: 'Feeling very upset when reminded of the event', phrases: ['flinch when', 'haunted by what happened'] },
                    physioReactions: { label: 'Strong physical reactions when reminded of the event', phrases: ['shaking', 'frozen'] }
                }
            },
            avoidance: {
                label: 'Avoidance (Criterion C)',
                items: {
                    avoidInternal: {
                        label: 'Avoiding memories, thoughts, or feelings related to the event',
                        phrases: ['avoid thinking about it', "can't talk about it", 'try not to think about it']
                    },
                    avoidExternal: {
                        label: 'Avoiding external reminders (people, places, activities)',
                        phrases: ["won't go back there", 'stopped going', 'stay away from',
                            'avoid anything that reminds me', 'quit my job to avoid', 'moved to avoid',
                            'changed my route', "can't watch", 'avoid being alone with',
                            "couldn't be in the same room as him", "couldn't be in the same room as her",
                            "couldn't be in the same building as him", "couldn't be in the same building as her"]
                    }
                }
            },
            negativeAlterations: {
                label: 'Negative Alterations in Cognition/Mood (Criterion D)',
                items: {
                    inabilityToRemember: { label: 'Trouble remembering important parts of the event', phrases: ["can't remember parts of it", 'lost time', 'blank spells'] },
                    negativeBeliefs: { label: 'Strong negative beliefs about oneself or the world', phrases: ['feel like a failure', 'never good enough', 'not good enough', 'feel unworthy', 'feel inadequate'] },
                    // ✅ NEW: no existing coverage anywhere for distorted
                    // self-blame - a real, common trauma-response item.
                    distortedBlame: { label: 'Blaming oneself or others for the event or its consequences', phrases: ["it's my fault", 'i blame myself', 'should have stopped it', 'should have known better'] },
                    negativeEmotionalState: { label: 'Persistent negative emotional state (fear, horror, guilt, shame)', phrases: ['horror', 'still feel dirty', 'feel disgusting after', 'violated'] },
                    diminishedInterest: { label: 'Loss of interest in activities once enjoyed', phrases: ['lost interest in everything', "can't find joy in anything"] },
                    detachment: { label: 'Feeling distant or cut off from other people', phrases: ['feel disconnected from everyone', 'not myself', 'feel disconnected', 'detached'] },
                    inabilityPositiveEmotions: { label: 'Trouble experiencing positive emotions', phrases: ['numb to everything', "don't feel anything anymore", 'feel hollow', 'feel like a ghost'] }
                }
            },
            arousal: {
                label: 'Alterations in Arousal and Reactivity (Criterion E)',
                items: {
                    irritability: { label: 'Irritable behavior or angry outbursts', phrases: ['irritable', 'snapping at everyone', 'easily annoyed', 'short temper lately'] },
                    // ✅ NEW: no existing coverage anywhere for reckless/
                    // self-destructive behavior - a real PCL-5 item,
                    // distinct from suicidal ideation itself.
                    recklessBehavior: { label: 'Taking risks or engaging in self-destructive behavior', phrases: ['taking risks i never used to', 'being reckless lately'] },
                    hypervigilance: { label: 'Being overly alert or watchful', phrases: ['hypervigilant', 'always on edge', 'on high alert', 'on guard', 'watching my back', 'sleep with one eye open'] },
                    exaggeratedStartle: { label: 'Being jumpy or easily startled', phrases: ['startled easily', 'easily startled', 'jumpy', 'jump at every sound'] },
                    concentrationProblems: { label: 'Difficulty concentrating', phrases: ["can't concentrate", 'cant concentrate', 'trouble concentrating', "can't focus on anything"] },
                    sleepDisturbance: { label: 'Trouble falling or staying asleep', phrases: ["can't sleep", 'cant sleep', 'trouble sleeping'] }
                }
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

    // Approximates an item rating from whether the domain's phrases
    // matched at all - NOT from real day-frequency/severity data. Any
    // match is scored at roughly two-thirds of the item's max (the
    // "moderate/quite a bit" tier) as a middle-ground estimate, since
    // disclosing a symptom in free text at all is a reasonably strong
    // signal it isn't merely "not at all" or barely present - but text
    // alone can't distinguish that from the true maximum without explicit
    // frequency/intensity language, so the max is reserved for phrases
    // that themselves state it (e.g. "crying every day", "sleeping all day").
    // `maxScore` is 3 for PHQ-9/GAD-7 items, 4 for PCL-5 items (their real
    // response scales differ - PCL-5 is "not at all" to "extremely").
    _itemScoreForDomain(text, domain, maxScore = 3) {
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
        return { score: dailyIndicated ? maxScore : Math.round(maxScore * 0.67), matchedPhrase };
    }

    // Returns { total, domains: { <domainKey>: { label, score, matchedPhrase } } }
    _mapDomains(text, domainDefs, maxScore = 3) {
        const normalized = this._stripApostrophes((text || '').toLowerCase());
        const domains = {};
        let total = 0;

        for (const [key, domain] of Object.entries(domainDefs)) {
            const { score, matchedPhrase } = this._itemScoreForDomain(normalized, domain, maxScore);
            domains[key] = { label: domain.label, score, matchedPhrase };
            total += score;
        }

        return { total, domains };
    }

    mapPHQ9(text) {
        return this._mapDomains(text, this.phq9Domains, 3);
    }

    mapGAD7(text) {
        return this._mapDomains(text, this.gad7Domains, 3);
    }

    // Returns { total, clusters: { intrusion: {total, items}, avoidance:
    // {...}, negativeAlterations: {...}, arousal: {...} } }. PCL-5's 20
    // items are grouped into DSM-5's 4 clusters with their REAL item
    // counts (5/2/7/6) - a cluster with more real items can contribute
    // more to the total, matching how the actual instrument weighs them,
    // rather than treating all 4 clusters as equally-sized buckets.
    mapPCL5(text) {
        const normalized = this._stripApostrophes((text || '').toLowerCase());
        const clusters = {};
        let total = 0;

        for (const [clusterKey, clusterDef] of Object.entries(this.pcl5Clusters)) {
            const items = {};
            let clusterTotal = 0;
            for (const [itemKey, itemDef] of Object.entries(clusterDef.items)) {
                const { score, matchedPhrase } = this._itemScoreForDomain(normalized, itemDef, 4);
                items[itemKey] = { label: itemDef.label, score, matchedPhrase };
                clusterTotal += score;
            }
            clusters[clusterKey] = { label: clusterDef.label, total: clusterTotal, items };
            total += clusterTotal;
        }

        return { total, clusters };
    }
}

export default ClinicalDomainMapper;
