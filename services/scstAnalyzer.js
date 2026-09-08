// ================================================================
//  SC/ST ANALYZER - Case-Sensitive Pattern Recognition
//  Uses trained models to analyze text for atrocity patterns
// ================================================================

import SCSTTrainer from '../models/scstTrainer.js';

class SCSTAnalyzer {
    constructor() {
        this.trainer = new SCSTTrainer();
        // Models are loaded automatically in trainer constructor
    }

    analyze(text) {
        if (!text || text.trim().length < 2) {
            return this._emptyResult();
        }

        // Use the trained SC/ST model
        const result = this.trainer.analyze(text);

        return {
            severity: result.severity,
            severityLevel: result.severityLevel,
            confidence: result.confidence,
            patterns: result.patterns,
            communities: result.communities,
            keywords: result.keywords,
            victimTestimonyDetected: result.victimTestimonyDetected,
            requiresPriorityReview: result.requiresPriorityReview,
            summary: this._generateSummary(result)
        };
    }

    _generateSummary(result) {
        // ✅ Victim-centric: lead with the priority-review flag rather than
        // burying it after severity/pattern detail, since that's the signal
        // a caseworker triaging a queue needs first.
        let summary = '';

        if (result.requiresPriorityReview) {
            summary += '🚩 PRIORITY REVIEW: firsthand victim account of a severe/critical pattern. ';
        }

        summary += 'SC/ST analysis complete. ';
        
        if (result.severityLevel === 'Critical' || result.severityLevel === 'Severe') {
            summary += `⚠️ ${result.severityLevel} severity detected. `;
        } else if (result.severityLevel === 'Moderate') {
            summary += `📋 Moderate severity detected. `;
        } else {
            summary += `✅ No significant patterns detected. `;
        }

        if (result.patterns.length > 0) {
            summary += `Patterns: ${result.patterns.map(p => p.name).join(', ')}. `;
        }

        if (result.communities.length > 0) {
            summary += `Affected communities: ${result.communities.join(', ')}. `;
        }

        if (result.victimTestimonyDetected) {
            summary += 'Firsthand victim testimony markers detected. ';
        }

        return summary;
    }

    _emptyResult() {
        return {
            severity: 0,
            severityLevel: 'Low',
            confidence: 0,
            patterns: [],
            communities: [],
            keywords: [],
            victimTestimonyDetected: false,
            requiresPriorityReview: false,
            summary: 'No text provided for analysis.'
        };
    }
}

export default SCSTAnalyzer;