const { sequelize, Client, ClientOpponent, ClientTag, ClientTagMap, OrganizationUser } = require('../models');
const { Op } = require('sequelize');
const auditService = require('../utils/auditService');

function buildClientWhere(user) {
  const base = { organization_id: user.organization_id, is_deleted: false };
  if (user.role === 'ORG_ADMIN') return base;
  return { ...base, [Op.or]: [{ created_by: user.id }, { assigned_to: user.id }] };
}

async function getClientWithAccess(models, clientId, user) {
  const where = buildClientWhere(user);
  const client = await models.Client.findOne({
    where: { id: clientId, ...where },
    include: [
      { model: OrganizationUser, as: 'Creator', attributes: ['id', 'name', 'email'] },
      { model: OrganizationUser, as: 'Assignee', attributes: ['id', 'name', 'email'] },
      { model: ClientOpponent, as: 'ClientOpponents' },
      { model: ClientTag, as: 'Tags', through: { attributes: [] } }
    ]
  });
  return client;
}

const createClient = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const user = req.user;
    const { name, phone, email, address, city, state, category, status, notes, assigned_to, tag_ids, opponents } = req.body;
    const client = await Client.create({
      organization_id: user.organization_id,
      created_by: user.id,
      assigned_to: assigned_to || null,
      name: name.trim(),
      phone: phone || null,
      email: email || null,
      address: address || null,
      city: city || null,
      state: state || null,
      category: category || 'INDIVIDUAL',
      status: status || 'ACTIVE',
      notes: notes || null,
      is_deleted: false
    }, { transaction: t });
    if (Array.isArray(opponents) && opponents.length) {
      await ClientOpponent.bulkCreate(opponents.map((o) => ({
        client_id: client.id,
        name: o.name || null,
        phone: o.phone || null,
        address: o.address || null,
        notes: o.notes || null
      })), { transaction: t });
    }
    if (Array.isArray(tag_ids) && tag_ids.length) {
      const orgTagIds = await ClientTag.findAll({
        where: { id: { [Op.in]: tag_ids }, organization_id: user.organization_id },
        attributes: ['id'],
        transaction: t
      });
      const ids = orgTagIds.map((t) => t.id);
      await ClientTagMap.bulkCreate(ids.map((tag_id) => ({ client_id: client.id, tag_id })), { transaction: t });
    }
    await t.commit();
    const created = await getClientWithAccess({ Client, ClientOpponent, ClientTag, OrganizationUser }, client.id, user);
    await auditService.log(req, {
      organization_id: user.organization_id,
      user_id: user.id,
      entity_type: 'CLIENT',
      entity_id: client.id,
      action_type: 'CREATE',
      old_value: null,
      new_value: created ? created.toJSON() : { id: client.id }
    });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

const updateClient = async (req, res, next) => {
  try {
    const user = req.user;
    const client = await getClientWithAccess({ Client, ClientOpponent, ClientTag, OrganizationUser }, req.params.id, user);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    const { name, phone, email, address, city, state, category, status, notes, assigned_to } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone || null;
    if (email !== undefined) updates.email = email || null;
    if (address !== undefined) updates.address = address || null;
    if (city !== undefined) updates.city = city || null;
    if (state !== undefined) updates.state = state || null;
    if (category !== undefined) updates.category = category;
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes || null;
    const oldSnapshot = client.toJSON();
    if (assigned_to !== undefined && user.role === 'ORG_ADMIN') updates.assigned_to = assigned_to || null;
    await client.update(updates);
    const updated = await getClientWithAccess({ Client, ClientOpponent, ClientTag, OrganizationUser }, client.id, user);
    await auditService.log(req, {
      organization_id: user.organization_id,
      user_id: user.id,
      entity_type: 'CLIENT',
      entity_id: client.id,
      action_type: 'UPDATE',
      old_value: oldSnapshot,
      new_value: updated ? updated.toJSON() : { ...oldSnapshot, ...updates }
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

const softDeleteClient = async (req, res, next) => {
  try {
    const user = req.user;
    const client = await getClientWithAccess({ Client, ClientOpponent, ClientTag, OrganizationUser }, req.params.id, user);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    const oldSnapshot = client.toJSON();
    await client.update({ is_deleted: true });
    await auditService.log(req, {
      organization_id: user.organization_id,
      user_id: user.id,
      entity_type: 'CLIENT',
      entity_id: client.id,
      action_type: 'DELETE',
      old_value: oldSnapshot,
      new_value: { is_deleted: true }
    });
    res.json({ success: true, message: 'Client deleted' });
  } catch (err) {
    next(err);
  }
};

const getClientById = async (req, res, next) => {
  try {
    const user = req.user;
    const client = await getClientWithAccess({ Client, ClientOpponent, ClientTag, OrganizationUser }, req.params.id, user);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    res.json({ success: true, data: client });
  } catch (err) {
    next(err);
  }
};

const listClients = async (req, res, next) => {
  try {
    const user = req.user;
    let where = buildClientWhere(user);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    if (search) {
      const searchCondition = {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } }
        ]
      };
      where = { [Op.and]: [where, searchCondition] };
    }
    if (req.query.category) where = { ...where, category: req.query.category };
    if (req.query.status) where = { ...where, status: req.query.status };
    const { count, rows } = await Client.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      include: [
        { model: OrganizationUser, as: 'Creator', attributes: ['id', 'name'] },
        { model: OrganizationUser, as: 'Assignee', attributes: ['id', 'name'] },
        { model: ClientTag, as: 'Tags', through: { attributes: [] }, attributes: ['id', 'name'] }
      ]
    });
    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) }
    });
  } catch (err) {
    next(err);
  }
};

const assignClientToEmployee = async (req, res, next) => {
  try {
    if (req.user.role !== 'ORG_ADMIN') return res.status(403).json({ success: false, message: 'Only org admin can assign' });
    const user = req.user;
    const client = await Client.findOne({
      where: { id: req.params.id, organization_id: user.organization_id, is_deleted: false }
    });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    const { assigned_to } = req.body;
    const employee = await OrganizationUser.findOne({
      where: { id: assigned_to, organization_id: user.organization_id }
    });
    if (!employee) return res.status(400).json({ success: false, message: 'Invalid employee' });
    const oldAssigned = client.assigned_to;
    await client.update({ assigned_to });
    await auditService.log(req, {
      organization_id: user.organization_id,
      user_id: user.id,
      entity_type: 'CLIENT',
      entity_id: client.id,
      action_type: 'ASSIGN',
      old_value: { assigned_to: oldAssigned },
      new_value: { assigned_to }
    });
    const updated = await getClientWithAccess({ Client, ClientOpponent, ClientTag, OrganizationUser }, client.id, user);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

const addOpponent = async (req, res, next) => {
  try {
    const user = req.user;
    const client = await getClientWithAccess({ Client, ClientOpponent, ClientTag, OrganizationUser }, req.params.id, user);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    const { name, phone, address, notes } = req.body;
    const opponent = await ClientOpponent.create({
      client_id: client.id,
      name: name || null,
      phone: phone || null,
      address: address || null,
      notes: notes || null
    });
    res.status(201).json({ success: true, data: opponent });
  } catch (err) {
    next(err);
  }
};

const removeOpponent = async (req, res, next) => {
  try {
    const user = req.user;
    const client = await getClientWithAccess({ Client, ClientOpponent, ClientTag, OrganizationUser }, req.params.id, user);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    const opponent = await ClientOpponent.findOne({
      where: { id: req.params.opponentId, client_id: client.id }
    });
    if (!opponent) return res.status(404).json({ success: false, message: 'Opponent not found' });
    await opponent.destroy();
    res.json({ success: true, message: 'Opponent removed' });
  } catch (err) {
    next(err);
  }
};

const createTag = async (req, res, next) => {
  try {
    const user = req.user;
    const { name } = req.body;
    const existing = await ClientTag.findOne({
      where: { organization_id: user.organization_id, name: name.trim() }
    });
    if (existing) return res.status(409).json({ success: false, message: 'Tag name already exists' });
    const tag = await ClientTag.create({ organization_id: user.organization_id, name: name.trim() });
    res.status(201).json({ success: true, data: tag });
  } catch (err) {
    next(err);
  }
};

const listTags = async (req, res, next) => {
  try {
    const tags = await ClientTag.findAll({
      where: { organization_id: req.user.organization_id },
      order: [['name', 'ASC']]
    });
    res.json({ success: true, data: tags });
  } catch (err) {
    next(err);
  }
};

const assignTagToClient = async (req, res, next) => {
  try {
    const user = req.user;
    const client = await getClientWithAccess({ Client, ClientOpponent, ClientTag, OrganizationUser }, req.params.id, user);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    const { tag_id } = req.body;
    const tag = await ClientTag.findOne({ where: { id: tag_id, organization_id: user.organization_id } });
    if (!tag) return res.status(400).json({ success: false, message: 'Invalid tag' });
    const [map] = await ClientTagMap.findOrCreate({
      where: { client_id: client.id, tag_id }
    });
    const updated = await getClientWithAccess({ Client, ClientOpponent, ClientTag, OrganizationUser }, client.id, user);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

const removeTagFromClient = async (req, res, next) => {
  try {
    const user = req.user;
    const client = await getClientWithAccess({ Client, ClientOpponent, ClientTag, OrganizationUser }, req.params.id, user);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    const tagId = parseInt(req.params.tagId, 10);
    await ClientTagMap.destroy({
      where: { client_id: client.id, tag_id: tagId }
    });
    const updated = await getClientWithAccess({ Client, ClientOpponent, ClientTag, OrganizationUser }, client.id, user);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createClient,
  updateClient,
  softDeleteClient,
  getClientById,
  listClients,
  assignClientToEmployee,
  addOpponent,
  removeOpponent,
  createTag,
  listTags,
  assignTagToClient,
  removeTagFromClient
};
