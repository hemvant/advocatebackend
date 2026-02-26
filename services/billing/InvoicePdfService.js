'use strict';

const PDFDocument = require('pdfkit');
const { Invoice, InvoiceItem, Case, Client, Organization } = require('../../models');

/**
 * Generate invoice PDF. Multi-org: invoice must belong to org.
 */
async function generateInvoicePdf(invoiceId, organizationId) {
  const inv = await Invoice.findOne({
    where: { id: invoiceId, organization_id: organizationId },
    include: [
      { model: Case, as: 'Case', attributes: ['id', 'case_title', 'case_number'], include: [{ model: Client, as: 'Client', attributes: ['id', 'name', 'email'] }] },
      { model: InvoiceItem, as: 'InvoiceItems', required: false },
      { model: Organization, as: 'Organization', attributes: ['id', 'name', 'address', 'gstin'] }
    ]
  });
  if (!inv) return null;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text('TAX INVOICE', { align: 'center' });
    doc.fontSize(10).text(`Invoice #${inv.invoice_number || inv.id}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Date: ${inv.created_at ? new Date(inv.created_at).toLocaleDateString() : '—'}`, { align: 'right' });
    if (inv.Organization) {
      doc.text(inv.Organization.name || '');
      if (inv.Organization.address) doc.text(inv.Organization.address);
      if (inv.Organization.gstin || inv.gstin) doc.text(`GSTIN: ${inv.gstin || inv.Organization.gstin || '—'}`);
    }
    doc.moveDown();
    if (inv.Case) {
      doc.text(`Case: ${inv.Case.case_title || ''} (${inv.Case.case_number || ''})`);
      if (inv.Case.Client) doc.text(`Client: ${inv.Case.Client.name || ''}`);
    }
    doc.moveDown();
    const items = inv.InvoiceItems && inv.InvoiceItems.length ? inv.InvoiceItems : [];
    if (items.length > 0) {
      doc.fontSize(11).text('Particulars', { continued: false });
      let subtotal = 0;
      items.forEach((i) => {
        const amt = Number(i.amount) || 0;
        subtotal += amt;
        doc.fontSize(9).text(`${i.description || 'Item'} | Qty: ${i.quantity} × ${i.unit_price} = ${amt.toFixed(2)}`);
      });
      doc.text(`Subtotal: ₹ ${subtotal.toFixed(2)}`);
    } else {
      const pf = Number(inv.professional_fee) || 0;
      const ff = Number(inv.filing_fee) || 0;
      const cf = Number(inv.clerk_fee) || 0;
      const cof = Number(inv.court_fee) || 0;
      const misc = Number(inv.misc_expense) || 0;
      doc.text(`Professional Fee: ₹ ${pf.toFixed(2)}`);
      doc.text(`Filing Fee: ₹ ${ff.toFixed(2)}`);
      doc.text(`Clerk Fee: ₹ ${cf.toFixed(2)}`);
      doc.text(`Court Fee: ₹ ${cof.toFixed(2)}`);
      doc.text(`Misc: ₹ ${misc.toFixed(2)}`);
    }
    const total = Number(inv.total_amount) ?? Number(inv.amount) ?? 0;
    const gst = Number(inv.gst_amount) || 0;
    if (gst > 0) {
      doc.text(`GST: ₹ ${gst.toFixed(2)}`);
      if (inv.cgst_amount > 0) doc.text(`  CGST: ₹ ${Number(inv.cgst_amount).toFixed(2)}`);
      if (inv.sgst_amount > 0) doc.text(`  SGST: ₹ ${Number(inv.sgst_amount).toFixed(2)}`);
      if (inv.igst_amount > 0) doc.text(`  IGST: ₹ ${Number(inv.igst_amount).toFixed(2)}`);
    }
    doc.fontSize(11).text(`Total: ₹ ${total.toFixed(2)}`, { continued: false });
    doc.text(`Balance Due: ₹ ${(Number(inv.balance_due) || 0).toFixed(2)}`);
    doc.end();
  });
}

module.exports = { generateInvoicePdf };
