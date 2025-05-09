export function program(statements) {
  return { kind: "Program", statements }
}

export function variableDeclaration(variable, initializer) {
  return { kind: "VariableDeclaration", variable, initializer }
}

export function variable(name, type) {
  return { kind: "Variable", name, type }
}

export const booleanType = "🧈"
export const intType = "🍳"
export const floatType = "🍳"
export const stringType = "🍝"
export const voidType = "🥮"
export const anyType = "🍚"

export function functionDeclaration(fun) {
  return { kind: "FunctionDeclaration", fun }
}

export function fun(name, params, body, type) {
  return { kind: "Function", name, params, body, type }
}

export function intrinsicFunction(name, type) {
  return { kind: "Function", name, type, intrinsic: true }
}

export function arrayType(baseType) {
  return { kind: "ArrayType", baseType }
}

export function dictType(keyType, valueType) {
  return { kind: "DictType", keyType, valueType }
}

export function functionType(paramTypes, returnType) {
  return { kind: "FunctionType", paramTypes, returnType }
}

export function increment(variable) {
  return { kind: "Increment", variable }
}

export function decrement(variable) {
  return { kind: "Decrement", variable }
}

export function assignment(target, source) {
  return { kind: "Assignment", target, source }
}

export function addAssignment(target, source) {
  return { kind: "AddAssignment", target, source }
}

export const breakStatement = { kind: "BreakStatement" }

export function returnStatement(expression) {
  return { kind: "ReturnStatement", expression }
}

export function ifStatement(test, consequent, alternate) {
  return { kind: "IfStatement", test, consequent, alternate }
}

export function whileStatement(test, body) {
  return { kind: "WhileStatement", test, body }
}

export function forRangeStatement(iterator, low, op, high, body) {
  return { kind: "ForRangeStatement", iterator, low, op, high, body }
}

export function forLoop(iterator, collection, body) {
  return { kind: "ForLoop", iterator, collection, body }
}

export function binary(op, left, right, type) {
  return { kind: "BinaryExpression", op, left, right, type }
}

export function unary(op, operand, type) {
  return { kind: "UnaryExpression", op, operand, type }
}

export function print(expressions) {
  return { kind: "Print", expressions }
}

export function emptyArray(type) {
  return { kind: "EmptyArray", type: arrayType(type) }
}

export function emptyOptional(type) {
  return { kind: "EmptyOptional", type }
}

export function forStatement(iterator, collection, body) {
  return { kind: "ForStatement", iterator, collection, body }
}

export function field(name, type) {
  return { kind: "Field", name, type }
}

export function typeDeclaration(fields) {
  return { kind: "TypeDeclaration", fields }
}

export function constructorCall(callee, args) {
  return { kind: "ConstructorCall", callee, args, type: callee.type }
}

export function arrayExpression(elements) {
  return {
    kind: "ArrayExpression",
    elements,
    type: arrayType(elements[0].type),
  }
}

export function tupleExpression(elements) {
  return {
    kind: "TupleExpression",
    elements,
    type: elements.map(element => element.type),
  }
}

export function dictExpression(elements) {
  return {
    kind: "DictExpression",
    elements,
    type: [dictType(elements[0].type), dictType(elements[1].type)],
  }
}

export function memberExpression(object, op, field) {
  return { kind: "MemberExpression", object, op, field, type: field.type }
}

export function functionCall(callee, args) {
  if (callee.intrinsic) {
    if (callee.type.paramTypes.length === 1) {
      return unary(callee.name, args[0], callee.type.returnType)
    } else {
      return binary(callee.name, args[0], args[1], callee.type.returnType)
    }
  }
  return { kind: "FunctionCall", callee, args, type: callee.type.returnType }
}

// These local constants are used to simplify the standard library definitions.
const floatToFloatType = functionType([floatType], floatType)
const floatFloatToFloatType = functionType([floatType, floatType], floatType)
const stringToIntsType = functionType([stringType], arrayType(intType))
const anyToVoidType = functionType([anyType], voidType)

export const standardLibrary = Object.freeze({
  int: intType,
  float: floatType,
  boolean: booleanType,
  string: stringType,
  void: voidType,
  any: anyType,
  π: variable("π", false, floatType),
  print: intrinsicFunction("print", anyToVoidType),
  sqrt: intrinsicFunction("sqrt", floatToFloatType),
  sin: intrinsicFunction("sin", floatToFloatType),
  cos: intrinsicFunction("cos", floatToFloatType),
  exp: intrinsicFunction("exp", floatToFloatType),
  ln: intrinsicFunction("ln", floatToFloatType),
  hypot: intrinsicFunction("hypot", floatFloatToFloatType),
  bytes: intrinsicFunction("bytes", stringToIntsType),
  codepoints: intrinsicFunction("codepoints", stringToIntsType),
})

// We want every expression to have a type property. But we aren't creating
// special entities for numbers, strings, and booleans; instead, we are
// just using JavaScript values for those. Fortunately we can monkey patch
// the JS classes for these to give us what we want.
String.prototype.type = stringType
Number.prototype.type = floatType
BigInt.prototype.type = intType
Boolean.prototype.type = booleanType
