// ================================================================
//  RAKSHAK AI CONTROLLER - Complete Request Handler
// ================================================================

import fs from 'fs';
import crypto from 'crypto';
import HybridAIService from '../models/hybridAI.js';
import ClinicalScales from '../models/clinicalScales.js';
import ExpertSystem from '../models/expertSystem.js';
import HumanIntelligence from '../models/humanIntelligence.js';
import ConsensusBuilder from '../models/consensusBuilder.js';
import FeedbackLearning from '../models/feedbackLearning.js';
import SCSTTrainer from '../models/scstTrainer.js';
import LegalGuidance from '../models/legalGuidance.js';
import TextAnalyzer from '../services/textAnalyzer.js';
import AudioAnalyzer from '../services/audioAnalyzer.js';
import LanguageDetector from '../utils/languageDetector.js';
import Database from '../utils/database.js';
import AuthService from '../services/auth.js';
import SemanticAnalyzer from '../services/semanticAnalyzer.js';
import DocumentParser from '../services/documentParser.js';
import CaseSummarizer from '../models/caseSummarizer.js';

class NHHAController {
    constructor() {
        this.hybridAI = new HybridAIService();
        this.clinicalScales = new ClinicalScales();
        this.expertSystem = new ExpertSystem();
        this.humanIntelligence = new HumanIntelligence();
        this.consensusBuilder = new ConsensusBuilder();
        this.feedbackLearning = new FeedbackLearning();
        this.textAnalyzer = new TextAnalyzer();
        this.audioAnalyzer = new AudioAnalyzer();
        this.languageDetector = new LanguageDetector();
        this.scstTrainer = new SCSTTrainer();
        this.legalGuidance = new LegalGuidance();
        // ✅ NEW: Database already existed (utils/database.js) but nothing
        // ever instantiated or called it - every case only ever lived in
        // the browser's localStorage, which is why the authority dashboard
        // could never show a case submitted from a different browser/device.
        // Wiring this in makes cases real, server-side, shared records.
        this.db = new Database();
        this.auth = new AuthService();
        // Loads its model in the background (see services/semanticAnalyzer.js
        // - not awaited here, never blocks server startup or a request if
        // it's slow/unavailable).
        this.semanticAnalyzer = new SemanticAnalyzer();
        // Lawyer tab: document upload -> extracted text -> structured case
        // summary. See models/caseSummarizer.js's header for methodology.
        this.documentParser = new DocumentParser();
        this.caseSummarizer = new CaseSummarizer();
        this.caseCounter = 0;

        // ============================================================
        //  PWA Share Target hand-off cache (see shareTargetReceive /
        //  getSharedText below). When someone shares a PDF into the app
        //  from their phone's OS share sheet, the browser POSTs it to a
        //  page route (not an API call the frontend JS controls), so
        //  there's no way to hand the extracted text straight back in
        //  that same response - the response IS the next page load. This
        //  short-lived, one-time-use, in-memory cache bridges that POST
        //  to the GET the lawyer_dashboard.html page makes right after,
        //  without ever writing the (potentially sensitive) case text to
        //  disk. Token expires after 5 minutes and is deleted the moment
        //  it's read, whichever comes first - it only needs to survive
        //  one redirect.
        // ============================================================
        this.sharedDocumentCache = new Map();
        setInterval(() => {
            const now = Date.now();
            for (const [token, entry] of this.sharedDocumentCache) {
                if (entry.expiresAt < now) this.sharedDocumentCache.delete(token);
            }
        }, 60 * 1000).unref();
    }

    // ============================================================
    //  OPTIONAL VICTIM/USER ACCOUNTS
    //  Entirely optional - see the account widget in
    //  advanced_dashboard.html and the header comment in services/auth.js.
    //  Never returns a password or password hash in any response.
    // ============================================================
    async registerUser(req, res) {
        // name/bciNumber are optional - only sent by the Lawyer
        // Assistant page's signup form (see auth.js's header note on why
        // mobile is no longer required either).
        const { email, password, mobile, name, bciNumber } = req.body || {};
        const result = await this.auth.register({ email, password, mobile, name, bciNumber });
        if (!result.success) {
            return res.status(result.status).json({ success: false, error: result.error });
        }
        res.status(201).json({ success: true, user: result.user });
    }

    async loginUser(req, res) {
        const { email, password } = req.body || {};
        const result = await this.auth.login({ email, password });
        if (!result.success) {
            return res.status(result.status).json({ success: false, error: result.error });
        }
        res.status(200).json({ success: true, user: result.user });
    }

    // "My Cases": every case submitted while logged in (contact.email set
    // to this account's email - see hybridAssessment/_persistCase), so
    // someone can check status (Pending/Assigned/Escalated/Resolved) later
    // without needing their case ID. Requires the per-user x-user-token
    // issued at register/login - a case's contents are sensitive enough
    // that a bare email in a query string isn't sufficient to hand them back.
    getMyCases(req, res) {
        const token = req.headers['x-user-token'];
        const user = this.auth.getUserByToken(token);
        if (!user) {
            return res.status(401).json({ success: false, error: 'Not logged in or session expired.' });
        }
        const cases = this.db.getAllCases().filter(c => c.contact && c.contact.email === user.email);
        res.status(200).json({ success: true, data: { cases } });
    }

    // Shared by hybridAssessment and scstAnalyze so both entry points
    // (the victim-facing assessment AND the SC/ST-specific tab) create a
    // real, server-side case record an authority can actually see.
    // `contact` is entirely optional - only present if the person chose to
    // create/log into an account before submitting (see the account widget
    // in advanced_dashboard.html); anonymous submissions omit it.
    _persistCase({ caseId, text, language, hybridDecision, scstAnalysis, legalGuidance, source, contact, clinicalScales, clinicalReasoning, expertRules, caseNumber, court, courtroom, hearingDate, judgeName, complainantName, accusedNames }) {
        try {
            const severityLevel = hybridDecision?.severity?.level ||
                scstAnalysis?.severityLevel || 'Minimal';
            const svi = hybridDecision?.svi ?? scstAnalysis?.severity ?? 0;
            const primaryConcern = hybridDecision?.primaryConcern ||
                (scstAnalysis?.patterns?.[0]?.name) || 'general';

            this.db.saveCase({
                id: caseId,
                source: source || 'assessment',
                language: language || 'en',
                text: text || '',
                severity: severityLevel,
                svi: Math.round(svi),
                primaryConcern,
                // ✅ NEW: the authority dashboard previously only ever saw
                // the single SVI number and primaryConcern label - not the
                // full per-category breakdown that actually produced them.
                // Storing it here is what lets the case detail view show
                // every evaluation indicator, not just the headline score.
                finalScores: hybridDecision?.finalScores || {},
                escalatedBy: hybridDecision?.severity?.escalatedBy || null,
                scstSummary: scstAnalysis ? {
                    severityLevel: scstAnalysis.severityLevel,
                    severity: scstAnalysis.severity,
                    patterns: (scstAnalysis.patterns || []).map(p => p.name),
                    communities: scstAnalysis.communities || [],
                    escalation: scstAnalysis.escalation || [],
                    priorityReview: !!scstAnalysis.requiresPriorityReview
                } : null,
                legalApplicable: !!(legalGuidance && legalGuidance.applicable),
                // ✅ NEW: found auditing this app - the C-SSRS ladder,
                // PHQ-9/GAD-7/PCL-5 domain mapping, Danger Assessment,
                // risk formulation, symptom-pattern check, and expert-
                // system rule activations were computed on every request
                // but never persisted anywhere - only available in the
                // single API response returned to whoever ran the
                // assessment, then gone forever. An authority reviewing
                // the case later in the Command Center had no access to
                // any of it, only the raw finalScores. Stored here
                // (all optional - undefined for the lighter-weight
                // scstAnalyze() call site, which doesn't compute them)
                // so the case detail view can show the same clinical
                // detail the person who ran the assessment saw.
                clinicalScales: clinicalScales || null,
                clinicalReasoning: clinicalReasoning || null,
                expertRules: expertRules || null,
                // ✅ NEW: Lawyer Assistant "follow-up" tracking - a
                // lawyer's own case number and which court it's before,
                // entirely optional and only ever set from the two
                // lawyer-facing endpoints (scstAnalyze/summarizeCaseDocument).
                // Lets a case submitted through the Lawyer Assistant page
                // show up correctly labeled in "My Cases" for the lawyer
                // who's tracking it, distinct from an official FIR/court
                // case number extracted FROM a document's text (see
                // caseSummarizer.js's separate extractedEntities.firNumbers).
                caseNumber: caseNumber || null,
                court: court || null,
                // ✅ NEW: court-proceeding tracking - distinct from `status`
                // above, which is the authority dashboard's own internal
                // triage state (Pending/Assigned/Escalated/Resolved, i.e.
                // "has an officer picked this up"). courtStatus is the
                // actual state of the legal proceeding itself (a case can
                // be "Assigned" internally while its courtStatus is
                // "Hearing Scheduled") - manually updated by whoever's
                // tracking the case (lawyer or authority), since there's
                // no public live-data feed from India's e-Courts/NJDG
                // system available to pull this automatically.
                courtStatus: 'Pending',
                courtroom: courtroom || null,
                hearingDate: hearingDate || null,
                judgeName: judgeName || null,
                // ✅ NEW: structured party details. accusedNames arrives as
                // a single comma-separated string from the form (a case can
                // name several accused persons) and is normalized into an
                // array here, once, rather than every UI that reads it
                // having to re-parse a delimited string.
                complainantName: complainantName || null,
                accusedNames: accusedNames
                    ? String(accusedNames).split(',').map(n => n.trim()).filter(Boolean)
                    : [],
                status: 'Pending',
                officer: 'Unassigned',
                contact: contact && (contact.email || contact.mobile)
                    ? { email: contact.email || null, mobile: contact.mobile || null }
                    : null
            });
        } catch (err) {
            // Persistence failure should never break the response the
            // victim/authority is waiting on - log and move on.
            console.warn('Could not persist case:', err.message);
        }
    }

    async hybridAssessment(req, res) {
        try {
            // email/mobile are optional - only present if the person chose
            // to create/log into an account first (see advanced_dashboard.html's
            // account widget). Anonymous submissions simply omit them.
            const { text, email, mobile } = req.body;
            const audioFile = req.file;

            const lang = text ? this.languageDetector.detect(text) : 'en';
            const textAnalysis = text ? this.textAnalyzer.analyze(text, lang) : null;

            let audioAnalysis = null;
            if (audioFile) {
                try {
                    audioAnalysis = await this.audioAnalyzer.analyze(audioFile.path);
                } catch (err) {
                    console.warn('Audio analysis failed:', err.message);
                } finally {
                    // ✅ FIX: this only ran on the success path before - if
                    // analyze() threw, the catch block logged a warning but
                    // the uploaded temp file was never deleted, leaking a
                    // file on disk on every audio-analysis failure with no
                    // way for it to ever get cleaned up (the top-level
                    // catch below only fires if this whole request handler
                    // throws uncaught, which this inner try/catch
                    // specifically prevents).
                    if (fs.existsSync(audioFile.path)) fs.unlinkSync(audioFile.path);
                }
            }

            // ✅ FIX: SC/ST analysis was computed AFTER (and completely
            // separate from) the main severity decision, so a Critical
            // caste-atrocity finding never affected the headline severity a
            // victim or authority actually sees on the main assessment.
            // Compute it first so it can feed into _hybridDecision below.
            const scstResult = text ? this.scstTrainer.analyze(text) : null;

            // Embedding-based paraphrase signal, additive to (never a
            // replacement for) the keyword system above - see
            // services/semanticAnalyzer.js. Resolves to null (falls back to
            // keyword-only scoring) if disabled, still loading, non-English,
            // or slow enough to hit its own internal timeout.
            const semanticAnalysis = text ? await this.semanticAnalyzer.analyze(text, lang) : null;

            const aiResult = this.hybridAI.assess(textAnalysis, audioAnalysis, this.feedbackLearning.getLearnedParameters(), semanticAnalysis);
            const scales = this.clinicalScales.calculate(aiResult, text);
            const expertRules = this.expertSystem.applyRules(aiResult);
            const humanIntelligence = this.humanIntelligence.synthesize(aiResult, expertRules, text);
            const expertOpinions = this.consensusBuilder.getExpertOpinions(aiResult, expertRules);
            const consensus = this.consensusBuilder.buildConsensus(expertOpinions);
            const hybridDecision = this._hybridDecision(aiResult, humanIntelligence, consensus, scstResult);

            // Legal tab: redressal channels + provisions, combining SC/ST
            // pattern matches with any clinical crisis findings (e.g.
            // suicide risk) from the same case. text/dangerAssessment
            // passed through so legalGuidance can distinguish workplace-
            // context harassment (POSH Act) from domestic violence, and use
            // the Danger-Assessment-inspired lethality signal (see
            // humanIntelligence.js) rather than a generic score threshold
            // for domestic_violence guidance.
            const legalGuidance = this.legalGuidance.getCombinedGuidance(
                scstResult,
                hybridDecision.finalScores || {},
                expertRules,
                text,
                humanIntelligence.dangerAssessment
            );

            const caseId = `RAKSHAK-${Date.now().toString().slice(-8)}`;

            this._persistCase({
                caseId, text, language: lang, hybridDecision, scstAnalysis: scstResult,
                legalGuidance, source: 'assessment', contact: { email, mobile },
                clinicalScales: scales,
                clinicalReasoning: {
                    dangerAssessment: humanIntelligence.dangerAssessment,
                    riskFormulation: humanIntelligence.riskFormulation,
                    symptomPattern: humanIntelligence.symptomPattern
                },
                expertRules
            });

            res.status(200).json({
                success: true,
                caseId: caseId,
                data: {
                    timestamp: new Date().toISOString(),
                    language: lang,
                    hybridDecision: hybridDecision,
                    clinicalScales: scales,
                    scstAnalysis: scstResult,
                    legalGuidance: legalGuidance,
                    // ⚠️ Renamed from { aiContribution, humanIntelligence,
                    // expertConsensus } - those labels implied a real
                    // clinician and a real expert panel reviewed this case.
                    // Both "humanIntelligence" and "expertConsensus" are
                    // deterministic heuristic layers (see the warnings in
                    // humanIntelligence.js / consensusBuilder.js) with no
                    // external human input. Relabeled to say what they
                    // actually are.
                    scoreComposition: {
                        primaryModelSignal: '60%',
                        ruleBasedHeuristicAdjustment: '30%',
                        multiProfileHeuristicConsensus: '10%',
                        note: 'All layers are automated heuristics. No human clinician has reviewed this case.'
                    },
                    // ✅ NEW: expertSystem.js's rule activations (which
                    // DSM-pattern rule fired, its confidence, and its
                    // suggested intervention) were fully computed above but
                    // only ever fed into humanIntelligence's confidence
                    // nudge and consensusBuilder's blended opinions -
                    // never actually included in the response, so none of
                    // that detail (e.g. "PTSD Detection activated,
                    // confidence 0.75, suggests trauma-focused CBT/EMDR")
                    // ever reached a caseworker or the frontend. Same
                    // automated-heuristic labeling discipline as
                    // scoreComposition above.
                    expertRules: expertRules
                }
            });

        } catch (error) {
            console.error('Hybrid assessment error:', error);
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async scstAnalyze(req, res) {
        try {
            // email/caseNumber/court/courtroom/hearingDate/judgeName/
            // complainantName/accusedNames are all optional - only sent
            // from the Lawyer Assistant page's Quick Pattern Check when
            // the lawyer is logged in and chooses to track this check (see
            // _persistCase's caseNumber/court note).
            const { text, email, caseNumber, court, courtroom, hearingDate, judgeName, complainantName, accusedNames } = req.body;
            if (!text) {
                return res.status(400).json({ success: false, error: 'Text required' });
            }

            const result = this.scstTrainer.analyze(text);
            const lang = this.languageDetector.detect(text);
            const textAnalysis = this.textAnalyzer.analyze(text, lang);
            const legalGuidance = this.legalGuidance.getGuidanceForSCST(result);

            const caseId = `RAKSHAK-${Date.now().toString().slice(-8)}`;
            this._persistCase({
                caseId, text, language: lang,
                hybridDecision: { finalScores: textAnalysis.scores },
                scstAnalysis: result, legalGuidance, source: 'scst_tab',
                contact: email ? { email } : null,
                caseNumber, court, courtroom, hearingDate, judgeName, complainantName, accusedNames
            });

            res.status(200).json({
                success: true,
                caseId,
                data: {
                    scstAnalysis: result,
                    legalGuidance: legalGuidance,
                    textScores: textAnalysis.scores,
                    summary: textAnalysis.summary,
                    language: lang
                }
            });

        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Standalone "Legal tab" endpoint - lets the frontend show redressal
    // channels and provisions on their own, without running the full
    // clinical assessment. Accepts either raw text (runs SC/ST + light
    // clinical scoring itself) or previously-computed scores, so the legal
    // tab can also be refreshed from an assessment the user already ran.
    async legalGuidanceLookup(req, res) {
        try {
            const { text, finalScores } = req.body;

            if (!text && !finalScores) {
                return res.status(400).json({
                    success: false,
                    error: 'Provide either text to analyze, or finalScores from a prior assessment'
                });
            }

            let scstResult = null;
            let scores = finalScores || {};
            let expertRules = [];
            let dangerAssessment = null;

            if (text) {
                scstResult = this.scstTrainer.analyze(text);
                const lang = this.languageDetector.detect(text);
                const textAnalysis = this.textAnalyzer.analyze(text, lang);
                const aiResult = this.hybridAI.assess(textAnalysis, null, this.feedbackLearning.getLearnedParameters());
                scores = aiResult.scores;
                expertRules = this.expertSystem.applyRules(aiResult);
                // Needed for the same workplace-context/Danger-Assessment
                // disambiguation getGuidanceForClinical uses in the main
                // assessment path (see legalGuidance.js) - without it, this
                // standalone endpoint would silently fall back to the
                // weaker score-only heuristic for domestic_violence.
                dangerAssessment = this.humanIntelligence.synthesize(aiResult, expertRules, text).dangerAssessment;
            }

            const legalGuidance = this.legalGuidance.getCombinedGuidance(scstResult, scores, expertRules, text || '', dangerAssessment);

            res.status(200).json({
                success: true,
                data: { legalGuidance: legalGuidance }
            });

        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Lawyer tab: accepts either an uploaded document (PDF/DOCX/TXT) or
    // pasted case text, extracts the text if needed, and returns a
    // structured case summary - see models/caseSummarizer.js for the full
    // methodology and its scope/accuracy caveats.
    async summarizeCaseDocument(req, res) {
        try {
            const file = req.file;
            // email/caseNumber/court/courtroom/hearingDate/judgeName/
            // complainantName/accusedNames are optional, multer parses
            // them as regular body fields alongside the uploaded file for
            // a multipart request the same way it does for a pasted-text
            // JSON request - only present when the lawyer is logged in
            // and chooses to track this summary (see _persistCase's
            // caseNumber/court note).
            const { text: pastedText, email, caseNumber, court, courtroom, hearingDate, judgeName, complainantName, accusedNames } = req.body;

            if (!file && !pastedText) {
                return res.status(400).json({
                    success: false,
                    error: 'Upload a document (PDF/DOCX/TXT) or paste case text.'
                });
            }

            let text = pastedText || '';
            let extractionWarning = null;
            let sourceName = 'pasted text';

            if (file) {
                sourceName = file.originalname;
                const extracted = await this.documentParser.extractText(file.path, file.mimetype, file.originalname);
                fs.unlinkSync(file.path);
                text = extracted.text;
                extractionWarning = extracted.warning;
            }

            const summary = this.caseSummarizer.summarize(text);

            if (!summary.success) {
                return res.status(422).json({
                    success: false,
                    error: summary.error,
                    extractionWarning: extractionWarning
                });
            }

            // ✅ NEW: "follow up" tracking - only persisted when a logged-in
            // lawyer's email is provided, reusing the same _persistCase()
            // (and therefore the same "My Cases" lookup) every other
            // case-creating endpoint already uses.
            let caseId = null;
            if (email) {
                caseId = `RAKSHAK-${Date.now().toString().slice(-8)}`;
                this._persistCase({
                    caseId, text, language: 'en',
                    scstAnalysis: summary.rawScstResult,
                    legalGuidance: summary.applicableLaw,
                    source: 'lawyer_doc',
                    contact: { email },
                    caseNumber, court, courtroom, hearingDate, judgeName, complainantName, accusedNames
                });
            }

            res.status(200).json({
                success: true,
                caseId,
                data: {
                    sourceName: sourceName,
                    extractionWarning: extractionWarning,
                    summary: summary
                }
            });
        } catch (error) {
            console.error('Case summarization error:', error);
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // ============================================================
    //  PWA SHARE TARGET - receives a file/text shared from the phone's
    //  OS share sheet (see frontend/manifest.json's share_target). This
    //  is a real browser navigation (POST, not a fetch call the
    //  frontend's own JS controls), so the response must be a redirect
    //  to a real page - it can't just return JSON the way
    //  summarizeCaseDocument does. Extracts the text server-side (same
    //  DocumentParser as the normal upload flow), stashes it in the
    //  short-lived sharedDocumentCache, then redirects to the Lawyer
    //  Assistant page, which picks the text up via getSharedText below
    //  and drops it into the same textarea a manual paste would use -
    //  the user still reviews and explicitly clicks Generate, this never
    //  auto-runs an analysis on an unreviewed shared file.
    // ============================================================
    async shareTargetReceive(req, res) {
        try {
            const file = req.file;
            const { text: sharedText, title } = req.body || {};

            let text = sharedText || '';
            let sourceName = title || 'shared file';

            if (file) {
                sourceName = file.originalname;
                const extracted = await this.documentParser.extractText(file.path, file.mimetype, file.originalname);
                fs.unlinkSync(file.path);
                text = extracted.text;
            }

            if (!text || !text.trim()) {
                // Nothing usable came through (e.g. a scanned PDF, or an
                // empty share) - send them to the page anyway rather than
                // a dead-end error screen; they can still upload manually.
                return res.redirect(303, '/lawyer');
            }

            const token = crypto.randomBytes(16).toString('hex');
            this.sharedDocumentCache.set(token, {
                text,
                sourceName,
                expiresAt: Date.now() + 5 * 60 * 1000
            });

            res.redirect(303, `/lawyer?shared=${token}`);
        } catch (error) {
            console.error('Share target error:', error.message);
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            res.redirect(303, '/lawyer');
        }
    }

    // One-time-use lookup for the token shareTargetReceive hands off in
    // the redirect URL. Deleted on read (or after 5 minutes, whichever
    // is first) - this cache only ever needs to survive one page load.
    getSharedText(req, res) {
        const { token } = req.params;
        const entry = this.sharedDocumentCache.get(token);
        if (!entry) {
            return res.status(404).json({ success: false, error: 'This shared file has expired or was already loaded.' });
        }
        this.sharedDocumentCache.delete(token);
        res.status(200).json({ success: true, text: entry.text, sourceName: entry.sourceName });
    }

    async textAssessment(req, res) {
        try {
            const { text } = req.body;
            if (!text) {
                return res.status(400).json({ success: false, error: 'Text required' });
            }

            const lang = this.languageDetector.detect(text);
            const textAnalysis = this.textAnalyzer.analyze(text, lang);
            const scstResult = this.scstTrainer.analyze(text);

            res.status(200).json({
                success: true,
                data: {
                    scores: textAnalysis.scores,
                    language: lang,
                    summary: textAnalysis.summary,
                    scstAnalysis: scstResult
                }
            });

        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    _hybridDecision(aiResult, humanIntelligence, consensus, scstResult = null) {
        const aiScores = aiResult.scores || {};
        const humanScores = humanIntelligence.scores || {};
        const consensusScores = consensus.concerns || {};

        const finalScores = {};
        const allKeys = new Set([
            ...Object.keys(aiScores),
            ...Object.keys(humanScores),
            ...Object.keys(consensusScores)
        ]);

        for (const key of allKeys) {
            const ai = aiScores[key] || 0;
            const human = humanScores[key] || 0;
            const consensusScore = consensusScores[key] || 0;
            finalScores[key] = (ai * 0.6) + (human * 0.3) + (consensusScore * 0.1);
        }

        // ✅ FIX: the old svi was a flat, unweighted average across ALL 12
        // categories - including dissociation/hyperarousal/avoidance, which
        // text-only analysis never populates and are always 0. So a text that
        // was 100% on a single dangerous category (e.g. suicidal_ideation)
        // still got diluted down to ~8% ("Minimal") by 11 empty categories.
        // Use the same clinical weights as HybridAIService instead, which
        // only spreads weight across the categories that are actually scored.
        const svi = this._calculateWeightedSVI(finalScores);
        const severity = this._getSeverity(svi, finalScores, scstResult, humanIntelligence.dangerAssessment);
        // ✅ FIX: broken tie-breaking - `finalScores[a] > finalScores[b] ? a
        // : b` returns `b` on every tie, so the accumulator drifts to
        // whichever key is defined LAST in the object whenever scores are
        // equal (very common when most categories are 0). Combined with
        // protective_factors being the last-defined key, this meant a text
        // with weak/no signal would report "protective_factors" - a
        // POSITIVE indicator - as the primary *concern*. Fixed the tie-
        // break (>=, keeps the earlier/more clinically-relevant key) and
        // excluded protective_factors from candidacy entirely.
        const concernKeys = Object.keys(finalScores).filter(k => k !== 'protective_factors');
        const maxConcernValue = concernKeys.length > 0 ? Math.max(...concernKeys.map(k => finalScores[k])) : 0;
        const primaryConcern = maxConcernValue > 0
            ? concernKeys.reduce((a, b) => finalScores[a] >= finalScores[b] ? a : b)
            : 'none';

        return {
            finalScores: finalScores,
            severity: severity,
            primaryConcern: primaryConcern,
            // ✅ FIX: previously scstAnalysis ran entirely separately from
            // the headline SVI, so a Critical caste-atrocity finding never
            // showed up in the main score a victim or authority sees. Only
            // blend it in when backed by an actual matched pattern (see
            // _getSeverity note) - not a lone auto-extracted keyword hit.
            // ✅ FIX: same community-evidence requirement as _getSeverity's
            // scst_atrocity check below - a matched pattern alone (e.g.
            // coercive_silencing on general threat language) isn't enough
            // to blend the SC/ST severity number into the headline SVI.
            svi: Math.max(severity.displaySvi, ((scstResult?.patterns?.length > 0 && scstResult?.communities?.length > 0) ? scstResult.severity : 0)),
            confidence: Math.min(((aiResult.confidence || 0.7) + (humanIntelligence.confidence || 0)) / 2, 1),
            recommendations: this._generateRecommendations(severity, primaryConcern, finalScores, humanIntelligence.dangerAssessment),
            // ✅ NEW: surfaces the clinical-methodology integrations (see
            // humanIntelligence.js header) so the frontend can show them,
            // clearly labeled as automated approximations.
            clinicalReasoning: {
                impressions: humanIntelligence.impressions,
                symptomPattern: humanIntelligence.symptomPattern,
                dangerAssessment: humanIntelligence.dangerAssessment,
                riskFormulation: humanIntelligence.riskFormulation
            }
        };
    }

    // ✅ UPDATED: dissociation/hyperarousal/avoidance now DO have real
    // keyword-driven signal (see textAnalyzer.js's DSM-5 symptom-cluster
    // categories) - they're still excluded from the headline SVI weighting
    // below to avoid having to rebalance every existing weight, but they
    // now feed humanIntelligence.js's cross-cluster PTSD pattern check
    // instead, which is a more clinically meaningful use of them than
    // folding them into one more weighted average term.
    _calculateWeightedSVI(finalScores) {
        const weights = {
            trauma: 0.25,
            depression: 0.20,
            anxiety: 0.15,
            suicidal_ideation: 0.15,
            vulnerability: 0.10,
            intimidation: 0.10,
            stress: 0.05
        };
        let svi = 0;
        for (const [key, weight] of Object.entries(weights)) {
            svi += (finalScores[key] || 0) * weight * 100;
        }
        return svi;
    }

    _getSeverity(svi, finalScores = {}, scstResult = null, dangerAssessment = null) {
        const levelOrder = ['Minimal', 'Mild', 'Moderate', 'Severe', 'Critical'];
        const meta = {
            Critical: { emoji: '🔴', color: '#d63031', priority: 'emergency' },
            Severe: { emoji: '🟠', color: '#e17055', priority: 'high' },
            Moderate: { emoji: '🟡', color: '#fdcb6e', priority: 'medium' },
            Mild: { emoji: '🟢', color: '#00b894', priority: 'low' },
            Minimal: { emoji: '🟢', color: '#00b894', priority: 'normal' }
        };

        const tierFor = (score) => {
            if (score > 75) return 'Critical';
            if (score > 50) return 'Severe';
            if (score > 30) return 'Moderate';
            if (score > 15) return 'Mild';
            return 'Minimal';
        };

        let level = tierFor(svi);
        const originalLevel = level;

        // ✅ FIX: clinical escalation. A high score in a single dangerous
        // domain (especially suicidal ideation) must never be able to hide
        // behind a low blended average - this mirrors how the C-SSRS field
        // already behaves. Whichever gives the WORSE (higher) outcome wins.
        const escalationRules = [
            { key: 'suicidal_ideation', threshold: 0.7, minLevel: 'Critical' },
            { key: 'suicidal_ideation', threshold: 0.35, minLevel: 'Severe' },
            { key: 'suicidal_ideation', threshold: 0.15, minLevel: 'Moderate' },
            { key: 'trauma', threshold: 0.75, minLevel: 'Severe' },
            // ✅ NEW: closes a real gap - a credible single-domain
            // disclosure in the 50-74% range (e.g. "supervisor made sexual
            // comments and touched me inappropriately" scored 60% trauma)
            // previously sat wherever the raw blended average landed
            // ("Mild"), since it fell just under the 75% Severe threshold.
            // A high-but-not-extreme reading in one dangerous domain still
            // deserves more than "Mild".
            { key: 'trauma', threshold: 0.5, minLevel: 'Moderate' },
            { key: 'intimidation', threshold: 0.75, minLevel: 'Severe' },
            { key: 'intimidation', threshold: 0.5, minLevel: 'Moderate' },
            // ✅ NEW: coercive-control language ("controls my finances",
            // "won't let me see my friends", "walking on eggshells") is a
            // well-documented independent risk marker in domestic-violence
            // research - controlling behavior often predicts escalation to
            // violence even before any has occurred yet. Without this rule,
            // detecting this language had no effect on the actual outcome.
            { key: 'vulnerability', threshold: 0.75, minLevel: 'Moderate' }
        ];

        let escalatedBy = null;
        for (const rule of escalationRules) {
            const score = finalScores[rule.key];
            if (score !== undefined && score >= rule.threshold &&
                levelOrder.indexOf(rule.minLevel) > levelOrder.indexOf(level)) {
                level = rule.minLevel;
                escalatedBy = rule.key;
            }
        }

        // ✅ FIX: SC/ST atrocity detection previously ran completely
        // separately from this headline severity, so a Critical caste-
        // based atrocity finding never surfaced on the main assessment a
        // victim, authority, or dashboard actually looks at. Same worst-
        // case-wins rule as above, on the same 0-100 scale.
        // Requires an actual matched PATTERN (curated, reviewed keyword
        // sets) AND identified community evidence - patterns alone are not
        // enough, because several patterns (coercive_silencing,
        // police_brutality, sexual_abuse_indirect) use general threat/abuse
        // language that legitimately matches ANY context, caste-related or
        // not. E.g. "he threatened to kill me" alone matched
        // coercive_silencing and mislabeled a plain domestic-violence case
        // as a caste atrocity, with no community ever identified. The Act's
        // protections hinge on the victim's caste/tribal identity, so
        // that identification should be required, not just an abuse
        // pattern that happens to overlap.
        if (scstResult && scstResult.severity > 0 &&
            scstResult.patterns && scstResult.patterns.length > 0 &&
            scstResult.communities && scstResult.communities.length > 0) {
            const scstLevel = tierFor(scstResult.severity);
            if (levelOrder.indexOf(scstLevel) > levelOrder.indexOf(level)) {
                level = scstLevel;
                escalatedBy = 'scst_atrocity';
            }
        }

        // ✅ NEW: Danger Assessment-inspired escalation. Strangulation and
        // similar high-lethality IPV markers are validated predictors of
        // future serious/lethal violence even when no single distress
        // category (trauma, fear, etc.) alone crosses a high threshold -
        // the danger lives in the specific risk factor, not necessarily in
        // how distressed the person currently sounds. See
        // humanIntelligence.js for methodology and caveats.
        if (dangerAssessment && dangerAssessment.elevatedLethalityRisk &&
            levelOrder.indexOf('Severe') > levelOrder.indexOf(level)) {
            level = 'Severe';
            escalatedBy = 'danger_assessment';
        }

        // ✅ FIX: escalation rules above only ever changed the LABEL
        // (level). The numeric SVI kept showing the raw pre-escalation
        // weighted average - e.g. 87% suicide risk correctly escalated
        // the badge to "Critical", but the gauge/number still showed "17"
        // (the blended average across mostly-zero categories), which
        // looks flatly contradictory next to a "Critical" badge and
        // undermines trust in the whole result. If escalation actually
        // moved the tier, the displayed number now moves with it.
        const TIER_FLOOR = { Critical: 80, Severe: 60, Moderate: 40, Mild: 20, Minimal: 0 };
        const displaySvi = level !== originalLevel ? Math.max(svi, TIER_FLOOR[level]) : svi;

        return { level, ...meta[level], escalatedBy, displaySvi };
    }

    _generateRecommendations(severity, primaryConcern, scores, dangerAssessment = null) {
        const recs = [];

        if (severity.level === 'Critical') {
            recs.push('🚨 EMERGENCY: Immediate intervention required. Call 112');
            recs.push('Activate crisis intervention protocol');
        }

        if (severity.level === 'Severe') {
            recs.push('Immediate trauma-informed counseling required');
            recs.push('Contact mental health helpline: 1800-599-0019');
        }

        if (scores.suicidal_ideation && scores.suicidal_ideation > 0.6) {
            recs.push('⚠️ Suicide risk detected - Immediate crisis intervention');
            recs.push('Contact suicide prevention helpline: 1800-599-0019');
        }

        if (scores.trauma && scores.trauma > 0.6) {
            recs.push('Refer to trauma-informed therapy (CBT/EMDR)');
        }

        // ✅ NEW: safety-planning guidance, triggered specifically by the
        // Danger Assessment-inspired lethality risk check - this is
        // standard content used by DV advocates (identify a safe exit,
        // keep essential documents/items accessible, agree a code word),
        // not generic advice, and is surfaced separately from general
        // trauma-therapy recommendations since the priority here is
        // physical safety, not processing/treatment.
        if (dangerAssessment && dangerAssessment.elevatedLethalityRisk) {
            recs.push('⚠️ Elevated safety risk indicators present - connect with a domestic violence advocate for safety planning');
            recs.push('Contact Women\'s Helpline (181) for confidential safety planning support');
            recs.push('Consider: a safe place to go, essential documents/phone accessible, a trusted contact who knows the situation');
        }

        if (recs.length === 0) {
            recs.push('Continued monitoring and supportive therapy');
        }

        return recs;
    }

    // Helplines and resources
    getHelplines(req, res) {
        res.status(200).json({
            success: true,
            data: {
                nhaa: '14566',
                national: '1800-599-0019',
                emergency: '112',
                police: '100',
                ambulance: '102',
                women: '1091',
                child: '1098',
                suicide: '1800-599-0019',
                legal: '15100'
            }
        });
    }

    getResources(req, res) {
        res.status(200).json({
            success: true,
            data: {
                mentalHealth: 'www.nimhans.ac.in',
                legalAid: 'www.nalsa.gov.in',
                // ⚠️ FIX: NCSC (Scheduled Castes) and NCST (Scheduled
                // Tribes) are two separate constitutional commissions with
                // separate websites - the old single 'ncscst.nic.in' entry
                // was not a real, correct URL for either body.
                scCommission: 'www.ncsc.nic.in',
                stCommission: 'www.ncst.nic.in',
                crisisSupport: 'www.helplineindia.in'
            }
        });
    }

    // Full redressal-channel directory for a static "Legal tab" panel,
    // independent of any specific case analysis.
    getRedressalChannels(req, res) {
        res.status(200).json({
            success: true,
            data: {
                channels: this.legalGuidance.redressalChannels,
                disclaimer: this.legalGuidance.disclaimer
            }
        });
    }

    getLanguages(req, res) {
        res.status(200).json({
            success: true,
            data: this.languageDetector.getSupportedLanguages()
        });
    }

    // ============================================================
    //  CASE MANAGEMENT (authority dashboard)
    // ============================================================
    listCases(req, res) {
        try {
            let cases = this.db.getAllCases();

            const { severity, status, search } = req.query;
            if (severity) {
                cases = cases.filter(c => (c.severity || '').toLowerCase() === severity.toLowerCase());
            }
            if (status) {
                cases = cases.filter(c => (c.status || '').toLowerCase() === status.toLowerCase());
            }
            if (search) {
                const q = search.toLowerCase();
                cases = cases.filter(c =>
                    (c.text || '').toLowerCase().includes(q) ||
                    (c.id || '').toLowerCase().includes(q) ||
                    (c.primaryConcern || '').toLowerCase().includes(q)
                );
            }

            res.status(200).json({
                success: true,
                data: { cases, total: cases.length, stats: this.db.getStats() }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    getCaseById(req, res) {
        const caseRecord = this.db.getCase(req.params.id);
        if (!caseRecord) {
            return res.status(404).json({ success: false, error: 'Case not found' });
        }
        res.status(200).json({ success: true, data: caseRecord });
    }

    updateCase(req, res) {
        try {
            const caseRecord = this.db.getCase(req.params.id);
            if (!caseRecord) {
                return res.status(404).json({ success: false, error: 'Case not found' });
            }
            const { status, officer, notes, courtStatus, courtroom, hearingDate, judgeName, complainantName, accusedNames } = req.body;
            const updated = {
                ...caseRecord,
                status: status || caseRecord.status,
                officer: officer || caseRecord.officer,
                notes: notes !== undefined ? notes : caseRecord.notes,
                // ✅ NEW: court-proceeding tracking fields (see
                // _persistCase's note on why this is separate from
                // `status`) - each editable independently, falling back to
                // the existing value when omitted so a partial PATCH (e.g.
                // just updating the hearing date) doesn't blank out the rest.
                courtStatus: courtStatus || caseRecord.courtStatus || 'Pending',
                courtroom: courtroom !== undefined ? (courtroom || null) : (caseRecord.courtroom ?? null),
                hearingDate: hearingDate !== undefined ? (hearingDate || null) : (caseRecord.hearingDate ?? null),
                judgeName: judgeName !== undefined ? (judgeName || null) : (caseRecord.judgeName ?? null),
                complainantName: complainantName !== undefined ? (complainantName || null) : (caseRecord.complainantName ?? null),
                accusedNames: accusedNames !== undefined
                    ? String(accusedNames).split(',').map(n => n.trim()).filter(Boolean)
                    : (caseRecord.accusedNames || []),
                lastUpdated: new Date().toISOString()
            };
            // Database.saveCase() prepends a new record rather than editing
            // in place, so remove the old one first to avoid a duplicate.
            this.db.deleteCase(req.params.id);
            const saved = this.db.saveCase(updated);
            res.status(200).json({ success: true, data: saved });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    deleteCaseRecord(req, res) {
        this.db.deleteCase(req.params.id);
        res.status(200).json({ success: true });
    }
}

export default NHHAController;