const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { findJdk17Home, jdk17InstallHint } = require('./lib/find-jdk');

const root = path.resolve(__dirname, '..');
const androidDir = path.join(root, 'apps/mobile/android');

const javaHome = findJdk17Home();

if (!javaHome) {
  console.error('Android release build requires JDK 17. Set JAVA_HOME to a JDK 17 install.');
  console.error(jdk17InstallHint());
  process.exit(1);
}

console.log(`Using JAVA_HOME=${javaHome}`);

// './gradlew' isn't directly executable on Windows — use the batch wrapper there.
const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';

const result = spawnSync(gradlew, ['bundleRelease'], {
  cwd: androidDir,
  env: {
    ...process.env,
    JAVA_HOME: javaHome,
    PATH: `${path.join(javaHome, 'bin')}${path.delimiter}${process.env.PATH || ''}`,
  },
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
