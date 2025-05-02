// The code generator exports a single function, generate(program), which
// accepts a program representation and returns the JavaScript translation
// as a string.

export default function generate(program) {
  // When generating code for statements, we'll accumulate the lines of
  // the target code here. When we finish generating, we'll join the lines
  // with newlines and return the result.
  const output = []

  // Variable mapping to ensure consistent naming
  const nameMap = new Map();
  
  // Variable and function names in JS will be suffixed with _1, _2, _3, etc.
  const targetName = entity => {
    // For identical variable references, we need to return the same target name
    // Fix: store and retrieve variable references by name
    if (!nameMap.has(entity.name)) {
      nameMap.set(entity.name, nameMap.size + 1);
    }
    return `${entity.name}_${nameMap.get(entity.name)}`;
  };

  const gen = node => generators?.[node?.kind]?.(node) ?? node;

  const generators = {
    // Key idea: when generating an expression, just return the JS string; when
    // generating a statement, write lines of translated JS to the output array.
    Program(p) {
      p.statements.forEach(gen);
    },
    
    VariableDeclarations(d) {
      for (const declaration of d.declarations) {
        let initializer;
        if (declaration.initializer) {
          initializer = gen(declaration.initializer);
        } 
        output.push(`let ${gen(declaration.variable)} = ${initializer};`);
      }
    },
    
    FunctionDeclaration(d) {
      const functionName = gen(d.function);
      const params = d.function.parameters.map(gen).join(", ");
      output.push(`function ${functionName}(${params}) {`);
      d.function.body.forEach(gen);
      output.push("}");
    },
    
    Variable(v) {
      
      return targetName(v);
    },
    
    Function(f) {
      return targetName(f);
    },
    
    Parameter(p) {
      return targetName(p);
    },
    
    ReturnStatement(s) {
      if (s.expression) {
        output.push(`return ${gen(s.expression)};`);
      } 
    },
    
    PrintStatement(s) {
      const args = s.expressions.map(gen).join(", ");
      output.push(`console.log(${args});`);
    },
    
    IfStatement(s) {
      output.push(`if (${gen(s.condition)}) {`);
      s.body.forEach(gen);
      
      if (s.elsePart) {
        output.push("} else {");
        s.elsePart.forEach(gen);
      }
      
      output.push("}");
    },
    
    ForEach(s) {
      const collection = s.collection;
      const variables = s.variables.map(gen);
      
      if (variables.length === 1) {
        // Simple for...of loop
        output.push(`for (const ${variables[0]} of ${collection}) {`);
      } 
      
      s.body.forEach(gen);
      output.push("}");
    },
    
    BinaryExpression(e) {
      const left = gen(e.left);
      const right = gen(e.right);
      
      // Map SnackScript operators to JavaScript operators
      const operators = {
        "==": "===",
        "!=": "!==",
      };
      
      const op = operators[e.op] || e.op;
      
      return `(${left} ${op} ${right})`;
    },
    
    IntegerLiteral(e) {
      return e.value.toString();
    },
    
    StringLiteral(e) {
      return JSON.stringify(e.value);
    },
    
    BooleanLiteral(e) {
      return e.value.toString();
    },
  };

  gen(program);
  return output.join("\n");
}