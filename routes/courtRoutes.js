const express = require('express');
const sanitizeBody = require('../middleware/sanitize').sanitizeBody;
const validate = require('../middleware/validate');
const {
  createCourtValidation,
  updateCourtValidation,
  addBenchValidation,
  updateBenchValidation,
  addCourtroomValidation,
  updateCourtroomValidation
} = require('../utils/validators');
const courtController = require('../controllers/courtController');
const benchController = require('../controllers/benchController');
const courtroomController = require('../controllers/courtroomController');

const router = express.Router();

router.get('/types', courtController.listCourtTypes);
router.get('/', courtController.listCourts);
router.post('/', sanitizeBody, createCourtValidation, validate, courtController.createCourt);

router.get('/:id/benches', benchController.listBenches);
router.post('/:id/benches', sanitizeBody, addBenchValidation, validate, benchController.addBench);
router.put('/:id/benches/:benchId', sanitizeBody, updateBenchValidation, validate, benchController.updateBench);
router.delete('/:id/benches/:benchId', benchController.deleteBench);

router.get('/:id/courtrooms', courtroomController.listCourtrooms);
router.post('/:id/courtrooms', sanitizeBody, addCourtroomValidation, validate, courtroomController.addCourtroom);
router.put('/:id/courtrooms/:roomId', sanitizeBody, updateCourtroomValidation, validate, courtroomController.updateCourtroom);

router.get('/:id', courtController.getCourtDetails);
router.put('/:id', sanitizeBody, updateCourtValidation, validate, courtController.updateCourt);
router.post('/:id/deactivate', courtController.deactivateCourt);

module.exports = router;
