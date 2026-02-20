'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SystemMetric extends Model {}
  SystemMetric.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    metric_name: { type: DataTypes.STRING(100), allowNull: false },
    metric_value: { type: DataTypes.DECIMAL(18, 4), allowNull: true }
  }, {
    sequelize,
    modelName: 'SystemMetric',
    tableName: 'system_metrics',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });
  return SystemMetric;
};
