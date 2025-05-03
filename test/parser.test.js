import { describe, it } from "node:test";
import assert from "node:assert/strict";
import parse from "../src/parser.js";

// Programs expected to be syntactically correct - keeping it very simple
const syntaxChecks = [
  ["simplest program", '🍽️ "Hello"'],
  ["multiple statements", '🍽️ "Hello"\n🍽️ "World"'],
  ["variable declaration", "🍳 a = 0\n🍳 b = 1\n🍳 f = 1"],
  ["simple assignment", "score = 95"],
  ["boolean literals", "engine_started = 🥗"],
  ["single line comment", '🍦 This is a comment\n🍽️ "Hello"'],
  ["multi-line comment", '🍨 This is a\nmulti-line comment 🍨\n🍽️ "Hello"'],
  ["simple binary expression", "🍳 result = 5 + 3"],
];

// Programs with syntax errors that the parser should detect
const syntaxErrors = [
  ["invalid emoji", "👻 = 5", /Line 1/],
  ["invalid if statement", 'if score >= 90:\n  🫗 "A"', /Line 1/],
  ["empty print statement", "🍽️", /Line 1/],
  ["invalid variable declaration", "🍳 = 10", /Line 1/],
];

describe("The SnackScript parser", () => {
  for (const [scenario, source] of syntaxChecks) {
    it(`successfully parses ${scenario}`, () => {
      const result = parse(source);
      assert(
        result.succeeded(),
        `Parse failed for "${scenario}": ${result.message || "Unknown error"}`
      );
    });
  }

  for (const [scenario, source, errorMessagePattern] of syntaxErrors) {
    it(`throws on ${scenario}`, () => {
      assert.throws(
        () => parse(source),
        errorMessagePattern,
        `Expected error for "${scenario}" but got success`
      );
    });
  }
});
