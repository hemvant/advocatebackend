const express = require('express');
const sanitizeBody = require('../middleware/sanitize').sanitizeBody;
const validate = require('../middleware/validate');
const { addJudgeValidation, updateJudgeValidation } = require('../utils/validators');
const judgeController = require('../controllers/judgeController');

const router = express.Router();

router.get('/', judgeController.listJudges);
router.post('/', sanitizeBody, addJudgeValidation, validate, judgeController.addJudge);
router.get('/:id', async (req, res, next) => {
  const { Judge, Court, CourtBench } = require('../models');
  try {
    const judge = await Judge.findOne({
      where: { id: req.params.id, organization_id: req.user.organization_id },
      include: [
        { model: Court, as: 'Court', attributes: ['id', 'name'] },
        { model: CourtBench, as: 'Bench', attributes: ['id', 'name'] }
      ]
    });
    if (!judge) return res.status(404).json({ success: false, message: 'Judge not found' });
    res.json({ success: true, data: judge });
  } catch (err) {
    next(err);
  }
});
router.put('/:id', sanitizeBody, updateJudgeValidation, validate, judgeController.updateJudge);
router.post('/:id/deactivate', judgeController.deactivateJudge);

module.exports = router;
