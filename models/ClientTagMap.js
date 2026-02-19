const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const ClientTagMap = sequelize.define('ClientTagMap', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  client_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'clients', key: 'id' }
  },
  tag_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'client_tags', key: 'id' }
  }
}, {
  tableName: 'client_tag_map',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = ClientTagMap;
