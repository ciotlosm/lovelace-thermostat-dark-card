# 恒温器暗色卡片 (Thermostat Dark Card)

> ⚠️ **翻译声明**: 本文档由自动化工具翻译，非人工翻译。如有翻译不准确之处，请以[英文原版 README](../../README.md)为准。欢迎通过 Pull Request 改进翻译。
>
> ⚠️ **Translation Notice**: This document was translated by automated tools, not by a human translator. If there are any inaccuracies, please refer to the [original English README](../../README.md). Improvements via Pull Request are welcome.

---

[![HACS Default](https://img.shields.io/badge/HACS-Default-orange.svg?style=for-the-badge)](https://github.com/hacs/integration)
[![GitHub Release](https://img.shields.io/github/v/release/ciotlosm/lovelace-thermostat-dark-card?style=for-the-badge)](https://github.com/ciotlosm/lovelace-thermostat-dark-card/releases)

一款仿 Nest 风格的 Home Assistant 恒温器卡片，采用圆形表盘界面。支持单温度和双温度（制热/制冷）设定点、预设模式和多种主题。

**主要特点：**
- 纯 SVG 渲染 — 轻量级，无图片，低带宽优化
- 单温度和双温度（制热/制冷）模式
- 环形拖拽交互设置温度
- 编辑时预测状态反馈
- 深色、浅色和透明主题
- 预设模式指示器（节能、离家、居家、睡眠、加速）
- 响应式 — 自适应任意卡片尺寸

## 安装

### HACS（推荐）

[![在 HACS 中打开](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=ciotlosm&repository=lovelace-thermostat-dark-card&category=plugin)

或手动操作：
1. 在 Home Assistant 中打开 HACS
2. 搜索 "Thermostat Dark Card"
3. 安装并重启 Home Assistant

### 手动安装

1. 从[最新版本](https://github.com/ciotlosm/lovelace-thermostat-dark-card/releases)下载 `thermostat-dark-card.js`
2. 放入 `config/www/` 目录
3. 在设置 → 仪表盘 → 资源中添加：
   - URL: `/local/thermostat-dark-card.js`
   - 类型: JavaScript 模块

## 使用方法

```yaml
type: custom:thermostat-dark-card
entity: climate.living_room
```

## 配置选项

### 界面选项（可视化编辑器中可用）

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `entity` | 字符串 | **必填** | 空调/恒温器实体 ID |
| `name` | 字符串 / false | 实体名称 | 卡片标题。设为 `false` 隐藏 |
| `theme` | 字符串 | `dark` | `dark`（深色）、`light`（浅色）或 `transparent`（透明） |
| `step` | 数字 | 来自实体 | 温度步进覆盖（仅摄氏度模式） |
| `readonly` | 布尔 | `false` | 禁用所有交互（仅显示模式） |
| `ambient_temperature` | 字符串 | — | 外部温度传感器实体 ID |
| `status_entity` | 字符串 | — | 状态文本实体（显示在温度上方） |
| `show_power_toggle` | 布尔 | `true` | 显示电源开关按钮 |
| `show_preset_indicator` | 布尔 | `true` | 显示预设模式图标 |
| `pending` | 数字 | `3` | 提交温度更改前的等待秒数 |

### 高级选项（仅 YAML）

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `idle_zone` | 数字 | `0` | 双温度模式中高低目标之间的最小间隔 |
| `range_min` | 数字 | 来自实体 | 覆盖最低温度 |
| `range_max` | 数字 | 来自实体 | 覆盖最高温度 |
| `colors` | 对象 | — | 自定义颜色覆盖 |
| `preset_icons` | 对象 | — | 将预设名称映射到图标 |

### 颜色覆盖

```yaml
type: custom:thermostat-dark-card
entity: climate.living_room
colors:
  heating: "#ff5500"
  cooling: "#0088ff"
  idle: "#1a1a1a"
  off: "#444444"
```

### 预设图标

内置映射：
- `eco`、`away` → 叶子（节能）
- `home` → 房屋
- `sleep` → 月亮
- `boost` → 火焰
- `comfort` → 太阳
- `activity` → 人物

自定义映射：

```yaml
preset_icons:
  vacation: eco
  night: sleep
  party: boost
```

## 支持

如果您觉得此卡片有用，可以考虑请我喝杯咖啡：

<a href="https://www.buymeacoffee.com/gUEVWJc" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="40"></a>

## 许可证

MIT
