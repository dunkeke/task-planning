// 获取DOM元素
const newTaskInput = document.getElementById('new-task');
const addTaskButton = document.getElementById('add-task');
const taskList = document.getElementById('task-list');
const completedCount = document.getElementById('completed-count');
const totalCount = document.getElementById('total-count');
const minimizeBtn = document.getElementById('minimize');
const closeBtn = document.getElementById('close');
const restoreBtn = document.getElementById('restore-btn');

// 任务管理类
class TaskManager {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('dailyTasks')) || [];
        this.init();
    }

    init() {
        this.renderAllTasks();
        this.updateStats();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // 添加任务事件
        addTaskButton.addEventListener('click', () => this.addTaskFromInput());
        newTaskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTaskFromInput();
            }
        });

        // 窗口控制事件
        minimizeBtn.addEventListener('click', () => this.minimizeWindow());
        closeBtn.addEventListener('click', () => this.closeWindow());
        restoreBtn.addEventListener('click', () => this.restoreWindow());
    }

    addTaskFromInput() {
        const taskText = newTaskInput.value.trim();
        if (taskText === '') {
            alert('请输入任务内容！');
            return;
        }

        const task = {
            id: Date.now(), // 唯一ID
            text: taskText,
            completed: false,
            createdAt: new Date().toISOString(),
            completedAt: null
        };

        this.tasks.push(task);
        this.saveToLocalStorage();
        this.renderTask(task);
        this.updateStats();
        
        // 清空输入框并聚焦
        newTaskInput.value = '';
        newTaskInput.focus();
    }

    renderAllTasks() {
        // 清空现有任务列表
        taskList.innerHTML = '';
        
        // 按创建时间排序（最新的在前）
        const sortedTasks = [...this.tasks].sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        // 渲染每个任务
        sortedTasks.forEach(task => this.renderTask(task));
    }

    renderTask(task) {
        const taskItem = document.createElement('li');
        taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;
        taskItem.dataset.id = task.id;

        taskItem.innerHTML = `
            <div class="task-checkbox">
                <input type="checkbox" ${task.completed ? 'checked' : ''} 
                       id="task-${task.id}">
            </div>
            <div class="task-content">
                <span class="task-text">${this.escapeHtml(task.text)}</span>
                <small class="task-time">
                    ${this.formatTime(task.createdAt)}
                    ${task.completedAt ? ` | 完成于: ${this.formatTime(task.completedAt)}` : ''}
                </small>
            </div>
            <div class="task-actions">
                <button class="delete-btn" title="删除任务">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        // 添加到列表顶部
        taskList.insertBefore(taskItem, taskList.firstChild);

        // 绑定事件
        const checkbox = taskItem.querySelector('input[type="checkbox"]');
        const deleteBtn = taskItem.querySelector('.delete-btn');

        checkbox.addEventListener('change', (e) => {
            this.toggleTask(task.id, e.target.checked);
            taskItem.classList.toggle('completed');
            this.updateStats();
        });

        deleteBtn.addEventListener('click', () => {
            if (confirm('确定要删除这个任务吗？')) {
                this.deleteTask(task.id);
                taskItem.remove();
                this.updateStats();
            }
        });
    }

    toggleTask(id, completed) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = completed;
            task.completedAt = completed ? new Date().toISOString() : null;
            this.saveToLocalStorage();
        }
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.saveToLocalStorage();
    }

    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        
        totalCount.textContent = total;
        completedCount.textContent = completed;
        
        // 如果全部完成，显示庆祝效果
        if (total > 0 && completed === total) {
            this.showCelebration();
        }
    }

    saveToLocalStorage() {
        localStorage.setItem('dailyTasks', JSON.stringify(this.tasks));
    }

    // 辅助方法
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatTime(isoString) {
        const date = new Date(isoString);
        return date.toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    showCelebration() {
        const statsElement = document.querySelector('.stats');
        statsElement.classList.add('celebrate');
        setTimeout(() => {
            statsElement.classList.remove('celebrate');
        }, 2000);
    }

    // 窗口控制方法
    minimizeWindow() {
        document.getElementById('floating-window').style.display = 'none';
        restoreBtn.style.display = 'block';
    }

    closeWindow() {
        if (confirm('关闭窗口？任务数据会保存，下次打开仍然存在。')) {
            document.getElementById('floating-window').style.display = 'none';
            restoreBtn.style.display = 'block';
        }
    }

    restoreWindow() {
        document.getElementById('floating-window').style.display = 'flex';
        restoreBtn.style.display = 'none';
    }
}

// 拖拽功能
function setupDrag() {
    const dragBar = document.getElementById('drag-bar');
    const floatingWindow = document.getElementById('floating-window');
    
    let isDragging = false;
    let offsetX, offsetY;

    dragBar.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);

    function startDrag(e) {
        isDragging = true;
        const rect = floatingWindow.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        
        floatingWindow.style.cursor = 'grabbing';
        e.preventDefault();
    }

    function drag(e) {
        if (!isDragging) return;
        
        const x = e.clientX - offsetX;
        const y = e.clientY - offsetY;
        
        // 限制窗口在可视区域内
        const maxX = window.innerWidth - floatingWindow.offsetWidth;
        const maxY = window.innerHeight - floatingWindow.offsetHeight;
        
        floatingWindow.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
        floatingWindow.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
    }

    function stopDrag() {
        isDragging = false;
        floatingWindow.style.cursor = '';
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始化任务管理器
    window.taskManager = new TaskManager();
    
    // 设置拖拽功能
    setupDrag();
    
    // 显示当前日期
    const currentDate = document.getElementById('current-date');
    const now = new Date();
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    };
    currentDate.textContent = now.toLocaleDateString('zh-CN', options);
    
    // 自动聚焦到输入框
    newTaskInput.focus();
});
