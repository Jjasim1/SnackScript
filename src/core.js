export function program(statements) {
  return { kind: "Program", statements }
}

export function snackClass(name) {
  return { kind: "Class", name, methods: [] }
}

export function classDeclaration(classEntity) {
  return { kind: "ClassDeclaration", "class": classEntity }
}

export function snackFunction(name) {
  return { kind: "Function", name, parameters: [], body: [] }
}

export function parameter(name, byRef = false) {
  return { kind: "Parameter", name, byRef };
}

export function functionDeclaration(func) {
  return { kind: "FunctionDeclaration", function: func }
}

export function variable(name, mutable) {
  return { kind: "Variable", name, mutable }
}

export function variableDeclarations(declarations) {
  return { kind: "VariableDeclarations", declarations }
}

export function array(name, items) {
  return { kind: "Collection", collectionType: "Array", name, items }
}

export function dictionary(name, entries) {
  return { kind: "Collection", collectionType: "Dictionary", name, entries }
}

export function tuple(items) {
  return { kind: "Tuple", items }
}

export function collectionDeclaration(id, collection) {
  return { kind: "CollectionDeclaration", id, collection }
}

export function ifStatement(condition, body, elseIfs, elsePart) {
  return { kind: "IfStatement", condition, body, elseIfs, elsePart }
}

export function forLoop(variable, start, end, step, body) {
  return { kind: "ForLoop", variable, start, end, step, body }
}

export function forEach(variables, collection, useValues, body) {
  return { kind: "ForEach", variables, collection, useValues, body }
}

export function binary(op, left, right) {
  return { kind: "BinaryExpression", op, left, right }
}

export function integer(value) {
  return { kind: "IntegerLiteral", value }
}

export function string(value) {
  return { kind: "StringLiteral", value }
}

export function assignment(target, value) {
  return { kind: "Assignment", target, value }
}

export function addAssignment(target, value) {
  return { kind: "AddAssignment", target, value }
}

export function returnStatement(expression) {
  return { kind: "ReturnStatement", expression }
}

export function printStatement(expressions) {
  return { kind: "PrintStatement", expressions }
}

export function callStatement(call) {
  return { kind: "CallStatement", call }
}

export function functionCall(callee, args) {
  return { kind: "FunctionCall", callee, args }
}

export const standardLibrary = Object.freeze({
  print: {
    kind: "BuiltInFunction",
    name: "print"
  },
  
  len: {
    kind: "BuiltInFunction",
    name: "len"
  },
  
  str: {
    kind: "BuiltInFunction",
    name: "str"
  },
  
  num: {
    kind: "BuiltInFunction",
    name: "num"
  },
  
  PI: {
    kind: "Constant",
    name: "PI",
    value: 3.14159
  },
  
  TRUE: {
    kind: "Constant",
    name: "TRUE",
    value: true
  },
  
  FALSE: {
    kind: "Constant",
    name: "FALSE",
    value: false
  }
});