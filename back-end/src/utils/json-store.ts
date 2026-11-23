import * as fs from 'fs';
import * as path from 'path';

/**
 * Lightweight JSON file persistence for the in-memory repositories.
 *
 * Each repository keeps its data in memory (fast, simple) and registers it here.
 * On startup the data is loaded from  data/db/<name>.json  (or seeded from the
 * repository's built-in defaults the first time). Changes are written back to disk
 * after every request and every few seconds, using an atomic write
 * (write temp file, then rename) so a crash cannot leave a half-written file.
 *
 * Delete the data/db folder to reset the app to its seed data.
 */
const DB_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data', 'db');

interface Tracked {
  get: () => unknown;
  lastWritten: string;
}

const tracked = new Map<string, Tracked>();

function filePath(name: string): string {
  return path.join(DB_DIR, `${name}.json`);
}

function writeAtomic(name: string, serialized: string): void {
  const target = filePath(name);
  const tmp = `${target}.tmp`;
  fs.writeFileSync(tmp, serialized, 'utf-8');
  fs.renameSync(tmp, target);
}

/**
 * Load a collection from disk (or fall back to `seed`) and start tracking it.
 * `get` must always return the CURRENT value (repositories may reassign their arrays).
 * `set` receives the loaded value so the repository can adopt it.
 */
export function attachStore<T>(
  name: string,
  seed: T,
  get: () => T,
  set: (value: T) => void,
): void {
  fs.mkdirSync(DB_DIR, { recursive: true });
  const file = filePath(name);

  let value: T = seed;
  let lastWritten = '';

  if (fs.existsSync(file)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
      if (Array.isArray(seed) && !Array.isArray(parsed)) {
        throw new Error('expected an array');
      }
      value = parsed as T;
      lastWritten = JSON.stringify(value, null, 2);
    } catch (err) {
      // Corrupt file: keep a copy for inspection and start again from the seed data.
      const backup = `${file}.corrupt-${Date.now()}`;
      try {
        fs.renameSync(file, backup);
      } catch {
        /* ignore */
      }
      console.warn(`[json-store] ${name}.json was unreadable (${(err as Error).message}); backed up to ${path.basename(backup)} and re-seeded.`);
    }
  }

  set(value);
  tracked.set(name, { get, lastWritten });
  flushOne(name); // writes the seed on first run
}

function flushOne(name: string): void {
  const entry = tracked.get(name);
  if (!entry) return;
  try {
    const serialized = JSON.stringify(entry.get(), null, 2);
    if (serialized !== entry.lastWritten) {
      writeAtomic(name, serialized);
      entry.lastWritten = serialized;
    }
  } catch (err) {
    console.error(`[json-store] failed to save ${name}:`, (err as Error).message);
  }
}

/** Write every tracked collection that changed since it was last saved. */
export function flushAll(): void {
  for (const name of tracked.keys()) flushOne(name);
}

let hooksInstalled = false;

/** Save on a timer and when the process stops. Safe to call more than once. */
export function installPersistenceHooks(): void {
  if (hooksInstalled) return;
  hooksInstalled = true;
  const timer = setInterval(flushAll, 3000);
  timer.unref();
  process.on('exit', flushAll);
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      flushAll();
      process.exit(0);
    });
  }
}
