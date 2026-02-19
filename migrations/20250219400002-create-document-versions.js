'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('document_versions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      document_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'case_documents', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      version_number: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      file_path: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      uploaded_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'organization_users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    await queryInterface.addIndex('document_versions', ['document_id'], { name: 'document_versions_document_id_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('document_versions');
  }
};
