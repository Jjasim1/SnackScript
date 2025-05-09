import * as core from "./core.js"

class Context {
  // Like most statically-scoped languages, Carlos contexts will contain a
  // map for their locally declared identifiers and a reference to the parent
  // context. The parent of the global context is null. In addition, the
  // context records whether analysis is current within a loop (so we can
  // properly check break statements), and reference to the current function
  // (so we can properly check return statements).
  constructor({ parent = null, locals = new Map(), inLoop = false, function: f = null }) {
    Object.assign(this, { parent, locals, inLoop, function: f })
  }
  add(name, entity) {
    this.locals.set(name, entity)
  }
  lookup(name) {
    return this.locals.get(name) || this.parent?.lookup(name)
  }
  static root() {
    return new Context({
      locals: new Map(Object.entries(core.standardLibrary)),
    })
  }
  newChildContext(props) {
    return new Context({ ...this, ...props, parent: this, locals: new Map() })
  }
}

export function emptyListOf() {
  return [];
}

export default function analyze(match) {
  // Track the context manually via a simple variable. The initial context
  // contains the mappings from the standard library. Add to this context
  // as necessary. When needing to descent into a new scope, create a new
  // context with the current context as its parent. When leaving a scope,
  // reset this variable to the parent context.
  let context = Context.root()

  // The single gate for error checking. Pass in a condition that must be true.
  // Use errorLocation to give contextual information about the error that will
  // appear: this should be an object whose "at" property is a parse tree node.
  // Ohm's getLineAndColumnMessage will be used to prefix the error message. This
  // allows any semantic analysis errors to be presented to an end user in the
  // same format as Ohm's reporting of syntax errors.
  function must(condition, message, errorLocation) {
    if (!condition) {
      const prefix = errorLocation.at.source.getLineAndColumnMessage()
      throw new Error(`${prefix}${message}`)
    }
  }

  // Next come a number of carefully named utility functions that keep the
  // analysis code clean and readable. Without these utilities, the analysis
  // code would be cluttered with if-statements and error messages. Each of
  // the utilities accept a parameter that should be an object with an "at"
  // property that is a parse tree node. This is used to provide contextual
  // information in the error message.

  function mustNotAlreadyBeDeclared(name, at) {
    must(!context.lookup(name), `Identifier ${name} already declared`, at)
  }

  function mustHaveBeenFound(entity, name, at) {
    must(entity, `Identifier ${name} not declared`, at)
  }

  function mustHaveNumericType(e, at) {
    const expectedTypes = [core.intType, core.floatType]
    must(expectedTypes.includes(e.type), "Expected a number", at)
  }

  function mustHaveNumericOrStringType(e, at) {
    const expectedTypes = [core.intType, core.floatType, core.stringType]
    must(expectedTypes.includes(e.type), "Expected a number or string", at)
  }

  function mustHaveBooleanType(e, at) {
    must(e.type === core.booleanType, `Expected a boolean, got ${e.type}`, at)
  }

  function mustHaveIterableType(e, at) {
    must(
      e.type?.kind === "ArrayType" || e.type?.kind === "DictType",
      `Expected an array or dict, got: ${e.name}`,
      at
    )
    }

  function mustBothHaveTheSameType(e1, e2, at) {
    must(
      equivalent(e1.type, e2.type),
      `Operands do not have the same type : ${e1.type}, ${e2.type}`,
      at
    )
  }

  function equivalent(t1, t2) {
    return (
      t1 === t2 ||
      (t1?.kind === "ArrayType" &&
        t2?.kind === "ArrayType" &&
        equivalent(t1.baseType, t2.baseType)) ||
      (t1?.kind === "FunctionType" &&
        t2?.kind === "FunctionType" &&
        equivalent(t1.returnType, t2.returnType) &&
        t1.paramTypes.every((t, i) => equivalent(t, t2.paramTypes[i])))
    )
  }

  function assignable(fromType, toType) {
    return (
      toType == core.anyType ||
      equivalent(fromType, toType) ||
      isFunctionTypeAssignable(fromType, toType)
    )
  }

  function isFunctionTypeAssignable(fromType, toType) {
    if (fromType?.kind !== "FunctionType" || toType?.kind !== "FunctionType") {
      return false;
    }
    
    if (fromType.paramTypes.length !== toType.paramTypes.length) {
      return false;
    }
  }

  function typeDescription(type) {
    if (typeof type === "string") return type
    if (type.kind == "ArrayType") return `[${typeDescription(type.baseType)}]`
  }

  function mustBeAssignable(e, { toType: type }, at) {
    const source = typeDescription(e.type)
    const target = typeDescription(type)
    const message = `Cannot assign a ${source} to a ${target}`
    must(assignable(e.type, type), message, at)
  }

  function mustBeInLoop(at) {
    must(context.inLoop, "Break can only appear in a loop", at)
  }

  function mustBeInAFunction(at) {
    must(context.function, "Return can only appear in a function", at)
  }

  function mustBeCallable(e, at) {
    const callable = e?.kind === "StructType" || e.type?.kind === "FunctionType"
    must(callable, `Call of non-function or non-constructor : ${e.name}`, at)
  }

  function mustNotReturnAnything(f, at) {
    const returnsNothing = f.type.returnType === core.voidType
    must(returnsNothing, "Something should be returned", at)
  }

  function mustHaveCorrectArgumentCount(argCount, paramCount, at) {
    const message = `${paramCount} argument(s) required but ${argCount} passed`
    must(argCount === paramCount, message, at)
  }

  // Building the program representation will be done together with semantic
  // analysis and error checking. In Ohm, we do this with a semantics object
  // that has an operation for each relevant rule in the grammar. Since the
  // purpose of analysis is to build the program representation, we will name
  // the operations "rep" for "representation". Most of the rules are straight-
  // forward except for those dealing with function and type declarations,
  // since types and functions need to be dealt with in two steps to allow
  // recursion.
  const builder = match.matcher.grammar.createSemantics().addOperation("rep", {
    Program(statements) {
      return core.program(statements.children.map(s => s.rep()))
    },

    Statement_function(_pot, id, _open, params, _close, block) {
      mustNotAlreadyBeDeclared(id.sourceString, { at: id })
      const fun = core.fun(id.sourceString)
      context.add(id.sourceString, fun)

      context = context.newChildContext({ inLoop: false, function: fun })

      fun.params = params.rep()

      const paramTypes = fun.params.map(param => param.type)
      fun.type = core.functionType(paramTypes, core.voidType)

      fun.body = block.rep()
      context = context.parent

      return core.functionDeclaration(fun)
    },

    // Simple function (no params): "🥘" id Block
    Statement_simplefunction(_pot, id, block) {
      mustNotAlreadyBeDeclared(id.sourceString, { at: id })
      const fun = core.fun(id.sourceString)
      context.add(id.sourceString, fun)

      context = context.newChildContext({ inLoop: false, function: fun })
      fun.params = []
      fun.type = core.functionType([], core.voidType)
      fun.body = block.rep()

      context = context.parent
      return core.functionDeclaration(fun)
    },

    // For loop: "🍥" "(" ForInit ")" Block
    Statement_forloop(_for, id, _in, exp1, op, exp2, block) {
      const [low, high] = [exp1.rep(), exp2.rep()]
      mustHaveNumericType(low, { at: exp1 })
      mustHaveNumericType(high, { at: exp2 })
      const iterator = core.variable(id.sourceString, core.intType)
      context = context.newChildContext({ inLoop: true })
      context.add(id.sourceString, iterator)
      const body = block.rep()
      context = context.parent
      return core.forRangeStatement(iterator, low, op.sourceString, high, body)
    },

    // Foreach loop: "🍥" ids "in" id Block
    Statement_foreach(_tempura, ids, _in, exp, block) {
      var collection = exp.rep()
      if (collection.kind == "MemberExpression") {
        collection = collection.object
      }
      mustHaveIterableType(collection, { at: exp })
      const idList = ids.children.flatMap(id => id.rep()) // Need asIteration
      let iterators
      if (collection.type.kind == "ArrayType") {
        iterators = idList.flatMap(id =>
          core.variable(id, false, collection.type.baseType)
        )
      } else {
        iterators = [
          core.variable(idList[0], collection.type.keyType),
          core.variable(idList[1], collection.type.valueType),
        ]
      }
      context = context.newChildContext({ inLoop: true })
      iterators.map(iterator => context.add(iterator.name, iterator))
      const body = block.rep()
      context = context.parent

      return core.forLoop(iterators, collection, body)
    },

    // While loop: "🍤" Exp Block
    Statement_while(_shrimp, exp, block) {
      const test = exp.rep()
      mustHaveBooleanType(test, { at: exp })
      context = context.newChildContext({ inLoop: true })
      const body = block.rep()
      context = context.parent
      return core.whileStatement(test, body)
    },

    // If statement: "🧁" Exp Block ElseIfPart* ElsePart?
    Statement_if(_cupcake, exp, block, elseIfs, elsePart) {
      const test = exp.rep()
      mustHaveBooleanType(test, { at: exp })

      context = context.newChildContext()
      const consequent = block.rep()
      context = context.parent

      const alternate =
        elseIfs.children.length > 0
          ? elseIfs.children
              .map(e => e.rep())
              .reduceRight((acc, curr) =>
                core.ifStatement(curr.test, curr.consequent, acc)
              )
          : elsePart.children.length > 0
          ? elsePart.rep()
          : null

      return core.ifStatement(test, consequent, alternate)
    },

    // ElseIf part: "🍰" Exp Block
    ElseIfPart(_cake, exp, block) {
      const test = exp.rep()
      mustHaveBooleanType(test, { at: exp })
      context = context.newChildContext()
      const consequent = block.rep()
      context = context.parent
      return { test, consequent }
    },

    // Else part: "🎂" Block
    ElsePart(_cake, block) {
      context = context.newChildContext()
      const alternate = block.rep()
      context = context.parent
      return alternate
    },

    // Print statement: "🍽️" ExpList
    Statement_print(_plate, expList) {
      const expressions = expList.asIteration().children.map(e => e.rep())
      return core.print(expressions)
    },

    // Return statement: "🫗" Exp | "🫗"
    Statement_return(_pour, exp) {
      mustBeInAFunction({ at: _pour })
      if (exp.children.length > 0) {
        const returnExp = exp.rep()
        return core.returnStatement(returnExp)
      } else {
        mustNotReturnAnything(context.function, { at: _pour })
        return core.shortReturnStatement
      }
    },

    // Break statement: "☕️"
    Statement_break(_coffee) {
      mustBeInLoop({ at: _coffee })
      return core.breakStatement
    },

    // Collection declaration: "🥡" id "=" CollectionLit
    Statement_collection(_takeout, id, _eq, collection) {
      mustNotAlreadyBeDeclared(id.sourceString, { at: id })
      const collectionNode = collection.rep()
      const variable = core.variable(id.sourceString, collectionNode.type)
      context.add(variable.name, variable)
      return core.variableDeclaration(variable, collectionNode)
    },

    // Comprehension: "🍱" id "=" "{" CompExp "}"
    Statement_comprehension(_bento, id, _eq, _open, compExp, _close) {
      mustNotAlreadyBeDeclared(id.sourceString, { at: id })
      const comprehension = compExp.rep()
      const idTypes = comprehension.ids.map(v => context.lookup(v).type)
      const variable = core.variable(
        id.sourceString,
        core.dictType(idTypes[0], idTypes[1])
      )
      context.add(variable.name, variable)
      return core.variableDeclaration(variable, comprehension)
    },

    // Single variable declaration: id ("=" Exp)?
    VarDecl(type, id, _eq, exp) {
      mustNotAlreadyBeDeclared(id.sourceString, { at: id })
      const initializer = exp.rep()
      const variable = core.variable(id.sourceString, type.rep())
      mustNotAlreadyBeDeclared(variable.name, { at: id })
      context.add(variable.name, variable)
      return core.variableDeclaration(variable, initializer)
    },

    // Assignment: DottedId "=" Exp
    Statement_assign(target, _eq, exp) {
      const source = exp.rep()
      const targetVar = target.rep()
      mustBeAssignable(source, { toType: targetVar.type }, { at: target })
      return core.assignment(targetVar, source)
    },

    // Add assignment: DottedId "+=" Exp
    Statement_addassign(target, _peq, exp) {
      const source = exp.rep()
      const targetVar = target.rep()
      mustBeAssignable(source, { toType: targetVar.type }, { at: target })
      return core.addAssignment(targetVar, source)
    },

    // Increment/Decrement: DottedId ("++" | "--")
    Statement_bump(target, op) {
      const targetVar = target.rep()
      mustHaveNumericType(targetVar, { at: target })
      return op.sourceString === "++"
        ? core.increment(targetVar)
        : core.decrement(targetVar)
    },

    // Function call: Primary_call ";"
    Statement_call(call) {
      return call.rep()
    },

    // Type definitions
    Type_bool(_butter) {
      return core.booleanType
    },
    Type_int(_egg) {
      return core.intType
    },

    Type_string(_pasta) {
      return core.stringType
    },
    Type_void(_mooncake) {
      return core.voidType
    },
    Type_any(_bread) {
      return core.anyType
    },

    // Block: ":" Statement+ ";"
    Block(_colon, statements, _semicolon) {
      return statements.children.map(s => s.rep())
    },

    // Binary expressions
    Exp_binary(left, op, right) {
      const [l, r] = [left.rep(), right.rep()]
      if (["<", "<=", ">", ">="].includes(op.sourceString)) {
        mustHaveNumericOrStringType(l, { at: left })
      }
      mustBothHaveTheSameType(l, r, { at: op })
      return core.binary(op.sourceString, l, r, core.booleanType)
    },

    Exp1_binary(left, op, right) {
      const [l, r] = [left.rep(), right.rep()]
      if (op.sourceString === "+") {
        mustHaveNumericOrStringType(l, { at: left })
      } else {
        mustHaveNumericType(l, { at: left })
      }
      mustBothHaveTheSameType(l, r, { at: op })
      return core.binary(op.sourceString, l, r, l.type)
    },

    Term_binary(exp1, mulOp, exp2) {
      const [left, op, right] = [exp1.rep(), mulOp.sourceString, exp2.rep()]
      mustHaveNumericType(left, { at: exp1 })
      mustBothHaveTheSameType(left, right, { at: mulOp })
      return core.binary(op, left, right, left.type)
    },

    // Primary expressions
    Primary_paren(_open, exp, _close) {
      return exp.rep()
    },

    // Function call: DottedId "(" (Exp ("," Exp)*)? ")"
    Primary_call(exp, open, expList, _close) {
      const callee = exp.rep()
      mustBeCallable(callee, { at: exp })
      const exps = expList.asIteration().children
      const targetTypes = callee.type.paramTypes
      mustHaveCorrectArgumentCount(exps.length, targetTypes.length, {
        at: open,
      })
      const args = exps.map((exp, i) => {
        const arg = exp.rep()
        return arg
      })
      return core.functionCall(callee, args)
    },

    Primary_id(id) {
      // When an id appears in an expression, it had better have been declared
      const entity = context.lookup(id.sourceString)
      mustHaveBeenFound(entity, id.sourceString, { at: id })
      return entity
    },

    // Literals
    BoolLit(_value) {
      if (this.sourceString === "🥗") {
        return true
      }
      return false
    },

    numeral(_digits, _decimal, _questionMark) {
      return Number(this.sourceString)
    },

    stringLit(_open, _chars, _close) {
      return this.sourceString
    },

    // Identifiers
    DottedId(exp, dot, id) {
      const object = exp.rep()
      if (object.type?.kind === "DictType") {
        return core.memberExpression(object, dot.sourceString, "items")
      } 
    },

    Params(params) {
      return params.rep()
    },

    EmptyListOf() {
      return emptyListOf();
    },

    NonemptyListOf(elem, _sep, elems) {
      return [elem.rep()].concat(elems.rep())
    },

    // Parameter item: type id
    ParamItem(type, id) {
      const param = core.variable(id.sourceString, type.rep())

      mustNotAlreadyBeDeclared(param.name, { at: id })
      context.add(param.name, param)
      return param
    },

    // Collection literals
    ArrayLit(_open, items, _close) {
      const elements = items.children.flatMap(i => i.rep())
      const elementType = elements.length > 0 ? elements[0].type : core.anyType
      return core.arrayExpression(elements, core.arrayType(elementType))
    },

    DictLit(_open, items, _close) {
      const entries = items.children.flatMap(i => i.rep())
      let keyType = core.anyType;
      let valueType = core.anyType;

      if (entries.length > 0) {
        keyType = entries[0].key.type;
        valueType = entries[0].value.type;
      }
      return core.dictExpression(entries, core.dictType(keyType, valueType))
    },

    // Dictionary item: Exp ":" Exp
    DictItem(key, _colon, value) {
      const k = key.rep()
      const v = value.rep()
      return { key: k, value: v }
    },

    // Array items (simple or tuple)
    ArrayItem(item) {
      return item.rep()
    },

    // Tuple item: "(" Exp ("," Exp)+ ")"
    TupleItem(_open, items, _close) {
      const elements = items.children.flatMap(i => i.rep())
      return core.tupleExpression(elements)
    },

    // Simple item (single expression)
    SimpleItem(exp) {
      return exp.rep()
    },

    // Comprehension: id ":" Exp "for" id "," id "in" id
    CompExp(key, _colon, value, _for, ids, _in, source) {
      const sourceVar = context.lookup(source.sourceString)
      const sourceTypes = sourceVar.type.baseType
      const referenceVars = ids.children.flatMap(id => id.rep())
      mustHaveCorrectArgumentCount(sourceTypes.length, referenceVars.length)

      for (let i = 0; i < sourceTypes.length; i++) {
        const variable = core.variable(referenceVars[i], sourceTypes[i])
        mustNotAlreadyBeDeclared(variable.name, { at: ids })
        context.add(variable.name, variable)
      }
      return {
        key: key.sourceString,
        value: value.rep(),
        ids: ids.rep(),
        source: source.sourceString,
      }
    },

    _iter(...children) {
      return children.map(child => child.rep())
    },

    id(_char, _chars) {
      return this.sourceString
    },
  })

  return builder(match).rep()
}
