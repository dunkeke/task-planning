// 获取DOM元素
const newTaskInput = document.getElementById('new-task');
const addTaskButton = document.getElementById('add-task');
const taskList = document.getElementById('task-list');
const completedCount = document.getElementById('completed-count');
const totalCount = document.getElementById('total-count');
const minimizeBtn = document.getElementById('minimize');
const closeBtn = document.getElementById('close');
const restoreBtn = document.getElementById('restore-btn');
const urgentFlagInput = document.getElementById('urgent-flag');
const urgentTimeInput = document.getElementById('urgent-time');
const marketWindow = document.getElementById('market-window');
const marketList = document.getElementById('market-list');
const marketUpdated = document.getElementById('market-updated');
const marketRefreshBtn = document.getElementById('market-refresh');
const marketMinimizeBtn = document.getElementById('market-minimize');
const marketCloseBtn = document.getElementById('market-close');
const marketRestoreBtn = document.getElementById('market-restore-btn');
const workloadDateInput = document.getElementById('workload-date');
const workloadHoursInput = document.getElementById('workload-hours');
const workloadNotesInput = document.getElementById('workload-notes');
const addWorkloadButton = document.getElementById('add-workload');
const workloadList = document.getElementById('workload-list');

// 任务管理类
class TaskManager {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('dailyTasks')) || [];
        this.workloadRecords = JSON.parse(localStorage.getItem('dailyWorkloads')) || [];
        this.init();
    }

    init() {
        this.ensureTaskOrder();
        this.renderAllTasks();
        this.updateStats();
        this.renderWorkloadRecords();
        this.setupEventListeners();
        this.startAlarmWatcher();
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

        // 工作量记录事件
        addWorkloadButton.addEventListener('click', () => this.addWorkloadFromInput());
        workloadNotesInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addWorkloadFromInput();
            }
        });

        // 拖拽排序事件
        taskList.addEventListener('dragover', (e) => this.handleTaskDragOver(e));
        taskList.addEventListener('drop', () => this.persistTaskOrder());
    }

    addTaskFromInput() {
        const taskText = newTaskInput.value.trim();
        if (taskText === '') {
            alert('请输入任务内容！');
            return;
        }

        const isUrgent = urgentFlagInput.checked;
        const urgentTime = urgentTimeInput.value;
        const alarmAt = this.buildAlarmTimestamp(isUrgent, urgentTime);

        const task = {
            id: Date.now(), // 唯一ID
            text: taskText,
            completed: false,
            createdAt: new Date().toISOString(),
            completedAt: null,
            order: this.getNextOrder(),
            subtasks: [],
            urgent: isUrgent,
            urgentTime: urgentTime || null,
            alarmAt,
            alarmTriggered: false
        };

        this.tasks.push(task);
        this.saveToLocalStorage();
        this.renderAllTasks();
        this.updateStats();
        
        // 清空输入框并聚焦
        newTaskInput.value = '';
        newTaskInput.focus();
        urgentFlagInput.checked = false;
        urgentTimeInput.value = '';
    }

    renderAllTasks() {
        // 清空现有任务列表
        taskList.innerHTML = '';
        
        // 按优先级顺序排序
        const sortedTasks = [...this.tasks].sort((a, b) => {
            const orderA = Number.isFinite(a.order) ? a.order : 0;
            const orderB = Number.isFinite(b.order) ? b.order : 0;
            if (orderA !== orderB) {
                return orderA - orderB;
            }
            return new Date(a.createdAt) - new Date(b.createdAt);
        });
        
        // 渲染每个任务
        sortedTasks.forEach(task => this.renderTask(task));
    }

    ensureTaskOrder() {
        const needsOrder = this.tasks.some(task => !Number.isFinite(task.order));
        if (!needsOrder) {
            return;
        }
        const sorted = [...this.tasks].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        sorted.forEach((task, index) => {
            task.order = index;
        });
        this.saveToLocalStorage();
    }

    renderTask(task) {
        const taskItem = document.createElement('li');
        taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;
        taskItem.dataset.id = task.id;
        taskItem.draggable = true;

        taskItem.innerHTML = `
            <div class="task-priority" title="拖拽调整优先级">
                <i class="fas fa-grip-vertical"></i>
            </div>
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
                ${task.urgent && task.urgentTime ? `
                    <span class="urgent-badge">
                        <i class="fas fa-bell"></i>
                        紧急提醒 ${this.escapeHtml(task.urgentTime)}
                    </span>
                ` : ''}
                <div class="subtasks">
                    <ul class="subtask-list"></ul>
                    <div class="subtask-input">
                        <input type="text" placeholder="细化子任务...">
                        <button class="add-subtask" title="添加子任务">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="task-actions">
                <button class="delete-btn" title="删除任务">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        // 添加到列表末尾
        taskList.appendChild(taskItem);

        // 绑定事件
        const checkbox = taskItem.querySelector('input[type="checkbox"]');
        const deleteBtn = taskItem.querySelector('.delete-btn');
        const subtaskInput = taskItem.querySelector('.subtask-input input');
        const addSubtaskBtn = taskItem.querySelector('.add-subtask');
        const subtaskList = taskItem.querySelector('.subtask-list');

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

        addSubtaskBtn.addEventListener('click', () => {
            this.addSubtask(task.id, subtaskInput.value.trim());
            subtaskInput.value = '';
            subtaskInput.focus();
            this.renderSubtasks(task, subtaskList);
        });

        subtaskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addSubtask(task.id, subtaskInput.value.trim());
                subtaskInput.value = '';
                this.renderSubtasks(task, subtaskList);
            }
        });

        taskItem.addEventListener('dragstart', (e) => this.handleDragStart(e, taskItem));
        taskItem.addEventListener('dragend', () => taskItem.classList.remove('dragging'));

        this.renderSubtasks(task, subtaskList);
    }

    toggleTask(id, completed) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = completed;
            task.completedAt = completed ? new Date().toISOString() : null;
            if (completed) {
                task.alarmTriggered = true;
            }
            this.saveToLocalStorage();
        }
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.saveToLocalStorage();
    }

    addSubtask(taskId, text) {
        if (!text) {
            return;
        }
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) {
            return;
        }
        if (!Array.isArray(task.subtasks)) {
            task.subtasks = [];
        }
        task.subtasks.push({
            id: Date.now(),
            text,
            completed: false
        });
        this.saveToLocalStorage();
    }

    startAlarmWatcher() {
        this.checkUrgentAlarms();
        setInterval(() => this.checkUrgentAlarms(), 30000);
    }

    checkUrgentAlarms() {
        const now = new Date();
        let hasUpdates = false;
        this.tasks.forEach(task => {
            if (!task.urgent || task.completed || task.alarmTriggered || !task.alarmAt) {
                return;
            }
            const alarmTime = new Date(task.alarmAt);
            if (Number.isNaN(alarmTime.getTime())) {
                task.alarmTriggered = true;
                hasUpdates = true;
                return;
            }
            if (now >= alarmTime) {
                alert(`紧急任务提醒：${task.text}`);
                task.alarmTriggered = true;
                hasUpdates = true;
            }
        });
        if (hasUpdates) {
            this.saveToLocalStorage();
        }
    }

    buildAlarmTimestamp(isUrgent, urgentTime) {
        if (!isUrgent || !urgentTime) {
            return null;
        }
        const [hours, minutes] = urgentTime.split(':').map(Number);
        if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
            return null;
        }
        const now = new Date();
        const alarm = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
        if (alarm.getTime() <= now.getTime()) {
            alarm.setDate(alarm.getDate() + 1);
        }
        return alarm.toISOString();
    }

    toggleSubtask(taskId, subtaskId, completed) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task || !Array.isArray(task.subtasks)) {
            return;
        }
        const subtask = task.subtasks.find(st => st.id === subtaskId);
        if (subtask) {
            subtask.completed = completed;
            this.saveToLocalStorage();
        }
    }

    deleteSubtask(taskId, subtaskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task || !Array.isArray(task.subtasks)) {
            return;
        }
        task.subtasks = task.subtasks.filter(st => st.id !== subtaskId);
        this.saveToLocalStorage();
    }

    renderSubtasks(task, listElement) {
        listElement.innerHTML = '';
        if (!Array.isArray(task.subtasks) || task.subtasks.length === 0) {
            return;
        }

        task.subtasks.forEach(subtask => {
            const item = document.createElement('li');
            item.className = `subtask-item ${subtask.completed ? 'completed' : ''}`;
            item.innerHTML = `
                <label>
                    <input type="checkbox" ${subtask.completed ? 'checked' : ''}>
                    <span>${this.escapeHtml(subtask.text)}</span>
                </label>
                <button class="subtask-delete" title="删除子任务">
                    <i class="fas fa-times"></i>
                </button>
            `;

            const checkbox = item.querySelector('input[type="checkbox"]');
            const deleteBtn = item.querySelector('.subtask-delete');

            checkbox.addEventListener('change', (e) => {
                this.toggleSubtask(task.id, subtask.id, e.target.checked);
                item.classList.toggle('completed');
            });

            deleteBtn.addEventListener('click', () => {
                this.deleteSubtask(task.id, subtask.id);
                item.remove();
            });

            listElement.appendChild(item);
        });
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
        localStorage.setItem('dailyWorkloads', JSON.stringify(this.workloadRecords));
    }

    addWorkloadFromInput() {
        const date = workloadDateInput.value;
        const hours = workloadHoursInput.value.trim();
        const notes = workloadNotesInput.value.trim();

        if (!date || hours === '') {
            alert('请填写日期和工时！');
            return;
        }

        const record = {
            id: Date.now(),
            date,
            hours,
            notes,
            createdAt: new Date().toISOString()
        };

        this.workloadRecords.unshift(record);
        this.saveToLocalStorage();
        this.renderWorkloadRecords();

        workloadHoursInput.value = '';
        workloadNotesInput.value = '';
    }

    renderWorkloadRecords() {
        workloadList.innerHTML = '';
        if (this.workloadRecords.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'workload-empty';
            empty.textContent = '暂无记录';
            workloadList.appendChild(empty);
            return;
        }

        this.workloadRecords.forEach(record => {
            const item = document.createElement('li');
            item.className = 'workload-item';
            item.innerHTML = `
                <div class="workload-info">
                    <strong>${record.date}</strong>
                    <span>${this.escapeHtml(record.hours)}h</span>
                    <small>${this.escapeHtml(record.notes || '无备注')}</small>
                </div>
                <button class="workload-delete" title="删除记录">
                    <i class="fas fa-trash"></i>
                </button>
            `;

            item.querySelector('.workload-delete').addEventListener('click', () => {
                this.workloadRecords = this.workloadRecords.filter(r => r.id !== record.id);
                this.saveToLocalStorage();
                this.renderWorkloadRecords();
            });

            workloadList.appendChild(item);
        });
    }

    handleDragStart(event, taskItem) {
        taskItem.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', taskItem.dataset.id);
    }

    handleTaskDragOver(event) {
        event.preventDefault();
        const dragging = taskList.querySelector('.dragging');
        if (!dragging) {
            return;
        }
        const afterElement = this.getDragAfterElement(taskList, event.clientY);
        if (afterElement == null) {
            taskList.appendChild(dragging);
        } else {
            taskList.insertBefore(dragging, afterElement);
        }
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.task-item:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset, element: child };
            }
            return closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    persistTaskOrder() {
        const items = [...taskList.querySelectorAll('.task-item')];
        items.forEach((item, index) => {
            const task = this.tasks.find(t => t.id === Number(item.dataset.id));
            if (task) {
                task.order = index;
            }
        });
        this.saveToLocalStorage();
    }

    getNextOrder() {
        if (this.tasks.length === 0) {
            return 0;
        }
        const maxOrder = Math.max(...this.tasks.map(task => Number.isFinite(task.order) ? task.order : 0));
        return maxOrder + 1;
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

class MarketTicker {
    constructor(options) {
        this.listElement = options.listElement;
        this.updatedElement = options.updatedElement;
        this.symbols = [
            { symbol: 'BZ=F', name: 'Brent 原油' },
            { symbol: 'HE=F', name: '瘦肉猪' },
            { symbol: 'HH=F', name: '取暖油' }
        ];
        this.refreshIntervalMs = 120000;
        this.refreshTimer = null;
    }

    init() {
        this.renderLoading();
        this.refresh();
        this.startAutoRefresh();
    }

    startAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        this.refreshTimer = setInterval(() => this.refresh(), this.refreshIntervalMs);
    }

    async refresh() {
        const results = await Promise.all(this.symbols.map(symbol => this.fetchSymbol(symbol)));
        this.renderResults(results);
        this.updatedElement.textContent = `更新于 ${new Date().toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        })}`;
    }

    async fetchSymbol(symbol) {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol.symbol)}?range=1d&interval=5m`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            const result = data?.chart?.result?.[0];
            if (!result) {
                throw new Error('No data');
            }
            const price = result.meta?.regularMarketPrice;
            const previousClose = result.meta?.previousClose ?? result.meta?.chartPreviousClose;
            const closes = result.indicators?.quote?.[0]?.close ?? [];
            const volatility = this.calculateVolatility(closes);
            const change = price != null && previousClose != null ? price - previousClose : null;
            const changePercent = change != null && previousClose ? (change / previousClose) * 100 : null;
            return {
                ...symbol,
                price,
                change,
                changePercent,
                volatility
            };
        } catch (error) {
            return {
                ...symbol,
                error: true
            };
        }
    }

    calculateVolatility(closes) {
        if (!Array.isArray(closes)) {
            return null;
        }
        const filtered = closes.filter(value => Number.isFinite(value));
        if (filtered.length < 2) {
            return null;
        }
        const returns = [];
        for (let i = 1; i < filtered.length; i += 1) {
            const prev = filtered[i - 1];
            const current = filtered[i];
            if (prev <= 0 || current <= 0) {
                continue;
            }
            returns.push(Math.log(current / prev));
        }
        if (returns.length === 0) {
            return null;
        }
        const mean = returns.reduce((sum, val) => sum + val, 0) / returns.length;
        const variance = returns.reduce((sum, val) => sum + (val - mean) ** 2, 0) / returns.length;
        return Math.sqrt(variance) * Math.sqrt(returns.length) * 100;
    }

    renderLoading() {
        this.listElement.innerHTML = '';
        const loading = document.createElement('li');
        loading.className = 'market-empty';
        loading.textContent = '加载行情中...';
        this.listElement.appendChild(loading);
    }

    renderResults(results) {
        this.listElement.innerHTML = '';
        if (results.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'market-empty';
            empty.textContent = '暂无行情数据';
            this.listElement.appendChild(empty);
            return;
        }
        results.forEach(result => {
            const item = document.createElement('li');
            item.className = 'market-item';
            if (result.error || result.price == null) {
                item.innerHTML = `
                    <div class="market-item-header">
                        <span>${result.name}</span>
                        <small>${result.symbol}</small>
                    </div>
                    <div class="market-item-body">
                        <span class="market-volatility">行情获取失败</span>
                    </div>
                `;
            } else {
                const changeClass = result.change != null && result.change >= 0 ? 'up' : 'down';
                const changeText = result.change != null
                    ? `${result.change >= 0 ? '+' : ''}${result.change.toFixed(2)}`
                    : '--';
                const changePercentText = result.changePercent != null
                    ? `${result.changePercent >= 0 ? '+' : ''}${result.changePercent.toFixed(2)}%`
                    : '--';
                const volatilityText = result.volatility != null
                    ? `波动率 ${result.volatility.toFixed(2)}%`
                    : '波动率 --';
                item.innerHTML = `
                    <div class="market-item-header">
                        <span>${result.name}</span>
                        <small>${result.symbol}</small>
                    </div>
                    <div class="market-item-body">
                        <span class="market-price">${result.price.toFixed(2)}</span>
                        <span class="market-change ${changeClass}">${changeText} (${changePercentText})</span>
                    </div>
                    <div class="market-volatility">${volatilityText}</div>
                `;
            }
            this.listElement.appendChild(item);
        });
    }
}

// 拖拽功能
function setupDrag(windowId, storageKey) {
    const floatingWindow = document.getElementById(windowId);
    if (!floatingWindow) {
        return;
    }
    const dragHandle = floatingWindow.querySelector('.drag-handle');
    if (!dragHandle) {
        return;
    }
    
    let isDragging = false;
    let offsetX, offsetY;

    const savedPosition = localStorage.getItem(storageKey);
    if (savedPosition) {
        try {
            const position = JSON.parse(savedPosition);
            if (Number.isFinite(position.left) && Number.isFinite(position.top)) {
                floatingWindow.style.left = `${position.left}px`;
                floatingWindow.style.top = `${position.top}px`;
                floatingWindow.style.right = 'auto';
                floatingWindow.style.bottom = 'auto';
            }
        } catch (error) {
            localStorage.removeItem(storageKey);
        }
    }

    dragHandle.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);

    function startDrag(e) {
        if (e.target.closest('.controls')) {
            return;
        }
        isDragging = true;
        const rect = floatingWindow.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;

        floatingWindow.style.right = 'auto';
        floatingWindow.style.bottom = 'auto';
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
        if (isDragging) {
            localStorage.setItem(storageKey, JSON.stringify({
                left: floatingWindow.offsetLeft,
                top: floatingWindow.offsetTop
            }));
        }
        isDragging = false;
        floatingWindow.style.cursor = '';
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始化任务管理器
    window.taskManager = new TaskManager();
    
    // 设置拖拽功能
    setupDrag('floating-window', 'floatingWindowPosition');
    setupDrag('market-window', 'marketWindowPosition');

    const marketTicker = new MarketTicker({
        listElement: marketList,
        updatedElement: marketUpdated
    });
    marketTicker.init();

    marketRefreshBtn.addEventListener('click', () => marketTicker.refresh());
    marketMinimizeBtn.addEventListener('click', () => minimizeMarketWindow());
    marketCloseBtn.addEventListener('click', () => closeMarketWindow());
    marketRestoreBtn.addEventListener('click', () => restoreMarketWindow());
    
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

    workloadDateInput.value = now.toISOString().split('T')[0];
    
    // 自动聚焦到输入框
    newTaskInput.focus();
});

function minimizeMarketWindow() {
    if (!marketWindow) {
        return;
    }
    marketWindow.style.display = 'none';
    marketRestoreBtn.style.display = 'block';
}

function closeMarketWindow() {
    if (!marketWindow) {
        return;
    }
    if (confirm('关闭市场播报窗口？')) {
        marketWindow.style.display = 'none';
        marketRestoreBtn.style.display = 'block';
    }
}

function restoreMarketWindow() {
    if (!marketWindow) {
        return;
    }
    marketWindow.style.display = 'flex';
    marketRestoreBtn.style.display = 'none';
}
