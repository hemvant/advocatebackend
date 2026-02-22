const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const Case = sequelize.define('Case', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  organization_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'organizations', key: 'id' }
  },
  client_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'clients', key: 'id' }
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'organization_users', key: 'id' }
  },
  assigned_to: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'organization_users', key: 'id' }
  },
  case_title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  case_number: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  court_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'courts', key: 'id' }
  },
  bench_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'court_benches', key: 'id' }
  },
  judge_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'judges', key: 'id' }
  },
  courtroom_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'courtrooms', key: 'id' }
  },
  case_type: {
    type: DataTypes.ENUM('CIVIL', 'CRIMINAL', 'CORPORATE', 'TAX', 'FAMILY', 'OTHER'),
    allowNull: false,
    defaultValue: 'OTHER'
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'FILED', 'HEARING', 'ARGUMENT', 'JUDGMENT', 'CLOSED'),
    allowNull: false,
    defaultValue: 'DRAFT'
  },
  priority: {
    type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'),
    allowNull: false,
    defaultValue: 'MEDIUM'
  },
  filing_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  next_hearing_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_deleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  case_lifecycle_status: {
    type: DataTypes.ENUM('Active', 'Closed', 'On_Hold', 'Appeal'),
    allowNull: false,
    defaultValue: 'Active'
  }
}, {
  tableName: 'cases',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Case;
