// ================================================================
//  SEMANTIC ANALYZER - Embedding-Based Paraphrase Detection
//
//  ⚠️ UNVERIFIED IN THE SESSION THAT WROTE THIS: this sandbox's network
//  policy blocks huggingface.co, cdn.jsdelivr.net, and unpkg.com (the
//  hosts that serve the embedding model), so the actual model download
//  and embedding computation could not be run or tested here. Before
//  trusting this in production:
//    1. Deploy it and check server logs for a successful
//       "Semantic model loaded" line (see _init below) rather than a
//       download/timeout error.
//    2. Sanity-check with a few real examples: a known paraphrase (e.g.
//       "he touched me somewhere I didn't want" vs the trauma category)
//       should score noticeably higher than an unrelated sentence (e.g.
//       "the weather is nice today").
//    3. Watch for false positives on ordinary text before relying on it
//       to drive real severity decisions - the similarity thresholds
//       below (SIMILARITY_FLOOR/CEILING) are a starting estimate, not
//       independently validated against this app's real traffic.
//
//  WHAT THIS IS FOR: the keyword system (textAnalyzer.js) is precise and
//  fast, but requires a real or near-exact match to a phrase someone
//  already thought to add - "molestation" scoring zero until it was
//  explicitly added is exactly the failure mode this exists to catch.
//  Embeddings capture MEANING rather than exact wording, so a paraphrase
//  neither list anticipated (e.g. "he did something to me I didn't
//  consent to") can still register.
//
//  This is a local model (Xenova/all-MiniLM-L6-v2 via @huggingface/
//  transformers, quantized for a smaller download) - no API key, no
//  per-request cost, nothing to configure on the deployment. The
//  tradeoff is a one-time ~25-30MB model download on first use and
//  noticeably slower per-request inference than keyword matching, which
//  is why this augments the keyword system rather than replacing it
//  (see hybridAI.js's use of Math.max to blend the two) and why loading
//  is lazy + backgrounded rather than blocking server startup.
//
//  Set DISABLE_SEMANTIC_ANALYSIS=1 to skip this entirely (e.g. if the
//  model fails to load in a given environment) - everything else in the
//  app works unchanged, since this is purely an additive signal.
// ================================================================

import TextAnalyzer from './textAnalyzer.js';

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

// textAnalyzer.js's internal keywordDB category names don't all match the
// score keys the rest of the pipeline (hybridAI.js, the controller) uses -
// renamed here so this module's output can be blended in directly by key,
// same as textAnalyzer's own output.
const CATEGORY_KEY_MAP = {
    suicide: 'suicidal_ideation',
    protective: 'protective_factors'
};

// Cosine similarity from this model for genuinely related-but-differently-
// worded sentences typically lands in the 0.5-0.8 range; unrelated
// sentences typically land under 0.3. These map that raw similarity onto
// a 0-1 score comparable to the keyword system's category scores. NOT
// independently tuned against this app's real traffic - see file header.
const SIMILARITY_FLOOR = 0.45;   // below this: no signal (score 0)
const SIMILARITY_CEILING = 0.80; // at/above this: full signal (score 1)

// A hard timeout so a slow/hanging model call (e.g. the download stalls,
// or CPU inference is unexpectedly slow on a given host) can never block
// an assessment response - this signal is additive, so timing out and
// contributing nothing is always safe.
const ANALYZE_TIMEOUT_MS = 4000;

function cosineSimilarity(a, b) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

class SemanticAnalyzer {
    constructor() {
        this.disabled = !!process.env.DISABLE_SEMANTIC_ANALYSIS;
        this.extractor = null;
        this.categoryEmbeddings = null; // { category: [{ phrase, embedding }] }
        this.initPromise = null;
        if (!this.disabled) {
            // Fire-and-forget: starts loading immediately so the first real
            // request is more likely to land after the model is already
            // warm, but never blocks server startup (index.js does not
            // await this).
            this.initPromise = this._init().catch(err => {
                console.warn('⚠️  Semantic analyzer failed to initialize - falling back to keyword-only scoring:', err.message);
                return null;
            });
        }
    }

    async _init() {
        if (this.disabled) return null;
        const { pipeline } = await import('@huggingface/transformers');
        const start = Date.now();
        this.extractor = await pipeline('feature-extraction', MODEL_ID, { quantized: true });
        console.log(`✅ Semantic model loaded (${MODEL_ID}) in ${Date.now() - start}ms`);

        this.categoryEmbeddings = await this._buildCategoryEmbeddings();
        console.log(`✅ Semantic reference phrases embedded: ${Object.values(this.categoryEmbeddings).reduce((n, arr) => n + arr.length, 0)} phrases across ${Object.keys(this.categoryEmbeddings).length} categories`);
        return true;
    }

    // Reuses textAnalyzer.js's already-curated English keyword phrases as
    // the reference set for each category, instead of maintaining a
    // second, separate list of exemplar phrases - every phrase already
    // added there (including future additions) automatically becomes a
    // semantic reference point too.
    async _buildCategoryEmbeddings() {
        const textAnalyzer = new TextAnalyzer();
        const result = {};
        for (const [rawCategory, categoryData] of Object.entries(textAnalyzer.keywordDB)) {
            const category = CATEGORY_KEY_MAP[rawCategory] || rawCategory;
            const enKeywords = (categoryData.keywords && categoryData.keywords.en) || {};
            const phrases = Object.keys(enKeywords);
            const embeddings = [];
            for (const phrase of phrases) {
                const embedding = await this._embed(phrase);
                if (embedding) embeddings.push({ phrase, embedding });
            }
            result[category] = embeddings;
        }
        return result;
    }

    async _embed(text) {
        if (!this.extractor) return null;
        const output = await this.extractor(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
    }

    _scoreFromSimilarity(similarity) {
        if (similarity <= SIMILARITY_FLOOR) return 0;
        if (similarity >= SIMILARITY_CEILING) return 1;
        return (similarity - SIMILARITY_FLOOR) / (SIMILARITY_CEILING - SIMILARITY_FLOOR);
    }

    // Returns { scores: { trauma: 0-1, ... }, topMatches: { category: { phrase, similarity } } }
    // or null if disabled, not yet loaded, on any error, or on timeout -
    // callers should treat null exactly like "no semantic signal available"
    // and continue with keyword-only scoring (see hybridAI.js).
    async analyze(text, lang = 'en') {
        if (this.disabled || !text || lang !== 'en') return null;

        const timeout = new Promise(resolve => setTimeout(() => resolve(null), ANALYZE_TIMEOUT_MS));
        return Promise.race([this._analyzeInner(text), timeout]);
    }

    async _analyzeInner(text) {
        try {
            if (this.initPromise) await this.initPromise;
            if (!this.extractor || !this.categoryEmbeddings) return null;

            const textEmbedding = await this._embed(text);
            if (!textEmbedding) return null;

            const scores = {};
            const topMatches = {};
            for (const [category, refs] of Object.entries(this.categoryEmbeddings)) {
                let best = { phrase: null, similarity: -1 };
                for (const ref of refs) {
                    const similarity = cosineSimilarity(textEmbedding, ref.embedding);
                    if (similarity > best.similarity) best = { phrase: ref.phrase, similarity };
                }
                scores[category] = this._scoreFromSimilarity(best.similarity);
                topMatches[category] = best;
            }

            return { scores, topMatches };
        } catch (err) {
            console.warn('Semantic analysis failed for this request, continuing with keyword-only scoring:', err.message);
            return null;
        }
    }
}

export default SemanticAnalyzer;
