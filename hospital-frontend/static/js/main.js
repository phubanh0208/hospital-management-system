// Hospital Management Frontend - Main JavaScript

// Global variables
let notificationSocket = null;
let notificationCount = 0;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    initializeTheme();
    initializeChartTheme();
    initializeProfessionalEnhancements();
});

function initializeApp() {
    // Initialize tooltips
    initializeTooltips();
    
    // Initialize form validation
    initializeFormValidation();
    
    // Initialize data tables
    initializeDataTables();
    
    // Initialize auto-refresh
    initializeAutoRefresh();
    
    // Initialize search functionality
    initializeSearch();
    
    console.log('Hospital Management Frontend initialized');
}

// Initialize Bootstrap tooltips
function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Initialize form validation
function initializeFormValidation() {
    const forms = document.querySelectorAll('.needs-validation');
    
    Array.from(forms).forEach(function(form) {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });
}

// Initialize data tables
function initializeDataTables() {
    const tables = document.querySelectorAll('.data-table');
    
    tables.forEach(function(table) {
        // Add sorting functionality
        const headers = table.querySelectorAll('th[data-sort]');
        headers.forEach(function(header) {
            header.style.cursor = 'pointer';
            header.addEventListener('click', function() {
                sortTable(table, header.dataset.sort);
            });
        });
    });
}

// Sort table by column
function sortTable(table, column) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const columnIndex = parseInt(column);
    
    // Determine sort direction
    const currentSort = table.dataset.sort;
    const currentDirection = table.dataset.direction || 'asc';
    const newDirection = (currentSort === column && currentDirection === 'asc') ? 'desc' : 'asc';
    
    // Sort rows
    rows.sort(function(a, b) {
        const aValue = a.cells[columnIndex].textContent.trim();
        const bValue = b.cells[columnIndex].textContent.trim();
        
        if (newDirection === 'asc') {
            return aValue.localeCompare(bValue, undefined, {numeric: true});
        } else {
            return bValue.localeCompare(aValue, undefined, {numeric: true});
        }
    });
    
    // Update table
    rows.forEach(function(row) {
        tbody.appendChild(row);
    });
    
    // Update sort indicators
    table.dataset.sort = column;
    table.dataset.direction = newDirection;
    
    // Update header icons
    const headers = table.querySelectorAll('th[data-sort]');
    headers.forEach(function(header) {
        const icon = header.querySelector('.sort-icon');
        if (icon) {
            icon.remove();
        }
        
        if (header.dataset.sort === column) {
            const sortIcon = document.createElement('i');
            sortIcon.className = `fas fa-sort-${newDirection === 'asc' ? 'up' : 'down'} sort-icon ms-1`;
            header.appendChild(sortIcon);
        }
    });
}

// Initialize auto-refresh for dashboard
function initializeAutoRefresh() {
    if (document.querySelector('.dashboard-container')) {
        // Refresh dashboard every 5 minutes
        setInterval(function() {
            refreshDashboard();
        }, 300000);
    }
}

// Refresh dashboard data
function refreshDashboard() {
    const dashboardCards = document.querySelectorAll('.dashboard-card[data-refresh]');
    
    dashboardCards.forEach(function(card) {
        const url = card.dataset.refresh;
        if (url) {
            fetch(url)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        updateDashboardCard(card, data.data);
                    }
                })
                .catch(error => {
                    console.error('Error refreshing dashboard:', error);
                });
        }
    });
}

// Update dashboard card content
function updateDashboardCard(card, data) {
    const valueElement = card.querySelector('.card-value');
    const changeElement = card.querySelector('.card-change');
    
    if (valueElement && data.value !== undefined) {
        valueElement.textContent = data.value;
    }
    
    if (changeElement && data.change !== undefined) {
        changeElement.textContent = data.change;
        changeElement.className = `card-change ${data.change >= 0 ? 'text-success' : 'text-danger'}`;
    }
}

// Initialize search functionality
function initializeSearch() {
    const searchInputs = document.querySelectorAll('.search-input');
    
    searchInputs.forEach(function(input) {
        let searchTimeout;
        
        input.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(function() {
                performSearch(input);
            }, 500);
        });
    });
}

// Perform search
function performSearch(input) {
    const query = input.value.trim();
    const targetTable = document.querySelector(input.dataset.target);
    
    if (!targetTable) return;
    
    const rows = targetTable.querySelectorAll('tbody tr');
    
    rows.forEach(function(row) {
        const text = row.textContent.toLowerCase();
        const matches = query === '' || text.includes(query.toLowerCase());
        row.style.display = matches ? '' : 'none';
    });
    
    // Update result count
    const visibleRows = targetTable.querySelectorAll('tbody tr:not([style*="display: none"])');
    const resultCount = document.querySelector(input.dataset.resultCount);
    if (resultCount) {
        resultCount.textContent = `${visibleRows.length} results`;
    }
}

// Utility functions
function showLoading(element) {
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"></div>';
    element.appendChild(spinner);
}

function hideLoading(element) {
    const spinner = element.querySelector('.loading-spinner');
    if (spinner) {
        spinner.remove();
    }
}

function showToast(title, message, type = 'info') {
    const toastHtml = `
        <div class="toast align-items-center text-white bg-${type} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    <strong>${title}</strong><br>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    const toastElement = toastContainer.lastElementChild;
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
    
    toastElement.addEventListener('hidden.bs.toast', function() {
        toastElement.remove();
    });
}

function confirmAction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// AJAX helper functions
function makeAjaxRequest(url, options = {}) {
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken()
        }
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    return fetch(url, finalOptions)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        });
}

function getCsrfToken() {
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]');
    return csrfToken ? csrfToken.value : '';
}

// === Theme Management System ===
function initializeTheme() {
    const STORAGE_KEY = 'hm-theme';
    const root = document.documentElement;
    
    function setTheme(theme) {
        root.setAttribute('data-theme', theme);
        localStorage.setItem(STORAGE_KEY, theme);
        
        // Emit custom event for charts and other components
        document.dispatchEvent(new CustomEvent('themechange', {
            detail: { theme: theme }
        }));
        
        // Update theme toggle button
        updateThemeButton(theme);
        
        console.log('Theme changed to:', theme);
    }
    
    function currentTheme() {
        return root.getAttribute('data-theme') || 'light';
    }
    
    function toggleTheme() {
        const current = currentTheme();
        const next = current === 'dark' ? 'light' : 'dark';
        setTheme(next);
    }
    
    function updateThemeButton(theme) {
        const btn = document.getElementById('theme-toggle');
        if (btn) {
            btn.setAttribute('aria-pressed', theme === 'dark');
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
        }
    }
    
    function initTheme() {
        // Check for saved theme preference or default to system preference
        const saved = localStorage.getItem(STORAGE_KEY);
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const defaultTheme = saved || (prefersDark ? 'dark' : 'light');
        
        setTheme(defaultTheme);
        
        // Add event listener to theme toggle button
        const btn = document.getElementById('theme-toggle');
        if (btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                toggleTheme();
            });
        }
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
            if (!localStorage.getItem(STORAGE_KEY)) {
                setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }
    
    // Initialize theme system
    initTheme();
    
    // Expose theme functions globally
    window.ThemeManager = {
        setTheme: setTheme,
        currentTheme: currentTheme,
        toggleTheme: toggleTheme
    };
}

// === Chart.js Theme Integration ===
function initializeChartTheme() {
    // Only initialize if Chart.js is available
    if (typeof Chart === 'undefined') {
        return;
    }
    
    function getCSSVariable(name) {
        return getComputedStyle(document.documentElement)
            .getPropertyValue(name)
            .trim();
    }
    
    function applyChartTheme() {
        try {
            // Get theme colors from CSS variables
            const textPrimary = getCSSVariable('--text-primary');
            const textSecondary = getCSSVariable('--text-secondary');
            const textMuted = getCSSVariable('--text-muted');
            const borderDefault = getCSSVariable('--border-default');
            const surfaceElevated = getCSSVariable('--surface-elevated');
            const brandPrimary = getCSSVariable('--brand-primary');
            const brandSecondary = getCSSVariable('--brand-secondary');
            
            // Update Chart.js defaults
            Chart.defaults.color = textSecondary;
            Chart.defaults.borderColor = borderDefault;
            Chart.defaults.backgroundColor = surfaceElevated;
            
            // Plugin defaults
            Chart.defaults.plugins.legend.labels.color = textPrimary;
            Chart.defaults.plugins.title.color = textPrimary;
            
            // Tooltip defaults
            Chart.defaults.plugins.tooltip.backgroundColor = surfaceElevated;
            Chart.defaults.plugins.tooltip.titleColor = textPrimary;
            Chart.defaults.plugins.tooltip.bodyColor = textSecondary;
            Chart.defaults.plugins.tooltip.borderColor = borderDefault;
            Chart.defaults.plugins.tooltip.borderWidth = 1;
            
            // Scale defaults
            Chart.defaults.scales.category.ticks.color = textMuted;
            Chart.defaults.scales.linear.ticks.color = textMuted;
            Chart.defaults.scales.category.grid.color = borderDefault;
            Chart.defaults.scales.linear.grid.color = borderDefault;
            
            // Update existing charts
            Chart.instances.forEach(function(chart) {
                chart.update('none');
            });
            
            console.log('Chart theme applied successfully');
        } catch (error) {
            console.warn('Error applying chart theme:', error);
        }
    }
    
    // Apply initial theme
    applyChartTheme();
    
    // Re-apply theme when it changes
    document.addEventListener('themechange', function() {
        // Small delay to allow CSS variables to update
        setTimeout(applyChartTheme, 50);
    });
    
    // Expose chart theme function globally
    window.ChartTheme = {
        apply: applyChartTheme,
        getBrandColors: function() {
            return {
                primary: getCSSVariable('--brand-primary'),
                secondary: getCSSVariable('--brand-secondary'),
                accent: getCSSVariable('--brand-accent'),
                success: getCSSVariable('--brand-success'),
                warning: getCSSVariable('--brand-warning'),
                danger: getCSSVariable('--brand-danger'),
                info: getCSSVariable('--brand-info')
            };
        }
    };
}

// === Enhanced Toast Function with Medical Theme ===
function showMedicalToast(title, message, type = 'info', duration = 5000) {
    const typeClasses = {
        'success': 'bg-success',
        'error': 'bg-danger',
        'warning': 'bg-warning',
        'info': 'bg-info',
        'primary': 'bg-primary'
    };
    
    const typeIcons = {
        'success': 'fas fa-check-circle',
        'error': 'fas fa-exclamation-triangle',
        'warning': 'fas fa-exclamation-circle',
        'info': 'fas fa-info-circle',
        'primary': 'fas fa-hospital-alt'
    };
    
    const bgClass = typeClasses[type] || 'bg-info';
    const iconClass = typeIcons[type] || 'fas fa-info-circle';
    
    const toastHtml = `
        <div class="toast hm-toast align-items-center text-white ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="${iconClass} me-2"></i>
                    <strong>${title}</strong><br>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '1050';
        document.body.appendChild(toastContainer);
    }
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    const toastElement = toastContainer.lastElementChild;
    const toast = new bootstrap.Toast(toastElement, {
        delay: duration
    });
    
    toast.show();
    
    // Clean up after toast is hidden
    toastElement.addEventListener('hidden.bs.toast', function() {
        toastElement.remove();
        
        // Remove container if empty
        if (toastContainer.children.length === 0) {
            toastContainer.remove();
        }
    });
}

// === Enhanced Confirmation Dialog ===
function showMedicalConfirm(options) {
    const {
        title = 'Confirm Action',
        message = 'Are you sure?',
        type = 'warning',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        onConfirm = null,
        onCancel = null
    } = options;
    
    const typeClasses = {
        'warning': 'btn-warning',
        'danger': 'btn-danger',
        'primary': 'btn-primary',
        'success': 'btn-success'
    };
    
    const typeIcons = {
        'warning': 'fas fa-exclamation-triangle',
        'danger': 'fas fa-exclamation-circle',
        'primary': 'fas fa-info-circle',
        'success': 'fas fa-check-circle'
    };
    
    const confirmClass = typeClasses[type] || 'btn-primary';
    const iconClass = typeIcons[type] || 'fas fa-info-circle';
    
    const modalHtml = `
        <div class="modal fade" id="confirmModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="${iconClass} me-2"></i>${title}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${cancelText}</button>
                        <button type="button" class="btn ${confirmClass}" id="confirmButton">${confirmText}</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('confirmModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
    const confirmButton = document.getElementById('confirmButton');
    
    confirmButton.addEventListener('click', function() {
        modal.hide();
        if (onConfirm && typeof onConfirm === 'function') {
            onConfirm();
        }
    });
    
    // Handle cancel/close
    document.getElementById('confirmModal').addEventListener('hidden.bs.modal', function() {
        if (onCancel && typeof onCancel === 'function') {
            onCancel();
        }
        this.remove();
    });
    
    modal.show();
    
    return modal;
}

// === PROFESSIONAL UI ENHANCEMENTS ===
function initializeProfessionalEnhancements() {
    // Add hover effects to cards
    document.querySelectorAll('.card, .dashboard-card, .patient-card').forEach(card => {
        if (!card.classList.contains('hms-card-hover')) {
            card.classList.add('hms-card-hover');
        }
    });

    // Add interactive effects to buttons
    document.querySelectorAll('.btn').forEach(btn => {
        if (!btn.classList.contains('hms-button-interactive')) {
            btn.classList.add('hms-button-interactive');
        }
        
        // Add ripple effect
        btn.addEventListener('click', createRippleEffect);
    });

    // Enhanced form interactions
    document.querySelectorAll('.form-control, .form-select').forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('hms-focus-ring');
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('hms-focus-ring');
        });
    });

    // Enhanced table interactions
    document.querySelectorAll('.table').forEach(table => {
        enhanceTableProfessionally(table);
    });

    // Add loading states to forms
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function() {
            const submitBtn = this.querySelector('button[type="submit"]');
            if (submitBtn) {
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<span class="hms-spinner hms-spinner-sm me-2"></span>Please wait...';
                submitBtn.disabled = true;
                
                // Restore button after 10 seconds (fallback)
                setTimeout(() => {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }, 10000);
            }
        });
    });

    // Staggered animations for page elements
    document.querySelectorAll('.dashboard-card').forEach((card, index) => {
        card.style.setProperty('--index', index + 1);
        card.classList.add('hms-fade-in', 'hms-stagger-children');
    });

    // Enhanced tooltips for status badges
    document.querySelectorAll('.status-badge').forEach(badge => {
        const status = badge.textContent.trim().toLowerCase();
        const tooltips = {
            'scheduled': 'Appointment is scheduled and awaiting confirmation',
            'confirmed': 'Appointment has been confirmed by both parties',
            'completed': 'Appointment has been completed successfully',
            'cancelled': 'Appointment has been cancelled',
            'pending': 'Appointment is pending review or action'
        };
        
        if (tooltips[status] && !badge.hasAttribute('title')) {
            badge.setAttribute('data-bs-toggle', 'tooltip');
            badge.setAttribute('title', tooltips[status]);
            new bootstrap.Tooltip(badge);
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Alt + T for theme toggle
        if (e.altKey && e.key === 't') {
            e.preventDefault();
            const themeToggle = document.getElementById('theme-toggle');
            if (themeToggle) {
                themeToggle.click();
            }
        }
        
        // Escape to close dropdowns and modals
        if (e.key === 'Escape') {
            document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                const toggle = document.querySelector('[data-bs-toggle="dropdown"][aria-expanded="true"]');
                if (toggle) {
                    bootstrap.Dropdown.getInstance(toggle).hide();
                }
            });
        }
    });

    // Page transition effect
    const main = document.querySelector('main');
    if (main && !main.classList.contains('hms-page-transition')) {
        main.classList.add('hms-page-transition');
    }

    console.log('Professional UI enhancements initialized');
}

// Create ripple effect for buttons
function createRippleEffect(e) {
    const button = e.currentTarget;
    const existingRipple = button.querySelector('.ripple-effect');
    if (existingRipple) {
        existingRipple.remove();
    }
    
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - button.offsetLeft - radius}px`;
    circle.style.top = `${e.clientY - button.offsetTop - radius}px`;
    circle.classList.add('ripple-effect');
    
    // Add CSS for ripple effect
    circle.style.cssText += `
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
    `;
    
    // Add keyframes if not already added
    if (!document.querySelector('#ripple-keyframes')) {
        const style = document.createElement('style');
        style.id = 'ripple-keyframes';
        style.textContent = `
            @keyframes ripple {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    button.appendChild(circle);
    
    // Remove ripple after animation
    setTimeout(() => {
        if (circle.parentNode) {
            circle.remove();
        }
    }, 600);
}

// Enhance table professionally
function enhanceTableProfessionally(table) {
    // Add hover effects to rows
    table.querySelectorAll('tbody tr').forEach(row => {
        row.classList.add('hms-transition');
    });
    
    // Make headers clickable for sorting indication
    table.querySelectorAll('thead th').forEach(th => {
        if (th.textContent.trim() && !th.querySelector('.sort-indicator')) {
            th.style.cursor = 'pointer';
            th.classList.add('hms-transition');
            
            th.addEventListener('mouseenter', function() {
                if (!this.querySelector('.sort-hint')) {
                    const hint = document.createElement('i');
                    hint.className = 'fas fa-sort sort-hint ms-1 text-muted';
                    hint.style.opacity = '0.5';
                    this.appendChild(hint);
                }
            });
            
            th.addEventListener('mouseleave', function() {
                const hint = this.querySelector('.sort-hint');
                if (hint && !this.querySelector('.sort-icon')) {
                    hint.remove();
                }
            });
        }
    });
}

// Enhanced loading overlay
window.showProfessionalLoading = function(element, message = 'Loading...') {
    const overlay = document.createElement('div');
    overlay.className = 'hms-loading-overlay';
    overlay.innerHTML = `
        <div class="text-center">
            <div class="hms-spinner hms-spinner-lg mb-3"></div>
            <p class="mb-0 hms-text-muted">${message}</p>
        </div>
    `;
    
    if (typeof element === 'string') {
        element = document.querySelector(element);
    }
    
    element.style.position = 'relative';
    element.appendChild(overlay);
    return overlay;
};

window.hideProfessionalLoading = function(overlay) {
    if (overlay && overlay.parentNode) {
        overlay.classList.add('hms-fade-out');
        setTimeout(() => {
            overlay.remove();
        }, 200);
    }
};

// Enhanced notification system
window.showProfessionalNotification = function(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    const typeIcons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-triangle',
        warning: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle',
        primary: 'fas fa-hospital-alt'
    };
    
    notification.className = `alert alert-${type} alert-dismissible fade show hms-notification-enter position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 1080; min-width: 300px; max-width: 400px;';
    notification.innerHTML = `
        <i class="${typeIcons[type] || typeIcons.info} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto dismiss
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('show');
            notification.classList.add('hms-fade-out');
            setTimeout(() => notification.remove(), 150);
        }
    }, duration);
    
    return notification;
};

// Export functions for global use
window.HospitalManagement = {
    showToast,
    showMedicalToast,
    showMedicalConfirm,
    confirmAction,
    formatDate,
    formatCurrency,
    makeAjaxRequest,
    showLoading,
    hideLoading,
    // New professional functions
    showProfessionalLoading: window.showProfessionalLoading,
    hideProfessionalLoading: window.hideProfessionalLoading,
    showProfessionalNotification: window.showProfessionalNotification
};
