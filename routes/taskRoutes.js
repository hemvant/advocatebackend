const express = require('express');
const sanitizeBody = require('../middleware/sanitize').sanitizeBody;
const validate = require('../middleware/validate');
const { createTaskValidation, updateTaskValidation, reassignTaskValidation } = require('../utils/validators');
const taskController = require('../controllers/taskController');

const router = express.Router();

router.get('/dashboard', taskController.getTaskDashboard);
router.get('/', taskController.listTasks);
router.post('/', sanitizeBody, createTaskValidation, validate, taskController.createTask);
router.get('/:id', taskController.getTaskById);
router.put('/:id', sanitizeBody, updateTaskValidation, validate, taskController.updateTask);
router.post('/:id/complete', taskController.markComplete);
router.put('/:id/assign', sanitizeBody, reassignTaskValidation, validate, taskController.reassignTask);

module.exports = router;
