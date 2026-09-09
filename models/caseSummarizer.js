// ================================================================
//  CASE SUMMARIZER - structured summary of an uploaded SC/ST atrocity
//  or sexual-offence case document, for the Lawyer tab.
//
//  ⚠️ METHODOLOGY / SCOPE NOTE - read before trusting output:
//  This is NOT a large-language-model abstractive summarizer. It is a
//  deterministic, rule-based pipeline: extractive sentence scoring
//  (salience-weighted, not learned) + regex-based entity extraction
//  (FIR numbers, sections, dates, party labels) + the SAME scstTrainer.js
//  atrocity-pattern engine and legalGuidance.js provisions/case-law
//  lookup already verified elsewhere in this app, run against the
//  document text instead of a victim's own disclosure.
//
//  Why not a real LLM summarizer: building one requires either a paid
//  API (explicitly ruled out for this project) or downloading a local
//  model, which this deployment's network cannot reach (see
//  services/semanticAnalyzer.js's header for the same constraint,
//  confirmed earlier). A deterministic pipeline has a real advantage
//  here anyway - it is inspectable, reproducible, and never invents
//  facts not present in the source text, which matters far more for a
//  legal document than fluent prose.
//
//  This tool produces a DRAFTING AID, never a replacement for actually
//  reading the source document - see the disclaimer on every summary.
// ================================================================

import SCSTTrainer from './scstTrainer.js';
import LegalGuidance from './legalGuidance.js';

class CaseSummarizer {
    constructor() {
        this.scstTrainer = new SCSTTrainer();
        this.legalGuidance = new LegalGuidance();

        // Sentences containing these terms are more likely to carry the
        // core facts of a legal case document (who/what/when/where/under
        // what law) than a sentence that doesn't - used as a salience
        // signal for extractive summarization, not as a detection engine
        // (that's scstTrainer.js's job, reused separately below).
        this.salienceTerms = [
            'accused', 'victim', 'complainant', 'petitioner', 'respondent',
            'witness', 'fir', 'chargesheet', 'charge sheet', 'investigation',
            'investigating officer', 'arrested', 'bail', 'custody', 'remand',
            'evidence', 'statement', 'testimony', 'deposition',
            'medical examination', 'post-mortem', 'postmortem', 'forensic',
            'conviction', 'convicted', 'acquittal', 'acquitted', 'sentence',
            'sentenced', 'compensation', 'section', 'act,', 'the act',
            'atrocities act', 'scheduled caste', 'scheduled tribe', 'sc/st',
            'court', 'judge', 'sessions court', 'special court', 'high court',
            'supreme court', 'police station', 'occurred', 'incident',
            'alleged', 'allegedly', 'on the date', 'thereafter', 'subsequently'
        ];

        this.sectionActPatterns = [
            // SC/ST Atrocities Act citations, e.g. "Section 3(1)(r)", "Section 3(2)(v)"
            /\bsection\s+\d+[\w()./]*\s+(?:of\s+)?(?:the\s+)?(?:sc\/st|scheduled castes?\s+and\s+scheduled\s+tribes?)[\w\s,()]*act[,]?\s*\d{4}/gi,
            // General "Section X of the Y Act" or "Section X IPC/BNS/POCSO"
            /\bsection\s+\d+[\w()./]*\s*(?:of\s+the\s+[\w\s]+act[,]?\s*\d{4})?/gi,
            /\bu\/s\.?\s*\d+[\w()./]*(?:\s+(?:ipc|bns|pocso|crpc|bnss))?/gi,
            /\b(?:ipc|bns|pocso|bnss|crpc|bsa)\s*(?:section)?\s*\d+[\w()./]*/gi
        ];

        this.datePatterns = [
            /\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b/g,
            /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)[,]?\s+\d{4}\b/gi
        ];

        this.firPattern = /\bF\.?I\.?R\.?\s*(?:No\.?|Number)?\s*[:\-]?\s*(\d+[\/\-]?\d*(?:\/\d{2,4})?)/gi;

        // ✅ FIX: missing the `i` flag meant "Complainant:", "Accused:" (the
        // normal capitalized form at the start of a case-document line)
        // never matched at all - only an all-lowercase "complainant:" would
        // have, which real documents essentially never use. Party
        // extraction was silently empty on every realistic input.
        this.partyLabelPattern = /\b(complainant|victim|accused|petitioner|respondent|appellant|witness|informant|investigating officer)\s*[:\-]\s*([A-Z][A-Za-z.\s]{2,40}?)(?=[\n.,;]|$)/gi;

        this.courtPattern = /\b((?:special\s+)?(?:sessions?\s+court|exclusive\s+special\s+court|district\s+court|high\s+court|supreme\s+court)(?:\s+of\s+[A-Z][A-Za-z\s]+)?)/gi;
    }

    _splitSentences(text) {
        // Deliberately simple - splits on sentence-ending punctuation
        // followed by whitespace and a capital/digit, which handles legal
        // prose (heavy on "Sec.", "No.", "Dr." abbreviations) reasonably
        // well without pulling in a full NLP sentence tokenizer.
        return text
            .replace(/\s+/g, ' ')
            .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
            .map(s => s.trim())
            .filter(s => s.length > 15 && s.length < 600);
    }

    _extractEntities(text) {
        const firNumbers = [...new Set([...text.matchAll(this.firPattern)].map(m => m[1]).filter(Boolean))];

        const sectionsAndActsCited = [...new Set(
            this.sectionActPatterns.flatMap(re => [...text.matchAll(re)].map(m => m[0].trim()))
        )].slice(0, 25);

        const dates = [...new Set(
            this.datePatterns.flatMap(re => [...text.matchAll(re)].map(m => m[0].trim()))
        )].slice(0, 20);

        const parties = [...new Set(
            [...text.matchAll(this.partyLabelPattern)].map(m => `${m[1]}: ${m[2].trim()}`)
        )].slice(0, 15);

        const courtsMentioned = [...new Set(
            [...text.matchAll(this.courtPattern)].map(m => m[1].trim())
        )].slice(0, 10);

        return { firNumbers, sectionsAndActsCited, dates, parties, courtsMentioned };
    }

    // Extractive summarization: score every sentence by salience-term
    // density, position (legal documents tend to front-load and
    // conclude with the operative facts/findings), and presence of a
    // concrete entity (date, section, party label) - then return the
    // top-scoring sentences IN THEIR ORIGINAL ORDER, so the summary
    // still reads as a coherent narrative rather than a shuffled list.
    _extractKeyFacts(sentences, maxSentences = 8) {
        if (sentences.length <= maxSentences) return sentences;

        const scored = sentences.map((sentence, index) => {
            const lower = sentence.toLowerCase();
            let score = 0;

            for (const term of this.salienceTerms) {
                if (lower.includes(term)) score += 2;
            }
            if (/\d/.test(sentence)) score += 1; // dates, ages, section numbers, FIR numbers
            if (index < 3 || index >= sentences.length - 3) score += 3; // opening/closing bonus
            const wordCount = sentence.split(/\s+/).length;
            if (wordCount >= 8 && wordCount <= 60) score += 1; // penalize fragments/run-ons

            return { sentence, index, score };
        });

        return scored
            .sort((a, b) => b.score - a.score)
            .slice(0, maxSentences)
            .sort((a, b) => a.index - b.index)
            .map(s => s.sentence);
    }

    _buildOverview(keyFacts, scstResult, entities) {
        // ✅ FIX: scstTrainer.js pushes matched patterns in object-key
        // insertion order (gang_rape, child_abuse, sexual_abuse_indirect,
        // police_brutality, discrimination, ...), NOT by severity - so
        // patterns[0] was often a lower-severity match while a more
        // serious one sat later in the array. Picks the highest-severity
        // matched pattern for the overview instead.
        const topPattern = scstResult && scstResult.patterns && scstResult.patterns.length > 0
            ? scstResult.patterns.reduce((a, b) => (b.severity > a.severity ? b : a))
            : null;

        const parts = [];
        if (topPattern) {
            // Lowercase only the first character, not the whole
            // description - several descriptions contain "SC/ST", act
            // names, etc. that should stay capitalized.
            const desc = topPattern.description.charAt(0).toLowerCase() + topPattern.description.slice(1);
            parts.push(`This document describes a matter consistent with ${desc}.`);
        }
        if (entities.firNumbers.length > 0) {
            parts.push(`FIR reference(s) mentioned: ${entities.firNumbers.join(', ')}.`);
        }
        if (entities.courtsMentioned.length > 0) {
            parts.push(`Court(s) mentioned: ${entities.courtsMentioned.join(', ')}.`);
        }
        if (parts.length === 0 && keyFacts.length > 0) {
            // No pattern/entities found at all - fall back to the single
            // highest-salience sentence rather than showing nothing.
            parts.push(keyFacts[0]);
        }
        return parts.join(' ');
    }

    _suggestNextSteps(scstResult, guidance, entities, documentRequiresPriorityReview) {
        const steps = [];

        if (entities.firNumbers.length === 0) {
            steps.push('No FIR number was detected in this document - if one has not yet been filed, note that under the Atrocities Act a police officer cannot require a preliminary inquiry before registering an FIR (Section 18A), and NALSA legal aid (15100) is available free of cost.');
        }

        if (documentRequiresPriorityReview) {
            steps.push('This document was flagged for priority review based on the severity of the matched pattern(s) - treat case-timeline steps below as time-sensitive.');
        }

        if (guidance && guidance.scstGuidance) {
            steps.push('Cross-check the matched Atrocities Act provisions and case law below against the investigation stage already reached (FIR / chargesheet / trial) to confirm the right procedural safeguards are in place for this case.');
        }

        if (entities.dates.length === 0) {
            steps.push('No dates were detected - verify the incident date and any statutory limitation period directly against the source document.');
        }

        steps.push('Verify every extracted detail (FIR number, sections, dates, party names) against the original document before using this summary in any filing or presentation - this is a drafting aid, not a substitute for reading the source.');

        return steps;
    }

    /**
     * @param {string} text - raw extracted document text
     * @returns structured case summary
     */
    summarize(text) {
        if (!text || text.trim().length < 50) {
            return {
                success: false,
                error: 'Document text is too short to summarize (under 50 characters after extraction). If this was a scanned/image PDF, this tool cannot read it - only text-based PDFs, DOCX, and plain text are supported.'
            };
        }

        const sentences = this._splitSentences(text);
        const keyFacts = this._extractKeyFacts(sentences);
        const entities = this._extractEntities(text);

        // Reuse the same, already-verified atrocity-pattern engine and
        // legal-provisions lookup used throughout the rest of this app -
        // never a second, parallel implementation of pattern/law matching.
        const scstResult = this.scstTrainer.analyze(text);
        const guidance = this.legalGuidance.getGuidanceForSCST(scstResult);

        // ✅ FIX: real gap found auditing this feature - scstResult.
        // requiresPriorityReview requires 2+ FIRST-PERSON markers
        // ("I"/"me"/"my") alongside a Severe/Critical pattern (see
        // scstTrainer.js's firstPersonMarkers comment) - a deliberate
        // design for victim self-disclosure text, where firsthand voice
        // is a genuine urgency signal distinct from third-party/news-
        // style reporting. But case DOCUMENTS (FIRs, chargesheets,
        // judgments) are written in third person as a matter of format,
        // not credibility - "the accused gang-raped the victim" is
        // exactly as urgent as "he raped me", just grammatically
        // different. Applying the first-person gate here meant a
        // Critical-severity case document could NEVER be flagged for
        // priority review, regardless of severity - confirmed on a real
        // test case (severity 100, requiresPriorityReview still false).
        // A document already representing an official record doesn't
        // need a firsthand-voice check the way anonymous crisis-line
        // text does - severity alone is the right, sufficient signal
        // here. Additive to (never downgrading) scstTrainer's own flag.
        const documentRequiresPriorityReview = (scstResult.severity || 0) > 70 || !!scstResult.requiresPriorityReview;

        const overview = this._buildOverview(keyFacts, scstResult, entities);
        const nextSteps = this._suggestNextSteps(scstResult, guidance, entities, documentRequiresPriorityReview);

        return {
            success: true,
            caseOverview: overview,
            keyFacts: keyFacts,
            extractedEntities: entities,
            // Sorted by severity, not scstTrainer.js's object-key insertion
            // order - see the same fix in _buildOverview above.
            detectedOffenseCategories: (scstResult.patterns || [])
                .map(p => ({ name: p.name, description: p.description, severity: p.severity }))
                .sort((a, b) => b.severity - a.severity),
            communitiesIdentified: scstResult.communities || [],
            overallSeverity: scstResult.severity || 0,
            requiresPriorityReview: documentRequiresPriorityReview,
            applicableLaw: guidance,
            suggestedNextSteps: nextSteps,
            documentStats: {
                characterCount: text.length,
                wordCount: text.split(/\s+/).filter(Boolean).length,
                sentenceCount: sentences.length
            },
            methodology: 'Extractive summary (salience-scored sentence selection) + rule-based entity extraction + the same atrocity-pattern/legal-provisions engine used elsewhere in this app - not a generative AI summary. See file header for why.',
            disclaimer: 'This is an AI-assisted DRAFTING AID, not a certified or verified case summary. It may miss context, misread ambiguous phrasing, or fail to extract details the source document states differently than expected. Always verify every fact, section number, date, and party name against the original document before relying on this in any filing, submission, or court presentation.',
            // ✅ NEW: internal-use passthrough (not meant for direct
            // display, though harmless if shown) - lets the controller
            // persist this result via the same _persistCase() every other
            // case-creating endpoint uses, without a second parallel
            // implementation of what a "scstAnalysis"-shaped object looks
            // like. requiresPriorityReview is overridden to the corrected
            // documentRequiresPriorityReview (see above) rather than left
            // as scstTrainer.js's raw, first-person-gated value - a
            // persisted case should show the same priority flag this
            // summary itself displays, not the pre-fix one.
            rawScstResult: { ...scstResult, requiresPriorityReview: documentRequiresPriorityReview }
        };
    }
}

export default CaseSummarizer;
