import React, { useState, useRef, useEffect } from 'react';
import './RightPanel.css';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

const RightPanel: React.FC = () => {
  // 使用固定的时间戳，避免在渲染中调用Date.now()
  const fixedNow = new Date();
  
  // 使用计数器生成唯一ID
  const idCounterRef = useRef<number>(4);
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: '你好！我是你的AI编程助手，有什么可以帮助你的吗？',
      sender: 'assistant',
      timestamp: new Date(fixedNow.getTime() - 3600000),
    },
    {
      id: '2',
      text: '我想了解如何实现一个左中右结构的AI IDE UI',
      sender: 'user',
      timestamp: new Date(fixedNow.getTime() - 3000000),
    },
    {
      id: '3',
      text: '实现左中右结构的AI IDE UI可以分为以下几个步骤：\n\n1. 使用CSS Grid或Flexbox创建三栏布局\n2. 左侧实现文件资源管理器，支持文件树展开/折叠\n3. 中间实现代码编辑器和可折叠终端\n4. 右侧实现AI聊天界面\n5. 添加状态管理和响应式设计\n\n我可以帮你详细实现每个部分。',
      sender: 'assistant',
      timestamp: new Date(fixedNow.getTime() - 2400000),
    },
  ]);
  
  const [inputText, setInputText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    // 添加用户消息 - 使用计数器生成ID，避免使用Date.now()
    const newUserMessage: ChatMessage = {
      id: (idCounterRef.current++).toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInputText('');
    setIsTyping(true);

    // 模拟AI响应 - 使用固定延迟，避免使用Math.random()
    const delay = 1500; // 固定1.5秒延迟
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (idCounterRef.current++).toString(),
        text: getAIResponse(),
        sender: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, delay);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 模拟AI响应函数 - 移除未使用的userInput参数
  const getAIResponse = (): string => {
    const responses = [
      '好的，我来帮你分析这个问题。首先，我们需要考虑...',
      '这个问题很有趣！让我来看看如何解决...',
      '根据你的需求，我建议这样实现...',
      '我理解你的问题了。解决方案可以分为以下几个步骤...',
      '这是一个常见的需求，让我来帮你实现...',
      '很好的问题！让我来详细解释一下...',
    ];
    
    // 使用固定索引选择响应，避免使用Math.random()
    const index = messages.length % responses.length;
    return responses[index] + '\n\n（这是一个模拟响应，实际应用中会连接到AI服务）';
  };

  return (
    <div className="right-panel">
      {/* 助手头部 */}
      <div className="assistant-header">
        <h3>AI 助手</h3>
        <div className="assistant-status">
          <span className="status-indicator online"></span>
          <span className="status-text">在线</span>
        </div>
      </div>

      {/* 聊天历史 */}
      <div className="chat-history">
        {messages.map(message => (
          <div key={message.id} className={`chat-message ${message.sender}`}>
            <div className="message-content">
              <div className="message-text">{message.text}</div>
              <div className="message-time">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="chat-message assistant typing">
            <div className="message-content">
              <div className="typing-indicator">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={chatEndRef} className="chat-end"></div>
      </div>

      {/* 聊天输入 */}
      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <textarea
            className="chat-input"
            placeholder="输入你的问题或指令...（Shift+Enter换行）"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            rows={1}
            maxLength={1000}
          />
          <button 
            className="send-btn" 
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            aria-label="发送消息"
          >
            <span className="btn-icon">▶</span>
            <span className="btn-text">发送</span>
          </button>
        </div>
        <div className="chat-help-text">
          <small>Shift+Enter 换行 | Ctrl+Enter 发送</small>
        </div>
      </div>
    </div>
  );
};

export default RightPanel;