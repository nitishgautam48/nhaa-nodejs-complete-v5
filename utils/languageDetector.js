// ================================================================
//  LANGUAGE DETECTOR - 22 Indian Languages
// ================================================================

class LanguageDetector {
    constructor() {
        this.patterns = {
            hi: /[\u0900-\u097F]/,
            bn: /[\u0980-\u09FF]/,
            pa: /[\u0A00-\u0A7F]/,
            gu: /[\u0A80-\u0AFF]/,
            or: /[\u0B00-\u0B7F]/,
            ta: /[\u0B80-\u0BFF]/,
            te: /[\u0C00-\u0C7F]/,
            kn: /[\u0C80-\u0CFF]/,
            ml: /[\u0D00-\u0D7F]/,
            ur: /[\u0600-\u06FF]/,
            mr: /[\u0900-\u097F]/,
            as: /[\u0980-\u09FF]/,
            ks: /[\u0600-\u06FF]/,
            sd: /[\u0A00-\u0A7F]/,
            kok: /[\u0900-\u097F]/,
            mni: /[\uABC0-\uABFF]/,
            ne: /[\u0900-\u097F]/,
            mai: /[\u0900-\u097F]/,
            doi: /[\u0900-\u097F]/,
            brx: /[\u0900-\u097F]/,
            snt: /[\u0900-\u097F]/,
            sa: /[\u0900-\u097F]/
        };

        this.names = {
            en: 'English',
            hi: 'Hindi',
            bn: 'Bengali',
            pa: 'Punjabi',
            gu: 'Gujarati',
            or: 'Odia',
            ta: 'Tamil',
            te: 'Telugu',
            kn: 'Kannada',
            ml: 'Malayalam',
            mr: 'Marathi',
            ur: 'Urdu',
            sa: 'Sanskrit',
            as: 'Assamese',
            ks: 'Kashmiri',
            sd: 'Sindhi',
            kok: 'Konkani',
            mni: 'Manipuri',
            ne: 'Nepali',
            mai: 'Maithili',
            doi: 'Dogri',
            brx: 'Bodo',
            snt: 'Santali'
        };
    }

    detect(text) {
        if (!text || text.trim().length === 0) return 'en';
        for (const [lang, pattern] of Object.entries(this.patterns)) {
            if (pattern.test(text)) {
                return lang;
            }
        }
        return 'en';
    }

    getLanguageName(code) {
        return this.names[code] || code;
    }

    getSupportedLanguages() {
        return Object.entries(this.names).map(([code, name]) => ({
            code: code,
            name: name
        }));
    }
}

export default LanguageDetector;