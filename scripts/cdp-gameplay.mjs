/**
 * CDP 玩法验证：模拟点击 → 断言 Snapshot 里木头数量与高度变化。
 * 推理：logs 从 0 → 刷出 → tick 后高度下降 → 最终停在地面附近。
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
  }
}

const evalJs = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true })
  return r.result?.result?.value
}

ws.onopen = async () => {
  await send('Runtime.enable')

  const state = () => evalJs(`JSON.stringify(globalThis.__beaverDebug__?.readSnapshot?.() ?? null)`)
  const click = (fx, fy) =>
    evalJs(`(() => {
      const c = document.querySelector('canvas'); if (!c) return 'no-canvas';
      const r = c.getBoundingClientRect();
      c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true,
        clientX: r.width * ${fx} + r.left, clientY: r.height * ${fy} + r.top,
        pointerId: 3, pointerType: 'mouse', isPrimary: true }));
      return 'ok';
    })()`)

  // 初始：0 根木头
  console.log('[初始]', await state())

  // 点击刷第一根，立即读（应变成 1）
  await click(0.5, 0.5)
  await new Promise((r) => setTimeout(r, 300))
  const afterFirst = JSON.parse(await state())
  console.log('[刷1根后] logs=', afterFirst.logs.length, 'y=', afterFirst.logs[0]?.position.y?.toFixed(2))

  // 等 3 秒物理下落
  await new Promise((r) => setTimeout(r, 3000))
  const fell = JSON.parse(await state())
  console.log('[3秒后] logs=', fell.logs.length, 'y=', fell.logs[0]?.position.y?.toFixed(2), 'rotation=', JSON.stringify(fell.logs[0]?.rotation))

  // 再点一次刷第二根
  await click(0.3, 0.6)
  await new Promise((r) => setTimeout(r, 500))
  const afterSecond = JSON.parse(await state())
  console.log('[刷2根后] logs=', afterSecond.logs.length)

  const d = JSON.parse(await state())
  console.log('[汇总] logs=', d.logs.length, 'beaver=', JSON.stringify(d.beaver))

  // 断言总结
  const ok1 = afterFirst.logs.length === 1
  const ok2 = fell.logs.length === 1 && fell.logs[0].position.y < afterFirst.logs[0].position.y
  const ok3 = d.logs.length === 2
  const ok4 = d.logs[0].position.y > 0 && d.logs[0].position.y < 0.7
  console.log(`\n结果：刷1根=${ok1} 下落=${ok2} 再刷一根=${ok3} 停地附近=${ok4}`)
  console.log(ok1 && ok2 && ok3 && ok4 ? 'PASS' : 'FAIL')
  process.exit(ok1 && ok2 && ok3 && ok4 ? 0 : 1)
}

setTimeout(() => { console.log('[timeout]'); process.exit(1) }, 30000)