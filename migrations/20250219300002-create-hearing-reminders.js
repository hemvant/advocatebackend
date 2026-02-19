'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('hearing_reminders', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      hearing_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'case_hearings', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      reminder_time: {
        type: Sequelize.DATE,
        allowNull: true
      },
      reminder_type: {
        type: Sequelize.ENUM('EMAIL', 'SYSTEM'),
        allowNull: false,
        defaultValue: 'SYSTEM'
      },
      is_sent: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    await queryInterface.addIndex('hearing_reminders', ['hearing_id'], { name: 'hearing_reminders_hearing_id_idx' });
    await queryInterface.addIndex('hearing_reminders', ['reminder_time', 'is_sent'], { name: 'hearing_reminders_sent_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('hearing_reminders');
  }
};
