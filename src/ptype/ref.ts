import type { pTypeImplementation, PType } from "../types.ts";

const tRefPTypeName = "TRef" as const;

interface tRefType {
  readonly type: typeof tRefPTypeName;
  readonly inner: PType;
}

function tRefConstructor(arg: { inner: PType }): tRefType {
  return { type: tRefPTypeName, inner: arg.inner };
}

declare module "../types.ts" {
  interface PTypeRegistry {
    [tRefPTypeName]: tRefType;
  }
}

const tRefFreeVarsCollector = (
  recurse: (ty: PType) => Set<string>,
  ty: tRefType
): Set<string> => recurse(ty.inner);

const tRefTypeSubstitution = (
  recurse: (ty: PType, v: string, t0: PType) => PType,
  v: string,
  t0: PType,
  ty: tRefType
): PType => tRefConstructor({ inner: recurse(ty.inner, v, t0) });

const tRefContainsVar = (
  recurse: (varName: string, ty: PType) => boolean,
  varName: string,
  ty: tRefType
): boolean => recurse(varName, ty.inner);

const tRefPrint = (recurse: (ty: PType) => string, ty: tRefType): string =>
  `Ref(${recurse(ty.inner)})`;

export const tRefPTypeImplementation = {
  [tRefPTypeName]: {
    pTypeName: tRefPTypeName,
    constructor: tRefConstructor,
    freeVarsCollector: tRefFreeVarsCollector,
    typeSubstitution: tRefTypeSubstitution,
    containsVar: tRefContainsVar,
    print: tRefPrint,
  } as pTypeImplementation<tRefType>,
};

export { tRefConstructor };

