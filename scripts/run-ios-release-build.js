const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const iosDir = path.join(root, 'apps/mobile/ios');

const args = [
  '-workspace',
  'TopoSonics.xcworkspace',
  '-scheme',
  'TopoSonics',
  '-configuration',
  'Release',
  '-sdk',
  'iphoneos',
  '-archivePath',
  'build/TopoSonics.xcarchive',
  'archive',
];

if (process.env.IOS_DEVELOPMENT_TEAM) {
  args.push(`DEVELOPMENT_TEAM=${process.env.IOS_DEVELOPMENT_TEAM}`);
  args.push('CODE_SIGN_STYLE=Automatic');
}

const result = spawnSync('xcodebuild', args, {
  cwd: iosDir,
  env: process.env,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
