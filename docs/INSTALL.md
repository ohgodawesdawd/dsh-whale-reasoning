# 安装与卸载

本插件只安装到 DSH profile，不要覆盖 DSH 程序目录或修改 `app.asar`。
先确认没有运行中的任务，再备份 profile。以下命令由使用者手动执行。

## 1. 找到 profile

在 DSH 的 profile 管理入口确认正在使用的 profile。Windows 默认 desktop
profile 常位于 `%USERPROFILE%\.dsh\profiles\desktop`，但自定义路径和其他平台
可能不同，必须以实际路径为准。不要把下列示例路径当作适用于所有安装。

## 2. 安装源码或安装包

### 推荐：本地源码目录

把本仓库的内容放入该 profile 的 `plugins/dsh-whale-reasoning/`。
该目录下应直接存在 `package.json`、`lib/` 和 `cordis.patch.yml`，不要多嵌套一层。

在 **profile 根目录**（不是本仓库目录）执行：

```sh
pnpm add "file:./plugins/dsh-whale-reasoning" --ignore-scripts
```

请使用当前 DSH 配套的 pnpm，避免混用不兼容的锁文件版本。此步骤无需运行
`npm ci` 或下载开发用浏览器；运行图片已经内嵌。

### 另一种方式：tgz

将附带或自行构建的 `dsh-whale-reasoning-1.2.1.tgz` 放到 profile 根目录，然后执行：

```sh
pnpm add "./dsh-whale-reasoning-1.2.1.tgz" --ignore-scripts
```

本地目录与 tgz 二选一，不需要重复安装。不要使用未经发布的 npm 包名作为在线安装指令。

## 3. 注册一次 bundle

在 profile 的 `package.json` 中找到现有 `dsh.profile.bundles` 数组，在末尾
追加字符串 `"dsh-whale-reasoning"`，已有则不重复添加。保留所有其他字段和
bundle，不要把配置整体替换成示例。

包自身的 `cordis.patch.yml` 已负责插入插件，**不要再在 profile 的补丁中
手动重复 insert**。不要同时运行同一功能的另一个高优先级模型席位插件。

## 4. 加载和确认

由你手动刷新 DSH。若还是旧界面，保存任务后完全退出并重新打开，包括托盘进程。

应看到原模型席位变为当前推理档位按钮，打开后显示模型下拉框、大肥鱼和滑条。
拖入／移出 Max 时粒子立即切换；松手才提交。模型只有三档时不会出现 xhigh，
这是能力适配，不是素材丢失。

## 更新

先备份当前插件；替换本地源码目录，重新执行对应的本地安装命令，保留原 bundle
和个人状态。确认无任务后手动刷新。不要用整个仓库覆盖 profile 根目录。

## 卸载

从 `dsh.profile.bundles` 移除且仅移除 `dsh-whale-reasoning`，然后在 profile 中执行：

```sh
pnpm remove dsh-whale-reasoning --ignore-scripts
```

手动重新加载后默认模型席位应恢复。不要删除整个 profile。插件源码和
`.whale-reasoning` 状态可先保留，确认不再需要后再自行清理。

## 常见问题

- **看不到面板**：核对当前 profile、bundle 是否只出现一次、插件日志，以及是否与另一个模型席位覆盖插件冲突。
- **图像模糊**：默认已使用 672px 资源；检查系统缩放和宿主缩放。不要误换成旧的低分辨率导出。
- **没有 off/auto/xhigh**：只有模型真实声明的档位才会显示。
- **安装后似乎没有更新**：确认使用者已手动刷新／彻底重开；没有自动重启机制。
- **不支持某个新版 DSH**：附上已脱敏的版本号和复现步骤，不要发送 profile 或真实聊天。
