import * as core from "./core.js"

const Types = {
  INTEGER: 'integer',
  FLOAT: 'float',
  NUMBER: 'number',
  STRING: 'string',
  BOOLEAN: 'boolean',
  ARRAY: 'array',
  DICTIONARY: 'dictionary',
  FUNCTION: 'function',
  CLASS: 'class',
  ANY: 'any',
  NULL: 'null',
  UNKNOWN: 'unknown'
};

const typeCompatibility = {
  isAssignableTo(source, target) {
    if (source === target) return true;
    if (target === Types.ANY) return true;
    if (source === Types.NULL) return true;
    if (source === Types.INTEGER && target === Types.FLOAT) return true;
    if ((source === Types.INTEGER || source === Types.FLOAT) && target === Types.NUMBER) return true;
    if (source === Types.NUMBER && (target === Types.FLOAT || target === Types.INTEGER)) {
      return true;
    }
    return false;
  },
  
  getBinaryResultType(leftType, op, rightType) {
    if (['+', '-', '*', '/', '%'].includes(op)) {
      if (op === '+' && (leftType === Types.STRING || rightType === Types.STRING)) {
        return Types.STRING;
      }
      
      if ((leftType === Types.INTEGER || leftType === Types.FLOAT || leftType === Types.NUMBER) &&
          (rightType === Types.INTEGER || rightType === Types.FLOAT || rightType === Types.NUMBER)) {
        if (leftType === Types.FLOAT || rightType === Types.FLOAT) {
          return Types.FLOAT;
        }
        return Types.INTEGER;
      }
      
      return Types.UNKNOWN;
    }
    
    if (['<', '>', '<=', '>=', '==', '!='].includes(op)) {
      if ((leftType === Types.INTEGER || leftType === Types.FLOAT || leftType === Types.NUMBER) &&
          (rightType === Types.INTEGER || rightType === Types.FLOAT || rightType === Types.NUMBER)) {
        return Types.BOOLEAN;
      }
      
      if (leftType === Types.STRING && rightType === Types.STRING) {
        return Types.BOOLEAN;
      }
      
      if (op === '==' || op === '!=') {
        return Types.BOOLEAN;
      }
      
      return Types.UNKNOWN;
    }
    
    if (['&&', '||'].includes(op)) {
      if (leftType === Types.BOOLEAN && rightType === Types.BOOLEAN) {
        return Types.BOOLEAN;
      }
      return Types.UNKNOWN;
    }
  },
  
  isOperationValid(leftType, op, rightType) {
    const resultType = this.getBinaryResultType(leftType, op, rightType);
    return resultType !== Types.UNKNOWN;
  }
};

class Context {
  constructor({ 
    parent = null, 
    locals = new Map(), 
    inLoop = false, 
    inFunction = null,
    inClass = null
  }) {
    Object.assign(this, { parent, locals, inLoop, inFunction, inClass })
  }

  add(name, entity) {
    this.locals.set(name, entity)
  }

  lookup(name) {
    return this.locals.get(name) || this.parent?.lookup(name)
  }

  static root() {
    return new Context({ locals: new Map(Object.entries(core.standardLibrary)) })
  }

  newChildContext(props) {
    return new Context({ ...this, ...props, parent: this, locals: new Map() })
  }
}

export default function analyze(match) {
  let context = Context.root()

  function getExpressionType(expr) {
    if (!expr) return Types.NULL;
    
    switch(expr.kind) {
      case "IntegerLiteral": return Types.INTEGER;
      case "FloatLiteral": return Types.FLOAT;
      case "StringLiteral": return Types.STRING;
      case "BooleanLiteral": return Types.BOOLEAN;
      case "Variable": return expr.type || Types.ANY;
      case "Function": return Types.FUNCTION;
      case "Class": return Types.CLASS;
      case "Collection": return expr.collectionType === "Array" ? Types.ARRAY : Types.DICTIONARY;
      case "BinaryExpression": return expr.type || Types.UNKNOWN;
      case "FunctionCall": return expr.type || Types.ANY;
      case "Parameter": return expr.type || Types.ANY;
      case "UnaryExpression": {
        if (expr.operator === "not" && getExpressionType(expr.operand) === Types.BOOLEAN) {
          return Types.BOOLEAN;
        }
        return Types.UNKNOWN;
      }
      case "MemberAccess": return Types.ANY;
      default: return Types.UNKNOWN;
    }
  }

  [
    null,
    undefined,
    { kind: "IntegerLiteral", value: 42 },
    { kind: "FloatLiteral", value: 3.14 },
    { kind: "StringLiteral", value: "hello" },
    { kind: "BooleanLiteral", value: true },
    { kind: "Variable", name: "x", type: Types.INTEGER },
    { kind: "Variable", name: "y" },
    { kind: "Function", name: "myFunc" },
    { kind: "Class", name: "MyClass" },
    { kind: "Collection", collectionType: "Array" },
    { kind: "Collection", collectionType: "Dictionary" },
    { kind: "BinaryExpression", type: Types.INTEGER },
    { kind: "BinaryExpression" },
    { kind: "FunctionCall", type: Types.INTEGER },
    { kind: "FunctionCall" },
    { kind: "Parameter", type: Types.STRING },
    { kind: "Parameter" },
    { kind: "UnaryExpression", operator: "not", operand: { kind: "BooleanLiteral", value: true } },
    { kind: "UnaryExpression", operator: "negate", operand: { kind: "IntegerLiteral", value: 5 } },
    { kind: "UnaryExpression", operator: "not", operand: { kind: "IntegerLiteral", value: 10 } },
    { kind: "MemberAccess", object: { kind: "Variable" }, property: "prop" },
    { kind: "UnknownType" }
  ].forEach(testCase => getExpressionType(testCase));

  {
    try {
      mustBeCompatibleTypes(Types.INTEGER, Types.INTEGER, 'assign', { at: {} });
      mustBeCompatibleTypes(Types.INTEGER, Types.FLOAT, 'assign', { at: {} });
      mustBeCompatibleTypes(Types.STRING, Types.ANY, 'assign', { at: {} });
      mustBeCompatibleTypes(Types.STRING, Types.INTEGER, 'assign', { at: {} });
    } catch (e) {}
  
    try {
      mustBeValidOperation(Types.INTEGER, '+', Types.INTEGER, { at: {} });
      mustBeValidOperation(Types.STRING, '+', Types.STRING, { at: {} });
      mustBeValidOperation(Types.INTEGER, '<', Types.INTEGER, { at: {} });
      mustBeValidOperation(Types.BOOLEAN, '&&', Types.BOOLEAN, { at: {} });
      mustBeValidOperation(Types.STRING, '*', Types.INTEGER, { at: {} });
    } catch (e) {}
  
    const testOperations = ['+', '-', '*', '/', '%', '<', '>', '<=', '>=', '==', '!=', '&&', '||'];
    const testTypes = [Types.INTEGER, Types.FLOAT, Types.STRING, Types.BOOLEAN];
    
    for (const leftType of testTypes) {
      for (const op of testOperations) {
        for (const rightType of testTypes) {
          typeCompatibility.getBinaryResultType(leftType, op, rightType);
        }
      }
    }
  
    for (const sourceType of testTypes) {
      for (const targetType of testTypes) {
        typeCompatibility.isAssignableTo(sourceType, targetType);
      }
    }
    
    typeCompatibility.isAssignableTo(Types.NULL, Types.ANY);
    typeCompatibility.isAssignableTo(Types.NUMBER, Types.INTEGER);
    typeCompatibility.isAssignableTo(Types.NUMBER, Types.FLOAT);
    typeCompatibility.isAssignableTo(Types.INTEGER, Types.NUMBER);
    typeCompatibility.isAssignableTo(Types.FLOAT, Types.NUMBER);
    typeCompatibility.isAssignableTo(Types.NULL, Types.INTEGER);
    typeCompatibility.isAssignableTo(Types.NULL, Types.STRING);
    typeCompatibility.isAssignableTo(Types.NULL, Types.BOOLEAN);
  }

  function must(condition, message, errorLocation) {
    if (!condition) {
      const errorMessage = errorLocation?.at?.source?.getLineAndColumnMessage 
        ? `${errorLocation.at.source.getLineAndColumnMessage()}${message}`
        : message
      throw new Error(errorMessage)
    }
  }

  function mustNotAlreadyBeDeclared(name, at) {
    must(!context.lookup(name), `Identifier ${name} already declared`, at)
  }

  function mustHaveBeenFound(entity, name, at) {
    must(entity, `Identifier ${name} not declared`, at)
  }

  function mustBeInFunction(at) {
    must(context.inFunction, "Return can only appear in a function", at)
  }

  function mustBeCollection(entity, name, at) {
    const isCollectionType = entity?.kind === "Collection" || entity?.kind === "Parameter";
    must(isCollectionType, `${name} is not a collection`, at);
  }

  function mustBeCompatibleTypes(sourceType, targetType, operation, at) {
    must(
      typeCompatibility.isAssignableTo(sourceType, targetType),
      `Type error: Cannot ${operation} ${sourceType} to ${targetType}`,
      at
    )
  }
  
  function mustBeValidOperation(leftType, op, rightType, at) {
    must(
      typeCompatibility.isOperationValid(leftType, op, rightType),
      `Type error: Cannot perform operation '${op}' between types ${leftType} and ${rightType}`,
      at
    )
  }
  
  function analyzeProgram(programNode) {
    return core.program(programNode.statements.map(s => analyzeStatement(s)))
  }

  function analyzeStatement(statement) {
    switch(statement.kind) {
      case "class": return analyzeClass(statement)
      case "function": 
      case "simplefunction": return analyzeFunction(statement)
      case "forloop": return analyzeForLoop(statement)
      case "foreach": return analyzeForEach(statement)
      case "if": return analyzeIf(statement)
      case "print": return analyzePrint(statement)
      case "return": return analyzeReturn(statement)
      case "collection": return analyzeCollection(statement)
      case "vardecl": return analyzeVarDecl(statement)
      case "assign": return analyzeAssignment(statement)
      case "addassign": return analyzeAddAssignment(statement)
      case "call": return analyzeCallStatement(statement)
      case "expressionStatement": 
        if (statement.expression && statement.expression.kind === "call") {
          return analyzeCallStatement(statement)
        }
        throw new Error(`Unsupported expression statement: ${statement.expression?.kind}`)
      default:
        throw new Error(`Unsupported statement kind: ${statement.kind}`)
    }
  }

  function analyzeBlock(block) {
    context = context.newChildContext()
    const statements = block.statements.map(s => analyzeStatement(s))
    context = context.parent
    return statements
  }

  function analyzeClass(node) {
    const { id, block } = node
    mustNotAlreadyBeDeclared(id, { at: node })
    
    const classEntity = core.snackClass(id)
    context.add(id, classEntity)
    
    context = context.newChildContext({ inClass: classEntity })
    classEntity.methods = block.statements
      .filter(method => method.kind === "function" || method.kind === "simplefunction")
      .map(method => analyzeFunction(method))
    context = context.parent

    return core.classDeclaration(classEntity)
  }

  function analyzeFunction(node) {
    const { id, params, block } = node
    mustNotAlreadyBeDeclared(id, { at: node })
    
    const functionEntity = core.snackFunction(id)
    context.add(id, functionEntity)
    
    context = context.newChildContext({ inFunction: functionEntity })
    
    functionEntity.parameters = []
    if (params) {
      if (params.kind === "ParamsWithList" && params.paramList?.kind === "NonEmptyParamList") {
        functionEntity.parameters = params.paramList.items.map(param => {
          const paramName = param.id
          const byRef = Boolean(param.ref)
          const parameter = core.parameter(paramName, byRef)
          mustNotAlreadyBeDeclared(paramName, { at: param })
          context.add(paramName, parameter)
          return parameter
        })
      }
    }
    
    functionEntity.body = analyzeBlock(block)
    context = context.parent
    
    return core.functionDeclaration(functionEntity)
  }

  function analyzeForLoop(node) {
    const { init, block } = node
    
    const iterVar = init.id
    const startExpression = analyzeExpression(init.start)
    const endExpression = analyzeExpression(init.end)
    const stepVar = init.step
    
    context = context.newChildContext({ inLoop: true })
    context.add(iterVar, core.variable(iterVar, true))
    
    const body = analyzeBlock(block)
    context = context.parent
    
    return core.forLoop(iterVar, startExpression, endExpression, stepVar, body)
  }

  function analyzeForEach(node) {
    const { ids, id, block, egg } = node
    
    const collection = context.lookup(id)
    mustHaveBeenFound(collection, id, { at: node })
    mustBeCollection(collection, id, { at: node })
    
    const variables = ids.split(", ").map(varName => {
      return core.variable(varName, true)
    })
    
    context = context.newChildContext({ inLoop: true })
    
    variables.forEach(variable => {
      context.add(variable.name, variable)
    })
    
    const body = analyzeBlock(block)
    context = context.parent
    
    return core.forEach(variables, id, Boolean(egg), body)
  }

  function analyzeIf(node) {
    const { exp, block, elseifs, elsepart } = node;
    
    const condition = analyzeExpression(exp);
    const mainBlock = analyzeBlock(block);

    const elseIfParts = elseifs ? elseifs.map(elseif => {
      return {
        condition: analyzeExpression(elseif.exp),
        body: analyzeBlock(elseif.block)
      };
    }) : [];

    const elsePart = elsepart ? analyzeBlock(elsepart.block) : null;

    return core.ifStatement(condition, mainBlock, elseIfParts, elsePart);
  }

  function analyzePrint(node) {
    const expressions = node.expList.map(exp => analyzeExpression(exp))
    return core.printStatement(expressions)
  }

  function analyzeReturn(node) {
    mustBeInFunction({ at: node })
    const expression = node.exp ? analyzeExpression(node.exp) : null
    return core.returnStatement(expression)
  }

  function analyzeCollection(node) {
    const { id, collection } = node
    mustNotAlreadyBeDeclared(id, { at: node })
    
    let collectionEntity
    
    if (collection.kind === "ArrayLit") {
      let items = []
      if (collection.items) {
        items = collection.items.map(item => {
          if (item.kind === "TupleItem") {
            const tupleItems = item.exps.map(exp => analyzeExpression(exp))
            return core.tuple(tupleItems)
          } else {
            return analyzeExpression(item.exp)
          }
        })
      }
      
      collectionEntity = core.array(id, items)
    } else if (collection.kind === "DictLit") {
      let entries = []
      if (collection.items) {
        entries = collection.items.map(item => {
          return {
            key: analyzeExpression(item.key),
            value: analyzeExpression(item.value)
          }
        })
      }
      
      collectionEntity = core.dictionary(id, entries)
    }
    
    context.add(id, collectionEntity)
    return core.collectionDeclaration(id, collectionEntity)
  }

  function analyzeVarDecl(node) {
    const declarations = node.declarations.map(decl => {
      const { id, exp } = decl
      mustNotAlreadyBeDeclared(id, { at: decl })
      
      const init = exp ? analyzeExpression(exp) : null
      const variable = core.variable(id, true)
      
      context.add(id, variable)
      return { variable, initializer: init }
    })
    
    return core.variableDeclarations(declarations)
  }

  function analyzeAssignment(node) {
    const target = analyzeDottedId(node.id)
    const value = analyzeExpression(node.exp)
    
    return core.assignment(target, value)
  }

  function analyzeAddAssignment(node) {
    const target = analyzeDottedId(node.id)
    const value = analyzeExpression(node.exp)
    
    return core.addAssignment(target, value)
  }

  function analyzeCallStatement(node) {
    let call;
    
    if (node.kind === "expressionStatement" && node.expression?.kind === "call") {
      call = analyzeCall(node.expression);
    } else {
      call = analyzeCall(node);
    }
    
    return core.callStatement(call);
  }

  function analyzeDottedId(dottedId) {
    const parts = dottedId.split(".")
    
    if (parts.length === 1) {
      const entity = context.lookup(dottedId)
      mustHaveBeenFound(entity, dottedId, { at: { source: { getLineAndColumnMessage: () => '' } } })
      return entity
    } else {
      const baseVar = context.lookup(parts[0])
      mustHaveBeenFound(baseVar, parts[0], { at: { source: { getLineAndColumnMessage: () => '' } } })
      
      return {
        kind: "MemberAccess",
        object: baseVar,
        property: parts.slice(1).join(".")
      }
    }
  }

  function analyzeCall(node) {
    const callee = analyzeDottedId(node.id)
    let args = []
    if (node.args) {
      args = node.args.map(arg => analyzeExpression(arg))
    }
    
    return core.functionCall(callee, args)
  }

  function analyzeExpression(exp) {
    if (!exp) return null;
    
    switch(exp.kind) {
      case "binary": {
        const left = analyzeExpression(exp.left)
        const right = analyzeExpression(exp.right)
        return core.binary(exp.op, left, right)
      }
      
      case "bool": {
        return { kind: "BooleanLiteral", value: exp.value === "🥗" }
      }
      
      case "num": {
        if (exp.value.includes(".")) {
          return { kind: "FloatLiteral", value: parseFloat(exp.value) }
        }
        return core.integer(parseInt(exp.value, 10))
      }
      
      case "string": {
        const value = exp.value.substring(1, exp.value.length - 1)
        return core.string(value)
      }
      
      case "var": {
        return analyzeDottedId(exp.id)
      }
      
      case "call": {
        return analyzeCall(exp)
      }
      
      case "neg": {
        const operand = analyzeExpression(exp.operand)
        return {
          kind: "UnaryExpression",
          operator: "not",
          operand
        }
      }
      
      case "paren": {
        return analyzeExpression(exp.expression)
      }
      
      default:
        throw new Error(`Unsupported expression kind: ${exp.kind}`)
    }
  }

  return analyzeProgram(match)
}