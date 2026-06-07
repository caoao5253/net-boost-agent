# Net Boost Agent

[English](README.en.md) | [返回首页](README.md)

Net Boost Agent 是一个面向 Codex 和 Claude MCP 的网络优化 Agent。它帮助用户诊断网络慢的原因，采集优化前后证据，只在确认后执行低风险动作，并生成用户可读的报告和对比图。

## 它回答什么问题

- 我现在网到底怎么样？
- 下载、上传、延迟、抖动、丢包、DNS、Wi-Fi、配置状态分别如何？
- 主要问题 Top 3 是什么？
- 优化后有没有真的变好？
- 做了哪些动作，安全吗？
- 下一步该怎么办？

## Codex 使用方式

直接用自然语言触发：

```text
@net-boost-agent 帮我优化网络
@net-boost-agent 做一次优化前测速
@net-boost-agent 生成优化前后的对比图
```

Net Boost Agent 会根据请求选择流程。普通用户不需要运行内部脚本。

## Claude MCP 使用方式

将 MCP server 配到 Claude MCP 客户端：

```json
{
  "mcpServers": {
    "net-boost-agent": {
      "command": "node",
      "args": ["G:/project/ai-tools/net-boost-agent/bin/net-boost-mcp.js"]
    }
  }
}
```

在别的机器上使用时，把路径替换成你 clone 后的 `bin/net-boost-mcp.js` 绝对路径。

## Speedtest CLI 缺失恢复流程

Net Boost Agent 不内置 Ookla Speedtest CLI。如果缺少 Speedtest：

```text
Net Boost Agent 检测不到 Speedtest
→ Net Boost Agent 继续完成基础诊断
→ 下载/上传显示为暂不可用
→ Net Boost Agent 提供官方链接
→ 用户下载后把 speedtest.exe 路径发给 Agent
→ Net Boost Agent 自动继续 before/after benchmark
```

官方下载页：

```text
https://www.speedtest.net/apps/cli
```

Windows 版下载后可能只有 `speedtest.exe`，没有安装器。这是正常的，可以直接传路径：

```bash
net-boost doctor --speedtest-path "C:\Users\Administrator\Downloads\ookla-speedtest-1.2.0-win64\speedtest.exe" --json
net-boost benchmark --label before --speedtest-path "C:\Users\Administrator\Downloads\ookla-speedtest-1.2.0-win64\speedtest.exe" --rounds 3 --json
```

Agent 环境也可以设置：

```text
NET_BOOST_SPEEDTEST_PATH=C:\Users\Administrator\Downloads\ookla-speedtest-1.2.0-win64\speedtest.exe
```

## CLI 自动化入口

```bash
net-boost doctor --json
net-boost benchmark --label before --rounds 3 --json
net-boost benchmark --label after --rounds 3 --compare before --json
net-boost report --before .net-boost-runs/before.json --after .net-boost-runs/after.json
net-boost chart --before .net-boost-runs/before.json --after .net-boost-runs/after.json
```

`chart` 命令输出 SVG 对比图，会区分已测量指标、缺失指标、以及因为优化前数据不可用而无法比较的指标。

## 安全边界

- 默认只读。
- 诊断和测速不会修改系统。
- 建议不会自动执行。
- 任何 apply 动作都必须先预览并获得明确确认。
- Net Boost Agent 不承诺一定提速，只基于证据判断是否改善。

## 安装

见 [docs/INSTALL.md](docs/INSTALL.md)，里面包含 clone、Codex、Claude MCP、Windows Speedtest CLI 和排错步骤。

## 公开发行状态

仓库包含 Codex 插件清单、skills、`.mcp.json`、资产、隐私政策、服务条款和发布测试。公开链接指向 <https://github.com/caoao5253/net-boost-agent>。
