'use strict';

const https = require('https');
const http = require('http');
const logger = require('../utils/logger');

const ECOURTS_API_URL = (process.env.ECOURTS_API_URL || '').trim();
const ECOURTS_API_KEY = (process.env.ECOURTS_API_KEY || '').trim();
const isConfigured = ECOURTS_API_URL.length > 0;

/**
 * Fetch case status from eCourts (or mock when env not set).
 * @param {string} cnrNumber - CNR number
 * @returns {Promise<{ success: boolean, data?: { status, next_hearing_date?, court_no?, stage? }, error?: string }>}
 */
async function fetchCaseStatusByCNR(cnrNumber) {
  const cnr = (cnrNumber || '').trim();
  if (!cnr) {
    return { success: false, error: 'CNR number is required' };
  }

  if (!isConfigured) {
    return getMockResponse(cnr);
  }

  try {
    const url = new URL(ECOURTS_API_URL);
    const path = url.pathname + url.search;
    const isHttps = url.protocol === 'https:';
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: path.replace(/\/$/, '') + (path.includes('?') ? '&' : '?') + 'cnr=' + encodeURIComponent(cnr),
      method: 'GET',
      headers: { Accept: 'application/json' }
    };
    if (ECOURTS_API_KEY) {
      options.headers['X-API-Key'] = ECOURTS_API_KEY;
      options.headers['Authorization'] = 'Bearer ' + ECOURTS_API_KEY;
    }
    const lib = isHttps ? https : http;
    const raw = await new Promise((resolve, reject) => {
      const req = lib.request(options, (res) => {
        let body = '';
        res.on('data', (ch) => { body += ch; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            reject(new Error(`eCourts API returned ${res.statusCode}: ${body.slice(0, 200)}`));
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(15000, () => { req.destroy(); reject(new Error('eCourts API timeout')); });
      req.end();
    });

    const data = safeParse(raw);
    return parseExternalResponse(data, cnr);
  } catch (err) {
    logger.warn('[ECourtSync] fetchCaseStatusByCNR failed:', err.message);
    return { success: false, error: err.message || 'Failed to fetch eCourts status' };
  }
}

function safeParse(str) {
  try {
    return JSON.parse(str || '{}');
  } catch {
    return {};
  }
}

/**
 * Parse API response. Supports common shapes: { status, next_hearing_date, court_no, stage }
 * or nested in data/caseDetails.
 */
function parseExternalResponse(data, cnr) {
  if (data.error || (data.success === false) || data.notFound) {
    return { success: false, error: data.error || data.message || 'Case not found in eCourts' };
  }
  const status = data.status ?? data.caseStatus ?? data.CaseStatus ?? data.data?.status ?? null;
  const nextDate = data.next_hearing_date ?? data.nextHearingDate ?? data.NextHearingDate ?? data.data?.next_hearing_date ?? data.data?.nextHearingDate ?? null;
  const courtNo = data.court_no ?? data.courtNo ?? data.CourtNo ?? data.data?.court_no ?? null;
  const stage = data.stage ?? data.Stage ?? data.data?.stage ?? null;

  const normalized = {
    status: status != null ? String(status) : null,
    next_hearing_date: normalizeDate(nextDate),
    court_no: courtNo != null ? String(courtNo) : null,
    stage: stage != null ? String(stage) : null
  };

  if (!normalized.status && !normalized.next_hearing_date && !normalized.court_no && !normalized.stage) {
    return { success: false, error: 'eCourts response had no recognizable status fields' };
  }

  return { success: true, data: normalized };
}

function normalizeDate(val) {
  if (val == null) return null;
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return null;
}

function getMockResponse(cnr) {
  return Promise.resolve({
    success: true,
    data: {
      status: 'Pending',
      next_hearing_date: null,
      court_no: '1',
      stage: 'Hearing'
    }
  });
}

module.exports = {
  fetchCaseStatusByCNR,
  isConfigured
};
