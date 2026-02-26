'use strict';

const path = require('path');
const PDFDocument = require('pdfkit');
const { DocumentTemplate, Case, Client, OrganizationUser, Court } = require('../models');
const { UPLOAD_BASE } = require('../config/uploads');

const DEFAULT_VARIABLES = ['client_name', 'client_email', 'client_phone', 'case_number', 'case_title', 'court_name', 'advocate_name'];

function fillTemplate(content, data) {
  if (!content) return '';
  let out = content;
  for (const [key, value] of Object.entries(data)) {
    const re = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
    out = out.replace(re, value != null ? String(value) : '');
  }
  return out;
}

async function listTemplates(req, res, next) {
  try {
    const where = { organization_id: req.user.organization_id };
    if (req.query.template_type) where.template_type = req.query.template_type;
    if (req.query.is_active !== undefined) where.is_active = req.query.is_active === 'true';
    const rows = await DocumentTemplate.findAll({ where, order: [['name', 'ASC']] });
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

async function getTemplate(req, res, next) {
  try {
    const template = await DocumentTemplate.findOne({
      where: { id: req.params.id, organization_id: req.user.organization_id }
    });
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, data: template });
  } catch (err) {
    next(err);
  }
}

async function createTemplate(req, res, next) {
  try {
    const { name, template_type, content, variables, is_active } = req.body;
    const template = await DocumentTemplate.create({
      organization_id: req.user.organization_id,
      name: (name || '').trim(),
      template_type: (template_type || 'VAKALATNAMA').trim(),
      content: content || null,
      variables: variables || DEFAULT_VARIABLES,
      is_active: is_active !== false
    });
    res.status(201).json({ success: true, data: template });
  } catch (err) {
    next(err);
  }
}

async function updateTemplate(req, res, next) {
  try {
    const template = await DocumentTemplate.findOne({
      where: { id: req.params.id, organization_id: req.user.organization_id }
    });
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    const { name, template_type, content, variables, is_active } = req.body;
    if (name !== undefined) template.name = (name || '').trim();
    if (template_type !== undefined) template.template_type = (template_type || 'VAKALATNAMA').trim();
    if (content !== undefined) template.content = content;
    if (variables !== undefined) template.variables = variables;
    if (is_active !== undefined) template.is_active = is_active;
    await template.save();
    res.json({ success: true, data: template });
  } catch (err) {
    next(err);
  }
}

async function deleteTemplate(req, res, next) {
  try {
    const template = await DocumentTemplate.findOne({
      where: { id: req.params.id, organization_id: req.user.organization_id }
    });
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    await template.destroy();
    res.json({ success: true, message: 'Template deleted' });
  } catch (err) {
    next(err);
  }
}

async function generatePdf(req, res, next) {
  try {
    const template = await DocumentTemplate.findOne({
      where: { id: req.params.id, organization_id: req.user.organization_id, is_active: true }
    });
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    const { case_id } = req.body;
    const caseRecord = await Case.findOne({
      where: { id: case_id, organization_id: req.user.organization_id, is_deleted: false },
      include: [
        { model: Client, as: 'Client', attributes: ['id', 'name', 'email', 'phone'] },
        { model: OrganizationUser, as: 'Assignee', attributes: ['id', 'name'] },
        { model: Court, as: 'Court', attributes: ['id', 'name'], required: false }
      ]
    });
    if (!caseRecord) return res.status(404).json({ success: false, message: 'Case not found' });
    const data = {
      client_name: caseRecord.Client?.name || '',
      client_email: caseRecord.Client?.email || '',
      client_phone: caseRecord.Client?.phone || '',
      case_number: caseRecord.case_number || '',
      case_title: caseRecord.case_title || '',
      court_name: caseRecord.Court?.name || '',
      advocate_name: caseRecord.Assignee?.name || req.user.name || ''
    };
    const filled = fillTemplate(template.content || '', data);
    const chunks = [];
    const doc = new PDFDocument({ margin: 50 });
    doc.on('data', (chunk) => chunks.push(chunk));
    const bufferPromise = new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });
    doc.fontSize(14).text('Vakalatnama / Document', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10);
    filled.split(/\r?\n/).forEach((line) => {
      doc.text(line || ' ');
    });
    doc.end();
    const buffer = await bufferPromise;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${(template.name || 'document').replace(/"/g, '')}.pdf"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  generatePdf
};
