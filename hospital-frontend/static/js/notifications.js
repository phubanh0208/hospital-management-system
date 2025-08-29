document.addEventListener('DOMContentLoaded', function() {
    if (typeof API_GATEWAY_URL === 'undefined' || typeof ACCESS_TOKEN === 'undefined' || typeof WEBSOCKET_URL === 'undefined') {
        console.error('Required API or WebSocket constants are not defined. Ensure they are set in base.html.');
        return;
    }

    // Wire dropdown actions
    const listEl = document.getElementById('notification-list');
    const btnMarkAll = document.getElementById('dropdown-mark-all-read');

    listEl?.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const container = btn.closest('li[data-notification-id]');
        const id = container?.dataset.notificationId;
        if (btn.dataset.action === 'mark-read' && id) {
            await dropdownMarkRead(id, container);
        }
    });

    btnMarkAll?.addEventListener('click', async () => {
        const items = Array.from(document.querySelectorAll('#notification-list li[data-notification-id]'));
        for (const li of items) {
            await dropdownMarkRead(li.dataset.notificationId, li);
        }
    });

    // Initial fetch + realtime
    fetchInitialNotifications();
    connectWebSocket();
});

function isUnread(n) {
    const status = (n.status || '').toString().toLowerCase();
    return !(status === 'read' || n.is_read === true);
}

function updateNoUnreadVisibility() {
    const listEl = document.getElementById('notification-list');
    const noUnread = document.getElementById('no-unread');
    const hasItems = listEl && listEl.querySelector('li[data-notification-id]');
    if (noUnread) noUnread.style.display = hasItems ? 'none' : 'block';
}

async function fetchInitialNotifications() {
    try {
        const headers = { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' };
        const qsUser = (typeof USER_ID !== 'undefined' && USER_ID && USER_ID !== 'None') ? `?userId=${encodeURIComponent(USER_ID)}` : '';

        // Unread count
        const unreadCountResponse = await fetch(`${API_GATEWAY_URL}/api/notifications/unread-count${qsUser}`, { headers });
        const unreadCountData = await unreadCountResponse.json();
        if (unreadCountData.success) updateNotificationCount(unreadCountData.data.unreadCount);

        // Recent notifications (filter unread only)
        const notificationsUrl = `${API_GATEWAY_URL}/api/notifications?limit=10${qsUser ? `&userId=${encodeURIComponent(USER_ID)}` : ''}`;
        const notificationsResponse = await fetch(notificationsUrl, { headers });
        const notificationsData = await notificationsResponse.json();
        if (notificationsData.success) {
            (notificationsData.data.notifications || [])
                .filter(isUnread)
                .forEach(n => addNotificationToList(n, true));
            updateNoUnreadVisibility();
        }
    } catch (error) {
        console.error('Error fetching initial notifications:', error);
    }
}

function connectWebSocket() {
    const token = typeof ACCESS_TOKEN !== 'undefined' ? ACCESS_TOKEN : null;
    if (!token || token === 'None' || token.trim() === '') return;

    const fullWebsocketUrl = `${WEBSOCKET_URL}?token=${token}`;
    try {
        const notificationSocket = new WebSocket(fullWebsocketUrl);
        notificationSocket.onopen = () => {};
        notificationSocket.onmessage = (event) => {
            const n = JSON.parse(event.data);
            if (isUnread(n)) {
                addNotificationToList(n, true);
                const countEl = document.getElementById('notification-count');
                const current = parseInt(countEl.textContent, 10) || 0;
                updateNotificationCount(current + 1);
                updateNoUnreadVisibility();
            }
        };
        notificationSocket.onclose = () => setTimeout(connectWebSocket, 5000);
        notificationSocket.onerror = () => {};
    } catch (_) {}
}

function updateNotificationCount(count) {
    const countElement = document.getElementById('notification-count');
    if (!countElement) return;
    if (count > 0) {
        countElement.textContent = count;
        countElement.style.display = 'inline';
    } else {
        countElement.style.display = 'none';
    }
}

function addNotificationToList(notification, prepend = false) {
    if (!isUnread(notification)) return;
    const listElement = document.getElementById('notification-list');
    if (!listElement) return;

    const li = document.createElement('li');
    li.className = 'px-2';
    li.dataset.notificationId = notification.id;
    li.innerHTML = `
        <div class="d-flex align-items-start gap-2">
            <a class="dropdown-item flex-grow-1" href="${notification.url || '#'}">
                <div class="d-flex justify-content-between">
                    <strong class="text-dark">${notification.title || 'New Notification'}</strong>
                    <small class="text-muted">${new Date(notification.created_at || notification.timestamp || Date.now()).toLocaleTimeString()}</small>
                </div>
                <div class="text-muted small">${notification.message || ''}</div>
            </a>
            <button class="btn btn-sm btn-outline-success" data-action="mark-read" title="Mark as read">
                <i class="fas fa-check"></i>
            </button>
        </div>`;

    const dividerHrs = listElement.querySelectorAll('li > hr.dropdown-divider');
    const finalDividerLi = dividerHrs.length ? dividerHrs[dividerHrs.length - 1].parentElement : null;
    if (finalDividerLi) {
        listElement.insertBefore(li, finalDividerLi);
    } else {
        listElement.appendChild(li);
    }
}

async function dropdownMarkRead(notificationId, liEl) {
    try {
        const hasUser = (typeof USER_ID !== 'undefined' && USER_ID && USER_ID !== 'None');
        const qs = hasUser ? `?userId=${encodeURIComponent(USER_ID)}` : '';
        const body = hasUser ? { userId: USER_ID } : {};
        const res = await fetch(`${API_GATEWAY_URL}/api/notifications/${notificationId}/read${qs}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        let data = {};
        try { data = await res.json(); } catch (_) { data = { success: res.ok }; }

        if (res.ok && (data.success === undefined || data.success === true)) {
            if (liEl) liEl.remove();
            const badge = document.getElementById('notification-count');
            const current = parseInt(badge.textContent, 10) || 0;
            updateNotificationCount(Math.max(0, current - 1));
            updateNoUnreadVisibility();
        } else {
            console.error('Dropdown mark read failed:', data.message || `HTTP ${res.status}`);
        }
    } catch (e) {
        console.error('Error marking dropdown notification as read:', e);
    }
}

