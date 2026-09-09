const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const androidDir = path.join(root, 'apps/mobile/android');

const candidateJavaHomes = [
  process.env.JAVA_HOME,
  // macOS (Homebrew)
  '/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home',
  '/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home',
  // Linux (common distro / CI locations)
  '/usr/lib/jvm/java-17-openjdk-amd64',
  '/usr/lib/jvm/java-17-openjdk',
  '/usr/lib/jvm/temurin-17-jdk-amd64',
  '/opt/java/openjdk',
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

const javaHome = candidateJavaHomes.find((candidate) => getJavaMajor(candidate) === 17);

if (!javaHome) {
  console.error('Android release build requires JDK 17. Set JAVA_HOME to a JDK 17 install.');
  console.error(
    process.platform === 'darwin'
      ? 'macOS: `brew install openjdk@17`.'
      : 'Linux: install openjdk-17-jdk (e.g. `apt-get install openjdk-17-jdk`) or Temurin 17.'
  );
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
