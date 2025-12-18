import React, { useState, useEffect, useCallback } from 'react';
import './LeftPanel.css';
import FileTree from './FileTree';
import { io } from 'socket.io-client';

interface FileNode {
  name: string;
  type: 'file' | 'dir';
  path: string;
  children?: FileNode[];
  size?: number;
  modified?: number;
  isLoading?: boolean;
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
      const files = await fetchDirectoryContent('');
      
      // 构建完整的文件树
      const root: FileNode = {
        name: 'codespace',
        type: 'dir',
        path: '/',
        children: files
      };
      setFileTree(root);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取文件树失败');
      console.error('获取文件树错误:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchDirectoryContent, lastReloadTime]);

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
    
    // 接收文件变化事件
    newSocket.on('file_change', (event: FileChangeEvent) => {
      console.log('收到文件变化事件:', event);
      
      // 只重新加载根目录，保持已展开目录的状态
      const handleFileChange = async () => {
        try {
          // 获取根目录内容
          const rootFiles = await fetchDirectoryContent('');
          
          // 更新根目录，保持其他目录的展开状态
          setFileTree(prev => {
            return {
              ...prev,
              children: rootFiles
            };
          });
        } catch (err) {
          console.error('处理文件变化事件失败:', err);
        }
      };
      
      // 延迟处理，避免短时间内重复事件
      setTimeout(handleFileChange, 500);
    });
    
    // 移除file_tree事件监听器，避免覆盖通过handleToggleDir展开的目录
    // 初始文件树通过组件挂载时的reloadFileTree获取，后续变化通过file_change事件处理
    
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
  }, [reloadFileTree]);

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
    
    if (isCurrentlyExpanded) {
      // 如果当前是展开状态，直接折叠
      setExpandedDirs(prev => prev.filter(path => path !== dirPath));
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
            onFileClick={onFileClick}
          />
        )}
      </div>
    </div>
  );
};

export default LeftPanel;