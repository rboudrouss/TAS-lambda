#!/usr/bin/env -S deno run --allow-read

import { print, evalToNormalForm } from "./eval.ts";
import { parseTerm } from "./parser.ts";
import { inferType, printType } from "./typechecker.ts";
import { resetRegionCounter } from "./pterm/mkref.ts";


console.log("\n1. lambda calcul de base\n");

demo("Identite : T0 -> T0", "λx.x", { eval: false });
demo("Application", "(λx.x) y");
demo("K : T0 -> T1 -> T0", "λx.λy.x", { eval: false });
demo("S : (T0 -> T1 -> T2) -> (T0 -> T1) -> T0 -> T2", "λx.λy.λz.(x z) (y z)", { eval: false });

console.log("\n2. let & polymorphisme\n");

demo("let id = λx.x : Forall T. T -> T", "let id = λx.x in id", { eval: false });
demo("id id : T -> T", "let id = λx.x in (id id)", { eval: false });
demo("id 42 : Int", "let id = λx.x in id 42", { eval: false });
demo("id (λx.x) : T -> T", "let id = λx.x in id (λx.x)", { eval: false });
demo("Utilisation polymorphe", "let id = λx.x in let a = id 1 in let b = id (λx.x) in a");

console.log("\n3. entiers et arithmetique\n");

demo("Int literal : Int", "42", { eval: false });
demo("add : Int -> Int -> Int", "add 1 2");
demo("sub : Int -> Int -> Int", "sub 10 3");
demo("Composition", "add (sub 10 3) (add 1 2)");

console.log("\n4. listes\n");

demo("nil : [T0] (polymorphe)", "nil", { eval: false });
demo("cons 1 nil : [Int]", "cons 1 nil", { eval: false });
demo("head : [T] -> T", "head (cons 1 nil)", { eval: false });
demo("tail : [T] -> [T]", "tail (cons 1 (cons 2 nil))", { eval: false });
demo("head (tail xs)", "head (tail (cons 1 (cons 2 nil)))");

console.log("\n5. conditionnelles\n");

demo("ifz : Int -> T -> T -> T", "ifz 0 then 1 else 2");
demo("ifz (branche else)", "ifz 5 then 1 else 2");
demo("ife : [T0] -> T1 -> T1 -> T1", "ife nil then 1 else 2");
demo("ife (branche else)", "ife (cons 1 nil) then 1 else 2");
demo("ifz retourne fonction", "ifz 0 then (λx.x) else (λy.y)", { eval: false });
demo("ife branches differentes types erreur", "ife nil then 1 else (λx.x)", { shouldFail: true });

console.log("\n6. point fixe et recursion\n");

demo("fix : (T -> T) -> T", "fix λf.λn.n", { eval: false });
demo("Somme 1..5 = 15", "(fix λf.λn.ifz n then 0 else (add n (f (sub n 1)))) 5");
demo("Longueur liste", "(fix λf.λxs.ife xs then 0 else (add 1 (f (tail xs)))) (cons 1 (cons 2 (cons 3 nil)))");
demo("Map double", "let double = λx.add x x in (fix λmap.λf.λxs.ife xs then nil else (cons (f (head xs)) (map f (tail xs)))) double (cons 1 (cons 2 (cons 3 nil)))");

console.log("\n7. traits imperatifs\n");

demo("() : Unit", "()", { eval: false });
demo("ref 42 : Ref(Int)", "ref 42", { eval: false });
demo("!(ref 42) : Int", "!(ref 42)");
demo(":= : Ref(T) -> T -> Unit", ":= (ref 0) 1", { eval: false });
demo("ref nil : Ref([T0])", "ref nil", { eval: false });
demo("Deref ref list", "!(ref (cons 1 nil))", { eval: false });

console.log("\n8. polymorphisme faible\n");

demo("KO: ref nil polymorphe", "let l = ref nil in let _ = (:= l (cons (λx.x) nil)) in (add (head (!l)) 2)", { shouldFail: true });
demo("OK: ref Int", "let r = ref 0 in let _ = (:= r 1) in !r");
demo("OK: valeur non-expansive", "let id = λx.x in let a = id 1 in let b = id (λy.y) in a");
demo("KO: Application expansive", "let f = (λx.ref x) nil in let _ = (:= f (cons 1 nil)) in let _ = (:= f (cons (λx.x) nil)) in head (!f)", { shouldFail: true });

console.log("\n9. erreurs de typage\n");

demo("add (λx.x) 1", "add (λx.x) 1", { shouldFail: true });
demo("1 2 (apply non-fonction)", "1 2", { shouldFail: true });
demo("head 42", "head 42", { shouldFail: true });
demo("tail (λx.x)", "tail (λx.x)", { shouldFail: true });
demo("cons 1 (cons (λx.x) nil)", "cons 1 (cons (λx.x) nil)", { shouldFail: true });
demo("ifz nil then 1 else 2", "ifz nil then 1 else 2", { shouldFail: true });
demo("ife 42 then 1 else 2", "ife 42 then 1 else 2", { shouldFail: true });
demo("ref mismatch", "let r = ref 1 in := r (λx.x)", { shouldFail: true });
demo("deref non-ref", "!42", { shouldFail: true });
demo("assign non-ref", ":= 1 2", { shouldFail: true });

console.log("\n10. types composes\n");

demo("Liste de fonctions : [T0 -> T0]", "cons (λx.x) nil", { eval: false });
demo("Fonction retournant liste", "λx.cons x nil", { eval: false });
demo("Ref de liste", "ref (cons 1 nil)", { eval: false });
demo("Liste de refs", "cons (ref 1) nil", { eval: false });
demo("Fonction polymorphe dans let", "let f = λx.λy.x in f", { eval: false });
demo("Composition de fonctions", "let compose = λf.λg.λx.f (g x) in compose", { eval: false });

function demo(description: string, term: string, options: { eval?: boolean; shouldFail?: boolean } = {}) {
  const { eval: shouldEval = true, shouldFail = false } = options;

  console.log(`\n${description}`);
  console.log(`  Input: ${term}`);

  const parsed = parseTerm(term);
  if (!parsed) {
    console.log(`  Parse error`);
    return;
  }

  console.log(`  Parsed: ${print(parsed)}`);

  const typeResult = inferType(parsed);
  if (typeResult.success) {
    console.log(`  Type: ${printType(typeResult.type)}`);
  } else {
    console.log(`  Type error: ${typeResult.error}`);
    if (shouldFail) {
      console.log(`  (Expected)`);
    }
    return;
  }

  if (shouldEval) {
    resetRegionCounter();
    const result = evalToNormalForm(parsed, new Map(), 1000);
    if (result) {
      console.log(`  Result: ${print(result)}`);
    } else {
      console.log(`  Evaluation error`);
    }
  }
}