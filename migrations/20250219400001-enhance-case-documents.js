'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('case_documents');
    if (!tableDesc.organization_id) {
      await queryInterface.addColumn('case_documents', 'organization_id', {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }
    await queryInterface.sequelize.query(
      "UPDATE case_documents cd INNER JOIN cases c ON cd.case_id = c.id SET cd.organization_id = c.organization_id WHERE cd.organization_id IS NULL"
    );
    const [fk] = await queryInterface.sequelize.query(
      "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'case_documents' AND COLUMN_NAME = 'organization_id' AND REFERENCED_TABLE_NAME = 'organizations'"
    );
    if (fk && fk.length > 0) {
      await queryInterface.removeConstraint('case_documents', fk[0].CONSTRAINT_NAME);
    }
    await queryInterface.changeColumn('case_documents', 'organization_id', {
      type: Sequelize.INTEGER,
      allowNull: false
    });
    try {
      await queryInterface.addConstraint('case_documents', {
        fields: ['organization_id'],
        type: 'foreign key',
        name: 'case_documents_organization_id_fk',
        references: { table: 'organizations', field: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });
    } catch (e) {
      if (!e.message || !e.message.includes('Duplicate')) throw e;
    }
    if (!tableDesc.document_name) {
      await queryInterface.addColumn('case_documents', 'document_name', { type: Sequelize.STRING(255), allowNull: true });
    }
    await queryInterface.sequelize.query("UPDATE case_documents SET document_name = file_name WHERE document_name IS NULL");
    await queryInterface.changeColumn('case_documents', 'document_name', { type: Sequelize.STRING(255), allowNull: false });
    if (!tableDesc.original_file_name) await queryInterface.addColumn('case_documents', 'original_file_name', { type: Sequelize.STRING(255), allowNull: true });
    await queryInterface.sequelize.query("UPDATE case_documents SET original_file_name = file_name WHERE original_file_name IS NULL");
    if (!tableDesc.file_size) await queryInterface.addColumn('case_documents', 'file_size', { type: Sequelize.INTEGER, allowNull: true });
    if (!tableDesc.mime_type) await queryInterface.addColumn('case_documents', 'mime_type', { type: Sequelize.STRING(100), allowNull: true });
    if (!tableDesc.document_type) {
      await queryInterface.addColumn('case_documents', 'document_type', {
        type: Sequelize.ENUM('PETITION', 'EVIDENCE', 'AGREEMENT', 'NOTICE', 'ORDER', 'OTHER'),
        allowNull: false,
        defaultValue: 'OTHER'
      });
    }
    if (!tableDesc.version_number) {
      await queryInterface.addColumn('case_documents', 'version_number', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      });
    }
    if (!tableDesc.is_deleted) {
      await queryInterface.addColumn('case_documents', 'is_deleted', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
    if (!tableDesc.updated_at) {
      await queryInterface.addColumn('case_documents', 'updated_at', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      });
    }
    try {
      await queryInterface.addIndex('case_documents', ['organization_id'], { name: 'case_documents_organization_id_idx' });
    } catch (e) { if (!e.message || !e.message.includes('Duplicate')) throw e; }
    try {
      await queryInterface.addIndex('case_documents', ['uploaded_by'], { name: 'case_documents_uploaded_by_idx' });
    } catch (e) { if (!e.message || !e.message.includes('Duplicate')) throw e; }
    try {
      await queryInterface.addIndex('case_documents', ['document_type'], { name: 'case_documents_document_type_idx' });
    } catch (e) { if (!e.message || !e.message.includes('Duplicate')) throw e; }
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('case_documents', 'case_documents_document_type_idx');
    await queryInterface.removeIndex('case_documents', 'case_documents_uploaded_by_idx');
    await queryInterface.removeIndex('case_documents', 'case_documents_organization_id_idx');
    try {
      await queryInterface.removeConstraint('case_documents', 'case_documents_organization_id_fk');
    } catch (e) { /* ignore if not exists */ }
    await queryInterface.removeColumn('case_documents', 'updated_at');
    await queryInterface.removeColumn('case_documents', 'is_deleted');
    await queryInterface.removeColumn('case_documents', 'version_number');
    await queryInterface.removeColumn('case_documents', 'document_type');
    await queryInterface.removeColumn('case_documents', 'mime_type');
    await queryInterface.removeColumn('case_documents', 'file_size');
    await queryInterface.removeColumn('case_documents', 'original_file_name');
    await queryInterface.removeColumn('case_documents', 'document_name');
    await queryInterface.removeColumn('case_documents', 'organization_id');
  }
};
