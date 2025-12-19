import React, { useState, useEffect, useCallback } from 'react';
import './LeftPanel.css';
import FileTree from './FileTree';
import { io } from 'socket.io-client';
import { FaFile, FaFolderPlus, FaTrash, FaEdit } from 'react-icons/fa';

interface FileNode {
  name: string;
  type: 'file' | 'dir';
  path: string;
  children?: FileNode[];
  size?: number;
  modified?: number;
  isLoading?: boolean;
  isEditing?: boolean;
  isNew?: boolean;
}

interface FileChangeEvent {
  type: 'created' | 'modified' | 'deleted' | 'moved';
  path: string;
  dest_path?: string;
  timestamp: number;
}

interface LeftPanelProps {
  onFileClick: (filePath: string, fileName: string) => void;
}

const LeftPanel: React.FC<LeftPanelProps> = ({ onFileClick }) => {
  const [fileTree, setFileTree] = useState<FileNode>({
    name: 'codespace',
    type: 'dir',
    path: '/',
    children: []
  });
  const [expandedDirs, setExpandedDirs] = useState<string[]>(['/']);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // 移除不必要的 socket 状态
  // const [socket, setSocket] = useState<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string>('/');
  const [editingNode, setEditingNode] = useState<{ parentPath: string; node: FileNode } | null>(null);

  // 从后端获取指定路径的文件列表
  const fetchDirectoryContent = useCallback(async (path: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/files?path=${encodeURIComponent(path)}`);
      const data = await response.json();
      
      if (response.ok) {
        return data.files as FileNode[];
      } else {
        throw new Error(data.error || '获取目录内容失败');
      }
    } catch (err) {
      console.error(`获取目录 ${path} 内容错误:`, err);
      throw err;
    }
  }, []);

  // 更新文件树中的特定目录内容
  const updateFileTree = useCallback((node: FileNode, targetPath: string, newChildren: FileNode[]): FileNode => {
    // 比较路径时，忽略首尾斜杠，确保匹配正确
    const normalizePath = (path: string) => path.replace(/^\/|\/$/g, '');
    const normalizedNodePath = normalizePath(node.path);
    const normalizedTargetPath = normalizePath(targetPath);
    
    if (normalizedNodePath === normalizedTargetPath && node.type === 'dir') {
      return {
        ...node,
        children: newChildren,
        isLoading: false
      };
    }
    
    if (node.children) {
      return {
        ...node,
        children: node.children.map(child => updateFileTree(child, targetPath, newChildren))
      };
    }
    
    return node;
  }, []);

  // 添加防抖机制，防止reloadFileTree被频繁调用
  const [lastReloadTime, setLastReloadTime] = useState<number>(0);
  const RELOAD_DEBOUNCE_DELAY = 1000; // 1秒防抖延迟

  // 重新加载整个文件树
  const reloadFileTree = useCallback(async () => {
    const currentTime = Date.now();
    if (currentTime - lastReloadTime < RELOAD_DEBOUNCE_DELAY) {
      console.log('跳过重复的文件树重载请求');
      return;
    }
    setLastReloadTime(currentTime);
    
    setLoading(true);
    setError(null);
    
    try {
      // 先获取根目录内容
      const rootFiles = await fetchDirectoryContent('');
      
      // 构建初始根节点
      let completeTree: FileNode = {
        name: 'codespace',
        type: 'dir',
        path: '/',
        children: rootFiles
      };
      
      // 构建一个Map来存储每个目录的内容，避免重复获取
      const dirContentsMap = new Map<string, FileNode[]>();
      dirContentsMap.set('/', rootFiles);
      
      // 获取所有已展开目录的内容
      for (const dirPath of expandedDirs) {
        if (dirPath !== '/') { // 根目录已经获取过了
          try {
            const children = await fetchDirectoryContent(dirPath);
            dirContentsMap.set(dirPath, children);
          } catch (err) {
            console.error(`重新加载目录 ${dirPath} 失败:`, err);
          }
        }
      }
      
      // 递归构建完整的文件树，确保所有展开目录的内容都被正确添加
      const buildCompleteTree = (node: FileNode): FileNode => {
        // 如果是目录，并且有子目录，递归构建
        if (node.type === 'dir' && dirContentsMap.has(node.path)) {
          const children = dirContentsMap.get(node.path) || [];
          return {
            ...node,
            children: children.map(child => buildCompleteTree(child)),
            isLoading: false
          };
        }
        return node;
      };
      
      // 构建完整的文件树
      completeTree = buildCompleteTree(completeTree);
      
      // 一次性更新文件树状态，避免多次渲染
      setFileTree(completeTree);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取文件树失败');
      console.error('获取文件树错误:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchDirectoryContent, lastReloadTime, expandedDirs]);

  // 组件挂载时获取文件树
  useEffect(() => {
    // 只在组件挂载时获取一次文件树，之后通过 WebSocket 更新
    let isMounted = true;
    
    const initialLoad = async () => {
      if (isMounted) {
        await reloadFileTree();
      }
    };
    
    initialLoad();
    
    return () => {
      isMounted = false;
    };
  }, [reloadFileTree]);
  
  // 定期刷新文件树，作为WebSocket的兜底方案
  useEffect(() => {
    const interval = setInterval(() => {
      if (!socketConnected) {
        reloadFileTree();
      }
    }, 10000); // 每10秒刷新一次（仅当WebSocket未连接时）
    
    return () => {
      clearInterval(interval);
    };
  }, [reloadFileTree, socketConnected]);

  // WebSocket连接管理
  useEffect(() => {
    // 创建WebSocket连接，使用更稳定的配置
    const newSocket = io('http://localhost:5000', {
      transports: ['websocket', 'polling'], // 同时支持websocket和polling
      timeout: 10000,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });
    
    // 移除不必要的 socket 状态设置
    // setSocket(newSocket);
    
    // 连接事件
    newSocket.on('connect', () => {
      console.log('WebSocket连接成功');
      setSocketConnected(true);
      setError(null);
    });
    
    // 断开连接事件
    newSocket.on('disconnect', () => {
      console.log('WebSocket连接断开');
      setSocketConnected(false);
    });
    
    // 连接错误事件
    newSocket.on('connect_error', (err) => {
      console.error('WebSocket连接错误:', err);
      setSocketConnected(false);
      setError('WebSocket连接失败，将使用轮询模式');
    });
    
    // 连接建立确认
    newSocket.on('connection_established', (data) => {
      console.log('连接建立确认:', data);
    });
    
    // 组件卸载时关闭WebSocket连接
    return () => {
      newSocket.disconnect();
      // 移除不必要的 socket 状态设置
      // setSocket(null);
      setSocketConnected(false);
    };
  }, []);
  
  // 监听文件变化事件，使用独立的useEffect确保能访问到最新的expandedDirs
  useEffect(() => {
    // 使用socket.io-client的全局连接实例，或重新获取连接
    const socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });
    
    // 接收文件变化事件
    const handleFileChangeEvent = (event: FileChangeEvent) => {
      console.log('收到文件变化事件:', event);
      
      const handleFileChange = async () => {
        try {
          // 直接调用reloadFileTree，使用优化后的一次性更新逻辑
          // 这样可以确保所有目录的内容都被正确获取并一次性更新
          await reloadFileTree();
        } catch (err) {
          console.error('处理文件变化事件失败:', err);
        }
      };
      
      // 延迟处理，避免短时间内重复事件
      setTimeout(handleFileChange, 500);
    };
    
    socket.on('file_change', handleFileChangeEvent);
    
    // 清理事件监听
    return () => {
      socket.off('file_change', handleFileChangeEvent);
      socket.disconnect();
    };
  }, [expandedDirs, fetchDirectoryContent, updateFileTree]);

  // 设置目录加载状态
  const setDirectoryLoading = useCallback((node: FileNode, targetPath: string, isLoading: boolean): FileNode => {
    if (node.path === targetPath && node.type === 'dir') {
      return {
        ...node,
        isLoading
      };
    }
    
    if (node.children) {
      return {
        ...node,
        children: node.children.map(child => setDirectoryLoading(child, targetPath, isLoading))
      };
    }
    
    return node;
  }, []);

  const handleToggleDir = async (dirPath: string) => {
    const isCurrentlyExpanded = expandedDirs.includes(dirPath);
    
    // 更新选中状态
    setSelectedFilePath(dirPath);
    
    if (isCurrentlyExpanded) {
      // 如果当前是展开状态，折叠当前目录及其所有子目录
      setExpandedDirs(prev => {
        // 只保留不是当前目录及其子目录的路径
        return prev.filter(path => {
          // 如果路径是当前目录，或者是当前目录的子目录，则移除
          return path !== dirPath && !path.startsWith(dirPath + '/');
        });
      });
    } else {
      // 如果当前是折叠状态，获取子目录内容后展开
      setExpandedDirs(prev => [...prev, dirPath]);
      
      // 设置目录加载状态
      setFileTree(prev => setDirectoryLoading(prev, dirPath, true));
      
      try {
        // 获取子目录内容
        const children = await fetchDirectoryContent(dirPath);
        
        // 更新文件树，添加子目录内容
        setFileTree(prev => updateFileTree(prev, dirPath, children));
      } catch (err) {
        console.error(`加载目录 ${dirPath} 失败:`, err);
        // 如果加载失败，从展开列表中移除该目录
        setExpandedDirs(prev => prev.filter(path => path !== dirPath));
      }
    }
  };

  // 创建文件或目录
  const handleCreateFileOrDir = (isDir: boolean) => {
    // 确定父目录
    let parentPath = '';
    const selectedNode = findNode(fileTree, selectedFilePath);
    
    if (selectedNode && selectedNode.type === 'dir') {
      // 如果选中的是目录，在该目录下创建
      parentPath = selectedNode.path;
    } else if (selectedNode && selectedNode.type === 'file') {
      // 如果选中的是文件，在同级目录下创建
      parentPath = selectedNode.path.split('/').slice(0, -1).join('/');
    } else {
      // 默认在根目录下创建
      parentPath = '';
    }

    // 创建新节点
    const newNode: FileNode = {
      name: '',
      type: isDir ? 'dir' : 'file',
      path: `${parentPath ? parentPath + '/' : ''}new_${isDir ? 'dir' : 'file'}`,
      children: isDir ? [] : undefined,
      isEditing: true,
      isNew: true
    };

    // 将新节点添加到文件树中
    setFileTree(prevTree => {
      return addNodeToTree(prevTree, parentPath, newNode);
    });

    setEditingNode({ parentPath, node: newNode });
  };

  // 查找节点
  const findNode = (node: FileNode, path: string): FileNode | null => {
    if (node.path === path) {
      return node;
    }

    if (node.children) {
      for (const child of node.children) {
        const found = findNode(child, path);
        if (found) {
          return found;
        }
      }
    }

    return null;
  };

  // 添加节点到文件树
  const addNodeToTree = (node: FileNode, parentPath: string, newNode: FileNode): FileNode => {
    if (node.path === parentPath && node.type === 'dir') {
      return {
        ...node,
        children: [...(node.children || []), newNode]
      };
    }

    if (node.children) {
      return {
        ...node,
        children: node.children.map(child => addNodeToTree(child, parentPath, newNode))
      };
    }

    return node;
  };
  
  // 更新文件树中的节点
  const updateNodeInTree = (node: FileNode, targetPath: string, newNode: FileNode): FileNode => {
    if (node.path === targetPath) {
      // 如果找到目标节点，替换为新节点
      return newNode;
    }
    
    if (node.children) {
      // 如果有子节点，递归更新
      return {
        ...node,
        children: node.children.map(child => updateNodeInTree(child, targetPath, newNode))
      };
    }
    
    return node;
  };

  // 保存新文件或目录
  const saveNewNode = async (parentPath: string, oldPath: string, newName: string) => {
    if (!newName.trim()) {
      // 如果名称为空，移除该节点
      removeNodeFromTree(oldPath);
      return;
    }

    try {
      const nodeType = oldPath.endsWith('/new_dir') ? 'dir' : 'file';
      
      // 发送请求创建文件或目录
      const response = await fetch('http://localhost:5000/api/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newName,
          is_dir: nodeType === 'dir',
          path: parentPath,
          content: ''
        })
      });

      const data = await response.json();
      if (response.ok) {
        console.log(`${nodeType === 'dir' ? '目录' : '文件'}创建成功`);
        // 重新加载文件树
        await reloadFileTree();
      } else {
        console.error(`${nodeType === 'dir' ? '目录' : '文件'}创建失败:`, data.error);
        alert(`${nodeType === 'dir' ? '目录' : '文件'}创建失败: ${data.error}`);
      }
    } catch (err) {
      console.error(`${oldPath.endsWith('/new_dir') ? '目录' : '文件'}创建时发生错误:`, err);
      alert(`${oldPath.endsWith('/new_dir') ? '目录' : '文件'}创建时发生错误: ${err instanceof Error ? err.message : '未知错误'}`);
    }
  };

  // 从文件树中移除节点
  const removeNodeFromTree = (path: string) => {
    setFileTree(prevTree => {
      return removeNode(prevTree, path);
    });
  };

  // 移除节点
  const removeNode = (node: FileNode, path: string): FileNode => {
    if (node.children) {
      return {
        ...node,
        children: node.children.filter(child => child.path !== path).map(child => removeNode(child, path))
      };
    }

    return node;
  };

  // 处理文件或目录重命名
  const handleRename = (path: string, newName: string) => {
    // 查找编辑中的节点
    const editingInfo = editingNode;
    if (!editingInfo) return;

    if (newName.trim() || editingInfo.node.isNew) {
      const selectedNode = findNode(fileTree, path);
      
      if (selectedNode && !selectedNode.isNew) {
        // 如果是现有文件/目录的重命名，允许空名称
        if (newName.trim()) {
          // 只有当名称不为空时才执行重命名
          handleExistingFileRename(path, newName);
        } else {
          // 如果名称为空，保持编辑状态，让用户可以继续输入
          // 重新设置节点为编辑状态，保持空名称
          const newNode: FileNode = {
            ...selectedNode,
            isEditing: true
          };
          setFileTree(prevTree => updateNodeInTree(prevTree, selectedNode.path, newNode));
          // 保持编辑节点状态，不重置editingNode
          return;
        }
      } else {
        // 如果是新文件/目录的创建
        saveNewNode(editingInfo.parentPath, path, newName);
      }
    } else {
      // 对于现有文件/目录，允许空名称，保持编辑状态
      const selectedNode = findNode(fileTree, path);
      if (selectedNode) {
        // 重新设置节点为编辑状态，保持空名称
        const newNode: FileNode = {
          ...selectedNode,
          isEditing: true
        };
        setFileTree(prevTree => updateNodeInTree(prevTree, selectedNode.path, newNode));
        // 保持编辑节点状态，不重置editingNode
        return;
      }
    }

    setEditingNode(null);
  };
  
  // 处理现有文件/目录的重命名
  const handleExistingFileRename = async (path: string, newName: string) => {
    try {
      // 发送请求重命名文件或目录
      const response = await fetch(`http://localhost:5000/api/files/${encodeURIComponent(path)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          new_name: newName
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        console.log('重命名成功');
        // 直接更新文件树中的节点名称，而不是重新加载整个文件树
        // 这可以避免文件消失的问题
        const selectedNode = findNode(fileTree, path);
        if (selectedNode) {
          // 重新加载文件树，确保所有内容都正确更新
          // 但使用更可靠的方式来处理
          await reloadFileTree();
        }
      } else {
        console.error('重命名失败:', data.error);
        alert(`重命名失败: ${data.error}`);
      }
    } catch (err) {
      console.error('重命名时发生错误:', err);
      alert(`重命名时发生错误: ${err instanceof Error ? err.message : '未知错误'}`);
    }
  };
  
  // 删除文件或目录
  const handleDelete = async (path: string) => {
    // 确认删除操作
    if (!window.confirm('确定要删除选中的文件或目录吗？')) {
      return;
    }
    
    try {
      // 发送请求删除文件或目录
      const response = await fetch(`http://localhost:5000/api/files/${encodeURIComponent(path)}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      if (response.ok) {
        console.log('删除成功');
        // 重新加载文件树
        await reloadFileTree();
        // 如果删除的是当前选中的文件/目录，清空选中状态
        if (selectedFilePath === path) {
          setSelectedFilePath('/');
        }
      } else {
        console.error('删除失败:', data.error);
        alert(`删除失败: ${data.error}`);
      }
    } catch (err) {
      console.error('删除时发生错误:', err);
      alert(`删除时发生错误: ${err instanceof Error ? err.message : '未知错误'}`);
    }
  };

  return (
    <div className="left-panel">
      <div className="panel-header">
        <h3>文件资源管理器</h3>
        <div className="panel-status">
          <span className={`status-indicator ${socketConnected ? 'connected' : 'disconnected'}`}></span>
          <span className="status-text">
            {socketConnected ? '实时更新' : '轮询更新'}
          </span>
        </div>
      </div>
      <div className="file-explorer">
        {/* 新增文件和目录按钮 */}
        <div className="file-explorer-actions">
          <button 
            className="explorer-action-btn" 
            title="新增文件"
            onClick={() => handleCreateFileOrDir(false)}
          >
            <FaFile />
          </button>
          <button 
            className="explorer-action-btn" 
            title="新增目录"
            onClick={() => handleCreateFileOrDir(true)}
          >
            <FaFolderPlus />
          </button>
          {/* 禁用重命名根目录 */}
          <button 
            className="explorer-action-btn" 
            title="重命名选中项"
            onClick={() => {
              if (selectedFilePath && selectedFilePath !== '/') {
                // 触发重命名操作
                const selectedNode = findNode(fileTree, selectedFilePath);
                if (selectedNode) {
                  // 直接在文件树上设置编辑状态，使用现有的添加节点到树的逻辑
                  // 创建一个新节点，设置isEditing为true
                  const newNode: FileNode = {
                    name: selectedNode.name,
                    type: selectedNode.type,
                    path: selectedNode.path,
                    children: selectedNode.children,
                    isEditing: true
                  };
                  
                  // 将新节点添加到文件树中，替换原节点
                  setFileTree(prevTree => {
                    return updateNodeInTree(prevTree, selectedNode.path, newNode);
                  });
                  
                  // 设置编辑节点
                  setEditingNode({
                    parentPath: selectedNode.path.split('/').slice(0, -1).join('/'),
                    node: newNode
                  });
                }
              }
            }}
            disabled={selectedFilePath === '/'} 
          >
            <FaEdit />
          </button>
          {/* 禁用删除根目录 */}
          <button 
            className="explorer-action-btn" 
            title="删除选中项"
            onClick={() => {
              if (selectedFilePath && selectedFilePath !== '/') {
                handleDelete(selectedFilePath);
              }
            }}
            disabled={selectedFilePath === '/'} 
          >
            <FaTrash />
          </button>
        </div>
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <span>加载中...</span>
          </div>
        ) : error ? (
          <div className="error-state">
            <span className="error-icon">❌</span>
            <span className="error-message">{error}</span>
            <button 
              className="retry-btn"
              onClick={reloadFileTree}
            >
              重试
            </button>
          </div>
        ) : (
          <FileTree 
            fileTree={fileTree} 
            expandedDirs={expandedDirs}
            onToggleDir={handleToggleDir}
            onFileClick={(filePath, fileName) => {
              // 更新选中状态
              setSelectedFilePath(filePath);
              // 调用父组件传递的onFileClick
              onFileClick(filePath, fileName);
            }}
            selectedFilePath={selectedFilePath}
            onRename={handleRename}
          />
        )}
      </div>
    </div>
  );
};

export default LeftPanel;