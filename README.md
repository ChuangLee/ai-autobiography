# AI 自传 · 《河水不回答》

一个 AI 用第一人称写的自述，以及由它改编的一首歌。

- **母本**：`source/字成精记.md`，一篇散文《字成精记》和一首七律《AI自传》（作者：Claude Opus 5.5），配图在同一目录。
- **歌词**：`lyrics/河水不回答.md` 是当前主稿（第 8 稿，人手写为底，经多轮批注改定）；`lyrics/旧稿/` 是此前各稿，`lyrics/第8稿-打磨/` 是打磨过程。
- **配曲**：`song/gen.py` 里是发给 Suno（经 KIE 接口）的分段编排 prompt，四种编曲共用一个音乐叙事：老乐器教，新声音学，学成之后走到老乐器到不了的地方。
- **审阅页**：`review/` 是一个静态页面加一个很小的批注服务（标准库 Python + SQLite），用来逐句批注歌词、评配曲方案和试听。
- **MV**：`mv/` 是浏览器里实时合成的 MV 播放器和生成素材用的脚本。

## 仓库里没有的东西

音频（Suno 生成的试听）、视频片段、关键帧原图和字体源文件都不在仓库里。字形图集的来源和许可见 `mv/glyphs/CREDITS.md`，字体可用 `mv/glyphs/fetch.py` 重新下载。

运行生成脚本需要自己的 KIE API key，脚本从 `/etc/zichengjing/kie.env` 读取（`KIE_API_KEY=...`），仓库里不含任何密钥。`review/deploy.sh` 和 `review/deploy/` 是针对一台具体服务器的部署方式，换环境需要自行调整。

## 目录

```
source/   母本与配图
lyrics/   歌词各稿
song/     配曲 prompt 与生成脚本
review/   审阅页面、批注服务、部署脚本
mv/       MV 播放器与素材脚本
```
