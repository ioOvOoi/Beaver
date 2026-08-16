/**
 * CDP 截图：截取游戏画面到 png（验证 #9 静物 + Surfel GI 渲染）。
 * 用法：node scripts/cdp-shot.mjs <wsUrl> <out.png>
 */
const wsUrl = process.argv[2]
const out = process.argv[3]
const ws = new WebSocket(wsUrl)
let nextId = 1
const pending = new Map()

function send(method, params = {}) {
  return new Promise((resolve) => {
    const id = nextId++
    pending.set(id, resolve)
    ws.send(JSON.stringify({ id, method, params }))
  })
}
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data)
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg)
    pending.delete(msg.id)
  }
}

ws.onopen = async () => {
  await send('Runtime.enable')
  await send('Page.enable')
  // 等渲染稳定
  await new Promise((r) => setTimeout(r, 6000))
  // 刷新并等重新加载（确保画面是刚渲染的）
  await send('Page.reload', { ignoreCache: true })
  await new Promise((r) => setTimeout(r, 9000))
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  const b64 = shot.result?.data
  if (!b64) { console.log('no screenshot data'); process.exit(1) }
  const { writeFileSync } = await import('node:fs')
  writeFileSync(out, Buffer.from(b64, 'base64'))
  console.log('saved', out)
  process.exit(0)
}
setTimeout(() => { console.log('[timeout]'); process.exit(1) }, 30000)