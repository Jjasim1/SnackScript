import { describe, it } from "node:test"
import assert from "node:assert/strict"
import parse from "../src/parser.js"
import analyze from "../src/analyzer.js"
import * as core from "../src/core.js"

function makeProgram(statements) {
  return { kind: "Program", statements }
}

function makeVarDecl(declarations) {
  return {
    kind: "vardecl",
    declarations: Array.isArray(declarations) ? declarations : [{ id: declarations }],
  }
}

function makeAssign(id, exp) {
  return { kind: "assign", id, exp }
}

function makeAddAssign(id, exp) {
  return { kind: "addassign", id, exp }
}

function makeBlock(statements) {
  return { kind: "Block", statements }
}

function makeFunction(id, params, block) {
  return {
    kind: "function",
    id,
    params: params
      ? {
          kind: "ParamsWithList",
          paramList: {
            kind: "NonEmptyParamList",
            items: params.map(p =>
              typeof p === "string" ? { id: p } : { id: p.id, ref: true }
            ),
          },
        }
      : { kind: "EmptyParams" },
    block,
  }
}

function makeSimpleFunction(id, block) {
  return { kind: "simplefunction", id, block }
}

function makeClass(id, block) {
  return { kind: "class", id, block }
}

function makeIfStatement(exp, block, elseifs = [], elsepart = null) {
  return {
    kind: "if",
    exp,
    block,
    elseifs,
    elsepart,
  }
}

function makeForLoop(init, block) {
  return { kind: "forloop", init, block }
}

function makeForEach(ids, id, block, egg = false) {
  return {
    kind: "foreach",
    ids,
    id,
    block,
    egg: egg ? { kind: "🥚" } : undefined,
  }
}

function makeReturnStatement(exp) {
  return { kind: "return", exp }
}

function makePrintStatement(expList) {
  return {
    kind: "print",
    expList: Array.isArray(expList) ? expList : [expList],
  }
}

function makeNumLiteral(value) {
  return { kind: "num", value: String(value) }
}

function makeStringLiteral(value) {
  return { kind: "string", value: `"${value}"` }
}

function makeBoolLiteral(value) {
  return { kind: "bool", value: value ? "🥗" : "🍲" }
}

function makeVarRef(id) {
  return { kind: "var", id }
}

function makeBinaryExp(left, op, right) {
  return { kind: "binary", left, op, right }
}

function makeCall(id, args = []) {
  return { kind: "call", id, args }
}

function makeCollection(id, collection) {
  return { kind: "collection", id, collection }
}

function makeArrayLiteral(items) {
  return {
    kind: "ArrayLit",
    items: items.map(item => {
      if (Array.isArray(item)) {
        return { kind: "TupleItem", exps: item }
      } else {
        return { kind: "SimpleItem", exp: item }
      }
    }),
  }
}

function makeDictLiteral(entries) {
  return {
    kind: "DictLit",
    items: entries.map(([key, value]) => ({
      key,
      value,
    })),
  }
}

function makeParenExp(exp) {
  return { kind: "paren", expression: exp }
}

function makeNegExp(operand) {
  return { kind: "neg", operand }
}

function makeElseIf(exp, block) {
  return {
    kind: "elseif",
    exp,
    block,
  }
}

function makeElse(block) {
  return {
    kind: "else",
    block,
  }
}

describe("The SnackScript analyzer", () => {
  // Variable declarations
  it("correctly analyzes variable declarations", () => {
    const source = "🍳 x = 1"
    const analyzed = analyze(parse(source))
    assert.deepEqual(analyzed.statements[0].variable.name, "x")
    assert.deepEqual(analyzed.statements[0].variable.type, "🍳")
    assert.deepEqual(analyzed.statements[0].initializer, 1)
  })

  // Functions
  it("correctly analyzes simple functions", () => {
    const source = `
      🥘 greet:
        🍽️ "Hello"
      ;`
    const analyzed = analyze(parse(source))
    assert.deepEqual(analyzed.statements[0].fun.name, "greet")
    assert.deepEqual(analyzed.statements[0].fun.params.length, 0)
  })

  it("correctly analyzes functions with parameters", () => {
    const source = `
      🥘 add(🍳 a, 🍳 b):
        🫗 a + b
      ;`
    const analyzed = analyze(parse(source))
    assert.deepEqual(analyzed.statements[0].fun.params.length, 2)
    assert.deepEqual(analyzed.statements[0].fun.name, "add")
    assert.deepEqual(analyzed.statements[0].fun.params[0].name, "a")
    assert.deepEqual(analyzed.statements[0].fun.params[1].name, "b")
  })

  // Collections
  it("correctly analyzes array collections", () => {
    const source = `
      🥡 numbers = [1, 2, 3]
    `
    const analyzed = analyze(parse(source))
    assert.deepEqual(analyzed.statements[0].variable.name, "numbers")
    assert.deepEqual(analyzed.statements[0].initializer.elements.length, 3)
    assert.equal(analyzed.statements[0].initializer.type.kind, "ArrayType")
  })

  it("correctly analyzes collections with tuples", () => {
    const source = `
      🥡 coords = [(10, 20), 30]
    `
    const analyzed = analyze(parse(source))
    assert.equal(analyzed.statements[0].initializer.elements[0].kind, "TupleExpression")
    assert.equal(analyzed.statements[0].initializer.elements[0].elements.length, 2)
  })

  // Assignment
  it("correctly analyzes assignments", () => {
    const source = `
      🍳 x = 1
      x = 42
    `
    const analyzed = analyze(parse(source))
    assert.equal(analyzed.statements[1].target.name, "x")
    assert.equal(analyzed.statements[1].source, 42)
  })

  it("correctly analyzes add-assignments", () => {
    const source = `
      🍳 x = 10
      x += 5
    `
    const analyzed = analyze(parse(source))
    assert.equal(analyzed.statements[1].target.name, "x")
    assert.equal(analyzed.statements[1].source, 5)
  })

  // Function calls
  it("correctly analyzes function calls", () => {
    const source = `
      🥘 greet(🍝 name):
        🍽️ name
      ;
      greet("World")
    `
    const analyzed = analyze(parse(source))
    assert.equal(analyzed.statements[1].callee.name, "greet")
    assert.equal(analyzed.statements[1].args.length, 1)
  })

  // Binary expressions
  it("correctly analyzes binary expressions", () => {
    const source = `
      🍳 result = 10 + 20
    `
    const analyzed = analyze(parse(source))
    assert.equal(analyzed.statements[0].initializer.op, "+")
    assert.equal(analyzed.statements[0].initializer.left, 10)
    assert.equal(analyzed.statements[0].initializer.right, 20)
  })

  // Semantic errors
  describe("detects semantic errors", () => {
    it("detects variable redeclaration", () => {
      const source = `
        🍳 x = 1
        🍳 x = 2
      `
      assert.throws(() => analyze(parse(source)), /already declared/)
    })

    it("detects use of undeclared variables", () => {
      const source = `
        x = 42
      `
      assert.throws(() => analyze(parse(source)), /not declared/)
    })

    it("detects return outside function", () => {
      const source = `
        🫗 42
      `
      assert.throws(() => analyze(parse(source)), /can only appear in a function/)
    })

    it("detects use of undefined collections", () => {
      const source = `
        🍥 x in numbers:
          🍽️ x
        ;
      `
      assert.throws(() => analyze(parse(source)), /not declared/)
    })
  })

  it("correctly analyzes floating-point literals", () => {
    const source = `
      🍳 pi = 3.14
    `
    const analyzed = analyze(parse(source))
    assert.equal(analyzed.statements[0].initializer, 3.14)
  })

  it("correctly analyzes expressions with floating-point values", () => {
    const source = `
      🍳 result = 3.5 + 2.7
    `
    const analyzed = analyze(parse(source))
    assert.equal(analyzed.statements[0].initializer.left, 3.5)
    assert.equal(analyzed.statements[0].initializer.right, 2.7)
  })

  it("correctly analyzes expressions with floating-point values", () => {
    const source = `
    🍳 result = 3.5 + 2.7
  `
    const analyzed = analyze(parse(source))
    assert.equal(analyzed.statements[0].initializer.left, 3.5)
    assert.equal(analyzed.statements[0].initializer.right, 2.7)
  })

  it("correctly analyzes boolean literals", () => {
    const source = `
    🧈 isActive = 🥗
    🧈 isDisabled = 🍲
  `
    const analyzed = analyze(parse(source))
    assert.equal(analyzed.statements[0].initializer, true)
    assert.equal(analyzed.statements[1].initializer, false)
  })

  it("correctly handles while loops", () => {
    const source = `
    🍳 counter = 0
    🍤 counter < 5:
      counter += 1
      🍽️ counter
    ;
  `
    const analyzed = analyze(parse(source))
    assert.equal(analyzed.statements[1].kind, "WhileStatement")
    assert.equal(analyzed.statements[1].test.op, "<")
  })

  it("correctly handles default values for expressions", () => {
    // Using a simple numeric value that should parse correctly
    const source = `🍚 x = 0`
    const analyzed = analyze(parse(source))

    // Check that we have a variable declaration with the right name
    assert.equal(analyzed.statements[0].variable.name, "x")

    // The initializer should be set to the number 0
    assert.equal(analyzed.statements[0].initializer, 0)
  })

  it("short return", () => {
    const source = `
    🥘 f:
      🧁 🥗:
        🫗
      ;
    ;
  `
    assert.ok(analyze(parse(source)))
  })

  it("long return", () => {
    const source = `
    🥘 f:
      🧁 🥗:
        🫗 🥗
      ;
    ;
  `
    assert.ok(analyze(parse(source)))
  })

  it("break in nested if", () => {
    const source = `
    🍤 🥗:
      🧁 🥗:
        🫖
      ;
    ;
  `
    assert.ok(analyze(parse(source)))
  })

  it("handles prints properly", () => {
    const source = `
    🍽️ "hi hello there"
  `
    assert.ok(analyze(parse(source)))
  })

  it("handles dicts properly", () => {
    const source = `
    🥡 student_scores = [ ("Annie", 91), ("Barbara", 58), ("Charlie", 49), ("Daniel", 51) ]
🥘 determine_grade(🍳 score):
  🧁 score >= 90:
    🫗 "A"
  ;
  🍰 score >= 80:
    🫗 "B"
  ;
  🍰 score >= 70:
    🫗 "C"
  ;
  🍰 score >= 60:
    🫗 "D"
  ;
  🎂:
    🫗 "F"
  ;
;
🍱 student_grades = {name: determine_grade(score) for name, score in student_scores}
  `
    assert.ok(analyze(parse(source)))
  })

  it("for in range", () => {
    const source = `
    🍥 i in 1 ..< 10:
      🍽️ i
    ;
  `
    assert.ok(analyze(parse(source)))
  })

  it("member exp", () => {
    const source = `
    🥡 list_of_grades = [("abby", 100), ("bella", 90)]
    🍱 grades = {name: score for name, score in list_of_grades}

    🍽️ grades.items
  `
    assert.ok(analyze(parse(source)))
  })

  it("built-in constants", () => {
    const source = "🍽️ π"
    assert.ok(analyze(parse(source)))
  })

  it("built-in sin", () => {
    const source = "🍽️ sin(25.0)"
    assert.ok(analyze(parse(source)))
  })

  it("built-in cos", () => {
    const source = "🍽️ cos(93.99)"
    assert.ok(analyze(parse(source)))
  })
  it("built-in hypot", () => {
    const source = "🍽️ hypot(4, 3.00001)"
    assert.ok(analyze(parse(source)))
  })
})
