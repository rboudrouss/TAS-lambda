import { SingleParser } from "@masala/parser";

// Definition

export interface generalPTerm {
  type: string;
}

// Registry pattern: each variant extends this interface via declaration merging
// deno-lint-ignore no-empty-interface
export interface PTermRegistry {}

// The union type is derived from all registered variants
export type PTerm = PTermRegistry[keyof PTermRegistry];

// Alpha conversion

export type alphaConversionPartial<Variant extends generalPTerm> = (
  recurse: (t: PTerm, renaming: Map<string, string>) => PTerm,
  renaming: Map<string, string>,
  freshVarGen: () => string,
  t: Variant
) => PTerm;

export type needConversionPartial<Variant extends generalPTerm> =
  | boolean
  | ((t: Variant, recurse: (t: PTerm) => boolean) => boolean);

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

export type State<PTerm> = Map<string, PTerm>;

export type evalContext<PTerm> = {
  term: PTerm;
  state: State<PTerm>;
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

export type Environnement<Ty> = Map<string, Ty>;

export type Equation<Ty> = ReadonlyArray<readonly [Ty, Ty]>;

export type GenEquationPartial<Variant extends generalPTerm, Ty> = (
  recurse: (t: PTerm, ty: Ty, env: Environnement<Ty>) => Equation<Ty>,
  targetType: Ty,
  env: Environnement<Ty>,
  freshTypeVar: () => Ty,
  inference: (env: Environnement<Ty>, t: PTerm) => Ty | null,
  t: Variant
) => Equation<Ty>;

// PTerm implementation
// Variant = the specific variant type (e.g., absPtermType)
// PTerm = the full union type (e.g., PTerm)

export type pTermImplementation<
  Variant extends generalPTerm,
> = {
  pTermName: Variant["type"];
  constructor: (args: Omit<Variant, "type">) => Variant;
  alphaConversion: alphaConversionPartial<Variant>;
  needConversion: needConversionPartial<Variant>;
  substitution: substitutionPartial<Variant>;
  evaluation: evaluationPartial<Variant>;
  freeVarsCollector: FreeVarsCollectorPartial<Variant>;
  parser: parserPartial<Variant>;
  print: printPartial<Variant>;
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
