const fs = require('fs');
const path = require('path');

const targetPath = path.join(
  process.cwd(),
  'node_modules',
  '.pnpm',
  'node_modules',
  'node-forge',
  'lib',
  'asn1.js'
);

if (!fs.existsSync(targetPath)) {
  console.warn('[secure-node-forge] Skipping patch: node-forge not installed at expected path');
  process.exit(0);
}

const source = fs.readFileSync(targetPath, 'utf8');

if (source.includes('MAX_ASN1_DEPTH_GUARD')) {
  console.log('[secure-node-forge] Patch already applied');
  process.exit(0);
}

function insertMaxDepthDefault(input) {
  const hook = "  if(!('decodeBitStrings' in options)) {\n    options.decodeBitStrings = true;\n  }\n\n  // wrap in buffer if needed\n";
  const addition =
    "  if(!('maxDepth' in options)) {\n" +
    "    options.maxDepth = 200;\n" +
    "  }\n\n";
  if (!input.includes(hook)) {
    return input;
  }
  return input.replace(hook, addition + hook);
}

function insertDepthGuard(input) {
  const hook = 'function _fromDer(bytes, remaining, depth, options) {';
  const addition =
    '\n  // MAX_ASN1_DEPTH_GUARD\n' +
    '  if(typeof options.maxDepth === "number" && depth > options.maxDepth) {\n' +
    '    var error = new Error("ASN.1 input exceeds maximum depth.");\n' +
    '    error.depth = depth;\n' +
    '    error.maxDepth = options.maxDepth;\n' +
    '    throw error;\n' +
    '  }\n';
  if (!input.includes(hook)) {
    return input;
  }
  return input.replace(hook, hook + addition);
}

let updated = insertMaxDepthDefault(source);
updated = insertDepthGuard(updated);

if (updated === source) {
  console.warn('[secure-node-forge] Unable to update ASN.1 parser; manual review required');
  process.exit(1);
}

fs.writeFileSync(targetPath, updated, 'utf8');
console.log('[secure-node-forge] Applied maximum ASN.1 depth guard to node-forge');
