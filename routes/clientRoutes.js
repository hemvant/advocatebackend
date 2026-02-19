const express = require('express');
const { requireOrgAdmin } = require('../middleware/orgRole');
const sanitizeBody = require('../middleware/sanitize').sanitizeBody;
const validate = require('../middleware/validate');
const {
  createClientValidation,
  updateClientValidation,
  assignClientValidation,
  addOpponentValidation,
  createTagValidation,
  assignTagValidation
} = require('../utils/validators');
const clientController = require('../controllers/clientController');

const router = express.Router();

router.get('/', clientController.listClients);
router.post('/', sanitizeBody, createClientValidation, validate, clientController.createClient);
router.get('/tags', clientController.listTags);
router.post('/tags', sanitizeBody, createTagValidation, validate, clientController.createTag);
router.get('/:id', clientController.getClientById);
router.put('/:id', sanitizeBody, updateClientValidation, validate, clientController.updateClient);
router.delete('/:id', clientController.softDeleteClient);
router.put('/:id/assign', requireOrgAdmin, sanitizeBody, assignClientValidation, validate, clientController.assignClientToEmployee);
router.post('/:id/opponents', sanitizeBody, addOpponentValidation, validate, clientController.addOpponent);
router.delete('/:id/opponents/:opponentId', clientController.removeOpponent);
router.post('/:id/tags', sanitizeBody, assignTagValidation, validate, clientController.assignTagToClient);
router.delete('/:id/tags/:tagId', clientController.removeTagFromClient);

module.exports = router;
