import React, { useState, useEffect } from 'react';
import './MainPanel.css';

interface Tab {
  id: string;
  name: string;
  path: string;
  content: string;
}

interface MainPanelProps {
  activeFilePath?: string;
  activeFileName?: string;
}

const MainPanel: React.FC<MainPanelProps> = ({ activeFilePath, activeFileName }) => {
  const [activeTab, setActiveTab] = useState<string>('');
  const [openTabs, setOpenTabs] = useState<Tab[]>([]);
  const [codeContent, setCodeContent] = useState<string>('');

  // 当选中的文件变化时，加载文件内容
  useEffect(() => {
    if (activeFilePath && activeFileName) {
      loadFileContent(activeFilePath, activeFileName);
    }
  }, [activeFilePath, activeFileName]);

  // 从后端加载文件内容
  const loadFileContent = async (filePath: string, fileName: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/files/${encodeURIComponent(filePath)}`);
      const data = await response.json();
      
      if (response.ok) {
        const fileContent = data.content;
        setCodeContent(fileContent);
        
        // 检查文件是否已经在标签页中打开
        const existingTab = openTabs.find(tab => tab.path === filePath);
        if (existingTab) {
          // 如果已经打开，切换到该标签页
          setActiveTab(existingTab.id);
          // 更新文件内容
          setOpenTabs(prev => prev.map(tab => 
            tab.id === existingTab.id 
              ? { ...tab, content: fileContent } 
              : tab
          ));
        } else {
          // 如果未打开，添加新标签页
          const newTab: Tab = {
            id: Date.now().toString(),
            name: fileName,
            path: filePath,
            content: fileContent
          };
          setOpenTabs(prev => [...prev, newTab]);
          setActiveTab(newTab.id);
        }
      } else {
        console.error('加载文件失败:', data.error);
      }
    } catch (err) {
      console.error('加载文件时发生错误:', err);
    }
  };

  // 切换标签页
  const switchTab = (tabId: string) => {
    setActiveTab(tabId);
    const tab = openTabs.find(t => t.id === tabId);
    if (tab) {
      setCodeContent(tab.content);
    }
  };

  const handleCloseTab = (tabId: string) => {
    // 如果关闭的是当前活跃标签页，切换到前一个标签页
    if (activeTab === tabId) {
      const closedTabIndex = openTabs.findIndex(tab => tab.id === tabId);
      const newActiveIndex = Math.max(0, closedTabIndex - 1);
      const newActiveTab = openTabs[newActiveIndex];
      if (newActiveTab) {
        setActiveTab(newActiveTab.id);
        setCodeContent(newActiveTab.content);
      } else {
        // 如果是最后一个标签页，清空编辑器
        setActiveTab('');
        setCodeContent('');
      }
    }
    
    // 移除标签页
    setOpenTabs(prev => prev.filter(tab => tab.id !== tabId));
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setCodeContent(newContent);
    
    // 更新当前标签页的内容
    setOpenTabs(prev => prev.map(tab => 
      tab.id === activeTab 
        ? { ...tab, content: newContent } 
        : tab
    ));
  };

  const handleSave = () => {
    console.log('保存文件');
    // 这里可以添加保存逻辑
  };

  const handleFormat = () => {
    console.log('格式化代码');
    // 这里可以添加格式化逻辑
  };

  const handleRun = () => {
    console.log('运行代码');
    // 这里可以添加运行逻辑
  };

  return (
    <div className="main-panel">
      {/* 编辑器标签页 */}
      <div className="editor-tabs">
        {openTabs.length === 0 ? (
          <div className="no-tabs-message">未打开文件</div>
        ) : (
          openTabs.map(tab => (
            <div
              key={tab.id}
              className={`editor-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => switchTab(tab.id)}
            >
              <span className="tab-name">{tab.name}</span>
              <button
                className="tab-close-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseTab(tab.id);
                }}
                aria-label="关闭标签"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* 代码编辑器 */}
      <div className="code-editor">
        <div className="editor-header">
          <span className="editor-language">TypeScript React</span>
          <div className="editor-actions">
            <button 
              className="editor-action-btn save-btn" 
              onClick={handleSave}
              aria-label="保存"
            >
              <span className="btn-icon">S</span>
              <span className="btn-text">保存</span>
            </button>
            <button 
              className="editor-action-btn format-btn" 
              onClick={handleFormat}
              aria-label="格式化"
            >
              <span className="btn-icon">F</span>
              <span className="btn-text">格式化</span>
            </button>
            <button 
              className="editor-action-btn run-btn" 
              onClick={handleRun}
              aria-label="运行"
            >
              <span className="btn-icon">▶</span>
              <span className="btn-text">运行</span>
            </button>
          </div>
        </div>
        
        <div className="editor-content">
          <div className="editor-line-numbers">
            {Array.from({ length: codeContent.split('\n').length }, (_, i) => (
              <div key={i} className="line-number">{i + 1}</div>
            ))}
          </div>
          <div className="editor-code">
            <textarea
              className="code-editor-textarea"
              value={codeContent}
              onChange={handleCodeChange}
              spellCheck={false}
              placeholder="在此输入代码..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainPanel;