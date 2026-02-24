/**
 * AI utilities: OCR metadata extraction, case summary, draft generation.
 * Uses SERVAM_AI_API_KEY + SERVAM_AI_API_URL when set (Sarvam AI compatible);
 * otherwise returns static/mock responses.
 */

const https = require('https');
const http = require('http');

const SERVAM_AI_API_URL = (process.env.SERVAM_AI_API_URL || process.env.SARVAM_AI_API_URL || 'https://api.sarvam.ai/v1/chat/completions').trim();
const SERVAM_AI_API_KEY = (process.env.SERVAM_AI_API_KEY || process.env.SARVAM_AI_API_KEY || '').trim();

function hasAiConfig() {
  return Boolean(SERVAM_AI_API_KEY);
}

/**
 * Call external AI API (Sarvam-style chat completions). Returns null on missing config or error.
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Promise<string|null>}
 */
function chatCompletion(messages) {
  if (!hasAiConfig()) return Promise.resolve(null);
  const url = new URL(SERVAM_AI_API_URL);
  const body = JSON.stringify({
    model: process.env.SERVAM_AI_MODEL || 'sarvam-m',
    messages,
    max_tokens: 2048
  });
  return new Promise((resolve) => {
    const opts = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body, 'utf8'),
        'api-subscription-key': SERVAM_AI_API_KEY,
        Authorization: 'Bearer ' + SERVAM_AI_API_KEY
      }
    };
    const req = (url.protocol === 'https:' ? https : http).request(opts, (res) => {
      let data = '';
      res.on('data', (ch) => { data += ch; });
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          const text = j.choices?.[0]?.message?.content ?? j.content ?? null;
          resolve(typeof text === 'string' ? text.trim() : null);
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(60000, () => { req.destroy(); resolve(null); });
    req.write(body);
    req.end();
  });
}

/**
 * Extract party_names, case_number, dates from OCR text.
 * Returns { party_names: string[], case_number: string|null, dates: string[] }
 */
async function extractMetadataFromOcr(ocrText) {
  if (!ocrText || typeof ocrText !== 'string') {
    return { party_names: [], case_number: null, dates: [] };
  }
  const text = ocrText.slice(0, 15000);
  const prompt = `From the following legal document text, extract and return ONLY a valid JSON object with exactly these keys (no other text):
- "party_names": array of strings (names of parties, petitioner, respondent, etc.)
- "case_number": single string or null if not found
- "dates": array of strings (any dates mentioned in DD/MM/YYYY or similar format)

Document text:
${text}`;

  const response = await chatCompletion([{ role: 'user', content: prompt }]);
  if (response) {
    try {
      const cleaned = response.replace(/```json?\s*|\s*```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return {
        party_names: Array.isArray(parsed.party_names) ? parsed.party_names : [],
        case_number: typeof parsed.case_number === 'string' ? parsed.case_number : null,
        dates: Array.isArray(parsed.dates) ? parsed.dates : []
      };
    } catch (e) {
      // fall through to static
    }
  }

  // Static fallback: simple regex-based extraction
  const party_names = [];
  const dates = [];
  const dateRegex = /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{2,4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/g;
  let m;
  while ((m = dateRegex.exec(text)) !== null) dates.push(m[1]);
  const caseNumRegex = /(?:case\s*no\.?|number|no\.?)\s*[:\s]*([A-Za-z0-9\/\-]+\d{2,}[A-Za-z0-9\/\-]*)/i;
  const caseNumMatch = text.match(caseNumRegex);
  const case_number = caseNumMatch ? caseNumMatch[1].trim() : null;
  return { party_names, case_number, dates: [...new Set(dates)].slice(0, 20) };
}

/**
 * Generate case summary from case context (title, number, client, description, hearings).
 * Returns string or null.
 */
async function generateCaseSummary(caseContext) {
  const ctx = typeof caseContext === 'string' ? caseContext : [
    caseContext.case_title,
    caseContext.case_number,
    caseContext.client_name,
    caseContext.description,
    caseContext.hearings_summary
  ].filter(Boolean).join('\n');

  const prompt = `Summarize the following case details in 2-4 short paragraphs suitable for an advocate's case summary. Be concise and factual.\n\n${ctx.slice(0, 8000)}`;
  const response = await chatCompletion([{ role: 'user', content: prompt }]);
  if (response) return response;

  // Static fallback
  return `Case summary: ${caseContext.case_title || 'Case'} (${caseContext.case_number || 'N/A'}). Client: ${caseContext.client_name || 'N/A'}. ${(caseContext.description || '').slice(0, 300)}`;
}

const DRAFT_TEMPLATES = {
  LEGAL_NOTICE: {
    name: 'Legal Notice',
    placeholders: ['sender_name', 'sender_address', 'recipient_name', 'recipient_address', 'subject', 'facts', 'demand', 'days_notice']
  },
  AFFIDAVIT: {
    name: 'Affidavit',
    placeholders: ['deponent_name', 'father_name', 'address', 'court_case_details', 'facts', 'date']
  },
  VAKALATNAMA: {
    name: 'Vakalatnama',
    placeholders: ['client_name', 'advocate_name', 'court_name', 'case_number', 'case_title', 'date']
  }
};

function getStaticDraft(templateKey, inputs) {
  const t = templateKey.toUpperCase();
  const i = inputs || {};
  const d = (s) => (s && typeof s === 'string' ? s : '_________________');
  if (t === 'LEGAL_NOTICE') {
    return `LEGAL NOTICE

From:
${d(i.sender_name)}
${d(i.sender_address)}

To:
${d(i.recipient_name)}
${d(i.recipient_address)}

Subject: ${d(i.subject)}

Under instructions from my client, I hereby serve you with the following notice:

FACTS:
${d(i.facts)}

DEMAND:
${d(i.demand)}

You are hereby called upon to comply within ${d(i.days_notice) || '30'} days from the date of receipt of this notice, failing which my client shall be constrained to take appropriate legal action.

Date: ${d(i.date) || new Date().toLocaleDateString('en-IN')}

Advocate`;
  }
  if (t === 'AFFIDAVIT') {
    return `AFFIDAVIT

I, ${d(i.deponent_name)}, S/o ${d(i.father_name)}, residing at ${d(i.address)}, do hereby solemnly affirm and state as under:

1. ${d(i.court_case_details)}

2. ${d(i.facts)}

I solemnly affirm that the contents of this affidavit are true to the best of my knowledge.

Place: _______________
Date: ${d(i.date) || new Date().toLocaleDateString('en-IN')}

Deponent`;
  }
  if (t === 'VAKALATNAMA') {
    return `VAKALATNAMA

I/We, ${d(i.client_name)}, do hereby appoint and retain Shri/Smt ${d(i.advocate_name)}, Advocate, to appear, plead and act on my/our behalf in the matter of:

Court: ${d(i.court_name)}
Case No.: ${d(i.case_number)}
Title: ${d(i.case_title)}

I/We hereby give my/our consent for the said Advocate to file necessary applications, file documents, and represent me/us in all proceedings in the above matter.

Date: ${d(i.date) || new Date().toLocaleDateString('en-IN')}

Client`;
  }
  return 'Select a template and fill the details.';
}

/**
 * Generate draft text for a given template and inputs.
 * Uses AI when SERVAM_AI_API_KEY is set; otherwise static template.
 */
async function generateDraft(templateKey, inputs) {
  const key = templateKey.toUpperCase();
  if (!DRAFT_TEMPLATES[key]) {
    return getStaticDraft('LEGAL_NOTICE', inputs);
  }
  const placeholders = DRAFT_TEMPLATES[key].placeholders;
  const filled = placeholders.map((p) => `${p}: ${(inputs && inputs[p]) || ''}`).join('\n');
  const prompt = `Generate a professional Indian legal document: "${DRAFT_TEMPLATES[key].name}". Use exactly the following details (fill blanks if any):\n\n${filled}\n\nOutput only the document text, no explanation.`;
  const response = await chatCompletion([{ role: 'user', content: prompt }]);
  if (response) return response;
  return getStaticDraft(key, inputs);
}

module.exports = {
  hasAiConfig,
  chatCompletion,
  extractMetadataFromOcr,
  generateCaseSummary,
  generateDraft,
  getStaticDraft,
  DRAFT_TEMPLATES
};
