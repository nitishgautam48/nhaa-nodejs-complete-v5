// ================================================================
//  FORM 16 EXTRACTOR
//  Heuristic field extraction from Form 16 (Part B) text, already
//  flattened to plain text by DocumentParser (pdfjs-dist). Form 16
//  layouts vary by payroll software, so every field is matched by
//  label + nearby amount rather than fixed coordinates, and every
//  result carries a confidence so the review step can flag what
//  needs the user's eyes - this never assumes the regex is right.
// ================================================================

// Negative lookahead on "(" rejects section references like "16(iii)"
// or "17(1)" sitting in the window before the real amount - without it,
// a label like "Tax on employment under section 16(iii) Rs. 2400" would
// match "16" instead of "2400". The \b before the lookahead is required:
// without it, regex backtracking shrinks "16" down to just "1" to dodge
// the lookahead (since "1" is followed by "6", not "("), which silently
// returns a wrong number instead of skipping to the real amount. \b
// blocks that - it only holds at a genuine digit/non-digit boundary, so
// "1" (followed by the digit "6") never qualifies as a match on its own.
const AMOUNT = '(?:Rs\\.?\\s*)?([0-9][0-9,]*(?:\\.[0-9]{1,2})?)\\b(?!\\s*\\()';

// Each entry: label patterns (tried in order) searched within a short
// window after the label so we don't grab an unrelated number from
// three paragraphs later.
const AMOUNT_FIELDS = {
    grossSalary: [
        /salary\s+as\s+per\s+section\s*17\(1\)[\s\S]{0,80}?/i,
        /gross\s+salary[\s\S]{0,80}?/i
    ],
    exemptAllowances: [
        /allowances?\s+exempt\s+under\s+section\s*10[\s\S]{0,80}?/i
    ],
    standardDeduction: [
        /standard\s+deduction\s+under\s+section\s*16\s*\(i?a?\)[\s\S]{0,80}?/i,
        /standard\s+deduction[\s\S]{0,80}?/i
    ],
    professionalTax: [
        /tax\s+on\s+employment[\s\S]{0,80}?/i,
        /professional\s+tax[\s\S]{0,80}?/i
    ],
    incomeChargeableUnderSalaries: [
        /income\s+chargeable\s+under\s+the\s+head[^0-9]{0,40}salar[a-z]*[\s\S]{0,80}?/i
    ],
    section80C: [
        /section\s*80\s*c[^0-9]{0,60}/i,
        /80c[^0-9]{0,60}/i
    ],
    section80D: [
        /section\s*80\s*d[^0-9]{0,60}/i
    ],
    section80CCD1B: [
        /80\s*ccd\s*\(1\s*b\)[^0-9]{0,60}/i
    ],
    totalChapterVIADeductions: [
        /total\s+(?:amount\s+of\s+)?deductions?\s+under\s+chapter\s*vi[\s-]*a[\s\S]{0,80}?/i,
        /aggregate\s+of\s+deductible\s+amount\s+under\s+chapter\s*vi[\s-]*a[\s\S]{0,80}?/i
    ],
    totalTaxableIncome: [
        /total\s+(?:income|taxable\s+income)[\s\S]{0,80}?/i
    ],
    totalTaxDeducted: [
        /total\s+tax\s+deducted[\s\S]{0,80}?/i,
        /total\s+amount\s+of\s+tax\s+deducted[\s\S]{0,80}?/i
    ]
};

function findAmount(text, labelPatterns) {
    for (const labelPattern of labelPatterns) {
        const labelMatch = text.match(labelPattern);
        if (!labelMatch) continue;
        const windowStart = labelMatch.index + labelMatch[0].length;
        const window = text.slice(windowStart, windowStart + 40);
        const amountMatch = window.match(new RegExp(AMOUNT));
        if (amountMatch) {
            const numeric = Number(amountMatch[1].replace(/,/g, ''));
            if (!Number.isNaN(numeric)) {
                return { value: numeric, confidence: 'extracted' };
            }
        }
    }
    return { value: null, confidence: 'missing' };
}

function findPan(text) {
    const match = text.match(/\b([A-Z]{5}[0-9]{4}[A-Z])\b/);
    return match ? { value: match[1], confidence: 'extracted' } : { value: null, confidence: 'missing' };
}

function findTan(text) {
    const match = text.match(/\b([A-Z]{4}[0-9]{5}[A-Z])\b/);
    return match ? { value: match[1], confidence: 'extracted' } : { value: null, confidence: 'missing' };
}

// Best-effort employer/employee name lines - names don't have a fixed
// pattern like PAN/TAN, so this is intentionally low-confidence and
// always meant to be confirmed by the user, never auto-accepted.
// Stops before the next form label rather than consuming it too - with
// whitespace already collapsed there's no line break to mark the name's
// end, so without this a name capture runs straight into "PAN of the
// Employee" etc. on the next line.
const NEXT_LABEL = /\s{1,3}(?:PAN|TAN|Name|Address|Employer|Employee|Assessment|Financial|Period|Designation)\b/;

function findNameNear(text, labelPattern) {
    const labelMatch = text.match(labelPattern);
    if (!labelMatch) return { value: null, confidence: 'missing' };
    const windowStart = labelMatch.index + labelMatch[0].length;
    const window = text.slice(windowStart, windowStart + 80).trim();
    const cutIndex = window.search(NEXT_LABEL);
    const candidate = cutIndex === -1 ? window.slice(0, 60) : window.slice(0, cutIndex);
    const nameMatch = candidate.match(/([A-Z][A-Za-z.\s]{2,50})/);
    return nameMatch
        ? { value: nameMatch[1].trim(), confidence: 'low' }
        : { value: null, confidence: 'missing' };
}

function extractForm16Fields(text) {
    const normalized = text.replace(/\s+/g, ' ').trim();
    const fields = {};

    for (const [key, patterns] of Object.entries(AMOUNT_FIELDS)) {
        fields[key] = findAmount(normalized, patterns);
    }

    fields.employeePan = findPan(normalized);
    fields.employerTan = findTan(normalized);
    fields.employeeName = findNameNear(normalized, /name\s+and\s+address\s+of\s+the\s+employee/i);
    fields.employerName = findNameNear(normalized, /name\s+and\s+address\s+of\s+the\s+employer/i);

    const missingCount = Object.values(fields).filter(f => f.confidence === 'missing').length;
    const warnings = [];
    if (missingCount > 4) {
        warnings.push('Several fields could not be read automatically from this Form 16 - this can happen with scanned or non-standard layouts. Please fill the missing/low-confidence fields manually before computing tax.');
    }

    return { fields, warnings };
}

export { extractForm16Fields };
