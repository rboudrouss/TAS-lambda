import type { PTerm, pTermImplementation, PTermRegistry } from "../types.ts";

// Import all pterm variant implementations
import { varPTermImplementation } from "./var.ts";
import { absPTermImplementation } from "./abs.ts";
import { appPTermImplementation } from "./app.ts";
import { letPTermImplementation } from "./let.ts";

// Collect all implementations
const registry: {
  [K in PTerm["type"]]: pTermImplementation<PTermRegistry[K]>;
} = {
  ...varPTermImplementation,
  ...absPTermImplementation,
  ...appPTermImplementation,
  ...letPTermImplementation,
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
