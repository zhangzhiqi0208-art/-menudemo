# Menudemo（菜品管理系统）

- **仓库**: [zhangzhiqi0208-art/-menudemo](https://github.com/zhangzhiqi0208-art/-menudemo)  
- **本地目录**: didi/menudemo（或你当前的工作目录）

一个商家外卖菜品管理系统。当前包含：

- **原有实现**：纯 HTML/CSS/JavaScript，支持菜品新建、编辑、分类与列表（合并 React 前端后保留在 `legacy-demo/`）。
- **合并后的前端**：来自 [bite-build-blog](https://github.com/zhangzhiqi0208-art/bite-build-blog) 的 Vite + React + TypeScript + shadcn-ui + Tailwind，用于交互与视觉样式。

## 功能特性

- ✅ **菜品列表查看** - 按分类查看菜品，支持搜索和筛选
- ✅ **新建菜品** - 完整的菜品信息录入表单
- ✅ **编辑菜品** - 修改已有菜品信息
- ✅ **分类管理** - 菜品分类的展示和管理
- ✅ **状态切换** - 快速启用/禁用菜品
- ✅ **数据持久化** - 使用 localStorage 保存数据

## 技术栈

- **前端**: 纯 HTML5 + CSS3 + JavaScript (ES6+)
- **数据存储**: localStorage
- **无构建工具**: 直接使用浏览器运行

## 快速开始

1. **Git 与仓库**：按 [SETUP_STEPS.md](SETUP_STEPS.md) 第一步，将本项目与 [\-menudemo](https://github.com/zhangzhiqi0208-art/-menudemo) 同步。
2. **合并 React 前端**：按 SETUP_STEPS 第二步克隆 bite-build-blog 并执行 `merge-bite-build-blog.sh`，然后 `npm install && npm run dev`。

## 文件结构（合并后）

```
menudemo/
├── index.html              # Vite 入口（合并后）
├── package.json            # 依赖与脚本
├── src/                    # React 源码（来自 bite-build-blog）
├── public/                 # 静态资源
├── legacy-demo/            # 原有 HTML/CSS/JS 备份
│   ├── index.html
│   ├── add-dish.html
│   ├── css/
│   └── js/
├── SETUP_STEPS.md          # 分步设置说明
├── merge-bite-build-blog.sh # 合并脚本
└── README.md
```

## 使用方法

1. **打开项目**
   - 直接在浏览器中打开 `index.html` 文件
   - 或使用本地服务器（推荐）：
     ```bash
     # 使用 Python
     python -m http.server 8000
     
     # 使用 Node.js (需要安装 http-server)
     npx http-server
     ```

2. **访问页面**
   - 主列表页: `index.html`
   - 新建菜品: `add-dish.html` 或点击列表页的 "Add Item" 按钮
   - 编辑菜品: 点击列表页中的任意菜品

## 数据模型

### 菜品 (Dish)
```javascript
{
  id: string,              // 唯一标识
  name: string,            // 名称
  description: string,     // 描述
  categoryId: string,      // 分类ID
  image: string,           // 图片（base64）
  deliveryPrice: number,   // 配送价格
  pickupPrice: number,     // 自取价格
  stock: number|string,    // 库存
  status: 'active'|'inactive', // 状态
  createdAt: timestamp,    // 创建时间
  updatedAt: timestamp     // 更新时间
}
```

### 分类 (Category)
```javascript
{
  id: string,              // 唯一标识
  name: string,           // 分类名称
  dishIds: string[],      // 包含的菜品ID列表
  order: number           // 排序
}
```

## 主要功能说明

### 1. 菜品列表页 (index.html)
- 左侧显示分类列表，右侧显示对应分类的菜品
- 支持搜索功能
- 支持状态筛选（待实现）
- 点击菜品可进入编辑页面
- 点击状态切换器可快速启用/禁用菜品

### 2. 新建/编辑菜品页 (add-dish.html)
- 完整的表单验证
- 支持图片上传（base64编码）
- 支持库存类型设置（无限制/有限数量）
- 支持启用/禁用状态设置

### 3. 数据管理
- 所有数据存储在浏览器的 localStorage 中
- 页面刷新后数据不会丢失
- 支持数据的增删改查操作

## 浏览器兼容性

- Chrome (推荐)
- Firefox
- Safari
- Edge

## 注意事项

1. **数据存储**: 数据存储在浏览器的 localStorage 中，清除浏览器数据会丢失所有数据
2. **图片上传**: 图片以 base64 格式存储，大量图片可能影响性能
3. **浏览器限制**: 某些浏览器可能限制 localStorage 的大小（通常为 5-10MB）

## 后续优化建议

- [ ] 添加批量操作功能
- [ ] 实现分类排序功能
- [ ] 添加更多筛选选项
- [ ] 优化图片存储（使用 IndexedDB）
- [ ] 添加数据导入/导出功能
- [ ] 添加响应式设计优化

## 开发说明

本项目采用模块化设计，各模块职责清晰：

- `data.js`: 负责数据的存储和读取
- `category.js`: 负责分类的增删改查
- `dish.js`: 负责菜品的增删改查
- `list.js`: 负责列表页的交互和渲染
- `form.js`: 负责表单页的交互和验证

## 许可证

MIT License
