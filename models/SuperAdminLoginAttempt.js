'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SuperAdminLoginAttempt extends Model {}
  SuperAdminLoginAttempt.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    email: { type: DataTypes.STRING(255), allowNull: false },
    ip_address: { type: DataTypes.STRING(45), allowNull: true },
    success: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
  }, { sequelize, modelName: 'SuperAdminLoginAttempt', tableName: 'super_admin_login_attempts', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: false });
  return SuperAdminLoginAttempt;
};
