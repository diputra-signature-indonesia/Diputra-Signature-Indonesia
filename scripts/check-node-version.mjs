import { pathToFileURL } from 'node:url';

export const MINIMUM_NODE_VERSION = '22.23.4';

// Stay on the project's tested LTS major and reject pre-patch/prerelease builds.
// Brotli's reported library version is not sufficient: Node backports the fix.
export function isSupportedNodeVersion(version) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) return false;
  const [, major, minor, patch] = match.map(Number);
  return major === 22 && (minor > 23 || (minor === 23 && patch >= 4));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!isSupportedNodeVersion(process.version)) {
    console.error(`Unsupported Node.js ${process.version}. Use Node.js ${MINIMUM_NODE_VERSION} or a newer 22.x security release (see .nvmrc).`);
    console.error('CVE-2026-111497 affects the built-in Brotli decoder; npm dependency updates alone do not patch the Node.js runtime.');
    process.exitCode = 1;
  } else {
    console.log(`Node.js ${process.version}: supported patched 22.x runtime.`);
  }
}
