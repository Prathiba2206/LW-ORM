function column(kind, options = {}) {
    const hasDefault = ("default" in options || options.hasDefault === true);
    return {
        _type: undefined,
        kind,
        primaryKey: options.primaryKey ?? false,
        generated: (options.generated ?? false),
        hasDefault,
        ...(hasDefault ? { defaultValue: options.default } : {}),
    };
}
export function string(options) { return column("string", options); }
export function number(options) { return column("number", options); }
export function boolean(options) { return column("boolean", options); }
export function date(options) { return column("date", options); }
// Validates that table/column names are safe identifiers (no SQL injection through names)
export function defineModel(tableName, shape) {
    if (!/^[a-z_][a-z0-9_]*$/i.test(tableName))
        throw new Error(`Unsafe table name: ${tableName}`);
    for (const name of Object.keys(shape)) {
        if (!/^[a-z_][a-z0-9_]*$/i.test(name))
            throw new Error(`Unsafe column name: ${name}`);
    }
    return Object.freeze({ tableName, shape: Object.freeze(shape) });
}
// Shorthand for an auto-incrementing integer primary key
export const serial = () => number({ primaryKey: true, generated: true });
