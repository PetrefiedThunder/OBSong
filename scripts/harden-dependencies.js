const fs = require('fs');
const path = require('path');

function patchFile(targetPath, applyPatch) {
  if (!fs.existsSync(targetPath)) {
    console.warn(`[harden-dependencies] Skipping ${targetPath} (not found)`);
    return;
  }

  const source = fs.readFileSync(targetPath, 'utf8');
  const updated = applyPatch(source);

  if (updated === source) {
    console.warn(`[harden-dependencies] No changes applied to ${targetPath}; please review manually.`);
    return;
  }

  fs.writeFileSync(targetPath, updated, 'utf8');
  console.log(`[harden-dependencies] Patched ${targetPath}`);
}

function patchIpPublicGuard() {
  const ipPaths = fs
    .readdirSync(path.join(process.cwd(), 'node_modules', '.pnpm'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('ip@'))
    .map((entry) =>
      path.join(process.cwd(), 'node_modules', '.pnpm', entry.name, 'node_modules', 'ip', 'lib', 'ip.js')
    );

  ipPaths.forEach((targetPath) => {
    patchFile(targetPath, (source) => {
      if (source.includes('STRICT_PUBLIC_IP_GUARD')) {
        return source;
      }

      const marker = 'ip.isPublic = function (addr) {';
      if (!source.includes(marker)) {
        return source;
      }

      const replacement =
        "ip.isPublic = function (addr) {\n" +
        "  // STRICT_PUBLIC_IP_GUARD\n" +
        "  if (ip.isPrivate(addr) || ip.isLoopback(addr)) {\n" +
        "    return false;\n" +
        "  }\n\n" +
        "  try {\n" +
        "    const normalized = ip.toBuffer(addr);\n" +
        "    if (normalized.length === 4) {\n" +
        "      const firstOctet = normalized[0];\n" +
        "      if (firstOctet === 0 || (firstOctet >= 224 && firstOctet <= 239)) {\n" +
        "        return false;\n" +
        "      }\n" +
        "    } else if (normalized.length === 16) {\n" +
        "      const firstWord = (normalized[0] << 8) | normalized[1];\n" +
        "      if (firstWord === 0 || (firstWord & 0xff00) === 0xff00 || (firstWord & 0xfe00) === 0xfc00) {\n" +
        "        return false;\n" +
        "      }\n" +
        "    }\n" +
        "  } catch (error) {\n" +
        "    console.warn('[harden-dependencies] Unable to normalize IP address', error);\n" +
        "    return false;\n" +
        "  }\n\n" +
        "  return true;\n" +
        "};";

      return source.replace(marker + '\n  return !ip.isPrivate(addr);\n};', replacement);
    });
  });
}

function patchGlobCliGuard() {
  const globPaths = [
    path.join(process.cwd(), 'node_modules', '.pnpm', 'glob@10.3.10', 'node_modules', 'glob', 'dist', 'esm', 'bin.mjs'),
    path.join(process.cwd(), 'node_modules', '.pnpm', 'glob@7.2.3', 'node_modules', 'glob', 'dist', 'esm', 'bin.mjs'),
    path.join(process.cwd(), 'node_modules', '.pnpm', 'glob@7.1.6', 'node_modules', 'glob', 'dist', 'esm', 'bin.mjs'),
  ];

  globPaths.forEach((targetPath) => {
    patchFile(targetPath, (source) => {
      if (source.includes('GLOB_CLI_CMD_GUARD')) {
        return source;
      }

      const insertHook = "import { globStream } from './index.js';";
      if (!source.includes(insertHook)) {
        return source;
      }

      const guard =
        "const disallowedFlags = ['-c', '--cmd'];\n" +
        "if (process.argv.slice(2).some((arg) => disallowedFlags.includes(arg.split('=')[0]))) {\n" +
        "  console.error('[glob] Command execution flags are disabled for security reasons.');\n" +
        "  process.exit(1);\n" +
        "}\n\n";

      return source.replace(insertHook + '\n/* c8 ignore start */', insertHook + '\n' + guard + '/* c8 ignore start */');
    });
  });
}

patchIpPublicGuard();
patchGlobCliGuard();
