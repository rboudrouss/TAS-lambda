import type { pTypeImplementation, PType } from "../types.ts";

const tListPTypeName = "TList" as const;

interface tListType {
  readonly type: typeof tListPTypeName;
  readonly elem: PType;
}

function tListConstructor(arg: { elem: PType }): tListType {
  return { type: tListPTypeName, elem: arg.elem };
}

declare module "../types.ts" {
  interface PTypeRegistry {
    [tListPTypeName]: tListType;
  }
}

const tListFreeVarsCollector = (
  recurse: (ty: PType) => Set<string>,
  ty: tListType
): Set<string> => recurse(ty.elem);

const tListTypeSubstitution = (
  recurse: (ty: PType, v: string, t0: PType) => PType,
  v: string,
  t0: PType,
  ty: tListType
): PType => tListConstructor({ elem: recurse(ty.elem, v, t0) });

const tListContainsVar = (
  recurse: (varName: string, ty: PType) => boolean,
  varName: string,
  ty: tListType
): boolean => recurse(varName, ty.elem);

const tListPrint = (recurse: (ty: PType) => string, ty: tListType): string =>
  `[${recurse(ty.elem)}]`;

export const tListPTypeImplementation = {
  [tListPTypeName]: {
    pTypeName: tListPTypeName,
    constructor: tListConstructor,
    freeVarsCollector: tListFreeVarsCollector,
    typeSubstitution: tListTypeSubstitution,
    containsVar: tListContainsVar,
    print: tListPrint,
  } as pTypeImplementation<tListType>,
};

export { tListConstructor };

