// ================================================================
//  ITR-1 MAPPER
//  Maps a reviewed ITR case (extracted Form 16 fields + user
//  corrections + computed tax) into an ITR-1-shaped prefill JSON,
//  mirroring the official schedule names (Schedule Salary, Schedule
//  TDS1, Part B-TI, Part B-TTI) so the numbers are easy to cross-check
//  against the income tax portal - this is a simplified approximation
//  for review/export, not the department's actual filing schema.
// ================================================================

function buildItrOnePrefill(itrCase) {
    const f = itrCase.effectiveFields || {};
    const computation = itrCase.computation;
    const val = (field) => (f[field] && f[field].value != null ? f[field].value : 0);

    const prefill = {
        assessmentYear: itrCase.assessmentYear,
        personalInfo: {
            name: f.employeeName ? f.employeeName.value : null,
            pan: f.employeePan ? f.employeePan.value : null
        },
        scheduleSalary: {
            employerName: f.employerName ? f.employerName.value : null,
            employerTAN: f.employerTan ? f.employerTan.value : null,
            grossSalary: val('grossSalary'),
            allowancesExemptUnderSection10: val('exemptAllowances'),
            standardDeductionUnderSection16ia: val('standardDeduction'),
            professionalTaxUnderSection16iii: val('professionalTax'),
            incomeChargeableUnderHeadSalaries: val('incomeChargeableUnderSalaries')
        },
        scheduleOtherSources: {
            income: itrCase.otherIncome || 0
        },
        scheduleVIA: {
            section80C: val('section80C'),
            section80D: val('section80D'),
            section80CCD1B: val('section80CCD1B'),
            totalDeductions: val('totalChapterVIADeductions')
        },
        scheduleTDS1: {
            tanOfDeductor: f.employerTan ? f.employerTan.value : null,
            totalTaxDeducted: val('totalTaxDeducted')
        },
        partB_TI: computation ? {
            grossTotalIncome: val('grossSalary') + (itrCase.otherIncome || 0),
            regimeSelected: computation.regime,
            totalTaxableIncome: computation[computation.regime]?.taxableIncome ?? null
        } : null,
        partB_TTI: computation ? {
            regime: computation.regime,
            taxPayable: computation[computation.regime]?.baseTax ?? null,
            rebateUnderSection87A: computation[computation.regime]?.rebate ?? null,
            surcharge: computation[computation.regime]?.surcharge ?? null,
            healthAndEducationCess: computation[computation.regime]?.cess ?? null,
            totalTaxLiability: computation[computation.regime]?.totalTax ?? null,
            taxDeductedAtSource: val('totalTaxDeducted'),
            balanceTaxPayableOrRefund: computation[computation.regime]
                ? computation[computation.regime].totalTax - val('totalTaxDeducted')
                : null
        } : null,
        disclaimer: 'Auto-generated prefill for review only - verify every field against your Form 16, 26AS/AIS, and other source documents before filing. Not a substitute for professional advice in complex cases (multiple employers, capital gains, business income, tax audit).'
    };

    return prefill;
}

export { buildItrOnePrefill };
