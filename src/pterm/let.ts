import { SingleParser, C, F } from "@masala/parser";
import type {
  pTermImplementation,
  PTerm,
  PType,
  Environnement,
  InferContext,
  InferResult,
} from "../types.ts";

const letPTermName = "Let" as const;

interface letPtermType {
  readonly type: typeof letPTermName;
  readonly name: string;
  readonly value: PTerm;
  readonly body: PTerm;
}

function letConstructor(arg: {
  name: string;
  value: PTerm;
  body: PTerm;
}): letPtermType {
  return {
    type: letPTermName,
    name: arg.name,
    value: arg.value,
    body: arg.body,
  };
}

declare module "../types.ts" {
  interface PTermRegistry {
    [letPTermName]: letPtermType;
  }
}

const letParser = (recurse: SingleParser<PTerm>): SingleParser<letPtermType> =>
  C.string("let")
    .drop()
    .then(C.char(" ").rep().drop())
    .then(F.regex(/[a-zA-Z_][a-zA-Z0-9_]*/))
    .then(C.char(" ").rep().drop())
    .then(C.char("=").drop())
    .then(C.char(" ").rep().drop())
    .then(F.lazy(() => recurse))
    .then(C.char(" ").rep().drop())
    .then(C.string("in").drop())
    .then(C.char(" ").rep().drop())
    .then(F.lazy(() => recurse))
    .map((tuple) => {
      const name = tuple.at(0) as string;
      const value = tuple.at(1) as PTerm;
      const body = tuple.at(2) as PTerm;
      return letConstructor({ name, value, body });
    });

const letAlphaConversion = (
  recurse: (t: PTerm, renaming: Map<string, string>) => PTerm,
  renaming: Map<string, string>,
  freshVarGen: () => string,
  t: letPtermType
): PTerm => {
  const freshName = freshVarGen();
  const newValue = recurse(t.value, renaming);
  const newRenaming = new Map(renaming);
  newRenaming.set(t.name, freshName);
  const newBody = recurse(t.body, newRenaming);
  return letConstructor({ name: freshName, value: newValue, body: newBody });
};

const letSubstitution = (
  recurse: (t: PTerm, v: string, t0: PTerm) => PTerm,
  v: string,
  t0: PTerm,
  t: letPtermType
): PTerm => {
  const newValue = recurse(t.value, v, t0);
  if (t.name === v) {
    return letConstructor({ name: t.name, value: newValue, body: t.body });
  }
  const newBody = recurse(t.body, v, t0);
  return letConstructor({ name: t.name, value: newValue, body: newBody });
};

const letEvaluation =
  (
    recurse: (ctx: {
      term: PTerm;
      state: Map<string, PTerm>;
    }) => { term: PTerm; state: Map<string, PTerm> } | null,
    state: Map<string, PTerm>
  ) =>
  (t: letPtermType): { term: PTerm; state: Map<string, PTerm> } | null => {
    const valueResult = recurse({ term: t.value, state });
    if (!valueResult) return null;

    const newState = new Map(valueResult.state);
    newState.set(t.name, valueResult.term);
    return recurse({ term: t.body, state: newState });
  };

const letFreeVarsCollector = (
  recurse: (t: PTerm) => Set<string>,
  t: letPtermType
): Set<string> => {
  const valueFreeVars = recurse(t.value);
  const bodyFreeVars = recurse(t.body);
  bodyFreeVars.delete(t.name);
  return new Set([...valueFreeVars, ...bodyFreeVars]);
};

const letPrint = (recurse: (t: PTerm) => string, t: letPtermType): string =>
  `(let ${t.name} = ${recurse(t.value)} in ${recurse(t.body)})`;

const letInfer = (
  recurse: (
    t: PTerm,
    env: Environnement<PType>,
    ctx: InferContext
  ) => InferResult,
  env: Environnement<PType>,
  ctx: InferContext,
  t: letPtermType
): InferResult => {
  const valueResult = recurse(t.value, env, ctx);
  if (!valueResult.success) {
    return valueResult;
  }

  const envAfterValue = ctx.applySubstToEnv(valueResult.substitution, env);

  // Value restriction: only generalize non-expansive expressions
  const valueType = ctx.isExpansive(t.value)
    ? valueResult.type
    : ctx.generalize(valueResult.type, envAfterValue);

  const newEnv = new Map(envAfterValue);
  newEnv.set(t.name, valueType);

  const bodyResult = recurse(t.body, newEnv, ctx);
  if (!bodyResult.success) {
    return bodyResult;
  }

  const composedSubst = composeSubst(
    ctx,
    valueResult.substitution,
    bodyResult.substitution
  );
  return { success: true, type: bodyResult.type, substitution: composedSubst };
};

function composeSubst(
  ctx: InferContext,
  s1: Map<string, PType>,
  s2: Map<string, PType>
): Map<string, PType> {
  const result = new Map<string, PType>();
  for (const [k, v] of s1) {
    result.set(k, ctx.applySubst(s2, v));
  }
  for (const [k, v] of s2) {
    if (!result.has(k)) {
      result.set(k, v);
    }
  }
  return result;
}

export const letPTermImplementation = {
  [letPTermName]: {
    pTermName: letPTermName,
    constructor: letConstructor,
    parser: letParser,
    alphaConversion: letAlphaConversion,
    substitution: letSubstitution,
    evaluation: letEvaluation,
    freeVarsCollector: letFreeVarsCollector,
    print: letPrint,
    infer: letInfer,
  } as pTermImplementation<letPtermType>,
};

export { letConstructor };
