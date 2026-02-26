'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'case_documents';
    try {
      const desc = await queryInterface.describeTable(table);
      if (!desc.extracted_metadata) {
        await queryInterface.addColumn(table, 'extracted_metadata', {
          type: Sequelize.TEXT('long'),
          allowNull: true
        });
      }
    } catch (e) {
      // Table might not exist in some envs; rethrow so migration fails visibly
      throw e;
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('case_documents', 'extracted_metadata').catch(() => {});
  }
};
