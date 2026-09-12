export type ColumnKind = "string" | "number" | "boolean" | "date";
export interface ColumnOptions<TGenerated extends boolean = false, THasDefault extends boolean = false> {
    primaryKey?: boolean;
    generated?: TGenerated;
    default?: unknown;
    hasDefault?: THasDefault;
}
export interface Column<T, TGenerated extends boolean = false, THasDefault extends boolean = false> {
    readonly _type: T;
    readonly kind: ColumnKind;
    readonly primaryKey: boolean;
    readonly generated: TGenerated;
    readonly hasDefault: THasDefault;
    readonly defaultValue?: unknown;
}
type FactoryOptions = {
    primaryKey?: boolean;
    generated?: boolean;
    default?: unknown;
};
type IsGenerated<O extends FactoryOptions> = O extends {
    generated: true;
} ? true : false;
type HasDefault<O extends FactoryOptions> = "default" extends keyof O ? true : false;
export declare function string(): Column<string, false, false>;
export declare function string<const O extends FactoryOptions>(options: O): Column<string, IsGenerated<O>, HasDefault<O>>;
export declare function number(): Column<number, false, false>;
export declare function number<const O extends FactoryOptions>(options: O): Column<number, IsGenerated<O>, HasDefault<O>>;
export declare function boolean(): Column<boolean, false, false>;
export declare function boolean<const O extends FactoryOptions>(options: O): Column<boolean, IsGenerated<O>, HasDefault<O>>;
export declare function date(): Column<Date, false, false>;
export declare function date<const O extends FactoryOptions>(options: O): Column<Date, IsGenerated<O>, HasDefault<O>>;
export type Shape = Record<string, Column<unknown, boolean, boolean>>;
export interface Model<TName extends string = string, TShape extends Shape = Shape> {
    readonly tableName: TName;
    readonly shape: TShape;
}
export declare function defineModel<const TName extends string, const TShape extends Shape>(tableName: TName, shape: TShape): Model<TName, TShape>;
export type InferRow<M extends Model> = {
    [K in keyof M["shape"]]: M["shape"][K]["_type"];
};
type OptionalCreateKeys<M extends Model> = {
    [K in keyof M["shape"]]: M["shape"][K]["generated"] extends true ? K : M["shape"][K]["hasDefault"] extends true ? K : never;
}[keyof M["shape"]];
type RequiredCreateKeys<M extends Model> = Exclude<keyof M["shape"], OptionalCreateKeys<M>>;
export type CreateInput<M extends Model> = {
    [K in RequiredCreateKeys<M>]: InferRow<M>[K];
} & {
    [K in OptionalCreateKeys<M>]?: InferRow<M>[K];
};
export type UpdateInput<M extends Model> = Partial<InferRow<M>>;
export declare const serial: () => Column<number, true, false>;
export {};
