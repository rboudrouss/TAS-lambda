import type { PType, pTypeImplementation, PTypeRegistry } from "../types.ts";

import { tVarPTypeImplementation } from "./var.ts";
import { arrowPTypeImplementation } from "./arrow.ts";
import { forallPTypeImplementation } from "./forall.ts";
import { tIntPTypeImplementation } from "./int.ts";
import { tListPTypeImplementation } from "./list.ts";
import { tUnitPTypeImplementation } from "./unit.ts";
import { tRefPTypeImplementation } from "./ref.ts";

const registry: {
  [K in PType["type"]]: pTypeImplementation<PTypeRegistry[K]>;
} = {
  ...tVarPTypeImplementation,
  ...arrowPTypeImplementation,
  ...forallPTypeImplementation,
  ...tIntPTypeImplementation,
  ...tListPTypeImplementation,
  ...tUnitPTypeImplementation,
  ...tRefPTypeImplementation,
} as const;

export function getTypeImpl<K extends PType["type"]>(
  ty: PType & { type: K }
): pTypeImplementation<PTypeRegistry[K]> {
  const impl = registry[ty.type as K];

  if (!impl) {
    // exhaustiveness check, if next line can be reached, typescript would've complained
    const _exhaustive: never = impl;
    throw new Error(`Unknown PType type: ${ty.type}`);
  }

  return impl;
}

export { registry };

export type { PType };
