import React, { useState, useEffect, useRef } from 'react';
import './Terminal.css';
import { io, Socket } from 'socket.io-client';

const Terminal: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [command, setCommand] = useState<string>('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const terminalOutputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 连接WebSocket
  useEffect(() => {
    const newSocket = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    setSocket(newSocket);

    // 接收命令执行结果
    newSocket.on('command_output', (data: { output: string; is_error?: boolean }) => {
      setTerminalOutput(prev => [...prev, data.output]);
    });

    // 命令执行完成
    newSocket.on('command_done', () => {
      setTerminalOutput(prev => [...prev, '']);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // 滚动到底部
  useEffect(() => {
    if (terminalOutputRef.current) {
      terminalOutputRef.current.scrollTop = terminalOutputRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  const handleToggleTerminal = () => {
    setIsCollapsed(prev => !prev);
  };

  const handleClearTerminal = () => {
    setTerminalOutput([]);
  };

  // 执行命令
  const handleExecuteCommand = () => {
    if (!command.trim() || !socket) {
      return;
    }

    // 添加命令到输出
    setTerminalOutput(prev => [...prev, `$ ${command}`]);

    // 发送命令到后端
    socket.emit('execute_command', { command });

    // 清空输入
    setCommand('');

    // 重新聚焦输入框
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleExecuteCommand();
    }
  };

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
          <div className="terminal-output" ref={terminalOutputRef}>
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
              placeholder=""
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              ref={inputRef}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Terminal;