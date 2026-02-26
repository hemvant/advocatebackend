'use strict';

const PDFDocument = require('pdfkit');
const CourtDiaryCalendarService = require('./CourtDiaryCalendarService');

/**
 * Generates a printable daily diary PDF (grouped by court & time).
 * Multi-org: uses CourtDiaryCalendarService with user context.
 */
class DiaryPdfService {
  /**
   * @param {Object} user - req.user
   * @param {string} date - YYYY-MM-DD
   * @param {Object} [filters] - advocate_id, court_id, case_type
   * @returns {Promise<Buffer>}
   */
  static async generate(user, date, filters = {}) {
    const diary = await CourtDiaryCalendarService.getDiaryForDate(user, date, filters);
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text('Daily Court Diary', { align: 'center' });
      doc.fontSize(12).text(date, { align: 'center' });
      doc.moveDown();

      const courtNames = Object.keys(diary.byCourt).sort();
      for (const courtName of courtNames) {
        const hearings = diary.byCourt[courtName];
        doc.fontSize(14).fillColor('navy').text(courtName, { continued: false });
        doc.moveDown(0.5);
        for (const h of hearings) {
          const timeStr = h.hearing_date ? new Date(h.hearing_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
          const caseTitle = h.Case?.case_title || '—';
          const clientName = h.Case?.Client?.name || '—';
          const stage = h.Case?.status || '—';
          doc.fontSize(10).fillColor('black');
          doc.text(`${timeStr}  ${caseTitle}`, { continued: false });
          doc.fontSize(9).fillColor('gray').text(`   Client: ${clientName}  |  Stage: ${stage}`, { continued: false });
          doc.moveDown(0.3);
        }
        doc.moveDown(0.5);
      }

      if (courtNames.length === 0) {
        doc.fontSize(11).text('No hearings for this date.', { align: 'center' });
      }

      doc.end();
    });
  }
}

module.exports = DiaryPdfService;
