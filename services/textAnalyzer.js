// ================================================================
//  ADVANCED TEXT ANALYZER - Context-Aware NLP (FIXED)
//  Detects intensity, negation, and case-sensitive patterns
// ================================================================

class TextAnalyzer {
    constructor() {
        // ================================================================
        //  INTENSITY MODIFIERS (Boost scores)
        // ================================================================
        this.intensifiers = {
            en: ['very', 'extremely', 'absolutely', 'completely', 'really', 'so', 'too',
                'totally', 'utterly', 'severely', 'intensely', 'overwhelmingly'],
            hi: ['बहुत', 'अत्यंत', 'पूरी तरह', 'सच में', 'इतना', 'काफी', 'अत्यधिक']
        };

        // ================================================================
        //  NEGATION WORDS (Reduce scores)
        // ================================================================
        this.negations = {
            en: ['not', 'no', 'never', 'none', "don't", "can't", "won't",
                 "isn't", "aren't", "wasn't", "didn't", "doesn't", "cannot"],
            hi: ['नहीं', 'ना', 'कभी नहीं', 'कोई नहीं']
        };

        // ================================================================
        //  COMPREHENSIVE KEYWORD DATABASE WITH WEIGHTS
        // ================================================================
        this.keywordDB = {
            // TRAUMA KEYWORDS
            trauma: {
                keywords: {
                    en: {
                        'trauma': 15, 'abuse': 20, 'violence': 25, 'rape': 30,
                        'assault': 25, 'torture': 25, 'murder': 30, 'death': 20,
                        'ptsd': 20, 'flashback': 20, 'nightmare': 15, 'trigger': 10,
                        'hypervigilant': 15, 'numb': 10, 'broken': 10, 'devastated': 10,
                        'victim': 15, 'survivor': 10, 'beaten': 20, 'attacked': 20,
                        'helpless': 15, 'powerless': 12, 'horror': 15, 'suffering': 15,
                        'pain': 10, 'hurt': 10, 'scared': 10, 'terrified': 15,
                        'fearful': 10, 'ordeal': 10,
                        // ✅ Added: common paraphrasing seen in longer narrative
                        // accounts that the original list required matching
                        // verbatim ("assault", "beaten") to catch.
                        'forced myself': 15, 'held down': 20, 'couldn\'t escape': 20,
                        'wouldn\'t let go': 15, 'still see it': 15, 'can\'t forget': 12,
                        'haunts me': 15, 'relive it': 15, 'shaking': 10, 'frozen': 12,
                        // ✅ NEW: real-world physical-abuse phrasing. The
                        // existing single-word keywords ('beaten', 'attacked')
                        // missed the way people actually describe ongoing
                        // domestic violence in their own words.
                        'hitting me': 25, 'hits me': 25, 'hit me': 22, 'beats me': 25,
                        'beat me': 22, 'punched me': 25, 'slapped me': 20, 'kicked me': 22,
                        'choked me': 28, 'strangled me': 30, 'broke my arm': 28,
                        'broke my leg': 28, 'domestic violence': 25, 'abusive husband': 22,
                        'abusive relationship': 20, 'black eye': 20, 'threw me': 20,
                        'pushed me down': 18, 'dragged me': 20,
                        // ✅ NEW: sexual harassment/assault described in
                        // plain, indirect, minimizing language - matches
                        // what was already added to the SC/ST-specific
                        // engine's sexual_abuse_indirect pattern, now also
                        // covering the general (non-caste-specific) case so
                        // e.g. workplace harassment isn't scored as zero
                        // signal purely because it didn't use clinical or
                        // legal vocabulary.
                        'sexual comments': 22, 'inappropriate comments': 18,
                        'touched me inappropriately': 28, 'touched inappropriately': 25,
                        'inappropriate touch': 22, 'unwanted advances': 22,
                        'made me uncomfortable': 15, 'against my will': 25,
                        'forced himself': 28, 'forced herself': 28,
                        "didn't want it": 20, 'did not want it': 20,
                        'took advantage of me': 22, 'molested': 28, 'groped': 25,
                        // ✅ FIX: only the past-tense verb 'molested' was
                        // covered - the noun 'molestation' (a very common,
                        // often more formal way this is described, e.g.
                        // "I am suffering from social molestation") scored
                        // ZERO signal. The fuzzy/stemming fallback can't
                        // bridge this: "-ation" isn't a suffix it strips,
                        // and even after stripping "-ing"/"-s" the edit
                        // distance to "molested" exceeds the threshold.
                        // Added explicitly rather than relying on fuzzy
                        // matching, same as every other multi-form phrase
                        // in this category.
                        'molestation': 28, 'molesting': 28, 'molests': 25,
                        'sexually harassed': 25, 'sexually assaulted': 30,
                        // ✅ NEW: comprehensive trauma expansion - physical
                        // abuse patterns, intrusive/PTSD-adjacent language,
                        // and sexual trauma phrasing in victims' own words.
                        'beaten badly': 28, 'beaten repeatedly': 28, 'physically abused': 25,
                        'abused physically': 25, 'burned me': 25, 'burnt me': 25,
                        'threw things at me': 20, 'smashed things': 15,
                        "can't stop thinking about it": 18, 'keeps replaying in my head': 20,
                        'haunted by what happened': 20, 'flinch when': 15,
                        'still feel dirty': 22, 'feel disgusting after': 22,
                        "can't wash it off": 20, 'violated': 22, 'used me': 15,
                        'took advantage of me sexually': 28, 'traumatized': 20,
                        'traumatic experience': 18, 'scarred me': 15,
                        'changed me forever': 12, 'not the same person anymore': 15,
                        // ✅ NEW: physical restraint during assault - a
                        // real, common way this is described that scored
                        // zero (fell to a generic "depression" match instead).
                        'pinned me down': 25, 'held me down': 25, 'pinned down': 22,
                        // ✅ NEW: PCL-5's distorted self-blame item (see
                        // models/clinicalDomainMapper.js phase 4 work) had
                        // no coverage anywhere - added here too so it
                        // moves the headline trauma score, not just the
                        // PCL-5 sub-scale.
                        "it's my fault": 16, 'i blame myself': 16,
                        'should have stopped it': 14, 'should have known better': 12
                    },
                    hi: {
                        'आघात': 15, 'अत्याचार': 20, 'हिंसा': 25, 'बलात्कार': 30,
                        'हमला': 25, 'यातना': 25, 'हत्या': 30, 'मौत': 20,
                        'दर्द': 15, 'पीड़ा': 15, 'पीड़ित': 15, 'धमकी': 15,
                        'डर': 10, 'भय': 10, 'असहाय': 15, 'फ्लैशबैक': 20,
                        'अतिसतर्क': 15, 'चौकन्ना': 10, 'सुन्न': 10, 'बेकार': 10,
                        'टूटा': 10, 'क्षतिग्रस्त': 10, 'निराश': 10
                    }
                },
                multiplier: 1.0
            },

            // DEPRESSION KEYWORDS
            depression: {
                keywords: {
                    en: {
                        'depressed': 20, 'hopeless': 20, 'worthless': 18, 'empty': 15,
                        'lonely': 15, 'isolated': 15, 'despair': 20, 'grief': 15,
                        'meaningless': 15, 'burden': 10, 'exhausted': 10, 'sad': 10,
                        'crying': 10, 'tears': 8, 'miserable': 12, 'anhedonia': 15,
                        'fatigue': 10, 'tired': 8, 'dark': 8, 'heavy': 8,
                        'sorrow': 12, 'despondent': 15, 'down': 8, 'gloomy': 8,
                        // ✅ NEW: modern/informal ways people (especially
                        // younger users) actually describe low mood -
                        // clinical vocabulary ("anhedonia", "despondent")
                        // isn't how most people, especially Gen Z, describe
                        // how they're feeling.
                        'not okay': 15, 'not doing okay': 18, 'not doing good mentally': 20,
                        'empty inside': 18, 'feel empty inside': 18, 'i feel nothing': 15,
                        'nothing matters anymore': 22, "nothing matters": 15,
                        'checked out': 10, 'running on empty': 12, 'burnt out': 12,
                        'burnout': 12, 'mentally drained': 12, 'emotionally drained': 14,
                        'falling apart': 16, 'breaking down': 16, 'at my breaking point': 18,
                        'not in a good headspace': 15, 'bad headspace': 12,
                        'rock bottom': 15, 'at rock bottom': 18, 'so done with everything': 18,
                        'done with everything': 15, 'sad boy hours': 8, 'sad girl era': 8,
                        'not vibing': 6, 'in a dark place': 18,
                        'feel lost': 14, 'feeling lost': 14, 'so lost right now': 14,
                        // ✅ NEW: low self-worth and disconnection phrasing -
                        // these are extremely common real ways people
                        // describe depressive feelings, distinct from the
                        // single-word "worthless"/"hopeless" already covered.
                        'feel like a failure': 16, 'feel like nothing': 15,
                        "don't feel like myself": 14, 'lost interest in everything': 18,
                        "can't find joy in anything": 16, 'feel hollow': 14,
                        'everything feels pointless': 18, "i don't care about anything anymore": 18,
                        'feel disconnected from everyone': 15, 'feel unworthy': 15,
                        'never good enough': 14, 'not good enough': 12,
                        'feel inadequate': 13, 'feel inferior': 13, 'feel incompetent': 12,
                        // ✅ NEW: functional/behavioral depression markers -
                        // these are literally what clinical screening tools
                        // (like the PHQ-9 this app's clinicalScales.js
                        // already references) ask about, in plain language.
                        "can't get out of bed": 20, "don't want to get out of bed": 20,
                        'sleeping all day': 15, "can't sleep at all": 15,
                        'lost my appetite': 15, 'stopped eating': 18,
                        'crying every day': 20, 'cry myself to sleep': 20,
                        'feel like a ghost': 16, 'just going through the motions': 16,
                        'numb to everything': 16, "don't feel anything anymore": 18,
                        'life feels grey': 15, 'everything is grey': 14,
                        'no motivation for anything': 15, "can't function": 18,
                        'barely functioning': 16, 'struggling to get through the day': 16,
                        // ✅ NEW: real gaps found stress-testing the pipeline -
                        // common anhedonia/withdrawal phrasing that scored
                        // ZERO despite being textbook depression disclosures.
                        "don't see the point in getting up": 20, "no point in getting up": 20,
                        "don't see the point anymore": 18,
                        'feels like a waste of time': 16, 'everything feels like a waste': 16,
                        'stopped talking to everyone': 18, "don't have energy for anything": 16,
                        'no energy for anything': 16, 'lost all my energy': 14,
                        // ✅ NEW: current slang for depressive/burnt-out
                        // states. Deliberately excludes ambiguous terms
                        // that are overwhelmingly used for trivial things
                        // in casual speech (e.g. "I'm cooked", "triggered")
                        // - same judgment call already applied to
                        // hyperbolic suicide-adjacent slang above.
                        'living in survival mode': 16, 'survival mode': 12,
                        'running on fumes': 12, 'empty husk': 16,
                        'feel like an empty husk': 18, 'existing not living': 16,
                        'surviving not living': 16, "i'm not okay bestie": 14,
                        'not vibing with life': 14,
                        // ✅ NEW: PHQ-9 concentration/psychomotor domains had
                        // NO coverage at all in this list (see
                        // models/clinicalDomainMapper.js phase 2 work) -
                        // added here too so these phrases move the headline
                        // depression score, not just the PHQ-9 sub-scale.
                        'trouble concentrating': 14, "can't focus on anything": 14,
                        'mind keeps wandering': 10, "can't think straight": 12,
                        'moving in slow motion': 12, 'everything feels like effort': 14,
                        'everything takes so much effort': 14
                    },
                    hi: {
                        'उदास': 20, 'निराश': 20, 'बेकार': 18, 'खाली': 15,
                        'अकेला': 15, 'दुखी': 15, 'उदासी': 15, 'निराशा': 15,
                        'थकान': 10, 'अकेले': 12, 'बेचैन': 10, 'रोना': 10,
                        'आंसू': 8, 'दुख': 12
                    }
                },
                multiplier: 1.0
            },

            // ANXIETY KEYWORDS
            anxiety: {
                keywords: {
                    en: {
                        'anxiety': 20, 'panic': 25, 'fear': 20, 'worried': 15,
                        'nervous': 15, 'overwhelmed': 15, 'racing thoughts': 15,
                        'trembling': 10, 'dread': 15, 'phobia': 15, 'agitated': 15,
                        'stress': 10, 'worry': 12, 'restless': 12, 'tense': 12,
                        'frightened': 12, 'heart racing': 10, 'sweating': 8,
                        // ✅ NEW: modern/informal anxiety phrasing
                        'anxiety is through the roof': 20, 'panic mode': 15,
                        'overstimulated': 10, 'stressed tf out': 14, 'stressed af': 14,
                        "can't handle this rn": 12, 'overwhelmed af': 15,
                        'brain fog': 8, 'spiraling': 15, 'spiraling out of control': 20,
                        'anxious af': 15, 'freaking out': 14, 'losing it': 15,
                        // ✅ NEW: overthinking and social/performance anxiety -
                        // common everyday anxiety phrasing not covered by
                        // the existing panic/racing-thoughts keywords.
                        'overthinking everything': 12, "can't stop overthinking": 14,
                        "mind won't stop racing": 14, 'constantly on edge': 12,
                        'social anxiety': 15, 'performance anxiety': 12,
                        // ✅ NEW: somatic anxiety symptoms and catastrophic
                        // thinking - real, specific ways anxiety actually
                        // presents, not just the word "anxiety" itself.
                        "can't stop worrying": 15, 'worried sick': 16,
                        'stomach in knots': 14, 'shaking with anxiety': 18,
                        'having panic attacks': 22, 'panic attacks': 20,
                        'dread going': 12, 'afraid something bad will happen': 16,
                        'worst case scenario': 10,
                        // ✅ NEW: real gaps found stress-testing the pipeline.
                        // 'heart racing' already existed but only matched as
                        // a literal contiguous substring - "heart WON'T STOP
                        // racing" doesn't contain it, which is exactly the
                        // kind of natural interrupting phrasing real speech
                        // has. Added common variants directly rather than
                        // relying on exact substring matching to bridge them.
                        "heart won't stop racing": 16, "can't breathe properly": 15,
                        "can't catch my breath": 14, 'trouble breathing': 14,
                        'hard to breathe': 14, 'imagining the worst happening': 14,
                        'keep imagining the worst': 14,
                        // ✅ NEW: current rumination/overthinking phrasing.
                        "can't shut my brain off": 14, "brain won't shut off": 14,
                        'intrusive thoughts': 16, "mind won't stop": 12,
                        'nervous system is fried': 14, 'nervous system fried': 14
                    },
                    hi: {
                        'चिंता': 20, 'परेशान': 15, 'घबराहट': 20, 'डर': 15,
                        'बेचैन': 15, 'तनाव': 15, 'भय': 15, 'अभिभूत': 15,
                        'दिल की धड़कन': 10, 'पसीना': 8, 'कंपकंपी': 10
                    }
                },
                multiplier: 1.0
            },

            // SUICIDE KEYWORDS (CRITICAL - Higher weight)
            // ✅ FIX: literal keywords alone missed common real-world phrasing
            // ("killing myself" doesn't contain the literal substring "kill
            // myself", "thinking of ending it all" doesn't contain "end my
            // life", etc). For this category specifically - the one where a
            // false negative is most dangerous - we also scan a set of regex
            // patterns that tolerate tense/phrasing variation. See `patterns`
            // below; matched via _scanCategory(), not plain substring checks.
            suicide: {
                keywords: {
                    en: {
                        'suicide': 35, 'suicidal': 30, 'kill myself': 40, 'end my life': 35,
                        'take my life': 35, 'want to die': 30, 'better off dead': 25,
                        'self-harm': 25, 'self harm': 25, 'death wish': 20, 'give up': 15,
                        'no reason to live': 25, 'tired of living': 15, 'not worth living': 25,
                        'cut myself': 20, 'overdose': 25, 'hang myself': 25,
                        'ending it all': 30, "don't want to live": 30, 'no point in living': 25,
                        // ✅ NEW: genuinely-used modern crisis phrasing.
                        // Deliberately excludes purely hyperbolic slang like
                        // "I'm dead"/"deceased"/"kill me" (near-universally
                        // used non-literally for embarrassment or finding
                        // something funny) - adding those would flood this
                        // category with false positives, which is
                        // especially dangerous here since it erodes trust
                        // in genuine alerts. "Everyone better off without
                        // me" / "I'm a burden" reflect perceived
                        // burdensomeness, a recognized suicide risk marker
                        // in clinical literature (Joiner's interpersonal
                        // theory of suicide), not just informal slang.
                        "i don't want to exist anymore": 35, 'want to disappear forever': 22,
                        'everyone would be better off without me': 32, "everyone's better off without me": 32,
                        "i'm a burden to everyone": 22, "i'm just a burden": 20,
                        "what's the point of living": 25, "what's the point anymore": 18,
                        'what is the point of living': 25,
                        "don't think i'm gonna make it": 30,
                        'no one would notice if i was gone': 28, 'nobody would notice if i disappeared': 28,
                        // ✅ NEW: clinically-recognized suicide warning
                        // signs - giving away possessions and saying
                        // goodbye are well-documented behavioral markers in
                        // suicide prevention literature, not just verbal
                        // expressions. Kept deliberately specific to avoid
                        // the hyperbole-prone language explicitly excluded
                        // earlier in this file (see the header comment
                        // above this category).
                        'giving away my things': 30, 'giving away my belongings': 30,
                        'saying goodbye to everyone': 28, 'wrote a goodbye letter': 32,
                        "i have nothing to live for": 32, 'have a plan to end my life': 40,
                        "won't be here much longer": 25,
                        'done with my life': 35, 'done with life': 32,
                        // ✅ NEW: common, well-documented indirect suicidal-
                        // ideation phrasing that the existing entries missed
                        // entirely - "sleep and never wake up" in particular
                        // is a widely-recognized passive suicidal ideation
                        // marker in clinical screening literature, not just
                        // an unusual turn of phrase.
                        'sleep and never wake up': 32, 'never wake up again': 28,
                        "wish i wouldn't wake up": 30, "hope i don't wake up": 30,
                        'want everything to stop': 28, 'want it all to stop': 28,
                        'i just want it to end': 30, 'just want it all to end': 30,
                        'want the pain to end': 26, 'want the pain to stop': 26,
                        'want it to be over': 24,
                        'nobody would care if i disappeared': 28,
                        'no one would care if i disappeared': 28,
                        'everyone would be happier without me': 30,
                        'everyone happier without me': 28,
                        'everyone better off without me': 30,
                        // ✅ NEW: "unalive" is now the dominant way younger
                        // users describe actual suicidal ideation/self-harm
                        // online - it emerged specifically to evade
                        // platform content moderation on the literal words,
                        // so unlike "I'm dead"/"kill me" (excluded above as
                        // near-universally hyperbolic), its usage skews
                        // heavily toward genuine disclosure. Omitting it
                        // would leave a large, foreseeable blind spot
                        // exactly among the demographic most likely to use
                        // coded language for this. Same tier as
                        // "kill myself"/"want to die".
                        'unalive myself': 40, 'unalive me': 38, 'want to unalive myself': 40,
                        'thinking about unaliving myself': 38, 'gonna unalive myself': 40,
                        'self-deleting': 30, 'self delete': 28, 'deleting myself': 28,
                        // ✅ NEW: other real, current crisis phrasing found
                        // missing - not slang specifically, just common
                        // real-world ways this gets said that weren't
                        // covered yet.
                        "not gonna make it another day": 32, "i'm not gonna make it": 30,
                        "can't see a future for myself": 28, 'no future for me': 26,
                        'signing off for good': 28, 'final goodbye': 30,
                        'world would be better without me': 30,
                        'urge to self harm': 24, 'self harm urges': 24,
                        'wanted to hurt myself': 22
                    },
                    hi: {
                        'आत्महत्या': 35, 'मर जाना': 30, 'जान ले लेना': 30,
                        'मरना चाहता हूँ': 25, 'हार मान लेना': 15, 'खत्म कर देना': 25,
                        'मौत': 15, 'जीने का मन नहीं': 15, 'बेकार': 10,
                        'निराश': 10, 'आत्महत्या कर लूंगा': 35, 'खुद को नुकसान': 25
                    }
                },
                patterns: {
                    en: [
                        { regex: /\bkill(?:s|ing)?\s+myself\b/i, weight: 40 },
                        { regex: /\b(?:want(?:s|ing)?|wanna)\s+to\s+die\b/i, weight: 30 },
                        { regex: /\bend(?:s|ing)?\s+(my\s+life|it\s+all)\b/i, weight: 35 },
                        { regex: /\btak(?:e|es|ing)\s+my\s+(?:own\s+)?life\b/i, weight: 35 },
                        { regex: /\bthink(?:s|ing)?\s+(?:of|about)\s+(?:killing\s+myself|suicide|ending\s+(?:my\s+life|it\s+all))\b/i, weight: 38 },
                        { regex: /\bsuicidal\s+thoughts?\b/i, weight: 35 },
                        { regex: /\bthoughts?\s+of\s+suicide\b/i, weight: 35 },
                        // ✅ FIX: was "don'?t" only, so "do not want to
                        // live" (two words, no contraction) fell through
                        // entirely - the same contraction-vs-two-word gap
                        // fixed elsewhere in this file (apostrophe
                        // stripping), just not yet covered for this
                        // specific pattern.
                        { regex: /\b(?:don'?t|do\s+not|doesn'?t|does\s+not)\s+want\s+to\s+(live|be\s+here|exist)\b/i, weight: 30 },
                        // ✅ FIX: the pattern above only catches negation-
                        // first phrasing ("don't want to live"). It missed
                        // "want NOT to live" (want-first) entirely - a
                        // clear, unambiguous expression of the same thing,
                        // in a word order common among non-native English
                        // speakers, which this app explicitly serves.
                        { regex: /\bwant(?:s|ing|ed)?\s+not\s+to\s+(?:live|be\s+alive|exist)\b/i, weight: 35 },
                        // ✅ FIX: same non-standard word-order gap as the
                        // "want not to live" fix - "not to continue
                        // anymore" is a real, explicit expression of
                        // suicidal intent using different phrasing.
                        // The bare "this" alternative is guarded with a
                        // negative lookahead so it only matches when "this"
                        // ends the clause ("not to continue this[.]") -
                        // otherwise "not to continue this course"/"this
                        // conversation" would false-positive on ordinary,
                        // non-suicidal uses of "continue this <noun>".
                        // "(my/his/her) life" is deliberately NOT guarded
                        // the same way - unlike "this", it's specific
                        // enough on its own ("not to continue my life
                        // anymore and want to end up") that requiring it to
                        // end the clause would reintroduce the exact false
                        // negative this pattern exists to fix.
                        { regex: /\bnot\s+to\s+continue\s+(?:anymore|any\s*longer|living|(?:in\s+)?(?:my|his|her)?\s*life|this\s+(?:anymore|any\s*longer)|this(?!\s+\w))\b/i, weight: 32 },
                        // ✅ FIX: real reported false negative - "I do not
                        // want to continue anymore in my life" has "want
                        // to" inserted between "not" and "continue", which
                        // the two patterns above (requiring "not to
                        // continue" or "don't/doesn't want to
                        // live/be here/exist") both miss entirely. This is
                        // a common, natural phrasing of the same indirect
                        // suicidal disclosure - "not wanting to continue
                        // [living/anymore]" - distinct from "not wanting to
                        // continue [a task/conversation]" by requiring one
                        // of the same life-ending terminal phrases as the
                        // pattern above (same "this" guard, same
                        // unguarded "life" reasoning, see above).
                        // ✅ FIX: this originally only accepted literal
                        // "not" ("do not/does not want to continue..."),
                        // missing the plain contraction "don't want to
                        // continue my life anymore" entirely - arguably
                        // the MORE common everyday phrasing than the
                        // two-word "do not" form it already covered.
                        { regex: /\b(?:not|don'?t|doesn'?t)\s+want(?:s|ing|ed)?\s+to\s+continue\s+(?:anymore|any\s*longer|living|(?:in\s+)?(?:my|his|her)?\s*life|this\s+(?:anymore|any\s*longer)|this(?!\s+\w))\b/i, weight: 32 },
                        { regex: /\bdone\s+with\s+(?:my\s+)?life\b/i, weight: 35 },
                        { regex: /\bno\s+longer\s+want(?:s|ing|ed)?\s+to\s+(?:live|be\s+alive|exist)\b/i, weight: 30 },
                        { regex: /\bwant(?:s|ing|ed)?\s+to\s+stop\s+living\b/i, weight: 30 },
                        { regex: /\bwish\s+i\s+(?:was|were)\s+dead\b/i, weight: 30 },
                        { regex: /\bwish\s+i\s+(?:wasn'?t|weren'?t)\s+alive\b/i, weight: 30 },
                        { regex: /\bno\s+(?:point|reason)\s+(?:in\s+)?living\b/i, weight: 25 },
                        { regex: /\bcut(?:s|ting)?\s+myself\b/i, weight: 20 },
                        { regex: /\bhurt(?:s|ing)?\s+myself\b/i, weight: 18 },
                        { regex: /\bharm(?:s|ing)?\s+myself\b/i, weight: 20 },
                        { regex: /\bhang(?:s|ing)?\s+myself\b/i, weight: 25 },
                        { regex: /\boverdos(?:e|es|ing)\b/i, weight: 25 },
                        { regex: /\bcan'?(?:t|not)\s+(?:go\s+on|do\s+this\s+anymore)\b/i, weight: 20 },
                        { regex: /\bgiv(?:e|es|ing)\s+up\s+on\s+life\b/i, weight: 20 }
                    ],
                    hi: []
                },
                multiplier: 2.0  // Double weight for suicide keywords
            },

            // VULNERABILITY KEYWORDS
            vulnerability: {
                keywords: {
                    en: {
                        'alone': 15, 'lonely': 15, 'isolated': 15, 'unwanted': 10,
                        'abandoned': 15, 'helpless': 15, 'powerless': 15,
                        'vulnerable': 20, 'unsafe': 15, 'insecure': 10,
                        'defenseless': 15, 'exposed': 12, 'fragile': 10,
                        'dependent': 10, 'no one': 12, 'nobody': 12,
                        // ✅ NEW: coercive-control phrasing - real-world
                        // language for the specific controlling behaviors
                        // victims describe, not just the resulting emotion.
                        // Aligned with markers used in standardized DV risk
                        // assessment tools (e.g. the Danger Assessment).
                        'controls my finances': 22, 'controls all the money': 22,
                        "won't let me see my friends": 20, "wont let me see my friends": 20,
                        'cut me off from my family': 22, 'isolated me from my family': 22,
                        "won't let me work": 18, "wont let me work": 18,
                        'takes my paycheck': 18, 'monitors everything i do': 20,
                        'walking on eggshells': 18, "keeps me from leaving": 20,
                        'controls who i talk to': 20, 'checks my phone': 15,
                        'reads my messages': 15,
                        // ✅ NEW: modern phrasing for isolation/vulnerability
                        'no one gets me': 14, 'nobody understands me': 14,
                        "i feel so alone rn": 15, "i'm not built for this": 10,
                        'socially backward': 15, 'socially awkward': 12, 'feel so backward': 12,
                        // ✅ NEW: social exclusion and loneliness phrasing -
                        // real, common ways people describe not belonging
                        // or feeling forgotten, distinct from the more
                        // abstract "isolated"/"lonely" single words already
                        // covered.
                        'feel like an outsider': 15, "don't fit in": 12, "don't belong anywhere": 16,
                        'feel out of place': 12, 'feel invisible': 14, 'feel forgotten': 13,
                        'always left out': 14, 'never included': 13, 'feel excluded': 13,
                        'feel like an outcast': 16, "can't make friends": 13,
                        'feel awkward around people': 13, 'socially inept': 14,
                        'afraid to talk to people': 13, 'afraid of judgment': 12,
                        'feel judged by everyone': 14, 'no one to talk to': 15,
                        'no one checks on me': 14, 'no one cares about me': 16,
                        'feel unloved': 15, 'feel abandoned by everyone': 18,
                        'everyone left me': 15, 'feel forgotten by everyone': 15,
                        'everyone is better than me': 13,
                        // ✅ NEW: feeling trapped and lacking support - a
                        // distinct vulnerability marker from social
                        // exclusion, common in both abuse and general
                        // crisis contexts.
                        'feel trapped': 18, 'no way out': 18, 'stuck with no options': 18,
                        'nowhere to turn': 18, 'no one to help me': 16,
                        'completely alone in this': 16, 'cut off from the world': 16,
                        'no support system': 14, 'no one in my corner': 14,
                        // ✅ NEW: real gaps found stress-testing the pipeline -
                        // economic entrapment ("no money and nowhere to go")
                        // is one of the most well-documented reasons abuse
                        // victims can't leave, and family rejection is a
                        // major real isolation marker - both scored zero.
                        'no money and nowhere to go': 22, 'nowhere to go if i leave': 22,
                        'no money to leave': 20, 'cant afford to leave': 20,
                        'disowned by my family': 18, 'family disowned me': 18,
                        'cut off by my family': 16, 'family cut me off': 16
                    },
                    hi: {
                        'अकेला': 15, 'असहाय': 20, 'बेसहारा': 15, 'बेबस': 15,
                        'लाचार': 15, 'असुरक्षित': 15, 'कमजोर': 10,
                        'निराश्रित': 12, 'अकेले': 12, 'सहारा नहीं': 15
                    }
                },
                multiplier: 1.0
            },

            // INTIMIDATION KEYWORDS
            intimidation: {
                keywords: {
                    en: {
                        'threat': 20, 'intimidate': 20, 'intimidating': 20, 'bully': 15,
                        // ✅ NEW: 'bully' was already here, but its fuzzy-
                        // stemming fallback can't bridge to 'bullied'
                        // (stripping '-ed' gives 'bulli', not 'bully' -
                        // English's y->i spelling change before a suffix).
                        // 'tease'/'mock' are separate words entirely and
                        // weren't covered at all - real gap found via a
                        // school caste-bullying disclosure that scored zero.
                        'bullied': 15, 'bullying': 15, 'tease': 14, 'teased': 14,
                        'teasing': 14, 'mock': 12, 'mocked': 14, 'mocking': 14,
                        'made fun of me': 15,
                        'coerce': 15, 'coercing': 15, 'danger': 15, 'threatening': 20,
                        'menace': 15, 'stalking': 20, 'harass': 15, 'frighten': 12,
                        'horrify': 15, 'horrified': 15, 'horrifying': 15, 'terrorize': 20,
                        'terrorizing': 20, 'warning': 10, 'scare': 12, 'scaring': 12,
                        'pressure': 10, 'force': 10,
                        // ✅ NEW: concrete real-world threat/control phrases,
                        // as opposed to single abstract words. These are how
                        // people actually describe escalating danger.
                        'raised his hand at me': 25, 'raised her hand at me': 25,
                        'grabbed me by the throat': 30, 'threatened to take the kids': 25,
                        'threatened to take my children': 25, 'punched a hole in the wall': 22,
                        'tracks my location': 18, 'follows me everywhere': 20,
                        'shows up unannounced': 15, "threatened to kill me": 30,
                        'threatened to hurt me': 25, 'said he would find me': 20,
                        // ✅ NEW: modern relationship/harassment vocabulary -
                        // terms like "toxic", "gaslighting", and "love
                        // bombing" are now the everyday way people describe
                        // controlling and predatory behavior, not clinical
                        // or legal terminology.
                        'toxic relationship': 15, "he's so toxic": 15, "she's so toxic": 15,
                        'gaslighting me': 22, 'gaslit me': 22, 'love bombing': 15,
                        "he won't leave me alone": 20, "she won't leave me alone": 20,
                        "he's obsessed with me": 18, 'stalking my socials': 18,
                        'stalking my social media': 18, 'creepy vibes': 10,
                        'predatory behavior': 22, "he's controlling af": 18,
                        "he's so controlling": 18, 'red flags': 10,
                        'sliding into my dms after i said no': 18,
                        // ✅ NEW: digital harassment and coercive threats -
                        // stalking behavior and blackmail patterns common
                        // in both online harassment and abusive
                        // relationships.
                        "he keeps calling me": 15, "won't stop texting me": 18,
                        'showed up at my house': 22, 'waiting outside my work': 20,
                        'following my car': 22, 'sent me threatening messages': 25,
                        'posted my address online': 25, 'doxxed me': 22,
                        'threatened my job': 18, 'threatened to fire me': 20,
                        'blackmailing me': 25, 'using photos against me': 25,
                        'threatened to hurt my pet': 20,
                        // ✅ NEW: real gaps found stress-testing the
                        // pipeline. "knows where my parents live" is a
                        // textbook veiled threat (implying ability to harm
                        // family without saying so directly) and scored
                        // zero; same for a landlord's retaliatory-eviction
                        // threat against someone reporting to police.
                        'knows where my parents live': 25, 'knows where my family lives': 25,
                        'knows where i live': 22, 'threatened to throw us out': 20,
                        'threatened to evict us': 20, 'throw us out': 18, 'throw me out': 16
                    },
                    hi: {
                        'धमकी': 20, 'डराना': 15, 'बदमाशी': 15, 'जबरदस्ती': 15,
                        'दबाव': 10, 'खतरा': 15, 'चेतावनी': 10, 'आतंकित': 15,
                        'धमकाना': 15, 'भयभीत': 12, 'तंग करना': 12
                    }
                },
                multiplier: 1.0
            },

            // ============================================================
            //  ✅ NEW: DSM-5 PTSD SYMPTOM-CLUSTER KEYWORDS
            //  dissociation/hyperarousal/avoidance have existed as fields
            //  throughout the scoring pipeline (hybridAI.js's scores object,
            //  clinicalScales.js, the authority dashboard's indicator grid)
            //  but NOTHING ever populated them - they were structurally
            //  present but always exactly 0, regardless of what the person
            //  described. This gives them real signal, grounded in the
            //  actual DSM-5 PTSD criteria clusters (not just an undifferen-
            //  tiated "trauma" bucket): intrusion (existing trauma category),
            //  avoidance (Criterion C), negative alterations in cognition/
            //  mood including dissociative symptoms (Criterion D), and
            //  alterations in arousal/reactivity (Criterion E). See
            //  humanIntelligence.js for how these are used together for a
            //  cross-cluster clinical pattern check, not just summed.
            // ============================================================
            dissociation: {
                keywords: {
                    en: {
                        'felt like i was watching myself': 25, 'like i was watching myself': 25,
                        'out of my body': 22, 'outside my body': 22,
                        'like it wasn\'t real': 20, "like it wasn't happening to me": 22,
                        'disconnected from my body': 22, 'everything feels unreal': 20,
                        'like i was floating': 20, 'not myself': 15, 'feel disconnected': 15,
                        'zoned out': 12, 'blank spells': 15, "can't remember parts of it": 18,
                        'lost time': 15, 'felt like a dream': 15, 'detached': 12,
                        'like watching a movie': 18,
                        // ✅ NEW: real gap found stress-testing the pipeline -
                        // "black out" during a violent incident is a
                        // real, common dissociative memory-gap marker,
                        // distinct from the existing "lost time"/"can't
                        // remember parts of it". Kept to the two-word
                        // phrase (not bare "blackout") since that single
                        // compound word much more often means a power
                        // outage in ordinary speech.
                        'black out': 20, 'blacked out': 20,
                        "don't remember what happened": 16
                    },
                    hi: {
                        'खुद से अलग': 18, 'सपना जैसा': 15, 'असत्य जैसा': 15
                    }
                },
                multiplier: 1.0
            },
            hyperarousal: {
                keywords: {
                    en: {
                        'always on edge': 20, 'on high alert': 20, 'jumpy': 15,
                        'startled easily': 18, 'easily startled': 18, "can't sleep": 15,
                        'cant sleep': 15, 'trouble sleeping': 15, "can't concentrate": 15,
                        'cant concentrate': 15, 'hypervigilant': 20, 'constantly checking': 15,
                        'jump at every sound': 20, 'can\'t relax': 15, 'irritable': 12,
                        'on guard': 15, 'watching my back': 18, 'heart races': 15,
                        'racing heart': 15, 'can\'t let my guard down': 20,
                        // ✅ NEW: real gap found stress-testing the pipeline -
                        // a vivid, commonly-used real idiom for
                        // hypervigilance that scored zero.
                        'sleep with one eye open': 20, 'always listening for the door': 16,
                        'listening for footsteps': 14,
                        // ✅ NEW: GAD-7 irritability domain had no coverage
                        // beyond the single word 'irritable' (see
                        // models/clinicalDomainMapper.js phase 2 work).
                        'snapping at everyone': 14, 'on edge with everyone': 12,
                        'easily annoyed': 12, 'short temper lately': 12,
                        "can't sit still": 10,
                        // ✅ NEW: PCL-5's reckless/self-destructive behavior
                        // item (see models/clinicalDomainMapper.js phase 4
                        // work) had no coverage anywhere.
                        'taking risks i never used to': 16, 'being reckless lately': 14
                    },
                    hi: {
                        'हमेशा सतर्क': 18, 'नींद नहीं आती': 15, 'चौंक जाता हूं': 15
                    }
                },
                multiplier: 1.0
            },
            avoidance: {
                keywords: {
                    en: {
                        "won't go back there": 20, "wont go back there": 20,
                        'avoid thinking about it': 18, "can't talk about it": 18,
                        "cant talk about it": 18, 'stopped going': 15, 'stay away from': 12,
                        "won't talk about it": 18, "wont talk about it": 18,
                        'avoid anything that reminds me': 22, 'try not to think about it': 15,
                        'stopped doing things i used to enjoy': 18, 'quit my job to avoid': 20,
                        'moved to avoid': 18, 'changed my route': 15, "can't watch": 12,
                        'avoid being alone with': 18,
                        // ✅ NEW: real gap found stress-testing the pipeline -
                        // "quit my job to avoid" already existed but didn't
                        // match the equally common "quit my job because I
                        // couldn't be near him" phrasing.
                        "couldn't be in the same room as him": 18,
                        "couldn't be in the same room as her": 18,
                        "couldn't be in the same building as him": 18,
                        "couldn't be in the same building as her": 18,
                        "can't be around him": 16, "can't be around her": 16,
                        'avoid being in the same room': 16
                    },
                    hi: {
                        'वहां नहीं जाता': 15, 'बात नहीं करना चाहता': 15
                    }
                },
                multiplier: 1.0
            },

            // ✅ NEW: models/expertSystem.js's clinical rules (PTSD,
            // depression, anxiety, suicide) reference these six DSM-5
            // symptom names directly as condition keys - 'flashbacks',
            // 'anhedonia', 'fatigue', 'panic', 'hopelessness',
            // 'worthlessness' - but nothing upstream ever produced a
            // `scores.<name>` for any of them. The literal words
            // ('flashback', 'hopeless', 'worthless', 'anhedonia',
            // 'fatigue', 'panic') were already being matched, but only
            // buried inside trauma/depression/anxiety's blended totals -
            // expertSystem.js's `scores[condition]` lookup came back
            // `undefined` for all six, so those conditions could never be
            // measured, capping every rule's real confidence regardless of
            // how strong the underlying signal was (see the "✅ FIX"
            // comment in expertSystem.js). Giving each its own small,
            // independently-scored category - deliberately overlapping
            // with trauma/depression/anxiety's existing words, the same
            // established pattern already used elsewhere in this file
            // (e.g. "tease"/"teased" scored under both intimidation here
            // and caste-based discrimination in scstTrainer.js) - closes
            // that gap without changing how the parent categories score.
            flashbacks: {
                keywords: {
                    en: {
                        'flashback': 25, 'flashbacks': 25, 'reliving it': 22,
                        'relive it': 20, "feels like it's happening again": 24,
                        "like it's happening all over again": 24,
                        'intrusive memories': 22, "can't stop thinking about it": 18,
                        'keeps replaying in my head': 20, 'keeps coming back to me': 16,
                        'see it happening in my head': 20, 'still see it': 16
                    },
                    hi: {
                        'फ्लैशबैक': 20, 'फिर से जी रहा हूं': 18
                    }
                },
                multiplier: 1.0
            },
            anhedonia: {
                keywords: {
                    en: {
                        'anhedonia': 20, 'lost interest in everything': 22,
                        "don't enjoy anything anymore": 22, "can't find joy in anything": 20,
                        'nothing feels enjoyable anymore': 22,
                        'stopped enjoying things i used to love': 20,
                        'nothing excites me anymore': 18, "don't feel happy about anything": 16
                    },
                    hi: {
                        'किसी चीज़ में मन नहीं लगता': 18, 'खुशी महसूस नहीं होती': 16
                    }
                },
                multiplier: 1.0
            },
            fatigue: {
                keywords: {
                    en: {
                        'fatigue': 15, 'exhausted': 15, 'exhausted all the time': 20,
                        'no energy': 16, 'constantly tired': 16, 'drained all the time': 18,
                        'tired all the time': 16, "can't get out of bed": 18,
                        'so tired of everything': 14
                    },
                    hi: {
                        'हमेशा थका हुआ': 16, 'थकान महसूस होती है': 14
                    }
                },
                multiplier: 1.0
            },
            panic: {
                keywords: {
                    en: {
                        'panic attack': 25, 'panic attacks': 25, 'having a panic attack': 25,
                        'having panic attacks': 25, "feel like i'm going to die": 22,
                        "heart pounding and can't breathe": 20, 'chest tightening': 16,
                        'panicking': 15, 'panic mode': 14
                    },
                    hi: {
                        'पैनिक अटैक': 22, 'घबराहट का दौरा': 20
                    }
                },
                multiplier: 1.0
            },
            hopelessness: {
                keywords: {
                    en: {
                        'hopeless': 20, 'no hope': 18, 'no hope left': 20,
                        'nothing will ever change': 18, 'it will never get better': 18,
                        'things will never get better': 18, 'feel completely hopeless': 22,
                        "there's no hope for me": 20, "i've lost all hope": 20
                    },
                    hi: {
                        'कोई उम्मीद नहीं': 18, 'निराशा महसूस होती है': 15
                    }
                },
                multiplier: 1.0
            },
            worthlessness: {
                keywords: {
                    en: {
                        'worthless': 20, 'feel worthless': 22, "i'm worthless": 22,
                        'feel like nothing': 16, "i'm nothing": 14, "i don't matter": 16,
                        'i mean nothing': 16, 'feel like a failure': 15,
                        'not good enough': 14, 'feel inadequate': 14
                    },
                    hi: {
                        'बेकार महसूस होता हूं': 18, 'खुद को बेकार समझता हूं': 18
                    }
                },
                multiplier: 1.0
            },

            // humanIntelligence.js has a protective-factor reduction to
            // clinical distress scores, but it was checking for score keys
            // ('social_support', 'coping_skills', etc.) that nothing
            // upstream ever produced - so the reduction was always 0,
            // silently dead since it was written. This category gives it a
            // real signal: language indicating the person has support,
            // coping resources, or is actively seeking/engaged in help.
            // Same negation handling as every other category applies
            // automatically - "I have no one to talk to" will NOT score as
            // protective, since "no" negates "talk to" nearby.
            // NOTE: this is separate from, and must never substitute for,
            // the SC/ST severity floor in scstTrainer.js - caste-based
            // vulnerability is never reduced by a victim's coping ability.
            protective: {
                keywords: {
                    en: {
                        'support': 10, 'supportive': 10, 'counseling': 12, 'counselor': 10,
                        'therapy': 12, 'therapist': 10, 'coping': 12, 'resilient': 12,
                        'resilience': 12, 'strong': 8, 'getting better': 10,
                        'sought help': 15, 'seeking help': 15, 'got help': 12,
                        'talked to someone': 12, 'talking to someone': 12,
                        'family support': 15, 'friends help': 12, 'trust my': 8,
                        'safe now': 15, 'feel safe': 12, 'able to cope': 12,
                        'reached out': 10, 'in therapy': 12, 'support group': 12
                    },
                    hi: {
                        'सहायता': 10, 'सहारा': 10, 'परामर्श': 12, 'मजबूत': 8,
                        'सुरक्षित': 12, 'मदद मिली': 12, 'बेहतर महसूस': 10
                    }
                },
                multiplier: 1.0
            }
        };
    }

    // ================================================================
    //  WORD-BOUNDARY-SAFE MATCHING
    //  Plain .includes() caused false positives like 'no' matching inside
    //  'nobody', or 'so' matching inside unrelated words, which incorrectly
    //  flagged negation/intensifiers and suppressed real severity scores.
    //  Uses Unicode letter/number checks so it also works for Hindi text.
    //  Also tolerates common inflectional suffixes (hurt -> hurting/hurts,
    //  threat -> threatened, harass -> harassed/harassing) so single-root
    //  keywords still match their everyday inflected forms, without
    //  reopening the 'no' inside 'nobody' style false positive (the suffix
    //  list only contains genuine grammatical endings, not arbitrary text).
    // ================================================================
    _isLetterOrDigit(ch) {
        return !!ch && /[\p{L}\p{N}]/u.test(ch);
    }

    // ✅ FIX: keywords/negations written with an apostrophe ("what's the
    // point of living", "won't let me work", "wasn't") never matched real
    // user text typed without one ("whats the point of living anymore") -
    // extremely common on mobile keyboards, and especially dangerous here
    // since it silently dropped otherwise-clear suicidal-ideation phrasing
    // to a 0% score. Stripping apostrophes from both sides before matching
    // (see analyze()'s textLower and _findWholeMatches below) makes
    // apostrophe presence/absence a non-issue everywhere in this file.
    _stripApostrophes(s) {
        return s.replace(/['’‘]/g, '');
    }

    _hasInflectionalSuffix(text, fromIndex) {
        const suffixes = ['ing', 'ened', 'ening', 'ment', 'ness', 'fully',
            'ful', 'ers', 'er', 'ed', 'es', 'en', 's', 'd'];
        for (const suf of suffixes) {
            if (text.startsWith(suf, fromIndex)) {
                const afterSuf = fromIndex + suf.length;
                const afterSufChar = afterSuf < text.length ? text[afterSuf] : '';
                if (!this._isLetterOrDigit(afterSufChar)) return true;
            }
        }
        return false;
    }

    _findWholeMatches(text, phrase) {
        const indices = [];
        if (!phrase) return indices;
        // `text` is expected to already be apostrophe-stripped (analyze()
        // normalizes it once up front); `phrase` is a literal keyword/
        // negation/intensifier string that may still contain one, so it's
        // normalized here at the single point of comparison.
        phrase = this._stripApostrophes(phrase);
        if (!phrase) return indices;
        let fromIndex = 0;
        while (true) {
            const pos = text.indexOf(phrase, fromIndex);
            if (pos === -1) break;
            const before = pos > 0 ? text[pos - 1] : '';
            const afterStart = pos + phrase.length;
            const after = afterStart < text.length ? text[afterStart] : '';
            const leftOk = !this._isLetterOrDigit(before);
            const rightOk = !this._isLetterOrDigit(after) || this._hasInflectionalSuffix(text, afterStart);
            if (leftOk && rightOk) {
                indices.push(pos);
            }
            fromIndex = pos + 1;
        }
        return indices;
    }

    _containsWord(text, phrase) {
        return this._findWholeMatches(text, phrase).length > 0;
    }

    // ================================================================
    //  FUZZY / "SIMILAR WORD" MATCHING
    //  Exact substring + suffix-list matching (above) misses: (a) typos
    //  ("harrassed", "assualt"), (b) morphological variants the suffix
    //  list doesn't cover (prefixes like "unwanted", irregular forms like
    //  "beaten"), and (c) close paraphrases of a single-word keyword.
    //  This tokenizes the text once and checks each token's edit distance
    //  to the keyword. Only applied to SINGLE-WORD keywords - fuzzy
    //  matching multi-word phrases is unreliable and would explode false
    //  positives, so phrases still require the exact word-boundary match
    //  above (or an explicit synonym entry in keywordDB).
    //  Threshold scales with word length so short/common words (<=4 chars,
    //  e.g. "sad", "hurt") stay exact-only and can't fuzzy-collide with
    //  unrelated short words.
    // ================================================================
    _levenshtein(a, b) {
        const m = a.length, n = b.length;
        if (m === 0) return n;
        if (n === 0) return m;
        let prevRow = Array.from({ length: n + 1 }, (_, i) => i);
        for (let i = 1; i <= m; i++) {
            const currRow = [i];
            for (let j = 1; j <= n; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                currRow[j] = Math.min(
                    currRow[j - 1] + 1,
                    prevRow[j] + 1,
                    prevRow[j - 1] + cost
                );
            }
            prevRow = currRow;
        }
        return prevRow[n];
    }

    // ✅ FIX: distance-2 was too loose at length 7-8 - e.g. "shaking" and
    // "stalking" are both real, unrelated words only 2 edits apart, so an
    // 8-letter threshold of 2 produced a false "stalking" match on plain
    // "shaking". Distance-2 is now reserved for genuinely long words
    // (>=10 letters), where two edits are far less likely to land on a
    // different real word by coincidence.
    _fuzzyThreshold(len) {
        // ✅ FIX: was `len <= 4 -> 0`, which still allowed fuzzy matching
        // on 5-6 letter keywords. That's exactly how "dead" (used
        // constantly in ordinary/hyperbolic speech - "I'm dead" for
        // laughing, dead tired, dead serious) ended up fuzzy-matching the
        // keyword "dread" (edit distance 1, same first letter, so it
        // passed the existing guard) and produced a false anxiety signal
        // on a text that was just someone finding a meme funny. Raising
        // the exact-only cutoff trades away typo tolerance for some
        // medium-length keywords in exchange for closing this risk -
        // worthwhile given how much more costly a false positive is here
        // than a missed typo.
        if (len <= 6) return 0;   // exact-only for short/medium words
        if (len <= 9) return 1;
        return 2;
    }

    _tokenize(text) {
        return text.match(/[\p{L}\p{N}']+/gu) || [];
    }

    // Strips common inflectional endings so a typo *plus* a suffix
    // ("asaulted" = "assault" misspelled + "-ed") doesn't compound into an
    // edit distance too large to match. Returns the token itself plus any
    // stripped variants, so both are tried against the keyword.
    _stemVariants(token) {
        const variants = [token];
        const suffixes = ['ing', 'ened', 'ment', 'fully', 'ful', 'ers', 'er', 'ed', 'es', 'en', 's', 'd'];
        for (const suf of suffixes) {
            if (token.length > suf.length + 2 && token.endsWith(suf)) {
                variants.push(token.slice(0, -suf.length));
            }
        }
        return variants;
    }

    // Returns the matching token if a fuzzy hit is found, else null.
    // Skips single-word keywords that are already exact-matched by the
    // caller, so this only fires for genuinely near-miss spellings/forms.
    _fuzzyFindKeyword(tokens, keyword) {
        if (keyword.includes(' ')) return null; // phrases: exact-match only
        const threshold = this._fuzzyThreshold(keyword.length);
        if (threshold === 0) return null;
        for (const token of tokens) {
            if (token === keyword) continue;
            for (const variant of this._stemVariants(token)) {
                if (Math.abs(variant.length - keyword.length) > threshold) continue;
                // ✅ FIX: require the same first letter before accepting a
                // fuzzy match. Without this, stripping a suffix from a
                // totally unrelated word can coincidentally land within
                // edit distance of a short keyword - e.g. 'weather' ->
                // strip 'er' -> 'weath' sits at edit distance 1 from
                // 'death', which scored a neutral sentence about the
                // weather as containing a trauma-category "death" match.
                // Real typos/inflections ('asaulted' vs 'assault') almost
                // always preserve the first character.
                if (variant[0] !== keyword[0]) continue;
                if (this._levenshtein(variant, keyword) <= threshold) return token;
            }
        }
        return null;
    }

    // ================================================================
    //  LANGUAGE DETECTION
    // ================================================================
    detectLanguage(text) {
        const patterns = {
            hi: /[\u0900-\u097F]/,
            bn: /[\u0980-\u09FF]/,
            pa: /[\u0A00-\u0A7F]/,
            gu: /[\u0A80-\u0AFF]/,
            or: /[\u0B00-\u0B7F]/,
            ta: /[\u0B80-\u0BFF]/,
            te: /[\u0C00-\u0C7F]/,
            kn: /[\u0C80-\u0CFF]/,
            ml: /[\u0D00-\u0D7F]/,
            ur: /[\u0600-\u06FF]/
        };
        for (const [lang, pattern] of Object.entries(patterns)) {
            if (pattern.test(text)) return lang;
        }
        return 'en';
    }

    // ================================================================
    //  MAIN ANALYSIS FUNCTION
    // ================================================================
    analyze(text, lang = null) {
        // ✅ FIX: Check if text is valid
        if (!text || text.trim().length < 2) {
            return this._emptyAnalysis();
        }

        const detectedLang = lang || this.detectLanguage(text);
        // Apostrophes stripped once here so every downstream comparison
        // (keywords, negations, intensifiers, regex patterns) is
        // apostrophe-insensitive - see _stripApostrophes()/_findWholeMatches().
        const textLower = this._stripApostrophes(text.toLowerCase());

        // ✅ FIX: Log the text being analyzed
        console.log('📝 Analyzing text:', text.substring(0, 100) + '...');

        // Detect intensifiers and negations
        const intensifiers = this.intensifiers[detectedLang] || this.intensifiers.en;
        const negations = this.negations[detectedLang] || this.negations.en;

        // Tokenized once and reused by fuzzy matching below, instead of
        // re-splitting the text for every keyword checked.
        const textTokens = this._tokenize(textLower);

        const hasIntensifier = intensifiers.some(i => this._containsWord(textLower, i));
        const hasNegation = negations.some(n => this._containsWord(textLower, n));
        const intensifierCount = intensifiers.filter(i => this._containsWord(textLower, i)).length;
        const negationCount = negations.filter(n => this._containsWord(textLower, n)).length;

        // ✅ FIX: Log detection results
        console.log(`🔍 Intensifier: ${hasIntensifier}, Negation: ${hasNegation}`);

        // Calculate scores for each category
        const scores = {};
        const rawScores = {};
        const matches = {};

        for (const [category, categoryData] of Object.entries(this.keywordDB)) {
            const keywords = categoryData.keywords[detectedLang] || categoryData.keywords.en || {};
            const patterns = (categoryData.patterns && (categoryData.patterns[detectedLang] || categoryData.patterns.en)) || [];
            const multiplier = categoryData.multiplier || 1.0;

            let totalWeight = 0;
            let matchedKeywords = [];

            for (const [keyword, weight] of Object.entries(keywords)) {
                const exactHit = this._containsWord(textLower, keyword);
                // ✅ FIX: previously a keyword not found verbatim contributed
                // nothing at all, even when the text contained an obvious
                // misspelling or near-variant of it ("harrassed", "asaulted").
                // On long, freely-written paragraphs this was the main cause
                // of under-detection: one missed spelling meant zero signal
                // for that keyword, no matter how much of the surrounding
                // text described the same thing. Fuzzy hits count at a
                // reduced weight (0.75x) since they're a lower-confidence
                // match than an exact one.
                const fuzzyToken = !exactHit ? this._fuzzyFindKeyword(textTokens, keyword) : null;

                if (exactHit || fuzzyToken) {
                    matchedKeywords.push(exactHit ? keyword : `${keyword}~${fuzzyToken}`);
                    const effectiveWeight = exactHit ? weight : weight * 0.75;
                    totalWeight += effectiveWeight;

                    if (hasIntensifier && !hasNegation) {
                        totalWeight += effectiveWeight * 0.3;
                    }

                    if (hasNegation && this._isNegated(keyword, textLower, negations)) {
                        totalWeight -= effectiveWeight * 0.5;
                    }
                }
            }

            // ✅ FIX: literal substrings alone miss ordinary phrasing/tense
            // variation (see suicide category note above). Regex patterns
            // catch those without needing to hand-enumerate every conjugation.
            for (const { regex, weight } of patterns) {
                const match = textLower.match(regex);
                if (match) {
                    matchedKeywords.push(match[0]);
                    totalWeight += weight;

                    if (hasIntensifier && !hasNegation) {
                        totalWeight += weight * 0.3;
                    }

                    if (hasNegation) {
                        const pos = match.index || 0;
                        const beforeText = textLower.substring(Math.max(0, pos - 100), pos);
                        if (negations.some(n => this._containsWord(beforeText, n))) {
                            totalWeight -= weight * 0.5;
                        }
                    }
                }
            }

            // ✅ FIX: Normalize against the severity of the keywords actually in
            // this category, not the sum of every keyword's weight in the whole
            // category. The old denominator (sum of ~15-20 weights) meant a text
            // would basically have to match nearly every keyword to score above
            // single digits - so a single severe keyword like "kill myself" (40)
            // scored ~7%, indistinguishable from a text with no signal at all.
            // A severity cap based on the single most severe keyword in the
            // category means one strong match already registers as serious,
            // and multiple matches (below) push it toward Critical.
            let score = 0;
            if (matchedKeywords.length > 0) {
                const patternWeights = patterns.map(p => p.weight);
                const maxWeight = Math.max(...Object.values(keywords), ...patternWeights, 1);
                const severityCap = maxWeight * 1.3;
                score = Math.min((totalWeight / severityCap) * 100 * multiplier, 100);

                // Boost if multiple keywords found
                if (matchedKeywords.length > 2) {
                    score = Math.min(score * 1.2, 100);
                }

                // Apply intensifier boost
                if (hasIntensifier && !hasNegation && score > 0) {
                    score = Math.min(score * (1 + intensifierCount * 0.1), 100);
                }

                // Apply negation penalty
                if (hasNegation && score > 0) {
                    score = Math.max(score * (1 - negationCount * 0.15), 0);
                }
            }

            scores[category] = Math.round(score) / 100;
            rawScores[category] = Math.round(score);
            matches[category] = matchedKeywords;

            // ✅ FIX: Log the score for debugging
            if (matchedKeywords.length > 0) {
                console.log(`   ${category}: ${Math.round(score)}% (${matchedKeywords.length} keywords)`);
            }
        }

        // ✅ FIX: Calculate derived scores
        const stress = (scores.trauma + scores.depression + scores.anxiety) / 3;

        // ✅ FIX: If no scores were found, use a small baseline
        const allScores = {
            trauma: scores.trauma || 0,
            depression: scores.depression || 0,
            anxiety: scores.anxiety || 0,
            suicidal_ideation: scores.suicide || 0,
            vulnerability: scores.vulnerability || 0,
            intimidation: scores.intimidation || 0,
            stress: stress || 0,
            fear: (scores.anxiety || 0) * 0.8 || 0,
            social_isolation: (scores.vulnerability || 0) * 0.7 || 0,
            // ✅ NEW: these three DSM-5 symptom-cluster categories were
            // calculated correctly by the scan above (visible in the debug
            // log) but silently dropped here - this whitelist never
            // included them, so they were always 0 downstream no matter
            // what the person described.
            dissociation: scores.dissociation || 0,
            hyperarousal: scores.hyperarousal || 0,
            avoidance: scores.avoidance || 0,
            // ✅ NEW: feeds humanIntelligence.js's protective-factor
            // reduction, which was previously always inert (see note above
            // the `protective` keyword category).
            protective_factors: scores.protective || 0,
            // ✅ NEW: closes the expertSystem.js measurability gap - see
            // the comment above the six keyword categories defined earlier
            // in this file (flashbacks, anhedonia, fatigue, panic,
            // hopelessness, worthlessness).
            flashbacks: scores.flashbacks || 0,
            anhedonia: scores.anhedonia || 0,
            fatigue: scores.fatigue || 0,
            panic: scores.panic || 0,
            hopelessness: scores.hopelessness || 0,
            worthlessness: scores.worthlessness || 0
        };

        // ✅ FIX: Generate summary based on actual scores
        const summary = this._generateSummary(allScores);

        return {
            scores: allScores,
            rawScores: rawScores,
            matches: matches,
            language: detectedLang,
            wordCount: text.split(/\s+/).length,
            charCount: text.length,
            hasIntensifier: hasIntensifier,
            hasNegation: hasNegation,
            summary: summary
        };
    }

    _isNegated(keyword, text, negations) {
        const matches = this._findWholeMatches(text, keyword);
        if (matches.length === 0) return false;
        const pos = matches[0];
        const beforeText = text.substring(Math.max(0, pos - 100), pos);
        return negations.some(n => this._containsWord(beforeText, n));
    }

    _generateSummary(scores) {
        const high = [];
        const moderate = [];
        const labels = {
            trauma: 'Trauma',
            depression: 'Depression',
            anxiety: 'Anxiety',
            suicidal_ideation: 'Suicide Risk',
            vulnerability: 'Vulnerability',
            intimidation: 'Intimidation'
        };

        for (const [key, value] of Object.entries(scores)) {
            if (key in labels && value > 0.05) {
                if (value > 0.6) {
                    high.push(`${labels[key]} (${Math.round(value * 100)}%)`);
                } else if (value > 0.3) {
                    moderate.push(`${labels[key]} (${Math.round(value * 100)}%)`);
                }
            }
        }

        let summary = 'Analysis complete. ';
        if (high.length > 0) {
            summary += `⚠️ High distress: ${high.join(', ')}. `;
        } else if (moderate.length > 0) {
            summary += `📋 Moderate distress: ${moderate.join(', ')}. `;
        } else {
            summary += '✅ No significant distress detected. ';
        }
        return summary;
    }

    _emptyAnalysis() {
        const neutralScores = {
            trauma: 0,
            depression: 0,
            anxiety: 0,
            suicidal_ideation: 0,
            vulnerability: 0,
            intimidation: 0,
            stress: 0,
            fear: 0,
            social_isolation: 0,
            dissociation: 0,
            hyperarousal: 0,
            avoidance: 0,
            protective_factors: 0,
            flashbacks: 0,
            anhedonia: 0,
            fatigue: 0,
            panic: 0,
            hopelessness: 0,
            worthlessness: 0
        };
        return {
            scores: neutralScores,
            rawScores: {},
            matches: {},
            language: 'en',
            wordCount: 0,
            charCount: 0,
            hasIntensifier: false,
            hasNegation: false,
            summary: 'No text provided for analysis.'
        };
    }
}

export default TextAnalyzer;
