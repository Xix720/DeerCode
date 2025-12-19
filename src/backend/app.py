from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import os
import json
import threading
import time

app = Flask(__name__)
CORS(app)  # 允许所有跨域请求

# 初始化SocketIO
app.config['SECRET_KEY'] = 'your-secret-key'
socketio = SocketIO(app, cors_allowed_origins="*")

# 设置codespace目录为根目录
CODESPACE_DIR = '/Users/bytedance/Desktop/wqs/deercode/src/codespace'

# 确保codespace目录存在
if not os.path.exists(CODESPACE_DIR):
    os.makedirs(CODESPACE_DIR)

# 文件系统事件处理器
class FileSystemChangeHandler(FileSystemEventHandler):
    def __init__(self):
        super().__init__()
        self.last_event_time = {}
        self.throttle_delay = 1.0  # 1秒节流延迟，增加延迟时间
        self.last_event_details = {}  # 记录事件详情，避免重复事件
    
    def on_any_event(self, event):
        # 忽略临时文件和隐藏文件
        if event.src_path.endswith('.swp') or event.src_path.endswith('~') or os.path.basename(event.src_path).startswith('.'):
            return
        
        # 获取相对路径
        if event.src_path.startswith(CODESPACE_DIR):
            relative_path = event.src_path[len(CODESPACE_DIR):].lstrip('/')
        else:
            return
        
        # 节流处理，避免短时间内重复事件
        current_time = time.time()
        if relative_path in self.last_event_time:
            if current_time - self.last_event_time[relative_path] < self.throttle_delay:
                return
        self.last_event_time[relative_path] = current_time
        
        # 确定事件类型
        event_type = 'modified'
        if event.event_type == 'created':
            event_type = 'created'
        elif event.event_type == 'deleted':
            event_type = 'deleted'
        elif event.event_type == 'moved':
            event_type = 'moved'
        
        # 构建事件数据
        event_data = {
            'type': event_type,
            'path': relative_path,
            'timestamp': current_time
        }
        
        # 如果是移动事件，添加目标路径
        if hasattr(event, 'dest_path') and event.dest_path:
            if event.dest_path.startswith(CODESPACE_DIR):
                event_data['dest_path'] = event.dest_path[len(CODESPACE_DIR):].lstrip('/')
        
        # 检查事件是否重复
        event_key = f"{event_type}_{relative_path}_{event_data.get('dest_path', '')}"
        if event_key in self.last_event_details:
            if current_time - self.last_event_details[event_key] < self.throttle_delay:
                return
        self.last_event_details[event_key] = current_time
        
        # 发送事件到所有连接的客户端
        print(f"发送文件变化事件: {event_type} - {relative_path}")
        socketio.emit('file_change', event_data)

# 初始化文件监控器
event_handler = FileSystemChangeHandler()
observer = Observer()

# WebSocket事件处理
@socketio.on('connect')
def handle_connect():
    print('客户端已连接')
    emit('connection_established', {'message': '连接成功'})
    
    # 发送当前文件树
    try:
        entries = os.listdir(CODESPACE_DIR)
        file_tree = []
        for entry in entries:
            entry_path = os.path.join(CODESPACE_DIR, entry)
            if os.path.isdir(entry_path):
                file_tree.append({
                    'name': entry,
                    'type': 'dir',
                    'path': entry,
                    'children': []
                })
            else:
                file_tree.append({
                    'name': entry,
                    'type': 'file',
                    'path': entry,
                    'size': os.path.getsize(entry_path),
                    'modified': os.path.getmtime(entry_path)
                })
        file_tree.sort(key=lambda x: (x['type'] != 'dir', x['name']))
        emit('file_tree', {'files': file_tree})
    except Exception as e:
        print(f"发送初始文件树失败: {e}")

@socketio.on('disconnect')
def handle_disconnect():
    print('客户端已断开连接')

@socketio.on('execute_command')
def handle_execute_command(data):
    """
    执行命令并实时推送输出
    """
    command = data.get('command', '')
    print(f"执行命令: {command}")
    
    if not command:
        emit('command_output', {'output': '请输入有效的命令', 'is_error': True})
        emit('command_done')
        return
    
    import subprocess
    import shlex
    
    try:
        # 解析命令
        if command.startswith('cd '):
            # 处理cd命令
            new_dir = command[3:].strip()
            if new_dir:
                import os
                os.chdir(new_dir)
                emit('command_output', {'output': f'切换到目录: {new_dir}'})
            else:
                emit('command_output', {'output': f'当前目录: {os.getcwd()}'})
            emit('command_done')
            return
        
        # 执行命令
        process = subprocess.Popen(
            shlex.split(command),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        # 实时读取输出
        if process.stdout:
            for line in iter(process.stdout.readline, ''):
                emit('command_output', {'output': line.rstrip()})
            process.stdout.close()
        
        # 等待命令执行完成
        process.wait()
        
        # 发送命令执行完成事件
        emit('command_done')
        
    except Exception as e:
        emit('command_output', {'output': f'命令执行错误: {str(e)}', 'is_error': True})
        emit('command_done')
        return

@app.route('/api/files', methods=['GET'])
def get_files():
    """
    获取文件树结构
    参数：
        path: 可选，要获取的目录路径，默认为根目录
    """
    path = request.args.get('path', '')
    print(f"[DEBUG] 获取文件列表请求，path: {path}")
    full_path = os.path.join(CODESPACE_DIR, path.lstrip('/'))
    print(f"[DEBUG] 完整路径: {full_path}")
    
    # 检查路径是否存在
    if not os.path.exists(full_path):
        return jsonify({'error': '路径不存在'}), 404
    
    # 检查是否为目录
    if not os.path.isdir(full_path):
        return jsonify({'error': '不是目录'}), 400
    
    try:
        # 获取目录下的所有文件和子目录
        entries = os.listdir(full_path)
        file_tree = []
        
        for entry in entries:
            entry_path = os.path.join(full_path, entry)
            # 修复路径生成逻辑，确保返回的相对路径不包含多余的斜杠
            if path == '/' or path == '':
                relative_path = entry
            else:
                relative_path = os.path.join(path, entry)
            
            if os.path.isdir(entry_path):
                # 目录
                file_tree.append({
                    'name': entry,
                    'type': 'dir',
                    'path': relative_path,
                    'children': []
                })
            else:
                # 文件
                file_tree.append({
                    'name': entry,
                    'type': 'file',
                    'path': relative_path,
                    'size': os.path.getsize(entry_path),
                    'modified': os.path.getmtime(entry_path)
                })
        
        # 按名称排序，目录在前，文件在后
        file_tree.sort(key=lambda x: (x['type'] != 'dir', x['name']))
        
        print(f"[DEBUG] 返回文件列表: {file_tree}")
        return jsonify({'files': file_tree})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/<path:file_path>', methods=['GET'])
def get_file_content(file_path):
    """
    获取文件内容
    """
    full_path = os.path.join(CODESPACE_DIR, file_path)
    
    if not os.path.exists(full_path) or os.path.isdir(full_path):
        return jsonify({'error': '文件不存在'}), 404
    
    try:
        with open(full_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return jsonify({'content': content})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/<path:file_path>', methods=['PUT'])
def save_file_content(file_path):
    """
    保存文件内容
    """
    full_path = os.path.join(CODESPACE_DIR, file_path)
    content = request.json.get('content', '')
    
    try:
        # 确保目录存在
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/<path:file_path>', methods=['DELETE'])
def delete_file(file_path):
    """
    删除文件或目录
    """
    full_path = os.path.join(CODESPACE_DIR, file_path)
    
    if not os.path.exists(full_path):
        return jsonify({'error': '文件不存在'}), 404
    
    try:
        if os.path.isdir(full_path):
            # 删除目录及其内容
            import shutil
            shutil.rmtree(full_path)
        else:
            # 删除文件
            os.remove(full_path)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/files', methods=['POST'])
def create_file():
    """
    创建文件或目录
    """
    data = request.json
    path = data.get('path', '')
    name = data.get('name', '')
    is_dir = data.get('is_dir', False)
    content = data.get('content', '')
    
    if not name:
        return jsonify({'error': '文件名不能为空'}), 400
    
    # 修复路径拼接问题，确保path不会导致CODESPACE_DIR被忽略
    full_path = os.path.join(CODESPACE_DIR, path.lstrip('/'), name)
    
    try:
        if is_dir:
            # 创建目录
            os.makedirs(full_path, exist_ok=True)
        else:
            # 创建文件
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/<path:file_path>', methods=['PATCH'])
def rename_file(file_path):
    """
    重命名文件或目录
    """
    data = request.json
    new_name = data.get('new_name', '')
    
    if not new_name:
        return jsonify({'error': '新文件名不能为空'}), 400
    
    # 构建原始路径
    old_full_path = os.path.join(CODESPACE_DIR, file_path)
    
    # 检查原始路径是否存在
    if not os.path.exists(old_full_path):
        return jsonify({'error': '文件或目录不存在'}), 404
    
    # 构建新路径（在同一目录下）
    dir_path = os.path.dirname(old_full_path)
    new_full_path = os.path.join(dir_path, new_name)
    
    try:
        # 使用os.rename重命名文件或目录
        os.rename(old_full_path, new_full_path)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # 启动文件监控器
    observer.schedule(event_handler, CODESPACE_DIR, recursive=True)
    observer.start()
    print(f"开始监控目录: {CODESPACE_DIR}")
    
    try:
        # 使用socketio.run代替app.run，支持WebSocket
        # 关闭debug模式，避免开发服务器的重载问题
        socketio.run(app, debug=False, port=5000, host='0.0.0.0')
    except KeyboardInterrupt:
        print("停止监控...")
        observer.stop()
    observer.join()
