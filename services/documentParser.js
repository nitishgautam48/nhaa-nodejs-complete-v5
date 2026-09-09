// ================================================================
//  DOCUMENT PARSER - extracts raw text from an uploaded case document
//  (PDF, DOCX, or plain text) for the lawyer case-summarizer.
//
//  Pure-JS extraction only (pdf-parse@1.1.1, mammoth) - no native
//  binaries, no ML model download, so this works in any environment
//  this app runs in, consistent with the constraints documented in
//  services/semanticAnalyzer.js's header.
// ================================================================

import fs from 'fs';
// ✅ FIX: pdf-parse@1.1.1's package entry (index.js) has a leftover debug
// block that self-tests against a fixture file whenever `module.parent`
// is falsy - which it is when loaded through ESM's CJS interop, causing
// an ENOENT crash on the very first import, before this file's own code
// ever runs. Importing its internal lib directly skips that debug
// wrapper entirely and gets the same real parsing function.
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';

class DocumentParser {
    // Returns { text, pageCount, warning }. Never throws for a
    // recognized-but-unparseable file - callers should still be able to
    // tell the person what went wrong rather than getting a 500.
    async extractText(filePath, mimetype, originalName = '') {
        const ext = (originalName.split('.').pop() || '').toLowerCase();

        try {
            if (mimetype === 'application/pdf' || ext === 'pdf') {
                const buffer = fs.readFileSync(filePath);
                const result = await pdfParse(buffer);
                return { text: result.text || '', pageCount: result.numpages || null, warning: null };
            }

            if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === 'docx') {
                const result = await mammoth.extractRawText({ path: filePath });
                return { text: result.value || '', pageCount: null, warning: null };
            }

            // Plain text / anything else readable-as-text (.txt, no
            // mimetype match) - read directly rather than rejecting, since
            // a lawyer pasting an FIR copy saved as .txt is a real,
            // legitimate case.
            const text = fs.readFileSync(filePath, 'utf8');
            return { text, pageCount: null, warning: null };
        } catch (error) {
            console.error('Document parsing error:', error.message);
            return {
                text: '',
                pageCount: null,
                warning: `Could not extract text from this file (${error.message}). It may be a scanned/image-only PDF - this tool reads text, not scanned images.`
            };
        }
    }
}

export default DocumentParser;
