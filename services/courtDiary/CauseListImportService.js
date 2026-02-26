'use strict';

const pdfParse = require('pdf-parse');
const { Case, CaseHearing } = require('../../models');
const logger = require('../../utils/logger');

/** Cause list PDF import: extract case numbers, match cases, create hearings. Multi-org. */
class CauseListImportService {
  static async extractTextFromPdf(pdfBuffer) {
    const data = await pdfParse(pdfBuffer);
    return data.text || '';
  }

  /** Match CNR-like or numeric case numbers in text */
  static extractCaseNumbers(text) {
    const normalized = text.replace(/\s+/g, ' ');
    const candidates = new Set();
    const cnrLike = /[\dA-Za-z]{2,}\/[\/\dA-Za-z.-]+/g;
    const simpleNum = /\b\d{4,}\/\d{2,}\b/g;
    let m;
    while ((m = cnrLike.exec(normalized)) !== null) candidates.add(m[0].trim());
    while ((m = simpleNum.exec(normalized)) !== null) candidates.add(m[0].trim());
    return Array.from(candidates);
  }

  /**
   * @param {number} organizationId
   * @param {Buffer} pdfBuffer
   * @param {string} hearingDate - YYYY-MM-DD or ISO
   * @param {number} [createdByUserId]
   */
  static async importFromPdf(organizationId, pdfBuffer, hearingDate, createdByUserId = null) {
    const result = { matched: 0, created: 0, caseNumbers: [], errors: [] };
    let text;
    try {
      text = await CauseListImportService.extractTextFromPdf(pdfBuffer);
    } catch (e) {
      result.errors.push('Failed to extract text from PDF: ' + e.message);
      return result;
    }
    const caseNumbers = CauseListImportService.extractCaseNumbers(text);
    result.caseNumbers = caseNumbers;
    const hearingDt = hearingDate ? new Date(hearingDate) : new Date();

    for (const num of caseNumbers) {
      const caseRecord = await Case.findOne({
        where: { organization_id: organizationId, case_number: num, is_deleted: false }
      });
      if (!caseRecord) continue;
      result.matched++;
      try {
        const existing = await CaseHearing.findOne({
          where: { case_id: caseRecord.id, organization_id: organizationId, is_deleted: false },
          order: [['hearing_number', 'DESC']],
          attributes: ['id', 'hearing_number']
        });
        const hearingNumber = (existing?.hearing_number ?? 0) + 1;
        await CaseHearing.create({
          case_id: caseRecord.id,
          organization_id: organizationId,
          created_by: createdByUserId,
          hearing_date: hearingDt,
          hearing_number: hearingNumber,
          previous_hearing_id: existing?.id || null,
          status: 'UPCOMING',
          hearing_type: 'REGULAR',
          is_deleted: false
        });
        result.created++;
      } catch (e) {
        logger.warn('[CauseListImport] Create hearing failed for case ' + caseRecord.id, e.message);
        result.errors.push('Case ' + num + ': ' + e.message);
      }
    }
    return result;
  }
}

module.exports = CauseListImportService;
