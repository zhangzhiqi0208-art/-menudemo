# Menudemo 项目分步设置

项目目录：**didi/menudemo**（或你当前的文件夹）  
GitHub 仓库：[zhangzhiqi0208-art/-menudemo](https://github.com/zhangzhiqi0208-art/-menudemo)  
合并来源：[zhangzhiqi0208-art/bite-build-blog](https://github.com/zhangzhiqi0208-art/bite-build-blog)（Vite + React + TypeScript + shadcn-ui + Tailwind）

---

## 第一步：Git 与 -menudemo 仓库同步

在项目根目录（当前文件夹，建议命名为 **didi/menudemo**）执行：

```bash
# 1. 若尚未初始化 Git
git init

# 2. 添加远程仓库（-menudemo 为空仓库，用于同步）
git remote add origin https://github.com/zhangzhiqi0208-art/-menudemo.git

# 若已存在 origin 且指向其他地址，可先删除再添加：
# git remote remove origin
# git remote add origin https://github.com/zhangzhiqi0208-art/-menudemo.git

# 3. 若 -menudemo 已有内容且你希望保留，可先 pull；若为空则跳过
# git pull origin main --allow-unrelated-histories

# 4. 添加、提交并推送（首次推送）
git add .
git commit -m "chore: 合并 bite-build-blog 前端，保留 legacy-demo 备份"
git branch -M main
git push -u origin main
```

若仓库为私有，需先配置 GitHub 认证（SSH 或 Personal Access Token）。

---

## 第二步：合并 bite-build-blog 前端（交互与视觉）【已完成】

bite-build-blog 的 React 前端已合并到本项目，原有页面已备份到 **`legacy-demo/`**。

若你需要在其他机器上重新执行合并，可按以下步骤操作：

### 2.1 克隆 bite-build-blog（仅本地，不影响原仓库）

```bash
git clone https://github.com/zhangzhiqi0208-art/bite-build-blog.git ~/Downloads/bite-build-blog
```

### 2.2 执行合并脚本

在**本项目根目录**执行（将路径换成你克隆的位置）：

```bash
LOVABLE_SOURCE=~/Downloads/bite-build-blog bash merge-bite-build-blog.sh
```

### 2.3 安装依赖并运行

```bash
npm install
npm run dev
```

在浏览器打开终端提示的地址（通常为 http://localhost:5173）查看合并后的前端。

---

## 第三步：后续开发与同步

- 日常开发在 **didi/menudemo** 进行，提交后推送到 **-menudemo**：
  ```bash
  git add .
  git commit -m "你的提交说明"
  git push
  ```
- 菜品管理业务可逐步在 React 中实现（数据模型参考 `legacy-demo/js/data.js`、`dish.js`、`category.js` 等）。

---

## 注意事项

- 合并脚本**不会**向 bite-build-blog 仓库做任何推送或修改，仅从本地克隆目录读取并复制文件。
- 原仓库 [bite-build-blog](https://github.com/zhangzhiqi0208-art/bite-build-blog) 保持独立，不受影响。
