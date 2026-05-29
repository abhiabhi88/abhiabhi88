// Local Storage Manager
const StorageManager = {
    STORAGE_KEY: 'todoTasks',
    
    getTasks() {
        const tasks = localStorage.getItem(this.STORAGE_KEY);
        return tasks ? JSON.parse(tasks) : [];
    },
    
    saveTasks(tasks) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tasks));
    },
    
    addTask(task) {
        const tasks = this.getTasks();
        tasks.push(task);
        this.saveTasks(tasks);
        return task;
    },
    
    updateTask(id, updatedTask) {
        let tasks = this.getTasks();
        tasks = tasks.map(task => task.id === id ? { ...task, ...updatedTask } : task);
        this.saveTasks(tasks);
    },
    
    deleteTask(id) {
        let tasks = this.getTasks();
        tasks = tasks.filter(task => task.id !== id);
        this.saveTasks(tasks);
    },
    
    clearCompleted() {
        let tasks = this.getTasks();
        tasks = tasks.filter(task => !task.completed);
        this.saveTasks(tasks);
    },
    
    clearAll() {
        localStorage.removeItem(this.STORAGE_KEY);
    }
};

// App State
let currentFilter = 'all';
let currentSort = 'date-added';
let deleteTargetId = null;

// DOM Elements
const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');
const emptyState = document.getElementById('emptyState');
const filterBtns = document.querySelectorAll('.filter-btn');
const sortSelect = document.getElementById('sortSelect');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const exportBtn = document.getElementById('exportBtn');
const prioritySelect = document.getElementById('prioritySelect');
const categorySelect = document.getElementById('categorySelect');
const dueDateInput = document.getElementById('dueDateInput');
const totalTasksDisplay = document.getElementById('totalTasks');
const completedTasksDisplay = document.getElementById('completedTasks');
const pendingTasksDisplay = document.getElementById('pendingTasks');
const deleteModal = document.getElementById('deleteModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

// Event Listeners
addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
});

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        render();
    });
});

sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    render();
});

clearCompletedBtn.addEventListener('click', () => {
    StorageManager.clearCompleted();
    render();
});

clearAllBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all tasks?')) {
        StorageManager.clearAll();
        render();
    }
});

exportBtn.addEventListener('click', exportTasks);
confirmDeleteBtn.addEventListener('click', confirmDelete);
cancelDeleteBtn.addEventListener('click', cancelDelete);

// Add Task Function
function addTask() {
    const text = taskInput.value.trim();
    
    if (!text) {
        alert('Please enter a task!');
        return;
    }
    
    const task = {
        id: Date.now(),
        text,
        completed: false,
        priority: prioritySelect.value,
        category: categorySelect.value,
        dueDate: dueDateInput.value,
        createdAt: new Date().toISOString()
    };
    
    StorageManager.addTask(task);
    
    // Reset inputs
    taskInput.value = '';
    prioritySelect.value = 'medium';
    categorySelect.value = 'work';
    dueDateInput.value = '';
    taskInput.focus();
    
    render();
}

// Filter Tasks
function filterTasks(tasks) {
    switch (currentFilter) {
        case 'active':
            return tasks.filter(t => !t.completed);
        case 'completed':
            return tasks.filter(t => t.completed);
        case 'high':
            return tasks.filter(t => t.priority === 'high');
        default:
            return tasks;
    }
}

// Sort Tasks
function sortTasks(tasks) {
    const sorted = [...tasks];
    
    switch (currentSort) {
        case 'priority':
            const priorityOrder = { high: 1, medium: 2, low: 3 };
            return sorted.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        case 'due-date':
            return sorted.sort((a, b) => {
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate) - new Date(b.dueDate);
            });
        case 'alphabetical':
            return sorted.sort((a, b) => a.text.localeCompare(b.text));
        case 'date-added':
        default:
            return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
}

// Render Tasks
function render() {
    const tasks = StorageManager.getTasks();
    let filteredTasks = filterTasks(tasks);
    let sortedTasks = sortTasks(filteredTasks);
    
    // Update Stats
    updateStats(tasks);
    
    // Clear task list
    taskList.innerHTML = '';
    
    // Show empty state or render tasks
    if (sortedTasks.length === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        sortedTasks.forEach(task => {
            const taskElement = createTaskElement(task);
            taskList.appendChild(taskElement);
        });
    }
}

// Create Task Element
function createTaskElement(task) {
    const taskItem = document.createElement('div');
    taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;
    
    const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '';
    
    taskItem.innerHTML = `
        <input 
            type="checkbox" 
            class="task-checkbox" 
            ${task.completed ? 'checked' : ''}
            onchange="toggleTask(${task.id})"
        >
        <div class="task-content">
            <div class="task-text">${escapeHtml(task.text)}</div>
            <div class="task-meta">
                <span class="task-priority ${task.priority}">${task.priority}</span>
                <span class="task-category">${task.category}</span>
                ${dueDate ? `<span class="task-duedate">Due: ${dueDate}</span>` : ''}
            </div>
        </div>
        <div class="task-actions">
            <button class="task-action-btn edit" onclick="editTask(${task.id})" title="Edit">
                <i class="fas fa-edit"></i>
            </button>
            <button class="task-action-btn delete" onclick="deleteTask(${task.id})" title="Delete">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    return taskItem;
}

// Toggle Task Completion
function toggleTask(id) {
    const tasks = StorageManager.getTasks();
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        StorageManager.updateTask(id, { completed: task.completed });
        render();
    }
}

// Delete Task
function deleteTask(id) {
    deleteTargetId = id;
    deleteModal.style.display = 'flex';
}

// Confirm Delete
function confirmDelete() {
    if (deleteTargetId) {
        StorageManager.deleteTask(deleteTargetId);
        deleteModal.style.display = 'none';
        deleteTargetId = null;
        render();
    }
}

// Cancel Delete
function cancelDelete() {
    deleteModal.style.display = 'none';
    deleteTargetId = null;
}

// Edit Task (Opens in alert for simplicity)
function editTask(id) {
    const tasks = StorageManager.getTasks();
    const task = tasks.find(t => t.id === id);
    
    if (task) {
        const newText = prompt('Edit task:', task.text);
        if (newText && newText.trim()) {
            StorageManager.updateTask(id, { text: newText.trim() });
            render();
        }
    }
}

// Update Statistics
function updateStats(tasks) {
    const completed = tasks.filter(t => t.completed).length;
    const pending = tasks.length - completed;
    
    totalTasksDisplay.textContent = tasks.length;
    completedTasksDisplay.textContent = completed;
    pendingTasksDisplay.textContent = pending;
}

// Export Tasks
function exportTasks() {
    const tasks = StorageManager.getTasks();
    const dataStr = JSON.stringify(tasks, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tasks_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Close modal when clicking outside
deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) {
        cancelDelete();
    }
});

// Initial Render
render();