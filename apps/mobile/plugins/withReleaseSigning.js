const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * React Native's default template signs *release* builds with the debug keystore, whose
 * password is publicly known. `expo prebuild` regenerates android/app/build.gradle from
 * that template, so hand-editing the file is not durable — every prebuild silently
 * restores debug signing and a release AAB built afterwards would be rejected by Play
 * (or, worse, shipped signed with a key anyone can forge).
 *
 * This plugin re-applies the guarded config on every prebuild:
 *   - a `release` signingConfig sourced from gradle/env properties, so the upload
 *     keystore never lives in the repo, and
 *   - a release buildType that uses it only when configured, and otherwise fails the
 *     build loudly rather than falling back to the debug keystore.
 *
 * Supply the properties via ~/.gradle/gradle.properties, an untracked
 * android/keystore.properties, or the ORG_GRADLE_PROJECT_* env vars used by CI/EAS:
 *   MYAPP_UPLOAD_STORE_FILE, MYAPP_UPLOAD_STORE_PASSWORD,
 *   MYAPP_UPLOAD_KEY_ALIAS, MYAPP_UPLOAD_KEY_PASSWORD
 * On EAS Build the guard stands down entirely (detected via the EAS_BUILD env var): EAS
 * injects its own signing config at task-graph time, i.e. after this block is evaluated, so
 * throwing here would break every EAS release build.
 */

const RELEASE_SIGNING_CONFIG = `        release {
            if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
                storeFile file(MYAPP_UPLOAD_STORE_FILE)
                storePassword MYAPP_UPLOAD_STORE_PASSWORD
                keyAlias MYAPP_UPLOAD_KEY_ALIAS
                keyPassword MYAPP_UPLOAD_KEY_PASSWORD
            }
        }
`;

const GUARDED_RELEASE_SIGNING = `            if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
                signingConfig signingConfigs.release
            } else if (System.getenv('EAS_BUILD') == 'true') {
                // EAS Build supplies its own credentials by injecting a signing config at
                // task-graph time, after this block is evaluated. Leave signingConfig unset
                // so that injection applies; failing here would break every EAS release.
            } else if (gradle.startParameter.taskNames.any { it.toLowerCase().contains('release') }) {
                throw new GradleException(
                    'Release build requested but no upload keystore is configured. Set ' +
                    'MYAPP_UPLOAD_STORE_FILE/_STORE_PASSWORD/_KEY_ALIAS/_KEY_PASSWORD ' +
                    '(see apps/mobile/plugins/withReleaseSigning.js) or build via EAS. ' +
                    'Refusing to sign a release with the debug keystore.')
            }`;

// The default template's release buildType line, which we replace with the guard above.
const DEFAULT_RELEASE_SIGNING = /^\s*signingConfig signingConfigs\.debug\s*$/m;

function addReleaseSigningConfig(gradle) {
  if (gradle.includes('MYAPP_UPLOAD_STORE_FILE')) {
    return gradle; // already applied
  }

  // Append a `release` block inside `signingConfigs { ... }`, right after the debug block.
  const debugBlock = gradle.match(
    /(signingConfigs\s*\{[\s\S]*?debug\s*\{[\s\S]*?\n\s*\}\n)/
  );
  if (!debugBlock) {
    throw new Error(
      'withReleaseSigning: could not find the debug signingConfig block in build.gradle'
    );
  }
  return gradle.replace(debugBlock[1], `${debugBlock[1]}${RELEASE_SIGNING_CONFIG}`);
}

function guardReleaseBuildType(gradle) {
  // Within `buildTypes { ... release { ... } }`, swap the template's debug-keystore line.
  const releaseBuildType = gradle.match(/(buildTypes\s*\{[\s\S]*?release\s*\{)([\s\S]*?)(\n\s*\})/);
  if (!releaseBuildType) {
    throw new Error('withReleaseSigning: could not find the release buildType in build.gradle');
  }

  const [full, head, body, tail] = releaseBuildType;
  if (body.includes('MYAPP_UPLOAD_STORE_FILE')) {
    return gradle; // already guarded
  }
  if (!DEFAULT_RELEASE_SIGNING.test(body)) {
    throw new Error(
      'withReleaseSigning: release buildType has an unexpected signingConfig; refusing to patch'
    );
  }

  const guarded = body.replace(DEFAULT_RELEASE_SIGNING, GUARDED_RELEASE_SIGNING);
  return gradle.replace(full, `${head}${guarded}${tail}`);
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('withReleaseSigning: expected a Groovy build.gradle');
    }
    cfg.modResults.contents = guardReleaseBuildType(
      addReleaseSigningConfig(cfg.modResults.contents)
    );
    return cfg;
  });
};
