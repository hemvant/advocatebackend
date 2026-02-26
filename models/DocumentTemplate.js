const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const DocumentTemplate = sequelize.define('DocumentTemplate', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  organization_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'organizations', key: 'id' } },
  name: { type: DataTypes.STRING(255), allowNull: false },
  template_type: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'VAKALATNAMA' },
  content: { type: DataTypes.TEXT('long'), allowNull: true },
  variables: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    get() {
      const v = this.getDataValue('variables');
      if (v == null || v === '') return null;
      try { return JSON.parse(v); } catch (e) { return null; }
    },
    set(val) {
      this.setDataValue('variables', val != null ? JSON.stringify(val) : null);
    }
  },
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, {
  tableName: 'document_templates',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = DocumentTemplate;
