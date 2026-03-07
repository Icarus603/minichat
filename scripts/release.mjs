#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const tapDir = path.resolve(rootDir, '..', 'homebrew-tap');
const packageJsonPath = path.join(rootDir, 'package.json');
const versionTsPath = path.join(rootDir, 'src/shared/version.ts');
const localCaskPath = path.join(rootDir, 'packaging/homebrew/Casks/minichat.rb');
const tapCaskPath = path.join(tapDir, 'Casks/minichat.rb');

const usage = `Usage:
  bun run release -- patch [--notes "Release notes"] [--dry-run]
  bun run release -- minor [--notes "Release notes"] [--dry-run]
  bun run release -- major [--notes "Release notes"] [--dry-run]
  bun run release -- 1.2.3 [--notes "Release notes"] [--dry-run]
`;

function run(command, args, options = {}) {
  const cwd = options.cwd ?? rootDir;
  const quiet = options.quiet ?? false;
  if (!quiet) {
    console.log(`$ ${command} ${args.join(' ')}`);
  }

  return execFileSync(command, args, {
    cwd,
    stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    encoding: 'utf8',
  });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    throw new Error(`Invalid version: ${version}`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function bumpVersion(currentVersion, bump) {
  const { major, minor, patch } = parseVersion(currentVersion);

  if (bump === 'patch') {
    return `${major}.${minor}.${patch + 1}`;
  }

  if (bump === 'minor') {
    return `${major}.${minor + 1}.0`;
  }

  if (bump === 'major') {
    return `${major + 1}.0.0`;
  }

  parseVersion(bump);
  return bump;
}

function replaceVersionInTs(filePath, version) {
  const current = fs.readFileSync(filePath, 'utf8');
  const next = current.replace(
    /export const APP_VERSION = '[^']+';/,
    `export const APP_VERSION = '${version}';`,
  );

  if (current === next) {
    throw new Error(`Could not update APP_VERSION in ${filePath}`);
  }

  fs.writeFileSync(filePath, next);
}

function replaceCaskVersionAndSha(filePath, version, sha256) {
  const current = fs.readFileSync(filePath, 'utf8');
  const next = current
    .replace(/version "[^"]+"/, `version "${version}"`)
    .replace(/sha256 "[^"]+"/, `sha256 "${sha256}"`);

  if (current === next) {
    throw new Error(`Could not update cask metadata in ${filePath}`);
  }

  fs.writeFileSync(filePath, next);
}

function getSha256(filePath) {
  const output = run('shasum', ['-a', '256', filePath], { quiet: true }).trim();
  return output.split(/\s+/)[0];
}

function ensureCleanRepo(repoDir, label) {
  const status = run('git', ['status', '--short'], { cwd: repoDir, quiet: true }).trim();
  if (status) {
    throw new Error(`${label} has uncommitted changes.\n${status}`);
  }
}

function ensureCommandExists(command) {
  try {
    run('which', [command], { quiet: true });
  } catch {
    throw new Error(`Missing required command: ${command}`);
  }
}

function parseArgs(argv) {
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    console.log(usage);
    process.exit(0);
  }

  const releaseTarget = argv[0];
  let notes = '';
  let dryRun = false;

  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }

    if (arg === '--notes') {
      notes = argv[i + 1] ?? '';
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { releaseTarget, notes, dryRun };
}

function buildDefaultNotes(version) {
  return `## Changes\n- release ${version}\n`;
}

const { releaseTarget, notes, dryRun } = parseArgs(process.argv.slice(2));

ensureCommandExists('git');
ensureCommandExists('gh');
ensureCommandExists('shasum');
ensureCommandExists('bun');

const packageJson = readJson(packageJsonPath);
const currentVersion = packageJson.version;
const nextVersion = bumpVersion(currentVersion, releaseTarget);
const releaseTag = `v${nextVersion}`;
const releaseNotes = notes || buildDefaultNotes(nextVersion);
const artifactPath = path.join(rootDir, 'release', `minichat-${nextVersion}-macos-arm64.zip`);

if (dryRun) {
  console.log(`Current version: ${currentVersion}`);
  console.log(`Next version: ${nextVersion}`);
  console.log(`Tag: ${releaseTag}`);
  console.log(`Artifact: ${artifactPath}`);
  console.log(`Tap repo: ${tapDir}`);
  process.exit(0);
}

ensureCleanRepo(rootDir, 'minichat repo');
ensureCleanRepo(tapDir, 'homebrew-tap repo');

packageJson.version = nextVersion;
writeJson(packageJsonPath, packageJson);
replaceVersionInTs(versionTsPath, nextVersion);

run('bun', ['run', 'test']);
run('bash', ['scripts/build-release.sh']);

const sha256 = getSha256(artifactPath);
replaceCaskVersionAndSha(localCaskPath, nextVersion, sha256);
replaceCaskVersionAndSha(tapCaskPath, nextVersion, sha256);

run('git', ['add', '.'], { cwd: rootDir });
run('git', ['commit', '-m', `Release v${nextVersion}`], { cwd: rootDir });
run('git', ['push', 'origin', 'main'], { cwd: rootDir });
run('git', ['tag', releaseTag], { cwd: rootDir });
run('git', ['push', 'origin', releaseTag], { cwd: rootDir });
run(
  'gh',
  ['release', 'create', releaseTag, artifactPath, '--repo', 'Icarus603/minichat', '--title', releaseTag, '--notes', releaseNotes],
  { cwd: rootDir },
);

run('git', ['add', 'Casks/minichat.rb'], { cwd: tapDir });
run('git', ['commit', '-m', `Release MiniChat ${nextVersion}`], { cwd: tapDir });
run('git', ['push', 'origin', 'main'], { cwd: tapDir });

console.log(`Released ${nextVersion}`);
console.log(`SHA256: ${sha256}`);
