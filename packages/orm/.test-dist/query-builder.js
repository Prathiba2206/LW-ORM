// Double-quotes an identifier to prevent SQL injection through column/table names
const quote = (identifier) => `"${identifier.replaceAll('"', '""')}"`;
// Builds the WHERE part of a query. Each field becomes an AND condition.
// null values get IS NULL, everything else uses $N placeholders.
function whereClause(where, start = 1) {
    if (!where)
        return { text: "", values: [] };
    const entries = Object.entries(where).filter(([, value]) => value !== undefined);
    if (!entries.length)
        return { text: "", values: [] };
    const values = [];
    const clauses = entries.map(([key, value], index) => {
        if (value === null)
            return `${quote(key)} IS NULL`;
        values.push(value);
        return `${quote(key)} = $${start + values.length - 1}`;
    });
    return { text: ` WHERE ${clauses.join(" AND ")}`, values };
}
// INSERT — if no data is given, does a DEFAULT VALUES insert
export function buildInsert(model, data) {
    const entries = Object.entries(data).filter(([, value]) => value !== undefined);
    if (!entries.length)
        return { text: `INSERT INTO ${quote(model.tableName)} DEFAULT VALUES RETURNING *`, values: [] };
    return {
        text: `INSERT INTO ${quote(model.tableName)} (${entries.map(([key]) => quote(key)).join(", ")}) VALUES (${entries.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING *`,
        values: entries.map(([, value]) => value),
    };
}
// SELECT — supports where, orderBy, limit, and offset
export function buildSelect(model, args = {}) {
    const where = whereClause(args.where);
    let text = `SELECT * FROM ${quote(model.tableName)}${where.text}`;
    const order = Object.entries(args.orderBy ?? {});
    if (order.length)
        text += ` ORDER BY ${order.map(([key, direction]) => `${quote(key)} ${String(direction).toUpperCase()}`).join(", ")}`;
    if (args.limit !== undefined)
        text += ` LIMIT ${Math.max(0, Math.trunc(args.limit))}`;
    if (args.offset !== undefined)
        text += ` OFFSET ${Math.max(0, Math.trunc(args.offset))}`;
    return { text, values: where.values };
}
// UPDATE — requires non-empty data and a non-empty where clause.
// The where placeholders start after the SET placeholders so they don't collide.
export function buildUpdate(model, data, whereInput) {
    const entries = Object.entries(data).filter(([, value]) => value !== undefined);
    if (!entries.length)
        throw new Error("Update data cannot be empty");
    const where = whereClause(whereInput, entries.length + 1);
    if (!where.text)
        throw new Error("Update requires a non-empty where clause");
    const set = entries.map(([key], index) => `${quote(key)} = $${index + 1}`).join(", ");
    return { text: `UPDATE ${quote(model.tableName)} SET ${set}${where.text} RETURNING *`, values: [...entries.map(([, value]) => value), ...where.values] };
}
// DELETE — also requires a where clause so you can't accidentally nuke the whole table
export function buildDelete(model, whereInput) {
    const where = whereClause(whereInput);
    if (!where.text)
        throw new Error("Delete requires a non-empty where clause");
    return { text: `DELETE FROM ${quote(model.tableName)}${where.text} RETURNING *`, values: where.values };
}
