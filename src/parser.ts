import { SingleParser, F, C, Stream } from "@masala/parser";
import { type PTerm, registry } from "./pterm/index.ts";

function atomParser(): SingleParser<PTerm> {
  return F.try(
    C.char("(")
      .drop()
      .then(F.lazy(termParser))
      .then(C.char(")").drop())
      .map((tuple) => tuple.at(0) as PTerm)
  )
    .or(F.try(registry.Let.parser(F.lazy(termParser))))
    .or(F.try(registry.Abs.parser(F.lazy(termParser))))
    .or(registry.Var.parser(F.lazy(termParser)));
}

export function termParser(): SingleParser<PTerm> {
  return F.lazy(atomParser)
    .then(C.char(" ").rep().drop().then(F.lazy(atomParser)).optrep())
    .map((tuple) => {
      const first = tuple.at(0) as PTerm;
      const rest = tuple.array() as PTerm[];

      const restTerms = rest.slice(1);

      if (restTerms.length === 0) {
        return first;
      }

      // Left-fold to create left-associative application
      return restTerms.reduce(
        (acc, arg) => registry.App.constructor({ left: acc, right: arg }),
        first
      );
    });
}

export function parseTerm(input: string): PTerm | null {
  const result = termParser().parse(Stream.ofChars(input.trim()));
  if (result.isAccepted()) {
    return result.value;
  }
  return null;
}
