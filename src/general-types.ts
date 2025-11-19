import { SingleParser } from "@masala/parser";

// Definition

export type generalPTerm = { type: string; [key: string]: unknown };

export type constructor<Args, Pterm extends generalPTerm> = (args: Args) => Pterm;

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

export type substitutionPartialFn<PTerm extends generalPTerm> = <
  GlobalPTerm extends generalPTerm
>(arg: {
  fn: substitutionFn<GlobalPTerm>;
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

export type evaluationPartialFn<PTerm extends generalPTerm> = <
  GlobalPTerm extends generalPTerm
>(arg: {
  fn: evaluationFn<GlobalPTerm>;
  state: state<GlobalPTerm>;
}) => (t: PTerm) => evalContext<GlobalPTerm> | null;

// PTerm implementation

export type pTermImplementation<
  PTerm extends generalPTerm,
  Args
> = {
  pTermName: PTerm["type"];
  constructor: constructor<Args, PTerm>;
  alphaConversion: alphaConversionPartialFn<PTerm>;
  needConversion:
    | boolean
    | (<GlobalPTerm extends generalPTerm>(
        t: PTerm,
        fn: (t: GlobalPTerm) => boolean
      ) => boolean);
  substitution: substitutionPartialFn<PTerm>;
  evaluation: evaluationPartialFn<PTerm>;
  parser: SingleParser<PTerm>;
};
