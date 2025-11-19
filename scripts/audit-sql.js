#!/usr/bin/env node
/**
 * Lightweight SQL injection audit script.
 * Flags any direct calls to .query() that interpolate variables into SQL strings
 * via template literals or string concatenation instead of parameter placeholders.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const SRC_DIR = path.join(__dirname, '..', 'src');
const files = glob.sync(`${SRC_DIR}/**/*.js`, {
  ignore: ['**/node_modules/**']
});

const suspiciousCalls = [];

function isInterpolatedTemplate(node) {
  return node.type === 'TemplateLiteral' && node.expressions && node.expressions.length > 0;
}

function isDynamicString(node) {
  if (!node) return false;

  switch (node.type) {
    case 'TemplateLiteral':
      return isInterpolatedTemplate(node);
    case 'BinaryExpression':
      return true;
    case 'TaggedTemplateExpression':
      return true;
    case 'CallExpression':
      return true;
    default:
      return false;
  }
}

function getLocation(node) {
  if (!node || !node.loc) return { line: 0, column: 0 };
  return { line: node.loc.start.line, column: node.loc.start.column };
}

files.forEach((file) => {
  const code = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'unambiguous',
      plugins: ['jsx', 'classProperties', 'dynamicImport', 'objectRestSpread'],
      errorRecovery: true,
      allowReturnOutsideFunction: true
    });
  } catch (error) {
    console.error(`⚠️  Skipping ${file} (parse error): ${error.message}`);
    return;
  }

  traverse(ast, {
    CallExpression(path) {
      const { node } = path;
      const callee = node.callee;
      if (!callee || callee.type !== 'MemberExpression') return;

      const property = callee.property;
      const calleeName = property && (property.name || property.value);
      if (calleeName !== 'query') return;

      const [queryArg] = node.arguments;
      if (!queryArg) return;

      if (isDynamicString(queryArg)) {
        const loc = getLocation(queryArg);
        suspiciousCalls.push({ file, line: loc.line, column: loc.column });
      }
    }
  });
});

if (suspiciousCalls.length > 0) {
  console.error('\n🚨 Potential SQL injection risks detected:\n');
  suspiciousCalls.forEach((call) => {
    console.error(` - ${path.relative(process.cwd(), call.file)}:${call.line}:${call.column}`);
  });
  console.error(`\nFound ${suspiciousCalls.length} call(s) that build SQL dynamically. Review and parameterize them.`);
  process.exit(1);
}

console.log('✅ SQL audit passed: no dynamic string interpolation detected in direct database queries.');
