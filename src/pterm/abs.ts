import { SingleParser, C, F } from "@masala/parser";
import type {
  pTermImplementation,
  PTerm,
  PType,
  Environnement,
  InferContext,
  InferResult,
} from "../types.ts";
import { arrowConstructor } from "../ptype/arrow.ts";

const absPTermName = "Abs" as const;

interface absPtermType {
  readonly type: typeof absPTermName;
  readonly name: string;
  readonly body: PTerm;
}

function absConstructor(arg: { name: string; body: PTerm }): absPtermType {
  return {
    type: absPTermName,
    name: arg.name,
    body: arg.body,
  };
}

declare module "../types.ts" {
  interface PTermRegistry {
    [absPTermName]: absPtermType;
  }
}

const absParser = (recurse: SingleParser<PTerm>): SingleParser<absPtermType> =>
  C.charIn("\\λ")
    .drop()
    .then(F.regex(/[a-zA-Z_][a-zA-Z0-9_]*/))
    .then(C.char(".").drop())
    .then(F.lazy(() => recurse))
    .map((tuple) => {
      const name = tuple.at(0) as string;
      const body = tuple.at(1) as PTerm;
      return absConstructor({ name, body });
    });

const absAlphaConversion = (
  recurse: (t: PTerm, renaming: Map<string, string>) => PTerm,
  renaming: Map<string, string>,
  freshVarGen: () => string,
  t: absPtermType
): PTerm => {
  const freshName = freshVarGen();
  const newRenaming = new Map(renaming);
  newRenaming.set(t.name, freshName);
  const newBody = recurse(t.body, newRenaming);
  return absConstructor({ name: freshName, body: newBody });
};

const absSubstitution = (
  recurse: (t: PTerm, v: string, t0: PTerm) => PTerm,
  v: string,
  t0: PTerm,
  t: absPtermType
): PTerm => {
  if (t.name === v) {
    return t;
  }
  const newBody = recurse(t.body, v, t0);
  return absConstructor({ name: t.name, body: newBody });
};

const absEvaluation =
  (_recurse: unknown, state: Map<string, PTerm>) =>
  (t: absPtermType): { term: PTerm; state: Map<string, PTerm> } | null => {
    return { term: t, state };
  };

const absFreeVarsCollector = (
  recurse: (t: PTerm) => Set<string>,
  t: absPtermType
): Set<string> => {
  const bodyFreeVars = recurse(t.body);
  bodyFreeVars.delete(t.name);
  return bodyFreeVars;
};

const absPrint = (recurse: (t: PTerm) => string, t: absPtermType): string =>
  `(fun ${t.name} -> ${recurse(t.body)})`;

const absInfer = (
  recurse: (t: PTerm, env: Environnement<PType>, ctx: InferContext) => InferResult,
  env: Environnement<PType>,
  ctx: InferContext,
  t: absPtermType
): InferResult => {
  const argType = ctx.freshTypeVar();

  const newEnv = new Map(env);
  newEnv.set(t.name, argType);

  const bodyResult = recurse(t.body, newEnv, ctx);
  if (!bodyResult.success) {
    return bodyResult;
  }

  const finalArgType = ctx.applySubst(bodyResult.substitution, argType);
  const arrowType = arrowConstructor({ left: finalArgType, right: bodyResult.type });

  return { success: true, type: arrowType, substitution: bodyResult.substitution };
};

export const absPTermImplementation = {
  [absPTermName]: {
    pTermName: absPTermName,
    constructor: absConstructor,
    parser: absParser,
    alphaConversion: absAlphaConversion,
    substitution: absSubstitution,
    evaluation: absEvaluation,
    freeVarsCollector: absFreeVarsCollector,
    print: absPrint,
    infer: absInfer,
  } as pTermImplementation<absPtermType>,
};
