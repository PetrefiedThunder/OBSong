const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
// Symlink resolution is on by default in modern Metro; setting it explicitly now
// diverges from expo/metro-config's recommended values (flagged by expo-doctor).
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
