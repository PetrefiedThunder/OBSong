const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

const envFiles = [
  'apps/web/.env.local',
  'apps/api/.env',
  'apps/mobile/.env',
];

const required = {
  web: ['NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
  api: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  mobile: ['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'],
};

const placeholderPattern = /(your-|your_|example|localhost:3001|supabase-project)/i;

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((values, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return values;
      }

      const separator = trimmed.indexOf('=');
      if (separator === -1) {
        return values;
      }

      const key = trimmed.slice(0, separator).trim();
      const rawValue = trimmed.slice(separator + 1).trim();
      values[key] = rawValue.replace(/^['"]|['"]$/g, '');
      return values;
    }, {});
}

const loaded = envFiles.reduce((values, relativePath) => {
  return {
    ...values,
    ...parseEnvFile(path.join(root, relativePath)),
  };
}, {});

const env = {
  ...loaded,
  ...process.env,
};

const failures = [];

for (const [surface, keys] of Object.entries(required)) {
  for (const key of keys) {
    const value = env[key];

    if (!value) {
      failures.push(`${surface}: missing ${key}`);
      continue;
    }

    if (placeholderPattern.test(value)) {
      failures.push(`${surface}: ${key} still looks like a placeholder (${value})`);
    }
  }
}

if (env.AUTH_ENABLED && env.AUTH_ENABLED !== 'true') {
  failures.push('api: AUTH_ENABLED should be true for a production auth release');
}

if (failures.length > 0) {
  console.error('Release environment check failed:\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  console.error('\nPopulate apps/web/.env.local, apps/api/.env, and apps/mobile/.env or pass these values in CI.');
  process.exit(1);
}

console.log('Release environment check passed.');
