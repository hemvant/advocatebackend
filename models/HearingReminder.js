const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const HearingReminder = sequelize.define('HearingReminder', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  hearing_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'case_hearings', key: 'id' }
  },
  reminder_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  reminder_type: {
    type: DataTypes.ENUM('EMAIL', 'SYSTEM'),
    allowNull: false,
    defaultValue: 'SYSTEM'
  },
  is_sent: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'hearing_reminders',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = HearingReminder;
