// ================================================================
//  SC/ST TRAINER - Case-Sensitive Training Engine
//  Trained on real atrocity cases (2020-2025)
// ================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SCSTTrainer {
    constructor() {
        this.cases = [];
        this.keywordModel = {};
        this.patternModel = {};
        this.severityModel = {};

        this.communityKeywords = {
            'dalit': ['dalit', 'sc', 'scheduled caste', 'untouchable', 'harijan'],
            'tribal': ['tribal', 'adivasi', 'st', 'scheduled tribe', 'lambada', 'koli', 'gond']
        };

        // ============================================================
        //  ✅ ACCURACY FIX: police_brutality previously fired on the bare
        //  word "police" - including when a VICTIM said "I went to the
        //  police" or "I filed a police complaint" (i.e. seeking help).
        //  It now requires a phrase where police are the ones inflicting
        //  harm, not just present in the sentence.
        // ============================================================
        this.abusePatterns = {
            'gang_rape': {
                keywords: ['gang rape', 'raped', 'drugged', 'kidnapped', 'gang-raped',
                    // ✅ NEW (keyword expansion): the original list required
                    // either "gang rape" as a phrase or the bare verb
                    // "raped" - real disclosures and case documents very
                    // often use these equally common alternate phrasings.
                    'sexually assaulted', 'raped her', 'raped him', 'sexually violated',
                    'brutally raped', 'multiple men raped', 'attempted rape', 'tried to rape',
                    'attempt to rape', 'rape attempt', 'abducted and raped', 'sexual assault'],
                severity: 100,
                description: 'Gang rape of SC/ST victim'
            },
            'child_abuse': {
                keywords: ['14-year-old', '16-year-old', 'minor girl', 'minor boy',
                    'pocso', 'child victim', 'underage',
                    // ✅ NEW: distinct child-specific phrasing, not just an
                    // age number - a case document naming "the minor" or
                    // "the child victim" without repeating the exact age
                    // every time was previously missed.
                    'raped the minor', 'raped the child', 'sexually abused the child',
                    'sexually abused the minor', 'abused the child', 'child sexual abuse',
                    'minor victim', 'school-going girl'],
                severity: 100,
                description: 'Child sexual abuse of SC/ST minor'
            },
            'sexual_abuse_indirect': {
                keywords: ['touched me inappropriately', 'touched inappropriately',
                    'inappropriate touch', 'unwanted advances', 'forced himself',
                    'forced herself', 'forced me', 'against my will', "didn't want it",
                    'did not want it', 'made me uncomfortable', 'took advantage of me',
                    // ✅ FIX: 'molestation' (the noun form) scored no signal
                    // at all - same gap as textAnalyzer.js's trauma
                    // category, fixed the same way (explicit entries, not
                    // relying on fuzzy/stemming across "-ation").
                    'molested', 'molestation', 'molesting', 'molests', 'groped',
                    // ✅ FIX: every phrase above was written for FIRST-PERSON
                    // victim disclosure ("touched ME inappropriately", "forced
                    // ME", "against MY will") - real gap found building the
                    // Lawyer tab's case-document summarizer (caseSummarizer.js),
                    // which runs this SAME engine against THIRD-PERSON legal
                    // narration ("the accused touched HER inappropriately",
                    // an FIR/chargesheet/judgment's normal voice). The
                    // inserted pronoun breaks the original phrase-as-substring
                    // match entirely - "touched her inappropriately" does not
                    // contain the substring "touched inappropriately". Third-
                    // person equivalents added so case documents get the same
                    // detection victim self-disclosure already had.
                    'touched her inappropriately', 'touched him inappropriately',
                    'against her will', 'against his will',
                    "she didn't want it", "he didn't want it",
                    'she did not want it', 'he did not want it',
                    'made her uncomfortable', 'made him uncomfortable',
                    'took advantage of her', 'took advantage of him',
                    // ✅ NEW (keyword expansion): additional common real-
                    // world and legal-document phrasings for indirect/
                    // attempted sexual abuse - "outraging modesty" is the
                    // standard legal phrase used in FIRs/chargesheets
                    // (IPC 354/BNS 74 territory), and "attempted to molest"
                    // covers an attempt short of the completed act.
                    'outraged her modesty', 'outraging her modesty', 'attempted to molest',
                    'tried to molest', 'indecently touched', 'indecent touching',
                    'unwanted physical contact', 'inappropriate contact', 'sexually harassed',
                    'sexual harassment'],
                severity: 85,
                description: 'Sexual abuse or unwanted touching described indirectly, in the victim\'s own words or a case document\'s narration'
            },
            'police_brutality': {
                keywords: ['police beat', 'beaten by police', 'police torture',
                    'tortured by police', 'police custody torture', 'custodial death',
                    'custodial torture', 'police assault', 'lathi charge',
                    'police station beating', 'assaulted by police', 'detained', 'released without charge',
                    // ✅ NEW (keyword expansion): common real-world phrasings
                    // for police/state violence not previously covered -
                    // "thrashed", fake/staged encounters, and illegal
                    // detention are all frequently reported forms.
                    'thrashed by police', 'brutally beaten by police', 'illegal detention',
                    'illegally detained', 'fake encounter', 'staged encounter',
                    'encounter killing', 'police firing', 'baton charge',
                    // ✅ NEW: real gap found stress-testing the pipeline -
                    // forest officials assaulting Adivasi people over land/
                    // forest-rights disputes is a well-documented, common
                    // form of state violence against tribal communities
                    // (see the Samatha land-rights case in
                    // legalGuidance.js), but scored zero since only
                    // "police" specifically was covered here.
                    'forest officers beat', 'beaten by forest officials',
                    'assaulted by forest department', 'forest guards beat'],
                severity: 85,
                description: 'Police or forest-department brutality against SC/ST victim'
            },
            'discrimination': {
                // ✅ NEW: real gap - "my classmates tease me... because I am
                // from SC community" identified the community correctly but
                // matched NO pattern at all, since neither 'caste' nor
                // 'discrimination' literally appeared in the text - school
                // caste-bullying is one of the most common real disclosure
                // types this tool should catch. Added the same way
                // 'workplace harassment' already was: a generic-sounding
                // phrase accepted into this pattern despite not being
                // caste-specific on its own. This can only affect scstResult
                // in isolation - the headline severity escalation still
                // requires a community to ALSO be identified (see
                // _getSeverity's scst_atrocity check in the controller), so
                // ordinary non-caste teasing with no community mentioned
                // never escalates the main assessment.
                keywords: ['caste', 'discrimination', 'casteist slur', 'caste slur',
                    'denied promotion', 'workplace harassment', 'casteist remarks',
                    'denied treatment', 'refused to touch', 'healthcare denial',
                    'tease me', 'teased me', 'teasing me', 'bully me', 'bullied me',
                    'bullying me', 'mock me', 'mocked me', 'made fun of me',
                    // ✅ NEW (keyword expansion): direct, common phrasings
                    // for caste-based discrimination not previously covered -
                    // "caste-based discrimination"/"discriminated against"
                    // are extremely common in case documents, and
                    // caste-based name-calling is a frequent disclosure that
                    // didn't require the word "slur" specifically.
                    'caste-based discrimination', 'discriminated against', 'denied job',
                    'refused service', 'refused entry due to caste', 'caste based abuse',
                    'caste abuse', 'used casteist language', 'called by caste name',
                    'caste name calling', 'insulted by caste name', 'lower caste',
                    'upper caste'],
                severity: 65,
                description: 'Caste discrimination against SC/ST individual (workplace, healthcare, school, or general)'
            },
            'public_humiliation': {
                keywords: ['paraded', 'stripped', 'paraded naked', 'publicly humiliated', 'humiliation',
                    // ✅ NEW (keyword expansion): these are specific,
                    // well-documented forms of caste-based public humiliation
                    // (garlanding with footwear, tonsuring, forced degrading
                    // acts) that a generic word like "humiliated" doesn't
                    // reliably cover.
                    'garlanded with footwear', 'garlanded with slippers', 'tonsured',
                    'blackened face', 'forced to eat human waste', 'forced to lick',
                    'made to remove footwear', 'forced to remove clothes',
                    'forced to remove clothing'],
                severity: 80,
                description: 'Public humiliation of SC/ST victim'
            },
            'false_conviction': {
                keywords: ['falsely convicted', 'wrongful conviction', 'wrongfully jailed',
                    'acquitted after', 'false charges filed against',
                    // ✅ NEW (keyword expansion): common phrasings for how a
                    // false-conviction/malicious-prosecution case is
                    // actually described, beyond the word "convicted" itself.
                    'framed in a false case', 'falsely implicated', 'fabricated evidence',
                    'planted evidence', 'malicious prosecution', 'wrongly accused',
                    'wrongly implicated', 'false fir', 'foisted a false case'],
                severity: 85,
                description: 'False conviction of SC/ST individual'
            },
            'intellectual_theft': {
                keywords: ['research stolen', 'data stolen', 'intellectual property theft',
                    'stole her research', 'stole his research'],
                severity: 60,
                description: 'Intellectual property theft against Dalit researchers'
            },
            'coercive_silencing': {
                keywords: ['threatened to hurt', 'threatened my family', 'threatened her family',
                    'threatened his family', 'scared to tell', 'scared to report',
                    'afraid to tell', 'afraid to report', 'warned me not to tell',
                    'said he would', 'threatened to evict', 'blackmail', 'threatened to kill',
                    'threatened to expose', 'threatened to release', 'told me not to tell',
                    // ✅ NEW (keyword expansion): pressure to withdraw or
                    // "compromise" a complaint is one of the most common
                    // real-world forms of witness/victim coercion in caste
                    // atrocity cases, distinct from an explicit threat of
                    // violence, and wasn't covered by the phrases above.
                    'pressured to withdraw', 'pressured to compromise', 'forced to compromise',
                    'asked to settle', 'pressured to settle', 'witness intimidated',
                    'threatened the witness', 'pressured to drop the case',
                    'forced to withdraw the complaint'],
                severity: 80,
                description: 'Victim actively threatened or coerced into silence'
            },
            // ✅ NEW patterns (2025 expansion), added to cover case archetypes
            // not previously represented: land/livelihood, denial of public
            // access/social boycott, election intimidation, honor-based
            // violence, and cyber caste harassment. Named to match
            // legalGuidance.js's scstProvisions keys directly where a
            // matching entry exists, so no alias mapping is needed.
            'land_and_livelihood_dispossession': {
                keywords: ['land occupied', 'forcibly occupied', 'encroachment',
                    'bonded labor', 'bonded labour', 'denied access to land',
                    'evicted from land', 'seized their land',
                    // ✅ NEW (keyword expansion): manual scavenging is a
                    // distinct, well-documented caste-based forced-labor
                    // practice (prohibited by the Prohibition of Employment
                    // as Manual Scavengers Act, 2013) that wasn't covered by
                    // the generic "bonded labor" phrasing.
                    'manual scavenging', 'forced to clean sewers', 'forced to clean drains',
                    'forced sanitation work', 'denied ownership of land', 'illegally acquired land',
                    'grabbed their land', 'land grab'],
                severity: 78,
                description: 'Illegal dispossession of SC/ST land, coerced/bonded labor, or forced manual scavenging'
            },
            'denial_of_access_and_social_boycott': {
                keywords: ['untouchability', 'denied entry', 'denied access', 'segregation',
                    'shunned', 'social boycott', 'economic boycott', 'sit separately',
                    'eat separately',
                    // ✅ NEW: real gaps found stress-testing the pipeline -
                    // both are extremely common, real ways this pattern is
                    // described but used different wording than the
                    // existing entries ("denied entry" vs "not allowed to
                    // enter"; nothing at all covered school segregation).
                    'not allowed to enter', 'sit outside the classroom',
                    'made to sit outside', 'denied electricity', 'denied water connection',
                    // ✅ NEW (keyword expansion): denial of access to a
                    // shared water source (well, hand pump, tap) is one of
                    // the single most common, historically documented forms
                    // of untouchability practice in India - the original
                    // list had no water-specific phrasing at all beyond the
                    // unrelated "denied water connection" (a utility
                    // hookup, not a public well), so a plain account of
                    // being refused water/entry to a well scored no pattern
                    // match whatsoever.
                    'refused water', 'refused to give water', 'refused to let her drink',
                    'refused to let him drink', 'refused to allow her to drink',
                    'refused to allow him to drink', 'denied water from the well',
                    'denied water from the tap', 'not allowed to draw water',
                    'prevented from drawing water', 'refused access to the well',
                    'stopped from using the well', 'barred from the well', 'water denied',
                    // ✅ FIX: the phrasing above assumed "refused" would be
                    // immediately followed by "water"/"access" - but the
                    // single most natural real phrasing is "refused to
                    // drink water from the well" (refused-TO-VERB, not
                    // refused-NOUN), which none of the above actually
                    // contain as a substring. Found stress-testing this
                    // exact expansion against a real disclosure.
                    'refused to drink', 'not allowed to drink', 'denied drinking water',
                    'refused to draw water',
                    'refused entry to the temple', 'refused temple entry', 'temple entry denied',
                    'not allowed inside the temple', 'barred from the temple',
                    'denied cremation ground', 'refused burial ground', 'barred from the cremation ground',
                    // ✅ FIX: forced expulsion from a village over caste -
                    // a real, well-documented form of collective social
                    // boycott (the whole community forcing a family out,
                    // often over a land, marriage, or "purity" dispute) -
                    // had no phrasing at all in this pattern. A plain
                    // account like "was forced to get out of the village"
                    // scored zero patterns and Low/0 severity despite the
                    // victim's community being identified, found stress-
                    // testing this exact scenario.
                    'forced to get out of the village', 'forced out of the village',
                    'forced to leave the village', 'forced to leave her village',
                    'forced to leave his village', 'driven out of the village',
                    'expelled from the village', 'banished from the village',
                    'ordered to leave the village', 'chased out of the village',
                    'evicted from the village', 'thrown out of the village',
                    'not allowed to live in the village', 'barred from the village'],
                severity: 68,
                description: 'Denial of access to public resources (water, temple, cremation ground, school), forced expulsion from a village, or organized social/economic boycott'
            },
            'election_and_political_intimidation': {
                keywords: ['election violence', 'reserved seat', 'prevented from voting',
                    'prevented from contesting', 'take office', 'panchayat election',
                    // ✅ NEW (keyword expansion): forced resignation of an
                    // elected SC/ST representative (sarpanch, panch, gram
                    // panchayat member) under pressure is a common, real
                    // form of this intimidation not covered by "prevented
                    // from contesting" alone.
                    'forced to resign', 'forced resignation', 'forced her to resign',
                    'forced him to resign', 'threatened to withdraw candidacy',
                    'sarpanch post', 'gram panchayat seat', 'prevented from taking office'],
                severity: 80,
                description: 'Intimidation preventing an SC/ST person from voting, contesting, or holding office'
            },
            'honor_based_violence': {
                keywords: ['inter-caste marriage', 'inter caste marriage', 'honor killing',
                    'family threatened', 'forced to separate', 'threatened for marrying',
                    'marrying outside my caste', 'marrying outside caste', 'marrying outside our caste',
                    'kill us both', 'disgrace to the family', 'disgracing the family',
                    // ✅ NEW (keyword expansion): khap/caste-panchayat
                    // pressure to end a relationship is a well-documented
                    // form of this violence distinct from a direct threat
                    // to kill or separate.
                    'khap panchayat', 'caste panchayat', 'ordered to separate',
                    'ostracized for marrying', 'ostracised for marrying',
                    'social boycott for marrying', 'excommunicated for marrying'],
                severity: 85,
                description: 'Violence or threats over an inter-caste relationship/marriage'
            },
            'cyber_caste_harassment': {
                keywords: ['online threat', 'cyberbullying', 'shared my photos',
                    'social media harassment', 'posted casteist', 'trolled',
                    // ✅ NEW (keyword expansion): more specific, common
                    // real-world forms of caste-based online harassment -
                    // morphed/manipulated images and harassment through a
                    // specific platform or group chat, not just generic
                    // "social media harassment".
                    'morphed photos', 'morphed images', 'circulated my photos',
                    'circulated her photos', 'circulated his photos', 'whatsapp group harassment',
                    'facebook harassment', 'instagram harassment', 'caste-based trolling',
                    'casteist comments online', 'casteist messages'],
                severity: 65,
                description: 'Caste-based harassment, threats, or blackmail conducted online'
            }
        };

        // ============================================================
        //  ✅ NEW: power-imbalance / authority context. Not a severity
        //  category on its own - when present alongside ANY matched
        //  abuse pattern, it escalates severity (see analyze()). A
        //  teacher, employer, landlord, or custodial officer abusing a
        //  position of power over an SC/ST victim is a recognized
        //  aggravating factor, not a neutral detail.
        // ============================================================
        this.authorityContext = [
            'teacher', 'employer', 'landlord', 'warden', 'priest', 'guardian',
            'doctor', 'in-law', 'police officer', 'government official',
            'upper-caste employer', 'principal', 'supervisor', 'boss',
            'forest officer', 'forest official', 'forest department'
        ];

        // ============================================================
        //  ✅ NEW: firsthand-testimony detection. scstAnalyzer.js has
        //  always read result.victimTestimonyDetected / .requiresPriorityReview
        //  off this class's output to drive its "🚩 PRIORITY REVIEW"
        //  banner - but analyze() never actually set either field, so
        //  that banner has never fired regardless of severity. First-
        //  person pronouns distinguish "I was beaten by the police" (a
        //  direct account) from "a woman was allegedly beaten by police"
        //  (third-party/news-style reporting about someone else) - a
        //  useful triage signal for routing a case to a human reviewer
        //  fast, separate from and never a substitute for severity itself.
        //  Kept intentionally short/common-word-only (no fuzzy matching -
        //  see _matchesKeyword) since pronouns are too short for edit-
        //  distance matching to be safe.
        // ============================================================
        this.firstPersonMarkers = [
            'i', 'me', 'my', 'myself', 'mine', 'we', 'us', 'our', 'ours',
            'मुझे', 'मेरा', 'मेरी', 'मेरे', 'मैं', 'हम', 'हमें', 'हमारा'
        ];

        // Policy parameters - see note in analyze(). These reflect the
        // protective intent of caste-based-crime law (heightened
        // vulnerability is itself an aggravating factor), but the exact
        // numbers are a policy calibration, not something I can set
        // authoritatively - a legal/social-work reviewer familiar with
        // the SC/ST Prevention of Atrocities Act should sign off on
        // these before real-world deployment.
        this.COMMUNITY_VULNERABILITY_FLOOR = 50;
        this.AUTHORITY_POWER_ESCALATION = 10;

        this.loadModels();
    }

    loadCases() {
        try {
            const dataPath = path.join(__dirname, '../data/scst/cases.json');
            if (fs.existsSync(dataPath)) {
                const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
                this.cases = data.cases || [];
                console.log(`✅ Loaded ${this.cases.length} SC/ST cases`);
                return this.cases;
            }
        } catch (error) {
            console.error('Error loading cases:', error);
        }
        return [];
    }

    train() {
        console.log('🚀 Training SC/ST Model on Real Cases...');
        
        const cases = this.loadCases();
        if (cases.length === 0) {
            console.error('❌ No cases found for training');
            return;
        }

        // 1. Extract keywords
        const keywords = {};
        for (const caseData of cases) {
            const incident = caseData.incident || {};
            const kw = incident.keywords || [];
            const type = incident.type || 'unknown';
            const severity = incident.severity ?? 50;

            for (const word of kw) {
                if (!keywords[word]) {
                    keywords[word] = { count: 0, severity: 0, types: [] };
                }
                keywords[word].count++;
                keywords[word].severity += severity;
                if (!keywords[word].types.includes(type)) {
                    keywords[word].types.push(type);
                }
            }
        }

        // Calculate average severity
        for (const word in keywords) {
            keywords[word].avgSeverity = keywords[word].severity / keywords[word].count;
        }

        this.keywordModel = keywords;

        // 2. Build pattern model
        this.patternModel = this.abusePatterns;

        // 3. Build severity model
        this.severityModel = {};
        for (const caseData of cases) {
            const incident = caseData.incident || {};
            const types = incident.abuse_types || [];
            const severity = incident.severity ?? 50;
            
            for (const type of types) {
                if (!this.severityModel[type]) {
                    this.severityModel[type] = [];
                }
                this.severityModel[type].push(severity);
            }
        }

        // Calculate average severity for each abuse type
        for (const type in this.severityModel) {
            const scores = this.severityModel[type];
            this.severityModel[type] = scores.reduce((a, b) => a + b, 0) / scores.length;
        }

        // Save models
        this.saveModels();

        console.log(`✅ Training complete!`);
        console.log(`   Keywords: ${Object.keys(this.keywordModel).length}`);
        console.log(`   Patterns: ${Object.keys(this.patternModel).length}`);
        console.log(`   Abuse Types: ${Object.keys(this.severityModel).length}`);
    }

    saveModels() {
        const modelDir = path.join(__dirname, '../models/scst');
        if (!fs.existsSync(modelDir)) {
            fs.mkdirSync(modelDir, { recursive: true });
        }

        fs.writeFileSync(
            path.join(modelDir, 'keywordModel.json'),
            JSON.stringify(this.keywordModel, null, 2)
        );
        fs.writeFileSync(
            path.join(modelDir, 'patternModel.json'),
            JSON.stringify(this.patternModel, null, 2)
        );
        fs.writeFileSync(
            path.join(modelDir, 'severityModel.json'),
            JSON.stringify(this.severityModel, null, 2)
        );
        console.log('✅ Models saved to /models/scst/');
    }

    loadModels() {
        const modelDir = path.join(__dirname, '../models/scst');
        
        try {
            if (fs.existsSync(path.join(modelDir, 'keywordModel.json'))) {
                this.keywordModel = JSON.parse(
                    fs.readFileSync(path.join(modelDir, 'keywordModel.json'), 'utf8')
                );
                this.patternModel = JSON.parse(
                    fs.readFileSync(path.join(modelDir, 'patternModel.json'), 'utf8')
                );
                this.severityModel = JSON.parse(
                    fs.readFileSync(path.join(modelDir, 'severityModel.json'), 'utf8')
                );
                console.log('✅ Models loaded from /models/scst/');
            } else {
                this.train();
            }
        } catch (error) {
            console.error('Error loading models:', error);
            this.train();
        }
    }

    // Word-boundary-safe matching, same principle used in textAnalyzer.js:
    // plain .includes() let 'st' match inside 'caste' and 'child' match
    // inside 'children', causing real misclassifications (see analyze()
    // history / commit notes). This checks that a match isn't glued to
    // surrounding letters on either side.
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

    // ================================================================
    //  FUZZY / "SIMILAR WORD" MATCHING
    //  Same rationale as textAnalyzer.js: exact substring matching alone
    //  misses misspellings ("harrassed", "casteist" vs "castist") and
    //  close variants in long, freely-written testimony. Only applied to
    //  single-word keywords - multi-word phrases (most of this model)
    //  still require an exact word-boundary match, since fuzzy-matching a
    //  whole phrase token-by-token is unreliable for a severity-scoring
    //  system where false positives have real consequences.
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

    // See textAnalyzer.js note: distance-2 at length 7-8 causes false
    // collisions between unrelated real words, so it's reserved for
    // longer (>=10 letter) words only.
    _fuzzyThreshold(len) {
        if (len <= 4) return 0;
        if (len <= 9) return 1;
        return 2;
    }

    _tokenize(text) {
        return text.match(/[\p{L}\p{N}']+/gu) || [];
    }

    // See textAnalyzer.js note: strips common suffixes so a typo plus a
    // suffix ("harrassed") doesn't compound into too large an edit
    // distance to match its root keyword ("harass").
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

    // Word-boundary exact match first; for single-word keywords only,
    // falls back to a fuzzy token match. `tokens` is the pre-split text,
    // computed once per analyze() call rather than per keyword.
    _matchesKeyword(text, tokens, phrase) {
        if (this._containsWord(text, phrase)) return true;
        if (phrase.includes(' ')) return false;
        const threshold = this._fuzzyThreshold(phrase.length);
        if (threshold === 0) return false;
        for (const token of tokens) {
            if (token === phrase) continue;
            for (const variant of this._stemVariants(token)) {
                if (Math.abs(variant.length - phrase.length) > threshold) continue;
                // ✅ FIX: require the same first letter before accepting a
                // fuzzy match. Real typos and inflected forms ('harrassed'
                // vs 'harass', 'theatened' vs 'threatened') almost always
                // preserve the first character. Without this, stripping a
                // suffix from a totally unrelated word could coincidentally
                // land within edit distance of a short keyword - e.g.
                // 'weather' -> strip 'er' -> 'weath' was landing at edit
                // distance 1 from 'death', scoring a neutral sentence about
                // the weather as Critical/100.
                if (variant[0] !== phrase[0]) continue;
                if (this._levenshtein(variant, phrase) <= threshold) return true;
            }
        }
        return false;
    }

    analyze(text) {
        const textLower = text.toLowerCase();
        const tokens = this._tokenize(textLower);
        const results = {
            patterns: [],
            communities: [],
            keywords: [],
            severity: 0,
            severityLevel: 'Low',
            confidence: 0,
            escalation: []  // transparency: WHY the score moved, not just what it is
        };

        // Check patterns (word-boundary safe)
        let maxSeverity = 0;
        let coerciveSilencingMatched = false;
        for (const [patternName, pattern] of Object.entries(this.patternModel)) {
            const matched = pattern.keywords.filter(kw => this._matchesKeyword(textLower, tokens, kw));
            if (matched.length > 0) {
                results.patterns.push({
                    name: patternName,
                    description: pattern.description,
                    matchedKeywords: matched,
                    severity: pattern.severity
                });
                if (pattern.severity > maxSeverity) {
                    maxSeverity = pattern.severity;
                }
                if (patternName === 'coercive_silencing') {
                    coerciveSilencingMatched = true;
                }
            }
        }

        // ✅ FIX: communityKeywords.dalit/tribal include the bare 2-letter
        // abbreviations 'sc'/'st', which word-boundary matching correctly
        // finds as standalone tokens - but "SC/ST Act", "SC/ST Commission",
        // etc. (the name of the LAW itself) also satisfies that boundary
        // check on both sides of the slash, since '/' isn't a letter. Real
        // gap found building the Lawyer tab's case-document summarizer:
        // legal documents cite "SC/ST (Prevention of Atrocities) Act" as
        // routine boilerplate in nearly every case, which was silently
        // asserting BOTH communities were identified even for a
        // Scheduled-Caste-only victim, purely from the Act's name being
        // mentioned - not from any actual identification of who the victim
        // is. This blanks out the Act-name references (and its full
        // official name) before community-keyword matching only, so
        // legitimate individual identification ("she is from the ST
        // community", "SC category") still matches normally.
        const communityDetectionText = textLower
            .replace(/\bsc\s*\/\s*st\b/g, ' the atrocities ')
            .replace(/\bscheduled\s+castes?\s+and\s+scheduled\s+tribes?\b/g, ' the atrocities ');
        const communityDetectionTokens = this._tokenize(communityDetectionText);

        // Check communities (word-boundary safe)
        for (const [community, keywords] of Object.entries(this.communityKeywords)) {
            if (keywords.some(kw => this._matchesKeyword(communityDetectionText, communityDetectionTokens, kw))) {
                results.communities.push(community);
            }
        }

        // Check trained keyword model - exact word-boundary match ONLY, not
        // fuzzy. This model is auto-extracted from free-text case data and
        // can include generic single words (e.g. 'death' as an abuse_type-
        // derived keyword). Fuzzy+stemming previously matched 'weather' to
        // 'death' (strip 'er' suffix -> 'weath' -> edit distance 1), which
        // scored a neutral sentence ("the weather is nice today") as
        // Critical/100. Fuzzy tolerance remains for the manually curated
        // abusePatterns/community/authority lists above, which are lower-
        // volume and reviewed, so the collision risk is much smaller.
        let keywordSeverity = 0;
        for (const [word, data] of Object.entries(this.keywordModel)) {
            if (this._containsWord(textLower, word)) {
                results.keywords.push(word);
                if (data.avgSeverity > keywordSeverity) {
                    keywordSeverity = data.avgSeverity;
                }
            }
        }

        // ✅ FIX: keywordModel is auto-extracted from cases.json's free-text
        // 'keywords' arrays, which aren't curated the way abusePatterns is -
        // a single overly-generic word in ANY case's keyword list (e.g.
        // "threatened", "assaulted") gets trained in and then matches that
        // word anywhere, in any unrelated context, no pattern or community
        // match required. This let a plain domestic-violence sentence with
        // no caste content at all score Critical purely from one word match
        // with a near-zero confidence score. Without real pattern-level
        // evidence, cap what this weaker signal alone can produce.
        // ✅ FIX: the previous cap of 40 was still high enough to cross into
        // the "Mild" severity tier (>30) from a single generic auto-
        // extracted keyword match alone - e.g. the word "supervisor"
        // matching produced "Mild (40/100)" with NO pattern and NO
        // community evidence behind it, a self-contradictory result. Without
        // real pattern/community evidence, this weaker signal should never
        // be able to leave the "Low" tier at all.
        const hasPatternEvidence = maxSeverity > 0;
        if (!hasPatternEvidence) {
            keywordSeverity = Math.min(keywordSeverity, 25);
        }

        let severity = Math.max(maxSeverity, keywordSeverity, 0);

        // ✅ VICTIM-CENTRIC: a victim actively being threatened/coerced into
        // silence is a strong danger signal on its own, and must not be
        // diluted just because the rest of the account uses mild language.
        // It escalates the case to at least its own severity level rather
        // than being averaged in as one keyword among many.
        if (coerciveSilencingMatched && severity < this.abusePatterns.coercive_silencing.severity) {
            severity = this.abusePatterns.coercive_silencing.severity;
            results.escalation.push('Escalated: victim reported being threatened/coerced into silence');
        }

        // ✅ VICTIM-CENTRIC: abuse by someone in a position of power/trust
        // over the victim (teacher, employer, landlord, custodial officer,
        // etc.) is a recognized aggravating factor - it reflects the
        // victim's reduced ability to resist or safely report, not just an
        // incidental detail of the story.
        const authorityMatch = this.authorityContext.find(term => this._matchesKeyword(textLower, tokens, term));
        if (authorityMatch && results.patterns.length > 0) {
            severity = Math.min(100, severity + this.AUTHORITY_POWER_ESCALATION);
            results.escalation.push(`Escalated: abuse of power/trust position detected ("${authorityMatch}")`);
        }

        // ✅ VICTIM-CENTRIC / POLICY: SC/ST Prevention of Atrocities Act
        // treats caste-based vulnerability itself as an aggravating factor.
        // If the victim's community is identified AND any abuse pattern is
        // present, don't let the case register as "Low" severity purely
        // because the described act itself was lower-weighted individually.
        // NOTE: this floor value is a policy calibration - review with a
        // legal/social-work specialist before relying on it operationally.
        if (results.communities.length > 0 && results.patterns.length > 0) {
            if (severity < this.COMMUNITY_VULNERABILITY_FLOOR) {
                severity = this.COMMUNITY_VULNERABILITY_FLOOR;
                results.escalation.push('Escalated: minimum floor applied for identified SC/ST victim with confirmed abuse pattern');
            }
        }

        // ✅ VICTIM-CENTRIC PRINCIPLE (do not remove): severity is driven
        // only by what happened and by recognized aggravating factors
        // above (coercion, power imbalance, community vulnerability) -
        // never by how calmly, briefly, or indirectly the victim describes
        // it. Calm, minimizing, or delayed disclosure are normal trauma
        // responses, not indicators of lower severity. Do not add any
        // "confidence/credibility" scoring based on tone, certainty
        // language, or narrative fluency.

        results.severity = severity;

        if (results.severity > 85) results.severityLevel = 'Critical';
        else if (results.severity > 70) results.severityLevel = 'Severe';
        else if (results.severity > 50) results.severityLevel = 'Moderate';
        else if (results.severity > 30) results.severityLevel = 'Mild';
        else results.severityLevel = 'Low';

        // ✅ FIX: these two fields were read by scstAnalyzer.js's summary
        // generator (the "🚩 PRIORITY REVIEW" banner) but were never set
        // here, so that banner never fired. Distinguishing firsthand
        // testimony ("he raped me") from third-party/news-style reporting
        // ("a woman was allegedly raped") is a triage signal, not a
        // severity judgment - it does not raise or lower `severity` above,
        // only whether the case surfaces as needing fast human review.
        // Requiring 2+ distinct first-person markers (rather than 1) avoids
        // flagging a third-party account that merely quotes the victim
        // once ("she told police 'I was scared'").
        const firstPersonCount = this.firstPersonMarkers
            .filter(p => this._matchesKeyword(textLower, tokens, p)).length;
        results.victimTestimonyDetected = firstPersonCount >= 2 && results.patterns.length > 0;
        results.requiresPriorityReview = results.victimTestimonyDetected &&
            (results.severityLevel === 'Severe' || results.severityLevel === 'Critical');
        if (results.requiresPriorityReview) {
            results.escalation.push('Priority review: firsthand account of a severe/critical pattern');
        }

        // ✅ FIX: confidence used to reward ONLY pattern/keyword count, which
        // structurally favors longer, more explicit accounts over the short,
        // indirect disclosures the sexual_abuse_indirect category and the
        // principle above exist to take seriously. A firsthand account is
        // itself a legitimate confidence signal (this is a direct report,
        // not an inference from secondhand text) - distinct from, and not a
        // proxy for, tone/certainty/fluency, which are explicitly excluded.
        results.confidence = Math.min(1.0,
            (results.patterns.length * 0.2) +
            (results.keywords.length * 0.02) +
            (results.victimTestimonyDetected ? 0.15 : 0)
        );

        return results;
    }
}

export default SCSTTrainer;