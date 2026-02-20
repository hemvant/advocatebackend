/**
 * Cursor-based pagination helpers.
 * Cursor is base64(JSON({ id, created_at })) for consistent ordering.
 */

function encodeCursor(id, created_at) {
  if (id == null) return null;
  const payload = JSON.stringify({ id: Number(id), created_at: created_at || null });
  return Buffer.from(payload, 'utf8').toString('base64url');
}

function decodeCursor(cursor) {
  if (!cursor || typeof cursor !== 'string') return null;
  try {
    const payload = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(payload);
    return { id: parsed.id, created_at: parsed.created_at };
  } catch {
    return null;
  }
}

/**
 * Build Sequelize where clause for cursor-based page (next page).
 * Assumes order: [['created_at', 'DESC'], ['id', 'DESC']].
 * Returns { where, order } to use with findAll.
 */
function cursorWhereOrder(cursor, order = [['created_at', 'DESC'], ['id', 'DESC']]) {
  const decoded = decodeCursor(cursor);
  if (!decoded) return { where: {}, order };
  const { Op } = require('sequelize');
  const [[orderCol, orderDir]] = order;
  const isDesc = (orderDir || 'DESC').toUpperCase() === 'DESC';
  const op = isDesc ? Op.lt : Op.gt;
  const opOr = isDesc ? Op.or : Op.or;
  const col = orderCol === 'created_at' ? 'created_at' : 'id';
  const otherCol = orderCol === 'created_at' ? 'id' : 'created_at';
  const where = {
    [opOr]: [
      { [col]: { [op]: decoded[col] ?? decoded.id } },
      col === 'created_at'
        ? { created_at: decoded.created_at, id: { [op]: decoded.id } }
        : { id: decoded.id, created_at: { [op]: decoded.created_at } }
    ]
  };
  if (col === 'id') {
    where[opOr] = [{ id: { [op]: decoded.id } }];
  } else {
    where[opOr] = [
      { created_at: { [op]: decoded.created_at } },
      { created_at: decoded.created_at, id: { [op]: decoded.id } }
    ];
  }
  return { where, order };
}

/**
 * Simpler: order by id DESC, cursor is just last id.
 */
function cursorByIdDesc(cursor) {
  const decoded = decodeCursor(cursor);
  if (!decoded || decoded.id == null) return { where: {}, order: [['id', 'DESC']] };
  const { Op } = require('sequelize');
  return {
    where: { id: { [Op.lt]: decoded.id } },
    order: [['id', 'DESC']]
  };
}

/**
 * For order [['created_at', 'DESC'], ['id', 'DESC']]: cursor from last row.
 */
function cursorFromRow(row) {
  if (!row) return null;
  return encodeCursor(row.id, row.created_at);
}

module.exports = {
  encodeCursor,
  decodeCursor,
  cursorWhereOrder,
  cursorByIdDesc,
  cursorFromRow
};
