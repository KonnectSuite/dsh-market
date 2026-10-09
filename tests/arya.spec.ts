/** Catalog authorization and installer-version selection. */
import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { aryaReleaseTarget, bundledAryaVersion, validateAryaRegistry, validateCatalogUrl } from '../src/arya.ts'
import type { Registry } from '../src/registry.ts'

function catalog(): Registry {
  return { updated: '', count: 1, categories: {}, plugins: [{
    name: 'dsh-example', owner: 'KonnectSuite', url: 'https://github.com/KonnectSuite/dsh-example', category: 'tools', description: {}, added: '', install: '', arya: true,
    releases: ['0.2.0', '0.1.0'].map(version => ({ version, tarball: `https://github.com/KonnectSuite/dsh-market/releases/download/plugin-dsh-example-v${version}/dsh-example-${version}.tgz` })),
  }] }
}
let directory: string | undefined
afterEach(() => { if (directory !== undefined) { rmSync(directory, { recursive: true, force: true }); directory = undefined } })

describe('Arya release catalog', () => {
  it('selects the latest release or an explicitly requested earlier release', () => {
    const registry = validateAryaRegistry(catalog())
    expect(aryaReleaseTarget(registry.plugins[0])).toContain('v0.2.0/dsh-example-0.2.0.tgz')
    expect(aryaReleaseTarget(registry.plugins[0], '0.1.0')).toContain('v0.1.0/dsh-example-0.1.0.tgz')
    expect(() => aryaReleaseTarget(registry.plugins[0], 'main')).toThrow('not in the Arya release catalog')
    expect(() => aryaReleaseTarget(registry.plugins[0], null)).toThrow('not in the Arya release catalog')
  })
  it.each([
    'https://evil.example/plugin.tgz',
    'https://github.com/other/dsh-market/releases/download/plugin-dsh-example-v0.2.0/dsh-example-0.2.0.tgz',
    'https://github.com/KonnectSuite/dsh-market/releases/download/plugin-dsh-example-v0.2.0/dsh-other-0.2.0.tgz',
    'https://github.com/KonnectSuite/dsh-market/releases/download/plugin-dsh-example-v0.2.0/dsh-example-0.2.0.tgz?redirect=1',
  ])('rejects an archive outside the named published release: %s', target => {
    const registry = catalog(); registry.plugins[0].releases![0].tarball = target
    expect(() => validateAryaRegistry(registry)).toThrow()
  })
  it('rejects duplicate packages, duplicate versions, and unmarked entries', () => {
    const duplicate = catalog(); duplicate.plugins.push(duplicate.plugins[0]); expect(() => validateAryaRegistry(duplicate)).toThrow('duplicate package')
    const versions = catalog(); versions.plugins[0].releases!.push(versions.plugins[0].releases![0]); expect(() => validateAryaRegistry(versions)).toThrow('duplicate release')
    const unmarked = catalog(); delete unmarked.plugins[0].arya; expect(() => validateAryaRegistry(unmarked)).toThrow('unmarked')
  })
  it('rejects remote plaintext or embedded catalog credentials', () => {
    expect(() => validateCatalogUrl('https://example.com/catalog.json')).not.toThrow()
    expect(() => validateCatalogUrl('http://example.com/catalog.json')).toThrow()
    expect(() => validateCatalogUrl('https://secret@example.com/catalog.json')).toThrow()
  })
  it('reads the installer version without consulting the profile override', () => {
    directory = mkdtempSync(join(tmpdir(), 'arya-market-version-'))
    const path = join(directory, 'node_modules', 'dsh-example'); mkdirSync(path, { recursive: true })
    writeFileSync(join(path, 'package.json'), JSON.stringify({ name: 'dsh-example', version: '0.1.0' }))
    expect(bundledAryaVersion(directory, 'dsh-example')).toBe('0.1.0')
    expect(bundledAryaVersion(directory, '../escape')).toBeNull()
    expect(bundledAryaVersion(directory, 'absent')).toBeNull()
    expect(bundledAryaVersion(undefined, 'dsh-example')).toBeNull()
    writeFileSync(join(path, 'package.json'), JSON.stringify({ name: 'other', version: '0.1.0' }))
    expect(bundledAryaVersion(directory, 'dsh-example')).toBeNull()
  })
})
