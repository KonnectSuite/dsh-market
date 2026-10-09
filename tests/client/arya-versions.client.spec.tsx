// @vitest-environment jsdom
/** Real release picker with a controlled host API. */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AryaVersions } from '../../src/client/AryaVersions.tsx'
import { en } from '../../src/client/locales.ts'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('chooses an earlier published release and exposes an explicit local-source switch', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ releases: [{ version: '0.2.0' }, { version: '0.1.0' }], bundled: '0.1.0' }))))
  const select = vi.fn()
  render(<AryaVersions name="dsh-example" local t={key => en[key]} onClose={() => {}} onSelect={select} />)
  expect(screen.getByText(en.aryaLocalSwitch)).toBeTruthy()
  fireEvent.click(await screen.findByRole('button', { name: '0.1.0' }))
  expect(select).toHaveBeenCalledWith('0.1.0', false)
  fireEvent.click(screen.getByRole('button', { name: `${en.aryaBundled} · 0.1.0` }))
  expect(select).toHaveBeenCalledWith(undefined, true)
})
it('keeps a failed release lookup retryable', async () => {
  const fetcher = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(new Response(JSON.stringify({ releases: [{ version: '0.2.0' }], bundled: null })))
  vi.stubGlobal('fetch', fetcher)
  render(<AryaVersions name="dsh-example" local={false} t={key => en[key]} onClose={() => {}} onSelect={() => {}} />)
  await screen.findByRole('alert')
  fireEvent.click(screen.getByRole('button', { name: en.commentsRetry }))
  await waitFor(() => expect(screen.getByRole('button', { name: '0.2.0' })).toBeTruthy())
  expect(screen.queryByText(en.aryaLocalSwitch)).toBeNull()
})
