/** Release selection for an installed Arya plugin. */
import { useEffect, useState } from 'react'
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import { IconLoadingOutline16 } from './icons.ts'
import { api, type Translate } from './market-data.ts'
import css from './Market.module.css'

/** Select a published version or the version shipped with this installer. */
export function AryaVersions(props: {
  name: string
  local: boolean
  t: Translate
  onClose: () => void
  onSelect: (version: string | undefined, bundled: boolean) => void
}) {
  const [versions, setVersions] = useState<{ releases: { version: string }[]; bundled: string | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setError(null)
    void fetch(`${api('/dsh-market/arya-versions')}?name=${encodeURIComponent(props.name)}`, { signal: controller.signal })
      .then(async response => {
        const body = await response.json()
        if (!response.ok) throw new Error(String(body.error))
        if (!Array.isArray(body.releases) || !body.releases.every((release: { version?: unknown }) => typeof release?.version === 'string')) throw new Error('Invalid release list')
        if (!controller.signal.aborted) setVersions({ releases: body.releases, bundled: typeof body.bundled === 'string' ? body.bundled : null })
      })
      .catch(error => { if (!controller.signal.aborted) setError(props.t('aryaVersionsFailed')) })
    return () => { controller.abort() }
  }, [props.name, props.t, attempt])
  return <Modal open title={`${props.t('aryaVersions')} — ${props.name}`} onClose={props.onClose}>
    {props.local && <p className={css.commentsNote}>{props.t('aryaLocalSwitch')}</p>}
    {error !== null ? <div role="alert"><p>{error}</p><Button onClick={() => setAttempt(value => value + 1)}>{props.t('commentsRetry')}</Button></div>
      : versions === null ? <div className={css.commentsStatus} role="status"><IconLoadingOutline16 /></div>
      : <div className={css.aryaVersionList}>
        {versions.bundled !== null && <Button variant="outline" onClick={() => { if (versions.bundled !== null) props.onSelect(versions.bundled, true) }}>{props.t('aryaBundled')} · {versions.bundled}</Button>}
        {versions.releases.map(release => <Button key={release.version} variant="outline" onClick={() => props.onSelect(release.version, false)}>{release.version}</Button>)}
      </div>}
  </Modal>
}
