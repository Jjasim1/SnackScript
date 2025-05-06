import { describe, it } from "node:test"
import assert from "node:assert/strict"
import optimize from "../src/optimizer.js"
import * as core from "../src/core.js"

// Make some test cases easier to read
const i = core.variable("x", true, core.intType)
const x = core.variable("x", true, core.floatType)
const a = core.variable("a", true, core.arrayType(core.intType))
const xpp = core.increment(x)
const xmm = core.decrement(x)
const return1p1 = core.returnStatement(core.binary("+", 1, 1, core.intType))
const return2 = core.returnStatement(2)
const returnX = core.returnStatement(x)
const onePlusTwo = core.binary("+", 1, 2, core.intType)
const aParam = core.variable("a", false, core.anyType)
const anyToAny = core.functionType([core.anyType], core.anyType)
const identity = Object.assign(core.fun("id", [aParam], [returnX], anyToAny))
const voidInt = core.functionType([], core.intType)
const intFun = body => core.fun("f", [], body, voidInt)
const intFunDecl = body => core.functionDeclaration(intFun(body))
const callIdentity = args => core.functionCall(identity, args)
const or = (...d) => d.reduce((x, y) => core.binary("||", x, y))
const and = (...c) => c.reduce((x, y) => core.binary("&&", x, y))
const less = (x, y) => core.binary("<", x, y)
const eq = (x, y) => core.binary("==", x, y)
const times = (x, y) => core.binary("*", x, y)
const neg = x => core.unary("-", x)
const array = (...elements) => core.arrayExpression(elements)
const assign = (v, e) => core.assignment(v, e)
const emptyArray = core.emptyArray(core.intType)
const sub = (a, e) => core.subscript(a, e)
const unwrapElse = (o, e) => core.binary("??", o, e)
const emptyOptional = core.emptyOptional(core.intType)
const some = x => core.unary("some", x)
const program = core.program

const tests = [
  ["folds +", core.binary("+", 5, 8), 13],
  ["folds -", core.binary("-", 5n, 8n), -3n],
  ["folds *", core.binary("*", 5, 8), 40],
  ["folds /", core.binary("/", 5, 8), 0.625],
  ["folds **", core.binary("**", 5, 8), 390625],
  ["folds <", core.binary("<", 5, 8), true],
  ["folds <=", core.binary("<=", 5, 8), true],
  ["folds ==", core.binary("==", 5, 8), false],
  ["folds !=", core.binary("!=", 5, 8), true],
  ["folds >=", core.binary(">=", 5, 8), false],
  ["folds >", core.binary(">", 5, 8), false],
  ["optimizes +0", core.binary("+", x, 0), x],
  ["optimizes -0", core.binary("-", x, 0), x],
  ["optimizes *1 for ints", core.binary("*", i, 1), i],
  ["optimizes *1 for floats", core.binary("*", x, 1), x],
  ["optimizes /1", core.binary("/", x, 1), x],
  ["optimizes *0", core.binary("*", x, 0), 0],
  ["optimizes 0*", core.binary("*", 0, x), 0],
  ["optimizes 0/", core.binary("/", 0, x), 0],
  ["optimizes 0+ for floats", core.binary("+", 0, x), x],
  ["optimizes 0+ for ints", core.binary("+", 0n, i), i],
  ["optimizes 0-", core.binary("-", 0, x), neg(x)],
  ["optimizes 1*", core.binary("*", 1, x), x],
  ["folds negation", core.unary("-", 8), -8],
  ["optimizes 1** for ints", core.binary("**", 1n, i), 1n],
  ["optimizes 1** for floats", core.binary("**", 1n, x), 1n],
  ["optimizes **0", core.binary("**", x, 0), 1],
  ["removes left false from ||", or(false, less(x, 1)), less(x, 1)],
  ["removes right false from ||", or(less(x, 1), false), less(x, 1)],
  ["removes left true from &&", and(true, less(x, 1)), less(x, 1)],
  ["removes right true from &&", and(less(x, 1), true), less(x, 1)],
  ["removes x=x at beginning", program([core.assignment(x, x), xpp]), program([xpp])],
  ["removes x=x at end", program([xpp, core.assignment(x, x)]), program([xpp])],
  ["removes x=x in middle", program([xpp, assign(x, x), xpp]), program([xpp, xpp])],
  ["optimizes if-true", core.ifStatement(true, [xpp], []), [xpp]],
  ["optimizes if-false", core.ifStatement(false, [], [xpp]), [xpp]],
  ["optimizes short-if-true", core.shortIfStatement(true, [xmm]), [xmm]],
  ["optimizes short-if-false", core.shortIfStatement(false, [xpp]), []],
  ["optimizes while-false", program([core.whileStatement(false, [xpp])]), program([])],
  ["optimizes repeat-0", program([core.repeatStatement(0, [xpp])]), program([])],
  ["optimizes for-range", core.forRangeStatement(x, 5, "...", 3, [xpp]), []],
  ["optimizes for-empty-array", core.forStatement(x, emptyArray, [xpp]), []],
  ["applies if-false after folding", core.shortIfStatement(eq(1, 1), [xpp]), [xpp]],
  ["optimizes away nil", unwrapElse(emptyOptional, 3), 3],
  ["optimizes left conditional true", core.conditional(true, 55, 89), 55],
  ["optimizes left conditional false", core.conditional(false, 55, 89), 89],
  [
    "optimizes in functions",
    program([intFunDecl([return1p1])]),
    program([intFunDecl([return2])]),
  ],
  ["optimizes in subscripts", sub(a, onePlusTwo), sub(a, 3)],
  ["optimizes in array literals", array(0, onePlusTwo, 9), array(0, 3, 9)],
  ["optimizes in arguments", callIdentity([times(3, 5)]), callIdentity([15])],
  [
    "passes through nonoptimizable constructs",
    ...Array(2).fill([
      core.program([core.shortReturnStatement]),
      core.variableDeclaration("x", true, "z"),
      core.typeDeclaration([core.field("x", core.intType)]),
      core.assignment(x, core.binary("*", x, "z")),
      core.assignment(x, core.unary("not", x)),
      core.constructorCall(identity, core.memberExpression(x, ".", "f")),
      core.variableDeclaration("q", false, core.emptyArray(core.floatType)),
      core.variableDeclaration("r", false, core.emptyOptional(core.intType)),
      core.whileStatement(true, [core.breakStatement]),
      core.repeatStatement(5, [core.returnStatement(1)]),
      core.conditional(x, 1, 2),
      unwrapElse(some(x), 7),
      core.ifStatement(x, [], []),
      core.shortIfStatement(x, []),
      core.forRangeStatement(x, 2, "..<", 5, []),
      core.forStatement(x, array(1, 2, 3), []),
    ]),
  ],
]

describe("Print statement optimizer", () => {
  it("optimizes expressions inside print statements", () => {
    // Create a print statement with a binary expression that can be optimized
    const printWithBinaryExp = core.print([core.binary("+", 5, 8)]);
    
    // Expected: The binary expression should be folded to 13
    const expected = core.print([13]);
    
    // Test the optimization
    const optimized = optimize(printWithBinaryExp);
    
    // Check that the result is as expected
    assert.deepEqual(optimized, expected, 
      "Should optimize binary expressions in print statements");
  });
  
  it("preserves the print structure", () => {
    // Create a print statement with a variable
    const x = core.variable("x", core.floatType);
    const printWithVar = core.print([x]);
    
    // Expected: The structure should be preserved
    const expected = core.print([x]);
    
    // Test the optimization
    const optimized = optimize(printWithVar);
    
    // Check that the result is as expected
    assert.deepEqual(optimized, expected,
      "Should preserve the print structure when no optimization is possible");
  });
  
  it("optimizes multiple expressions in a print statement", () => {
    // Create a print statement with multiple expressions
    const printWithMultiple = core.print([
      core.binary("+", 1, 2),
      core.binary("*", 3, 4)
    ]);
    
    // Expected: Both expressions should be optimized
    const expected = core.print([3, 12]);
    
    // Test the optimization
    const optimized = optimize(printWithMultiple);
    
    // Check that the result is as expected
    assert.deepEqual(optimized, expected,
      "Should optimize all expressions in a print statement");
  });
});

describe("ConstructorCall optimizer", () => {
  it("optimizes arguments in constructor calls", () => {
    // Create a simpler callee for the constructor
    const structType = { 
      kind: "StructType", // Make sure it has a kind
      name: "MyStruct",
      fields: [
        { kind: "Field", name: "x", type: core.intType },
        { kind: "Field", name: "y", type: core.intType }
      ],
      type: { kind: "Type" } // Make sure it has a type
    };
    
    // Create a constructor call with expressions that can be optimized
    const constructorWithBinaryExp = core.constructorCall(
      structType,
      [core.binary("+", 2, 3), core.binary("*", 4, 5)]
    );
    
    // Expected: The binary expressions should be folded
    const expected = core.constructorCall(
      structType,
      [5, 20]
    );
    
    // Test the optimization
    const optimized = optimize(constructorWithBinaryExp);
    
    // Check that the result is as expected
    assert.deepEqual(optimized, expected, 
      "Should optimize arguments in constructor calls");
  });
});

describe("MemberExpression optimizer", () => {
  it("optimizes the object in member expressions", () => {
    // Create a binary expression that can be optimized
    const binaryExpr = core.binary("+", 3, 4);
    
    // Create a member expression with this binary expression as the object
    const memberExprWithBinary = {
      kind: "MemberExpression",
      object: binaryExpr,
      op: ".",
      field: "x"
    };
    
    // Expected: The binary expression should be folded to 7
    const expected = {
      kind: "MemberExpression",
      object: 7,
      op: ".",
      field: "x"
    };
    
    // Test the optimization
    const optimized = optimize(memberExprWithBinary);
    
    // Check that the result is as expected
    assert.deepEqual(optimized, expected, 
      "Should optimize the object in member expressions");
  });
  
  it("preserves member expressions with non-optimizable objects", () => {
    // Create a variable to use as the object
    const x = core.variable("x", { kind: "ObjectType" });
    
    // Create a member expression with this variable
    const memberExprWithVar = {
      kind: "MemberExpression",
      object: x,
      op: ".",
      field: "property"
    };
    
    // Expected: The structure should be preserved
    const expected = memberExprWithVar;
    
    // Test the optimization
    const optimized = optimize(memberExprWithVar);
    
    // Check that the result is as expected
    assert.deepEqual(optimized, expected,
      "Should preserve member expressions when the object cannot be optimized");
  });
  
  it("handles nested member expressions", () => {
    // Create a nested member expression with an optimizable part
    const inner = {
      kind: "MemberExpression",
      object: core.binary("*", 2, 3),
      op: ".",
      field: "inner"
    };
    
    const outer = {
      kind: "MemberExpression",
      object: inner,
      op: ".",
      field: "outer"
    };
    
    // Expected: The inner binary expression should be optimized
    const expected = {
      kind: "MemberExpression",
      object: {
        kind: "MemberExpression",
        object: 6,
        op: ".",
        field: "inner"
      },
      op: ".",
      field: "outer"
    };
    
    // Test the optimization
    const optimized = optimize(outer);
    
    // Check that the result is as expected
    assert.deepEqual(optimized, expected,
      "Should handle nested member expressions correctly");
  });
});

describe("UnaryExpression optimizer", () => {
  it("preserves unary expressions with non-number operands", () => {
    // Create a variable to use as the operand
    const x = core.variable("x", core.floatType);
    
    // Create a unary expression with this variable
    const unaryWithVar = core.unary("-", x);
    
    // Expected: The structure should be preserved
    const expected = unaryWithVar;
    
    // Test the optimization
    const optimized = optimize(unaryWithVar);
    
    // Check that the result is as expected
    assert.deepEqual(optimized, expected,
      "Should preserve unary expressions when the operand is not a number");
  });
});

describe("Conditional optimizer", () => {
  it("preserves conditionals with non-boolean tests", () => {
    // Create a variable to use as the test
    const x = core.variable("x", core.booleanType);
    
    // Create a conditional with this variable as the test
    const conditionalWithVar = core.conditional(
      x,
      10,
      20
    );
    
    // Expected: The structure should be preserved, but sub-expressions optimized
    const expected = core.conditional(
      x,
      10,
      20
    );
    
    // Test the optimization
    const optimized = optimize(conditionalWithVar);
    
    // Check that the result is as expected
    assert.deepEqual(optimized, expected,
      "Should preserve conditionals when the test is not a boolean literal");
  });
});

describe("ForStatement optimizer", () => {
  it("optimizes the body statements in for-loops", () => {
    // Create a for loop with body statements that can be optimized
    const loopWithOptimizableBody = core.forStatement(
      core.variable("i", core.intType),
      core.arrayExpression([1, 2, 3]),
      [
        core.print([core.binary("+", 1, 2)]),
        core.assignment(
          core.variable("x", core.intType),
          core.binary("*", 3, 4)
        )
      ]
    );
    
    // Expected: The body statements should be optimized
    const expected = core.forStatement(
      core.variable("i", core.intType),
      core.arrayExpression([1, 2, 3]),
      [
        core.print([3]),
        core.assignment(
          core.variable("x", core.intType),
          12
        )
      ]
    );
    
    // Test the optimization
    const optimized = optimize(loopWithOptimizableBody);
    
    // Check that the result is as expected
    assert.deepEqual(optimized, expected,
      "Should optimize the body statements in for-loops");
  });
});

describe("RepeatStatement optimizer", () => {
  it("optimizes body statements while preserving structure", () => {
    // Create a repeat statement with a non-zero count
    // and body statements that contain definite optimizable parts
    const repeatWithOptimizableBody = core.repeatStatement(
      5, // Non-zero count to avoid the optimization to []
      [
        // Use a more obviously optimizable expression
        core.print([core.binary("+", 100, 200)]), // This should definitely become 300
        
        // Another statement with a clear optimization opportunity
        core.variableDeclaration(
          core.variable("x", core.intType),
          core.binary("*", 10, 20) // This should become 200
        )
      ]
    );
    
    // Test the optimization
    const optimized = optimize(repeatWithOptimizableBody);
    
    // Print the original and optimized bodies for debugging
    console.log("Original body:", JSON.stringify(repeatWithOptimizableBody.body));
    console.log("Optimized body:", JSON.stringify(optimized.body));
    
    // Check individual statements to see if they were optimized
    // Instead of comparing the entire body at once, check each statement
    
    // First statement should be optimized
    const firstStmtOptimized = optimized.body[0];
    assert.ok(
      firstStmtOptimized.kind === "Print",
      "First statement should still be a Print statement"
    );
    
    // The print's expression should be optimized to 300
    const printExpr = firstStmtOptimized.expressions[0];
    assert.notEqual(
      printExpr.kind,
      "BinaryExpression",
      "Binary expression in print should be optimized to a literal"
    );
    assert.equal(
      printExpr,
      300,
      "Binary expression 100+200 should be optimized to 300"
    );
    
    // Second statement should be optimized
    const secondStmtOptimized = optimized.body[1];
    assert.ok(
      secondStmtOptimized.kind === "VariableDeclaration",
      "Second statement should still be a VariableDeclaration"
    );
    
    // The initializer should be optimized to 200
    assert.equal(
      secondStmtOptimized.initializer,
      200,
      "Initializer 10*20 should be optimized to 200"
    );
    
    // Verify that the repeat count remains unchanged
    assert.equal(
      optimized.count,
      5,
      "The repeat count should remain unchanged"
    );
  });
});

describe("WhileStatement optimizer", () => {
  it("optimizes body statements while preserving overall structure", () => {
    // Create a while statement with a non-false test (to avoid the [] optimization)
    // and body statements that can be optimized
    const whileWithOptimizableBody = core.whileStatement(
      core.binary("==", 1, 1), // True condition, not optimized to false
      [
        // A print statement with an optimizable expression
        core.print([core.binary("+", 40, 60)]), // 40+60 = 100
        
        // A conditional statement that can be optimized
        core.conditional(
          core.binary(">", 30, 10), // This evaluates to true
          core.binary("*", 5, 5),   // 5*5 = 25
          core.binary("-", 10, 5)   // 10-5 = 5
        ),
        
        // A return statement with an optimizable expression
        core.returnStatement(core.binary("/", 100, 25)) // 100/25 = 4
      ]
    );
    
    // Expected: The body statements should be optimized
    // but the while structure should be preserved
    const expected = core.whileStatement(
      core.binary("==", 1, 1),
      [
        // Optimized print statement
        core.print([100]),
        
        // Optimized conditional (evaluates to consequent)
        25,
        
        // Optimized return statement
        core.returnStatement(4)
      ]
    );
    
    // Test the optimization
    const optimized = optimize(whileWithOptimizableBody);
    
    // Print the original and optimized bodies for debugging
    console.log("Original body:", JSON.stringify(whileWithOptimizableBody.body));
    console.log("Optimized body:", JSON.stringify(optimized.body));
    
    // Check that the while statement structure is preserved
    assert.equal(optimized.kind, "WhileStatement", 
      "Should preserve the while statement kind");
    
    // Test that the body was properly optimized
    // Check each statement individually
    
    // First statement should still be a Print but with an optimized argument
    assert.equal(optimized.body[0].kind, "Print", 
      "First statement should be a Print");
    assert.equal(optimized.body[0].expressions[0], 100, 
      "Print argument should be optimized to 100");
    
    // Second statement should be the optimized conditional result
    assert.equal(optimized.body[1], 25, 
      "Second statement should be optimized to 25");
    
    // Third statement should be a return with optimized expression
    assert.equal(optimized.body[2].kind, "ReturnStatement", 
      "Third statement should be a ReturnStatement");
    assert.equal(optimized.body[2].expression, 4, 
      "Return expression should be optimized to 4");
    
    // Test that the test condition is preserved
    assert.deepEqual(optimized.test, whileWithOptimizableBody.test, 
      "Test condition should be preserved");
  });
  
  it("optimizes to empty array when test is false", () => {
    // Create a while statement with a false test
    const whileWithFalseTest = core.whileStatement(
      false,
      [
        core.print(["This should never execute"]),
        core.returnStatement(42)
      ]
    );
    
    // Expected: The while statement should be optimized to an empty array
    const expected = [];
    
    // Test the optimization
    const optimized = optimize(whileWithFalseTest);
    
    // Check that the result is an empty array
    assert.deepEqual(optimized, expected, 
      "Should optimize while(false) to empty array");
  });
  
  it("optimizes the test condition", () => {
    // Create a while statement with an optimizable test
    const whileWithOptimizableTest = core.whileStatement(
      core.binary("==", 5, 5), // This optimizes to true
      [core.print(["Loop body"])]
    );
    
    // Expected: The test should be optimized, but structure preserved
    const expected = core.whileStatement(
      true,
      [core.print(["Loop body"])]
    );
    
    // Test the optimization
    const optimized = optimize(whileWithOptimizableTest);
    
    // Check that the test was optimized
    assert.equal(optimized.test, true, 
      "Test condition should be optimized to true");
    
    // Check that the body is preserved
    assert.deepEqual(optimized.body, whileWithOptimizableTest.body, 
      "Body should be preserved");
  });
});

describe("ShortIfStatement optimizer", () => {
  it("explicitly tests the 'return s' path when test is not a boolean", () => {
    // Create a variable for the test condition - not a boolean literal
    const testVar = core.variable("condition", core.booleanType);
    
    // Create a ShortIfStatement with a variable test condition
    const shortIfWithVariableTest = core.shortIfStatement(
      testVar,
      [
        core.print(["This is the consequent"]),
        core.returnStatement(42)
      ]
    );
    
    // Make a copy of the original for comparison
    const originalStatement = JSON.parse(JSON.stringify(shortIfWithVariableTest));
    
    // Run the optimizer
    const optimized = optimize(shortIfWithVariableTest);
    
    // GENERAL STRUCTURE TESTS
    
    // Check that the statement structure is preserved
    assert.equal(optimized.kind, "ShortIfStatement", 
      "Should preserve the ShortIfStatement kind");
    
    // Check that the test condition is the same
    assert.deepEqual(optimized.test, testVar, 
      "Should preserve the original test condition");
    
    // Check that the consequent is preserved
    assert.deepEqual(optimized.consequent, originalStatement.consequent, 
      "Should preserve the consequent statements");
    
    // SPECIFIC 'return s' TEST
    
    // Verify that the returned object is the original object
    // This specifically tests the 'return s' path
    assert.strictEqual(optimized, shortIfWithVariableTest, 
      "The 'return s' path should return the original object reference");
    
    // Check that the optimized result has the exact same structure
    assert.deepEqual(
      JSON.stringify(optimized), 
      JSON.stringify(originalStatement),
      "The optimized statement should have identical structure to the original"
    );
  });
});

describe("IfStatement optimizer", () => {
  it("explicitly tests the 'return s' path when test is not a boolean", () => {
    // Create a variable for the test condition - not a boolean literal
    const testVar = core.variable("condition", core.booleanType);
    
    // Create an IfStatement with a variable test condition
    const ifWithVariableTest = core.ifStatement(
      testVar,
      [
        core.print(["This is the consequent"]),
        core.returnStatement(42)
      ],
      [
        core.print(["This is the alternate"]),
        core.returnStatement(-42)
      ]
    );
    
    // Make a copy of the original for comparison
    const originalStatement = JSON.parse(JSON.stringify(ifWithVariableTest));
    
    // Run the optimizer
    const optimized = optimize(ifWithVariableTest);
    
    // GENERAL STRUCTURE TESTS
    
    // Check that the statement structure is preserved
    assert.equal(optimized.kind, "IfStatement", 
      "Should preserve the IfStatement kind");
    
    // Check that the test condition is the same
    assert.deepEqual(optimized.test, testVar, 
      "Should preserve the original test condition");
    
    // Check that the consequent is preserved
    assert.deepEqual(optimized.consequent, originalStatement.consequent, 
      "Should preserve the consequent statements");
    
    // Check that the alternate is preserved
    assert.deepEqual(optimized.alternate, originalStatement.alternate, 
      "Should preserve the alternate statements");
    
    // SPECIFIC 'return s' TEST
    
    // Verify that the returned object is the original object
    // This specifically tests the 'return s' path
    assert.strictEqual(optimized, ifWithVariableTest, 
      "The 'return s' path should return the original object reference");
    
    // Check that the optimized result has the exact same structure
    assert.deepEqual(
      JSON.stringify(optimized), 
      JSON.stringify(originalStatement),
      "The optimized statement should have identical structure to the original"
    );
  });
});

describe("IfStatement optimizer - nested if handling", () => {
  it("correctly handles optimizing nested if statements in alternate", () => {
    // Create a simpler nested if for the alternate branch
    const nestedIf = core.ifStatement(
      core.variable("innerCondition", core.booleanType), // Non-optimizable test
      [core.print(["Inner consequent"])],
      [core.print(["Inner alternate"])]
    );
    
    // Create the outer if statement with the nested if as alternate
    const outerIf = core.ifStatement(
      core.variable("outerCondition", core.booleanType),
      [core.print(["Outer consequent"])],
      nestedIf  // The alternate is another if statement
    );
    
    // Create a copy for comparison
    const originalOuter = JSON.parse(JSON.stringify(outerIf));
    const originalNested = JSON.parse(JSON.stringify(nestedIf));
    
    // Run the optimizer
    const optimized = optimize(outerIf);
    
    // Basic structure checks
    assert.equal(optimized.kind, "IfStatement", 
      "The outer statement should remain an IfStatement");
    
    assert.equal(optimized.alternate.kind, "IfStatement", 
      "The alternate should remain an IfStatement");
    
    // Check that the original reference was used in the outer if
    assert.strictEqual(optimized, outerIf,
      "The optimizer should return the original outer if reference");
    
    // Check that the consequent and test of outer if are preserved
    assert.deepEqual(optimized.test, originalOuter.test,
      "The outer if's test should be preserved");
    
    assert.deepEqual(optimized.consequent, originalOuter.consequent,
      "The outer if's consequent should be preserved");
    
    // Check that the alternate branch has been optimized but structure preserved
    assert.equal(optimized.alternate.kind, originalNested.kind,
      "The nested if's kind should be preserved");
    
    assert.deepEqual(optimized.alternate.test, originalNested.test,
      "The nested if's test should be preserved");
    
    assert.deepEqual(optimized.alternate.consequent, originalNested.consequent,
      "The nested if's consequent should be preserved");
    
    assert.deepEqual(optimized.alternate.alternate, originalNested.alternate,
      "The nested if's alternate should be preserved");
    
    // Most importantly: verify that the alternate branch went through the
    // special case handling
    console.log("Optimized alternate:", optimized.alternate);
    console.log("Original nested if:", nestedIf);
    
    // The optimizer should use the special case for if statements
    // and return the same object reference
    assert.strictEqual(optimized.alternate, nestedIf,
      "The nested if should be the same object reference after optimization");
  });
});

describe("ShortReturnStatement optimizer", () => {
  it("preserves the short return statement structure", () => {
    // Create a ShortReturnStatement
    const shortReturn = core.shortReturnStatement;
    
    // Make a copy for comparison
    const originalStatement = JSON.parse(JSON.stringify(shortReturn));
    
    // Run the optimizer
    const optimized = optimize(shortReturn);
    
    // Check that the structure is preserved
    assert.equal(optimized.kind, "ShortReturnStatement", 
      "Should preserve the ShortReturnStatement kind");
    
    // Check that the optimized result is identical to the original
    assert.deepEqual(optimized, originalStatement, 
      "The optimized statement should be identical to the original");
    
    // Most importantly: verify that the same object reference is returned
    // This specifically tests the 'return s' behavior
    assert.strictEqual(optimized, shortReturn, 
      "Should return the exact same object reference");
  });
});

describe("BreakStatement optimizer", () => {
  it("preserves the break statement structure", () => {
    // Create a BreakStatement
    const breakStmt = core.breakStatement;
    
    // Make a copy for comparison
    const originalStatement = JSON.parse(JSON.stringify(breakStmt));
    
    // Run the optimizer
    const optimized = optimize(breakStmt);
    
    // Check that the structure is preserved
    assert.equal(optimized.kind, "BreakStatement", 
      "Should preserve the BreakStatement kind");
    
    // Check that the optimized result is identical to the original
    assert.deepEqual(optimized, originalStatement, 
      "The optimized statement should be identical to the original");
    
    // Most importantly: verify that the same object reference is returned
    // This specifically tests the 'return s' behavior
    assert.strictEqual(optimized, breakStmt, 
      "Should return the exact same object reference");
  });
});

describe("The optimizer", () => {
  for (const [scenario, before, after] of tests) {
    it(`${scenario}`, () => {
      assert.deepEqual(optimize(before), after)
    })
  }
})