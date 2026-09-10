// ================================================================
//  DOCUMENT PARSER - extracts raw text from an uploaded case document
//  (PDF, DOCX, or plain text) for the lawyer case-summarizer.
//
//  Pure-JS extraction only (pdfjs-dist, mammoth) - no native binaries,
//  no ML model download, so this works in any environment this app
//  runs in, consistent with the constraints documented in
//  services/semanticAnalyzer.js's header. Deliberately NOT pdf-parse:
//  see the note below on the PDF branch for why.
// ================================================================

import fs from 'fs';
// ✅ FIX: pdf-parse@1.1.1 bundles a long-abandoned pdf.js from 2016
// (v1.10.100) that throws "bad XRef entry" on real, valid, non-scanned
// PDFs from common generators (found: a plain reportlab-generated
// chargesheet) - and its own error handling then misreports this as
// "may be a scanned/image PDF", actively misleading whoever's
// uploading a perfectly normal document. pdf-parse's current major
// version (2.x) fixes this by depending on a modern pdfjs-dist, but
// also pulls in @napi-rs/canvas - a native binary dependency, which
// breaks this file's own pure-JS constraint (see header). Importing
// pdfjs-dist directly for text extraction only avoids that entirely -
// canvas is needed for rendering a page as an IMAGE, never for
// extracting its text via getTextContent().
import { getDocument, VerbosityLevel } from 'pdfjs-dist/legacy/build/pdf.mjs';
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
                // VerbosityLevel.ERRORS: suppress pdfjs-dist's internal
                // console warnings (e.g. missing embedded-font metrics) -
                // these don't affect text extraction and would otherwise
                // spam server logs on ordinary, successfully-parsed PDFs.
                const doc = await getDocument({
                    data: new Uint8Array(buffer),
                    verbosity: VerbosityLevel.ERRORS
                }).promise;
                let text = '';
                for (let i = 1; i <= doc.numPages; i++) {
                    const page = await doc.getPage(i);
                    const content = await page.getTextContent();
                    text += content.items.map(item => item.str).join(' ') + '\n';
                }
                return { text, pageCount: doc.numPages, warning: null };
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
