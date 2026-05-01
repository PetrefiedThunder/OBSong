const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const androidDir = path.join(root, 'apps/mobile/android');

const signingEnv = [
  'ANDROID_KEYSTORE_PATH',
  'ANDROID_KEYSTORE_PASSWORD',
  'ANDROID_KEY_ALIAS',
  'ANDROID_KEY_PASSWORD',
];

const candidateJavaHomes = [
  process.env.JAVA_HOME,
  '/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home',
  '/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home',
].filter(Boolean);

function getJavaMajor(javaHome) {
  const java = path.join(javaHome, 'bin/java');
  if (!fs.existsSync(java)) {
    return null;
  }

  const result = spawnSync(java, ['-version'], {
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    return null;
  }

  const output = `${result.stderr}\n${result.stdout}`;
  const match = output.match(/version "(\d+)(?:\.(\d+))?/);
  if (!match) {
    return null;
  }

  const first = Number.parseInt(match[1], 10);
  const second = match[2] ? Number.parseInt(match[2], 10) : null;
  return first === 1 && second ? second : first;
}

const missingSigningEnv = signingEnv.filter((name) => !process.env[name]);
if (missingSigningEnv.length > 0) {
  console.error('Android release build requires a non-debug signing key.');
  console.error(`Missing env: ${missingSigningEnv.join(', ')}`);
  console.error(
    'Set ANDROID_KEYSTORE_PATH, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, and ANDROID_KEY_PASSWORD.'
  );
  process.exit(1);
}

if (!fs.existsSync(process.env.ANDROID_KEYSTORE_PATH)) {
  console.error(`ANDROID_KEYSTORE_PATH does not exist: ${process.env.ANDROID_KEYSTORE_PATH}`);
  process.exit(1);
}

const javaHome = candidateJavaHomes.find((candidate) => getJavaMajor(candidate) === 17);

if (!javaHome) {
  console.error('Android release build requires JDK 17.');
  console.error('Install it with `brew install openjdk@17`, then rerun this command.');
  process.exit(1);
}

console.log(`Using JAVA_HOME=${javaHome}`);

const result = spawnSync('./gradlew', ['bundleRelease'], {
  cwd: androidDir,
  env: {
    ...process.env,
    JAVA_HOME: javaHome,
    PATH: `${path.join(javaHome, 'bin')}:${process.env.PATH || ''}`,
  },
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
