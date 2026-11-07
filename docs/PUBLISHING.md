# GitHub 发布前检查

这个文件夹是可上传的源码仓库；整理过程没有创建远程仓库，也没有上传代码。

1. 阅读 README、NOTICE、LICENSE 与素材说明，确认你接受其公开内容与署名。
2. 在 GitHub 自行创建仓库，建议仓库名为 `dsh-whale-reasoning`。若准备推送本地内容，远程先不要生成会冲突的额外文件。
3. 使用 GitHub Desktop 添加此文件夹并检查变更列表，或使用你熟悉的 Git 工作流。
4. 只提交仓库源码和文档。`.gitignore` 已排除 node_modules、测试输出、缓存、dist、状态文件和 `.env`。
5. 不要加入自己真实 DSH 的 profile、私有截图、调试样本或账号文件。发布前运行 `npm run check:public` 并人工复核。
6. 首次公开时添加仓库描述和 topics；实际仓库地址确定后，再把自己的地址填入 package.json 的 repository/homepage/bugs 字段。当前没有虚构这些地址。
7. 可创建 `v1.2.1` Release，上传 `releases/` 中的 tgz 与 SHA256SUMS。之后的版本先测试，再使用 `npm run pack:release` 在本地生成新的包。

package.json 的 `private: true` 只防止误操作 `npm publish`，不影响 GitHub 开源、
本地安装或 npm pack。没有配置 npm 发布令牌或自动发布工作流。

CI 只测试、构建和核验，不部署或发布。它包含 Linux/Windows 的 Node 测试和
Ubuntu 的 Chromium 交互测试；本地通过不等于 GitHub 托管环境已经实际运行。

随仓库保存的安装包与源码同步；发布前应核对 SHA256SUMS，并保持上游署名和
素材来源说明。不要把完整 DSH 程序一起打包。
