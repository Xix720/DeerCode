import React, { useState } from 'react';
import './IDEContainer.css';
import Terminal from './Terminal';
import LeftPanel from './LeftPanel';
import MainPanel from './MainPanel';
import RightPanel from './RightPanel';

const IDEContainer: React.FC = () => {
  // 管理当前激活的文件
  const [activeFilePath, setActiveFilePath] = useState<string | undefined>(undefined);
  const [activeFileName, setActiveFileName] = useState<string | undefined>(undefined);

  // 处理文件点击事件
  const handleFileClick = (filePath: string, fileName: string) => {
    setActiveFilePath(filePath);
    setActiveFileName(fileName);
  };

  return (
    <div className="ide-container">
      {/* 左侧面板 - 文件资源管理器 */}
      <div className="left-panel">
        <LeftPanel onFileClick={handleFileClick} />
      </div>
      
      {/* 主面板 - 文件编辑区域 */}
      <div className="main-panel-wrapper">
        <MainPanel 
          activeFilePath={activeFilePath} 
          activeFileName={activeFileName} 
        />
      </div>
      
      {/* 右侧面板 - AI助手 */}
      <div className="right-panel">
        <RightPanel />
      </div>
      
      {/* 底部终端 */}
      <Terminal />
    </div>
  );
};

export default IDEContainer;