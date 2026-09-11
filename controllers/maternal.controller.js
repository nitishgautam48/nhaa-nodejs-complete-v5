// ================================================================
//  MATERNAL RISK TRIAGE CONTROLLER
// ================================================================

import MaternalTextAnalyzer from '../services/maternalTextAnalyzer.js';
import MaternalVitalsRules from '../models/maternalVitalsRules.js';
import MaternalHybridAssessment from '../models/maternalHybridAssessment.js';
import MaternalRiskFormulation from '../models/maternalRiskFormulation.js';
import MaternalDangerLadder from '../models/maternalDangerLadder.js';
import MaternalExpertSystem from '../models/maternalExpertSystem.js';
import MaternalTriage from '../models/maternalTriage.js';

class MaternalController {
    constructor() {
        this.textAnalyzer = new MaternalTextAnalyzer();
        this.vitalsRules = new MaternalVitalsRules();
        this.hybridAssessment = new MaternalHybridAssessment();
        this.riskFormulation = new MaternalRiskFormulation();
        this.dangerLadder = new MaternalDangerLadder();
        this.expertSystem = new MaternalExpertSystem();
        this.triage = new MaternalTriage();
    }

    // Accepts { text, vitals, history } - all optional but at least one of
    // text/vitals should be present for a meaningful result. `history` is
    // a structured booking-form object (see maternalRiskFormulation.js for
    // its recognized boolean keys, e.g. prior_csection, regular_anc_visits).
    async assess(req, res) {
        try {
            const { text, vitals, history } = req.body || {};

            if (!text && !vitals) {
                return res.status(400).json({
                    success: false,
                    error: 'Provide symptom text and/or vitals to assess.'
                });
            }

            const textResult = text ? this.textAnalyzer.analyze(text) : null;
            const vitalsResult = vitals ? this.vitalsRules.analyze(vitals) : null;

            const hybridResult = this.hybridAssessment.assess(vitalsResult, textResult);
            const riskFormulationResult = this.riskFormulation.assess(text, history || {});
            const ladderResult = this.dangerLadder.classify(text);
            const expertRules = this.expertSystem.applyRules(hybridResult);

            const triageResult = this.triage.synthesize(
                hybridResult, riskFormulationResult, ladderResult, expertRules
            );

            res.status(200).json({
                success: true,
                data: {
                    timestamp: new Date().toISOString(),
                    hybridAssessment: hybridResult,
                    vitalsNotes: vitalsResult ? vitalsResult.notes : [],
                    triage: triageResult
                }
            });
        } catch (error) {
            console.error('Maternal risk assessment error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    getHelplines(req, res) {
        res.status(200).json({
            success: true,
            data: {
                emergencyAmbulance: '108',
                pregnancyEmergencyTransport: '102',
                nationalHealthHelpline: '104',
                womenHelpline: '181',
                childHelpline: '1098',
                jananiSurakshaYojana: 'Ask your ASHA worker about JSY cash-assistance eligibility',
                nearestFacility: 'Ask your ASHA/ANM worker for the nearest 24x7 PHC or FRU (First Referral Unit)'
            }
        });
    }
}

export default MaternalController;
