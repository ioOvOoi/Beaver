/**
 * CDP 交互诊断：模拟点击画布中心（刷木头），收集 console/异常 5 秒。
 * 用法：node scripts/cdp-click.mjs <wsUrl>
 */
const wsUrl = process.argv[2]
const ws = new WebSocket(wsUrl)
let nextId = 1
const pending = new Map()
const errors = []
const logs = []

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
  if (msg.method === 'Runtime.consoleAPICalled') {
    const text = msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200)
    logs.push(`${msg.params.type}: ${text}`)
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    errors.push(JSON.stringify(msg.params.exceptionDetails).slice(0, 400))
  }
}

ws.onopen = async () => {
  await send('Runtime.enable')
  await send('Log.enable')
  await send('Page.enable')

  // 等渲染准备（GBuffer/BVH/surfel 首帧）
  await new Promise((r) => setTimeout(r, 5000))

  // 模拟第一次点击（画布中心）
  await send('Runtime.evaluate', {
    expression: `(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return { ok: false, why: 'no canvas' };
      const r = canvas.getBoundingClientRect();
      const fire = (x, y) => canvas.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, clientX: x + r.left, clientY: y + r.top,
        pointerId: 1, pointerType: 'mouse', isPrimary: true,
      }));
      fire(r.width / 2, r.height / 2);
      return { ok: true, rect: { w: r.width, h: r.height } };
    })()`,
    returnByValue: true,
  })
  await new Promise((r) => setTimeout(r, 1500))

  // 第二次点击（偏左，验证多点）
  await send('Runtime.evaluate', {
    expression: `(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return { ok: false };
      const r = canvas.getBoundingClientRect();
      canvas.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, clientX: r.width * 0.35 + r.left, clientY: r.height * 0.6 + r.top,
        pointerId: 2, pointerType: 'mouse', isPrimary: true,
      }));
      return { ok: true };
    })()`,
    returnByValue: true,
  })
  await new Promise((r) => setTimeout(r, 4000))

  // 取最终状态与 screenshot（数据 URL 太长，只报告尺寸与错误数）
  const st = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      canvas: !!document.querySelector('canvas'),
      bodyText: document.body.innerText.slice(0, 200),
      errorEl: !!document.querySelector('p'),
    })`,
    returnByValue: true,
  })
  console.log('[FINAL]', st.result?.result?.value)
  console.log('--- console 日志 ---')
  for (const l of logs) console.log(l)
  console.log('--- 异常 ---')
  if (errors.length === 0) console.log('（无）')
  for (const er of errors) console.log(er)
  process.exit(0)
}

setTimeout(() => { console.log('[timeout]'); process.exit(1) }, 30000)