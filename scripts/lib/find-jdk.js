// Cross-platform JDK 17 discovery for Android release builds.
// Shared by run-android-release-build.js and check-mobile-release.js.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function getJavaMajorForHome(javaHome) {
  if (!javaHome) {
    return null;
  }
  const java = path.join(
    javaHome,
    process.platform === 'win32' ? 'bin/java.exe' : 'bin/java'
  );
  if (!fs.existsSync(java)) {
    return null;
  }

  const result = spawnSync(java, ['-version'], { encoding: 'utf8' });
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

// Ask macOS for the system JDK 17 (works for non-Homebrew installs, e.g. Apple's or
// Temurin installers, which don't live under /opt/homebrew or /usr/local/opt).
function macosJavaHome() {
  if (process.platform !== 'darwin') {
    return null;
  }
  const result = spawnSync('/usr/libexec/java_home', ['-v', '17'], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    return null;
  }
  const javaHome = (result.stdout || '').trim();
  return javaHome && fs.existsSync(javaHome) ? javaHome : null;
}

function jdk17Candidates() {
  return [
    // Prefer an explicitly configured JAVA_HOME when it already points at JDK 17.
    process.env.JAVA_HOME,
    macosJavaHome(),
    // macOS (Homebrew, Apple Silicon + Intel)
    '/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home',
    '/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home',
    // Linux (common distro / CI locations)
    '/usr/lib/jvm/java-17-openjdk-amd64',
    '/usr/lib/jvm/java-17-openjdk',
    '/usr/lib/jvm/temurin-17-jdk-amd64',
    '/opt/java/openjdk',
  ].filter(Boolean);
}

function findJdk17Home() {
  return jdk17Candidates().find((candidate) => getJavaMajorForHome(candidate) === 17) || null;
}

function jdk17InstallHint() {
  if (process.platform === 'darwin') {
    return 'macOS: `brew install openjdk@17`, or any JDK 17 visible to /usr/libexec/java_home.';
  }
  if (process.platform === 'win32') {
    return 'Windows: install Temurin 17 (https://adoptium.net) and set JAVA_HOME to it.';
  }
  return 'Linux: install openjdk-17-jdk (e.g. `apt-get install openjdk-17-jdk`) or Temurin 17.';
}

module.exports = { findJdk17Home, getJavaMajorForHome, jdk17InstallHint };
