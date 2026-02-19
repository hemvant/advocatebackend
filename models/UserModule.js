const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const UserModule = sequelize.define('UserModule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE'
  },
  module_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'modules', key: 'id' },
    onDelete: 'CASCADE'
  }
}, {
  tableName: 'user_modules',
  timestamps: false,
  underscored: true,
  indexes: [
    { unique: true, fields: ['user_id', 'module_id'] }
  ]
});

module.exports = UserModule;
