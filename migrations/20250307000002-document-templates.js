'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('document_templates', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      organization_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'organizations', key: 'id' } },
      name: { type: Sequelize.STRING(255), allowNull: false },
      template_type: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'VAKALATNAMA' },
      content: { type: Sequelize.TEXT('long'), allowNull: true },
      variables: { type: Sequelize.TEXT('long'), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('document_templates', ['organization_id']);
    await queryInterface.addIndex('document_templates', ['template_type']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('document_templates');
  }
};
