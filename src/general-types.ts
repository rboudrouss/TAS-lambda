import { SingleParser } from "@masala/parser";

// Definition

export interface generalPTerm {
  type: string;
  [key: string]: unknown;
}

// Alpha conversion

export type alphaConversionPartial<
  PTerm extends generalPTerm,
  T extends generalPTerm
> = (
  recurse: (t: T, renaming: Map<string, string>) => T,
  renaming: Map<string, string>,
  freshVarGen: () => string,
  t: PTerm
) => T;

// Substitution

export type substitutionPartial<
  PTerm extends generalPTerm,
  T extends generalPTerm
> = (arg: {
  recurse: (t: T, v: string, t0: T) => T;
  v: string;
  t0: T;
  t: PTerm;
}) => T;

// Evaluation

export type State<T extends generalPTerm> = Map<string, T>;

export type evalContext<T extends generalPTerm> = {
  term: T;
  state: State<T>;
};

export type evaluationPartial<
  PTerm extends generalPTerm,
  T extends generalPTerm
> = (
  recurse: (ctx: evalContext<T>) => evalContext<T> | null,
  state: State<T>
) => (t: PTerm) => evalContext<T> | null;

export type FreeVarsCollectorPartial<
  PTerm extends generalPTerm,
  T extends generalPTerm
> = (recurse: (t: T) => Set<string>, t: PTerm) => Set<string>;

export type Environnement<Ty> = Map<string, Ty>;

export type Equation<Ty> = ReadonlyArray<readonly [Ty, Ty]>;

export type GenEquationPartial<
  PTerm extends generalPTerm,
  T extends generalPTerm,
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

export type pTermImplementation<
  Pterm extends generalPTerm,
  Args,
  T extends generalPTerm
> = {
  pTermName: Pterm["type"];
  constructor: (args: Args) => Pterm;
  alphaConversion: alphaConversionPartial<Pterm, T>;
  needConversion: boolean | ((t: Pterm, recurse: (t: T) => boolean) => boolean);
  substitution: substitutionPartial<Pterm, T>;
  evaluation: evaluationPartial<Pterm, T>;
  freeVarsCollector: FreeVarsCollectorPartial<Pterm, T>;
  parser: SingleParser<T>;
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

export type Compatible<Ty> = (
  ty1: Ty,
  ty2: Ty
) => boolean;

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

export type pTypeImplementation<
  PType,
  Args,
  Ty
> = {
  pTypeName: string;
  constructor: (args: Args) => PType;
  freeVarsCollector: TypeFreeVarsCollectorPartial<PType, Ty>;
  typeSubstitution: TypeSubstPartial<PType, Ty>;
  belongs: BelongsPartial<PType, Ty>;
  compatible: Compatible<Ty>;
  substEquation: SubstEquation<Ty>;
  generalise: Generalise<Ty>;
};
