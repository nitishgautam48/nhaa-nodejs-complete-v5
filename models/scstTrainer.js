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
                keywords: ['gang rape', 'raped', 'drugged', 'kidnapped', 'gang-raped'],
                severity: 100,
                description: 'Gang rape of SC/ST victim'
            },
            'child_abuse': {
                keywords: ['14-year-old', '16-year-old', 'minor girl', 'minor boy',
                    'pocso', 'child victim', 'underage'],
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
                    'molested', 'molestation', 'molesting', 'molests', 'groped'],
                severity: 85,
                description: 'Sexual abuse described in victim\'s own indirect language'
            },
            'police_brutality': {
                keywords: ['police beat', 'beaten by police', 'police torture',
                    'tortured by police', 'police custody torture', 'custodial death',
                    'custodial torture', 'police assault', 'lathi charge',
                    'police station beating', 'assaulted by police', 'detained', 'released without charge'],
                severity: 85,
                description: 'Police brutality against SC/ST victim'
            },
            'discrimination': {
                keywords: ['caste', 'discrimination', 'casteist slur', 'caste slur',
                    'denied promotion', 'workplace harassment', 'casteist remarks',
                    'denied treatment', 'refused to touch', 'healthcare denial'],
                severity: 65,
                description: 'Caste discrimination against SC/ST individual (workplace, healthcare, or general)'
            },
            'public_humiliation': {
                keywords: ['paraded', 'stripped', 'paraded naked', 'publicly humiliated', 'humiliation'],
                severity: 80,
                description: 'Public humiliation of SC/ST victim'
            },
            'false_conviction': {
                keywords: ['falsely convicted', 'wrongful conviction', 'wrongfully jailed',
                    'acquitted after', 'false charges filed against'],
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
                    'threatened to expose', 'threatened to release', 'told me not to tell'],
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
                    'evicted from land', 'seized their land'],
                severity: 78,
                description: 'Illegal dispossession of SC/ST land or coerced/bonded labor'
            },
            'denial_of_access_and_social_boycott': {
                keywords: ['untouchability', 'denied entry', 'denied access', 'segregation',
                    'shunned', 'social boycott', 'economic boycott', 'sit separately',
                    'eat separately'],
                severity: 68,
                description: 'Denial of access to public resources or organized social/economic boycott'
            },
            'election_and_political_intimidation': {
                keywords: ['election violence', 'reserved seat', 'prevented from voting',
                    'prevented from contesting', 'take office', 'panchayat election'],
                severity: 80,
                description: 'Intimidation preventing an SC/ST person from voting, contesting, or holding office'
            },
            'honor_based_violence': {
                keywords: ['inter-caste marriage', 'inter caste marriage', 'honor killing',
                    'family threatened', 'forced to separate', 'threatened for marrying',
                    'marrying outside my caste', 'marrying outside caste', 'marrying outside our caste',
                    'kill us both', 'disgrace to the family', 'disgracing the family'],
                severity: 85,
                description: 'Violence or threats over an inter-caste relationship/marriage'
            },
            'cyber_caste_harassment': {
                keywords: ['online threat', 'cyberbullying', 'shared my photos',
                    'social media harassment', 'posted casteist', 'trolled'],
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
            'upper-caste employer', 'principal', 'supervisor', 'boss'
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

        // Check communities (word-boundary safe)
        for (const [community, keywords] of Object.entries(this.communityKeywords)) {
            if (keywords.some(kw => this._matchesKeyword(textLower, tokens, kw))) {
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