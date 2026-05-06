import { execSync, execFileSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');
const PTY = join(ROOT, 'node_modules', 'node-pty');

if (!existsSync(PTY)) {
  console.log('node-pty not installed yet, skipping rebuild.');
  process.exit(0);
}

const env = { ...process.env };

if (!env.VCINSTALLDIR && process.platform === 'win32') {
  const vsBase = 'C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools';
  const vcDir = join(vsBase, 'VC');
  if (existsSync(vcDir)) {
    env.VCINSTALLDIR = vcDir + '\\';

    const versionFile = join(vcDir, 'Auxiliary', 'Build', 'Microsoft.VCToolsVersion.v143.default.txt');
    if (!env.VSCMD_VER) {
      try {
        const installerCatalog = join(vsBase, 'Common7', 'IDE', 'devenv.isolation.ini');
        if (existsSync(installerCatalog)) {
          env.VSCMD_VER = readFileSync(installerCatalog, 'utf8').match(/SemanticVersion=(\S+)/)?.[1] || '17.0.0.0';
        }
      } catch {}
      if (!env.VSCMD_VER) {
        env.VSCMD_VER = '17.14.37216.2';
      }
    }

    if (!env.WindowsSDKVersion) {
      const sdkDir = 'C:\\Program Files (x86)\\Windows Kits\\10\\Include';
      if (existsSync(sdkDir)) {
        const versions = require('fs').readdirSync(sdkDir).filter(d => d.startsWith('10.'));
        if (versions.length) {
          env.WindowsSDKVersion = versions.sort().pop() + '\\';
        }
      }
    }
  }
}

function patchFile(filePath, search, replace) {
  if (!existsSync(filePath)) return;
  let content = readFileSync(filePath, 'utf8');
  if (content.includes(search)) {
    content = content.replaceAll(search, replace);
    writeFileSync(filePath, content, 'utf8');
  }
}

const winptyGyp = join(PTY, 'deps', 'winpty', 'src', 'winpty.gyp');
patchFile(winptyGyp, `'<!(cmd /c "cd shared && GetCommitHash.bat")'`, `'none'`);
patchFile(winptyGyp, `'<!(cmd /c "cd shared && UpdateGenVersion.bat <(WINPTY_COMMIT_HASH)")'`, `'gen'`);
patchFile(winptyGyp, `'SpectreMitigation': 'Spectre'`, `'SpectreMitigation': 'false'`);

const bindingGyp = join(PTY, 'binding.gyp');
patchFile(bindingGyp, `'SpectreMitigation': 'Spectre'`, `'SpectreMitigation': 'false'`);

const genDir = join(PTY, 'deps', 'winpty', 'src', 'gen');
if (!existsSync(genDir)) {
  mkdirSync(genDir, { recursive: true });
  const versionTxt = join(PTY, 'deps', 'winpty', 'VERSION.txt');
  const ver = existsSync(versionTxt) ? readFileSync(versionTxt, 'utf8').trim() : '0.0.0';
  writeFileSync(join(genDir, 'GenVersion.h'),
    `const char GenVersion_Version[] = "${ver}";\nconst char GenVersion_Commit[] = "none";\n`);
}

console.log('Rebuilding node-pty for Electron...');
try {
  execSync('npx electron-rebuild -f -w node-pty', {
    cwd: ROOT,
    env,
    stdio: 'inherit',
    timeout: 300000,
  });
  console.log('node-pty rebuild succeeded.');
} catch (err) {
  console.error('node-pty rebuild failed:', err.message);
  process.exit(1);
}
