const { Court, CourtBench, Courtroom } = require('../models');

function canManage(user) {
  return user.role === 'ORG_ADMIN';
}

async function getCourtInOrg(courtId, organizationId) {
  return Court.findOne({ where: { id: courtId, organization_id: organizationId } });
}

const addCourtroom = async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ success: false, message: 'Only org admin can manage courtrooms' });
    const court = await getCourtInOrg(req.params.id, req.user.organization_id);
    if (!court) return res.status(404).json({ success: false, message: 'Court not found' });
    const { bench_id, room_number, floor } = req.body;
    if (bench_id) {
      const bench = await CourtBench.findOne({ where: { id: bench_id, court_id: court.id } });
      if (!bench) return res.status(400).json({ success: false, message: 'Bench not found or does not belong to court' });
    }
    const room = await Courtroom.create({
      court_id: court.id,
      bench_id: bench_id || null,
      room_number: room_number?.trim() || null,
      floor: floor?.trim() || null
    });
    const created = await Courtroom.findByPk(room.id, {
      include: [{ model: CourtBench, as: 'Bench', attributes: ['id', 'name'] }]
    });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
};

const updateCourtroom = async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ success: false, message: 'Only org admin can manage courtrooms' });
    const court = await getCourtInOrg(req.params.id, req.user.organization_id);
    if (!court) return res.status(404).json({ success: false, message: 'Court not found' });
    const room = await Courtroom.findOne({ where: { id: req.params.roomId, court_id: court.id } });
    if (!room) return res.status(404).json({ success: false, message: 'Courtroom not found' });
    const { bench_id, room_number, floor } = req.body;
    if (bench_id !== undefined) {
      room.bench_id = bench_id ? (await CourtBench.findOne({ where: { id: bench_id, court_id: court.id } }) ? bench_id : null) : null;
    }
    if (room_number !== undefined) room.room_number = room_number?.trim() || null;
    if (floor !== undefined) room.floor = floor?.trim() || null;
    await room.save();
    const updated = await Courtroom.findByPk(room.id, {
      include: [{ model: CourtBench, as: 'Bench', attributes: ['id', 'name'] }]
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

const listCourtrooms = async (req, res, next) => {
  try {
    const court = await getCourtInOrg(req.params.id, req.user.organization_id);
    if (!court) return res.status(404).json({ success: false, message: 'Court not found' });
    const rooms = await Courtroom.findAll({
      where: { court_id: court.id },
      include: [{ model: CourtBench, as: 'Bench', attributes: ['id', 'name'] }],
      order: [['floor', 'ASC'], ['room_number', 'ASC']]
    });
    res.json({ success: true, data: rooms });
  } catch (err) {
    next(err);
  }
};

const listCourtroomsAll = async (req, res, next) => {
  try {
    const { court_id } = req.query;
    if (!court_id) return res.status(400).json({ success: false, message: 'court_id is required' });
    const court = await Court.findOne({ where: { id: court_id, organization_id: req.user.organization_id } });
    if (!court) return res.status(404).json({ success: false, message: 'Court not found' });
    const rooms = await Courtroom.findAll({
      where: { court_id: court.id },
      include: [{ model: CourtBench, as: 'Bench', attributes: ['id', 'name'] }],
      order: [['floor', 'ASC'], ['room_number', 'ASC']]
    });
    res.json({ success: true, data: rooms });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  addCourtroom,
  updateCourtroom,
  listCourtrooms,
  listCourtroomsAll
};
