# jj 工作流

本仓库使用 [Jujutsu](https://github.com/jj-vcs/jj) 管理变更。它把当前工作区视为一个可变提交，不需要先创建分支；这与 Bun + Hono + htmx + Alpine + Basecoat + Tailwind 模板的快速迭代方式更匹配。

## 基本概念

- `@` 是当前工作区提交。
- `jj new` 在当前提交之上开始一个新变更。
- `jj describe` 修改当前变更说明。
- 书签（bookmark）相当于可推送的命名引用。
- 冲突会记录在提交里，不会阻断后续编辑。

## 日常流程

```bash
jj status
jj describe -m "feat: rebuild landing page"
bun run check
jj new
```

完成一项工作后：

```bash
jj log
jj bookmark set feat/landing -r @-
jj git push --bookmark feat/landing
```

推送前先确认目标提交，避免把不相关的变更一起推走。不要使用 git 分支命令绕过 jj 的书签模型。

## 查看与撤销

```bash
jj diff
jj show @
jj log -r 'all()'
jj undo
jj restore --from @- path/to/file
```

`jj undo` 撤销最近一次 jj 操作，不是 `git reset --hard` 的替代品。恢复单个文件时先确认目标提交。

## 与模板检查的关系

在提交前运行 `bun run check`。它会重新构建 Tailwind CSS、执行类型检查与 lint、运行 `bun test`、检查生成物一致性、比较行为基线并做 HTML 冒烟。生成物 `public/static/app.css` 与 `src/shared/asset-versions.ts` 必须和源码一起提交。

如果一次变更同时包含多站点克隆与模板基础设施改动，先拆成独立提交，便于 review 和回滚。
