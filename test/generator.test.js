import { describe, it } from "node:test"
import assert from "node:assert/strict"
import generate from "../src/generator.js"

function dedent(s) {
  return `${s}`.replace(/(?<=\n)\s+/g, "").trim()
}

describe("The Snack Script code generator", () => {
  it("generates JavaScript for a simple program with AST nodes", () => {
    // Create AST nodes directly, bypassing the parser
    const program = {
      kind: "Program",
      statements: [
        {
          kind: "VariableDeclarations",
          declarations: [
            {
              variable: { kind: "Variable", name: "x", mutable: true },
              initializer: { kind: "IntegerLiteral", value: 42 }
            }
          ]
        },
        {
          kind: "PrintStatement",
          expressions: [
            { kind: "Variable", name: "x", mutable: true }
          ]
        }
      ]
    }
    
    const expected = dedent`
      let x_1 = 42;
      console.log(x_1);
    `
    
    const actual = generate(program)
    assert.strictEqual(actual, expected)
  });
  
  it("generates JavaScript for a function declaration", () => {
    const program = {
      kind: "Program",
      statements: [
        {
          kind: "FunctionDeclaration",
          function: {
            kind: "Function",
            name: "add",
            parameters: [
              { kind: "Parameter", name: "a" },
              { kind: "Parameter", name: "b" }
            ],
            body: [
              {
                kind: "ReturnStatement",
                expression: {
                  kind: "BinaryExpression",
                  op: "+",
                  left: { kind: "Variable", name: "a" },
                  right: { kind: "Variable", name: "b" }
                }
              }
            ]
          }
        }
      ]
    }
    
    const expected = dedent`
      function add_1(a_2, b_3) {
        return (a_2 + b_3);
      }
    `
    
    const actual = generate(program)
    assert.strictEqual(actual, expected)
  });
  
  it("generates JavaScript for if statements", () => {
    const program = {
      kind: "Program",
      statements: [
        {
          kind: "IfStatement",
          condition: {
            kind: "BinaryExpression",
            op: ">",
            left: { kind: "IntegerLiteral", value: 10 },
            right: { kind: "IntegerLiteral", value: 5 }
          },
          body: [
            {
              kind: "PrintStatement",
              expressions: [
                { kind: "StringLiteral", value: "Greater" }
              ]
            }
          ],
          elsePart: [
            {
              kind: "PrintStatement",
              expressions: [
                { kind: "StringLiteral", value: "Less or equal" }
              ]
            }
          ]
        }
      ]
    }
    
    const expected = dedent`
      if ((10 > 5)) {
        console.log("Greater");
      } else {
        console.log("Less or equal");
      }
    `
    
    const actual = generate(program)
    assert.strictEqual(actual, expected)
  });
  
  it("generates JavaScript for binary expressions with boolean literals", () => {
    const program = {
      kind: "Program",
      statements: [
        {
          kind: "VariableDeclarations",
          declarations: [
            {
              variable: { kind: "Variable", name: "result", mutable: true },
              initializer: {
                kind: "BinaryExpression",
                op: "&&",
                left: { kind: "BooleanLiteral", value: true },
                right: { kind: "BooleanLiteral", value: false }
              }
            }
          ]
        }
      ]
    }
    
    const expected = dedent`
      let result_1 = (true && false);
    `
    
    const actual = generate(program)
    assert.strictEqual(actual, expected)
  });
  
  it("generates JavaScript for forEach statements", () => {
    const program = {
      kind: "Program",
      statements: [
        {
          kind: "ForEach",
          variables: [
            { kind: "Variable", name: "item", mutable: true }
          ],
          collection: "items",
          useValues: false,
          body: [
            {
              kind: "PrintStatement",
              expressions: [
                { kind: "Variable", name: "item", mutable: true }
              ]
            }
          ]
        }
      ]
    }
    
    const expected = dedent`
      for (const item_1 of items) {
        console.log(item_1);
      }
    `
    
    const actual = generate(program)
    assert.strictEqual(actual, expected)
  });
  
  it("generates JavaScript for a simple program with variable and print", () => {
    // Create a minimal AST
    const program = {
      kind: "Program",
      statements: [
        {
          kind: "VariableDeclarations",
          declarations: [
            {
              variable: { kind: "Variable", name: "x", mutable: true },
              initializer: { kind: "IntegerLiteral", value: 42 }
            }
          ]
        },
        {
          kind: "PrintStatement",
          expressions: [
            { kind: "Variable", name: "x", mutable: true }
          ]
        }
      ]
    };
    
    const expected = dedent`
      let x_1 = 42;
      console.log(x_1);
    `;
    
    const actual = generate(program);
    console.log("Expected:", expected);
    console.log("Actual:", actual);
    assert.strictEqual(actual, expected);
  });

  it("generates JavaScript for a simple program with variable and print", () => {
    // Create a minimal AST
    const program = {
      kind: "Program",
      statements: [
        {
          kind: "VariableDeclarations",
          declarations: [
            {
              variable: { kind: "Variable", name: "x", mutable: true },
              initializer: { kind: "IntegerLiteral", value: 42 }
            }
          ]
        },
        {
          kind: "PrintStatement",
          expressions: [
            { kind: "Variable", name: "x", mutable: true }
          ]
        }
      ]
    };
    
    const expected = dedent`
      let x_1 = 42;
      console.log(x_1);
    `;
    
    const actual = generate(program);
    console.log("Expected:", expected);
    console.log("Actual:", actual);
    assert.strictEqual(actual, expected);
  });

  it("generates JavaScript for a simple program with variable and print", () => {
    // Create a minimal AST
    const program = {
      kind: "Program",
      statements: [
        {
          kind: "VariableDeclarations",
          declarations: [
            {
              variable: { kind: "Variable", name: "x", mutable: true },
              initializer: { kind: "IntegerLiteral", value: 42 }
            }
          ]
        },
        {
          kind: "PrintStatement",
          expressions: [
            { kind: "Variable", name: "x", mutable: true }
          ]
        }
      ]
    };
    
    const expected = dedent`
      let x_1 = 42;
      console.log(x_1);
    `;
    
    const actual = generate(program);
    console.log("Expected:", expected);
    console.log("Actual:", actual);
    assert.strictEqual(actual, expected);
  });
})