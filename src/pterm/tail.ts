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

const tailPTermName = "Tail" as const;

interface tailPtermType {
  readonly type: typeof tailPTermName;
  readonly list: PTerm;
}

function tailConstructor(arg: { list: PTerm }): tailPtermType {
  return { type: tailPTermName, list: arg.list };
}

declare module "../types.ts" {
  interface PTermRegistry {
    [tailPTermName]: tailPtermType;
  }
}

const tailParser = (recurse: SingleParser<PTerm>): SingleParser<tailPtermType> =>
  C.string("tail")
    .drop()
    .then(C.char(" ").rep().drop())
    .then(F.lazy(() => recurse))
    .map((r) => tailConstructor({ list: r.at(0) as PTerm }));

const tailAlphaConversion = (
  recurse: (t: PTerm, renaming: Map<string, string>) => PTerm,
  renaming: Map<string, string>,
  _freshVarGen: () => string,
  t: tailPtermType
): PTerm => tailConstructor({ list: recurse(t.list, renaming) });

const tailSubstitution = (
  recurse: (t: PTerm, v: string, t0: PTerm) => PTerm,
  v: string,
  t0: PTerm,
  t: tailPtermType
): PTerm => tailConstructor({ list: recurse(t.list, v, t0) });

const tailEvaluation =
  (recurse: (ctx: evalContext<PTerm>) => evalContext<PTerm> | null, state: Map<string, PTerm>) =>
  (t: tailPtermType): evalContext<PTerm> | null => {
    const listResult = recurse({ term: t.list, state });
    if (listResult) {
      return { term: tailConstructor({ list: listResult.term }), state: listResult.state };
    }
    if (t.list.type === "Cons") {
      return { term: t.list.tail, state };
    }
    return null;
  };

const tailFreeVarsCollector = (
  recurse: (t: PTerm) => Set<string>,
  t: tailPtermType
): Set<string> => recurse(t.list);

const tailPrint = (recurse: (t: PTerm) => string, t: tailPtermType): string =>
  `(tail ${recurse(t.list)})`;

const tailInfer = (
  recurse: (t: PTerm, env: Environnement<PType>, ctx: InferContext) => InferResult,
  env: Environnement<PType>,
  ctx: InferContext,
  t: tailPtermType
): InferResult => {
  const listResult = recurse(t.list, env, ctx);
  if (!listResult.success) return listResult;

  const elemType = ctx.freshTypeVar();
  const expectedListType = tListConstructor({ elem: elemType });
  const unifyResult = ctx.unify(listResult.type, expectedListType, listResult.substitution);
  if (!unifyResult.success) return unifyResult;

  const finalListType = ctx.applySubst(unifyResult.substitution, expectedListType);
  return { success: true, type: finalListType, substitution: unifyResult.substitution };
};

export const tailPTermImplementation = {
  [tailPTermName]: {
    pTermName: tailPTermName,
    constructor: tailConstructor,
    parser: tailParser,
    alphaConversion: tailAlphaConversion,
    substitution: tailSubstitution,
    evaluation: tailEvaluation,
    freeVarsCollector: tailFreeVarsCollector,
    print: tailPrint,
    infer: tailInfer,
  } as pTermImplementation<tailPtermType>,
};

export { tailConstructor };

