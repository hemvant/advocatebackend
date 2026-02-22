const { sequelize, Judge, Court, CourtBench, Case } = require('../models');
const { Op } = require('sequelize');
const auditService = require('../utils/auditService');
const { refreshSetupProgress } = require('../utils/setupService');

function canManage(user) {
  return user.role === 'ORG_ADMIN';
}

const addJudge = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    if (!canManage(req.user)) return res.status(403).json({ success: false, message: 'Only org admin can manage judges' });
    const { court_id, bench_id, name, designation } = req.body;
    const court = await Court.findOne({ where: { id: court_id, organization_id: req.user.organization_id } });
    if (!court) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Court not found' });
    }
    if (bench_id) {
      const bench = await CourtBench.findOne({ where: { id: bench_id, court_id: court.id } });
      if (!bench) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'Bench not found or does not belong to court' });
      }
    }
    const judge = await Judge.create({
      organization_id: req.user.organization_id,
      court_id: court.id,
      bench_id: bench_id || null,
      name: name.trim(),
      designation: designation ? designation.trim() : null,
      is_active: true
    }, { transaction: t });
    await t.commit();
    refreshSetupProgress(req.user.organization_id).catch(() => {});
    const created = await Judge.findByPk(judge.id, {
      include: [
        { model: Court, as: 'Court', attributes: ['id', 'name'] },
        { model: CourtBench, as: 'Bench', attributes: ['id', 'name'] }
      ]
    });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

const updateJudge = async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ success: false, message: 'Only org admin can manage judges' });
    const judge = await Judge.findOne({ where: { id: req.params.id, organization_id: req.user.organization_id } });
    if (!judge) return res.status(404).json({ success: false, message: 'Judge not found' });
    const { court_id, bench_id, name, designation, is_active, status } = req.body;
    if (court_id !== undefined) {
      const court = await Court.findOne({ where: { id: court_id, organization_id: req.user.organization_id } });
      if (!court) return res.status(404).json({ success: false, message: 'Court not found' });
      judge.court_id = court.id;
    }
    if (bench_id !== undefined) {
      const bench = bench_id ? await CourtBench.findOne({ where: { id: bench_id, court_id: judge.court_id } }) : null;
      judge.bench_id = bench ? bench_id : null;
    }
    if (name !== undefined) judge.name = name.trim();
    if (designation !== undefined) judge.designation = designation ? designation.trim() : null;
    if (status !== undefined) {
      judge.status = status;
      judge.is_active = status === 'active';
    } else if (is_active !== undefined) {
      judge.is_active = !!is_active;
      if (!judge.is_active && judge.status === 'active') judge.status = 'transferred';
    }
    await judge.save();
    const updated = await Judge.findByPk(judge.id, {
      include: [
        { model: Court, as: 'Court', attributes: ['id', 'name'] },
        { model: CourtBench, as: 'Bench', attributes: ['id', 'name'] }
      ]
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

const deactivateJudge = async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ success: false, message: 'Only org admin can manage judges' });
    const judge = await Judge.findOne({ where: { id: req.params.id, organization_id: req.user.organization_id } });
    if (!judge) return res.status(404).json({ success: false, message: 'Judge not found' });
    judge.is_active = false;
    judge.status = 'transferred';
    await judge.save();
    res.json({ success: true, data: judge, message: 'Judge deactivated' });
  } catch (err) {
    next(err);
  }
};

const listJudges = async (req, res, next) => {
  try {
    const { court_id, bench_id, is_active, search, page = 1, limit = 20 } = req.query;
    const where = { organization_id: req.user.organization_id };
    if (court_id) where.court_id = court_id;
    if (bench_id) where.bench_id = bench_id;
    if (is_active !== undefined) where.is_active = is_active === 'true' || is_active === true;
    if (search && search.trim()) {
      where[Op.or] = [
        { name: { [Op.like]: '%' + search.trim() + '%' } },
        { designation: { [Op.like]: '%' + search.trim() + '%' } }
      ];
    }
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * limitNum;
    const { count, rows } = await Judge.findAndCountAll({
      where,
      include: [
        { model: Court, as: 'Court', attributes: ['id', 'name'] },
        { model: CourtBench, as: 'Bench', attributes: ['id', 'name'] }
      ],
      limit: limitNum,
      offset,
      order: [['name', 'ASC']]
    });
    res.json({ success: true, data: rows, total: count, page: parseInt(page, 10) || 1, limit: limitNum });
  } catch (err) {
    next(err);
  }
};

const assignJudgeToCase = async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ success: false, message: 'Only org admin can assign judge to case' });
    const caseId = req.params.caseId;
    const { judge_id } = req.body;
    const caseRecord = await Case.findOne({
      where: { id: caseId, organization_id: req.user.organization_id, is_deleted: false }
    });
    if (!caseRecord) return res.status(404).json({ success: false, message: 'Case not found' });
    const oldJudgeId = caseRecord.judge_id;
    const oldBenchId = caseRecord.bench_id;
    if (judge_id) {
      const judge = await Judge.findOne({ where: { id: judge_id, organization_id: req.user.organization_id } });
      if (!judge) return res.status(404).json({ success: false, message: 'Judge not found' });
      caseRecord.judge_id = judge.id;
      caseRecord.bench_id = judge.bench_id;
    } else {
      caseRecord.judge_id = null;
      caseRecord.bench_id = null;
    }
    await caseRecord.save();
    await auditService.log(req, {
      organization_id: req.user.organization_id,
      user_id: req.user.id,
      entity_type: 'CASE',
      entity_id: caseRecord.id,
      action_type: 'ASSIGN',
      old_value: { judge_id: oldJudgeId, bench_id: oldBenchId },
      new_value: { judge_id: caseRecord.judge_id, bench_id: caseRecord.bench_id }
    });
    const updated = await Case.findByPk(caseRecord.id, {
      include: [{ model: Judge, as: 'Judge', attributes: ['id', 'name', 'designation'] }]
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  addJudge,
  updateJudge,
  deactivateJudge,
  listJudges,
  assignJudgeToCase
};
