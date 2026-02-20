const { Case, CasePermission, CaseDocument, DocumentPermission } = require('../models');

const CASE_PERMISSION_LEVELS = { VIEW: ['VIEW', 'EDIT', 'DELETE'], EDIT: ['EDIT', 'DELETE'], DELETE: ['DELETE'] };
const DOC_PERMISSION_LEVELS = { VIEW: ['VIEW', 'EDIT', 'DELETE'], EDIT: ['EDIT', 'DELETE'], DELETE: ['DELETE'] };

function checkCasePermission(requiredPermission) {
  return async (req, res, next) => {
    try {
      const caseId = req.params.id || req.params.caseId;
      const user = req.user;
      if (!caseId || !user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const caseRecord = await Case.findOne({
        where: { id: caseId, organization_id: user.organization_id, is_deleted: false }
      });
      if (!caseRecord) return res.status(404).json({ success: false, message: 'Case not found' });

      if (user.role === 'ORG_ADMIN') {
        req.case = caseRecord;
        return next();
      }
      if (caseRecord.created_by === user.id || caseRecord.assigned_to === user.id) {
        req.case = caseRecord;
        return next();
      }

      const allowed = CASE_PERMISSION_LEVELS[requiredPermission];
      if (!allowed) return res.status(500).json({ success: false, message: 'Invalid permission' });
      const perm = await CasePermission.findOne({
        where: { case_id: caseId, user_id: user.id }
      });
      if (!perm || !allowed.includes(perm.permission)) {
        return res.status(403).json({ success: false, message: 'Insufficient case permission' });
      }
      req.case = caseRecord;
      next();
    } catch (err) {
      next(err);
    }
  };
}

function checkDocumentPermission(requiredPermission) {
  return async (req, res, next) => {
    try {
      const documentId = req.params.id;
      const user = req.user;
      if (!documentId || !user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const doc = await CaseDocument.findOne({
        where: { id: documentId, organization_id: user.organization_id, is_deleted: false },
        include: [{ model: Case, as: 'Case', attributes: ['id', 'assigned_to', 'created_by'] }]
      });
      if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

      if (user.role === 'ORG_ADMIN') {
        req.document = doc;
        return next();
      }
      if (doc.uploaded_by === user.id) {
        req.document = doc;
        return next();
      }
      if (doc.Case && (doc.Case.assigned_to === user.id || doc.Case.created_by === user.id) && requiredPermission === 'VIEW') {
        req.document = doc;
        return next();
      }

      const allowed = DOC_PERMISSION_LEVELS[requiredPermission];
      if (!allowed) return res.status(500).json({ success: false, message: 'Invalid permission' });
      const perm = await DocumentPermission.findOne({
        where: { document_id: documentId, user_id: user.id }
      });
      if (!perm || !allowed.includes(perm.permission)) {
        return res.status(403).json({ success: false, message: 'Insufficient document permission' });
      }
      req.document = doc;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { checkCasePermission, checkDocumentPermission };
