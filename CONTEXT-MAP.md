# Context Map

## Contexts

- [河狸](./CONTEXT.md) — 这款游戏独有的词（狸、树、木头、水、坝）
- [PGEngine](./pgengine/CONTEXT.md) — 运行时词（sim、koota、Box3D、Snapshot、Webgiya、Steam）

## Relationships

- 河狸的可推进状态走 PGEngine 的 World / tick / Snapshot；view 只读 Snapshot。
- 狸、树、木头、水质、坝只活在游戏仓。tick、Steam、GI 加载器只活在 pgengine。
