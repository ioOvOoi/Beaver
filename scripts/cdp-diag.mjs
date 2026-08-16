/**
 * CDP 一次性诊断脚本：连上游戏页，收集 console 事件与页面状态 5 秒。
 * 用途：验证第一刀在真实浏览器（Chrome WebGPU）里能否初始化。用完即丢。
 */
const wsUrl = process.argv[2]
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
    return
  }
  // 事件推送
  if (msg.method === 'Runtime.consoleAPICalled') {
    const args = msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ')
    console.log('[console]', msg.params.type, '::', args.slice(0, 300))
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    console.log('[EXCEPTION]', JSON.stringify(msg.params.exceptionDetails).slice(0, 500))
  }
  if (msg.method === 'Log.entryAdded') {
    console.log('[log]', msg.params.entry.level, '::', String(msg.params.entry.text).slice(0, 300))
  }
}

ws.onopen = async () => {
  await send('Runtime.enable')
  await send('Log.enable')
  await send('Page.enable')
  // 等待 + 收集
  await new Promise((r) => setTimeout(r, 6000))
  // 检查 canvas 是否在 DOM、WebGPU 是否可用
  const evalRes = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      hasCanvas: !!document.querySelector('canvas'),
      canvasWidth: document.querySelector('canvas')?.width ?? 0,
      webgpu: !!navigator.gpu,
      bodyChildren: document.body.children.length
    })`,
    returnByValue: true,
  })
  console.log('[STATE]', evalRes.result?.result?.value)
  process.exit(0)
}

setTimeout(() => { console.log('[timeout]'); process.exit(1) }, 20000)