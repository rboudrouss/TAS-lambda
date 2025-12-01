import { SingleParser } from "@masala/parser";

// Definition

export interface generalPTerm {
  type: string;
  [key: string]: unknown;
}

// Registry pattern: each variant extends this interface via declaration merging
// deno-lint-ignore no-empty-interface
export interface PTermRegistry {}

// The union type is derived from all registered variants
export type PTerm = PTermRegistry[keyof PTermRegistry];


// Alpha conversion

export type alphaConversionPartial<
  Variant extends generalPTerm,
  T extends generalPTerm
> = (
  recurse: (t: T, renaming: Map<string, string>) => T,
  renaming: Map<string, string>,
  freshVarGen: () => string,
  t: Variant
) => T;

export type needConversionPartial<
  Variant extends generalPTerm,
  T extends generalPTerm
> = boolean | ((t: Variant, recurse: (t: T) => boolean) => boolean);

export type parserPartial<
  Variant extends generalPTerm,
  T extends generalPTerm
> = (recurse: SingleParser<T>) => SingleParser<Variant>;

// Substitution

export type substitutionPartial<
  Variant extends generalPTerm,
  T extends generalPTerm
> = (recurse: (t: T, v: string, t0: T) => T, v: string, t0: T, t: Variant) => T;

// Evaluation

export type State<T extends generalPTerm> = Map<string, T>;

export type evalContext<T extends generalPTerm> = {
  term: T;
  state: State<T>;
};

export type evaluationPartial<
  Variant extends generalPTerm,
  T extends generalPTerm
> = (
  recurse: (ctx: evalContext<T>) => evalContext<T> | null,
  state: State<T>
) => (t: Variant) => evalContext<T> | null;

export type FreeVarsCollectorPartial<
  Variant extends generalPTerm,
  T extends generalPTerm
> = (recurse: (t: T) => Set<string>, t: Variant) => Set<string>;

export type Environnement<Ty> = Map<string, Ty>;

export type Equation<Ty> = ReadonlyArray<readonly [Ty, Ty]>;

export type GenEquationPartial<
  PTerm extends generalPTerm,
  T extends PTerm,
  Ty
> = (
  recurse: (t: T, ty: Ty, env: Environnement<Ty>) => Equation<Ty>,
  targetType: Ty,
  env: Environnement<Ty>,
  freshTypeVar: () => Ty,
  inference: (env: Environnement<Ty>, t: T) => Ty | null,
  t: PTerm
) => Equation<Ty>;

// PTerm implementation
// PTerm = the specific variant type (e.g., absPtermType)
// T = the full union type (e.g., PTerm)
// Constraint: the variant must be part of the union (PTerm extends T)

export type pTermImplementation<
  Variant extends generalPTerm,
  Args extends unknown[],
  T extends generalPTerm
> = {
  pTermName: Variant["type"];
  constructor: (...args: Args) => Variant;
  alphaConversion: alphaConversionPartial<Variant, T>;
  needConversion: needConversionPartial<Variant, T>;
  substitution: substitutionPartial<Variant, T>;
  evaluation: evaluationPartial<Variant, T>;
  freeVarsCollector: FreeVarsCollectorPartial<Variant, T>;
  parser: parserPartial<Variant, T>;
};

// PType implementation

export type TypeFreeVarsCollectorPartial<PType, Ty> = (
  recurse: (ty: Ty) => Set<string>,
  ty: PType
) => Set<string>;

export type TypeSubstPartial<PType, Ty> = (
  recurse: (ty: Ty, v: string, t0: Ty) => Ty,
  v: string,
  t0: Ty,
  ty: PType
) => Ty;

export type BelongsPartial<PType, Ty> = (
  recurse: (varName: string, ty: Ty) => boolean,
  varName: string,
  ty: PType
) => boolean;

export type Compatible<Ty> = (ty1: Ty, ty2: Ty) => boolean;

export type SubstEquation<Ty> = (
  eq: Equation<Ty>,
  varName: string,
  newType: Ty,
  substType: (ty: Ty, varName: string, newType: Ty) => Ty
) => Equation<Ty>;

export type Generalise<Ty> = (
  env: Environnement<Ty>,
  ty: Ty,
  freeVarsEnv: (env: Environnement<Ty>) => Set<string>,
  typeFreeVars: (ty: Ty) => Set<string>,
  mkForall: (varName: string, ty: Ty) => Ty
) => Ty;

export type pTypeImplementation<PType, Args, Ty> = {
  pTypeName: string;
  constructor: (args: Args) => PType;
  freeVarsCollector: TypeFreeVarsCollectorPartial<PType, Ty>;
  typeSubstitution: TypeSubstPartial<PType, Ty>;
  belongs: BelongsPartial<PType, Ty>;
  compatible: Compatible<Ty>;
  substEquation: SubstEquation<Ty>;
  generalise: Generalise<Ty>;
};
