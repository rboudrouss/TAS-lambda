import { SingleParser } from "@masala/parser";

// PTerm definition

export interface generalPTerm {
  type: string;
}

// Registry pattern: each variant extends this interface via declaration merging
// deno-lint-ignore no-empty-interface
export interface PTermRegistry {}

// The union type is derived from all registered variants
export type PTerm = PTermRegistry[keyof PTermRegistry];

// PType definition

export interface generalPType {
  type: string;
}

// Same as PTermRegistry
// deno-lint-ignore no-empty-interface
export interface PTypeRegistry {}

// Same as PTerm
export type PType = PTypeRegistry[keyof PTypeRegistry];

// Alpha conversion

export type alphaConversionPartial<Variant extends generalPTerm> = (
  recurse: (t: PTerm, renaming: Map<string, string>) => PTerm,
  renaming: Map<string, string>,
  freshVarGen: () => string,
  t: Variant
) => PTerm;

export type parserPartial<Variant extends generalPTerm> = (
  recurse: SingleParser<PTerm>
) => SingleParser<Variant>;

// Substitution

export type substitutionPartial<Variant extends generalPTerm> = (
  recurse: (t: PTerm, v: string, t0: PTerm) => PTerm,
  v: string,
  t0: PTerm,
  t: Variant
) => PTerm;

// Evaluation

export type State<T> = Map<string, T>;

export type evalContext<T> = {
  term: T;
  state: State<T>;
};

export type evaluationPartial<Variant extends generalPTerm> = (
  recurse: (ctx: evalContext<PTerm>) => evalContext<PTerm> | null,
  state: State<PTerm>
) => (t: Variant) => evalContext<PTerm> | null;

export type FreeVarsCollectorPartial<Variant extends generalPTerm> = (
  recurse: (t: PTerm) => Set<string>,
  t: Variant
) => Set<string>;

// Print

export type printPartial<Variant extends generalPTerm> = (
  recurse: (t: PTerm) => string,
  t: Variant
) => string;

// Type inference (genre Algorithm W)

export type Environnement<Ty> = Map<string, Ty>;

// maps type variable names to types
export type Substitution = Map<string, PType>;

// Result of type inference
export type InferResult =
  | { success: true; type: PType; substitution: Substitution }
  | { success: false; error: string };

// Context passed to infer functions
export type InferContext = {
  freshTypeVar: () => PType;
  unify: (t1: PType, t2: PType, subst: Substitution) => InferResult;
  generalize: (ty: PType, env: Environnement<PType>) => PType;
  instantiate: (ty: PType) => PType;
  applySubst: (subst: Substitution, ty: PType) => PType;
  applySubstToEnv: (subst: Substitution, env: Environnement<PType>) => Environnement<PType>;
};

export type InferPartial<Variant extends generalPTerm> = (
  recurse: (t: PTerm, env: Environnement<PType>, ctx: InferContext) => InferResult,
  env: Environnement<PType>,
  ctx: InferContext,
  t: Variant
) => InferResult;

export type pTermImplementation<Variant extends generalPTerm> = {
  pTermName: Variant["type"];
  constructor: (args: Omit<Variant, "type">) => Variant;
  alphaConversion: alphaConversionPartial<Variant>;
  substitution: substitutionPartial<Variant>;
  evaluation: evaluationPartial<Variant>;
  freeVarsCollector: FreeVarsCollectorPartial<Variant>;
  parser: parserPartial<Variant>;
  print: printPartial<Variant>;
  infer: InferPartial<Variant>;
};

export type TypeFreeVarsCollectorPartial<Variant extends generalPType> = (
  recurse: (ty: PType) => Set<string>,
  ty: Variant
) => Set<string>;

export type TypeSubstPartial<Variant extends generalPType> = (
  recurse: (ty: PType, v: string, t0: PType) => PType,
  v: string,
  t0: PType,
  ty: Variant
) => PType;

export type TypeContainsVarPartial<Variant extends generalPType> = (
  recurse: (varName: string, ty: PType) => boolean,
  varName: string,
  ty: Variant
) => boolean;

export type TypePrintPartial<Variant extends generalPType> = (
  recurse: (ty: PType) => string,
  ty: Variant
) => string;

export type pTypeImplementation<Variant extends generalPType> = {
  pTypeName: Variant["type"];
  constructor: (args: Omit<Variant, "type">) => Variant;
  freeVarsCollector: TypeFreeVarsCollectorPartial<Variant>;
  typeSubstitution: TypeSubstPartial<Variant>;
  containsVar: TypeContainsVarPartial<Variant>;
  print: TypePrintPartial<Variant>;
};
