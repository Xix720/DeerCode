import React from 'react';
import './FileTree.css';
import {
  FaFolder,
  FaFileCode,
  FaFileAlt,
  FaFileExport,
  FaFilePdf,
  FaFileImage,
  FaFileArchive
} from 'react-icons/fa';

interface FileNode {
  name: string;
  type: 'file' | 'dir';
  path: string;
  children?: FileNode[];
  size?: number;
  modified?: number;
  isLoading?: boolean;
}

interface FileTreeProps {
  fileTree: FileNode;
  expandedDirs: string[];
  onToggleDir: (dirPath: string) => void;
  onFileClick: (filePath: string, fileName: string) => void;
  selectedFilePath: string;
  onRename?: (path: string, newName: string) => void;
}

const FileTree: React.FC<FileTreeProps> = ({ fileTree, expandedDirs, onToggleDir, onFileClick, selectedFilePath, onRename }) => {
  // 编辑状态管理 - 使用Map存储每个节点的编辑名称
  const [editNames, setEditNames] = React.useState<Map<string, string>>(new Map());

  // 根据文件扩展名获取对应的图标
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    
    switch (extension) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
      case 'html':
      case 'css':
      case 'scss':
      case 'less':
      case 'php':
      case 'java':
      case 'c':
      case 'cpp':
      case 'cs':
      case 'go':
      case 'rb':
      case 'py':
        return <FaFileCode className="file-icon code" />;
      case 'json':
        return <FaFileAlt className="file-icon json" />;
      case 'md':
      case 'txt':
      case 'rtf':
        return <FaFileAlt className="file-icon text" />;
      case 'pdf':
        return <FaFilePdf className="file-icon pdf" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
      case 'bmp':
        return <FaFileImage className="file-icon image" />;
      case 'zip':
      case 'rar':
      case 'tar':
      case 'gz':
      case '7z':
        return <FaFileArchive className="file-icon archive" />;
      default:
        return <FaFileExport className="file-icon default" />;
    }
  };

  const renderFileNode = (node: FileNode, level: number = 0) => {
    const isExpanded = expandedDirs.includes(node.path);
    // 目录总是可以展开/折叠，不管是否有子目录
    const isDir = node.type === 'dir';
    // 只有当目录有子目录时才渲染子目录列表
    const shouldRenderChildren = isDir && isExpanded && node.children && node.children.length > 0;
    const isSelected = selectedFilePath === node.path;
    const isEditing = (node as any).isEditing || false;
    // 从Map中获取编辑名称，没有则使用node.name
    // 使用has检查Map中是否存在键，确保空字符串也能正确显示
    const editName = editNames.has(node.path) ? editNames.get(node.path) || '' : node.name;

    return (
      <li key={node.path} className="file-node">
        <div 
          className={`file-item ${isSelected ? 'selected' : ''}`}
          onClick={() => {
            if (isDir) {
              // 点击目录时更新选中状态并展开/折叠目录
              onToggleDir(node.path);
            } else {
              onFileClick(node.path, node.name);
            }
          }}
        >
          {isDir && (
            <button
              className={`toggle-btn ${isExpanded ? 'expanded' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleDir(node.path);
              }}
              aria-label={isExpanded ? '折叠目录' : '展开目录'}
            >
              ▶
            </button>
          )}
          {!isDir && <span className="file-icon-spacer"></span>}
          
          {isDir ? (
            <FaFolder className="file-icon folder" />
          ) : (
            getFileIcon(node.name)
          )}
          
          {isEditing ? (
            <input
              type="text"
              className="file-name-edit"
              value={editName}
              autoFocus
              onBlur={(_) => {
                if (onRename) {
                  onRename(node.path, editName);
                }
              }}
              onKeyDown={(e) => {
                if (onRename) {
                  if (e.key === 'Enter') {
                    onRename(node.path, editName);
                  } else if (e.key === 'Escape') {
                    onRename(node.path, (node as any).isNew ? '' : node.name);
                  }
                }
              }}
              onChange={(e) => {
                // 更新编辑状态的名称
                setEditNames(prev => {
                  const newMap = new Map(prev);
                  newMap.set(node.path, e.target.value);
                  return newMap;
                });
              }}
            />
          ) : (
            <span className="file-name">{node.name}</span>
          )}
          

          
          {/* 目录加载状态指示器 */}
          {isDir && node.isLoading && (
            <span className="dir-loading-indicator">
              <span className="loading-dot"></span>
              <span className="loading-dot"></span>
              <span className="loading-dot"></span>
            </span>
          )}
        </div>
        
        {shouldRenderChildren && (
          <ul className="file-tree">
            {node.children!.map(child => renderFileNode(child, level + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <ul className="file-tree">
      {renderFileNode(fileTree)}
    </ul>
  );
};

export default FileTree;