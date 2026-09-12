// ================================================================
//  SPEECH TO TEXT - Server-Side Voice Transcription (Whisper)
//
//  ⚠️ UNVERIFIED IN THE SESSION THAT WROTE THIS: this sandbox's network
//  policy blocks huggingface.co (the host that serves the model), so the
//  actual model download and transcription could not be run or tested
//  here. Before trusting this in production:
//    1. Deploy it and check server logs for a successful "Speech-to-text
//       model loaded" line (see _init below) rather than a download/
//       timeout error.
//    2. Record yourself saying something unambiguous (e.g. "I don't want
//       to live anymore" or "testing one two three") and confirm the
//       transcript that lands in the Text Narrative box / persisted case
//       record actually matches what was said.
//    3. Watch first-request latency - the model loads lazily in the
//       background on server start, but a request that arrives before it
//       finishes loading will wait for it (see transcribe()'s timeout).
//
//  WHY THIS EXISTS: advanced_dashboard.html's Web Speech API transcription
//  (see its _startSpeechRecognition) is BEST-EFFORT ONLY - it silently
//  produces nothing on browsers without support (e.g. Firefox), when the
//  browser can't reach its own cloud speech service, or in any non-HTTPS/
//  non-localhost context (the API requires a secure origin). A person can
//  speak a genuine crisis statement, have the browser quietly fail to
//  transcribe it, and - without this - the assessment falls back to
//  acoustic-tone-only scoring, which cannot detect suicidal *content* at
//  all (see models/hybridAI.js: suicidal_ideation is only ever populated
//  from `text`). This runs a real local speech-to-text model SERVER-SIDE,
//  independent of the submitter's browser or its network reachability to
//  any third-party speech service, so a voice recording gets a genuine
//  second, independent chance at transcription even when the client-side
//  attempt fails entirely.
//
//  Local model (Xenova/whisper-tiny.en via @huggingface/transformers -
//  already a dependency here for services/semanticAnalyzer.js, same
//  lazy-load/timeout/disable pattern) - no API key, no per-request cost.
//  ~40MB one-time download on first use. English-only by design, matching
//  this app's text pipeline (textAnalyzer.js's pattern matching is
//  English-only).
//
//  Set DISABLE_SPEECH_TO_TEXT=1 to skip this entirely (e.g. if the model
//  fails to load in a given environment) - voice submissions then fall
//  back to whatever the client already sent (its own Web Speech API
//  transcript, or tone-only scoring), same as before this existed.
// ================================================================

const MODEL_ID = 'Xenova/whisper-tiny.en';

// Whisper inference on CPU for a ~15s clip (the frontend's recording cap)
// is meaningfully slower than the keyword/embedding work elsewhere in this
// pipeline. This timeout is generous relative to semanticAnalyzer.js's 4s
// because losing a transcript entirely is a much worse outcome here (the
// whole point of this file) than losing the smaller semantic-similarity
// signal - but it still must have a ceiling so a stuck/slow model can never
// hang an assessment request indefinitely.
const TRANSCRIBE_TIMEOUT_MS = 20000;

class SpeechToText {
    constructor() {
        this.disabled = !!process.env.DISABLE_SPEECH_TO_TEXT;
        this.transcriber = null;
        this.initPromise = null;
        if (!this.disabled) {
            // Fire-and-forget: starts loading immediately so the first real
            // request is more likely to land after the model is already
            // warm, but never blocks server startup (index.js does not
            // await this).
            this.initPromise = this._init().catch(err => {
                console.warn('⚠️  Speech-to-text failed to initialize - voice submissions will fall back to client-side transcription / tone-only scoring:', err.message);
                return null;
            });
        }
    }

    async _init() {
        if (this.disabled) return null;
        const { pipeline } = await import('@huggingface/transformers');
        const start = Date.now();
        this.transcriber = await pipeline('automatic-speech-recognition', MODEL_ID, { quantized: true });
        console.log(`✅ Speech-to-text model loaded (${MODEL_ID}) in ${Date.now() - start}ms`);
        return true;
    }

    // filePath: path to a real WAV file on disk (the same upload
    // controllers/nhaa.controller.js already has - call this BEFORE that
    // file gets cleaned up). Returns the transcript string, or null if
    // disabled, not yet loaded, the audio had no discernible speech, on
    // error, or on timeout - callers should treat null exactly like "no
    // server transcript available" and fall back to whatever text the
    // client already sent, same as if this file didn't exist.
    async transcribe(filePath) {
        if (this.disabled || !filePath) return null;
        const timeout = new Promise(resolve => setTimeout(() => resolve(null), TRANSCRIBE_TIMEOUT_MS));
        return Promise.race([this._transcribeInner(filePath), timeout]);
    }

    async _transcribeInner(filePath) {
        try {
            if (this.initPromise) await this.initPromise;
            if (!this.transcriber) return null;

            const output = await this.transcriber(filePath);
            const transcript = (output && typeof output.text === 'string') ? output.text.trim() : '';
            return transcript || null;
        } catch (err) {
            console.warn('Speech-to-text failed for this request, continuing without a server transcript:', err.message);
            return null;
        }
    }
}

export default SpeechToText;
