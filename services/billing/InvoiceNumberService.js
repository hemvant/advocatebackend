'use strict';

const { Invoice } = require('../../models');
const { Op } = require('sequelize');

/**
 * Generate next invoice number per organization. Format: INV-{ORG_ID}-{YYYY}-{SEQ}
 * Multi-org: each org has its own sequence per year.
 */
async function getNextInvoiceNumber(organizationId) {
  const y = new Date().getFullYear();
  const prefix = `INV-${organizationId}-${y}-`;
  const last = await Invoice.findOne({
    where: {
      organization_id: organizationId,
      invoice_number: { [Op.like]: prefix + '%' }
    },
    order: [['id', 'DESC']],
    attributes: ['invoice_number']
  });
  let seq = 1;
  if (last && last.invoice_number) {
    const tail = last.invoice_number.replace(prefix, '');
    const n = parseInt(tail, 10);
    if (!Number.isNaN(n)) seq = n + 1;
  }
  return prefix + String(seq).padStart(4, '0');
}

module.exports = { getNextInvoiceNumber };
