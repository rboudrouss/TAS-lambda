import { C, F } from "@masala/parser";
import { generalPTerm } from "../general-types.ts";

// Definition

const absPTermName = "Abs" as const;

function absConstructor<GlobalPTerm extends generalPTerm>(arg: {
  name: string;
  body: GlobalPTerm;
}) {
  return {
    type: absPTermName,
    name: arg.name,
    body: arg.body,
  } satisfies generalPTerm;
}

type absPtermType<GlobalPTerm extends generalPTerm> = ReturnType<
  typeof absConstructor<GlobalPTerm>
>;

// Parser
