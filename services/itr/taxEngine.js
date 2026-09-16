// ================================================================
//  TAX ENGINE - deterministic slab computation, old vs new regime
//
//  Tax law changes every assessment year, so nothing here is "the"
//  tax logic - it's RULES['2026-27']. A future year is added as a
//  new entry, never by editing the maths of an existing one (a filed
//  return must always be reproducible against the rules that were
//  actually in force for its assessment year).
//
//  Deliberately NOT delegated to any ML/LLM component - see the
//  architecture note this module implements: tax computation must be
//  auditable, testable code, not a model's best guess.
// ================================================================

const RULES = {
    // AY 2026-27 (income earned in FY 2025-26), post Budget 2025.
    '2026-27': {
        old: {
            standardDeduction: 50000,
            slabs: [
                { upto: 250000, rate: 0 },
                { upto: 500000, rate: 0.05 },
                { upto: 1000000, rate: 0.20 },
                { upto: Infinity, rate: 0.30 }
            ],
            rebate87A: { thresholdIncome: 500000, maxRebate: 12500 },
            maxSurchargeRate: 0.37
        },
        new: {
            standardDeduction: 75000,
            slabs: [
                { upto: 400000, rate: 0 },
                { upto: 800000, rate: 0.05 },
                { upto: 1200000, rate: 0.10 },
                { upto: 1600000, rate: 0.15 },
                { upto: 2000000, rate: 0.20 },
                { upto: 2400000, rate: 0.25 },
                { upto: Infinity, rate: 0.30 }
            ],
            rebate87A: { thresholdIncome: 1200000, maxRebate: Infinity, marginalRelief: true },
            maxSurchargeRate: 0.25
        }
    }
};

// Surcharge slabs are the same shape for both regimes; only the max
// rate (capped by maxSurchargeRate above) differs. Marginal relief on
// surcharge (the rule that a surcharge can't eat more than the income
// crossing the threshold) is NOT applied here - flagged in warnings
// instead of silently computed wrong, since it only bites above ₹50L.
const SURCHARGE_SLABS = [
    { above: 5000000, rate: 0.10 },
    { above: 10000000, rate: 0.15 },
    { above: 20000000, rate: 0.25 },
    { above: 50000000, rate: 0.37 }
];

function computeSlabTax(taxableIncome, slabs) {
    let tax = 0;
    let lower = 0;
    for (const slab of slabs) {
        if (taxableIncome <= lower) break;
        const taxableInSlab = Math.min(taxableIncome, slab.upto) - lower;
        tax += taxableInSlab * slab.rate;
        lower = slab.upto;
    }
    return Math.round(tax);
}

function computeSurcharge(taxableIncome, baseTax, maxRate, warnings) {
    let rate = 0;
    for (const slab of SURCHARGE_SLABS) {
        if (taxableIncome > slab.above) rate = slab.rate;
    }
    rate = Math.min(rate, maxRate);
    if (rate > 0) {
        warnings.push('Surcharge applies at this income level - marginal relief on surcharge is not computed here; verify with a CA or the official calculator before relying on this figure.');
    }
    return Math.round(baseTax * rate);
}

function computeRegime(taxableIncome, regimeRules, warnings) {
    const baseTax = computeSlabTax(taxableIncome, regimeRules.slabs);

    let taxAfterRebate = baseTax;
    const { thresholdIncome, maxRebate, marginalRelief } = regimeRules.rebate87A;
    if (taxableIncome <= thresholdIncome) {
        const rebate = maxRebate === Infinity ? baseTax : Math.min(baseTax, maxRebate);
        taxAfterRebate = Math.max(0, baseTax - rebate);
    } else if (marginalRelief) {
        // New-regime marginal relief: tax payable can't exceed the
        // income that crossed the ₹12L threshold.
        const excessIncome = taxableIncome - thresholdIncome;
        if (baseTax > excessIncome) {
            taxAfterRebate = excessIncome;
        }
    }

    const surcharge = computeSurcharge(taxableIncome, taxAfterRebate, regimeRules.maxSurchargeRate, warnings);
    const cess = Math.round((taxAfterRebate + surcharge) * 0.04);
    const totalTax = taxAfterRebate + surcharge + cess;

    return {
        taxableIncome,
        baseTax,
        rebate: baseTax - taxAfterRebate,
        taxAfterRebate,
        surcharge,
        cess,
        totalTax
    };
}

// grossSalary/otherIncome/deductions are already-reviewed numbers
// (post user-correction), never raw extraction output - the caller
// is responsible for merging overrides before this runs.
function computeRegimeComparison({ assessmentYear, grossSalary, otherIncome = 0, chapterVIADeductions = 0 }) {
    const rules = RULES[assessmentYear];
    if (!rules) {
        throw new Error(`No tax rules configured for assessment year ${assessmentYear}`);
    }

    const warnings = [];

    const oldTaxableIncome = Math.max(0, grossSalary - rules.old.standardDeduction - chapterVIADeductions + otherIncome);
    const old = computeRegime(oldTaxableIncome, rules.old, warnings);

    // Chapter VI-A deductions (80C/80D/etc.) are mostly disallowed
    // under the new regime - only the standard deduction carries over.
    const newTaxableIncome = Math.max(0, grossSalary - rules.new.standardDeduction + otherIncome);
    const newRegime = computeRegime(newTaxableIncome, rules.new, warnings);

    const recommended = old.totalTax <= newRegime.totalTax ? 'old' : 'new';

    return { assessmentYear, old, new: newRegime, recommended, warnings: [...new Set(warnings)] };
}

function supportedAssessmentYears() {
    return Object.keys(RULES);
}

export { computeRegimeComparison, supportedAssessmentYears };
