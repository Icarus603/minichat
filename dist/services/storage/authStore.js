import fs from 'node:fs';
import path from 'node:path';
import { configDir, getConfigDir } from './configStore.js';
export const codexAuthFile = path.join(process.env['HOME'], '.codex', 'auth.json');
export const minichatAuthFile = path.join(configDir, 'auth.json');
function getCodexAuthFile() {
    return path.join(process.env['HOME'], '.codex', 'auth.json');
}
function getMinichatAuthFile() {
    return path.join(getConfigDir(), 'auth.json');
}
export function readCodexAuthFile() {
    try {
        return JSON.parse(fs.readFileSync(getCodexAuthFile(), 'utf8'));
    }
    catch {
        return null;
    }
}
export function readCodexApiKeyFromAuth() {
    const parsed = readCodexAuthFile();
    const apiKey = parsed?.OPENAI_API_KEY?.trim();
    return apiKey || null;
}
export function writeImportedCodexAuth(method, auth) {
    const dir = getConfigDir();
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(getMinichatAuthFile(), JSON.stringify({
        ...auth,
        authMode: method,
    }, null, 2));
}
export function readImportedCodexAuth() {
    try {
        const authFile = getMinichatAuthFile();
        if (!fs.existsSync(authFile)) {
            return null;
        }
        const parsed = JSON.parse(fs.readFileSync(authFile, 'utf8'));
        if (!parsed.tokens?.access_token || !parsed.tokens?.refresh_token) {
            return null;
        }
        return parsed;
    }
    catch {
        return null;
    }
}
export function clearImportedCodexAuth() {
    try {
        const authFile = getMinichatAuthFile();
        if (fs.existsSync(authFile)) {
            fs.unlinkSync(authFile);
        }
    }
    catch { }
}
