/* admin.js — Simple NCLEX Platform Admin Portal Controller */

(function () {
  const API_ADMIN = '/api/admin';
  const API_AUTH  = '/api/auth';
  let token = localStorage.getItem('nclex_token');
  let currentUser = JSON.parse(localStorage.getItem('nclex_user') || 'null');

  let allCoursesList = [];
  let allUsersList = [];
  let currentRegStatus = 'all';
  let pendingRejectRegId = null;

  // ── TOAST NOTIFICATIONS ────────────────────────────────────────────────────
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `admin-toast ${type}`;
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ── AUTH CHECK & INITIALIZATION ────────────────────────────────────────────
  async function checkAdminAuth() {
    if (!token) {
      redirectToLogin('Please log in with administrator credentials.');
      return false;
    }

    try {
      const res = await fetch(`${API_AUTH}/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        redirectToLogin('Session expired. Please log in again.');
        return false;
      }
      const data = await res.json();
      if (!data.success || !data.user || data.user.role !== 'admin') {
        redirectToLogin('Access denied. Administrator privileges required.');
        return false;
      }
      currentUser = data.user;
      localStorage.setItem('nclex_user', JSON.stringify(currentUser));
      updateAdminProfileUI();
      return true;
    } catch (err) {
      console.error('Auth verification failed:', err);
      redirectToLogin('Could not verify credentials.');
      return false;
    }
  }

  function redirectToLogin(msg) {
    showToast(msg, 'error');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1200);
  }

  function updateAdminProfileUI() {
    if (!currentUser) return;
    const nameEl = document.getElementById('sidebarAdminName');
    const avatarEl = document.getElementById('sidebarAvatar');
    const name = `${currentUser.firstName || 'Admin'} ${currentUser.lastName || ''}`.trim();
    if (nameEl) nameEl.textContent = name;
    if (avatarEl) avatarEl.textContent = (currentUser.firstName || 'A')[0].toUpperCase();
  }

  // ── VIEW SWITCHING ─────────────────────────────────────────────────────────
  const viewTitles = {
    dashboardView: 'Dashboard Overview',
    registrationsView: 'Course Registrations & Approval Queue',
    coursesView: 'Course Management & Picture Editor',
    curriculumView: 'Course Curriculum & Modules',
    demoMcqsView: 'NCLEX Q-Bank DEMO MCQs',
    qbankQuestionsView: 'NCLEX & SNLE Question Bank (All Items)',
    qbankSubscriptionsView: 'Q-Bank Subscriptions & Access Management',
    settingsView: 'Site Content & Personal Details',
    usersView: 'Students & Users Directory',
  };

  function switchAdminView(targetInput) {
    if (!targetInput) return;
    let targetId = targetInput;
    const map = {
      'overview': 'dashboardView',
      'dashboard': 'dashboardView',
      'dashboardview': 'dashboardView',
      'registrations': 'registrationsView',
      'registrationsview': 'registrationsView',
      'enrollments': 'registrationsView',
      'courses': 'coursesView',
      'coursesview': 'coursesView',
      'curriculum': 'curriculumView',
      'curriculumview': 'curriculumView',
      'demo-mcqs': 'demoMcqsView',
      'demomcqs': 'demoMcqsView',
      'demomcqsview': 'demoMcqsView',
      'demo': 'demoMcqsView',
      'questions': 'qbankQuestionsView',
      'qbankquestionsview': 'qbankQuestionsView',
      'qbank': 'qbankQuestionsView',
      'subscriptions': 'qbankSubscriptionsView',
      'qbanksubscriptionsview': 'qbankSubscriptionsView',
      'settings': 'settingsView',
      'settingsview': 'settingsView',
      'users': 'usersView',
      'usersview': 'usersView'
    };
    const lower = String(targetInput).toLowerCase().trim();
    if (map[lower]) {
      targetId = map[lower];
    }

    const navItems = document.querySelectorAll('.admin-nav-item');
    const views = document.querySelectorAll('.admin-view');
    const pageTitle = document.getElementById('pageTitle');

    navItems.forEach(n => {
      if (n.dataset.target === targetId) {
        n.classList.add('active');
      } else {
        n.classList.remove('active');
      }
    });

    views.forEach(v => v.classList.remove('active'));
    const targetView = document.getElementById(targetId);
    if (targetView) {
      targetView.classList.add('active');
    }

    if (pageTitle && viewTitles[targetId]) {
      pageTitle.textContent = viewTitles[targetId];
    }

    // Trigger view-specific loads safely
    try {
      if (targetId === 'dashboardView') loadStats();
      if (targetId === 'registrationsView') loadRegistrations();
      if (targetId === 'coursesView') loadCourses();
      if (targetId === 'curriculumView') loadCurriculumView();
      if (targetId === 'demoMcqsView') loadDemoMcqs();
      if (targetId === 'qbankQuestionsView') loadQBankQuestions();
      if (targetId === 'qbankSubscriptionsView') loadQBankSubscriptions();
      if (targetId === 'settingsView') loadSiteSettings();
      if (targetId === 'usersView') loadUsers();
    } catch (err) {
      console.warn('Error during tab load:', err);
    }
  }
  window.switchAdminView = switchAdminView;

  function setupNavigation() {
    const navItems = document.querySelectorAll('.admin-nav-item');

    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = item.dataset.target;
        if (!targetId) return;
        switchAdminView(targetId);
        try {
          const url = new URL(window.location.href);
          url.searchParams.set('tab', targetId.replace('View', '').toLowerCase());
          window.history.pushState({}, '', url);
        } catch (_) {}
      });
    });

    const viewAllRegsBtn = document.getElementById('viewAllRegistrationsBtn');
    if (viewAllRegsBtn) {
      viewAllRegsBtn.addEventListener('click', () => {
        const regNav = document.querySelector('.admin-nav-item[data-target="registrationsView"]');
        if (regNav) regNav.click();
      });
    }

    const topbarNewCourseBtn = document.getElementById('topbarNewCourseBtn');
    if (topbarNewCourseBtn) {
      topbarNewCourseBtn.addEventListener('click', () => openCourseModal());
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('nclex_token');
        localStorage.removeItem('nclex_user');
        showToast('Logged out successfully.', 'info');
        setTimeout(() => window.location.href = 'login.html', 500);
      });
    }
  }

  // ── 1. LOAD DASHBOARD STATS ────────────────────────────────────────────────
  async function loadStats() {
    try {
      const res = await fetch(`${API_ADMIN}/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      const s = data.stats;
      document.getElementById('statPending').textContent = s.pendingRegistrations || 0;
      document.getElementById('statStudents').textContent = s.totalStudents || 0;
      document.getElementById('statCourses').textContent = s.totalCourses || 0;
      const approvedEl = document.getElementById('statApproved');
      if (approvedEl) approvedEl.textContent = s.approvedEnrollments || 0;

      // Q-Bank Stats
      const qbQEl = document.getElementById('statQBankQuestions');
      if (qbQEl) qbQEl.textContent = s.qbankQuestionsCount || 0;

      const qbPendingEl = document.getElementById('statQBankPending');
      if (qbPendingEl) qbPendingEl.textContent = s.qbankPendingCount || 0;

      // Update sidebar badge
      const badge = document.getElementById('sidebarPendingBadge');
      if (badge) {
        if (s.pendingRegistrations > 0) {
          badge.textContent = s.pendingRegistrations;
          badge.style.display = 'inline-block';
        } else {
          badge.style.display = 'none';
        }
      }

      const qbBadge = document.getElementById('sidebarQBankPendingBadge');
      if (qbBadge) {
        if (s.qbankPendingCount > 0) {
          qbBadge.textContent = s.qbankPendingCount;
          qbBadge.style.display = 'inline-block';
        } else {
          qbBadge.style.display = 'none';
        }
      }

      // Populate dashboard pending table
      renderDashboardPending(data.recentPending || []);

      // Populate dashboard activities
      renderDashboardActivities(data.recentActivities || []);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

  function formatWhatsAppLink(phone, studentName, courseTitle) {
    if (!phone) return `<span style="color:#94a3b8;font-size:0.8rem">—</span>`;
    const clean = phone.replace(/[^0-9]/g, '');
    const message = `Assalam-o-Alaikum ${studentName || ''}! Your enrollment payment for "${courseTitle || 'the course'}" has been approved! Welcome to Simple NCLEX Platform. Here is your Google Meet live classes and WhatsApp group invite link.`;
    return `
      <a href="https://wa.me/${clean}?text=${encodeURIComponent(message)}" target="_blank" rel="noopener" class="admin-btn admin-btn-xs" style="background:#25d366;color:#ffffff;font-weight:700;display:inline-flex;align-items:center;gap:4px;text-decoration:none;padding:0.35rem 0.65rem;border-radius:6px;box-shadow:0 1px 2px rgba(0,0,0,0.1);font-size:0.78rem" title="Chat on WhatsApp / Send Google Meet link">
        <span>💬</span>
        <span>${phone}</span>
      </a>
    `;
  }

  function formatScreenshotPreview(url, studentName, courseTitle) {
    if (!url) return `<span style="color:#94a3b8;font-size:0.8rem">No receipt</span>`;
    const isPdf = url.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      return `
        <a href="${url}" target="_blank" class="admin-btn admin-btn-xs admin-btn-secondary" style="padding:0.3rem 0.6rem;font-size:0.75rem">
          📄 View PDF
        </a>
      `;
    }
    return `
      <div style="display:inline-flex;align-items:center;gap:6px">
        <img src="${url}" alt="Receipt" onclick="window.adminViewScreenshot('${url}', '${escapeHtml(studentName)}', '${escapeHtml(courseTitle)}')" style="width:42px;height:42px;object-fit:cover;border-radius:6px;border:1px solid #cbd5e1;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.1)" title="Click to enlarge receipt"/>
        <button type="button" class="admin-btn admin-btn-xs admin-btn-secondary" onclick="window.adminViewScreenshot('${url}', '${escapeHtml(studentName)}', '${escapeHtml(courseTitle)}')" style="padding:0.25rem 0.45rem;font-size:0.75rem" title="Enlarge receipt">
          🔍
        </button>
      </div>
    `;
  }

  window.adminViewScreenshot = function(url, studentName, courseTitle) {
    const modal = document.getElementById('screenshotLightboxModal');
    if (!modal) return;
    const img = document.getElementById('screenshotModalImg');
    if (img) img.src = url;
    const stName = document.getElementById('screenshotStudentName');
    if (stName) stName.textContent = studentName || 'Enrolled Student';
    const cTitle = document.getElementById('screenshotCourseTitle');
    if (cTitle) cTitle.textContent = courseTitle || 'Course Enrollment Receipt';
    const dlBtn = document.getElementById('screenshotDownloadBtn');
    if (dlBtn) dlBtn.href = url;
    modal.classList.add('active');
  };

  function renderDashboardPending(items) {
    const tbody = document.getElementById('dashboardPendingTbody');
    if (!tbody) return;

    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:#059669;font-weight:600">✓ All course enrollments are reviewed! No pending payments.</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(item => {
      const u = item.user || {};
      const c = item.course || {};
      return `
        <tr>
          <td>
            <strong>${u.name || 'Unknown Student'}</strong>
            <div style="font-size:0.8rem;color:var(--admin-text-muted)">${u.email || ''}</div>
          </td>
          <td>
            <div style="font-weight:600">${c.title || 'Course #' + item.courseId}</div>
            <div style="font-size:0.8rem;color:var(--admin-primary)">${c.category ? c.category.toUpperCase() : 'PROGRAM'}</div>
          </td>
          <td>${formatWhatsAppLink(item.whatsappNumber, u.name, c.title)}</td>
          <td>${formatScreenshotPreview(item.paymentScreenshot, u.name, c.title)}</td>
          <td style="font-size:0.85rem;color:var(--admin-text-muted)">${formatDate(item.enrolledAt)}</td>
          <td><span class="status-badge pending">Pending Approval</span></td>
          <td style="text-align:right;white-space:nowrap">
            <button class="admin-btn admin-btn-success admin-btn-sm" onclick="window.adminApproveRegistration(${item.id}, '${escapeHtml(item.whatsappNumber || '')}', '${escapeHtml(u.name || '')}', '${escapeHtml(c.title || '')}')">
              ✓ Approve
            </button>
            <button class="admin-btn admin-btn-danger admin-btn-sm" onclick="window.adminOpenRejectModal(${item.id}, '${escapeHtml(u.name || '')}', '${escapeHtml(c.title || '')}')">
              ✕ Reject
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderDashboardActivities(items) {
    const tbody = document.getElementById('dashboardActivitiesTbody');
    if (!tbody) return;

    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:1.5rem;color:var(--admin-text-muted)">No activities logged yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = items.slice(0, 6).map(act => `
      <tr>
        <td style="font-weight:700;color:var(--admin-primary)">${act.action}</td>
        <td>${act.details}</td>
        <td style="font-size:0.85rem;color:var(--admin-text-muted);white-space:nowrap">${formatDate(act.created_at)}</td>
      </tr>
    `).join('');
  }

  // ── 2. COURSE ENROLLMENTS & PAYMENTS (APPROVAL WORKFLOW) ───────────────────
  async function loadRegistrations() {
    const tbody = document.getElementById('registrationsTbody');
    if (!tbody) return;
    const searchInput = document.getElementById('regSearchInput');
    const query = searchInput ? searchInput.value.trim() : '';

    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--admin-text-muted)">Loading enrollments…</td></tr>`;

    try {
      const url = `${API_ADMIN}/registrations?status=${currentRegStatus}&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      // Update tab counts
      if (data.counts) {
        document.getElementById('tabCountAll').textContent = data.counts.total_count || 0;
        document.getElementById('tabCountPending').textContent = data.counts.pending_count || 0;
        document.getElementById('tabCountApproved').textContent = data.counts.approved_count || 0;
        document.getElementById('tabCountRejected').textContent = data.counts.rejected_count || 0;

        const badge = document.getElementById('sidebarPendingBadge');
        if (badge) {
          if (data.counts.pending_count > 0) {
            badge.textContent = data.counts.pending_count;
            badge.style.display = 'inline-block';
          } else {
            badge.style.display = 'none';
          }
        }
      }

      const items = data.registrations || [];
      if (!items.length) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:2.5rem;color:var(--admin-text-muted)">No course enrollments found matching filter.</td></tr>`;
        return;
      }

      tbody.innerHTML = items.map(reg => {
        const u = reg.user || {};
        const c = reg.course || {};
        const isPending = reg.status === 'pending';
        const isApproved = reg.status === 'approved';

        return `
          <tr>
            <td>
              <div style="font-weight:700">${u.name || 'Student'}</div>
              <div style="font-size:0.8rem;color:var(--admin-text-muted)">${u.email || ''}</div>
              ${u.examType ? `<div style="font-size:0.75rem;color:var(--admin-primary);font-weight:600">Exam: ${u.examType}</div>` : ''}
            </td>
            <td>
              <div style="display:flex;align-items:center;gap:0.6rem">
                ${c.imageUrl ? `<img src="${c.imageUrl}" style="width:36px;height:36px;border-radius:6px;object-fit:cover"/>` : `<span style="font-size:1.5rem">${c.emoji || '📚'}</span>`}
                <div>
                  <div style="font-weight:700">${c.title || 'Course #' + reg.courseId}</div>
                  <div style="font-size:0.78rem;color:var(--admin-text-muted)">Category: ${c.category || 'N/A'}</div>
                </div>
              </div>
            </td>
            <td>${formatWhatsAppLink(reg.whatsappNumber, u.name, c.title)}</td>
            <td>${formatScreenshotPreview(reg.paymentScreenshot, u.name, c.title)}</td>
            <td>${reg.transactionId ? `<code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:0.8rem;font-weight:600">${reg.transactionId}</code>` : '<span style="color:#cbd5e1">—</span>'}</td>
            <td style="font-size:0.85rem;color:var(--admin-text-muted);white-space:nowrap">${formatDate(reg.enrolledAt)}</td>
            <td><span class="status-badge ${reg.status}">${reg.status}</span></td>
            <td style="font-size:0.85rem;color:var(--admin-text-muted);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${reg.notes || ''}">
              ${reg.notes || '<span style="color:#cbd5e1">—</span>'}
            </td>
            <td style="text-align:right;white-space:nowrap">
              ${isPending ? `
                <button class="admin-btn admin-btn-success admin-btn-sm" onclick="window.adminApproveRegistration(${reg.id}, '${escapeHtml(reg.whatsappNumber || '')}', '${escapeHtml(u.name || '')}', '${escapeHtml(c.title || '')}')">
                  ✓ Approve
                </button>
                <button class="admin-btn admin-btn-danger admin-btn-sm" onclick="window.adminOpenRejectModal(${reg.id}, '${escapeHtml(u.name || '')}', '${escapeHtml(c.title || '')}')">
                  ✕ Reject
                </button>
              ` : isApproved ? `
                <button class="admin-btn admin-btn-secondary admin-btn-sm" onclick="window.adminOpenRejectModal(${reg.id}, '${escapeHtml(u.name || '')}', '${escapeHtml(c.title || '')}')" title="Revoke access">
                  Revoke
                </button>
              ` : `
                <button class="admin-btn admin-btn-success admin-btn-sm" onclick="window.adminApproveRegistration(${reg.id}, '${escapeHtml(reg.whatsappNumber || '')}', '${escapeHtml(u.name || '')}', '${escapeHtml(c.title || '')}')" title="Re-approve access">
                  Re-Approve
                </button>
              `}
              <button class="admin-btn admin-btn-secondary admin-btn-sm" onclick="window.adminDeleteRegistration(${reg.id})" title="Delete record" style="color:var(--admin-danger)">
                🗑
              </button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Error loading enrollments:', err);
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--admin-danger)">Failed to load enrollments.</td></tr>`;
    }
  }

  // Approve registration
  window.adminApproveRegistration = async function (regId, whatsappNumber = '', studentName = '', courseTitle = '') {
    try {
      const res = await fetch(`${API_ADMIN}/registrations/${regId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes: 'Payment receipt confirmed & approved by administrator' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      showToast(data.message || 'Course enrollment APPROVED! Student now has access.', 'success');
      loadRegistrations();
      loadStats();

      // If student provided WhatsApp, ask to send Google Meet / WhatsApp group invite link
      if (whatsappNumber) {
        const clean = whatsappNumber.replace(/[^0-9]/g, '');
        const groupLink = document.getElementById('setting_payment_whatsapp_group_link')?.value || '';
        const msg = `Assalam-o-Alaikum ${studentName}! Your payment for "${courseTitle}" has been verified! Welcome to Simple NCLEX Platform. Here is your official WhatsApp group invite link for Google Meet live classes: ${groupLink}`;
        const waUrl = `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
        setTimeout(() => {
          if (confirm(`Payment approved! Open WhatsApp now to send ${studentName} the Google Meet / WhatsApp group link?`)) {
            window.open(waUrl, '_blank');
          }
        }, 500);
      }
    } catch (err) {
      showToast(err.message || 'Failed to approve enrollment.', 'error');
    }
  };

  // Reject registration modal & handler
  window.adminOpenRejectModal = function (regId, studentName, courseTitle) {
    pendingRejectRegId = regId;
    const promptEl = document.getElementById('rejectModalPrompt');
    if (promptEl) {
      promptEl.innerHTML = `Are you sure you want to decline registration for <strong>${studentName}</strong> in <strong>${courseTitle}</strong>?`;
    }
    const notesEl = document.getElementById('rejectNotes');
    if (notesEl) notesEl.value = '';
    openModal('rejectModal');
  };

  document.getElementById('confirmRejectBtn')?.addEventListener('click', async () => {
    if (!pendingRejectRegId) return;
    const notes = document.getElementById('rejectNotes')?.value.trim() || 'Registration declined by administrator.';

    try {
      const res = await fetch(`${API_ADMIN}/registrations/${pendingRejectRegId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      showToast(data.message || 'Registration has been rejected.', 'info');
      closeModal('rejectModal');
      pendingRejectRegId = null;
      loadRegistrations();
      loadStats();
    } catch (err) {
      showToast(err.message || 'Failed to reject registration.', 'error');
    }
  });

  window.adminDeleteRegistration = async function (regId) {
    if (!confirm('Are you sure you want to permanently delete this registration record?')) return;
    try {
      const res = await fetch(`${API_ADMIN}/registrations/${regId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      showToast(data.message || 'Registration deleted.', 'success');
      loadRegistrations();
      loadStats();
    } catch (err) {
      showToast(err.message || 'Failed to delete registration.', 'error');
    }
  };

  // Setup tabs and search for registrations
  function setupRegistrationsControls() {
    const tabs = document.querySelectorAll('.admin-tab[data-reg-status]');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentRegStatus = tab.dataset.regStatus;
        loadRegistrations();
      });
    });

    const searchInput = document.getElementById('regSearchInput');
    if (searchInput) {
      let timeout;
      searchInput.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(loadRegistrations, 250);
      });
    }

    document.getElementById('refreshRegistrationsBtn')?.addEventListener('click', loadRegistrations);

    // Manual Enroll Modal triggers
    document.getElementById('manualEnrollBtn')?.addEventListener('click', async () => {
      await prepareManualEnrollOptions();
      openModal('manualEnrollModal');
    });

    document.getElementById('confirmManualEnrollBtn')?.addEventListener('click', handleManualEnrollSubmit);
  }

  async function prepareManualEnrollOptions() {
    const sSelect = document.getElementById('manualStudentSelect');
    const cSelect = document.getElementById('manualCourseSelect');
    if (!sSelect || !cSelect) return;

    sSelect.innerHTML = '<option value="">Loading students…</option>';
    cSelect.innerHTML = '<option value="">Loading courses…</option>';

    try {
      const [uRes, cRes] = await Promise.all([
        fetch(`${API_ADMIN}/users`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_ADMIN}/courses`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const uData = await uRes.json();
      const cData = await cRes.json();

      allUsersList = uData.users || [];
      allCoursesList = cData.courses || [];

      sSelect.innerHTML = `<option value="">-- Choose Student --</option>` + allUsersList.map(u => `
        <option value="${u.id}">${u.name} (${u.email})</option>
      `).join('');

      cSelect.innerHTML = `<option value="">-- Choose Course --</option>` + allCoursesList.map(c => `
        <option value="${c.id}">${c.title} ($${c.price})</option>
      `).join('');
    } catch (err) {
      console.error('Failed to load manual enroll options:', err);
    }
  }

  async function handleManualEnrollSubmit() {
    const userId = document.getElementById('manualStudentSelect')?.value;
    const courseId = document.getElementById('manualCourseSelect')?.value;
    const notes = document.getElementById('manualNotes')?.value.trim() || 'Manual course grant by administrator';

    if (!userId || !courseId) {
      showToast('Please select both a student and a course.', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_ADMIN}/registrations/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: parseInt(userId, 10), courseId: parseInt(courseId, 10), notes, status: 'approved' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      showToast(data.message || 'Course access granted to student!', 'success');
      closeModal('manualEnrollModal');
      loadRegistrations();
      loadStats();
    } catch (err) {
      showToast(err.message || 'Failed to grant course access.', 'error');
    }
  }

  // ── 3. COURSES & PICTURE EDITOR ────────────────────────────────────────────
  async function loadCourses() {
    const grid = document.getElementById('coursesGrid');
    if (!grid) return;
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--admin-text-muted)">Loading courses…</div>`;

    try {
      const res = await fetch(`${API_ADMIN}/courses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      allCoursesList = data.courses || [];
      renderCoursesGrid();
    } catch (err) {
      console.error('Error loading courses:', err);
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--admin-danger)">Failed to load courses.</div>`;
    }
  }

  function renderCoursesGrid() {
    const grid = document.getElementById('coursesGrid');
    if (!grid) return;

    const searchInput = document.getElementById('courseSearchInput');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const catFilter = document.getElementById('courseCategoryFilter')?.value || 'all';

    const filtered = allCoursesList.filter(c => {
      const matchQ = !query || c.title.toLowerCase().includes(query) || (c.description || '').toLowerCase().includes(query);
      const matchCat = catFilter === 'all' || c.category === catFilter;
      return matchQ && matchCat;
    });

    if (!filtered.length) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--admin-text-muted)">No courses found matching criteria.</div>`;
      return;
    }

    grid.innerHTML = filtered.map(course => {
      const hasImg = Boolean(course.imageUrl);
      const bgStyle = hasImg ? `background-image: linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.6)), url('${course.imageUrl}');` : '';

      return `
        <div class="admin-course-item">
          <div class="admin-course-thumb" style="${bgStyle}">
            ${!hasImg ? `<span class="emoji-preview">${course.emoji || '📚'}</span>` : ''}
            <div class="admin-course-thumb-overlay">
              <span class="role-badge" style="background:rgba(255,255,255,0.9);color:#0f172a;font-weight:700">
                ${course.category}
              </span>
              ${course.isFeatured ? `<span class="role-badge" style="background:#f59e0b;color:#fff">★ Featured</span>` : ''}
            </div>
          </div>

          <div class="admin-course-body">
            <h3>${course.title}</h3>
            <p>${course.description}</p>

            <div class="admin-course-stats">
              <div>
                <strong style="color:#059669;font-size:1.15rem">$${course.price}</strong>
                ${course.originalPrice > course.price ? `<span style="text-decoration:line-through;font-size:0.8rem;color:var(--admin-text-muted);margin-left:0.3rem">$${course.originalPrice}</span>` : ''}
              </div>
              <div style="color:var(--admin-text-muted)">
                👥 <strong>${course.studentsCount}</strong> enrolled
              </div>
            </div>

            <div class="admin-course-actions">
              <button class="admin-btn admin-btn-primary admin-btn-sm" style="flex:1" onclick="window.adminEditCourse(${course.id})">
                🖼️ Edit Course & Picture
              </button>
              <button class="admin-btn admin-btn-danger admin-btn-sm" onclick="window.adminDeleteCourse(${course.id}, '${escapeHtml(course.title)}')">
                🗑
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function setupCoursesControls() {
    document.getElementById('addNewCourseBtn')?.addEventListener('click', () => openCourseModal());
    document.getElementById('refreshCoursesBtn')?.addEventListener('click', loadCourses);

    const searchInput = document.getElementById('courseSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', renderCoursesGrid);
    }
    const catFilter = document.getElementById('courseCategoryFilter');
    if (catFilter) {
      catFilter.addEventListener('change', renderCoursesGrid);
    }

    // Modal picture file upload handler
    const fileInput = document.getElementById('coursePictureFile');
    if (fileInput) {
      fileInput.addEventListener('change', handleCoursePictureUpload);
    }

    // Live preview when URL input changes
    const urlInput = document.getElementById('courseImageUrl');
    if (urlInput) {
      urlInput.addEventListener('input', () => {
        updatePicturePreview(urlInput.value.trim());
      });
    }

    // Save Course form button
    document.getElementById('saveCourseBtn')?.addEventListener('click', handleSaveCourse);
  }

  // Open modal for Add or Edit
  window.adminEditCourse = function (courseId) {
    const course = allCoursesList.find(c => c.id === courseId);
    if (!course) return;
    openCourseModal(course);
  };

  function openCourseModal(course = null) {
    const modalTitle = document.getElementById('courseModalTitle');
    const courseIdInput = document.getElementById('courseId');
    const titleInput = document.getElementById('courseTitle');
    const categorySelect = document.getElementById('courseCategory');
    const descInput = document.getElementById('courseDesc');
    const priceInput = document.getElementById('coursePrice');
    const origPriceInput = document.getElementById('courseOriginalPrice');
    const durationInput = document.getElementById('courseDuration');
    const questionsInput = document.getElementById('courseQuestions');
    const emojiInput = document.getElementById('courseEmoji');
    const imageUrlInput = document.getElementById('courseImageUrl');
    const levelSelect = document.getElementById('courseLevel');
    const badgeTextInput = document.getElementById('courseBadgeText');
    const badgeStyleSelect = document.getElementById('courseBadgeStyle');
    const featuredCheckbox = document.getElementById('courseFeatured');

    if (course) {
      modalTitle.textContent = `Edit Course: ${course.title}`;
      courseIdInput.value = course.id;
      titleInput.value = course.title || '';
      categorySelect.value = course.category || 'nclex-rn';
      descInput.value = course.description || '';
      priceInput.value = course.price;
      origPriceInput.value = course.originalPrice || course.price;
      durationInput.value = course.durationHours || 0;
      questionsInput.value = course.questionsCount || 0;
      emojiInput.value = course.emoji || '📚';
      imageUrlInput.value = course.imageUrl || '';
      levelSelect.value = course.level || 'Beginner → Pro';
      badgeTextInput.value = course.badgeText || '';
      badgeStyleSelect.value = course.badgeStyle || 'accent';
      featuredCheckbox.checked = Boolean(course.isFeatured);
      updatePicturePreview(course.imageUrl);
    } else {
      modalTitle.textContent = 'Add New Course';
      courseIdInput.value = '';
      titleInput.value = '';
      categorySelect.value = 'nclex-rn';
      descInput.value = '';
      priceInput.value = '89';
      origPriceInput.value = '199';
      durationInput.value = '40';
      questionsInput.value = '2000';
      emojiInput.value = '🏥';
      imageUrlInput.value = '';
      levelSelect.value = 'Beginner → Pro';
      badgeTextInput.value = '';
      badgeStyleSelect.value = 'accent';
      featuredCheckbox.checked = false;
      updatePicturePreview('');
    }

    const uploadStatus = document.getElementById('uploadStatusText');
    if (uploadStatus) uploadStatus.textContent = '';
    openModal('courseModal');
  }

  function updatePicturePreview(url) {
    const box = document.getElementById('modalPicturePreview');
    if (!box) return;

    if (url) {
      box.classList.remove('empty');
      box.style.backgroundImage = `url('${url}')`;
      box.innerHTML = '';
    } else {
      box.classList.add('empty');
      box.style.backgroundImage = 'none';
      box.innerHTML = `<span class="empty-text">No custom picture set (fallback emoji will show)</span>`;
    }
  }

  async function handleCoursePictureUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById('uploadStatusText');
    if (statusEl) statusEl.textContent = 'Uploading picture…';

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch(`${API_ADMIN}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      if (statusEl) statusEl.textContent = '✓ Uploaded successfully!';
      const urlInput = document.getElementById('courseImageUrl');
      if (urlInput) urlInput.value = data.url;
      updatePicturePreview(data.url);
      showToast('Picture uploaded and applied to preview!', 'success');
    } catch (err) {
      if (statusEl) statusEl.textContent = '✕ Upload failed';
      showToast(err.message || 'Image upload failed.', 'error');
    }
  }

  async function handleSaveCourse() {
    const courseId = document.getElementById('courseId')?.value;
    const title = document.getElementById('courseTitle')?.value.trim();
    const category = document.getElementById('courseCategory')?.value;
    const description = document.getElementById('courseDesc')?.value.trim();
    const price = parseFloat(document.getElementById('coursePrice')?.value || '0');
    const originalPrice = parseFloat(document.getElementById('courseOriginalPrice')?.value || price);
    const durationHours = parseInt(document.getElementById('courseDuration')?.value || '0', 10);
    const questionsCount = parseInt(document.getElementById('courseQuestions')?.value || '0', 10);
    const emoji = document.getElementById('courseEmoji')?.value.trim() || '📚';
    const imageUrl = document.getElementById('courseImageUrl')?.value.trim();
    const level = document.getElementById('courseLevel')?.value;
    const badgeText = document.getElementById('courseBadgeText')?.value.trim();
    const badgeStyle = document.getElementById('courseBadgeStyle')?.value;
    const isFeatured = document.getElementById('courseFeatured')?.checked;

    if (!title || !description || isNaN(price)) {
      showToast('Please fill in title, description, and valid price.', 'error');
      return;
    }

    const payload = {
      title,
      category,
      description,
      price,
      originalPrice,
      durationHours,
      questionsCount,
      emoji,
      imageUrl,
      level,
      badgeText: badgeText || null,
      badgeStyle,
      isFeatured
    };

    const isEdit = Boolean(courseId);
    const endpoint = isEdit ? `${API_ADMIN}/courses/${courseId}` : `${API_ADMIN}/courses`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      showToast(data.message || 'Course saved successfully!', 'success');
      closeModal('courseModal');
      loadCourses();
      loadStats();
    } catch (err) {
      showToast(err.message || 'Failed to save course.', 'error');
    }
  }

  window.adminDeleteCourse = async function (courseId, courseTitle) {
    if (!confirm(`Are you sure you want to delete course "${courseTitle}"? This will also remove all student enrollments associated with this course.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_ADMIN}/courses/${courseId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      showToast(data.message || 'Course deleted.', 'success');
      loadCourses();
      loadStats();
    } catch (err) {
      showToast(err.message || 'Failed to delete course.', 'error');
    }
  };

  // ── 4. STUDENTS & USERS DIRECTORY ──────────────────────────────────────────
  async function loadUsers() {
    const tbody = document.getElementById('usersTbody');
    if (!tbody) return;
    const searchInput = document.getElementById('userSearchInput');
    const query = searchInput ? searchInput.value.trim() : '';

    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--admin-text-muted)">Loading users…</td></tr>`;

    try {
      const url = `${API_ADMIN}/users?q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      allUsersList = data.users || [];
      if (!allUsersList.length) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:2.5rem;color:var(--admin-text-muted)">No users found.</td></tr>`;
        return;
      }

      tbody.innerHTML = allUsersList.map(u => {
        const isSelf = currentUser && currentUser.id === u.id;
        const isAdmin = u.role === 'admin';
        const rawPw = u.password || u.plainPassword || '';

        return `
          <tr>
            <td>
              <div style="font-weight:700">${u.name} ${isSelf ? '<span style="font-size:0.75rem;color:var(--admin-primary)">(You)</span>' : ''}</div>
              <div style="font-size:0.75rem;color:var(--admin-text-muted)">User ID: #${u.id}</div>
            </td>
            <td>${u.email}</td>
            <td>
              <div style="display:inline-flex;align-items:center;gap:0.4rem;background:#f8fafc;padding:0.25rem 0.6rem;border-radius:4px;border:1px solid #e2e8f0;font-family:monospace">
                <span class="user-pw-display" id="user-pw-${u.id}" data-pw="${escapeHtml(rawPw)}" style="letter-spacing:1px;font-size:0.85rem">••••••••</span>
                <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" style="padding:0.15rem 0.4rem;font-size:0.75rem" onclick="window.adminToggleUserPw(${u.id})" title="Toggle Password Visibility">
                  👁️
                </button>
              </div>
            </td>
            <td><span class="role-badge" style="background:#e0f2fe;color:#0369a1">${u.examType || 'NCLEX-RN'}</span></td>
            <td><span class="role-badge ${u.role}">${u.role.toUpperCase()}</span></td>
            <td><strong>${u.approvedEnrollments || 0}</strong> approved / ${u.totalEnrollments || 0} total</td>
            <td>
              <span class="status-badge ${u.isActive ? 'approved' : 'rejected'}">
                ${u.isActive ? 'Active' : 'Suspended'}
              </span>
            </td>
            <td style="font-size:0.85rem;color:var(--admin-text-muted)">${formatDate(u.createdAt)}</td>
            <td style="text-align:right;white-space:nowrap">
              <button class="admin-btn admin-btn-secondary admin-btn-sm" onclick="window.adminOpenEditUser(${u.id})">
                ✏️ Edit
              </button>
              ${!isSelf ? `
                <button class="admin-btn admin-btn-secondary admin-btn-sm" onclick="window.adminToggleUserRole(${u.id}, '${isAdmin ? 'student' : 'admin'}')">
                  ${isAdmin ? 'Demote' : '👑 Admin'}
                </button>
                <button class="admin-btn admin-btn-secondary admin-btn-sm" onclick="window.adminToggleUserStatus(${u.id}, ${!u.isActive})">
                  ${u.isActive ? 'Suspend' : 'Activate'}
                </button>
                <button class="admin-btn admin-btn-danger admin-btn-sm" onclick="window.adminDeleteUser(${u.id}, '${escapeHtml(u.name)}')">
                  🗑
                </button>
              ` : `
                <span style="font-size:0.8rem;color:var(--admin-text-muted);font-style:italic;margin-left:0.3rem">Active</span>
              `}
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Failed to load users:', err);
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--admin-danger)">Failed to load users.</td></tr>`;
    }
  }

  window.adminToggleUserPw = function (userId) {
    const span = document.getElementById(`user-pw-${userId}`);
    if (!span) return;
    const actual = span.dataset.pw || '';
    if (span.textContent === '••••••••') {
      span.textContent = actual || '(None Set)';
      span.style.color = '#0284c7';
      span.style.fontWeight = '700';
    } else {
      span.textContent = '••••••••';
      span.style.color = '';
      span.style.fontWeight = 'normal';
    }
  };

  window.adminToggleUserRole = async function (userId, newRole) {
    if (!confirm(`Are you sure you want to change this user's role to "${newRole}"?`)) return;
    try {
      const res = await fetch(`${API_ADMIN}/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      showToast(data.message || 'User role updated.', 'success');
      loadUsers();
      loadStats();
    } catch (err) {
      showToast(err.message || 'Failed to update user role.', 'error');
    }
  };

  window.adminToggleUserStatus = async function (userId, isActive) {
    try {
      const res = await fetch(`${API_ADMIN}/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      showToast(data.message || 'User status updated.', 'success');
      loadUsers();
    } catch (err) {
      showToast(err.message || 'Failed to update user status.', 'error');
    }
  };

  window.adminDeleteUser = async function (userId, userName) {
    if (!confirm(`Are you sure you want to permanently delete user "${userName}"? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`${API_ADMIN}/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      showToast(data.message || 'User deleted successfully.', 'success');
      loadUsers();
      loadStats();
    } catch (err) {
      showToast(err.message || 'Failed to delete user.', 'error');
    }
  };

  function setupUsersControls() {
    document.getElementById('refreshUsersBtn')?.addEventListener('click', loadUsers);
    const searchInput = document.getElementById('userSearchInput');
    if (searchInput) {
      let timeout;
      searchInput.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(loadUsers, 250);
      });
    }
  }


  // ── 6. USER PERSONAL DETAILS EDIT CONTROLS ─────────────────────────────────
  window.adminOpenEditUser = function (userId) {
    const user = allUsersList.find(u => u.id === userId);
    if (!user) {
      showToast('User not found.', 'error');
      return;
    }
    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUserFirstName').value = user.firstName || '';
    document.getElementById('editUserLastName').value = user.lastName || '';
    document.getElementById('editUserEmail').value = user.email || '';
    document.getElementById('editUserExamType').value = user.examType || 'NCLEX-RN';
    document.getElementById('editUserRole').value = user.role || 'student';
    document.getElementById('editUserActive').value = user.isActive ? 'true' : 'false';
    const pwInput = document.getElementById('editUserPassword');
    if (pwInput) pwInput.value = user.password || user.plainPassword || '';
    openModal('editUserModal');
  };

  async function handleSaveUserDetails() {
    const userId = document.getElementById('editUserId').value;
    const firstName = document.getElementById('editUserFirstName').value.trim();
    const lastName = document.getElementById('editUserLastName').value.trim();
    const email = document.getElementById('editUserEmail').value.trim();
    const examType = document.getElementById('editUserExamType').value;
    const role = document.getElementById('editUserRole').value;
    const isActive = document.getElementById('editUserActive').value === 'true';
    const password = document.getElementById('editUserPassword')?.value.trim() || '';

    if (!firstName || !lastName || !email) {
      showToast('Please fill in first name, last name, and email.', 'error');
      return;
    }

    try {
      const payload = { firstName, lastName, email, examType, role, isActive };
      if (password) payload.password = password;

      const res = await fetch(`${API_ADMIN}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      showToast(data.message || 'User personal details updated successfully.', 'success');
      closeModal('editUserModal');
      loadUsers();
      loadStats();
    } catch (err) {
      showToast(err.message || 'Failed to update user details.', 'error');
    }
  }

  function setupEditUserControls() {
    document.getElementById('saveUserDetailsBtn')?.addEventListener('click', handleSaveUserDetails);
  }

  // ── 7. CURRICULUM MANAGER ──────────────────────────────────────────────────
  let currentCurriculumData = [];
  let selectedCurriculumCourseId = null;

  async function loadCurriculumView() {
    const select = document.getElementById('curriculumCourseSelect');
    if (!select) return;

    try {
      const res = await fetch(`${API_ADMIN}/courses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.courses) throw new Error(data.message);

      const courses = data.courses;
      allCoursesList = courses;

      select.innerHTML = courses.map(c => `
        <option value="${c.id}" ${selectedCurriculumCourseId == c.id ? 'selected' : ''}>
          ${escapeHtml(c.title)} (${c.category ? c.category.toUpperCase() : 'GENERAL'})
        </option>
      `).join('');

      if (!selectedCurriculumCourseId && courses.length > 0) {
        selectedCurriculumCourseId = courses[0].id;
      }

      if (selectedCurriculumCourseId) {
        select.value = selectedCurriculumCourseId;
        await loadCurriculumForCourse(selectedCurriculumCourseId);
      }
    } catch (err) {
      console.error('Failed to load courses for curriculum:', err);
      showToast('Failed to load courses for curriculum.', 'error');
    }
  }

  async function loadCurriculumForCourse(courseId) {
    selectedCurriculumCourseId = courseId;
    const container = document.getElementById('curriculumModulesContainer');
    if (!container) return;
    container.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--admin-text-muted)">Loading curriculum modules…</div>`;

    try {
      const res = await fetch(`${API_ADMIN}/courses/${courseId}/curriculum`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      currentCurriculumData = data.curriculum || [];
      renderCurriculumEditor();
    } catch (err) {
      console.error('Failed to load curriculum:', err);
      container.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--admin-danger)">Failed to load curriculum.</div>`;
    }
  }

  function renderCurriculumEditor() {
    const container = document.getElementById('curriculumModulesContainer');
    if (!container) return;

    if (!currentCurriculumData || currentCurriculumData.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:3rem;background:#fff;border-radius:var(--admin-radius);border:1px solid var(--admin-border)">
          <p style="color:var(--admin-text-muted);margin-bottom:1rem">No curriculum modules found for this course.</p>
          <button type="button" class="admin-btn admin-btn-primary admin-btn-sm" onclick="window.adminAddModule()">
            ➕ Add First Module
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = currentCurriculumData.map((m, mIdx) => `
      <div class="curriculum-module-card">
        <div class="curriculum-module-header">
          <div style="display:flex;align-items:center;gap:0.75rem;flex:1">
            <span style="font-weight:800;color:var(--admin-primary)">Module ${mIdx + 1}:</span>
            <input type="text" class="curriculum-module-title-input" value="${escapeHtml(m.moduleTitle || '')}"
                   placeholder="e.g. Module ${mIdx + 1}: Cardiovascular & Critical Care Nursing"
                   onchange="window.adminUpdateModuleTitle(${mIdx}, this.value)" />
          </div>
          <div style="display:flex;align-items:center;gap:0.5rem">
            <span style="font-size:0.8rem;color:var(--admin-text-muted);font-weight:600">
              ${(m.lectures || []).length} Lectures
            </span>
            <button type="button" class="admin-btn admin-btn-danger admin-btn-sm" onclick="window.adminDeleteModule(${mIdx})" title="Delete Module">
              🗑 Remove Module
            </button>
          </div>
        </div>

        <div class="curriculum-lectures-list">
          ${(m.lectures || []).map((l, lIdx) => `
            <div class="curriculum-lecture-item">
              <div class="curriculum-lecture-top-row">
                <span style="font-weight:700;color:var(--admin-text-muted);font-size:0.85rem">
                  #${mIdx + 1}.${lIdx + 1}
                </span>
                <input type="text" value="${escapeHtml(l.title || '')}"
                       placeholder="Lecture Title (e.g. Lecture ${mIdx + 1}.${lIdx + 1}: Hemodynamic Monitoring & Shock)"
                       style="flex:1;font-weight:700"
                       onchange="window.adminUpdateLectureField(${mIdx}, ${lIdx}, 'title', this.value)" />
                <input type="text" value="${escapeHtml(l.duration || '30:00')}"
                       placeholder="Duration (30:00)"
                       style="max-width:120px"
                       onchange="window.adminUpdateLectureField(${mIdx}, ${lIdx}, 'duration', this.value)" />
                <button type="button" class="admin-btn admin-btn-danger admin-btn-sm" onclick="window.adminDeleteLecture(${mIdx}, ${lIdx})" title="Remove Lecture">
                  ✕
                </button>
              </div>

              <div>
                <label style="font-size:0.75rem;color:var(--admin-text-muted);font-weight:600;display:block;margin-bottom:0.25rem">
                  📋 Clinical Key Takeaways & Rationales (One bullet point per line):
                </label>
                <textarea rows="2" placeholder="Clinical point 1&#10;Clinical point 2"
                          onchange="window.adminUpdateLectureNotes(${mIdx}, ${lIdx}, this.value)">${(l.notes || []).join('\n')}</textarea>
              </div>
            </div>
          `).join('')}

          <div style="padding-top:0.5rem">
            <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" onclick="window.adminAddLecture(${mIdx})">
              ➕ Add Lecture to Module ${mIdx + 1}
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  window.adminAddModule = function () {
    currentCurriculumData.push({
      moduleTitle: `Module ${currentCurriculumData.length + 1}: New Curriculum Module`,
      lectures: [
        {
          id: `lec-${Date.now()}-1`,
          title: `Lecture ${currentCurriculumData.length + 1}.1: Clinical Orientation & Core Concepts`,
          duration: '45:00',
          notes: ['Key clinical concept review.']
        }
      ]
    });
    renderCurriculumEditor();
  };

  window.adminDeleteModule = function (mIdx) {
    if (!confirm(`Are you sure you want to delete Module ${mIdx + 1} and all its lectures?`)) return;
    currentCurriculumData.splice(mIdx, 1);
    renderCurriculumEditor();
  };

  window.adminUpdateModuleTitle = function (mIdx, val) {
    if (currentCurriculumData[mIdx]) {
      currentCurriculumData[mIdx].moduleTitle = val.trim();
    }
  };

  window.adminAddLecture = function (mIdx) {
    if (!currentCurriculumData[mIdx]) return;
    if (!currentCurriculumData[mIdx].lectures) currentCurriculumData[mIdx].lectures = [];
    const num = currentCurriculumData[mIdx].lectures.length + 1;
    currentCurriculumData[mIdx].lectures.push({
      id: `lec-${Date.now()}-${num}`,
      title: `Lecture ${mIdx + 1}.${num}: Topic Title`,
      duration: '45:00',
      notes: ['Important high-yield takeaway.']
    });
    renderCurriculumEditor();
  };

  window.adminDeleteLecture = function (mIdx, lIdx) {
    if (!currentCurriculumData[mIdx] || !currentCurriculumData[mIdx].lectures) return;
    currentCurriculumData[mIdx].lectures.splice(lIdx, 1);
    renderCurriculumEditor();
  };

  window.adminUpdateLectureField = function (mIdx, lIdx, field, val) {
    if (currentCurriculumData[mIdx]?.lectures?.[lIdx]) {
      currentCurriculumData[mIdx].lectures[lIdx][field] = val;
    }
  };

  window.adminUpdateLectureNotes = function (mIdx, lIdx, val) {
    if (currentCurriculumData[mIdx]?.lectures?.[lIdx]) {
      currentCurriculumData[mIdx].lectures[lIdx].notes = val.split('\n').map(s => s.trim()).filter(Boolean);
    }
  };

  async function handleSaveCurriculum() {
    if (!selectedCurriculumCourseId) {
      showToast('Please select a course first.', 'error');
      return;
    }

    const saveBtn = document.getElementById('saveCurriculumBtn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving Curriculum…';
    }

    try {
      const res = await fetch(`${API_ADMIN}/courses/${selectedCurriculumCourseId}/curriculum`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ curriculum: currentCurriculumData })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      showToast(data.message || 'Curriculum saved successfully!', 'success');
      loadStats();
    } catch (err) {
      showToast(err.message || 'Failed to save curriculum.', 'error');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<span>💾 Save Course Curriculum</span>';
      }
    }
  }

  function setupCurriculumControls() {
    const courseSelect = document.getElementById('curriculumCourseSelect');
    if (courseSelect) {
      courseSelect.addEventListener('change', () => {
        const cId = courseSelect.value;
        if (cId) loadCurriculumForCourse(cId);
      });
    }

    document.getElementById('addModuleBtn')?.addEventListener('click', window.adminAddModule);
    document.getElementById('saveCurriculumBtn')?.addEventListener('click', handleSaveCurriculum);
  }

  // ── 8. SITE SETTINGS & PERSONAL DETAILS ───────────────────────────────────
  async function loadSiteSettings() {
    try {
      const res = await fetch(`${API_ADMIN}/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      const s = data.settings || {};
      for (const [k, v] of Object.entries(s)) {
        const el = document.getElementById(`setting_${k}`);
        if (el) el.value = v;
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      showToast('Failed to load site settings.', 'error');
    }
  }

  async function handleSaveSiteSettings(e) {
    if (e) e.preventDefault();
    const btn = document.getElementById('saveSettingsBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Saving Settings…';
    }

    const keys = [
      'hero_announcement', 'hero_headline', 'hero_subtitle',
      'instructor_name', 'instructor_title', 'instructor_bio',
      'instructor_experience', 'pass_rate', 'students_helped',
      'active_mentors', 'instructor_photo', 'contact_email',
      'contact_phone', 'contact_whatsapp', 'contact_address',
      'social_facebook', 'social_youtube', 'social_instagram', 'social_linkedin',
      'about_mission',
      'payment_easypaisa_name', 'payment_easypaisa_number', 'payment_bank_name',
      'payment_bank_iban', 'payment_whatsapp_group_link', 'payment_instructions'
    ];

    const payload = {};
    for (const k of keys) {
      const el = document.getElementById(`setting_${k}`);
      if (el) payload[k] = el.value.trim();
    }

    try {
      const res = await fetch(`${API_ADMIN}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      showToast(data.message || 'Platform and personal settings saved successfully!', 'success');
      loadStats();
    } catch (err) {
      showToast(err.message || 'Failed to save settings.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span>💾 Save Platform & Personal Details</span>';
      }
    }
  }

  function setupSettingsControls() {
    document.getElementById('siteSettingsForm')?.addEventListener('submit', handleSaveSiteSettings);
  }

  // ── MODAL HELPERS ──────────────────────────────────────────────────────────
  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
  }

  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.closeModal;
      if (targetId) closeModal(targetId);
    });
  });

  // Close modal when clicking backdrop
  document.querySelectorAll('.admin-modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.classList.remove('active');
    });
  });

  // ── FORMAT DATE HELPER ─────────────────────────────────────────────────────
  function formatDate(isoStr) {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoStr;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ── FREE DEMO MCQS MANAGEMENT ──────────────────────────────────────────────
  let allDemoMcqsList = [];

  async function loadDemoMcqs() {
    const container = document.getElementById('demoMcqsListContainer');
    if (!container) return;

    container.innerHTML = `
      <div style="text-align:center;padding:3rem;color:var(--admin-text-muted)">
        <div style="font-size:1.8rem;margin-bottom:0.5rem">⏳</div>
        <div>Loading demo practice questions…</div>
      </div>
    `;

    try {
      const res = await fetch(`${API_ADMIN}/demo-mcqs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) {
        showToast(data.message || 'Failed to load demo questions', 'error');
        container.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--admin-danger)">Failed to load demo questions.</div>`;
        return;
      }

      allDemoMcqsList = data.mcqs || [];
      renderDemoMcqsList(allDemoMcqsList);
    } catch (err) {
      console.error('Error loading demo MCQs:', err);
      showToast('Network error while fetching demo questions.', 'error');
      container.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--admin-danger)">Network error while loading questions.</div>`;
    }
  }

  function renderDemoMcqsList(mcqs) {
    const container = document.getElementById('demoMcqsListContainer');
    if (!container) return;

    if (!mcqs || mcqs.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:3rem;background:#f8fafc;border-radius:var(--admin-radius);border:1px dashed var(--admin-border)">
          <div style="font-size:2rem;margin-bottom:0.5rem">📝</div>
          <p style="font-weight:700;color:var(--admin-text-main);margin-bottom:0.25rem">No Demo MCQs Found</p>
          <p style="font-size:0.85rem;color:var(--admin-text-muted);margin-bottom:1rem">Click "Add Demo Question" or "Reset to Defaults" to populate questions.</p>
          <button type="button" class="admin-btn admin-btn-primary admin-btn-sm" id="emptyAddMcqBtn">➕ Add Demo Question</button>
        </div>
      `;
      const btn = document.getElementById('emptyAddMcqBtn');
      if (btn) btn.addEventListener('click', () => openDemoMcqModal());
      return;
    }

    container.innerHTML = mcqs.map((q, idx) => {
      const correctOptIndex = q.correctIndex !== undefined ? q.correctIndex : 0;
      const opts = Array.isArray(q.options) ? q.options : [];
      const rationale = q.description && q.description.correctRationale ? q.description.correctRationale : '';
      const pearl = q.description && q.description.clinicalPearl ? q.description.clinicalPearl : '';

      return `
        <div class="admin-mcq-item" data-mcq-id="${q.id}">
          <div class="admin-mcq-header">
            <div class="admin-mcq-badges">
              <span class="admin-mcq-pill primary">Q${idx + 1} • ${escapeHtml(q.category)}</span>
              <span class="admin-mcq-pill accent">⚡ ${escapeHtml(q.difficulty)}</span>
              ${q.clientNeed ? `<span class="admin-mcq-pill" style="max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(q.clientNeed)}</span>` : ''}
            </div>
            <div class="admin-mcq-actions">
              <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm btn-edit-mcq" data-id="${q.id}" title="Edit this question">
                ✏️ Edit
              </button>
              <button type="button" class="admin-btn admin-btn-danger admin-btn-sm btn-delete-mcq" data-id="${q.id}" title="Delete this question">
                🗑️ Delete
              </button>
            </div>
          </div>

          <div class="admin-mcq-statement">
            ${escapeHtml(q.statement)}
          </div>

          <div class="admin-mcq-options-grid">
            ${opts.map((opt, optIdx) => {
              const letter = String.fromCharCode(65 + optIdx);
              const isCorrect = optIdx === correctOptIndex;
              return `
                <div class="admin-mcq-opt ${isCorrect ? 'correct' : ''}">
                  <span class="admin-mcq-opt-tag">${isCorrect ? '✓' : letter}</span>
                  <div>
                    ${escapeHtml(opt)}
                    ${isCorrect ? `<span style="font-size:0.75rem;font-weight:700;color:#059669;margin-left:0.35rem">(Correct Answer)</span>` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          ${rationale ? `
            <div class="admin-mcq-explanation-preview">
              <strong style="color:var(--admin-primary-dark)">🎯 Clinical Rationale:</strong> ${escapeHtml(rationale.slice(0, 180))}${rationale.length > 180 ? '…' : ''}
              ${pearl ? `<div style="margin-top:0.4rem;font-size:0.82rem;color:#0284c7"><strong>💡 Pearl:</strong> ${escapeHtml(pearl.slice(0, 140))}${pearl.length > 140 ? '…' : ''}</div>` : ''}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    // Attach Edit and Delete handlers
    container.querySelectorAll('.btn-edit-mcq').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id, 10);
        openDemoMcqModal(id);
      });
    });

    container.querySelectorAll('.btn-delete-mcq').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id, 10);
        handleDeleteDemoMcq(id);
      });
    });
  }

  function openDemoMcqModal(mcqId = null) {
    const modal = document.getElementById('demoMcqModal');
    const titleEl = document.getElementById('demoMcqModalTitle');
    const form = document.getElementById('demoMcqForm');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('demoMcqId').value = '';

    // Reset radio active classes
    for (let i = 0; i < 4; i++) {
      const wrap = document.getElementById(`wrap_opt_${i}`);
      if (wrap) wrap.classList.remove('active');
    }

    if (mcqId) {
      const q = allDemoMcqsList.find(item => item.id === mcqId);
      if (!q) return;

      if (titleEl) titleEl.textContent = `Edit Demo Question (Q${q.id})`;
      document.getElementById('demoMcqId').value = q.id;
      document.getElementById('demoMcqCategory').value = q.category || '';
      document.getElementById('demoMcqDifficulty').value = q.difficulty || '';
      document.getElementById('demoMcqClientNeed').value = q.clientNeed || '';
      document.getElementById('demoMcqSortOrder').value = q.sortOrder !== undefined ? q.sortOrder : 1;
      document.getElementById('demoMcqStatement').value = q.statement || '';

      const opts = Array.isArray(q.options) ? q.options : [];
      document.getElementById('demoMcqOpt0').value = opts[0] || '';
      document.getElementById('demoMcqOpt1').value = opts[1] || '';
      document.getElementById('demoMcqOpt2').value = opts[2] || '';
      document.getElementById('demoMcqOpt3').value = opts[3] || '';

      const correctIdx = q.correctIndex !== undefined ? q.correctIndex : 0;
      const radio = document.querySelector(`input[name="mcqCorrectOption"][value="${correctIdx}"]`);
      if (radio) radio.checked = true;
      const wrap = document.getElementById(`wrap_opt_${correctIdx}`);
      if (wrap) wrap.classList.add('active');

      const desc = q.description || {};
      document.getElementById('demoMcqCorrectRationale').value = desc.correctRationale || '';

      const distractors = Array.isArray(desc.distractors) ? desc.distractors.join('\n') : (desc.distractors || '');
      document.getElementById('demoMcqDistractors').value = distractors;
      document.getElementById('demoMcqClinicalPearl').value = desc.clinicalPearl || '';
    } else {
      if (titleEl) titleEl.textContent = 'Add New Free Demo Question';
      document.getElementById('demoMcqCategory').value = 'NCLEX-RN • Pharmacology & Client Needs';
      document.getElementById('demoMcqDifficulty').value = 'High Yield';
      document.getElementById('demoMcqSortOrder').value = allDemoMcqsList.length + 1;
      const radio0 = document.querySelector('input[name="mcqCorrectOption"][value="0"]');
      if (radio0) radio0.checked = true;
      const wrap0 = document.getElementById('wrap_opt_0');
      if (wrap0) wrap0.classList.add('active');
    }

    modal.classList.add('active');
  }

  async function handleSaveDemoMcq() {
    const form = document.getElementById('demoMcqForm');
    if (!form) return;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const id = document.getElementById('demoMcqId').value;
    const category = document.getElementById('demoMcqCategory').value.trim();
    const difficulty = document.getElementById('demoMcqDifficulty').value.trim();
    const clientNeed = document.getElementById('demoMcqClientNeed').value.trim();
    const sortOrder = parseInt(document.getElementById('demoMcqSortOrder').value, 10) || 0;
    const statement = document.getElementById('demoMcqStatement').value.trim();

    const opt0 = document.getElementById('demoMcqOpt0').value.trim();
    const opt1 = document.getElementById('demoMcqOpt1').value.trim();
    const opt2 = document.getElementById('demoMcqOpt2').value.trim();
    const opt3 = document.getElementById('demoMcqOpt3').value.trim();
    const options = [opt0, opt1, opt2, opt3].filter(o => o.length > 0);

    if (options.length < 2) {
      showToast('Please provide at least 2 options.', 'error');
      return;
    }

    const correctRadio = document.querySelector('input[name="mcqCorrectOption"]:checked');
    const correctIndex = correctRadio ? parseInt(correctRadio.value, 10) : 0;

    const correctRationale = document.getElementById('demoMcqCorrectRationale').value.trim();
    const distractorsRaw = document.getElementById('demoMcqDistractors').value.trim();
    const distractors = distractorsRaw ? distractorsRaw.split('\n').map(s => s.trim()).filter(s => s.length > 0) : [];
    const clinicalPearl = document.getElementById('demoMcqClinicalPearl').value.trim();

    const payload = {
      category,
      difficulty,
      clientNeed,
      sortOrder,
      statement,
      options,
      correctIndex,
      correctRationale,
      distractors,
      clinicalPearl,
      description: {
        correctRationale,
        distractors,
        clinicalPearl
      }
    };

    const saveBtn = document.getElementById('saveDemoMcqBtn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';
    }

    try {
      const url = id ? `${API_ADMIN}/demo-mcqs/${id}` : `${API_ADMIN}/demo-mcqs`;
      const method = id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) {
        showToast(data.message || 'Failed to save question', 'error');
        return;
      }

      showToast(data.message || 'Demo question saved successfully!', 'success');
      closeModal('demoMcqModal');
      await loadDemoMcqs();
    } catch (err) {
      console.error('Error saving demo MCQ:', err);
      showToast('Network error while saving question.', 'error');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Save Demo Question';
      }
    }
  }

  async function handleDeleteDemoMcq(mcqId) {
    if (!confirm(`Are you sure you want to permanently delete Demo MCQ #${mcqId}?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_ADMIN}/demo-mcqs/${mcqId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) {
        showToast(data.message || 'Failed to delete question', 'error');
        return;
      }
      showToast('Demo question deleted successfully.', 'success');
      await loadDemoMcqs();
    } catch (err) {
      console.error('Error deleting demo MCQ:', err);
      showToast('Network error while deleting question.', 'error');
    }
  }

  async function handleResetDemoMcqs() {
    if (!confirm('Are you sure you want to restore the default 4 clinical demo MCQs? Any customized questions will be replaced.')) {
      return;
    }

    try {
      const res = await fetch(`${API_ADMIN}/demo-mcqs/reset`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) {
        showToast(data.message || 'Failed to reset questions', 'error');
        return;
      }
      showToast('Demo MCQs reset to default clinical scenarios.', 'success');
      await loadDemoMcqs();
    } catch (err) {
      console.error('Error resetting demo MCQs:', err);
      showToast('Network error while resetting questions.', 'error');
    }
  }

  function setupDemoMcqsControls() {
    const addBtn = document.getElementById('addDemoMcqBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => openDemoMcqModal());
    }

    const resetBtn = document.getElementById('resetDemoMcqsBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => handleResetDemoMcqs());
    }

    const saveBtn = document.getElementById('saveDemoMcqBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => handleSaveDemoMcq());
    }

    // Radio button changes to highlight selected option wrapper
    document.querySelectorAll('input[name="mcqCorrectOption"]').forEach(radio => {
      radio.addEventListener('change', () => {
        for (let i = 0; i < 4; i++) {
          const wrap = document.getElementById(`wrap_opt_${i}`);
          if (wrap) wrap.classList.remove('active');
        }
        const val = radio.value;
        const currentWrap = document.getElementById(`wrap_opt_${val}`);
        if (currentWrap) currentWrap.classList.add('active');
      });
    });
  }

  // ── 9. Q-BANK QUESTIONS MANAGEMENT (ALL) ──────────────────────────────────
  let cachedQBankQuestions = [];

  async function loadQBankQuestions() {
    const listContainer = document.getElementById('qbankAdminQuestionsList');
    if (!listContainer) return;
    listContainer.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--admin-text-muted)">Loading Q-Bank questions…</div>`;

    const category = document.getElementById('qbankAdminCategory')?.value || 'all';
    const difficulty = document.getElementById('qbankAdminDifficulty')?.value || 'all';
    const examType = document.getElementById('qbankAdminExamType')?.value || 'all';
    const isDemo = document.getElementById('qbankAdminDemo')?.value || 'all';
    const search = document.getElementById('qbankAdminSearch')?.value.trim() || '';

    const params = new URLSearchParams();
    if (category !== 'all') params.append('category', category);
    if (difficulty !== 'all') params.append('difficulty', difficulty);
    if (examType !== 'all') params.append('exam_type', examType);
    if (isDemo !== 'all') params.append('is_demo', isDemo);
    if (search) params.append('q', search);

    try {
      const res = await fetch(`${API_ADMIN}/qbank/questions?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      cachedQBankQuestions = data.questions || [];
      renderQBankQuestionsList(cachedQBankQuestions);
    } catch (err) {
      console.error('Error loading Q-Bank questions:', err);
      listContainer.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--admin-danger)">Failed to load Q-Bank questions: ${escapeHtml(err.message)}</div>`;
    }
  }

  function renderQBankQuestionsList(questions) {
    const listContainer = document.getElementById('qbankAdminQuestionsList');
    if (!listContainer) return;

    if (!questions.length) {
      listContainer.innerHTML = `
        <div style="text-align:center;padding:3rem;color:var(--admin-text-muted)">
          No questions found matching your search or filters. Click "Add New Question" above to add one.
        </div>
      `;
      return;
    }

    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    listContainer.innerHTML = questions.map((q) => {
      let opts = [];
      try {
        opts = Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]');
      } catch (_) {
        opts = [];
      }

      const isSata = Boolean(q.isMultipleResponse || q.isSata || q.questionType === 'multiple' || (q.correctIndices && q.correctIndices.length > 1));
      const targetCorrect = q.correctIndices || (q.correctIndex !== undefined ? [q.correctIndex] : [0]);
      const correctLetters = targetCorrect.map(idx => letters[idx] || (idx + 1)).join(', ');

      return `
        <div class="admin-mcq-card" style="border:1px solid var(--admin-border);border-radius:10px;padding:1.5rem;background:#ffffff;margin-bottom:1.5rem;box-shadow:0 1px 3px rgba(0,0,0,0.05)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:0.85rem;flex-wrap:wrap">
            <div style="display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap">
              <span class="admin-badge admin-badge-info" style="font-weight:700">#${q.id}</span>
              ${isSata ? `<span class="admin-badge" style="background:#f3e8ff;color:#7e22ce;font-weight:700;border:1px solid #d8b4fe">☑️ SATA (Multi-Answer: ${correctLetters})</span>` : `<span class="admin-badge" style="background:#e0f2fe;color:#0369a1;font-weight:600">Single Choice (${correctLetters})</span>`}
              <span class="admin-badge admin-badge-primary">${escapeHtml(q.category || 'General')}</span>
              <span class="admin-badge admin-badge-warning">${escapeHtml(q.difficulty || 'High Yield')}</span>
              <span class="admin-badge" style="background:#ede9fe;color:#5b21b6;font-weight:600">${escapeHtml(q.examType || 'NCLEX-RN')}</span>
              ${q.isDemo ? `<span class="admin-badge admin-badge-success">🌟 Free Demo Item</span>` : `<span class="admin-badge" style="background:#f1f5f9;color:#475569">🔒 Subscribers Only</span>`}
            </div>
            <div style="display:flex;gap:0.5rem">
              <button class="admin-btn admin-btn-sm admin-btn-secondary" onclick="window.adminEditQBankQuestion(${q.id})">
                ✏️ Edit
              </button>
              <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="window.adminDeleteQBankQuestion(${q.id})">
                🗑️ Delete
              </button>
            </div>
          </div>

          <div style="font-size:1.05rem;font-weight:600;color:var(--admin-text-main);line-height:1.6;margin-bottom:1rem">
            ${escapeHtml(q.statement)}
          </div>

          <!-- Options Grid -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:0.6rem;margin-bottom:1rem">
            ${opts.map((opt, optIdx) => {
              const isCorrect = targetCorrect.includes(optIdx);
              return `
                <div style="padding:0.65rem 0.85rem;border-radius:6px;font-size:0.88rem;display:flex;align-items:center;gap:0.6rem;${isCorrect ? 'background:#ecfdf5;border:1.5px solid #10b981;color:#065f46;font-weight:700' : 'background:#f8fafc;border:1px solid #e2e8f0;color:#334155'}">
                  <span style="width:22px;height:22px;border-radius:${isSata ? '4px' : '50%'};display:flex;align-items:center;justify-content:center;font-size:0.75rem;${isCorrect ? 'background:#10b981;color:#fff' : 'background:#cbd5e1;color:#1e293b'}">
                    ${letters[optIdx] || optIdx + 1}
                  </span>
                  <span>${escapeHtml(opt)} ${isCorrect ? '✓ (Correct)' : ''}</span>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Rationale & Pearl Preview -->
          <div style="background:#f8fafc;padding:0.85rem 1rem;border-radius:8px;border-left:4px solid var(--admin-primary);font-size:0.88rem;line-height:1.5;color:#334155;margin-bottom:0.5rem">
            <strong>📖 Clinical Rationale:</strong> ${escapeHtml(q.correctRationale)}
          </div>

          ${q.clinicalPearl ? `
            <div style="background:#fffbeb;padding:0.65rem 1rem;border-radius:6px;border:1px solid #fde68a;font-size:0.85rem;color:#92400e;line-height:1.4">
              <strong>💡 High-Yield Pearl:</strong> ${escapeHtml(q.clinicalPearl)}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  window.adminEditQBankQuestion = function(questionId) {
    openQBankQuestionModal(questionId);
  };

  window.adminDeleteQBankQuestion = async function(questionId) {
    if (!confirm(`Are you sure you want to permanently delete Question #${questionId}?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_ADMIN}/qbank/questions/${questionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      showToast('Question deleted successfully.', 'success');
      await loadQBankQuestions();
      loadStats();
    } catch (err) {
      console.error('Error deleting question:', err);
      showToast(err.message || 'Error deleting question', 'error');
    }
  };

  function updateQBankCorrectSummary() {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const checked = Array.from(document.querySelectorAll('.qbank-correct-choice:checked')).map(el => parseInt(el.value, 10));
    const summaryEl = document.getElementById('qbankCorrectSummary');
    if (!summaryEl) return;

    if (!checked.length) {
      summaryEl.textContent = 'No option selected as correct!';
      summaryEl.style.color = 'var(--admin-danger)';
    } else {
      const lettersStr = checked.map(i => `Option ${letters[i] || i + 1}`).join(', ');
      summaryEl.textContent = `Selected Correct: ${lettersStr}`;
      summaryEl.style.color = 'var(--admin-primary)';
    }
  }

  async function openQBankQuestionModal(questionId = null) {
    const modal = document.getElementById('qbankQuestionModal');
    if (!modal) return;
    const title = document.getElementById('qbankQuestionModalTitle');
    const form = document.getElementById('qbankQuestionForm');
    form.reset();

    document.getElementById('qbankQuestionId').value = questionId || '';

    // Reset option choices
    document.querySelectorAll('.qbank-correct-choice').forEach(cb => {
      cb.checked = (cb.value === '0');
    });
    document.getElementById('qbankQuestionType').value = 'single';
    updateQBankCorrectSummary();

    if (questionId) {
      title.textContent = `Edit Q-Bank Question #${questionId}`;
      const q = cachedQBankQuestions.find(item => item.id === questionId);
      if (q) {
        populateQBankQuestionForm(q);
      } else {
        try {
          const res = await fetch(`${API_ADMIN}/qbank/questions/${questionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.success && data.question) {
            populateQBankQuestionForm(data.question);
          }
        } catch (err) {
          console.error('Failed to load question details:', err);
        }
      }
    } else {
      title.textContent = 'Add New Q-Bank Question';
      document.getElementById('qbankIsDemo').checked = false;
      document.getElementById('qbankSortOrder').value = 0;
      updateQBankCorrectSummary();
    }

    openModal('qbankQuestionModal');
  }

  function populateQBankQuestionForm(q) {
    document.getElementById('qbankStatement').value = q.statement || '';
    document.getElementById('qbankCategory').value = q.category || 'Pharmacology & Parenteral Therapies';
    document.getElementById('qbankDifficulty').value = q.difficulty || 'High Yield';
    document.getElementById('qbankExamType').value = q.examType || 'NCLEX-RN';
    document.getElementById('qbankClientNeed').value = q.clientNeed || '';

    const isSata = Boolean(q.isMultipleResponse || q.isSata || q.questionType === 'multiple' || (q.correctIndices && q.correctIndices.length > 1));
    document.getElementById('qbankQuestionType').value = isSata ? 'multiple' : 'single';

    let opts = [];
    try {
      opts = Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]');
    } catch (_) {
      opts = [];
    }
    document.getElementById('qbankOpt0').value = opts[0] || '';
    document.getElementById('qbankOpt1').value = opts[1] || '';
    document.getElementById('qbankOpt2').value = opts[2] || '';
    document.getElementById('qbankOpt3').value = opts[3] || '';
    const opt4 = document.getElementById('qbankOpt4');
    if (opt4) opt4.value = opts[4] || '';
    const opt5 = document.getElementById('qbankOpt5');
    if (opt5) opt5.value = opts[5] || '';

    const targetIndices = q.correctIndices || (q.correctIndex !== undefined ? [q.correctIndex] : [0]);
    document.querySelectorAll('.qbank-correct-choice').forEach(cb => {
      const idx = parseInt(cb.value, 10);
      cb.checked = targetIndices.includes(idx);
    });

    updateQBankCorrectSummary();

    document.getElementById('qbankCorrectRationale').value = q.correctRationale || '';

    let distractors = [];
    try {
      distractors = Array.isArray(q.distractors) ? q.distractors : JSON.parse(q.distractors || '[]');
    } catch (_) {
      distractors = [];
    }
    document.getElementById('qbankDistractors').value = distractors.join('\n');

    document.getElementById('qbankClinicalPearl').value = q.clinicalPearl || '';
    document.getElementById('qbankIsDemo').checked = Boolean(q.isDemo);
    document.getElementById('qbankSortOrder').value = q.sortOrder || 0;
  }

  async function handleSaveQBankQuestion() {
    const id = document.getElementById('qbankQuestionId').value;
    const statement = document.getElementById('qbankStatement').value.trim();
    const category = document.getElementById('qbankCategory').value;
    const difficulty = document.getElementById('qbankDifficulty').value;
    const examType = document.getElementById('qbankExamType').value;
    const questionType = document.getElementById('qbankQuestionType').value;
    const clientNeed = document.getElementById('qbankClientNeed').value.trim();

    const rawOpts = [
      document.getElementById('qbankOpt0').value.trim(),
      document.getElementById('qbankOpt1').value.trim(),
      document.getElementById('qbankOpt2').value.trim(),
      document.getElementById('qbankOpt3').value.trim(),
      document.getElementById('qbankOpt4')?.value.trim() || '',
      document.getElementById('qbankOpt5')?.value.trim() || ''
    ];
    const options = rawOpts.filter(o => o.length > 0);

    const checkedChoices = Array.from(document.querySelectorAll('.qbank-correct-choice:checked'))
      .map(el => parseInt(el.value, 10))
      .filter(idx => idx < options.length);

    const correctRationale = document.getElementById('qbankCorrectRationale').value.trim();
    const distractorsRaw = document.getElementById('qbankDistractors').value.trim();
    const distractors = distractorsRaw ? distractorsRaw.split('\n').map(s => s.trim()).filter(Boolean) : [];
    const clinicalPearl = document.getElementById('qbankClinicalPearl').value.trim();
    const isDemo = document.getElementById('qbankIsDemo').checked ? 1 : 0;
    const sortOrder = parseInt(document.getElementById('qbankSortOrder').value, 10) || 0;

    if (!statement) {
      showToast('Please enter the question scenario stem.', 'error');
      return;
    }
    if (options.length < 2) {
      showToast('Please provide at least 2 answer choices.', 'error');
      return;
    }
    if (checkedChoices.length === 0) {
      showToast('Please select at least one correct option choice.', 'error');
      return;
    }
    if (questionType === 'multiple' && checkedChoices.length < 1) {
      showToast('Please select all correct answers for this SATA question.', 'error');
      return;
    }
    if (!correctRationale) {
      showToast('Please provide the clinical rationale for the correct answer.', 'error');
      return;
    }

    const payload = {
      statement,
      category,
      difficulty,
      examType,
      questionType,
      clientNeed,
      options,
      correctIndex: checkedChoices[0],
      correctIndices: checkedChoices,
      correctRationale,
      distractors,
      clinicalPearl,
      isDemo,
      sortOrder
    };

    const saveBtn = document.getElementById('saveQBankQuestionBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';

    try {
      const url = id ? `${API_ADMIN}/qbank/questions/${id}` : `${API_ADMIN}/qbank/questions`;
      const method = id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to save question.');

      showToast(id ? 'Question updated successfully!' : 'New question added successfully!', 'success');
      closeModal('qbankQuestionModal');
      await loadQBankQuestions();
      loadStats();
    } catch (err) {
      console.error('Error saving question:', err);
      showToast(err.message || 'Error saving question.', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 Save Question';
    }
  }

  async function handleReseedQBankQuestions() {
    if (!confirm('Are you sure you want to reseed the Q-Bank with default high-yield clinical questions? Any questions with custom changes will be reset.')) {
      return;
    }

    try {
      const res = await fetch(`${API_ADMIN}/qbank/questions/seed`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      showToast(data.message || 'Q-Bank reseeded successfully.', 'success');
      await loadQBankQuestions();
      loadStats();
    } catch (err) {
      console.error('Error reseeding questions:', err);
      showToast(err.message || 'Failed to reseed questions.', 'error');
    }
  }

  function setupQBankQuestionsControls() {
    const addBtn = document.getElementById('addQBankQuestionBtn');
    if (addBtn) addBtn.addEventListener('click', () => openQBankQuestionModal());

    const reseedBtn = document.getElementById('reseedQBankBtn');
    if (reseedBtn) reseedBtn.addEventListener('click', () => handleReseedQBankQuestions());

    const saveBtn = document.getElementById('saveQBankQuestionBtn');
    if (saveBtn) saveBtn.addEventListener('click', () => handleSaveQBankQuestion());

    // Toggle logic for correct choices in modal
    document.querySelectorAll('.qbank-correct-choice').forEach(cb => {
      cb.addEventListener('change', () => {
        const qType = document.getElementById('qbankQuestionType')?.value || 'single';
        if (qType === 'single' && cb.checked) {
          document.querySelectorAll('.qbank-correct-choice').forEach(other => {
            if (other !== cb) other.checked = false;
          });
        }
        updateQBankCorrectSummary();
      });
    });

    // Question type dropdown change
    const qTypeSelect = document.getElementById('qbankQuestionType');
    if (qTypeSelect) {
      qTypeSelect.addEventListener('change', () => {
        if (qTypeSelect.value === 'single') {
          const checked = document.querySelectorAll('.qbank-correct-choice:checked');
          if (checked.length > 1) {
            checked.forEach((el, idx) => {
              if (idx > 0) el.checked = false;
            });
          }
        }
        updateQBankCorrectSummary();
      });
    }

    // Search and filter triggers
    const searchInput = document.getElementById('qbankAdminSearch');
    if (searchInput) {
      let debounce;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => loadQBankQuestions(), 350);
      });
    }

    ['qbankAdminCategory', 'qbankAdminDifficulty', 'qbankAdminExamType', 'qbankAdminDemo'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => loadQBankQuestions());
    });
  }

  // ── BULK IMPORT QUESTIONS VIA JSON (MCQs & MSQs) ──────────────────────────
  const SAMPLE_BULK_JSON = [
    {
      "type": "single",
      "statement": "A client with acute anaphylactic shock arrives at the emergency department. Which medication must the registered nurse prepare and administer first?",
      "options": [
        "Intramuscular epinephrine (1:1,000) into the anterolateral thigh",
        "Intravenous diphenhydramine 50 mg",
        "Nebulized albuterol sulfate 2.5 mg",
        "Intravenous methylprednisolone 125 mg"
      ],
      "correct_index": 0,
      "correct_rationale": "Intramuscular epinephrine is the indisputable first-line emergency medication for anaphylaxis. It stimulates alpha-1 (vasoconstriction), beta-1 (inotropic/chronotropic), and beta-2 (bronchodilation) adrenergic receptors to reverse life-threatening hypotension and bronchospasm.",
      "clinical_pearl": "Administer IM epinephrine promptly in the vastus lateralis. Antihistamines and corticosteroids are secondary adjunctive medications and never replace epinephrine.",
      "category": "Pharmacology & Parenteral Therapies",
      "difficulty": "High Yield",
      "exam_type": "NCLEX-RN",
      "client_need": "Pharmacological and Parenteral Therapies",
      "is_demo": 1
    },
    {
      "type": "multiple",
      "statement": "A nurse is providing discharge instructions to a client newly prescribed oral digoxin 0.25 mg daily for heart failure. Which signs, symptoms, and clinical findings should the nurse teach the client to recognize as evidence of digoxin toxicity? (Select all that apply.)",
      "options": [
        "Visual disturbances including yellow-green halos or blurred vision",
        "Anorexia, nausea, and vomiting",
        "Heart rate < 60 bpm, skipped beats, or palpitations",
        "Hypokalemia (e.g. from concurrent loop diuretic therapy)",
        "Sudden onset of severe bilateral peripheral pitting edema",
        "Persistent hyperpyrexia with diaphoresis"
      ],
      "correct_indices": [0, 1, 2, 3],
      "correct_rationale": "Digoxin toxicity manifestations include gastrointestinal distress (anorexia, nausea, vomiting), visual alterations (yellow-green halos, hazy/blurred vision), and cardiac dysrhythmias / bradycardia. Hypokalemia greatly potentiates digitalis toxicity.",
      "clinical_pearl": "NCLEX Digoxin Pearl: Check apical pulse for 1 full minute prior to dosing; withhold if HR < 60 bpm. Serum digoxin levels > 2.0 ng/mL indicate toxic accumulation.",
      "category": "Pharmacology & Parenteral Therapies",
      "difficulty": "High Yield",
      "exam_type": "NCLEX-RN",
      "client_need": "Pharmacological and Parenteral Therapies",
      "is_demo": 0
    }
  ];

  function openQBankBulkImportModal() {
    const modal = document.getElementById('qbankBulkImportModal');
    if (!modal) return;
    const txt = document.getElementById('qbankBulkJsonText');
    if (txt && !txt.value.trim()) {
      txt.value = JSON.stringify(SAMPLE_BULK_JSON, null, 2);
    }
    modal.classList.add('active');
    handleValidateBulkJson(false);
  }

  async function handleValidateBulkJson(showToastNotice = true) {
    const txt = document.getElementById('qbankBulkJsonText');
    const rawVal = txt ? txt.value.trim() : '';
    const section = document.getElementById('bulkValidationSection');
    const chipsWrap = document.getElementById('bulkSummaryChips');
    const errorAlert = document.getElementById('bulkErrorAlert');
    const previewList = document.getElementById('bulkPreviewContainer');
    const previewCount = document.getElementById('bulkPreviewCount');
    const execBtn = document.getElementById('executeBulkImportBtn');

    if (!rawVal) {
      if (section) section.style.display = 'none';
      if (execBtn) execBtn.disabled = true;
      if (showToastNotice) showToast('Please paste JSON questions first.', 'error');
      return null;
    }

    try {
      const res = await fetch(`${API_ADMIN}/qbank/questions/bulk-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rawJson: rawVal,
          validateOnly: true,
          defaultExamType: document.getElementById('bulkDefaultExamType')?.value || 'NCLEX-RN',
          defaultCategory: document.getElementById('bulkDefaultCategory')?.value || 'Pharmacology & Parenteral Therapies',
          defaultDemo: document.getElementById('bulkDefaultDemo')?.value === '1' ? 1 : 0
        })
      });

      const data = await res.json();
      if (!res.ok && !data.preview) {
        throw new Error(data.message || 'JSON validation failed.');
      }

      if (section) section.style.display = 'block';

      // Render summary chips
      if (chipsWrap) {
        chipsWrap.innerHTML = `
          <span class="bulk-chip total">📋 Total: ${data.totalReceived || 0}</span>
          <span class="bulk-chip single">🔵 Single Choice (MCQ): ${data.singleCount || 0}</span>
          <span class="bulk-chip multiple">🟣 SATA Multi-Answer (MSQ): ${data.multipleCount || 0}</span>
          ${data.errorCount > 0 ? `<span class="bulk-chip error">⚠️ Errors: ${data.errorCount}</span>` : `<span class="bulk-chip total" style="background:#ecfdf5;color:#065f46;border-color:#a7f3d0">✅ 100% Valid</span>`}
        `;
      }

      // Render errors
      if (errorAlert) {
        if (data.errors && data.errors.length) {
          errorAlert.style.display = 'block';
          errorAlert.innerHTML = `<strong>⚠️ Issues detected:</strong><ul style="margin:0.4rem 0 0 1.2rem;padding:0">${data.errors.map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul>`;
        } else {
          errorAlert.style.display = 'none';
        }
      }

      // Render preview cards
      if (previewList) {
        if (!data.preview || !data.preview.length) {
          previewList.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--admin-text-muted)">No valid questions parsed from JSON yet.</div>`;
        } else {
          previewList.innerHTML = data.preview.map((q, idx) => {
            const isSata = q.question_type === 'multiple' || q.isMultipleResponse;
            const letters = ['A','B','C','D','E','F','G'];
            return `
              <div class="bulk-preview-item">
                <div class="bulk-preview-header">
                  <span class="bulk-chip ${isSata ? 'multiple' : 'single'}" style="font-size:0.75rem">
                    ${isSata ? '🟣 SATA / Multi-Answer' : '🔵 Single Choice'}
                  </span>
                  <span style="font-size:0.75rem;color:var(--admin-text-muted)">
                    Item #${idx + 1} • ${escapeHtml(q.category || '')} • ${escapeHtml(q.exam_type || 'NCLEX-RN')}
                  </span>
                </div>
                <div class="bulk-preview-title">
                  ${escapeHtml(q.statement)}
                </div>
                <div class="bulk-preview-options">
                  ${(q.options || []).map((opt, o_i) => {
                    const isCorrect = (q.correct_indices || []).includes(o_i);
                    return `
                      <div class="bulk-preview-option-chip ${isCorrect ? 'is-correct' : ''}" title="${escapeHtml(opt)}">
                        <strong>${letters[o_i] || o_i + 1}:</strong>
                        <span>${escapeHtml(opt)}</span>
                        ${isCorrect ? ' ✓' : ''}
                      </div>
                    `;
                  }).join('')}
                </div>
                <div class="bulk-preview-footer">
                  <span><strong>Correct Answer:</strong> Option(s) ${(q.correctLetters || []).join(', ')}</span>
                  <span style="color:#059669">${q.is_demo ? '🌟 Demo Unlocked' : '🔒 Subscribers Only'}</span>
                </div>
              </div>
            `;
          }).join('');
        }
      }

      if (previewCount) {
        previewCount.textContent = `Showing ${Math.min(data.preview ? data.preview.length : 0, 10)} of ${data.validCount || 0} valid items`;
      }

      if (execBtn) {
        execBtn.disabled = !data.validCount || data.validCount === 0;
        execBtn.innerHTML = `<span>🚀 Import ${data.validCount || 0} Questions to Bank</span>`;
      }

      if (showToastNotice) {
        showToast(`Validated: ${data.validCount || 0} questions parsed (${data.singleCount || 0} Single, ${data.multipleCount || 0} SATA).`, 'success');
      }

      return data;
    } catch (err) {
      console.error('Validation error:', err);
      if (section) section.style.display = 'block';
      if (errorAlert) {
        errorAlert.style.display = 'block';
        errorAlert.innerHTML = `<strong>JSON Parsing Error:</strong> ${escapeHtml(err.message)}`;
      }
      if (execBtn) execBtn.disabled = true;
      if (showToastNotice) showToast(err.message, 'error');
      return null;
    }
  }

  async function handleExecuteBulkImport() {
    const txt = document.getElementById('qbankBulkJsonText');
    const rawVal = txt ? txt.value.trim() : '';
    const execBtn = document.getElementById('executeBulkImportBtn');

    if (!rawVal) {
      showToast('Please provide JSON code first.', 'error');
      return;
    }

    try {
      if (execBtn) {
        execBtn.disabled = true;
        execBtn.innerHTML = `<span>⏳ Importing Questions...</span>`;
      }

      const res = await fetch(`${API_ADMIN}/qbank/questions/bulk-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rawJson: rawVal,
          validateOnly: false,
          defaultExamType: document.getElementById('bulkDefaultExamType')?.value || 'NCLEX-RN',
          defaultCategory: document.getElementById('bulkDefaultCategory')?.value || 'Pharmacology & Parenteral Therapies',
          defaultDemo: document.getElementById('bulkDefaultDemo')?.value === '1' ? 1 : 0
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Import failed.');
      }

      showToast(data.message || 'Questions imported successfully!', 'success');
      closeModal('qbankBulkImportModal');

      // Reload questions list and stats in background
      await loadQBankQuestions();
      loadStats();
    } catch (err) {
      console.error('Bulk import execution error:', err);
      showToast(err.message || 'Failed to import questions.', 'error');
    } finally {
      if (execBtn) {
        execBtn.disabled = false;
        execBtn.innerHTML = `<span>🚀 Import to Question Bank</span>`;
      }
    }
  }

  function setupQBankBulkImportControls() {
    const bulkBtn = document.getElementById('bulkImportQBankBtn');
    if (bulkBtn) bulkBtn.addEventListener('click', () => openQBankBulkImportModal());

    const sampleBtn = document.getElementById('loadSampleBulkJsonBtn');
    if (sampleBtn) {
      sampleBtn.addEventListener('click', () => {
        const txt = document.getElementById('qbankBulkJsonText');
        if (txt) {
          txt.value = JSON.stringify(SAMPLE_BULK_JSON, null, 2);
          handleValidateBulkJson(false);
          showToast('Sample JSON template loaded!', 'info');
        }
      });
    }

    const formatBtn = document.getElementById('formatBulkJsonBtn');
    if (formatBtn) {
      formatBtn.addEventListener('click', () => {
        const txt = document.getElementById('qbankBulkJsonText');
        if (!txt || !txt.value.trim()) return;
        try {
          const parsed = JSON.parse(txt.value.trim());
          txt.value = JSON.stringify(parsed, null, 2);
          showToast('JSON formatted nicely.', 'success');
        } catch (err) {
          showToast('Cannot format: ' + err.message, 'error');
        }
      });
    }

    const clearBtn = document.getElementById('clearBulkJsonBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        const txt = document.getElementById('qbankBulkJsonText');
        if (txt) txt.value = '';
        const section = document.getElementById('bulkValidationSection');
        if (section) section.style.display = 'none';
        const execBtn = document.getElementById('executeBulkImportBtn');
        if (execBtn) {
          execBtn.disabled = true;
          execBtn.innerHTML = `<span>🚀 Import to Question Bank</span>`;
        }
      });
    }

    const valBtn = document.getElementById('validateBulkJsonBtn');
    if (valBtn) valBtn.addEventListener('click', () => handleValidateBulkJson(true));

    const execBtn = document.getElementById('executeBulkImportBtn');
    if (execBtn) execBtn.addEventListener('click', () => handleExecuteBulkImport());

    // Debounced live typing validation
    const jsonTxt = document.getElementById('qbankBulkJsonText');
    if (jsonTxt) {
      let debounce;
      jsonTxt.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          if (jsonTxt.value.trim().length > 10) {
            handleValidateBulkJson(false);
          }
        }, 500);
      });
    }

    // Default selectors triggers re-validation preview
    ['bulkDefaultExamType', 'bulkDefaultCategory', 'bulkDefaultDemo'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => {
        const txt = document.getElementById('qbankBulkJsonText');
        if (txt && txt.value.trim()) handleValidateBulkJson(false);
      });
    });
  }

  // ── 10. Q-BANK SUBSCRIPTIONS MANAGEMENT ───────────────────────────────────
  let activeQBankSubFilter = 'all';

  async function loadQBankSubscriptions(status = null) {
    if (status !== null) activeQBankSubFilter = status;
    const tbody = document.getElementById('qbankSubscriptionsTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:3rem;color:var(--admin-text-muted)">Loading subscriptions…</td></tr>`;

    const url = activeQBankSubFilter === 'all'
      ? `${API_ADMIN}/qbank/subscriptions`
      : `${API_ADMIN}/qbank/subscriptions?status=${encodeURIComponent(activeQBankSubFilter)}`;

    try {
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      renderQBankSubscriptionsTable(data.subscriptions || []);
    } catch (err) {
      console.error('Error loading subscriptions:', err);
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:3rem;color:var(--admin-danger)">Failed to load subscriptions: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  let cachedQBankSubs = [];

  function renderQBankSubscriptionsTable(subs) {
    cachedQBankSubs = subs || [];
    const tbody = document.getElementById('qbankSubscriptionsTableBody');
    if (!tbody) return;

    if (!subs.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center;padding:3rem;color:var(--admin-text-muted)">
            No ${activeQBankSubFilter !== 'all' ? activeQBankSubFilter : ''} subscriptions found.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = subs.map(sub => {
      let statusBadge = '';
      if (sub.status === 'approved') {
        statusBadge = `<span class="admin-badge admin-badge-success">Approved</span>`;
      } else if (sub.status === 'pending') {
        statusBadge = `<span class="admin-badge admin-badge-warning">Pending Review</span>`;
      } else if (sub.status === 'expired') {
        statusBadge = `<span class="admin-badge" style="background:#f1f5f9;color:#64748b;">Expired</span>`;
      } else {
        statusBadge = `<span class="admin-badge admin-badge-danger">Rejected</span>`;
      }

      const validUntil = sub.status === 'approved'
        ? (sub.expiresAt ? `${sub.expiresAt.substring(0, 10)} (${sub.daysRemaining}d left)` : 'Active Forever')
        : '—';

      return `
        <tr>
          <td>#${sub.id}</td>
          <td>
            <strong>${escapeHtml(sub.studentName || 'Student')}</strong><br/>
            <span style="font-size:0.8rem;color:var(--admin-text-muted)">${escapeHtml(sub.studentEmail || '')}</span>
          </td>
          <td>
            <strong>${escapeHtml(sub.planName)}</strong>
          </td>
          <td>${sub.durationDays} Days</td>
          <td><strong>Rs. ${Number(sub.price).toLocaleString()}</strong></td>
          <td>
            <div style="display:flex;flex-direction:column;gap:4px">
              ${formatWhatsAppLink(sub.whatsappNumber, sub.studentName, `Q-Bank ${sub.planName}`)}
              ${formatScreenshotPreview(sub.paymentScreenshot, sub.studentName, `Q-Bank ${sub.planName}`)}
            </div>
          </td>
          <td>${statusBadge}</td>
          <td style="font-size:0.85rem">${validUntil}</td>
          <td>
            <div style="display:flex;gap:0.35rem;align-items:center;flex-wrap:wrap">
              <button class="admin-btn admin-btn-xs admin-btn-primary" onclick="window.openManageSubscriptionModal(${sub.id})" title="Manage plan, days, status or custom expiration">
                ⚙️ Manage
              </button>
              <button class="admin-btn admin-btn-xs admin-btn-secondary" onclick="window.adminQuickExtendSub(${sub.id}, 30, '${escapeHtml(sub.studentName || '')}')" title="Quick extend +30 days">
                ⏳ +30d
              </button>
              <button class="admin-btn admin-btn-xs admin-btn-secondary" onclick="window.openSendNotificationModal(${sub.userId}, '${escapeHtml(sub.studentName || '')}')" title="Send in-app notification to student">
                🔔 Notify
              </button>
              ${sub.status === 'pending' ? `
                <button class="admin-btn admin-btn-xs admin-btn-success" onclick="window.adminApproveQBankSub(${sub.id}, '${escapeHtml(sub.whatsappNumber || '')}', '${escapeHtml(sub.studentName || '')}', '${escapeHtml(sub.planName || '')}')">
                  ✅ Approve
                </button>
                <button class="admin-btn admin-btn-xs admin-btn-danger" onclick="window.adminRejectQBankSub(${sub.id}, '${escapeHtml(sub.studentName || '')}', '${escapeHtml(sub.planName || '')}')">
                  ❌ Reject
                </button>
              ` : sub.status === 'approved' ? `
                <button class="admin-btn admin-btn-xs admin-btn-danger" onclick="window.adminRejectQBankSub(${sub.id}, '${escapeHtml(sub.studentName || '')}', '${escapeHtml(sub.planName || '')}')">
                  Revoke
                </button>
              ` : `
                <button class="admin-btn admin-btn-xs admin-btn-success" onclick="window.adminApproveQBankSub(${sub.id}, '${escapeHtml(sub.whatsappNumber || '')}', '${escapeHtml(sub.studentName || '')}', '${escapeHtml(sub.planName || '')}')">
                  ✅ Approve
                </button>
              `}
              <button class="admin-btn admin-btn-xs admin-btn-secondary" onclick="window.adminDeleteQBankSub(${sub.id})" title="Delete record">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.adminApproveQBankSub = async function(subId, whatsappNumber = '', studentName = '', planName = '') {
    try {
      const res = await fetch(`${API_ADMIN}/qbank/subscriptions/${subId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes: 'Payment confirmed & approved by administrator' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Approval failed.');

      showToast(data.message || 'Subscription APPROVED! Student now has full Q-Bank access.', 'success');
      loadQBankSubscriptions();
      loadStats();

      // Offer instant WhatsApp notification
      if (whatsappNumber) {
        const clean = whatsappNumber.replace(/[^0-9]/g, '');
        const msg = `Assalam-o-Alaikum ${studentName}! Your payment for Q-Bank Plan "${planName}" has been verified and APPROVED! You now have full access to all 2,500+ NCLEX practice questions with clinical rationales. Start practicing now at: https://simplenclexplatform.vercel.app/qbank`;
        const waUrl = data.whatsappUrl || `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
        setTimeout(() => {
          if (confirm(`Q-Bank access approved! Open WhatsApp now to notify ${studentName}?`)) {
            window.open(waUrl, '_blank');
          }
        }, 400);
      }
    } catch (err) {
      console.error('Error approving subscription:', err);
      showToast(err.message || 'Error approving subscription.', 'error');
    }
  };

  window.adminRejectQBankSub = async function(subId, studentName = '', planName = '') {
    const reason = prompt(`Reason for rejecting ${studentName}'s Q-Bank subscription (${planName}):`, 'Payment screenshot unverified or invalid transaction.');
    if (reason === null) return;

    try {
      const res = await fetch(`${API_ADMIN}/qbank/subscriptions/${subId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes: reason })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      showToast('Subscription has been rejected.', 'info');
      loadQBankSubscriptions();
      loadStats();
    } catch (err) {
      console.error('Error rejecting subscription:', err);
      showToast(err.message || 'Error rejecting subscription', 'error');
    }
  };

  window.adminDeleteQBankSub = async function(subId) {
    if (!confirm(`Are you sure you want to permanently delete subscription record #${subId}?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_ADMIN}/qbank/subscriptions/${subId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      showToast('Subscription record deleted.', 'success');
      loadQBankSubscriptions();
      loadStats();
    } catch (err) {
      console.error('Error deleting subscription:', err);
      showToast(err.message || 'Error deleting subscription', 'error');
    }
  };

  // ── MANAGE SUBSCRIPTION MODAL ──
  window.openManageSubscriptionModal = function(subId) {
    const sub = cachedQBankSubs.find(s => s.id === subId);
    if (!sub) {
      showToast('Subscription record not found in cache.', 'error');
      return;
    }

    document.getElementById('manageSubId').value = sub.id;
    document.getElementById('manageSubStudentName').textContent = sub.studentName || 'Student';
    document.getElementById('manageSubStudentEmail').textContent = sub.studentEmail || '';

    const currentBadge = document.getElementById('manageSubCurrentStatus');
    if (currentBadge) {
      currentBadge.className = `admin-badge admin-badge-${sub.status === 'approved' ? 'success' : sub.status === 'pending' ? 'warning' : 'danger'}`;
      currentBadge.textContent = (sub.status || 'unknown').toUpperCase();
    }

    document.getElementById('manageSubStatus').value = sub.status || 'approved';
    document.getElementById('manageSubPlanName').value = sub.planName || '';
    document.getElementById('manageSubDurationDays').value = sub.durationDays || 30;

    const expInput = document.getElementById('manageSubExpiresAt');
    if (expInput) {
      expInput.value = sub.expiresAt ? sub.expiresAt.substring(0, 10) : '';
    }

    document.getElementById('manageSubNotes').value = sub.notes || '';
    document.getElementById('manageSubNotifyStudent').checked = true;
    document.getElementById('manageSubCustomMsg').value = '';

    openModal('manageSubscriptionModal');
  };

  // Quick extension buttons in manage modal
  document.querySelectorAll('.sub-quick-extend').forEach(btn => {
    btn.addEventListener('click', () => {
      const addDays = parseInt(btn.dataset.days, 10) || 30;
      const daysInput = document.getElementById('manageSubDurationDays');
      const expInput = document.getElementById('manageSubExpiresAt');

      const currentDays = parseInt(daysInput.value, 10) || 0;
      daysInput.value = currentDays + addDays;

      let baseDate = new Date();
      if (expInput.value) {
        const parsed = new Date(expInput.value);
        if (parsed > baseDate) baseDate = parsed;
      }
      baseDate.setDate(baseDate.getDate() + addDays);
      expInput.value = baseDate.toISOString().substring(0, 10);

      showToast(`Added +${addDays} days to duration & expiration date!`, 'info');
    });
  });

  // Save subscription changes
  const saveSubBtn = document.getElementById('saveSubscriptionChangesBtn');
  if (saveSubBtn) {
    saveSubBtn.addEventListener('click', async () => {
      const subId = document.getElementById('manageSubId').value;
      if (!subId) return;

      const status = document.getElementById('manageSubStatus').value;
      const planName = document.getElementById('manageSubPlanName').value.trim();
      const durationDays = parseInt(document.getElementById('manageSubDurationDays').value, 10) || 30;
      const expiresAt = document.getElementById('manageSubExpiresAt').value;
      const notes = document.getElementById('manageSubNotes').value.trim();
      const notifyStudent = document.getElementById('manageSubNotifyStudent').checked;
      const notificationMessage = document.getElementById('manageSubCustomMsg').value.trim();

      saveSubBtn.disabled = true;
      saveSubBtn.textContent = 'Saving…';

      try {
        const res = await fetch(`${API_ADMIN}/qbank/subscriptions/${subId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            status,
            planName,
            durationDays,
            expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
            notes,
            notifyStudent,
            notificationMessage
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Update failed');

        showToast(data.message || 'Subscription updated successfully!', 'success');
        closeModal('manageSubscriptionModal');
        loadQBankSubscriptions();
        loadStats();
      } catch (err) {
        console.error('Error updating subscription:', err);
        showToast(err.message || 'Failed to update subscription', 'error');
      } finally {
        saveSubBtn.disabled = false;
        saveSubBtn.textContent = '💾 Save Subscription Changes';
      }
    });
  }

  // Quick 30-day extension from table
  window.adminQuickExtendSub = async function(subId, addDays = 30, studentName = '') {
    if (!confirm(`Extend Q-Bank access for ${studentName || 'student'} by +${addDays} days?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_ADMIN}/qbank/subscriptions/${subId}/extend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ addDays, notifyStudent: true })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Extension failed');

      showToast(data.message || `Extended by ${addDays} days!`, 'success');
      loadQBankSubscriptions();
      loadStats();
    } catch (err) {
      console.error('Error extending subscription:', err);
      showToast(err.message || 'Error extending subscription', 'error');
    }
  };

  // ── NOTIFICATIONS MODAL ──
  window.openSendNotificationModal = function(userId, studentName = '') {
    document.getElementById('notifTargetUserId').value = userId;
    document.getElementById('notifTargetDisplay').value = `${studentName || 'Student'} (ID: ${userId})`;
    document.getElementById('notifTitleInput').value = '';
    document.getElementById('notifMessageInput').value = '';
    document.getElementById('notifLinkInput').value = '/qbank';
    document.getElementById('notifTypeSelect').value = 'subscription';
    openModal('sendNotificationModal');
  };

  const broadcastBtn = document.getElementById('broadcastNotificationBtn');
  if (broadcastBtn) {
    broadcastBtn.addEventListener('click', () => {
      document.getElementById('notifTargetUserId').value = 'all';
      document.getElementById('notifTargetDisplay').value = 'All Registered Students (Broadcast)';
      document.getElementById('notifTitleInput').value = '';
      document.getElementById('notifMessageInput').value = '';
      document.getElementById('notifLinkInput').value = '/courses';
      document.getElementById('notifTypeSelect').value = 'general';
      openModal('sendNotificationModal');
    });
  }

  const sendNotifBtn = document.getElementById('sendNotificationSubmitBtn');
  if (sendNotifBtn) {
    sendNotifBtn.addEventListener('click', async () => {
      const userId = document.getElementById('notifTargetUserId').value;
      const title = document.getElementById('notifTitleInput').value.trim();
      const message = document.getElementById('notifMessageInput').value.trim();
      const notifType = document.getElementById('notifTypeSelect').value;
      const link = document.getElementById('notifLinkInput').value.trim();

      if (!title || !message) {
        showToast('Notification title and message are required.', 'error');
        return;
      }

      sendNotifBtn.disabled = true;
      sendNotifBtn.textContent = 'Sending…';

      try {
        const res = await fetch(`${API_ADMIN}/students/notify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ userId, title, message, type: notifType, link })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to send notification');

        showToast(data.message || 'Notification dispatched!', 'success');
        closeModal('sendNotificationModal');
      } catch (err) {
        console.error('Error sending notification:', err);
        showToast(err.message || 'Error sending notification', 'error');
      } finally {
        sendNotifBtn.disabled = false;
        sendNotifBtn.textContent = '🚀 Send Notification';
      }
    });
  }
    const modal = document.getElementById('qbankManualSubModal');
    if (!modal) return;
    document.getElementById('qbankManualSubForm').reset();
    document.getElementById('qbankCustomDaysWrap').style.display = 'none';

    // Populate user select dropdown
    const userSelect = document.getElementById('qbankManualUserId');
    userSelect.innerHTML = `<option value="">Loading students…</option>`;

    try {
      const res = await fetch(`${API_ADMIN}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.users) {
        userSelect.innerHTML = `
          <option value="">-- Choose Registered Student --</option>
          ${data.users.map(u => `<option value="${u.id}">${escapeHtml(u.name)} (${escapeHtml(u.email)})</option>`).join('')}
        `;
      }
    } catch (err) {
      userSelect.innerHTML = `<option value="">-- Enter Email Below --</option>`;
    }

    openModal('qbankManualSubModal');
  }

  async function handleSaveManualQBankGrant() {
    const userId = document.getElementById('qbankManualUserId').value;
    const email = document.getElementById('qbankManualEmail').value.trim();
    const planVal = document.getElementById('qbankManualPlanId').value;
    const notes = document.getElementById('qbankManualNotes').value.trim() || 'Manual grant by administrator';

    let planId = null;
    let durationDays = 30;

    if (planVal === 'custom') {
      durationDays = parseInt(document.getElementById('qbankManualCustomDays').value, 10) || 30;
    } else {
      planId = parseInt(planVal, 10);
      if (planVal === '1') durationDays = 30;
      if (planVal === '2') durationDays = 90;
      if (planVal === '3') durationDays = 180;
    }

    if (!userId && !email) {
      showToast('Please select a student or enter a registered email.', 'error');
      return;
    }

    const payload = {
      userId: userId ? parseInt(userId, 10) : null,
      email: email || null,
      planId,
      durationDays,
      notes
    };

    const btn = document.getElementById('saveManualQBankSubBtn');
    btn.disabled = true;
    btn.textContent = 'Granting…';

    try {
      const res = await fetch(`${API_ADMIN}/qbank/subscriptions/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      showToast(data.message || 'Access granted successfully!', 'success');
      closeModal('qbankManualSubModal');
      loadQBankSubscriptions();
      loadStats();
    } catch (err) {
      console.error('Error granting manual access:', err);
      showToast(err.message || 'Failed to grant access.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '✅ Grant Q-Bank Access';
    }
  }

  function setupQBankSubscriptionsControls() {
    const grantBtn = document.getElementById('manualQBankGrantBtn');
    if (grantBtn) grantBtn.addEventListener('click', () => openManualQBankGrantModal());

    const saveGrantBtn = document.getElementById('saveManualQBankSubBtn');
    if (saveGrantBtn) saveGrantBtn.addEventListener('click', () => handleSaveManualQBankGrant());

    const planSelect = document.getElementById('qbankManualPlanId');
    if (planSelect) {
      planSelect.addEventListener('change', (e) => {
        const wrap = document.getElementById('qbankCustomDaysWrap');
        if (wrap) wrap.style.display = (e.target.value === 'custom') ? 'block' : 'none';
      });
    }

    // Filter tabs
    document.querySelectorAll('.qbank-sub-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.qbank-sub-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const filter = tab.dataset.subFilter;
        loadQBankSubscriptions(filter);
      });
    });
  }

  // ── BOOTSTRAP ──────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize navigation and controls immediately so tabs are responsive
    setupNavigation();
    setupRegistrationsControls();
    setupCoursesControls();
    setupCurriculumControls();
    setupDemoMcqsControls();
    setupQBankQuestionsControls();
    setupQBankBulkImportControls();
    setupQBankSubscriptionsControls();
    setupSettingsControls();
    setupUsersControls();
    setupEditUserControls();

    // 2. Support URL parameters for direct tab navigation (?tab=courses, etc.)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const initialTab = urlParams.get('tab') || window.location.hash.replace('#', '');
      if (initialTab) {
        switchAdminView(initialTab);
      }
    } catch (_) {}

    // 3. Authenticate and populate dashboard stats
    const authenticated = await checkAdminAuth();
    if (authenticated) {
      loadStats();
    }
  });

})();
