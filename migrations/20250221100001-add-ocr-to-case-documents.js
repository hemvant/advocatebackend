'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'case_documents';
    const tableDesc = await queryInterface.describeTable(table).catch(() => ({}));

    if (!tableDesc.ocr_status) {
      await queryInterface.addColumn(table, 'ocr_status', {
        type: Sequelize.ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'),
        allowNull: true,
        defaultValue: 'PENDING'
      });
    }
    if (!tableDesc.ocr_text) {
      await queryInterface.addColumn(table, 'ocr_text', {
        type: Sequelize.TEXT('long'),
        allowNull: true
      });
    }

    await queryInterface.addIndex(table, ['organization_id'], { name: 'case_documents_org_id_ocr_idx' }).catch(() => {});
    await queryInterface.addIndex(table, ['case_id'], { name: 'case_documents_case_id_ocr_idx' }).catch(() => {});
    await queryInterface.addIndex(table, ['ocr_status'], { name: 'case_documents_ocr_status_idx' }).catch(() => {});

    try {
      await queryInterface.sequelize.query(
        'ALTER TABLE case_documents ADD FULLTEXT INDEX case_documents_ocr_text_ft (ocr_text)'
      );
    } catch (e) {
      if (!e.message || !e.message.includes('Duplicate')) throw e;
    }
  },

  async down(queryInterface) {
    const table = 'case_documents';
    try {
      await queryInterface.sequelize.query('ALTER TABLE case_documents DROP INDEX case_documents_ocr_text_ft');
    } catch (_) {}
    await queryInterface.removeIndex(table, 'case_documents_ocr_status_idx').catch(() => {});
    await queryInterface.removeIndex(table, 'case_documents_case_id_ocr_idx').catch(() => {});
    await queryInterface.removeIndex(table, 'case_documents_org_id_ocr_idx').catch(() => {});
    await queryInterface.removeColumn(table, 'ocr_text').catch(() => {});
    await queryInterface.removeColumn(table, 'ocr_status').catch(() => {});
  }
};
