const aiService = require('../utils/aiService');
const auditService = require('../utils/auditService');

/** POST /ai/draft - body: { template: 'LEGAL_NOTICE'|'AFFIDAVIT'|'VAKALATNAMA', inputs: { ... } } */
async function generateDraft(req, res, next) {
  try {
    const user = req.user;
    const { template, inputs } = req.body || {};
    const templateKey = (template || 'LEGAL_NOTICE').toUpperCase();
    if (!['LEGAL_NOTICE', 'AFFIDAVIT', 'VAKALATNAMA'].includes(templateKey)) {
      return res.status(400).json({ success: false, message: 'Invalid template' });
    }
    const draft = await aiService.generateDraft(templateKey, inputs || {});
    await auditService.log(req, {
      organization_id: user.organization_id,
      user_id: user.id,
      entity_type: 'AI_USAGE',
      action_type: 'DRAFT',
      action_summary: `Draft generated: ${templateKey}`,
      entity_label: templateKey,
      module_name: 'AI'
    });
    res.json({ success: true, data: { draft_text: draft, template: templateKey } });
  } catch (err) {
    next(err);
  }
}

/** GET /ai/templates - list draft templates */
function getTemplates(req, res) {
  const templates = Object.entries(aiService.DRAFT_TEMPLATES).map(([key, t]) => ({
    id: key,
    name: t.name,
    placeholders: t.placeholders
  }));
  res.json({ success: true, data: templates });
}

module.exports = { generateDraft, getTemplates };
