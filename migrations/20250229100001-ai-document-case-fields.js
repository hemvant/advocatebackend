'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const docTable = 'case_documents';
    const caseTable = 'cases';
    try {
      const docDesc = await queryInterface.describeTable(docTable);
      if (!docDesc.extracted_metadata) {
        await queryInterface.addColumn(docTable, 'extracted_metadata', {
          type: Sequelize.JSON,
          allowNull: true
        });
      }
    } catch (e) {
      // ignore if column exists
    }
    try {
      const caseDesc = await queryInterface.describeTable(caseTable);
      if (!caseDesc.case_summary) {
        await queryInterface.addColumn(caseTable, 'case_summary', {
          type: Sequelize.TEXT,
          allowNull: true
        });
      }
    } catch (e) {
      // ignore
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('case_documents', 'extracted_metadata').catch(() => {});
    await queryInterface.removeColumn('cases', 'case_summary').catch(() => {});
  }
};
