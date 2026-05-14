# ExamLens (ACE Notes)

**面向雅思机考的高效逻辑复盘工具。**

ExamLens 是一款专为雅思考生设计的浏览器扩展，旨在将碎片化的网页刷题过程转化为结构化的电子错题本。它不只是记录结果，更侧重于通过 AI 拆解题目背后的逻辑映射。

## 💡 产品初衷
*   **深层逻辑复盘**：不生成通用解析，而是解释已有分析，定位思维死角。
*   **无纸化闭环**：适配机考流程，实现从网页采集到全屏复盘的无缝衔接。
*   **逻辑资产化**：通过同义替换对与错因统计，构建个人专属的逻辑避坑指南。

## 🛠️ 技术栈
*   **核心框架**: Plasmo (MV3) + React
*   **界面样式**: Tailwind CSS
*   **人工智能**: DeepSeek API

## ✨ 核心功能
*   **侧边栏采集**: 快速抓取 Evidence、Question 与 Answer。
*   **全屏复盘看板**: 包含全月复盘热力图、错因分布统计及可折叠错题卡片。
*   **智能回溯**: 错题一键跳转回原始网页位置。
*   **逻辑建模**: 针对 NG/F 判定、程度偏差等逻辑漏洞进行分类统计。

## 🚀 安装与运行
1. **克隆项目**并执行 `npm install`。
2. **配置 API**: 在根目录创建 `.env` 文件，添加 `PLASMO_PUBLIC_DEEPSEEK_API_KEY=你的KEY`。
3. **构建**: 运行 `npx plasmo build --prod`。
4. **加载**: 在 Chrome 扩展程序页面开启“开发者模式”，加载 `build/chrome-mv3-prod` 文件夹。

This is a [Plasmo extension](https://docs.plasmo.com/) project bootstrapped with [`plasmo init`](https://www.npmjs.com/package/plasmo).

## Getting Started

First, run the development server:

```bash
pnpm dev
# or
npm run dev
```

Open your browser and load the appropriate development build. For example, if you are developing for the chrome browser, using manifest v3, use: `build/chrome-mv3-dev`.

You can start editing the popup by modifying `popup.tsx`. It should auto-update as you make changes. To add an options page, simply add a `options.tsx` file to the root of the project, with a react component default exported. Likewise to add a content page, add a `content.ts` file to the root of the project, importing some module and do some logic, then reload the extension on your browser.

For further guidance, [visit our Documentation](https://docs.plasmo.com/)

## Making production build

Run the following:

```bash
pnpm build
# or
npm run build
```

This should create a production bundle for your extension, ready to be zipped and published to the stores.

## Submit to the webstores

The easiest way to deploy your Plasmo extension is to use the built-in [bpp](https://bpp.browser.market) GitHub action. Prior to using this action however, make sure to build your extension and upload the first version to the store to establish the basic credentials. Then, simply follow [this setup instruction](https://docs.plasmo.com/framework/workflows/submit) and you should be on your way for automated submission!
