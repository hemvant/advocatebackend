const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const DOCUMENT_TYPES = ['PETITION', 'EVIDENCE', 'AGREEMENT', 'NOTICE', 'ORDER', 'OTHER'];
const OCR_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'];

const CaseDocument = sequelize.define('CaseDocument', {
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
  case_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'cases', key: 'id' }
  },
  uploaded_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'organization_users', key: 'id' }
  },
  document_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  original_file_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  file_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  file_path: {
    type: DataTypes.STRING(500),
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
  document_type: {
    type: DataTypes.ENUM(...DOCUMENT_TYPES),
    allowNull: false,
    defaultValue: 'OTHER'
  },
  version_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  current_version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  is_deleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  ocr_text: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  ocr_status: {
    type: DataTypes.ENUM(...OCR_STATUSES),
    allowNull: true,
    defaultValue: 'PENDING'
  }
}, {
  tableName: 'case_documents',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

CaseDocument.DOCUMENT_TYPES = DOCUMENT_TYPES;
CaseDocument.OCR_STATUSES = OCR_STATUSES;
module.exports = CaseDocument;
