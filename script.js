// TaskFlow Pro - Modern Todo App JavaScript
class TodoApp {
    constructor() {
        this.todos = JSON.parse(localStorage.getItem('taskflow-todos')) || [];
        this.currentFilter = 'all';
        this.currentCategoryFilter = 'all';
        this.notificationsEnabled = localStorage.getItem('taskflow-notifications') === 'true';
        this.darkMode = localStorage.getItem('taskflow-darkmode') === 'true';
        this.currentTodoId = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.applyTheme();
        this.render();
        this.updateMotivationalQuote();
        this.startCountdownTimer();
        this.requestNotificationPermission();
    }

    setupEventListeners() {
        // Add todo
        document.getElementById('addBtn').addEventListener('click', () => this.addTodo());
        document.getElementById('todoInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTodo();
        });

        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchTodos(e.target.value);
        });

        // Filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.currentTarget.dataset.filter);
            });
        });

        document.getElementById('categoryFilter').addEventListener('change', (e) => {
            this.setCategoryFilter(e.target.value);
        });

        // Theme toggle
        document.getElementById('darkModeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Action buttons
        document.getElementById('clearCompleted').addEventListener('click', () => {
            this.clearCompleted();
        });

        document.getElementById('exportTasks').addEventListener('click', () => {
            this.exportTasks();
        });

        document.getElementById('notificationToggle').addEventListener('click', () => {
            this.toggleNotifications();
        });

        // Subtask modal
        document.querySelector('.modal-close').addEventListener('click', () => {
            this.closeSubtaskModal();
        });

        document.getElementById('addSubtaskBtn').addEventListener('click', () => {
            this.addSubtask();
        });

        document.getElementById('subtaskInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addSubtask();
        });

        // Close modal on outside click
        document.getElementById('subtaskModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeSubtaskModal();
        });
    }

    setupDragAndDrop() {
        const todoList = document.getElementById('todoList');
        new Sortable(todoList, {
            animation: 150,
            ghostClass: 'drag-over',
            onEnd: (evt) => {
                const movedTodo = this.todos.splice(evt.oldIndex, 1)[0];
                this.todos.splice(evt.newIndex, 0, movedTodo);
                this.saveTodos();
            }
        });
    }

    addTodo() {
        const input = document.getElementById('todoInput');
        const text = input.value.trim();
        
        if (!text) return;

        const todo = {
            id: Date.now(),
            text: text,
            completed: false,
            priority: document.getElementById('prioritySelect').value,
            category: document.getElementById('categorySelect').value,
            dueDate: document.getElementById('dueDateInput').value,
            createdAt: new Date().toISOString(),
            subtasks: []
        };

        this.todos.unshift(todo);
        this.saveTodos();
        this.render();
        
        // Clear inputs
        input.value = '';
        document.getElementById('dueDateInput').value = '';
        
        // Add bounce animation to add button
        const addBtn = document.getElementById('addBtn');
        addBtn.style.animation = 'bounce 0.6s ease';
        setTimeout(() => addBtn.style.animation = '', 600);

        // Show notification
        this.showNotification('Task added successfully!', 'success');
    }

    toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            todo.completedAt = todo.completed ? new Date().toISOString() : null;
            this.saveTodos();
            this.render();
            
            if (todo.completed) {
                this.showNotification('Task completed! 🎉', 'success');
            }
        }
    }

    deleteTodo(id) {
        const todoElement = document.querySelector(`[data-id="${id}"]`);
        if (todoElement) {
            todoElement.classList.add('removing');
            setTimeout(() => {
                this.todos = this.todos.filter(t => t.id !== id);
                this.saveTodos();
                this.render();
                this.showNotification('Task deleted', 'info');
            }, 300);
        }
    }

    editTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return;

        const newText = prompt('Edit task:', todo.text);
        if (newText && newText.trim()) {
            todo.text = newText.trim();
            this.saveTodos();
            this.render();
            this.showNotification('Task updated', 'info');
        }
    }

    openSubtaskModal(id) {
        this.currentTodoId = id;
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return;

        document.getElementById('subtaskModal').style.display = 'block';
        this.renderSubtasks();
    }

    closeSubtaskModal() {
        document.getElementById('subtaskModal').style.display = 'none';
        this.currentTodoId = null;
        document.getElementById('subtaskInput').value = '';
    }

    addSubtask() {
        if (!this.currentTodoId) return;
        
        const input = document.getElementById('subtaskInput');
        const text = input.value.trim();
        
        if (!text) return;

        const todo = this.todos.find(t => t.id === this.currentTodoId);
        if (todo) {
            todo.subtasks.push({
                id: Date.now(),
                text: text,
                completed: false
            });
            
            this.saveTodos();
            this.renderSubtasks();
            this.render();
            input.value = '';
        }
    }

    toggleSubtask(todoId, subtaskId) {
        const todo = this.todos.find(t => t.id === todoId);
        if (todo) {
            const subtask = todo.subtasks.find(s => s.id === subtaskId);
            if (subtask) {
                subtask.completed = !subtask.completed;
                this.saveTodos();
                this.renderSubtasks();
                this.render();
            }
        }
    }

    deleteSubtask(todoId, subtaskId) {
        const todo = this.todos.find(t => t.id === todoId);
        if (todo) {
            todo.subtasks = todo.subtasks.filter(s => s.id !== subtaskId);
            this.saveTodos();
            this.renderSubtasks();
            this.render();
        }
    }

    renderSubtasks() {
        if (!this.currentTodoId) return;
        
        const todo = this.todos.find(t => t.id === this.currentTodoId);
        if (!todo) return;

        const subtaskList = document.getElementById('subtaskList');
        subtaskList.innerHTML = '';

        todo.subtasks.forEach(subtask => {
            const li = document.createElement('li');
            li.className = 'subtask-item';
            li.innerHTML = `
                <div class="subtask-checkbox ${subtask.completed ? 'checked' : ''}" 
                     onclick="app.toggleSubtask(${this.currentTodoId}, ${subtask.id})">
                    ${subtask.completed ? '✓' : ''}
                </div>
                <span class="subtask-text ${subtask.completed ? 'completed' : ''}">${subtask.text}</span>
                <button class="action-btn-small delete-btn" onclick="app.deleteSubtask(${this.currentTodoId}, ${subtask.id})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            subtaskList.appendChild(li);
        });
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            }
        });
        
        this.render();
    }

    setCategoryFilter(category) {
        this.currentCategoryFilter = category;
        this.render();
    }

    searchTodos(query) {
        const todos = document.querySelectorAll('.todo-item');
        const searchTerm = query.toLowerCase();

        todos.forEach(todo => {
            const text = todo.querySelector('.todo-text').textContent.toLowerCase();
            const shouldShow = text.includes(searchTerm);
            todo.style.display = shouldShow ? 'flex' : 'none';
        });

        // Update empty state
        const visibleTodos = Array.from(todos).filter(todo => todo.style.display !== 'none');
        const emptyState = document.getElementById('emptyState');
        const emptyMessage = document.getElementById('emptyStateMessage');
        
        if (visibleTodos.length === 0 && query) {
            emptyState.style.display = 'block';
            emptyMessage.textContent = `No tasks found for "${query}"`;
        } else if (visibleTodos.length === 0 && this.todos.length > 0) {
            emptyState.style.display = 'block';
            emptyMessage.textContent = 'No tasks match your current filter';
        } else if (this.todos.length === 0) {
            emptyState.style.display = 'block';
            emptyMessage.textContent = "You've got this! Start planning now.";
        } else {
            emptyState.style.display = 'none';
        }
    }

    getFilteredTodos() {
        let filtered = [...this.todos];

        // Apply status filter
        if (this.currentFilter === 'pending') {
            filtered = filtered.filter(todo => !todo.completed);
        } else if (this.currentFilter === 'completed') {
            filtered = filtered.filter(todo => todo.completed);
        } else if (this.currentFilter === 'overdue') {
            filtered = filtered.filter(todo => this.isOverdue(todo) && !todo.completed);
        }

        // Apply category filter
        if (this.currentCategoryFilter !== 'all') {
            filtered = filtered.filter(todo => todo.category === this.currentCategoryFilter);
        }

        return filtered;
    }

    isOverdue(todo) {
        if (!todo.dueDate) return false;
        return new Date(todo.dueDate) < new Date() && !todo.completed;
    }

    formatDueDate(dueDate) {
        if (!dueDate) return '';
        
        const date = new Date(dueDate);
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 3600 * 24));
        
        if (days < 0) {
            return `${Math.abs(days)} days overdue`;
        } else if (days === 0) {
            return 'Due today';
        } else if (days === 1) {
            return 'Due tomorrow';
        } else {
            return `Due in ${days} days`;
        }
    }

    getCountdownTimer(dueDate) {
        if (!dueDate) return '';
        
        const date = new Date(dueDate);
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        
        if (diff <= 0) return '';
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours < 24) {
            return `${hours}h ${minutes}m left`;
        }
        
        return '';
    }

    render() {
        const todoList = document.getElementById('todoList');
        const emptyState = document.getElementById('emptyState');
        const filtered = this.getFilteredTodos();

        // Update counts
        this.updateCounts();
        this.updateProgress();

        if (filtered.length === 0) {
            todoList.innerHTML = '';
            emptyState.style.display = 'block';
            
            if (this.currentFilter !== 'all' || this.currentCategoryFilter !== 'all') {
                document.getElementById('emptyStateMessage').textContent = 'No tasks match your current filter';
            } else {
                document.getElementById('emptyStateMessage').textContent = "You've got this! Start planning now.";
            }
            return;
        }

        emptyState.style.display = 'none';
        
        todoList.innerHTML = filtered.map(todo => {
            const isOverdue = this.isOverdue(todo);
            const dueDateText = this.formatDueDate(todo.dueDate);
            const countdown = this.getCountdownTimer(todo.dueDate);
            const completedSubtasks = todo.subtasks.filter(s => s.completed).length;
            const totalSubtasks = todo.subtasks.length;
            
            return `
                <li class="todo-item ${todo.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}" 
                    data-id="${todo.id}" draggable="true">
                    <div class="priority-indicator priority-${todo.priority}"></div>
                    <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" 
                         onclick="app.toggleTodo(${todo.id})">
                        ${todo.completed ? '✓' : ''}
                    </div>
                    <div class="todo-content">
                        <div class="todo-main">
                            <span class="todo-text">${todo.text}</span>
                            <div class="todo-actions">
                                <button class="action-btn-small edit-btn" onclick="app.editTodo(${todo.id})" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn-small subtask-btn" onclick="app.openSubtaskModal(${todo.id})" title="Subtasks">
                                    <i class="fas fa-list"></i>
                                </button>
                                <button class="action-btn-small delete-btn" onclick="app.deleteTodo(${todo.id})" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        <div class="todo-meta">
                            <span class="category-tag category-${todo.category}">${todo.category}</span>
                            ${dueDateText ? `<span class="due-date ${isOverdue ? 'overdue' : ''}">${dueDateText}</span>` : ''}
                            ${countdown ? `<span class="countdown-timer">${countdown}</span>` : ''}
                            ${totalSubtasks > 0 ? `<span class="subtask-count">${completedSubtasks}/${totalSubtasks} subtasks</span>` : ''}
                        </div>
                        ${totalSubtasks > 0 ? this.renderSubtaskPreview(todo.subtasks) : ''}
                    </div>
                </li>
            `;
        }).join('');
    }

    renderSubtaskPreview(subtasks) {
        if (subtasks.length === 0) return '';
        
        const preview = subtasks.slice(0, 3);
        return `
            <div class="subtask-preview">
                ${preview.map(subtask => `
                    <div class="subtask-preview-item ${subtask.completed ? 'completed' : ''}">
                        ${subtask.completed ? '✓' : '○'} ${subtask.text}
                    </div>
                `).join('')}
                ${subtasks.length > 3 ? `<div class="subtask-more">+${subtasks.length - 3} more</div>` : ''}
            </div>
        `;
    }

    updateCounts() {
        const all = this.todos.length;
        const pending = this.todos.filter(t => !t.completed).length;
        const completed = this.todos.filter(t => t.completed).length;
        const overdue = this.todos.filter(t => this.isOverdue(t)).length;

        document.getElementById('allCount').textContent = all;
        document.getElementById('pendingCount').textContent = pending;
        document.getElementById('completedCount').textContent = completed;
        document.getElementById('overdueCount').textContent = overdue;
    }

    updateProgress() {
        const total = this.todos.length;
        const completed = this.todos.filter(t => t.completed).length;
        const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

        document.getElementById('progressFill').style.width = `${percentage}%`;
        document.getElementById('progressText').textContent = `${percentage}% Complete`;
    }

    clearCompleted() {
        if (confirm('Are you sure you want to clear all completed tasks?')) {
            this.todos = this.todos.filter(todo => !todo.completed);
            this.saveTodos();
            this.render();
            this.showNotification('Completed tasks cleared', 'info');
        }
    }

    exportTasks() {
        const dataStr = JSON.stringify(this.todos, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `taskflow-backup-${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        this.showNotification('Tasks exported successfully!', 'success');
    }

    toggleTheme() {
        this.darkMode = !this.darkMode;
        this.applyTheme();
        localStorage.setItem('taskflow-darkmode', this.darkMode);
    }

    applyTheme() {
        const icon = document.querySelector('#darkModeToggle i');
        if (this.darkMode) {
            document.body.setAttribute('data-theme', 'dark');
            icon.className = 'fas fa-sun';
        } else {
            document.body.removeAttribute('data-theme');
            icon.className = 'fas fa-moon';
        }
    }

    toggleNotifications() {
        this.notificationsEnabled = !this.notificationsEnabled;
        localStorage.setItem('taskflow-notifications', this.notificationsEnabled);
        
        const btn = document.getElementById('notificationToggle');
        const icon = btn.querySelector('i');
        
        if (this.notificationsEnabled) {
            icon.className = 'fas fa-bell';
            btn.style.background = 'var(--success-gradient)';
            this.showNotification('Notifications enabled', 'success');
        } else {
            icon.className = 'fas fa-bell-slash';
            btn.style.background = 'var(--secondary-gradient)';
            this.showNotification('Notifications disabled', 'info');
        }
    }

    requestNotificationPermission() {
        if ('Notification' in window && this.notificationsEnabled) {
            Notification.requestPermission();
        }
    }

    showNotification(message, type = 'info') {
        if (!this.notificationsEnabled) return;
        
        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('TaskFlow Pro', {
                body: message,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23667eea"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>'
            });
        }
        
        // Visual notification (toast)
        this.showToast(message, type);
    }

    showToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'secondary'}-gradient);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    updateMotivationalQuote() {
        const quotes = [
            "Stay organized, stay productive",
            "One task at a time",
            "Progress, not perfection",
            "You've got this!",
            "Small steps, big achievements",
            "Focus on what matters",
            "Turn your dreams into plans",
            "Every task completed is progress made"
        ];
        
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        document.getElementById('motivationalQuote').textContent = randomQuote;
    }

    startCountdownTimer() {
        setInterval(() => {
            this.render(); // Re-render to update countdown timers
        }, 60000); // Update every minute
    }

    saveTodos() {
        localStorage.setItem('taskflow-todos', JSON.stringify(this.todos));
    }
}

// Initialize the app
const app = new TodoApp();

// Add some CSS for toast animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .subtask-preview {
        margin-top: 8px;
        padding-left: 10px;
        border-left: 2px solid var(--border-color);
    }
    
    .subtask-preview-item {
        font-size: 0.8rem;
        color: var(--text-muted);
        margin: 2px 0;
    }
    
    .subtask-preview-item.completed {
        text-decoration: line-through;
        opacity: 0.7;
    }
    
    .subtask-more {
        font-size: 0.75rem;
        color: var(--text-muted);
        font-style: italic;
    }
    
    .subtask-count {
        background: var(--bg-secondary);
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 0.75rem;
        color: var(--text-secondary);
    }
`;
document.head.appendChild(style);