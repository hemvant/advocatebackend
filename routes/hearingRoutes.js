const express = require('express');
const sanitizeBody = require('../middleware/sanitize').sanitizeBody;
const validate = require('../middleware/validate');
const { createHearingValidation, updateHearingValidation, addReminderValidation } = require('../utils/validators');
const hearingController = require('../controllers/hearingController');

const router = express.Router();

router.get('/dashboard', hearingController.getDashboardHearings);
router.get('/calendar', hearingController.getCalendarView);
router.get('/', hearingController.listHearings);
router.post('/', sanitizeBody, createHearingValidation, validate, hearingController.createHearing);
router.get('/:id', hearingController.getHearingById);
router.put('/:id', sanitizeBody, updateHearingValidation, validate, hearingController.updateHearing);
router.delete('/:id', hearingController.deleteHearing);
router.get('/:id/reminders', hearingController.listReminders);
router.post('/:id/reminders', sanitizeBody, addReminderValidation, validate, hearingController.addReminder);
router.delete('/:id/reminders/:reminderId', hearingController.removeReminder);

module.exports = router;
