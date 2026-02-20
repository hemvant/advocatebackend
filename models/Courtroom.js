const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const Courtroom = sequelize.define('Courtroom', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  court_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'courts', key: 'id' }
  },
  bench_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'court_benches', key: 'id' }
  },
  room_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  floor: {
    type: DataTypes.STRING(50),
    allowNull: true
  }
}, {
  tableName: 'courtrooms',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = Courtroom;
