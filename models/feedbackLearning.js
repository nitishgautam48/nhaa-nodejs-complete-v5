// ================================================================
//  FEEDBACK LEARNING - Learn from Human Feedback
// ================================================================

class FeedbackLearning {
    constructor() {
        this.feedbackData = [];
        this.corrections = [];
        this.learnedParameters = {};
    }

    recordFeedback(caseId, feedbackType, correction = null) {
        const feedback = {
            caseId: caseId,
            feedbackType: feedbackType,
            timestamp: new Date().toISOString()
        };
        this.feedbackData.push(feedback);

        if (correction) {
            this.corrections.push(correction);
            this._learnFromFeedback();
        }

        return this.feedbackData.length;
    }

    _learnFromFeedback() {
        if (this.corrections.length < 5) return;

        const patterns = {};
        for (const corr of this.corrections) {
            for (const [key, value] of Object.entries(corr)) {
                if (!patterns[key]) patterns[key] = [];
                patterns[key].push(value);
            }
        }

        for (const [key, values] of Object.entries(patterns)) {
            if (values.length > 0) {
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                // Clamp to a small adjustment range - this is a nudge based on
                // aggregated caseworker corrections, not a replacement for the
                // underlying signal, so it shouldn't be able to swing a score
                // by more than +/-0.15.
                this.learnedParameters[key] = Math.max(-0.15, Math.min(avg * 0.1, 0.15));
            }
        }
    }

    // ✅ NEW: previously learnedParameters was computed but nothing ever read
    // it - feedback had zero effect on future assessments. This getter lets
    // HybridAIService pull the current adjustments and apply them.
    getLearnedParameters() {
        return { ...this.learnedParameters };
    }

    getCount() {
        return this.feedbackData.length;
    }

    getProgress() {
        return {
            total: this.feedbackData.length,
            learned: Object.keys(this.learnedParameters).length,
            remaining: this.feedbackData.length - Object.keys(this.learnedParameters).length
        };
    }
}

export default FeedbackLearning;