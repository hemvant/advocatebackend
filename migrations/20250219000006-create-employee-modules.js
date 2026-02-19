'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('employee_modules', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      organization_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'organization_users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      module_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'modules', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    await queryInterface.addIndex('employee_modules', ['organization_user_id', 'module_id'], {
      unique: true,
      name: 'employee_modules_user_module_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('employee_modules');
  }
};
