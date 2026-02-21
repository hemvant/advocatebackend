const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const CHANGE_TYPES = ['CREATED', 'UPDATED_FILE', 'UPDATED_METADATA', 'DELETED'];

const DocumentVersion = sequelize.define('DocumentVersion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  document_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'case_documents', key: 'id' }
  },
  organization_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'organizations', key: 'id' }
  },
  version_number: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  file_path: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  file_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  mime_type: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  ocr_text: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  change_type: {
    type: DataTypes.ENUM(...CHANGE_TYPES),
    allowNull: true
  },
  changed_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'organization_users', key: 'id' }
  },
  change_summary: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  uploaded_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'organization_users', key: 'id' }
  }
}, {
  tableName: 'document_versions',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: false
});

DocumentVersion.CHANGE_TYPES = CHANGE_TYPES;
module.exports = DocumentVersion;
