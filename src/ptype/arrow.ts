import type { pTypeImplementation, PType } from "../types.ts";

const arrowPTypeName = "Arrow" as const;

interface tArrowType {
  readonly type: typeof arrowPTypeName;
  readonly left: PType;
  readonly right: PType;
}

function arrowConstructor(arg: { left: PType; right: PType }): tArrowType {
  return { type: arrowPTypeName, left: arg.left, right: arg.right };
}

declare module "../types.ts" {
  interface PTypeRegistry {
    [arrowPTypeName]: tArrowType;
  }
}

const arrowFreeVarsCollector = (
  recurse: (ty: PType) => Set<string>,
  ty: tArrowType
): Set<string> => {
  const leftFreeVars = recurse(ty.left);
  const rightFreeVars = recurse(ty.right);
  return new Set([...leftFreeVars, ...rightFreeVars]);
};

const arrowTypeSubstitution = (
  recurse: (ty: PType, v: string, t0: PType) => PType,
  v: string,
  t0: PType,
  ty: tArrowType
): PType => {
  const newLeft = recurse(ty.left, v, t0);
  const newRight = recurse(ty.right, v, t0);
  return arrowConstructor({ left: newLeft, right: newRight });
};

const arrowContainsVar = (
  recurse: (varName: string, ty: PType) => boolean,
  varName: string,
  ty: tArrowType
): boolean => recurse(varName, ty.left) || recurse(varName, ty.right);

const arrowPrint = (recurse: (ty: PType) => string, ty: tArrowType): string =>
  `(${recurse(ty.left)} -> ${recurse(ty.right)})`;

export const arrowPTypeImplementation = {
  [arrowPTypeName]: {
    pTypeName: arrowPTypeName,
    constructor: arrowConstructor,
    freeVarsCollector: arrowFreeVarsCollector,
    typeSubstitution: arrowTypeSubstitution,
    containsVar: arrowContainsVar,
    print: arrowPrint,
  } as pTypeImplementation<tArrowType>,
};

export { arrowConstructor };
