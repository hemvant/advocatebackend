const { sequelize, CaseTask, Case, OrganizationUser, TaskAssignmentHistory, CaseActivityLog } = require('../models');
const { Op } = require('sequelize');
const cache = require('../utils/cache');
const { logCaseActivity } = require('../utils/caseActivityLogger');

function buildTaskWhere(user) {
  const base = { organization_id: user.organization_id };
  if (user.role === 'ORG_ADMIN') return base;
  return { ...base, assigned_to: user.id };
}

async function getCaseForTask(caseId, user) {
  const base = { organization_id: user.organization_id, is_deleted: false };
  const where = user.role === 'ORG_ADMIN' ? base : { ...base, [Op.or]: [{ created_by: user.id }, { assigned_to: user.id }] };
  return Case.findOne({ where: { id: caseId, ...where }, attributes: ['id', 'case_title', 'case_number'] });
}

const createTask = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const user = req.user;
    const caseRecord = await getCaseForTask(req.body.case_id, user);
    if (!caseRecord) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Case not found or access denied' });
    }
    const { case_id, assigned_to, title, description, priority, due_date } = req.body;
    const assigneeId = assigned_to ? parseInt(assigned_to, 10) : null;
    let assigneeName = null;
    if (assigneeId) {
      const emp = await OrganizationUser.findOne({ where: { id: assigneeId, organization_id: user.organization_id }, attributes: ['id', 'name'] });
      if (!emp) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'Invalid assignee' });
      }
      assigneeName = emp.name;
    }
    const task = await CaseTask.create({
      organization_id: user.organization_id,
      case_id: caseRecord.id,
      assigned_to: assigneeId,
      assigned_by: assigneeId ? user.id : null,
      created_by: user.id,
      title: (title || '').trim(),
      description: (description || '').trim() || null,
      priority: priority || 'MEDIUM',
      status: 'PENDING',
      due_date: due_date || null
    }, { transaction: t });
    if (assigneeId) {
      await TaskAssignmentHistory.create({
        organization_id: user.organization_id,
        task_id: task.id,
        previous_assigned_to: null,
        new_assigned_to: assigneeId,
        changed_by: user.id,
        change_reason: null
      }, { transaction: t });
    }
    await t.commit();
    await logCaseActivity({
      organization_id: user.organization_id,
      case_id: caseRecord.id,
      task_id: task.id,
      user_id: user.id,
      activity_type: 'TASK_CREATED',
      activity_summary: `Task '${(title || '').trim()}' created.`
    });
    if (assigneeId && assigneeName) {
      await logCaseActivity({
        organization_id: user.organization_id,
        case_id: caseRecord.id,
        task_id: task.id,
        user_id: user.id,
        activity_type: 'TASK_ASSIGNED',
        activity_summary: `Task '${(title || '').trim()}' assigned to ${assigneeName}.`
      });
    }
    const created = await CaseTask.findByPk(task.id, {
      include: [
        { model: Case, as: 'Case', attributes: ['id', 'case_title', 'case_number'] },
        { model: OrganizationUser, as: 'Assignee', attributes: ['id', 'name', 'email'] },
        { model: OrganizationUser, as: 'AssignedByUser', attributes: ['id', 'name'] },
        { model: OrganizationUser, as: 'Creator', attributes: ['id', 'name'] }
      ]
    });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const user = req.user;
    const where = buildTaskWhere(user);
    const task = await CaseTask.findOne({
      where: { id: req.params.id, ...where },
      include: [{ model: Case, as: 'Case', attributes: ['id', 'case_number'] }]
    });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    const { title, description, priority, status, due_date } = req.body;
    const prevStatus = task.status;
    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description ? description.trim() : null;
    if (priority !== undefined) task.priority = priority;
    if (status !== undefined) task.status = status;
    if (due_date !== undefined) task.due_date = due_date || null;
    if (status === 'COMPLETED' && task.completed_at == null) task.completed_at = new Date();
    if (status !== 'COMPLETED') task.completed_at = null;
    await task.save();
    if (status !== undefined && status !== prevStatus) {
      const summary = status === 'COMPLETED'
        ? `Task '${task.title}' marked as Completed by ${user.name || 'User'}.`
        : `Task status changed to ${status}.`;
      await logCaseActivity({
        organization_id: user.organization_id,
        case_id: task.case_id,
        task_id: task.id,
        user_id: user.id,
        activity_type: status === 'COMPLETED' ? 'TASK_COMPLETED' : 'STATUS_CHANGED',
        activity_summary: summary
      });
    }
    const updated = await CaseTask.findByPk(task.id, {
      include: [
        { model: Case, as: 'Case', attributes: ['id', 'case_title', 'case_number'] },
        { model: OrganizationUser, as: 'Assignee', attributes: ['id', 'name', 'email'] },
        { model: OrganizationUser, as: 'AssignedByUser', attributes: ['id', 'name'] },
        { model: OrganizationUser, as: 'Creator', attributes: ['id', 'name'] }
      ]
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

const markComplete = async (req, res, next) => {
  try {
    const user = req.user;
    const where = buildTaskWhere(user);
    const task = await CaseTask.findOne({ where: { id: req.params.id, ...where } });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    task.status = 'COMPLETED';
    task.completed_at = new Date();
    await task.save();
    await logCaseActivity({
      organization_id: user.organization_id,
      case_id: task.case_id,
      task_id: task.id,
      user_id: user.id,
      activity_type: 'TASK_COMPLETED',
      activity_summary: `Task '${task.title}' marked as Completed by ${user.name || 'User'}.`
    });
    const updated = await CaseTask.findByPk(task.id, {
      include: [
        { model: Case, as: 'Case', attributes: ['id', 'case_title', 'case_number'] },
        { model: OrganizationUser, as: 'Assignee', attributes: ['id', 'name', 'email'] }
      ]
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

const reassignTask = async (req, res, next) => {
  try {
    const user = req.user;
    if (user.role !== 'ORG_ADMIN') return res.status(403).json({ success: false, message: 'Only org admin can reassign tasks' });
    const task = await CaseTask.findOne({ where: { id: req.params.id, organization_id: user.organization_id } });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    const { assigned_to } = req.body;
    const assigneeId = assigned_to ? parseInt(assigned_to, 10) : null;
    let newName = null;
    if (assigneeId) {
      const emp = await OrganizationUser.findOne({ where: { id: assigneeId, organization_id: user.organization_id }, attributes: ['id', 'name'] });
      if (!emp) return res.status(400).json({ success: false, message: 'Invalid assignee' });
      newName = emp.name;
    }
    const prevAssigneeId = task.assigned_to;
    task.assigned_to = assigneeId;
    task.assigned_by = assigneeId ? user.id : task.assigned_by;
    await task.save();
    if (assigneeId) {
      await TaskAssignmentHistory.create({
        organization_id: user.organization_id,
        task_id: task.id,
        previous_assigned_to: prevAssigneeId,
        new_assigned_to: assigneeId,
        changed_by: user.id,
        change_reason: null
      });
    }
    const prevName = prevAssigneeId ? (await OrganizationUser.findByPk(prevAssigneeId, { attributes: ['name'], raw: true }))?.name : null;
    const summary = prevName && newName
      ? `Task '${task.title}' reassigned from ${prevName} to ${newName}.`
      : newName
        ? `Task '${task.title}' assigned to ${newName}.`
        : `Task '${task.title}' unassigned from ${prevName || 'previous assignee'}.`;
    await logCaseActivity({
      organization_id: user.organization_id,
      case_id: task.case_id,
      task_id: task.id,
      user_id: user.id,
      activity_type: 'TASK_REASSIGNED',
      activity_summary: summary
    });
    const updated = await CaseTask.findByPk(task.id, {
      include: [
        { model: Case, as: 'Case', attributes: ['id', 'case_title', 'case_number'] },
        { model: OrganizationUser, as: 'Assignee', attributes: ['id', 'name', 'email'] }
      ]
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

const listTasks = async (req, res, next) => {
  try {
    const user = req.user;
    const where = buildTaskWhere(user);
    const { case_id, status, priority, page = 1, limit = 20 } = req.query;
    if (case_id) where.case_id = case_id;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * limitNum;
    const { count, rows } = await CaseTask.findAndCountAll({
      where,
      include: [
        { model: Case, as: 'Case', attributes: ['id', 'case_title', 'case_number'] },
        { model: OrganizationUser, as: 'Assignee', attributes: ['id', 'name', 'email'] },
        { model: OrganizationUser, as: 'Creator', attributes: ['id', 'name'] }
      ],
      limit: limitNum,
      offset,
      order: [['due_date', 'ASC'], ['created_at', 'DESC']]
    });
    res.json({ success: true, data: rows, pagination: { page: parseInt(page, 10) || 1, limit: limitNum, total: count, totalPages: Math.ceil(count / limitNum) } });
  } catch (err) {
    next(err);
  }
};

const listTasksByCase = async (req, res, next) => {
  try {
    const user = req.user;
    const caseRecord = await getCaseForTask(req.params.caseId, user);
    if (!caseRecord) return res.status(404).json({ success: false, message: 'Case not found or access denied' });
    const where = buildTaskWhere(user);
    where.case_id = caseRecord.id;
    const tasks = await CaseTask.findAll({
      where,
      include: [
        { model: OrganizationUser, as: 'Assignee', attributes: ['id', 'name', 'email'] },
        { model: OrganizationUser, as: 'Creator', attributes: ['id', 'name'] }
      ],
      order: [['due_date', 'ASC'], ['created_at', 'DESC']]
    });
    res.json({ success: true, data: tasks });
  } catch (err) {
    next(err);
  }
};

const getTaskDashboard = async (req, res, next) => {
  try {
    const user = req.user;
    const key = cache.cacheKey('dashboard:task', [user.organization_id, user.id]);
    const cached = await cache.get(key);
    if (cached) return res.json(cached);
    const where = buildTaskWhere(user);
    const today = new Date().toISOString().slice(0, 10);
    const inProgress = { ...where, status: { [Op.in]: ['PENDING', 'IN_PROGRESS'] } };
    const overdueWhere = { ...inProgress, due_date: { [Op.lt]: today } };
    const upcomingWhere = { ...inProgress, due_date: { [Op.gte]: today, [Op.lte]: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) } };
    const [myTasks, overdue, upcoming] = await Promise.all([
      CaseTask.findAll({
        where: inProgress,
        include: [{ model: Case, as: 'Case', attributes: ['id', 'case_title', 'case_number'] }],
        order: [['due_date', 'ASC']],
        limit: 10
      }),
      CaseTask.findAll({
        where: overdueWhere,
        include: [{ model: Case, as: 'Case', attributes: ['id', 'case_title', 'case_number'] }],
        order: [['due_date', 'ASC']],
        limit: 10
      }),
      CaseTask.findAll({
        where: upcomingWhere,
        include: [{ model: Case, as: 'Case', attributes: ['id', 'case_title', 'case_number'] }],
        order: [['due_date', 'ASC']],
        limit: 10
      })
    ]);
    const payload = { success: true, data: { myTasks, overdue, upcoming } };
    await cache.set(key, payload, cache.TTL.DASHBOARD);
    res.json(payload);
  } catch (err) {
    next(err);
  }
};

const getTaskById = async (req, res, next) => {
  try {
    const user = req.user;
    const where = buildTaskWhere(user);
    const task = await CaseTask.findOne({
      where: { id: req.params.id, ...where },
      include: [
        { model: Case, as: 'Case', attributes: ['id', 'case_title', 'case_number'] },
        { model: OrganizationUser, as: 'Assignee', attributes: ['id', 'name', 'email'] },
        { model: OrganizationUser, as: 'AssignedByUser', attributes: ['id', 'name'] },
        { model: OrganizationUser, as: 'Creator', attributes: ['id', 'name'] }
      ]
    });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

const getTaskHistory = async (req, res, next) => {
  try {
    const user = req.user;
    const where = buildTaskWhere(user);
    const task = await CaseTask.findOne({
      where: { id: req.params.id, ...where },
      attributes: ['id', 'case_id', 'organization_id', 'title']
    });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    const activityWhere = { organization_id: user.organization_id, task_id: task.id };
    if (user.role !== 'ORG_ADMIN') activityWhere.user_id = user.id;
    if (req.query.user_id) activityWhere.user_id = req.query.user_id;
    if (req.query.activity_type) activityWhere.activity_type = req.query.activity_type;
    if (req.query.from_date || req.query.to_date) {
      activityWhere.created_at = {};
      if (req.query.from_date) activityWhere.created_at[Op.gte] = new Date(req.query.from_date);
      if (req.query.to_date) activityWhere.created_at[Op.lte] = new Date(req.query.to_date);
    }
    const [assignmentHistory, activityLogs] = await Promise.all([
      TaskAssignmentHistory.findAll({
        where: { organization_id: user.organization_id, task_id: task.id },
        include: [
          { model: OrganizationUser, as: 'PreviousAssignee', attributes: ['id', 'name'] },
          { model: OrganizationUser, as: 'NewAssignee', attributes: ['id', 'name'] },
          { model: OrganizationUser, as: 'ChangedByUser', attributes: ['id', 'name'] }
        ],
        order: [['created_at', 'DESC']]
      }),
      CaseActivityLog.findAll({
        where: activityWhere,
        include: [{ model: OrganizationUser, as: 'User', attributes: ['id', 'name'] }],
        order: [['created_at', 'DESC']]
      })
    ]);
    res.json({
      success: true,
      data: { assignmentHistory, activityTimeline: activityLogs }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createTask,
  updateTask,
  markComplete,
  reassignTask,
  listTasks,
  listTasksByCase,
  getTaskDashboard,
  getTaskById,
  getTaskHistory
};
