import type { PType, pTypeImplementation, PTypeRegistry } from "../types.ts";

// Import all ptype variant implementations
import { tVarPTypeImplementation } from "./var.ts";
import { arrowPTypeImplementation } from "./arrow.ts";

// Collect all implementations
const registry: {
  [K in PType["type"]]: pTypeImplementation<PTypeRegistry[K]>;
} = {
  ...tVarPTypeImplementation,
  ...arrowPTypeImplementation,
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
