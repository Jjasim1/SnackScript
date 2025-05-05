// The code generator exports a single function, generate(program), which
// accepts a program representation and returns the JavaScript translation
// as a string.

export default function generate(program) {
  // When generating code for statements, we'll accumulate the lines of
  // the target code here. When we finish generating, we'll join the lines
  // with newlines and return the result.
  const output = []

  // Variable mapping to ensure consistent naming
  const nameMap = new Map()

  // Variable and function names in JS will be suffixed with _1, _2, _3, etc.
  const targetName = entity => {
    // For identical variable references, we need to return the same target name
    // Fix: store and retrieve variable references by name
    if (!nameMap.has(entity.name)) {
      nameMap.set(entity.name, nameMap.size + 1)
    }
    return `${entity.name}_${nameMap.get(entity.name)}`
  }

  const gen = node => generators?.[node?.kind]?.(node) ?? node

  const generators = {
    // Key idea: when generating an expression, just return the JS string; when
    // generating a statement, write lines of translated JS to the output array.
    Program(p) {
      p.statements.forEach(gen)
    },

    VariableDeclaration(d) {
      output.push(`let ${gen(d.variable)} = ${d.initializer};`)
    },

    FunctionDeclaration(d) {
      const functionName = gen(d.fun)
      const params = d.fun.params.map(gen).join(", ")
      output.push(`function ${functionName}(${params}) {`)
      d.fun.body.forEach(gen)
      output.push("}")
    },

    Increment(s) {
      output.push(`${gen(s.variable)}++;`)
    },
    Decrement(s) {
      output.push(`${gen(s.variable)}--;`)
    },

    Variable(v) {
      return targetName(v)
    },

    Function(f) {
      return targetName(f)
    },

    Parameter(p) {
      return targetName(p)
    },

    BreakStatement(s) {
      output.push("break;")
    },

    ReturnStatement(s) {
      if (s.expression) {
        output.push(`return ${gen(s.expression)};`)
      } else {
        output.push("return;")
      }
    },

    Print(s) {
      output.push(`console.log(${s.expressions.map(gen).join(", ")});`)
    },

    IfStatement(s) {
      output.push(`if (${gen(s.test)}) {`)
      s.consequent.forEach(gen)
      if (s.alternate?.kind?.endsWith?.("IfStatement")) {
        output.push("} else")
        gen(s.alternate)
      } else {
        output.push("} else {")
        console.log(s.alternate)
        s.alternate.forEach(gen)
        output.push("}")
      }
    },

    ForRangeStatement(s) {
      const i = targetName(s.iterator)
      const op = s.op === "..." ? "<=" : "<"
      output.push(`for (let ${i} = ${gen(s.low)}; ${i} ${op} ${gen(s.high)}; ${i}++) {`)
      s.body.forEach(gen)
      output.push("}")
    },

    ForStatement(s) {
      output.push(`for (let ${gen(s.iterator)} of ${gen(s.collection)}) {`)
      s.body.forEach(gen)
      output.push("}")
    },

    BinaryExpression(e) {
      const left = gen(e.left)
      const right = gen(e.right)

      // Map SnackScript operators to JavaScript operators
      const operators = {
        "==": "===",
        "!=": "!==",
      }

      const op = operators[e.op] || e.op

      return `(${left} ${op} ${right})`
    },

    UnaryExpression(e) {
      const x = gen(e.operand)
      if (e.op === 'print') {
        output.push(`console.log(${x});`)
      }
      return `(${e.op}${x})`
    },

    IntegerLiteral(e) {
      return e.value.toString()
    },

    StringLiteral(e) {
      return JSON.stringify(e.value)
    },

    BooleanLiteral(e) {
      return e.value.toString()
    },
  }

  gen(program)
  return output.join("\n")
}
