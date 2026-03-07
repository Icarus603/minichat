import { spawn } from 'node:child_process';
import { APP_VERSION } from '../../shared/version.js';
const LATEST_RELEASE_URL = 'https://api.github.com/repos/Icarus603/minichat/releases/latest';
const BREW_CASK = 'Icarus603/tap/minichat';
async function getInstalledCaskVersion() {
    return await new Promise((resolve) => {
        const child = spawn('brew', ['list', '--cask', '--versions', 'minichat'], {
            cwd: process.cwd(),
            env: process.env,
            stdio: ['ignore', 'pipe', 'ignore'],
        });
        let stdout = '';
        child.stdout.setEncoding('utf8');
        child.stdout.on('data', chunk => {
            stdout += chunk;
        });
        child.once('error', () => resolve(null));
        child.once('close', (code) => {
            if (code !== 0) {
                resolve(null);
                return;
            }
            const match = stdout.trim().match(/^minichat\s+([^\s]+)$/m);
            resolve(match?.[1] ? normalizeVersion(match[1]) : null);
        });
    });
}
function normalizeVersion(version) {
    return version.trim().replace(/^v/i, '');
}
function compareVersions(a, b) {
    const left = normalizeVersion(a).split('.').map(part => Number.parseInt(part, 10) || 0);
    const right = normalizeVersion(b).split('.').map(part => Number.parseInt(part, 10) || 0);
    const length = Math.max(left.length, right.length);
    for (let index = 0; index < length; index += 1) {
        const delta = (left[index] ?? 0) - (right[index] ?? 0);
        if (delta !== 0) {
            return delta > 0 ? 1 : -1;
        }
    }
    return 0;
}
async function runBrew(args, onProgress) {
    return await new Promise((resolve) => {
        onProgress?.({ command: `brew ${args.join(' ')}` });
        const child = spawn('brew', args, {
            cwd: process.cwd(),
            env: process.env,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '';
        let stderr = '';
        child.stdout.setEncoding('utf8');
        child.stderr.setEncoding('utf8');
        child.stdout.on('data', chunk => {
            stdout += chunk;
            onProgress?.({ command: `brew ${args.join(' ')}`, chunk });
        });
        child.stderr.on('data', chunk => {
            stderr += chunk;
            onProgress?.({ command: `brew ${args.join(' ')}`, chunk });
        });
        child.once('error', error => {
            resolve({
                ok: false,
                output: error.message,
            });
        });
        child.once('close', code => {
            resolve({
                ok: code === 0,
                output: [stdout.trim(), stderr.trim()].filter(Boolean).join('\n'),
            });
        });
    });
}
export async function checkForUpdate() {
    try {
        const installedVersion = await getInstalledCaskVersion();
        const response = await fetch(LATEST_RELEASE_URL, {
            headers: {
                'User-Agent': 'MiniChat',
                'Accept': 'application/vnd.github+json',
            },
            signal: AbortSignal.timeout(2500),
        });
        if (!response.ok) {
            return null;
        }
        const payload = await response.json();
        const latestVersion = typeof payload.tag_name === 'string' ? normalizeVersion(payload.tag_name) : '';
        if (!latestVersion) {
            return null;
        }
        if (installedVersion && compareVersions(installedVersion, latestVersion) >= 0) {
            return null;
        }
        if (compareVersions(latestVersion, APP_VERSION) <= 0) {
            return null;
        }
        return {
            currentVersion: APP_VERSION,
            latestVersion,
            releaseUrl: typeof payload.html_url === 'string' ? payload.html_url : 'https://github.com/Icarus603/minichat/releases',
        };
    }
    catch {
        return null;
    }
}
export async function installLatestUpdate(onProgress) {
    const upgrade = await runBrew(['upgrade', '--cask', BREW_CASK], onProgress);
    if (upgrade.ok) {
        return upgrade;
    }
    if (upgrade.output.includes('latest version is already installed')) {
        return {
            ok: true,
            output: upgrade.output,
        };
    }
    const reinstall = await runBrew(['reinstall', '--cask', BREW_CASK], onProgress);
    if (reinstall.ok) {
        return reinstall;
    }
    return {
        ok: false,
        output: [upgrade.output, reinstall.output].filter(Boolean).join('\n\n'),
    };
}
export function getUpdateCommands() {
    return {
        upgrade: `brew upgrade --cask ${BREW_CASK}`,
        reinstall: `brew reinstall --cask ${BREW_CASK}`,
    };
}
