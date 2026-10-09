/** Identities of checksum-verified Arya release files in a profile cache. */
export interface CachedAryaRelease {
  version: string
  sha256: string
}

/** Content-addressed file name for a published package. */
export function aryaReleaseFile(name: string, release: CachedAryaRelease): string {
  return `${name.replace(/^@/, '').replaceAll('/', '-')}-${release.version}-${release.sha256}.tgz`
}

/** Recognize a market-owned release cache spec instead of a development checkout. */
export function isAryaReleaseSpec(plugin: { name: string; releases?: CachedAryaRelease[] }, spec: string): boolean {
  if (!spec.startsWith('file:')) return false
  const normalized = spec.replaceAll('\\', '/')
  return plugin.releases?.some(release => normalized.endsWith(`/.dsh-market/releases/${aryaReleaseFile(plugin.name, release)}`)) === true
}
