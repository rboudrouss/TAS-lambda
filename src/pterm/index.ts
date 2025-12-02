import type { PTerm, pTermImplementation, PTermRegistry } from "../types.ts";

// Import all pterm variant implementations
import { varPTermImplementation } from "./var.ts";
import { absPTermImplementation } from "./abs.ts";
import { appPTermImplementation } from "./app.ts";
import { letPTermImplementation } from "./let.ts";
import { intPTermImplementation } from "./int.ts";
import { nilPTermImplementation } from "./nil.ts";
import { addPTermImplementation } from "./add.ts";
import { subPTermImplementation } from "./sub.ts";
import { headPTermImplementation } from "./head.ts";
import { tailPTermImplementation } from "./tail.ts";
import { consPTermImplementation } from "./cons.ts";
import { iztePTermImplementation } from "./izte.ts";
import { ietePTermImplementation } from "./iete.ts";
import { fixPTermImplementation } from "./fix.ts";
import { unitPTermImplementation } from "./unit.ts";
import { regionPTermImplementation } from "./region.ts";
import { derefPTermImplementation } from "./deref.ts";
import { mkrefPTermImplementation } from "./mkref.ts";
import { assignPTermImplementation } from "./assign.ts";

// Collect all implementations
const registry: {
  [K in PTerm["type"]]: pTermImplementation<PTermRegistry[K]>;
} = {
  ...varPTermImplementation,
  ...absPTermImplementation,
  ...appPTermImplementation,
  ...letPTermImplementation,
  ...intPTermImplementation,
  ...nilPTermImplementation,
  ...addPTermImplementation,
  ...subPTermImplementation,
  ...headPTermImplementation,
  ...tailPTermImplementation,
  ...consPTermImplementation,
  ...iztePTermImplementation,
  ...ietePTermImplementation,
  ...fixPTermImplementation,
  ...unitPTermImplementation,
  ...regionPTermImplementation,
  ...derefPTermImplementation,
  ...mkrefPTermImplementation,
  ...assignPTermImplementation,
} as const;

export function getImpl<K extends PTerm["type"]>(
  t: PTerm & { type: K }
): pTermImplementation<PTermRegistry[K]> {
  const impl = registry[t.type as K];

  if (!impl) {
    // exhaustiveness check, if next line can be reached, typescript would've complained
    const _exhaustive: never = impl;
    throw new Error(`Unknown PTerm type: ${t.type}`);
  }

  return impl;
}

export { registry };

export type { PTerm };
