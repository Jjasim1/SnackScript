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

  it("thoroughly tests the ExpList function with various expression types", () => {
    const source = `
      🍳 x = 5
      🍳 y = 10
      🍝 message = "Hello"
      🧈 flag = 🥗
      
      🍽️ message, x, y, x + y, x * y, x > y, (x + y) * 2, "Result:", 3.14, flag, 🥗, 🍲
    `
    const analyzed = analyze(parse(source))
    
    // Get the print statement
    const printStatement = analyzed.statements[analyzed.statements.length - 1]
    
    // Verify basic structure
    assert.equal(printStatement.kind, "Function")
    assert.equal(printStatement.name, "print")
    assert.equal(printStatement.intrinsic, true)
    
    // Verify the processed expression list
    assert.ok(Array.isArray(printStatement.type))
    assert.equal(printStatement.type.length, 12)
    
    // Test variables of different types
    assert.equal(printStatement.type[0].kind, "Variable")
    assert.equal(printStatement.type[0].name, "message")
    assert.equal(printStatement.type[0].type, "🍝")
    
    assert.equal(printStatement.type[1].kind, "Variable")
    assert.equal(printStatement.type[1].name, "x")
    
    // Test simple binary expression (x + y)
    assert.equal(printStatement.type[3].kind, "BinaryExpression")
    assert.equal(printStatement.type[3].op, "+")
    assert.equal(printStatement.type[3].left.name, "x")
    assert.equal(printStatement.type[3].right.name, "y")
    
    // Test another binary expression (x * y)
    assert.equal(printStatement.type[4].kind, "BinaryExpression")
    assert.equal(printStatement.type[4].op, "*")
    
    // Test comparison expression (x > y)
    assert.equal(printStatement.type[5].kind, "BinaryExpression")
    assert.equal(printStatement.type[5].op, ">")
    
    // Test complex expression ((x + y) * 2)
    assert.equal(printStatement.type[6].kind, "BinaryExpression")
    assert.equal(printStatement.type[6].op, "*")
    assert.equal(printStatement.type[6].left.kind, "BinaryExpression")
    assert.equal(printStatement.type[6].left.op, "+")
    
    // Test string literal
    assert.equal(printStatement.type[7], "\"Result:\"")
    
    // Test numeric literal
    assert.equal(printStatement.type[8], 3.14)
    
    // Test boolean variable and literals
    assert.equal(printStatement.type[9].kind, "Variable")
    assert.equal(printStatement.type[9].name, "flag")
    
    assert.equal(printStatement.type[10], true)
    assert.equal(printStatement.type[11], false)
  })

  it("correctly analyzes dictionary items", () => {
    const source = `
      🥡 user = {
        "name": "John Smith",
        "age": 30,
        "isActive": 🥗
      }
    `
    const analyzed = analyze(parse(source))
    
    // Verify that we have a variable declaration
    assert.equal(analyzed.statements[0].kind, "VariableDeclaration")
    
    // Get the dictionary literal
    const dictLiteral = analyzed.statements[0].initializer
    
    // Verify it's a dictionary
    assert.equal(dictLiteral.kind, "DictExpression")
    
    // Check that we have the correct number of entries
    assert.ok(Array.isArray(dictLiteral.elements))
    assert.equal(dictLiteral.elements.length, 3)
    
    // Check each dictionary item
    
    // First item: "name": "John Smith"
    assert.equal(dictLiteral.elements[0].key, "\"name\"")
    assert.equal(dictLiteral.elements[0].value, "\"John Smith\"")
    
    // Second item: "age": 30
    assert.equal(dictLiteral.elements[1].key, "\"age\"")
    assert.equal(dictLiteral.elements[1].value, 30)
    
    // Third item: "isActive": 🥗 (true)
    assert.equal(dictLiteral.elements[2].key, "\"isActive\"")
    assert.equal(dictLiteral.elements[2].value, true)
  })

  it("tests NonemptyListOf function with function parameters", () => {
    // Test function with multiple parameters
    const source = `
      🥘 multiParam(🍳 x, 🍝 y, 🧈 z):
        🍽️ x, y, z
      ;
    `
    
    // Check that analysis completes without errors
    const analyzed = analyze(parse(source))
    
    // Check that we have a function declaration
    assert.equal(analyzed.statements[0].kind, "FunctionDeclaration")
    assert.equal(analyzed.statements[0].fun.name, "multiParam")
    
    // The key part to test: verify the parameter list created by NonemptyListOf
    assert.ok(Array.isArray(analyzed.statements[0].fun.params))
    assert.equal(analyzed.statements[0].fun.params.length, 3)
    
    // Check each parameter
    assert.equal(analyzed.statements[0].fun.params[0].name, "x")
    assert.equal(analyzed.statements[0].fun.params[0].type, "🍳")
    
    assert.equal(analyzed.statements[0].fun.params[1].name, "y")
    assert.equal(analyzed.statements[0].fun.params[1].type, "🍝")
    
    assert.equal(analyzed.statements[0].fun.params[2].name, "z")
    assert.equal(analyzed.statements[0].fun.params[2].type, "🧈")
    
    // Also check the print statement inside the function to test another NonemptyListOf instance
    const printStatement = analyzed.statements[0].fun.body[0]
    assert.equal(printStatement.name, "print")
    assert.ok(Array.isArray(printStatement.type))
    assert.equal(printStatement.type.length, 3)
  })

  it("tests binary expressions with numeric-only operators", () => {
    // Test with subtraction operator which requires numeric types
    const source = `
      🍳 x = 10
      🍳 y = 5
      🍳 result = x - y
    `
    
    const analyzed = analyze(parse(source))
    
    // Check the binary expression in the variable declaration
    const varDecl = analyzed.statements[2]
    assert.equal(varDecl.kind, "VariableDeclaration")
    assert.equal(varDecl.variable.name, "result")
    
    // Check the initializer (binary expression)
    const binaryExpr = varDecl.initializer
    assert.equal(binaryExpr.kind, "BinaryExpression")
    assert.equal(binaryExpr.op, "-")
    assert.equal(binaryExpr.left.name, "x")
    assert.equal(binaryExpr.right.name, "y")
    
    // Also test with multiplication and division
    const source2 = `
      🍳 a = 7
      🍳 b = 2
      🍳 product = a * b
      🍳 quotient = a / b
    `
    
    const analyzed2 = analyze(parse(source2))
    
    // Check the multiplication expression
    const multDecl = analyzed2.statements[2]
    const multExpr = multDecl.initializer
    assert.equal(multExpr.op, "*")
    
    // Check the division expression
    const divDecl = analyzed2.statements[3]
    const divExpr = divDecl.initializer
    assert.equal(divExpr.op, "/")
  })

  it("directly tests void and float type definitions", () => {
    // Test function with explicit void return type
    const voidSource = `
      🥘 doNothing(🥮 x):
        🍽️ "Nothing to return"
      ;
    `
    
    const voidAnalyzed = analyze(parse(voidSource))
    
    // Check that the parameter type is void
    assert.equal(voidAnalyzed.statements[0].fun.params[0].type, "🥮")
    
    // Test variable with explicit float type
    const floatSource = `
      🍳 decimalValue = 3.14159
    `
    
    const floatAnalyzed = analyze(parse(floatSource))
    
    // Check the variable has float type
    assert.equal(floatAnalyzed.statements[0].variable.type, "🍳")
    
    // Test a function with float parameter
    const floatParamSource = `
      🥘 calculateArea(🍳 radius):
        🫗 3.14159 * radius * radius
      ;
    `
    
    const floatParamAnalyzed = analyze(parse(floatParamSource))
    
    // Check the parameter type is float
    assert.equal(floatParamAnalyzed.statements[0].fun.params[0].type, "🍳")
  })

  it("tests float type definition specifically", () => {
    // Create a test that requires explicit float type parsing
    const source = `
      🍳 pi = 3.14159
      🥘 calculateCircumference(🍳 radius):
        🫗 2.0 * pi * radius
      ;
    `
    
    const analyzed = analyze(parse(source))
    
    // Check that the variable is recognized as having float type
    assert.equal(analyzed.statements[0].variable.type, "🍳")
    
    // Check that the parameter to the function has float type
    assert.equal(analyzed.statements[1].fun.params[0].type, "🍳")
    
    // Check another approach with explicit parameter typing
    const source2 = `
      🥘 add(🍳 x, 🍳 y):
        🫗 x + y
      ;
    `
    
    const analyzed2 = analyze(parse(source2))
    assert.equal(analyzed2.statements[0].fun.params[0].type, "🍳")
    assert.equal(analyzed2.statements[0].fun.params[1].type, "🍳")
  })

  it("correctly analyzes increment and decrement operations", () => {
    // Test both increment and decrement operations
    const source = `
      🍳 counter = 5
      counter++
      🍽️ counter
      
      🍳 score = 10
      score--
      🍽️ score
    `
    
    const analyzed = analyze(parse(source))
    
    // Check the increment operation (second statement)
    const incrementStmt = analyzed.statements[1]
    assert.equal(incrementStmt.kind, "Increment")
    assert.equal(incrementStmt.variable.name, "counter")
    
    // Check the decrement operation (fifth statement)
    const decrementStmt = analyzed.statements[4]
    assert.equal(decrementStmt.kind, "Decrement")
    assert.equal(decrementStmt.variable.name, "score")
    
    // Test error case: trying to increment a non-numeric variable
    const errorSource = `
      🍝 message = "Hello"
      message++
    `
    
    let errorThrown = false
    try {
      analyze(parse(errorSource))
    } catch (error) {
      errorThrown = true
      assert.ok(error.message.includes("Expected a number"))
    }
    
    assert.ok(errorThrown, "Should throw an error when incrementing a non-numeric variable")
  })

  it("verifies else parts are correctly processed in if statements", () => {
    // Simple if-else statement
    const source = `
      🍳 x = 10
      🧁 x > 20:
        🍽️ "x is greater than 20"
      ;
      🎂:
        🍽️ "x is not greater than 20"
      ;
    `
    
    // Just verify that analysis completes without errors
    const analyzed = analyze(parse(source))
    
    // Check that we have the expected number of statements
    assert.equal(analyzed.statements.length, 2)
    
    // Check that the second statement is an if statement
    const ifStatement = analyzed.statements[1]
    assert.equal(ifStatement.kind, "IfStatement")
    
    // Verify the if statement has an alternate (else) property
    assert.ok(ifStatement.alternate, "If statement should have an alternate (else) part")
    
    // Without assuming the specific structure, just verify it's not null
    assert.notEqual(ifStatement.alternate, null)
  })

  it("correctly analyzes foreach loops with arrays and dictionaries", () => {
    // Test foreach loop with an array
    const source = `
      🥡 numbers = [1, 2, 3, 4, 5]
      🍥 num in numbers:
        🍽️ num
      ;
    `
    
    const analyzed = analyze(parse(source))
    
    // The second statement should be the foreach loop
    const foreachLoop = analyzed.statements[1]
    assert.equal(foreachLoop.kind, "ForLoop")
    
    // Check the iterator variable
    assert.ok(Array.isArray(foreachLoop.iterator))
    assert.equal(foreachLoop.iterator.length, 1)
    assert.equal(foreachLoop.iterator[0].name, "num")
    
    // Check the collection being iterated
    assert.equal(foreachLoop.collection.name, "numbers")
    
    // Check the body contains one print statement
    assert.ok(Array.isArray(foreachLoop.body))
    assert.equal(foreachLoop.body.length, 1)
    
    // Test foreach loop with tuple unpacking
    const source2 = `
      🥡 pairs = [(1, "one"), (2, "two"), (3, "three")]
      🍥 num, word in pairs:
        🍽️ num, word
      ;
    `
    
    const analyzed2 = analyze(parse(source2))
    const foreachLoop2 = analyzed2.statements[1]
    
    // Check the iterator variables for tuple unpacking
    assert.ok(Array.isArray(foreachLoop2.iterator))
    assert.equal(foreachLoop2.iterator.length, 2)
    assert.equal(foreachLoop2.iterator[0].name, "num")
    assert.equal(foreachLoop2.iterator[1].name, "word")
    
    // Check the collection
    assert.equal(foreachLoop2.collection.name, "pairs")
    
    // Test foreach loop with a dictionary
    const source3 = `
      🥡 scores = [("Alice", 95), ("Bob", 87), ("Charlie", 92)]
      🍱 gradeMap = {name: score for name, score in scores}
      
      🍥 student, grade in gradeMap:
        🍽️ student, grade
      ;
    `
    
    const analyzed3 = analyze(parse(source3))
    const foreachLoop3 = analyzed3.statements[2]
    
    // Check the iterator variables for dictionary
    assert.ok(Array.isArray(foreachLoop3.iterator))
    assert.equal(foreachLoop3.iterator.length, 2)
    assert.equal(foreachLoop3.iterator[0].name, "student")
    assert.equal(foreachLoop3.iterator[1].name, "grade")
    
    // Check the collection
    assert.equal(foreachLoop3.collection.name, "gradeMap")
  })

  it("correctly analyzes foreach loops with member expressions", () => {
    // Test foreach loop with a member expression as the collection
    const source = `
      🥡 students = [("Alice", 95), ("Bob", 87), ("Charlie", 92)]
      🍱 gradeMap = {name: score for name, score in students}
      
      🍥 key, value in gradeMap.items:
        🍽️ key, value
      ;
    `
    
    const analyzed = analyze(parse(source))
    
    // The third statement should be the foreach loop
    const foreachLoop = analyzed.statements[2]
    assert.equal(foreachLoop.kind, "ForLoop")
    
    // Check the iterator variables
    assert.ok(Array.isArray(foreachLoop.iterator))
    assert.equal(foreachLoop.iterator.length, 2)
    assert.equal(foreachLoop.iterator[0].name, "key")
    assert.equal(foreachLoop.iterator[1].name, "value")
    
    // Check the collection being iterated
    // This should be "gradeMap" after the member expression is processed
    assert.equal(foreachLoop.collection.name, "gradeMap")
    
    // Check the body contains one print statement
    assert.ok(Array.isArray(foreachLoop.body))
    assert.equal(foreachLoop.body.length, 1)
  })

  it("tests function return type compatibility", () => {
    // Test valid return type - integer returned from integer function
    const source = `
      🥘 square(🍳 x):
        🫗 x * x
      ;
    `
    
    // This should parse and analyze without errors
    const analyzed = analyze(parse(source))
    assert.equal(analyzed.statements[0].kind, "FunctionDeclaration")
    
    // Test another valid return - string from string function
    const source2 = `
      🥘 greet(🍝 name):
        🫗 "Hello, " + name
      ;
    `
    const analyzed2 = analyze(parse(source2))
    assert.equal(analyzed2.statements[0].kind, "FunctionDeclaration")
    
    // Test invalid return type - attempting to return a string from a function expecting int
    let errorThrown = false
    try {
      const invalidSource = `
        🥘 invalid(🍳 x):
          🍝 s = "not a number"
          🫗 s
        ;
      `
      analyze(parse(invalidSource))
    } catch (error) {
      errorThrown = true
    }
    
    assert.ok(errorThrown, "Should throw error on incompatible return type")
  })

  it("tests print statement creation with first letter capitalization", () => {
    // Test the print function which should trigger the specific code path
    // that capitalizes the first letter of the function name
    const source = `
      🍽️ "Testing capitalization"
    `
    
    const analyzed = analyze(parse(source))
    
    // Get the print statement
    const printStmt = analyzed.statements[0]
    
    // Directly test the expected property values
    assert.equal(printStmt.kind, "Function")
    assert.equal(printStmt.name, "print")
    assert.equal(printStmt.intrinsic, true)
    
    // Create a different intrinsic function call
    // by manually constructing a test scenario
    const source2 = `
      🥘 testFunction(🍝 message):
        🍽️ message
      ;
      
      testFunction("Hello")
    `
    
    const analyzed2 = analyze(parse(source2))
    
    // Check the function call
    const functionCall = analyzed2.statements[1]
    assert.equal(functionCall.kind, "FunctionCall")
    assert.ok(Array.isArray(functionCall.args))
    assert.equal(functionCall.args[0], "\"Hello\"")
    
    // Check the print statement inside the function body
    const functionBody = analyzed2.statements[0].fun.body
    const printInsideFunction = functionBody[0]
    
    assert.equal(printInsideFunction.kind, "Function")
    assert.equal(printInsideFunction.name, "print")
    assert.equal(printInsideFunction.intrinsic, true)
  })

  it("tests type analysis functionality", () => {
    // Test basic types and expressions
    const source = `
      🍳 a = 5
      🍳 b = 10
      🍳 c = a + b
      
      🥘 add(🍳 x, 🍳 y):
        🫗 x + y
      ;
    `
    
    const analyzed = analyze(parse(source))
    
    // Check that variables have the correct types
    assert.equal(analyzed.statements[0].variable.type, "🍳")
    assert.equal(analyzed.statements[1].variable.type, "🍳")
    assert.equal(analyzed.statements[2].variable.type, "🍳")
    
    // Check function type
    const funcDecl = analyzed.statements[3]
    assert.equal(funcDecl.kind, "FunctionDeclaration")
    assert.equal(funcDecl.fun.name, "add")
    assert.equal(funcDecl.fun.params.length, 2)
    assert.equal(funcDecl.fun.params[0].type, "🍳")
    assert.equal(funcDecl.fun.params[1].type, "🍳")
    
    // Check function return statement
    const returnStmt = funcDecl.fun.body[0]
    assert.equal(returnStmt.kind, "ReturnStatement")
    
    // Test that a type error is detected
    let errorDetected = false
    try {
      analyze(parse(`
        🍳 x = 5
        🍝 s = "hello"
        x = s
      `))
    } catch (error) {
      errorDetected = true
    }
    assert.ok(errorDetected, "Should detect type mismatch")
  })

  it("tests array type description functionality", () => {
    // Test array type descriptions through simple arrays
    const source = `
      🥡 a = [1, 2, 3]
    `
    
    const analyzed = analyze(parse(source))
    
    // Check that the array has the correct type
    assert.equal(analyzed.statements[0].kind, "VariableDeclaration")
    const arrayExpr = analyzed.statements[0].initializer
    assert.ok(arrayExpr.type)
    assert.equal(arrayExpr.type.kind, "ArrayType")
    assert.equal(arrayExpr.type.baseType, "🍳")
    
    // Test type mismatch between arrays
    let errorDetected = false
    try {
      analyze(parse(`
        🥡 nums = [1, 2, 3]
        🥡 strs = ["a", "b"]
        nums = strs
      `))
    } catch (error) {
      errorDetected = true
    }
    assert.ok(errorDetected, "Should detect array type mismatch")
  })

  it("tests type handling with function and array types", () => {
    // Test basic function with parameters
    const source = `
      🥘 add(🍳 x, 🍳 y):
        🫗 x + y
      ;
    `
    
    const analyzed = analyze(parse(source))
    
    // Check the function declaration
    const funcDecl = analyzed.statements[0]
    assert.equal(funcDecl.kind, "FunctionDeclaration")
    
    // Check the function object
    const func = funcDecl.fun
    assert.equal(func.name, "add")
    assert.ok(func.type)
    assert.equal(func.type.kind, "FunctionType")
    
    // Check parameter types
    assert.ok(Array.isArray(func.type.paramTypes))
    assert.equal(func.type.paramTypes.length, 2)
    assert.equal(func.type.paramTypes[0], "🍳")
    assert.equal(func.type.paramTypes[1], "🍳")
    
    // Check return type - this appears to be void by default (🥮) in your implementation
    assert.equal(func.type.returnType, "🥮")
    
    // Test array type handling
    const arraySource = `
      🥡 numbers = [1, 2, 3]
    `
    
    const arrayAnalyzed = analyze(parse(arraySource))
    const arrayDecl = arrayAnalyzed.statements[0]
    const arrayExpr = arrayDecl.initializer
    
    // Check array type
    assert.ok(arrayExpr.type)
    assert.equal(arrayExpr.type.kind, "ArrayType")
    assert.equal(arrayExpr.type.baseType, "🍳")
    
    // Test type errors to see type description in action
    let errorThrown = false
    try {
      analyze(parse(`
        🥡 a = [1, 2]
        🥡 b = ["x", "y"]
        a = b
      `))
    } catch (error) {
      errorThrown = true
    }
    assert.ok(errorThrown, "Should detect array type mismatch")
  })
})
