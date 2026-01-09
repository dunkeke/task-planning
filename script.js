// 拖拽功能
let isDragging = false;
let currentX;
let currentY;
let initialX;
let initialY;

document.getElementById('drag-bar').addEventListener('mousedown', dragStart);

function dragStart(e) {
    initialX = e.clientX - window.floatingWindow.offsetLeft;
    initialY = e.clientY - window.floatingWindow.offsetTop;
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);
}

function drag(e) {
    e.preventDefault();
    currentX = e.clientX - initialX;
    currentY = e.clientY - initialY;
    
    window.floatingWindow.style.left = currentX + 'px';
    window.floatingWindow.style.top = currentY + 'px';
}

// 任务管理
class TaskManager {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('dailyTasks')) || [];
        this.loadTasks();
    }
    
    addTask(text) {
        const task = {
            id: Date.now(),
            text: text,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        this.tasks.push(task);
        this.save();
        this.renderTask(task);
    }
    
    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.save();
            this.updateStats();
        }
    }
    
    save() {
        localStorage.setItem('dailyTasks', JSON.stringify(this.tasks));
    }
}

// 提醒功能
function setupReminders() {
    // 检查是否有任务到时间
    setInterval(() => {
        const now = new Date();
        // 这里可以添加具体的提醒逻辑
    }, 60000); // 每分钟检查一次
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    window.floatingWindow = document.getElementById('floating-window');
    window.taskManager = new TaskManager();
    setupReminders();
    
    // 显示当前日期
    document.getElementById('current-date').textContent = 
        new Date().toLocaleDateString('zh-CN');
});