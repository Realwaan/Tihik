import { execFileSync } from 'node:child_process';

const windowsServices = [
  'postgresql-x64-16',
  'postgresql-x64-15',
  'postgresql-x64-14',
  'postgresql-x64-13',
];

const linuxServices = [
  'postgresql',
  'postgresql@16-main',
  'postgresql@15-main',
  'postgresql@14-main',
];

function run(command, args) {
  return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function isWindowsServiceRunning(serviceName) {
  try {
    const output = run('sc', ['query', serviceName]);
    return /STATE\s+:\s+4\s+RUNNING/i.test(output);
  } catch {
    return false;
  }
}

function startWindowsService(serviceName) {
  console.log(`[postgres] starting Windows service ${serviceName}...`);
  run('net', ['start', serviceName]);
}

function ensureWindowsPostgres() {
  for (const serviceName of windowsServices) {
    try {
      run('sc', ['query', serviceName]);
      if (isWindowsServiceRunning(serviceName)) {
        console.log(`[postgres] service ${serviceName} is already running`);
        return;
      }

      startWindowsService(serviceName);
      console.log(`[postgres] service ${serviceName} started`);
      return;
    } catch {
      continue;
    }
  }

  throw new Error(
    'No supported PostgreSQL Windows service was found. Run setup-postgresql.bat or start PostgreSQL manually before npm run dev.'
  );
}

function isLinuxServiceRunning(serviceName) {
  try {
    const output = run('systemctl', ['is-active', serviceName]).trim();
    return output === 'active';
  } catch {
    return false;
  }
}

function startLinuxService(serviceName) {
  console.log(`[postgres] starting service ${serviceName}...`);
  run('systemctl', ['start', serviceName]);
}

function ensureLinuxPostgres() {
  for (const serviceName of linuxServices) {
    if (isLinuxServiceRunning(serviceName)) {
      console.log(`[postgres] service ${serviceName} is already running`);
      return;
    }

    try {
      startLinuxService(serviceName);
      console.log(`[postgres] service ${serviceName} started`);
      return;
    } catch {
      continue;
    }
  }

  throw new Error(
    'Could not start PostgreSQL automatically. Start the PostgreSQL service manually, or use sudo/system service permissions that allow npm to manage the database service.'
  );
}

try {
  if (process.platform === 'win32') {
    ensureWindowsPostgres();
  } else if (process.platform === 'linux') {
    ensureLinuxPostgres();
  } else if (process.platform === 'darwin') {
    throw new Error(
      'macOS auto-start is not configured in this project. Start PostgreSQL manually or add a brew services launcher if you need it.'
    );
  } else {
    throw new Error(`Unsupported platform: ${process.platform}`);
  }
} catch (error) {
  console.error(`[postgres] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}