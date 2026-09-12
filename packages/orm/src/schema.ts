export type ColumnKind = "string" | "number" | "boolean" | "date";

export interface ColumnOptions<TGenerated extends boolean = false, THasDefault extends boolean = false> {
  primaryKey?: boolean;
  generated?: TGenerated;
  default?: unknown;
  hasDefault?: THasDefault;
}

// The phantom _type is never set at runtime — it only exists so TypeScript
// can infer what JS type a column maps to (string, number, etc.)
export interface Column<T, TGenerated extends boolean = false, THasDefault extends boolean = false> {
  readonly _type: T;
  readonly kind: ColumnKind;
  readonly primaryKey: boolean;
  readonly generated: TGenerated;
  readonly hasDefault: THasDefault;
  readonly defaultValue?: unknown;
}

function column<T, G extends boolean = false, D extends boolean = false>(
  kind: ColumnKind,
  options: ColumnOptions<G, D> = {} as ColumnOptions<G, D>,
): Column<T, G, D> {
  const hasDefault = ("default" in options || options.hasDefault === true) as D;
  return {
    _type: undefined as T,
    kind,
    primaryKey: options.primaryKey ?? false,
    generated: (options.generated ?? false) as G,
    hasDefault,
    ...(hasDefault ? { defaultValue: options.default } : {}),
  };
}

// These helper types let us figure out from the options object whether
// a column is generated or has a default — used in the overload signatures
type FactoryOptions = { primaryKey?: boolean; generated?: boolean; default?: unknown };
type IsGenerated<O extends FactoryOptions> = O extends { generated: true } ? true : false;
type HasDefault<O extends FactoryOptions> = "default" extends keyof O ? true : false;

// Column factory functions — each one creates a Column with the right phantom type
export function string(): Column<string, false, false>;
export function string<const O extends FactoryOptions>(options: O): Column<string, IsGenerated<O>, HasDefault<O>>;
export function string(options?: FactoryOptions) { return column<string, boolean, boolean>("string", options); }

export function number(): Column<number, false, false>;
export function number<const O extends FactoryOptions>(options: O): Column<number, IsGenerated<O>, HasDefault<O>>;
export function number(options?: FactoryOptions) { return column<number, boolean, boolean>("number", options); }

export function boolean(): Column<boolean, false, false>;
export function boolean<const O extends FactoryOptions>(options: O): Column<boolean, IsGenerated<O>, HasDefault<O>>;
export function boolean(options?: FactoryOptions) { return column<boolean, boolean, boolean>("boolean", options); }

export function date(): Column<Date, false, false>;
export function date<const O extends FactoryOptions>(options: O): Column<Date, IsGenerated<O>, HasDefault<O>>;
export function date(options?: FactoryOptions) { return column<Date, boolean, boolean>("date", options); }

export type Shape = Record<string, Column<unknown, boolean, boolean>>;

export interface Model<TName extends string = string, TShape extends Shape = Shape> {
  readonly tableName: TName;
  readonly shape: TShape;
}

// Validates that table/column names are safe identifiers (no SQL injection through names)
export function defineModel<const TName extends string, const TShape extends Shape>(tableName: TName, shape: TShape): Model<TName, TShape> {
  if (!/^[a-z_][a-z0-9_]*$/i.test(tableName)) throw new Error(`Unsafe table name: ${tableName}`);
  for (const name of Object.keys(shape)) {
    if (!/^[a-z_][a-z0-9_]*$/i.test(name)) throw new Error(`Unsafe column name: ${name}`);
  }
  return Object.freeze({ tableName, shape: Object.freeze(shape) });
}

// InferRow gives you the full row type from a model (all columns with their TS types)
export type InferRow<M extends Model> = { [K in keyof M["shape"]]: M["shape"][K]["_type"] };

// For CreateInput, generated columns and columns with defaults become optional.
// Everything else is required.
type OptionalCreateKeys<M extends Model> = {
  [K in keyof M["shape"]]: M["shape"][K]["generated"] extends true ? K : M["shape"][K]["hasDefault"] extends true ? K : never
}[keyof M["shape"]];
type RequiredCreateKeys<M extends Model> = Exclude<keyof M["shape"], OptionalCreateKeys<M>>;
export type CreateInput<M extends Model> =
  { [K in RequiredCreateKeys<M>]: InferRow<M>[K] } &
  { [K in OptionalCreateKeys<M>]?: InferRow<M>[K] };
export type UpdateInput<M extends Model> = Partial<InferRow<M>>;

// Shorthand for an auto-incrementing integer primary key
export const serial = () => number({ primaryKey: true, generated: true });
