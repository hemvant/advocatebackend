'use strict';

/**
 * GST calculation: same state = CGST + SGST (half each), inter-state = IGST.
 * Multi-org: client_state vs org_state (from org address or separate field); here we use optional client_state param.
 * @param {number} taxableAmount - amount before tax
 * @param {number} gstRate - e.g. 18
 * @param {boolean} isSameState - true for CGST+SGST, false for IGST
 * @returns {{ cgst_amount: number, sgst_amount: number, igst_amount: number, total_gst: number }}
 */
function calculateGst(taxableAmount, gstRate, isSameState) {
  const totalGst = Math.round((taxableAmount * (gstRate / 100)) * 100) / 100;
  if (isSameState) {
    const half = Math.round((totalGst / 2) * 100) / 100;
    return { cgst_amount: half, sgst_amount: half, igst_amount: 0, total_gst: totalGst };
  }
  return { cgst_amount: 0, sgst_amount: 0, igst_amount: totalGst, total_gst: totalGst };
}

module.exports = { calculateGst };
