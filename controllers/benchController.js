const { Court, CourtBench } = require('../models');

function canManage(user) {
  return user.role === 'ORG_ADMIN';
}

async function getCourtInOrg(courtId, organizationId) {
  return Court.findOne({ where: { id: courtId, organization_id: organizationId } });
}

const addBench = async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ success: false, message: 'Only org admin can manage benches' });
    const court = await getCourtInOrg(req.params.id, req.user.organization_id);
    if (!court) return res.status(404).json({ success: false, message: 'Court not found' });
    const { name } = req.body;
    const bench = await CourtBench.create({ court_id: court.id, name: name.trim() });
    res.status(201).json({ success: true, data: bench });
  } catch (err) {
    next(err);
  }
};

const updateBench = async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ success: false, message: 'Only org admin can manage benches' });
    const court = await getCourtInOrg(req.params.id, req.user.organization_id);
    if (!court) return res.status(404).json({ success: false, message: 'Court not found' });
    const bench = await CourtBench.findOne({ where: { id: req.params.benchId, court_id: court.id } });
    if (!bench) return res.status(404).json({ success: false, message: 'Bench not found' });
    const { name } = req.body;
    if (name !== undefined) bench.name = name.trim();
    await bench.save();
    res.json({ success: true, data: bench });
  } catch (err) {
    next(err);
  }
};

const deleteBench = async (req, res, next) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ success: false, message: 'Only org admin can manage benches' });
    const court = await getCourtInOrg(req.params.id, req.user.organization_id);
    if (!court) return res.status(404).json({ success: false, message: 'Court not found' });
    const bench = await CourtBench.findOne({ where: { id: req.params.benchId, court_id: court.id } });
    if (!bench) return res.status(404).json({ success: false, message: 'Bench not found' });
    await bench.destroy();
    res.json({ success: true, message: 'Bench deleted' });
  } catch (err) {
    next(err);
  }
};

const listBenches = async (req, res, next) => {
  try {
    const court = await getCourtInOrg(req.params.id, req.user.organization_id);
    if (!court) return res.status(404).json({ success: false, message: 'Court not found' });
    const benches = await CourtBench.findAll({ where: { court_id: court.id }, order: [['name', 'ASC']] });
    res.json({ success: true, data: benches });
  } catch (err) {
    next(err);
  }
};

const listBenchesAll = async (req, res, next) => {
  try {
    const { court_id } = req.query;
    if (!court_id) return res.status(400).json({ success: false, message: 'court_id is required' });
    const court = await Court.findOne({ where: { id: court_id, organization_id: req.user.organization_id } });
    if (!court) return res.status(404).json({ success: false, message: 'Court not found' });
    const benches = await CourtBench.findAll({ where: { court_id: court.id }, order: [['name', 'ASC']] });
    res.json({ success: true, data: benches });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  addBench,
  updateBench,
  deleteBench,
  listBenches,
  listBenchesAll
};
