// ================================================================
//  MATERNAL VITALS RULES - deterministic clinical-threshold scoring
//
//  Structured counterpart to services/maternalTextAnalyzer.js: where the
//  text analyzer approximates symptoms from free-text narrative, this
//  module scores the same risk categories from actual measured vitals
//  using standard WHO/India RMNCH+A obstetric thresholds. Both feed the
//  same category set so maternalHybridAssessment.js can blend them the
//  way models/hybridAI.js blends text+audio - whichever signal is worse
//  wins, a missing/normal vital never overrides a symptom actually
//  reported.
//
//  All thresholds are widely published clinical cutoffs (not proprietary
//  scoring) - this is a screening aid for prioritizing who needs a
//  facility visit sooner, not a diagnostic instrument.
// ================================================================

class MaternalVitalsRules {
    analyze(vitals = {}) {
        const scores = {
            hypertensive_disorder: 0,
            hemorrhage: 0,
            infection: 0,
            anemia: 0,
            fetal_distress: 0,
            obstructed_labor: 0,
            malnutrition: 0
        };
        const notes = [];

        const { systolicBP, diastolicBP, temperature, hemoglobin, bleedingSeverity,
            swelling, fetalMovementsPerHour, laborDurationHours, muac } = vitals;

        // Hypertensive disorders of pregnancy (pre-eclampsia/eclampsia risk)
        if (typeof systolicBP === 'number' || typeof diastolicBP === 'number') {
            const sbp = systolicBP || 0;
            const dbp = diastolicBP || 0;
            if (sbp >= 160 || dbp >= 110) {
                scores.hypertensive_disorder = 0.95;
                notes.push('BP in severe hypertension range (>=160/110) - eclampsia risk');
            } else if (sbp >= 140 || dbp >= 90) {
                scores.hypertensive_disorder = Math.max(scores.hypertensive_disorder, 0.6);
                notes.push('BP meets pregnancy-hypertension threshold (>=140/90)');
            }
        }
        if (swelling === 'severe') {
            scores.hypertensive_disorder = Math.max(scores.hypertensive_disorder, 0.5);
            notes.push('Facial/hand edema reported - associated with pre-eclampsia');
        } else if (swelling === 'mild') {
            scores.hypertensive_disorder = Math.max(scores.hypertensive_disorder, 0.2);
        }

        // Hemorrhage
        if (bleedingSeverity === 'heavy') {
            scores.hemorrhage = 0.95;
            notes.push('Heavy bleeding reported - emergency obstetric signal');
        } else if (bleedingSeverity === 'moderate') {
            scores.hemorrhage = Math.max(scores.hemorrhage, 0.6);
        } else if (bleedingSeverity === 'spotting') {
            scores.hemorrhage = Math.max(scores.hemorrhage, 0.3);
        }

        // Infection / sepsis
        if (typeof temperature === 'number') {
            if (temperature >= 38.5) {
                scores.infection = 0.8;
                notes.push('High fever (>=38.5C)');
            } else if (temperature >= 37.5) {
                scores.infection = Math.max(scores.infection, 0.4);
            }
        }

        // Anemia (WHO cutoff for anemia in pregnancy: Hb < 11 g/dL; severe < 7 g/dL)
        if (typeof hemoglobin === 'number') {
            if (hemoglobin < 7) {
                scores.anemia = 0.9;
                notes.push('Severe anemia (Hb < 7 g/dL) - transfusion risk');
            } else if (hemoglobin < 11) {
                scores.anemia = Math.max(scores.anemia, 0.5);
                notes.push('Anemia below WHO pregnancy threshold (Hb < 11 g/dL)');
            }
        }

        // Fetal distress (reduced/absent fetal movement)
        if (typeof fetalMovementsPerHour === 'number') {
            if (fetalMovementsPerHour === 0) {
                scores.fetal_distress = 0.9;
                notes.push('No fetal movement reported');
            } else if (fetalMovementsPerHour < 4) {
                scores.fetal_distress = Math.max(scores.fetal_distress, 0.5);
                notes.push('Reduced fetal movement count');
            }
        }

        // Obstructed / prolonged labor
        if (typeof laborDurationHours === 'number' && laborDurationHours >= 12) {
            scores.obstructed_labor = laborDurationHours >= 18 ? 0.85 : 0.55;
            notes.push('Prolonged labor duration reported');
        }

        // Malnutrition (MUAC < 23cm is the standard maternal undernutrition cutoff, < 21cm severe)
        if (typeof muac === 'number') {
            if (muac < 21) {
                scores.malnutrition = 0.8;
                notes.push('MUAC below severe maternal undernutrition cutoff (<21cm)');
            } else if (muac < 23) {
                scores.malnutrition = Math.max(scores.malnutrition, 0.4);
                notes.push('MUAC below maternal undernutrition cutoff (<23cm)');
            }
        }

        return {
            scores,
            notes,
            methodology: 'Deterministic scoring from measured vitals against published WHO/India RMNCH+A obstetric thresholds - a screening prioritization aid, not a diagnosis.'
        };
    }
}

export default MaternalVitalsRules;
