/** Released Arya packages selected from the host-configured catalog. */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NPM_NAME_RE } from './sources.ts'
import type { Registry, RegistryPlugin } from './registry.ts'

/** One packaged release; targets are approved by the catalog publisher. */
export interface AryaRelease {
  version: string
  tarball: string
}

/** Catalog shipped and maintained by the Arya fork. */
export const ARYA_CATALOG_URL = 'https://raw.githubusercontent.com/KonnectSuite/dsh-market/codex/arya-plugin-market/data/arya-plugins.json'

/** Validate a configured catalog address before mounting HTTP routes. */
export function validateCatalogUrl(value: string): void {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username !== '' || url.password !== '') {
    throw new Error('Arya catalog must use HTTPS without URL credentials')
  }
}

/** Reject malformed release records at the external catalog input. */
export function validateAryaRegistry(registry: Registry): Registry {
  const names = new Set<string>()
  for (const plugin of registry.plugins) {
    if (plugin.arya !== true) throw new Error('Arya catalog contains an unmarked entry')
    if (!NPM_NAME_RE.test(plugin.name) || names.has(plugin.name)) {
      throw new Error('Arya catalog contains an invalid or duplicate package name')
    }
    names.add(plugin.name)
    if (!Array.isArray(plugin.releases) || plugin.releases.length === 0) throw new Error(`${plugin.name}: no packaged releases`)
    const versions = new Set<string>()
    for (const release of plugin.releases) {
      if (release === null || typeof release !== 'object'
        || typeof release.version !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(release.version)
        || versions.has(release.version) || typeof release.tarball !== 'string') {
        throw new Error(`${plugin.name}: invalid or duplicate release`)
      }
      versions.add(release.version)
      const url = new URL(release.tarball)
      const fileName = plugin.name.replace(/^@/, '').replaceAll('/', '-')
      const expected = `/KonnectSuite/dsh-market/releases/download/plugin-${fileName}-v${release.version}/${fileName}-${release.version}.tgz`
      if (url.origin !== 'https://github.com' || url.pathname !== expected || url.search !== '' || url.hash !== '' || url.username !== '' || url.password !== '') {
        throw new Error(`${plugin.name}: release archive does not match its package and version`)
      }
    }
  }
  return registry
}

/** Select only a listed release; omission chooses the publisher's first release. */
export function aryaReleaseTarget(plugin: RegistryPlugin, version?: unknown): string {
  const release = version === undefined ? plugin.releases?.[0] : plugin.releases?.find(candidate => candidate.version === version)
  if (release === undefined) throw new Error('This plugin version is not in the Arya release catalog')
  return release.tarball
}

/** Read the installer-owned package version, independently of the active profile override. */
export function bundledAryaVersion(installDir: string | undefined, name: string): string | null {
  if (installDir === undefined || !NPM_NAME_RE.test(name)) return null
  try {
    const manifest: unknown = JSON.parse(readFileSync(join(installDir, 'node_modules', name, 'package.json'), 'utf8'))
    if (manifest !== null && typeof manifest === 'object' && 'name' in manifest && manifest.name === name
      && 'version' in manifest && typeof manifest.version === 'string') return manifest.version
    return null
  } catch (error) {
    // An optional plugin can be absent from this installer or inaccessible on disk.
    return null
  }
}
