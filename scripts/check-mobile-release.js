const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const mobileDir = path.join(root, 'apps/mobile');
const androidGradle = path.join(mobileDir, 'android/gradlew');
const iosWorkspace = path.join(mobileDir, 'ios/TopoSonics.xcworkspace');
const iosProject = path.join(mobileDir, 'ios/TopoSonics.xcodeproj/project.pbxproj');
const easConfig = path.join(mobileDir, 'eas.json');
const googleServiceAccount = path.join(mobileDir, 'credentials/google-service-account.json');

const failures = [];
const warnings = [];
const knownJdk17Homes = [
  process.env.JAVA_HOME,
  '/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home',
  '/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home',
].filter(Boolean);

function commandExists(command) {
  const result = spawnSync('sh', ['-lc', `command -v ${command}`], {
    stdio: 'ignore',
  });
  return result.status === 0;
}

function getJavaMajor() {
  const result = spawnSync('java', ['-version'], {
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

function getJavaMajorForHome(javaHome) {
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

function findJdk17Home() {
  return knownJdk17Homes.find((javaHome) => getJavaMajorForHome(javaHome) === 17) || null;
}

function hasAppleDevelopmentTeam() {
  if (process.env.IOS_DEVELOPMENT_TEAM) {
    return true;
  }

  if (!fs.existsSync(iosProject)) {
    return false;
  }

  const project = fs.readFileSync(iosProject, 'utf8');
  return /DEVELOPMENT_TEAM = [A-Z0-9]+;/.test(project);
}

if (!fs.existsSync(androidGradle)) {
  failures.push('Android Gradle wrapper is missing at apps/mobile/android/gradlew');
}

if (!process.env.ANDROID_HOME && !process.env.ANDROID_SDK_ROOT) {
  failures.push('ANDROID_HOME or ANDROID_SDK_ROOT must point at an Android SDK');
}

const javaMajor = getJavaMajor();
if (!javaMajor) {
  failures.push('Java is not available; install and select JDK 17 for Android release builds');
} else if (javaMajor !== 17) {
  const jdk17Home = findJdk17Home();
  if (jdk17Home) {
    warnings.push(`Current java major version is ${javaMajor}; Android release script will use JDK 17 at ${jdk17Home}`);
  } else {
    failures.push(`Android release builds require JDK 17; current java major version is ${javaMajor}`);
  }
}

if (!fs.existsSync(iosWorkspace)) {
  failures.push('iOS workspace is missing at apps/mobile/ios/TopoSonics.xcworkspace');
}

if (!hasAppleDevelopmentTeam()) {
  failures.push(
    'iOS signing is not configured; set DEVELOPMENT_TEAM in the Xcode project or pass IOS_DEVELOPMENT_TEAM for release archives'
  );
}

if (!commandExists('xcodebuild')) {
  failures.push('xcodebuild is not available; install Xcode command line tools for iOS release archives');
}

if (!fs.existsSync(easConfig)) {
  failures.push('EAS config is missing at apps/mobile/eas.json');
} else {
  const eas = JSON.parse(fs.readFileSync(easConfig, 'utf8'));
  const production = eas.build && eas.build.production;
  if (!production) {
    failures.push('apps/mobile/eas.json is missing build.production');
  } else {
    if (production.distribution !== 'store') {
      failures.push('EAS production profile must use distribution: "store"');
    }
    if (production.android?.buildType !== 'app-bundle') {
      failures.push('EAS production Android profile must build an app-bundle');
    }
    if (production.ios?.buildConfiguration !== 'Release') {
      failures.push('EAS production iOS profile must use Release buildConfiguration');
    }
  }
}

if (!commandExists('eas')) {
  warnings.push('eas CLI is not installed globally; use `corepack pnpm dlx eas-cli ...` for EAS builds');
}

if (!fs.existsSync(googleServiceAccount)) {
  failures.push(
    'Google Play service-account JSON is missing at apps/mobile/credentials/google-service-account.json'
  );
}

if (failures.length > 0) {
  console.error('Mobile release prerequisite check failed:\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Mobile release prerequisites are present.');

if (warnings.length > 0) {
  console.log('\nWarnings:');
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

console.log('\nRelease build commands:');
console.log('- Android local AAB: corepack pnpm build:mobile:android:release');
console.log('- iOS local archive: corepack pnpm build:mobile:ios:release');
console.log('- Android EAS: cd apps/mobile && corepack pnpm dlx eas-cli build --platform android --profile production');
console.log('- iOS EAS: cd apps/mobile && corepack pnpm dlx eas-cli build --platform ios --profile production');
