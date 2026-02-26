'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'document_versions';
    try {
      const desc = await queryInterface.describeTable(table);
      if (!desc.previous_version_id) {
        await queryInterface.addColumn(table, 'previous_version_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'document_versions', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        });
      }
      if (!desc.change_note) {
        await queryInterface.addColumn(table, 'change_note', {
          type: Sequelize.TEXT,
          allowNull: true
        });
      }
    } catch (e) { throw e; }
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('document_versions', 'previous_version_id').catch(() => {});
    await queryInterface.removeColumn('document_versions', 'change_note').catch(() => {});
  }
};
