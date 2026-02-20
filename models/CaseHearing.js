const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const CaseHearing = sequelize.define('CaseHearing', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  case_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'cases', key: 'id' }
  },
  organization_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'organizations', key: 'id' }
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'organization_users', key: 'id' }
  },
  hearing_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  courtroom: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  courtroom_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'courtrooms', key: 'id' }
  },
  judge_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'judges', key: 'id' }
  },
  bench_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'court_benches', key: 'id' }
  },
  hearing_type: {
    type: DataTypes.ENUM('REGULAR', 'ARGUMENT', 'EVIDENCE', 'FINAL', 'OTHER'),
    allowNull: false,
    defaultValue: 'REGULAR'
  },
  status: {
    type: DataTypes.ENUM('UPCOMING', 'COMPLETED', 'ADJOURNED', 'CANCELLED'),
    allowNull: false,
    defaultValue: 'UPCOMING'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  reminder_sent: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'case_hearings',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = CaseHearing;
