# 实现左中右结构的AI IDE UI

## 1. 整体布局设计
- 使用CSS Grid或Flexbox实现左中右三栏布局
- 左侧：文件资源管理器（固定宽度250px）
- 中间：文件编辑区域（自适应宽度，占主要空间）
- 右侧：AI助手对话框（固定宽度300px）
- 底部：可折叠终端（高度可调节，默认200px）

## 2. 组件结构设计
```
App
├── IDEContainer
│   ├── LeftPanel (文件资源管理器)
│   │   ├── FileTree
│   │   └── FileItem
│   ├── MainPanel (文件编辑区域)
│   │   ├── EditorTabs
│   │   ├── CodeEditor
│   │   └── Terminal
│   │       └── TerminalHeader (折叠/展开按钮)
│   └── RightPanel (AI助手)
│       ├── AssistantHeader
│       ├── ChatHistory
│       ├── ChatMessage
│       └── ChatInput
└── GlobalStyles
```

## 3. 实现步骤

### 3.1 更新主样式文件
- 修改`index.css`，设置全局样式、重置默认样式
- 设置`#root`为100vh高度，实现全屏布局

### 3.2 实现IDE容器布局
- 创建`IDEContainer.tsx`组件，实现三栏网格布局
- 添加响应式设计，确保在不同屏幕尺寸下正常显示

### 3.3 实现左侧文件资源管理器
- 创建`LeftPanel.tsx`组件
- 实现文件树结构，支持展开/折叠
- 添加文件点击事件，用于打开文件

### 3.4 实现中间文件编辑区域
- 创建`MainPanel.tsx`组件
- 实现标签页系统，支持多文件编辑
- 添加模拟代码编辑器（后续可集成Monaco Editor）
- 实现底部终端，支持折叠/展开功能

### 3.5 实现右侧AI助手对话框
- 创建`RightPanel.tsx`组件
- 实现聊天历史记录显示
- 添加消息输入框，支持发送消息
- 模拟AI响应功能

### 3.6 添加状态管理
- 使用React Context或useState/useReducer管理IDE状态
- 管理打开的文件、当前选中的文件、终端状态等

### 3.7 样式优化
- 添加现代化的IDE主题样式（深色主题）
- 实现组件间的间距和阴影效果
- 添加悬停和点击动画

## 4. 技术栈
- React 19 + TypeScript
- CSS Grid/Flexbox 布局
- 自定义CSS样式（现代化IDE主题）
- 无需额外第三方库（可后续扩展）

## 5. 测试计划
- 启动开发服务器，测试整体布局
- 测试文件资源管理器的展开/折叠功能
- 测试终端的折叠/展开功能
- 测试AI助手的聊天功能
- 测试响应式布局

## 6. 后续扩展建议
- 集成Monaco Editor实现真实的代码编辑功能
- 添加文件系统API，实现真实的文件操作
- 集成WebSocket实现终端的实时通信
- 添加AI API集成，实现真实的AI助手功能