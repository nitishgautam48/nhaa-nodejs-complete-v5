// ================================================================
//  CLINICAL SCALES - PHQ-9, GAD-7, PCL-5, C-SSRS
// ================================================================

class ClinicalScales {
    constructor() {
        this.scaleRanges = {
            phq9: {
                minimal: [0, 4],
                mild: [5, 9],
                moderate: [10, 14],
                severe: [15, 19],
                critical: [20, 27]
            },
            gad7: {
                minimal: [0, 4],
                mild: [5, 9],
                moderate: [10, 14],
                severe: [15, 21]
            },
            pcl5: {
                minimal: [0, 15],
                mild: [16, 25],
                moderate: [26, 35],
                severe: [36, 50],
                critical: [51, 80]
            }
        };
    }

    calculate(aiResult) {
        const scores = aiResult.scores || {};
        
        // Use ?? instead of || so a genuine 0 score (no signal detected) stays 0
        // instead of being silently replaced with a fake 0.5 "Moderate" baseline.
        const phq9 = this._mapToScale(scores.depression ?? 0.5, this.scaleRanges.phq9);
        const gad7 = this._mapToScale(scores.anxiety ?? 0.5, this.scaleRanges.gad7);
        const pcl5 = this._mapToScale(scores.trauma ?? 0.5, this.scaleRanges.pcl5);

        return {
            phq9: {
                score: phq9,
                severity: this._getScaleSeverity(phq9, this.scaleRanges.phq9)
            },
            gad7: {
                score: gad7,
                severity: this._getScaleSeverity(gad7, this.scaleRanges.gad7)
            },
            pcl5: {
                score: pcl5,
                severity: this._getScaleSeverity(pcl5, this.scaleRanges.pcl5)
            },
            cssrs: this._calculateCSSRS(scores)
        };
    }

    _mapToScale(score, ranges) {
        let maxScore = 0;
        for (const [severity, [min, max]] of Object.entries(ranges)) {
            maxScore = Math.max(maxScore, max || 0);
        }
        return Math.round(score * maxScore);
    }

    _getScaleSeverity(score, ranges) {
        for (const [severity, [min, max]] of Object.entries(ranges)) {
            if (score >= min && score <= max) {
                return severity.charAt(0).toUpperCase() + severity.slice(1);
            }
        }
        return 'Unknown';
    }

    _calculateCSSRS(scores) {
        const risk = scores.suicidal_ideation || 0;
        if (risk > 0.7) {
            return {
                risk: 'Critical',
                level: 7,
                requires_intervention: true
            };
        } else if (risk > 0.5) {
            return {
                risk: 'High',
                level: 5,
                requires_intervention: true
            };
        } else if (risk > 0.3) {
            return {
                risk: 'Moderate',
                level: 3,
                requires_intervention: false
            };
        }
        return {
            risk: 'Low',
            level: 1,
            requires_intervention: false
        };
    }
}

export default ClinicalScales;