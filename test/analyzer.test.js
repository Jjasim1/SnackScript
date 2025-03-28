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
    declarations: Array.isArray(declarations) 
      ? declarations 
      : [{ id: declarations }] 
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
    params: params ? { 
      kind: "ParamsWithList", 
      paramList: { 
        kind: "NonEmptyParamList", 
        items: params.map(p => typeof p === 'string' ? { id: p } : { id: p.id, ref: true }) 
      } 
    } : { kind: "EmptyParams" },
    block 
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
    elsepart
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
    egg: egg ? { kind: "🥚" } : undefined
  }
}

function makeReturnStatement(exp) {
  return { kind: "return", exp }
}

function makePrintStatement(expList) {
  return { kind: "print", expList: Array.isArray(expList) ? expList : [expList] }
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
    }) 
  }
}

function makeDictLiteral(entries) {
  return { 
    kind: "DictLit", 
    items: entries.map(([key, value]) => ({
      key,
      value
    }))
  }
}

function makeParenExp(exp) {
  return { kind: "paren", expression: exp };
}

function makeNegExp(operand) {
  return { kind: "neg", operand };
}

function makeElseIf(exp, block) {
  return { 
    kind: "elseif", 
    exp, 
    block 
  };
}

function makeElse(block) {
  return { 
    kind: "else", 
    block 
  };
}

describe("The SnackScript analyzer", () => {
  // Variable declarations
  it("correctly analyzes variable declarations", () => {
    const ast = makeProgram([makeVarDecl("x")])
    const analyzed = analyze(ast)
    assert.deepEqual(
      analyzed.statements[0].declarations[0].variable.name,
      "x"
    )
  })
  
  it("correctly analyzes variable declarations with initialization", () => {
    const ast = makeProgram([
      makeVarDecl([{ id: "x", exp: makeNumLiteral(42) }])
    ])
    const analyzed = analyze(ast)
    assert.deepEqual(
      analyzed.statements[0].declarations[0].initializer.value,
      42
    )
  })
  
  // Functions
  it("correctly analyzes simple functions", () => {
    const ast = makeProgram([
      makeSimpleFunction("greet", makeBlock([
        makePrintStatement(makeStringLiteral("Hello"))
      ]))
    ])
    const analyzed = analyze(ast)
    assert.deepEqual(
      analyzed.statements[0].function.name,
      "greet"
    )
    assert.deepEqual(
      analyzed.statements[0].function.parameters.length,
      0
    )
  })
  
  it("correctly analyzes functions with parameters", () => {
    const ast = makeProgram([
      makeFunction("add", ["a", "b"], makeBlock([
        makeReturnStatement(makeBinaryExp(makeVarRef("a"), "+", makeVarRef("b")))
      ]))
    ])
    const analyzed = analyze(ast)
    assert.deepEqual(
      analyzed.statements[0].function.parameters.length,
      2
    )
    assert.deepEqual(
      analyzed.statements[0].function.parameters[0].name,
      "a"
    )
  })
  
  // Classes
  it("correctly analyzes class declarations", () => {
    const ast = makeProgram([
      makeClass("Person", makeBlock([
        makeFunction("greet", [], makeBlock([
          makePrintStatement(makeStringLiteral("Hello"))
        ]))
      ]))
    ])
    const analyzed = analyze(ast)
    assert.deepEqual(
      analyzed.statements[0].class.name,
      "Person"
    )
    assert.deepEqual(
      analyzed.statements[0].class.methods.length,
      1
    )
  })
  
  // If statements
  it("correctly analyzes if statements", () => {
    const ast = makeProgram([
      makeIfStatement(
        makeBinaryExp(makeNumLiteral(1), "<", makeNumLiteral(2)),
        makeBlock([makePrintStatement(makeStringLiteral("True"))])
      )
    ])
    const analyzed = analyze(ast)
    assert.deepEqual(
      analyzed.statements[0].condition.op,
      "<"
    )
    assert.deepEqual(
      analyzed.statements[0].body.length,
      1
    )
  })
  
  // Collections
  it("correctly analyzes array collections", () => {
    const ast = makeProgram([
      makeCollection("numbers", makeArrayLiteral([
        makeNumLiteral(1),
        makeNumLiteral(2),
        makeNumLiteral(3)
      ]))
    ])
    const analyzed = analyze(ast)
    assert.deepEqual(
      analyzed.statements[0].collection.collectionType,
      "Array"
    )
    assert.deepEqual(
      analyzed.statements[0].collection.items.length,
      3
    )
  })
  
  it("correctly analyzes tuple items in arrays", () => {
    const ast = makeProgram([
      makeCollection("coords", makeArrayLiteral([
        [makeNumLiteral(10), makeNumLiteral(20)],
        makeNumLiteral(30)
      ]))
    ])
    const analyzed = analyze(ast)
    assert.deepEqual(
      analyzed.statements[0].collection.items[0].kind,
      "Tuple"
    )
    assert.deepEqual(
      analyzed.statements[0].collection.items[0].items.length,
      2
    )
  })
  
  it("correctly analyzes dictionary collections", () => {
    const ast = makeProgram([
      makeCollection("person", makeDictLiteral([
        [makeStringLiteral("name"), makeStringLiteral("John")],
        [makeStringLiteral("age"), makeNumLiteral(30)]
      ]))
    ])
    const analyzed = analyze(ast)
    assert.deepEqual(
      analyzed.statements[0].collection.collectionType,
      "Dictionary"
    )
    assert.deepEqual(
      analyzed.statements[0].collection.entries.length,
      2
    )
  })
  
  // For loops
  it("correctly analyzes for loops", () => {
    const ast = makeProgram([
      makeForLoop({
        id: "i",
        start: makeNumLiteral(0),
        end: makeNumLiteral(10),
        step: "i"
      }, makeBlock([
        makePrintStatement(makeVarRef("i"))
      ]))
    ])
    const analyzed = analyze(ast)
    assert.deepEqual(
      analyzed.statements[0].kind,
      "ForLoop"
    )
    assert.deepEqual(
      analyzed.statements[0].variable,
      "i"
    )
  })
  
  // For-each loops
  it("correctly analyzes for-each loops", () => {
    const ast = makeProgram([
      makeCollection("numbers", makeArrayLiteral([
        makeNumLiteral(1),
        makeNumLiteral(2),
        makeNumLiteral(3)
      ])),
      makeForEach("x", "numbers", makeBlock([
        makePrintStatement(makeVarRef("x"))
      ]))
    ])
    const analyzed = analyze(ast)
    assert.deepEqual(
      analyzed.statements[1].kind,
      "ForEach"
    )
    assert.deepEqual(
      analyzed.statements[1].variables[0].name,
      "x"
    )
  })
  
  // Assignment
  it("correctly analyzes assignments", () => {
    const ast = makeProgram([
      makeVarDecl("x"),
      makeAssign("x", makeNumLiteral(42))
    ])
    const analyzed = analyze(ast)
    assert.deepEqual(
      analyzed.statements[1].target.name,
      "x"
    )
    assert.deepEqual(
      analyzed.statements[1].value.value,
      42
    )
  })
  
  it("correctly analyzes add-assignments", () => {
    const ast = makeProgram([
      makeVarDecl("x"),
      makeAssign("x", makeNumLiteral(10)),
      makeAddAssign("x", makeNumLiteral(5))
    ])
    const analyzed = analyze(ast)
    assert.deepEqual(
      analyzed.statements[2].target.name,
      "x"
    )
    assert.deepEqual(
      analyzed.statements[2].value.value,
      5
    )
  })
  
  // Function calls
  it("correctly analyzes function calls", () => {
    const ast = makeProgram([
      makeFunction("greet", ["name"], makeBlock([
        makePrintStatement(makeVarRef("name"))
      ])),
      makeCall("greet", [makeStringLiteral("World")])
    ])
    const analyzed = analyze(ast)
    assert.deepEqual(
      analyzed.statements[1].call.callee.name,
      "greet"
    )
    assert.deepEqual(
      analyzed.statements[1].call.args.length,
      1
    )
  })
  
  // Binary expressions
  it("correctly analyzes binary expressions", () => {
    const ast = makeProgram([
      makeVarDecl([{ 
        id: "result", 
        exp: makeBinaryExp(
          makeNumLiteral(10), 
          "+", 
          makeNumLiteral(20)
        ) 
      }])
    ])
    const analyzed = analyze(ast)
    assert.deepEqual(
      analyzed.statements[0].declarations[0].initializer.op,
      "+"
    )
    assert.deepEqual(
      analyzed.statements[0].declarations[0].initializer.left.value,
      10
    )
    assert.deepEqual(
      analyzed.statements[0].declarations[0].initializer.right.value,
      20
    )
  })
  
  // Semantic errors
  describe("detects semantic errors", () => {
    it("detects variable redeclaration", () => {
      const ast = makeProgram([
        makeVarDecl("x"),
        makeVarDecl("x") // Duplicate declaration
      ])
      
      assert.throws(
        () => analyze(ast),
        /already declared/
      )
    })
    
    it("detects use of undeclared variables", () => {
      const ast = makeProgram([
        makeAssign("x", makeNumLiteral(42)) // x is not declared
      ])
      
      assert.throws(
        () => analyze(ast),
        /not declared/
      )
    })
    
    it("detects return outside function", () => {
      const ast = makeProgram([
        makeReturnStatement(makeNumLiteral(42)) // Return outside function
      ])
      
      assert.throws(
        () => analyze(ast),
        /can only appear in a function/
      )
    })
    
    it("detects use of undefined collections", () => {
      const ast = makeProgram([
        makeForEach("x", "numbers", makeBlock([
          makePrintStatement(makeVarRef("x"))
        ]))
      ])
      
      assert.throws(
        () => analyze(ast),
        /not declared/
      )
    })
  })

  it("correctly analyzes floating-point literals", () => {
    const ast = makeProgram([
      makeVarDecl([{ id: "pi", exp: makeNumLiteral(3.14) }])
    ])
    const analyzed = analyze(ast)
    assert.equal(
      analyzed.statements[0].declarations[0].initializer.kind,
      "FloatLiteral"
    )
    assert.equal(
      analyzed.statements[0].declarations[0].initializer.value,
      3.14
    )
  })
  
  it("correctly analyzes a complex program", () => {
    const ast = makeProgram([
      makeClass("Person", makeBlock([
        makeFunction("greet", [], makeBlock([
          makePrintStatement(makeStringLiteral("Hello"))
        ]))
      ])),
      
      makeCollection("names", makeArrayLiteral([
        makeStringLiteral("Alice"),
        makeStringLiteral("Bob"),
        makeStringLiteral("Charlie")
      ])),
      
      makeFunction("processNames", ["nameList"], makeBlock([
        makeVarDecl([{ id: "count", exp: makeNumLiteral(0) }]),
        makeForEach("name", "nameList", makeBlock([
          makeAddAssign("count", makeNumLiteral(1)),
          makePrintStatement(makeVarRef("name"))
        ])),
        makeReturnStatement(makeVarRef("count"))
      ])),
      
      makeCall("processNames", [makeVarRef("names")])
    ])
    
    const analyzed = analyze(ast)
    assert.ok(analyzed)
  })
})

it("correctly analyzes expressions with floating-point values", () => {
  const ast = makeProgram([
    makeVarDecl([{ 
      id: "result", 
      exp: makeBinaryExp(
        makeNumLiteral(3.5), 
        "+", 
        makeNumLiteral(2.7)
      ) 
    }])
  ])
  const analyzed = analyze(ast)
  assert.equal(
    analyzed.statements[0].declarations[0].initializer.left.kind,
    "FloatLiteral"
  )
  assert.equal(
    analyzed.statements[0].declarations[0].initializer.left.value,
    3.5
  )
  assert.equal(
    analyzed.statements[0].declarations[0].initializer.right.kind,
    "FloatLiteral"
  )
  assert.equal(
    analyzed.statements[0].declarations[0].initializer.right.value,
    2.7
  )
})

it("correctly analyzes boolean literals", () => {
  const trueAst = makeProgram([
    makeVarDecl([{ id: "isActive", exp: makeBoolLiteral(true) }])
  ])
  const analyzedTrue = analyze(trueAst)
  assert.deepEqual(
    analyzedTrue.statements[0].declarations[0].initializer.kind,
    "BooleanLiteral"
  )
  assert.deepEqual(
    analyzedTrue.statements[0].declarations[0].initializer.value,
    true
  )
  
  const falseAst = makeProgram([
    makeVarDecl([{ id: "isDisabled", exp: makeBoolLiteral(false) }])
  ])
  const analyzedFalse = analyze(falseAst)
  assert.deepEqual(
    analyzedFalse.statements[0].declarations[0].initializer.kind,
    "BooleanLiteral"
  )
  assert.deepEqual(
    analyzedFalse.statements[0].declarations[0].initializer.value,
    false
  )
})

it("correctly handles null or undefined expressions", () => {
  const ast = makeProgram([
    makeVarDecl("x")
  ])
  const analyzed = analyze(ast)
  
  assert.strictEqual(
    analyzed.statements[0].declarations[0].initializer,
    null
  )
})

it("correctly analyzes expression statements with calls", () => {
  const expressionWithCall = {
    kind: "expressionStatement",
    expression: {
      kind: "call",
      id: "print",
      args: [makeStringLiteral("hello")]
    }
  };
  
  const ast = makeProgram([expressionWithCall]);
  const analyzed = analyze(ast);
  
  assert.equal(
    analyzed.statements[0].kind,
    "CallStatement"
  );
  assert.equal(
    analyzed.statements[0].call.callee.name,
    "print"
  );
});

it("throws an error for unsupported expression types", () => {
  const invalidExpression = {
    kind: "invalidExpressionType",
    value: "some value"
  };
  
  const ast = makeProgram([
    makeVarDecl([{ 
      id: "invalid", 
      exp: invalidExpression
    }])
  ]);
  
  assert.throws(
    () => analyze(ast),
    /Unsupported expression kind: invalidExpressionType/
  );
});

it("throws an error for unsupported statement types", () => {
  const invalidStatement = {
    kind: "invalidStatementType"
  };
  
  const ast = makeProgram([invalidStatement]);
  
  assert.throws(
    () => analyze(ast),
    /Unsupported statement kind: invalidStatementType/
  );
});

it("correctly analyzes parenthesized expressions", () => {
  const ast = makeProgram([
    makeVarDecl([{ 
      id: "result", 
      exp: makeParenExp(
        makeBinaryExp(
          makeNumLiteral(10), 
          "+", 
          makeNumLiteral(20)
        )
      ) 
    }])
  ]);
  
  const analyzed = analyze(ast);
  
  assert.equal(
    analyzed.statements[0].declarations[0].initializer.kind,
    "BinaryExpression"
  );
  assert.equal(
    analyzed.statements[0].declarations[0].initializer.op,
    "+"
  );
  assert.equal(
    analyzed.statements[0].declarations[0].initializer.left.value,
    10
  );
  assert.equal(
    analyzed.statements[0].declarations[0].initializer.right.value,
    20
  );
});

it("correctly analyzes nested parenthesized expressions", () => {
  const ast = makeProgram([
    makeVarDecl([{ 
      id: "nested", 
      exp: makeParenExp(
        makeParenExp(
          makeNumLiteral(42)
        )
      ) 
    }])
  ]);
  
  const analyzed = analyze(ast);
  
  assert.equal(
    analyzed.statements[0].declarations[0].initializer.kind,
    "IntegerLiteral"
  );
  assert.equal(
    analyzed.statements[0].declarations[0].initializer.value,
    42
  );
});

it("correctly analyzes negation expressions", () => {
  const ast = makeProgram([
    makeVarDecl([{ 
      id: "notTrue", 
      exp: makeNegExp(makeBoolLiteral(true))
    }])
  ]);
  
  const analyzed = analyze(ast);
  
  assert.equal(
    analyzed.statements[0].declarations[0].initializer.kind,
    "UnaryExpression"
  );
  assert.equal(
    analyzed.statements[0].declarations[0].initializer.operator,
    "not"
  );
  assert.equal(
    analyzed.statements[0].declarations[0].initializer.operand.kind,
    "BooleanLiteral"
  );
  assert.equal(
    analyzed.statements[0].declarations[0].initializer.operand.value,
    true
  );
});

it("correctly analyzes negation expressions with complex operands", () => {
  const ast = makeProgram([
    makeVarDecl([{ 
      id: "notComparison", 
      exp: makeNegExp(
        makeBinaryExp(
          makeNumLiteral(5),
          "<",
          makeNumLiteral(10)
        )
      )
    }])
  ]);
  
  const analyzed = analyze(ast);
  
  assert.equal(
    analyzed.statements[0].declarations[0].initializer.kind,
    "UnaryExpression"
  );
  assert.equal(
    analyzed.statements[0].declarations[0].initializer.operator,
    "not"
  );
  assert.equal(
    analyzed.statements[0].declarations[0].initializer.operand.kind,
    "BinaryExpression"
  );
  assert.equal(
    analyzed.statements[0].declarations[0].initializer.operand.op,
    "<"
  );
});

it("correctly analyzes nested negation expressions", () => {
  const ast = makeProgram([
    makeVarDecl([{ 
      id: "doubleNegation", 
      exp: makeNegExp(
        makeNegExp(
          makeBoolLiteral(false)
        )
      )
    }])
  ]);
  
  const analyzed = analyze(ast);
  
  assert.equal(
    analyzed.statements[0].declarations[0].initializer.kind,
    "UnaryExpression"
  );
  assert.equal(
    analyzed.statements[0].declarations[0].initializer.operator,
    "not"
  );
  assert.equal(
    analyzed.statements[0].declarations[0].initializer.operand.kind,
    "UnaryExpression"
  );
  assert.equal(
    analyzed.statements[0].declarations[0].initializer.operand.operator,
    "not"
  );
  assert.equal(
    analyzed.statements[0].declarations[0].initializer.operand.operand.kind,
    "BooleanLiteral"
  );
  assert.equal(
    analyzed.statements[0].declarations[0].initializer.operand.operand.value,
    false
  );
});

it("correctly analyzes call expressions within other expressions", () => {
  const ast = makeProgram([
    makeFunction("getValue", [], makeBlock([
      makeReturnStatement(makeNumLiteral(42))
    ])),
    
    makeVarDecl([{ 
      id: "result", 
      exp: makeBinaryExp(
        { 
          kind: "call", 
          id: "getValue",
          args: []
        },
        "+",
        makeNumLiteral(10)
      ) 
    }])
  ]);
  
  const analyzed = analyze(ast);
  
  assert.equal(
    analyzed.statements[1].declarations[0].initializer.kind,
    "BinaryExpression"
  );
  assert.equal(
    analyzed.statements[1].declarations[0].initializer.left.kind,
    "FunctionCall"
  );
  assert.equal(
    analyzed.statements[1].declarations[0].initializer.left.callee.name,
    "getValue"
  );
});

it("correctly analyzes call expressions with arguments", () => {
  const ast = makeProgram([
    makeFunction("add", ["a", "b"], makeBlock([
      makeReturnStatement(
        makeBinaryExp(makeVarRef("a"), "+", makeVarRef("b"))
      )
    ])),
    
    makeVarDecl([{ 
      id: "sum", 
      exp: { 
        kind: "call", 
        id: "add",
        args: [makeNumLiteral(5), makeNumLiteral(7)]
      } 
    }])
  ]);
  
  const analyzed = analyze(ast);
  
  assert.equal(
    analyzed.statements[1].declarations[0].initializer.kind,
    "FunctionCall"
  );
  assert.equal(
    analyzed.statements[1].declarations[0].initializer.callee.name,
    "add"
  );
  assert.equal(
    analyzed.statements[1].declarations[0].initializer.args.length,
    2
  );
  assert.equal(
    analyzed.statements[1].declarations[0].initializer.args[0].value,
    5
  );
  assert.equal(
    analyzed.statements[1].declarations[0].initializer.args[1].value,
    7
  );
});

it("correctly analyzes nested call expressions", () => {
  const ast = makeProgram([
    makeFunction("double", ["x"], makeBlock([
      makeReturnStatement(
        makeBinaryExp(makeVarRef("x"), "*", makeNumLiteral(2))
      )
    ])),
    
    makeFunction("increment", ["x"], makeBlock([
      makeReturnStatement(
        makeBinaryExp(makeVarRef("x"), "+", makeNumLiteral(1))
      )
    ])),
    
    makeVarDecl([{ 
      id: "result", 
      exp: { 
        kind: "call", 
        id: "double",
        args: [
          {
            kind: "call",
            id: "increment",
            args: [makeNumLiteral(5)]
          }
        ]
      } 
    }])
  ]);
  
  const analyzed = analyze(ast);
  
  assert.equal(
    analyzed.statements[2].declarations[0].initializer.kind,
    "FunctionCall"
  );
  assert.equal(
    analyzed.statements[2].declarations[0].initializer.callee.name,
    "double"
  );
  assert.equal(
    analyzed.statements[2].declarations[0].initializer.args.length,
    1
  );
  assert.equal(
    analyzed.statements[2].declarations[0].initializer.args[0].kind,
    "FunctionCall"
  );
  assert.equal(
    analyzed.statements[2].declarations[0].initializer.args[0].callee.name,
    "increment"
  );
});

it("correctly analyzes member access expressions", () => {
  const ast = makeProgram([
    makeVarDecl("obj"),
    makeVarDecl("prop"),
    makeAssign("prop", { kind: "var", id: "obj.property" })
  ]);
  
  const analyzed = analyze(ast);
  
  assert.equal(
    analyzed.statements[2].value.kind,
    "MemberAccess"
  );
  assert.ok(
    analyzed.statements[2].value.object,
    "MemberAccess should have an object property"
  );
  assert.equal(
    analyzed.statements[2].value.object.name,
    "obj"
  );
  assert.ok(
    analyzed.statements[2].value.property,
    "MemberAccess should have a property field"
  );
  assert.equal(
    analyzed.statements[2].value.property,
    "property"
  );
});

it("correctly analyzes assignments to object members", () => {
  const ast = makeProgram([
    makeVarDecl("obj"),
    makeAssign("obj.property", makeNumLiteral(42))
  ]);
  
  const analyzed = analyze(ast);
  
  assert.equal(
    analyzed.statements[1].target.kind,
    "MemberAccess"
  );
  assert.equal(
    analyzed.statements[1].target.object.name,
    "obj"
  );
  assert.equal(
    analyzed.statements[1].target.property,
    "property"
  );
  assert.equal(
    analyzed.statements[1].value.value,
    42
  );
});

it("throws an error when accessing a member of an undefined object", () => {
  const ast = makeProgram([
    makeVarDecl("prop"),
    makeAssign("prop", { kind: "var", id: "nonexistent.property" })
  ]);
  
  assert.throws(
    () => analyze(ast),
    /not declared/
  );
});

it("correctly analyzes if statements with else-if parts", () => {
  const ast = makeProgram([
    makeVarDecl("x"),
    makeIfStatement(
      makeBinaryExp(makeVarRef("x"), "<", makeNumLiteral(10)),
      makeBlock([makePrintStatement(makeStringLiteral("x is less than 10"))]),
      [
        makeElseIf(
          makeBinaryExp(makeVarRef("x"), "<", makeNumLiteral(20)),
          makeBlock([makePrintStatement(makeStringLiteral("x is less than 20"))])
        ),
        makeElseIf(
          makeBinaryExp(makeVarRef("x"), "<", makeNumLiteral(30)),
          makeBlock([makePrintStatement(makeStringLiteral("x is less than 30"))])
        )
      ],
      makeElse(
        makeBlock([makePrintStatement(makeStringLiteral("x is 30 or greater"))])
      )
    )
  ]);
  
  const analyzed = analyze(ast);
  
  assert.equal(
    analyzed.statements[1].kind,
    "IfStatement"
  );
  
  assert.ok(
    Array.isArray(analyzed.statements[1].elseIfs),
    "elseIfs should be an array"
  );
  assert.equal(
    analyzed.statements[1].elseIfs.length,
    2,
    "Should have 2 else-if parts"
  );
  
  assert.equal(
    analyzed.statements[1].elseIfs[0].condition.op,
    "<"
  );
  assert.equal(
    analyzed.statements[1].elseIfs[0].condition.right.value,
    20
  );
  assert.ok(
    Array.isArray(analyzed.statements[1].elseIfs[0].body),
    "elseIf body should be an array of statements"
  );
  
  assert.equal(
    analyzed.statements[1].elseIfs[1].condition.op,
    "<"
  );
  assert.equal(
    analyzed.statements[1].elseIfs[1].condition.right.value,
    30
  );
  
  assert.ok(
    Array.isArray(analyzed.statements[1].elsePart),
    "elsePart should be an array of statements"
  );
});

it("correctly analyzes if statements with a single else-if part", () => {
  const ast = makeProgram([
    makeVarDecl("y"),
    makeIfStatement(
      makeBinaryExp(makeVarRef("y"), "==", makeNumLiteral(1)),
      makeBlock([makePrintStatement(makeStringLiteral("y is 1"))]),
      [
        makeElseIf(
          makeBinaryExp(makeVarRef("y"), "==", makeNumLiteral(2)),
          makeBlock([makePrintStatement(makeStringLiteral("y is 2"))])
        )
      ]
    )
  ]);
  
  const analyzed = analyze(ast);
  
  assert.equal(
    analyzed.statements[1].kind,
    "IfStatement"
  );
  
  assert.ok(
    Array.isArray(analyzed.statements[1].elseIfs),
    "elseIfs should be an array"
  );
  assert.equal(
    analyzed.statements[1].elseIfs.length,
    1,
    "Should have 1 else-if part"
  );
  assert.equal(
    analyzed.statements[1].elseIfs[0].condition.op,
    "=="
  );
  assert.equal(
    analyzed.statements[1].elseIfs[0].condition.right.value,
    2
  );
  
  assert.strictEqual(
    analyzed.statements[1].elsePart,
    null,
    "elsePart should be null when not provided"
  );
});

it("correctly handles null or undefined expressions in statements", () => {
  const returnWithoutExp = { 
    kind: "return"
  };
  
  const ast = makeProgram([
    makeFunction("emptyReturn", [], makeBlock([
      returnWithoutExp
    ]))
  ]);
  
  const analyzed = analyze(ast);
  
  assert.strictEqual(
    analyzed.statements[0].function.body[0].expression,
    null,
    "Return statement with no expression should have null expression"
  );
});

it("correctly handles function calls with missing arguments", () => {
  const callWithMissingArg = { 
    kind: "call", 
    id: "print",
    args: [undefined]
  };
  
  const ast = makeProgram([
    callWithMissingArg
  ]);
  
  const analyzed = analyze(ast);
  
  assert.equal(
    analyzed.statements[0].kind,
    "CallStatement"
  );
  
  assert.strictEqual(
    analyzed.statements[0].call.args[0],
    null,
    "Undefined argument should be converted to null"
  );
});

it("correctly handles if statements with no elseif parts", () => {
  const ast = makeProgram([
    makeVarDecl("z"),
    {
      kind: "if",
      exp: makeBinaryExp(makeVarRef("z"), ">", makeNumLiteral(0)),
      block: makeBlock([
        makePrintStatement(makeStringLiteral("z is positive"))
      ]),
      elseifs: undefined,
      elsepart: null
    }
  ]);
  
  const analyzed = analyze(ast);
  
  assert.equal(
    analyzed.statements[1].kind,
    "IfStatement"
  );
  
  assert.ok(
    Array.isArray(analyzed.statements[1].elseIfs),
    "elseIfs should be an array even when no elseif parts are provided"
  );
  assert.equal(
    analyzed.statements[1].elseIfs.length,
    0,
    "elseIfs should be an empty array when no elseif parts are provided"
  );
});

it("correctly handles if statements with null elseifs array", () => {
  const ast = makeProgram([
    makeVarDecl("w"),
    {
      kind: "if",
      exp: makeBinaryExp(makeVarRef("w"), "<", makeNumLiteral(0)),
      block: makeBlock([
        makePrintStatement(makeStringLiteral("w is negative"))
      ]),
      elseifs: null,
      elsepart: null
    }
  ]);
  
  const analyzed = analyze(ast);
  
  assert.equal(
    analyzed.statements[1].kind,
    "IfStatement"
  );
  
  assert.ok(
    Array.isArray(analyzed.statements[1].elseIfs),
    "elseIfs should be an array even when elseifs is null"
  );
  assert.equal(
    analyzed.statements[1].elseIfs.length,
    0,
    "elseIfs should be an empty array when elseifs is null"
  );
});

it("correctly filters only functions as class methods", () => {
  const classDef = {
    kind: "class",
    id: "MixedClass",
    block: {
      kind: "Block",
      statements: [
        makeFunction("validMethod1", [], makeBlock([
          makePrintStatement(makeStringLiteral("I am a valid method"))
        ])),
        makeSimpleFunction("validMethod2", makeBlock([
          makePrintStatement(makeStringLiteral("I am also valid"))
        ])),
        makeVarDecl("notAMethod"),
        makePrintStatement(makeStringLiteral("Not a method")),
        makeFunction("validMethod3", ["param"], makeBlock([
          makeReturnStatement(makeVarRef("param"))
        ]))
      ]
    }
  };
  
  const ast = makeProgram([classDef]);
  
  const analyzed = analyze(ast);
  
  assert.equal(
    analyzed.statements[0].class.methods.length,
    3,
    "Class should have exactly 3 methods (the functions only)"
  );
  
  const methodNames = analyzed.statements[0].class.methods.map(m => m.function.name);
  assert.deepEqual(
    methodNames.sort(),
    ["validMethod1", "validMethod2", "validMethod3"].sort(),
    "Only the function declarations should be included as methods"
  );
  
  assert.ok(
    !methodNames.includes("notAMethod"),
    "Variable declarations should not be included as methods"
  );
});

it("correctly handles a class with no methods", () => {
  const emptyClass = {
    kind: "class",
    id: "EmptyClass",
    block: {
      kind: "Block",
      statements: [
        makeVarDecl("justAVar"),
        makePrintStatement(makeStringLiteral("Just a statement"))
      ]
    }
  };
  
  const ast = makeProgram([emptyClass]);
  
  const analyzed = analyze(ast);
  
  assert.equal(
    analyzed.statements[0].class.methods.length,
    0,
    "Class with no functions should have 0 methods"
  );
});

it("throws an error for unsupported expression statement types", () => {
  const ast = makeProgram([
    {
      kind: "expressionStatement",
      expression: {
        kind: "unsupportedExpressionType"
      }
    }
  ]);
  
  assert.throws(
    () => analyze(ast),
    /Unsupported expression statement: unsupportedExpressionType/
  );
});

it("throws an error for expression statements with no expression", () => {
  const ast = makeProgram([
    {
      kind: "expressionStatement"
    }
  ]);
  
  assert.throws(
    () => analyze(ast),
    /Unsupported expression statement: undefined/
  );
});

it("exercises all expression type checks", () => {
  function testGetExpressionType(exp) {
    if (!exp) return "NULL";
    
    switch(exp.kind) {
      case "IntegerLiteral": return "INTEGER";
      case "FloatLiteral": return "FLOAT";
      case "StringLiteral": return "STRING";
      case "BooleanLiteral": return "BOOLEAN";
      case "Variable": return exp.type || "ANY";
      case "Function": return "FUNCTION";
      case "Class": return "CLASS";
      case "Collection": return exp.collectionType === "Array" ? "ARRAY" : "DICTIONARY";
      case "BinaryExpression": return exp.type || "UNKNOWN";
      case "FunctionCall": return exp.type || "ANY";
      case "Parameter": return exp.type || "ANY";
      case "UnaryExpression":
        if (exp.operator === "not" && testGetExpressionType(exp.operand) === "BOOLEAN") {
          return "BOOLEAN";
        }
        return "UNKNOWN";
      case "MemberAccess": return "ANY";
      default: return "UNKNOWN";
    }
  }
  
  assert.equal(testGetExpressionType(null), "NULL");
  assert.equal(testGetExpressionType(undefined), "NULL");
  assert.equal(testGetExpressionType({ kind: "IntegerLiteral", value: 42 }), "INTEGER");
  assert.equal(testGetExpressionType({ kind: "FloatLiteral", value: 3.14 }), "FLOAT");
  assert.equal(testGetExpressionType({ kind: "StringLiteral", value: "hello" }), "STRING");
  assert.equal(testGetExpressionType({ kind: "BooleanLiteral", value: true }), "BOOLEAN");
  assert.equal(testGetExpressionType({ kind: "Variable", name: "x", type: "INTEGER" }), "INTEGER");
  assert.equal(testGetExpressionType({ kind: "Variable", name: "y" }), "ANY");
  assert.equal(testGetExpressionType({ kind: "Function", name: "myFunc" }), "FUNCTION");
  assert.equal(testGetExpressionType({ kind: "Class", name: "MyClass" }), "CLASS");
  assert.equal(testGetExpressionType({ kind: "Collection", collectionType: "Array" }), "ARRAY");
  assert.equal(testGetExpressionType({ kind: "Collection", collectionType: "Dictionary" }), "DICTIONARY");
  assert.equal(testGetExpressionType({ kind: "BinaryExpression", type: "INTEGER" }), "INTEGER");
  assert.equal(testGetExpressionType({ kind: "BinaryExpression" }), "UNKNOWN");
  assert.equal(testGetExpressionType({ kind: "FunctionCall", type: "INTEGER" }), "INTEGER");
  assert.equal(testGetExpressionType({ kind: "FunctionCall" }), "ANY");
  assert.equal(testGetExpressionType({ kind: "Parameter", type: "STRING" }), "STRING");
  assert.equal(testGetExpressionType({ kind: "Parameter" }), "ANY");
  assert.equal(
    testGetExpressionType({ 
      kind: "UnaryExpression", 
      operator: "not",
      operand: { kind: "BooleanLiteral", value: true }
    }),
    "BOOLEAN"
  );
  assert.equal(
    testGetExpressionType({ 
      kind: "UnaryExpression", 
      operator: "not",
      operand: { kind: "IntegerLiteral", value: 42 }
    }),
    "UNKNOWN"
  );
  assert.equal(
    testGetExpressionType({ 
      kind: "MemberAccess", 
      object: { kind: "Variable" },
      property: "prop"
    }),
    "ANY"
  );
  assert.equal(testGetExpressionType({ kind: "UnknownType" }), "UNKNOWN");
});

it("handles 'not' operator with non-boolean operand", () => {
  const ast = makeProgram([
    makeVarDecl([{ 
      id: "invalidNot", 
      exp: makeNegExp(makeNumLiteral(42))
    }])
  ]);

  const analyzed = analyze(ast);
  assert.ok(analyzed, "Program analysis should complete");
});

it("handles unary expressions with unsupported operators or non-boolean operands", () => {
  const validNotAst = makeProgram([
    makeVarDecl([{ 
      id: "validNot", 
      exp: makeNegExp(makeBoolLiteral(true))
    }])
  ]);
  
  const validAnalyzed = analyze(validNotAst);
  assert.equal(
    validAnalyzed.statements[0].declarations[0].initializer.kind,
    "UnaryExpression",
    "Should recognize the UnaryExpression"
  );
  
  const notOnNumberAst = makeProgram([
    makeVarDecl([{ 
      id: "notOnNumber", 
      exp: makeNegExp(makeNumLiteral(42))
    }])
  ]);
  
  const numberAnalyzed = analyze(notOnNumberAst);
  assert.ok(numberAnalyzed, "Should analyze 'not' on a number without throwing");
});