// Definition

export type generalPTerm = { type: string; [key: string]: unknown };

export type constructor<Pterm extends generalPTerm> = (arg: any) => Pterm;

// Alpha conversion

export type alphaConversionFn<PTerm extends generalPTerm> = (
  t: PTerm,
  renaming: Map<string, string>
) => PTerm;

export type alphaConversionPartialFn<PTerm extends generalPTerm> = (arg: {
  fn: alphaConversionFn<PTerm>;
  renaming: Map<string, string>;
  freshVarGen: () => string;
}) => (t: PTerm) => PTerm;

// Substitution

export type substitutionFn<PTerm extends generalPTerm> = (
  t: PTerm,
  v: string,
  t0: PTerm
) => PTerm;

export type substitutionPartialFn<PTerm extends generalPTerm> = (arg: {
  fn: substitutionFn<PTerm>;
  v: string;
  t0: PTerm;
}) => (t: PTerm) => PTerm;

// Evaluation

export type state<PTerm extends generalPTerm> = Map<string, PTerm>;

export type evalContext<PTerm extends generalPTerm> = {
  term: PTerm;
  state: state<PTerm>;
};

export type evaluationFn<PTerm extends generalPTerm> = (
  arg: evalContext<PTerm>
) => evalContext<PTerm> | null;

export type evaluationPartialFn<PTerm extends generalPTerm> = (arg: {
  fn: evaluationFn<PTerm>;
  state: state<PTerm>;
}) => (t: PTerm) => evalContext<PTerm> | null;

// PTerm implementation

export type pTermImplementation<PTerm extends generalPTerm> = {
  pTermName: PTerm["type"];
  constructor: constructor<PTerm>;
  alphaConversion: alphaConversionPartialFn<PTerm>;
  needConversion: boolean | ((t: PTerm) => boolean);
  substitution: substitutionPartialFn<PTerm>;
  evaluation: evaluationPartialFn<PTerm>;
};
