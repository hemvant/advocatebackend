'use strict';

const AIService = require('./AIService');
const pdfParse = require('pdf-parse');

async function runFeature(context, featureKey, userContent, placeholders = {}, inputSummary = null) {
  return AIService.completeRequest(context, featureKey, {
    userContent,
    placeholders,
    inputSummary: inputSummary || userContent ? String(userContent).slice(0, 500) : null
  });
}

async function caseSummary(context, body) {
  const text = body.case_facts || body.facts || '';
  if (!text.trim()) return { success: false, error: 'case_facts required' };
  return runFeature(context, 'case_summary', text, {}, text.slice(0, 500));
}

async function draft(context, body) {
  const type = (body.type || body.document_type || 'Legal Notice').trim();
  const caseData = body.case_data || body.inputs || {};
  const userContent = `Document type: ${type}\n\nCase data (JSON):\n${JSON.stringify(caseData)}`;
  return runFeature(context, 'draft', userContent, caseData, userContent.slice(0, 500));
}

async function judgmentSummary(context, body) {
  let text = body.text || body.judgment_text || '';
  if (body.pdf_base64) {
    try {
      const buf = Buffer.from(body.pdf_base64, 'base64');
      const data = await pdfParse(buf);
      text = data.text || '';
    } catch (e) {
      return { success: false, error: 'Failed to extract text from PDF' };
    }
  }
  if (!text.trim()) return { success: false, error: 'text or pdf_base64 required' };
  const chunkSize = 12000;
  if (text.length > chunkSize) {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    let fullSummary = '';
    for (const chunk of chunks) {
      const result = await runFeature(context, 'judgment_summary', chunk, {}, chunk.slice(0, 200));
      if (!result.success) return result;
      fullSummary += (fullSummary ? '\n\n' : '') + result.text;
    }
    const finalResult = await runFeature(context, 'judgment_summary', `Summarize and consolidate:\n${fullSummary}`, {}, 'chunked');
    return finalResult;
  }
  return runFeature(context, 'judgment_summary', text, {}, text.slice(0, 500));
}

async function crossExam(context, body) {
  const text = body.witness_statement || body.statement || '';
  if (!text.trim()) return { success: false, error: 'witness_statement required' };
  return runFeature(context, 'cross_exam', text, {}, text.slice(0, 500));
}

async function firAnalysis(context, body) {
  const text = body.fir_text || body.fir || body.text || '';
  if (!text.trim()) return { success: false, error: 'fir_text required' };
  return runFeature(context, 'fir_analysis', text, {}, text.slice(0, 500));
}

async function legalResearch(context, body) {
  const query = body.query || body.question || '';
  if (!query.trim()) return { success: false, error: 'query required' };
  return runFeature(context, 'legal_research', query, {}, query.slice(0, 500));
}

module.exports = {
  caseSummary,
  draft,
  judgmentSummary,
  crossExam,
  firAnalysis,
  legalResearch
};
