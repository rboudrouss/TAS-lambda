import { SingleParser, C, F } from "@masala/parser";
import type {
  pTermImplementation,
  PTerm,
  evalContext,
  Environnement,
  PType,
  InferContext,
  InferResult,
} from "../types.ts";
import { tListConstructor } from "../ptype/list.ts";

const headPTermName = "Head" as const;

interface headPtermType {
  readonly type: typeof headPTermName;
  readonly list: PTerm;
}

function headConstructor(arg: { list: PTerm }): headPtermType {
  return { type: headPTermName, list: arg.list };
}

declare module "../types.ts" {
  interface PTermRegistry {
    [headPTermName]: headPtermType;
  }
}

// Parser: head M
const headParser = (recurse: SingleParser<PTerm>): SingleParser<headPtermType> =>
  C.string("head")
    .drop()
    .then(C.char(" ").rep().drop())
    .then(F.lazy(() => recurse))
    .map((r) => headConstructor({ list: r.at(0) as PTerm }));

// Alpha conversion
const headAlphaConversion = (
  recurse: (t: PTerm, renaming: Map<string, string>) => PTerm,
  renaming: Map<string, string>,
  _freshVarGen: () => string,
  t: headPtermType
): PTerm => headConstructor({ list: recurse(t.list, renaming) });

// Substitution
const headSubstitution = (
  recurse: (t: PTerm, v: string, t0: PTerm) => PTerm,
  v: string,
  t0: PTerm,
  t: headPtermType
): PTerm => headConstructor({ list: recurse(t.list, v, t0) });

// Evaluation: evaluate list, get head if Cons
const headEvaluation =
  (recurse: (ctx: evalContext<PTerm>) => evalContext<PTerm> | null, state: Map<string, PTerm>) =>
  (t: headPtermType): evalContext<PTerm> | null => {
    const listResult = recurse({ term: t.list, state });
    if (listResult) {
      return { term: headConstructor({ list: listResult.term }), state: listResult.state };
    }
    if (t.list.type === "Cons") {
      return { term: t.list.head, state };
    }
    return null;
  };

// Free variables
const headFreeVarsCollector = (
  recurse: (t: PTerm) => Set<string>,
  t: headPtermType
): Set<string> => recurse(t.list);

// Print
const headPrint = (recurse: (t: PTerm) => string, t: headPtermType): string =>
  `(head ${recurse(t.list)})`;

// Type inference: list must be [a], result is a
const headInfer = (
  recurse: (t: PTerm, env: Environnement<PType>, ctx: InferContext) => InferResult,
  env: Environnement<PType>,
  ctx: InferContext,
  t: headPtermType
): InferResult => {
  const listResult = recurse(t.list, env, ctx);
  if (!listResult.success) return listResult;

  const elemType = ctx.freshTypeVar();
  const expectedListType = tListConstructor({ elem: elemType });
  const unifyResult = ctx.unify(listResult.type, expectedListType, listResult.substitution);
  if (!unifyResult.success) return unifyResult;

  const finalElemType = ctx.applySubst(unifyResult.substitution, elemType);
  return { success: true, type: finalElemType, substitution: unifyResult.substitution };
};

export const headPTermImplementation = {
  [headPTermName]: {
    pTermName: headPTermName,
    constructor: headConstructor,
    parser: headParser,
    alphaConversion: headAlphaConversion,
    substitution: headSubstitution,
    evaluation: headEvaluation,
    freeVarsCollector: headFreeVarsCollector,
    print: headPrint,
    infer: headInfer,
  } as pTermImplementation<headPtermType>,
};

export { headConstructor };

