// The parse() function uses Ohm to produce a match object for a given
// source code program, using the grammar in the file SnackScript.ohm.

import * as fs from "node:fs";
import * as ohm from "ohm-js";

const grammar = ohm.grammar(fs.readFileSync("src/SnackScript.ohm"));

// Returns the Ohm match if successful, otherwise throws an error
export default function parse(sourceCode) {
  const match = grammar.match(sourceCode);
  if (match.failed()) {
    throw match.message;
  }
  return match;
}
