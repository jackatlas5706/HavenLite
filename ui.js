// ui.js - toast and notification helpers (client-only)
(function(window){
  const toastContainer = () => document.getElementById('toastContainer');
  const notifListEl = () => document.getElementById('notificationList');

  function showToast(message, opts = {}){
    const el = document.createElement('div');
    el.className = 'toast bg-gray-800 text-sm text-gray-100 p-2 rounded shadow-md';
    el.textContent = message;
    const container = toastContainer();
    if(!container) return;
    container.appendChild(el);
    setTimeout(()=> el.classList.add('fade-out'), 2800);
    setTimeout(()=> el.remove(), 3200);
  }

  function addNotification(message){
    const notifs = JSON.parse(localStorage.getItem('notifications') || '[]');
    const item = { id: Date.now(), message, createdAt: new Date().toISOString() };
    notifs.unshift(item);
    localStorage.setItem('notifications', JSON.stringify(notifs.slice(0,100)));
    renderNotifications();
  }

  function renderNotifications(){
    const listEl = notifListEl();
    if(!listEl) return;
    const notifs = JSON.parse(localStorage.getItem('notifications') || '[]');
    listEl.innerHTML = notifs.map(n=>`<div class="notif-item text-xs text-gray-300 py-1 border-b border-gray-800">${new Date(n.createdAt).toLocaleString()} — ${n.message}</div>`).join('');
  }

  function clearNotifications(){
    localStorage.removeItem('notifications');
    renderNotifications();
  }

  // expose
  window.ui = {
    showToast,
    addNotification,
    renderNotifications,
    clearNotifications
  };

  // auto render on load
  document.addEventListener('DOMContentLoaded', ()=>{
    renderNotifications();
    const clearBtn = document.getElementById('clearNotificationsBtn');
    if(clearBtn) clearBtn.addEventListener('click', clearNotifications);
  });
})(window);