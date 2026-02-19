'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('case_hearings', 'organization_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'organizations', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
    await queryInterface.addColumn('case_hearings', 'created_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'organization_users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    await queryInterface.sequelize.query(`
      UPDATE case_hearings ch
      INNER JOIN cases c ON ch.case_id = c.id
      SET ch.organization_id = c.organization_id
    `);
    await queryInterface.changeColumn('case_hearings', 'organization_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'organizations', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
    await queryInterface.changeColumn('case_hearings', 'hearing_date', {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.addColumn('case_hearings', 'hearing_type', {
      type: Sequelize.ENUM('REGULAR', 'ARGUMENT', 'EVIDENCE', 'FINAL', 'OTHER'),
      allowNull: false,
      defaultValue: 'REGULAR'
    });
    await queryInterface.addColumn('case_hearings', 'status', {
      type: Sequelize.ENUM('UPCOMING', 'COMPLETED', 'ADJOURNED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'UPCOMING'
    });
    await queryInterface.addColumn('case_hearings', 'reminder_sent', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await queryInterface.addIndex('case_hearings', ['organization_id'], { name: 'case_hearings_organization_id_idx' });
    await queryInterface.addIndex('case_hearings', ['hearing_date'], { name: 'case_hearings_hearing_date_idx' });
    await queryInterface.addIndex('case_hearings', ['status'], { name: 'case_hearings_status_idx' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('case_hearings', 'case_hearings_status_idx');
    await queryInterface.removeIndex('case_hearings', 'case_hearings_hearing_date_idx');
    await queryInterface.removeIndex('case_hearings', 'case_hearings_organization_id_idx');
    await queryInterface.removeColumn('case_hearings', 'reminder_sent');
    await queryInterface.removeColumn('case_hearings', 'status');
    await queryInterface.removeColumn('case_hearings', 'hearing_type');
    await queryInterface.changeColumn('case_hearings', 'hearing_date', { type: Sequelize.DATEONLY, allowNull: true });
    await queryInterface.removeColumn('case_hearings', 'created_by');
    await queryInterface.removeColumn('case_hearings', 'organization_id');
  }
};
