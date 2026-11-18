import type { Register } from 'claude-code'

const NAME = 'Session initializer' // cloud routine title
const OFFSET_MS = 60_000 // fire 1 min after the window resets
const POLL_MS = 10 * 60_000
const GRACE_MS = 5 * 60_000

type Trigger = { id: string; name?: string; cron_expression?: string; last_fired_at?: string }

async function rt($: any, input: Record<string, unknown>): Promise<any> {
  const r = await $.tool.call({ tool: 'RemoteTrigger', ...input })
  const text: string = r.text ?? ''
  if (r.deny || r.isError || !text.includes('{')) throw new Error(r.deny ?? text.slice(0, 80))
  return JSON.parse(text.slice(text.indexOf('{')))
}

async function findTrigger($: any): Promise<Trigger | undefined> {
  const j = await rt($, { action: 'list' })
  return (j.data ?? []).find((t: Trigger) => t.name === NAME)
}

// Validator: did the routine fire after the time we armed it for?
async function verify($: any, t: Trigger) {
  const armed = Number((await $.store.get('fireMs')) ?? 0)
  if (!armed || armed + GRACE_MS > (await $.clock.now())) return
  if ((await $.store.get('checkedMs')) === armed) return
  const ran = !!t.last_fired_at && Date.parse(t.last_fired_at) >= armed - 120_000
  const at = new Date(armed).toLocaleTimeString()
  await $.store.set('checkedMs', armed)
  await $.store.set('lastCheck', { armed, ran, at: await $.clock.now() })
  $.ui.toast(ran ? `limit-sync: initializer ran (due ${at})` : `limit-sync: initializer MISSED (due ${at})`)
}

async function sync($: any) {
  const t = await findTrigger($)
  if (!t) return $.ui.status(`limit-sync: no cloud routine "${NAME}"`)
  await verify($, t)

  const { rateLimits } = await $.session.usage()
  const reset = rateLimits.find((r: any) => r.kind === 'five_hour')?.resetsAt
  if (!reset) return
  const fireMs = Date.parse(reset) + OFFSET_MS
  if (!(fireMs > (await $.clock.now()))) return

  // five fires a day, 5h apart, anchored on the next reset (UTC)
  const d = new Date(fireMs)
  const hours = [0, 1, 2, 3, 4].map(i => (d.getUTCHours() + 5 * i) % 24).sort((a, b) => a - b)
  const cron = `CRON_TZ=UTC ${d.getUTCMinutes()} ${hours.join(',')} * * *`
  if (t.cron_expression !== cron)
    await rt($, { action: 'update', trigger_id: t.id, body: { cron_expression: cron } })
  await $.store.set('fireMs', fireMs)
  $.ui.status(`limit-sync: cloud init ${d.toLocaleTimeString()}`)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    sync($).catch(() => {})
    $.clock.every(POLL_MS, () => sync($).catch(() => {}))
    return next(e)
  })
  on('session.measure', ($, e, next) => (sync($).catch(() => {}), next(e)))
}
