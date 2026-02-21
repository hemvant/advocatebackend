'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'document_versions';
    const desc = await queryInterface.describeTable(table).catch(() => ({}));

    if (!desc.organization_id) {
      await queryInterface.addColumn(table, 'organization_id', {
        type: Sequelize.INTEGER,
        allowNull: true
      });
      await queryInterface.sequelize.query(
        'UPDATE document_versions dv INNER JOIN case_documents cd ON dv.document_id = cd.id SET dv.organization_id = cd.organization_id WHERE dv.organization_id IS NULL'
      );
      await queryInterface.addConstraint(table, {
        fields: ['organization_id'],
        type: 'foreign key',
        name: 'document_versions_organization_id_fk',
        references: { table: 'organizations', field: 'id' },
        onDelete: 'CASCADE'
      });
    }
    if (!desc.file_name) await queryInterface.addColumn(table, 'file_name', { type: Sequelize.STRING(255), allowNull: true });
    if (!desc.file_size) await queryInterface.addColumn(table, 'file_size', { type: Sequelize.INTEGER, allowNull: true });
    if (!desc.mime_type) await queryInterface.addColumn(table, 'mime_type', { type: Sequelize.STRING(100), allowNull: true });
    if (!desc.ocr_text) await queryInterface.addColumn(table, 'ocr_text', { type: Sequelize.TEXT('long'), allowNull: true });
    if (!desc.change_type) {
      await queryInterface.addColumn(table, 'change_type', {
        type: Sequelize.ENUM('CREATED', 'UPDATED_FILE', 'UPDATED_METADATA', 'DELETED'),
        allowNull: true,
        defaultValue: 'UPDATED_FILE'
      });
      await queryInterface.sequelize.query("UPDATE document_versions SET change_type = 'UPDATED_FILE' WHERE change_type IS NULL");
    }
    if (!desc.changed_by) {
      await queryInterface.addColumn(table, 'changed_by', { type: Sequelize.INTEGER, allowNull: true });
      await queryInterface.sequelize.query('UPDATE document_versions SET changed_by = uploaded_by WHERE changed_by IS NULL');
      await queryInterface.addConstraint(table, {
        fields: ['changed_by'],
        type: 'foreign key',
        name: 'document_versions_changed_by_fk',
        references: { table: 'organization_users', field: 'id' },
        onDelete: 'SET NULL'
      });
    }
    if (!desc.change_summary) await queryInterface.addColumn(table, 'change_summary', { type: Sequelize.STRING(500), allowNull: true });

    await queryInterface.addIndex(table, ['organization_id'], { name: 'document_versions_organization_id_idx' }).catch(() => {});
    await queryInterface.addIndex(table, ['created_at'], { name: 'document_versions_created_at_idx' }).catch(() => {});

    const docTable = 'case_documents';
    const docDesc = await queryInterface.describeTable(docTable).catch(() => ({}));
    if (!docDesc.current_version) {
      await queryInterface.addColumn(docTable, 'current_version', { type: Sequelize.INTEGER, allowNull: true });
      await queryInterface.sequelize.query('UPDATE case_documents SET current_version = version_number WHERE current_version IS NULL');
      await queryInterface.changeColumn(docTable, 'current_version', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 });
    }
  },

  async down(queryInterface) {
    const table = 'document_versions';
    try {
      await queryInterface.removeConstraint(table, 'document_versions_organization_id_fk');
    } catch (_) {}
    try {
      await queryInterface.removeConstraint(table, 'document_versions_changed_by_fk');
    } catch (_) {}
    await queryInterface.removeIndex(table, 'document_versions_organization_id_idx').catch(() => {});
    await queryInterface.removeIndex(table, 'document_versions_created_at_idx').catch(() => {});
    await queryInterface.removeColumn(table, 'organization_id').catch(() => {});
    await queryInterface.removeColumn(table, 'file_name').catch(() => {});
    await queryInterface.removeColumn(table, 'file_size').catch(() => {});
    await queryInterface.removeColumn(table, 'mime_type').catch(() => {});
    await queryInterface.removeColumn(table, 'ocr_text').catch(() => {});
    await queryInterface.removeColumn(table, 'change_type').catch(() => {});
    await queryInterface.removeColumn(table, 'changed_by').catch(() => {});
    await queryInterface.removeColumn(table, 'change_summary').catch(() => {});

    await queryInterface.removeColumn('case_documents', 'current_version').catch(() => {});
  }
};
