'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'case_hearings';
    try {
      const desc = await queryInterface.describeTable(table);
      if (!desc.reminder_1_day_sent) {
        await queryInterface.addColumn(table, 'reminder_1_day_sent', { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false });
      }
      if (!desc.reminder_2_hour_sent) {
        await queryInterface.addColumn(table, 'reminder_2_hour_sent', { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false });
      }
    } catch (e) { throw e; }
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('case_hearings', 'reminder_1_day_sent').catch(() => {});
    await queryInterface.removeColumn('case_hearings', 'reminder_2_hour_sent').catch(() => {});
  }
};
