const { sequelize, Court, CourtType, CourtBench, Courtroom, Judge, CourtWorkingDay, Case } = require('../models');
const { Op } = require('sequelize');
const auditService = require('../utils/auditService');

function canManage(user) {
  return user.role === 'ORG_ADMIN';
}

async function getCourtInOrg(courtId, organizationId) {
  return Court.findOne({
    where: { id: courtId, organization_id: organizationId },
    include: [{ model: CourtType, as: 'CourtType', attributes: ['id', 'name'] }]
  });
}

const createCourt = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    if (!canManage(req.user)) return res.status(403).json({ success: false, message: 'Only org admin can manage courts' });
    const { court_type_id, name, state, city, address } = req.body;
    const courtType = await CourtType.findByPk(court_type_id);
    if (!courtType) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Invalid court type' });
    }
    const court = await Court.create({
      organization_id: req.user.organization_id,
      court_type_id,
      name: name.trim(),
      state: state ? state.trim() : null,
      city: city ? city.trim() : null,
      address: address ? address.trim() : null,
      is_active: true
    }, { transaction: t });
    await t.commit();
    const created = await Court.findByPk(court.id, { include: [{ model: CourtType, as: 'CourtType', attributes: ['id', 'name'] }] });
    await auditService.log(req, {
      organization_id: req.user.organization_id,
      user_id: req.user.id,
      entity_type: 'COURT',
      entity_id: court.id,
      action_type: 'CREATE',
      old_value: null,
      new_value: created ? created.toJSON() : court.toJSON()
    });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

const updateCourt = async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ success: false, message: 'Only org admin can manage courts' });
    const court = await getCourtInOrg(req.params.id, req.user.organization_id);
    if (!court) return res.status(404).json({ success: false, message: 'Court not found' });
    const { court_type_id, name, state, city, address, is_active } = req.body;
    if (court_type_id !== undefined) {
      const ct = await CourtType.findByPk(court_type_id);
      if (!ct) return res.status(400).json({ success: false, message: 'Invalid court type' });
      court.court_type_id = court_type_id;
    }
    if (name !== undefined) court.name = name.trim();
    if (state !== undefined) court.state = state ? state.trim() : null;
    if (city !== undefined) court.city = city ? city.trim() : null;
    if (address !== undefined) court.address = address ? address.trim() : null;
    if (is_active !== undefined) court.is_active = !!is_active;
    await court.save();
    const updated = await Court.findByPk(court.id, { include: [{ model: CourtType, as: 'CourtType', attributes: ['id', 'name'] }] });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

const deactivateCourt = async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ success: false, message: 'Only org admin can manage courts' });
    const court = await getCourtInOrg(req.params.id, req.user.organization_id);
    if (!court) return res.status(404).json({ success: false, message: 'Court not found' });
    const oldSnapshot = court.toJSON();
    court.is_active = false;
    await court.save();
    await auditService.log(req, {
      organization_id: req.user.organization_id,
      user_id: req.user.id,
      entity_type: 'COURT',
      entity_id: court.id,
      action_type: 'UPDATE',
      old_value: oldSnapshot,
      new_value: { ...oldSnapshot, is_active: false }
    });
    res.json({ success: true, data: court, message: 'Court deactivated' });
  } catch (err) {
    next(err);
  }
};

const listCourts = async (req, res, next) => {
  try {
    const { is_active, court_type_id, search, page = 1, limit = 20 } = req.query;
    const where = { organization_id: req.user.organization_id };
    if (is_active !== undefined) where.is_active = is_active === 'true' || is_active === true;
    if (court_type_id) where.court_type_id = court_type_id;
    if (search && search.trim()) {
      where[Op.or] = [
        { name: { [Op.like]: '%' + search.trim() + '%' } },
        { city: { [Op.like]: '%' + search.trim() + '%' } },
        { state: { [Op.like]: '%' + search.trim() + '%' } }
      ];
    }
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * limitNum;
    const { count, rows } = await Court.findAndCountAll({
      where,
      include: [{ model: CourtType, as: 'CourtType', attributes: ['id', 'name'] }],
      limit: limitNum,
      offset,
      order: [['name', 'ASC']]
    });
    res.json({ success: true, data: rows, total: count, page: parseInt(page, 10) || 1, limit: limitNum });
  } catch (err) {
    next(err);
  }
};

const getCourtDetails = async (req, res, next) => {
  try {
    const court = await Court.findOne({
      where: { id: req.params.id, organization_id: req.user.organization_id },
      include: [
        { model: CourtType, as: 'CourtType', attributes: ['id', 'name'] },
        { model: CourtBench, as: 'CourtBenches', attributes: ['id', 'name'] },
        { model: Courtroom, as: 'Courtrooms', attributes: ['id', 'room_number', 'floor', 'bench_id'] },
        { model: Judge, as: 'Judges', where: { is_active: true }, required: false, attributes: ['id', 'name', 'designation', 'bench_id'] }
      ]
    });
    if (!court) return res.status(404).json({ success: false, message: 'Court not found' });
    const workingDays = await CourtWorkingDay.findAll({ where: { court_id: court.id } });
    const caseCount = await Case.count({ where: { court_id: court.id, is_deleted: false } });
    res.json({ success: true, data: { ...court.toJSON(), CourtWorkingDays: workingDays, caseCount } });
  } catch (err) {
    next(err);
  }
};

const listCourtTypes = async (req, res, next) => {
  try {
    const types = await CourtType.findAll({ order: [['id', 'ASC']] });
    res.json({ success: true, data: types });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createCourt,
  updateCourt,
  deactivateCourt,
  listCourts,
  getCourtDetails,
  listCourtTypes
};
