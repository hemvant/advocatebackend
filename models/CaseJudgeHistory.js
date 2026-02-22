const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const CaseJudgeHistory = sequelize.define('CaseJudgeHistory', {
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
  judge_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'judges', key: 'id' }
  },
  assigned_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  unassigned_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  transfer_reason: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'case_judge_history',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = CaseJudgeHistory;
