import React, { useState } from 'react';
import './Terminal.css';

const Terminal: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  
  const handleToggleTerminal = () => {
    setIsCollapsed(prev => !prev);
  };

  const handleClearTerminal = () => {
    console.log('清除终端输出');
    // 这里可以添加清除终端输出的逻辑
  };

  // 模拟终端输出
  const terminalOutput = [
    '$ npm run dev',
    '> front@0.0.0 dev',
    '> vite',
    '',
    '  VITE v7.2.4  ready in 458 ms',
    '',
    '  ➜  Local:   http://localhost:5173/',
    '  ➜  Network: use --host to expose',
    '  ➜  press h + enter to show help',
    '',
    '  Linting and checking...',
    '  No issues found.',
    '',
    '$ ls -la',
    'total 8',
    'drwxr-xr-x  12 user  group  384 Dec 18 10:00 .',
    'drwxr-xr-x   3 user  group   96 Dec 18 09:00 ..',
    '-rw-r--r--   1 user  group  543 Dec 18 09:00 .gitignore',
    '-rw-r--r--   1 user  group  123 Dec 18 09:00 README.md',
    'drwxr-xr-x   3 user  group   96 Dec 18 09:00 src',
    '-rw-r--r--   1 user  group  890 Dec 18 09:00 package.json',
    '',
    '$ ',
  ];

  return (
    <div className={`terminal ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="terminal-header">
        <span className="terminal-title">终端</span>
        <div className="terminal-actions">
          <button 
            className="terminal-action-btn clear-btn"
            onClick={handleClearTerminal}
            aria-label="清除终端输出"
          >
            <span className="btn-icon">🗑</span>
            <span className="btn-text">清除</span>
          </button>
          <button 
            className="terminal-action-btn toggle-btn"
            onClick={handleToggleTerminal}
            aria-label={isCollapsed ? '展开终端' : '折叠终端'}
          >
            <span className="btn-icon">{isCollapsed ? '▼' : '▲'}</span>
            <span className="btn-text">{isCollapsed ? '展开' : '折叠'}</span>
          </button>
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="terminal-content">
          <div className="terminal-output">
            {terminalOutput.map((line, index) => (
              <div key={index} className="terminal-line">
                {line}
              </div>
            ))}
          </div>
          <div className="terminal-input-line">
            <span className="terminal-prompt">$</span>
            <input 
              type="text" 
              className="terminal-input" 
              placeholder="输入命令..."
              autoFocus
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Terminal;