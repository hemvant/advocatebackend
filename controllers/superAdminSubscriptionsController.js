const { sequelize, Subscription, Organization } = require('../models');
const { Op } = require('sequelize');

async function listSubscriptions(req, res, next) {
  try {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const active = await Subscription.findAll({
      where: { status: 'ACTIVE', expires_at: { [Op.or]: [{ [Op.gte]: now }, { [Op.eq]: null }] } },
      include: [{ model: Organization, as: 'Organization', attributes: ['id', 'name'] }],
      order: [['expires_at', 'ASC']]
    });
    const expiringSoon = await Subscription.findAll({
      where: { status: 'ACTIVE', expires_at: { [Op.and]: [{ [Op.gte]: now }, { [Op.lte]: in7Days }] } },
      include: [{ model: Organization, as: 'Organization', attributes: ['id', 'name'] }]
    });
    const expired = await Subscription.findAll({
      where: { status: 'EXPIRED' },
      include: [{ model: Organization, as: 'Organization', attributes: ['id', 'name'] }],
      limit: 50
    });

    const planDistribution = await Subscription.findAll({
      where: { status: 'ACTIVE' },
      attributes: ['plan', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['plan'],
      raw: true
    });

    res.json({
      success: true,
      data: {
        active: active,
        expiring_soon: expiringSoon,
        expired: expired,
        plan_distribution: planDistribution.map((r) => ({ plan: r.plan, count: Number(r.count) }))
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listSubscriptions };
