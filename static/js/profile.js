/**
 * Simple NCLEX Platform — Student Profile & Practice Scores Dashboard
 */

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('nclex_token') || localStorage.getItem('token') || localStorage.getItem('access_token');
  const userJson = localStorage.getItem('nclex_user') || localStorage.getItem('user');

  // Check authentication
  if (!token) {
    if (typeof showToast === 'function') {
      showToast('Please log in to access your student profile.', 'info');
    }
    setTimeout(() => {
      window.location.href = 'login.html?redirect=profile.html';
    }, 800);
    return;
  }

  let currentUser = null;
  if (userJson) {
    try {
      currentUser = JSON.parse(userJson);
    } catch (_) {
      currentUser = null;
    }
  }

  // ── TAB SWITCHING ──
  const tabBtns = document.querySelectorAll('.profile-tab-btn');
  const tabContents = document.querySelectorAll('.profile-tab-content');

  function switchTab(targetId) {
    tabBtns.forEach(b => {
      if (b.dataset.tab === targetId) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    tabContents.forEach(c => {
      if (c.id === targetId) {
        c.classList.add('active');
      } else {
        c.classList.remove('active');
      }
    });

    if (targetId === 'tab-notifications') {
      loadNotifications();
    }
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      switchTab(target);
      history.replaceState(null, '', `#${target}`);
    });
  });

  // Check URL hash for tab
  const hash = window.location.hash.replace('#', '');
  if (hash && document.getElementById(hash)) {
    switchTab(hash);
  }

  // ── LOAD PROFILE DATA ──
  async function loadProfile() {
    try {
      const res = await fetch('/api/student/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.status === 401) {
        localStorage.removeItem('nclex_token');
        localStorage.removeItem('nclex_user');
        window.location.href = 'login.html';
        return;
      }

      const data = await res.json();
      if (!data.success) {
        if (typeof showToast === 'function') showToast(data.message || 'Error loading profile', 'error');
        return;
      }

      renderProfileBanner(data.user, data.qbankSubscription, data.courseEnrollments, data.qbankStats);
      renderScoreStats(data.qbankStats);
      renderSubscriptions(data.qbankSubscription, data.courseEnrollments);
      updateNotifBadge(data.unreadNotificationsCount);
      populateSettingsForm(data.user);

    } catch (err) {
      console.error('Failed to load student profile:', err);
      if (typeof showToast === 'function') showToast('Connection issue loading profile data.', 'error');
    }
  }

  // ── RENDER PROFILE BANNER ──
  function renderProfileBanner(user, qbankSub, enrollments, stats) {
    if (!user) return;

    // Avatar initials
    const initials = `${(user.firstName || 'S')[0]}${(user.lastName || 'T')[0]}`.toUpperCase();
    const avatarEl = document.getElementById('profileAvatarInitials');
    if (avatarEl) avatarEl.textContent = initials;

    // Name & Role
    const nameEl = document.getElementById('profileFullName');
    if (nameEl) nameEl.textContent = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Student';

    const roleEl = document.getElementById('profileRoleBadge');
    if (roleEl) {
      roleEl.textContent = (user.role || 'student').toUpperCase();
      if (user.role === 'admin') {
        roleEl.style.background = 'rgba(239, 68, 68, 0.2)';
        roleEl.style.borderColor = '#ef4444';
        roleEl.style.color = '#fca5a5';
      }
    }

    // Email, Phone, Exam Tag
    const emailEl = document.getElementById('profileEmail');
    if (emailEl) emailEl.textContent = user.email || '';

    const phoneEl = document.getElementById('profilePhone');
    if (phoneEl) phoneEl.textContent = user.phone ? `📞 ${user.phone}` : '📞 No phone set';

    const examTagEl = document.getElementById('profileExamTag');
    if (examTagEl) examTagEl.textContent = user.examType || 'NCLEX-RN';

    // Quick Status Cards
    const qbBadgeEl = document.getElementById('profileQBankQuickBadge');
    if (qbBadgeEl) {
      if (qbankSub && (qbankSub.status === 'approved' || qbankSub.status === 'active')) {
        const days = qbankSub.daysRemaining ?? qbankSub.durationDays ?? 0;
        qbBadgeEl.innerHTML = `<span style="color:#4ade80;">Active (${days}d left)</span>`;
      } else if (qbankSub && qbankSub.status === 'pending') {
        qbBadgeEl.innerHTML = `<span style="color:#fbbf24;">Pending Verification</span>`;
      } else {
        qbBadgeEl.innerHTML = `<span style="color:#94a3b8;">No Active Pass</span>`;
      }
    }

    const coursesCountEl = document.getElementById('profileCoursesCount');
    if (coursesCountEl) {
      const approvedCount = (enrollments || []).filter(e => e.status === 'approved').length;
      coursesCountEl.textContent = `${approvedCount} Approved Course${approvedCount === 1 ? '' : 's'}`;
    }

    const accuracyQuickEl = document.getElementById('profileAccuracyQuick');
    if (accuracyQuickEl) {
      accuracyQuickEl.textContent = `${stats ? stats.accuracyRate : 0}%`;
    }
  }

  // ── RENDER PRACTICE SCORES & METRICS ──
  function renderScoreStats(stats) {
    if (!stats) return;

    const accEl = document.getElementById('statAccuracy');
    const accSub = document.getElementById('statAccuracySub');
    const attEl = document.getElementById('statAttempted');
    const uqEl = document.getElementById('statUniqueQuestions');
    const corEl = document.getElementById('statCorrect');
    const incEl = document.getElementById('statIncorrect');

    if (accEl) accEl.textContent = `${stats.accuracyRate}%`;
    if (accSub) accSub.textContent = `Based on ${stats.totalAttempted} practice answer${stats.totalAttempted === 1 ? '' : 's'}`;
    if (attEl) attEl.textContent = stats.totalAttempted;
    if (uqEl) uqEl.textContent = `${stats.uniqueQuestions} unique question${stats.uniqueQuestions === 1 ? '' : 's'}`;
    if (corEl) corEl.textContent = stats.correctCount;
    if (incEl) incEl.textContent = stats.incorrectCount;

    // Category Mastery Breakdown
    const categoryList = document.getElementById('categoryBarsList');
    if (categoryList) {
      let items = [];
      if (Array.isArray(stats.categoryBreakdown)) {
        items = stats.categoryBreakdown;
      } else if (stats.categoryBreakdown && typeof stats.categoryBreakdown === 'object') {
        items = Object.values(stats.categoryBreakdown);
      }

      if (items.length === 0) {
        categoryList.innerHTML = `
          <div class="text-center py-4 text-muted">
            <p>No category practice records yet. Choose a category in Q-Bank and start answering questions!</p>
          </div>
        `;
      } else {
        let html = '';
        items.forEach(item => {
          const cat = item.category || 'General';
          const rate = item.accuracyRate ?? (item.attempted ? Math.round((item.correct / item.attempted) * 100) : 0);
          const label = formatCategoryName(cat);
          const attCount = item.attempted ?? item.total ?? 0;
          const corrCount = item.correct ?? 0;
          html += `
            <div class="category-item">
              <div class="category-item-head">
                <span class="category-item-name">${escapeHtml(label)} <small class="text-muted">(${corrCount}/${attCount} correct)</small></span>
                <span class="category-item-rate">${rate}%</span>
              </div>
              <div class="category-progress-track">
                <div class="category-progress-fill" style="width: ${rate}%;"></div>
              </div>
            </div>
          `;
        });
        categoryList.innerHTML = html;
      }
    }

    // Recent Attempts Table
    const tbody = document.getElementById('recentAttemptsBody');
    if (tbody) {
      const attempts = stats.recentAttempts || [];
      if (attempts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No practice attempts recorded yet. Start practicing in the Q-Bank!</td></tr>`;
      } else {
        tbody.innerHTML = attempts.map(att => {
          const dateStr = att.attemptedAt ? new Date(att.attemptedAt).toLocaleString() : 'Recent';
          const isCor = att.isCorrect;
          const statusBadge = isCor
            ? `<span class="badge-status approved">✅ Correct</span>`
            : `<span class="badge-status rejected">❌ Incorrect</span>`;
          const catLabel = formatCategoryName(att.category || 'Clinical');
          const pearl = att.clinicalPearl || 'Review physiological principles.';

          return `
            <tr>
              <td style="white-space:nowrap;font-size:0.82rem;color:var(--text-muted);">${dateStr}</td>
              <td><span class="badge-status" style="background:#f1f5f9;color:#334155;">${escapeHtml(catLabel)}</span></td>
              <td style="max-width:320px;font-size:0.88rem;">${escapeHtml(att.statementSnippet || 'Practice item')}</td>
              <td>${statusBadge}</td>
              <td style="max-width:300px;font-size:0.84rem;color:#0369a1;font-style:italic;">"${escapeHtml(pearl)}"</td>
            </tr>
          `;
        }).join('');
      }
    }
  }

  // ── RENDER ALL STATUS & SUBSCRIPTIONS ──
  function renderSubscriptions(qbankSub, enrollments) {
    // Q-Bank Card
    const statusPill = document.getElementById('qbankStatusPill');
    const planNameEl = document.getElementById('qbankPlanName');
    const durationEl = document.getElementById('qbankDuration');
    const countdownEl = document.getElementById('qbankCountdown');
    const expiresAtEl = document.getElementById('qbankExpiresAt');
    const notesBox = document.getElementById('qbankNotesBox');
    const notesText = document.getElementById('qbankNotesText');
    const actionBtn = document.getElementById('qbankActionBtn');

    if (qbankSub) {
      const status = (qbankSub.status || 'pending').toLowerCase();
      if (statusPill) {
        statusPill.className = `sub-status-pill ${status}`;
        statusPill.textContent = status.toUpperCase();
      }

      if (planNameEl) planNameEl.textContent = qbankSub.planName || 'Standard Pass';
      if (durationEl) durationEl.textContent = `${qbankSub.durationDays || 30} Days Pass`;

      if (status === 'approved' || status === 'active') {
        const days = qbankSub.daysRemaining ?? qbankSub.durationDays ?? 0;
        if (countdownEl) {
          countdownEl.textContent = `${days} Day${days === 1 ? '' : 's'} Remaining`;
          countdownEl.style.color = days <= 5 ? '#ef4444' : '#0284c7';
        }
        if (actionBtn) {
          actionBtn.textContent = 'Extend / Renew Q-Bank Pass';
          actionBtn.href = 'qbank.html#plans';
        }
      } else if (status === 'pending') {
        if (countdownEl) countdownEl.textContent = 'Pending Admin Review';
        if (actionBtn) {
          actionBtn.textContent = 'View Q-Bank Plans';
          actionBtn.href = 'qbank.html#plans';
        }
      } else {
        if (countdownEl) countdownEl.textContent = 'Expired / Inactive';
        if (actionBtn) {
          actionBtn.textContent = 'Renew Q-Bank Access';
          actionBtn.href = 'qbank.html#plans';
        }
      }

      if (expiresAtEl) {
        expiresAtEl.textContent = qbankSub.expiresAt ? new Date(qbankSub.expiresAt).toLocaleDateString() : 'N/A';
      }

      if (qbankSub.notes && notesBox && notesText) {
        notesText.textContent = qbankSub.notes;
        notesBox.style.display = 'block';
      } else if (notesBox) {
        notesBox.style.display = 'none';
      }
    } else {
      if (statusPill) {
        statusPill.className = 'sub-status-pill expired';
        statusPill.textContent = 'NOT SUBSCRIBED';
      }
      if (planNameEl) planNameEl.textContent = 'None';
      if (durationEl) durationEl.textContent = '0 Days';
      if (countdownEl) countdownEl.textContent = 'No active access';
      if (expiresAtEl) expiresAtEl.textContent = 'None';
      if (notesBox) notesBox.style.display = 'none';
    }

    // Course Enrollments Table
    const cBody = document.getElementById('courseEnrollmentsBody');
    if (cBody) {
      if (!enrollments || enrollments.length === 0) {
        cBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No course enrollments found. Explore our NCLEX & SNLE preparation courses!</td></tr>`;
      } else {
        cBody.innerHTML = enrollments.map(en => {
          const c = en.course || {};
          const status = (en.status || 'pending').toLowerCase();
          const statusBadge = `<span class="badge-status ${status}">${status}</span>`;
          const dateStr = en.enrolledAt ? new Date(en.enrolledAt).toLocaleDateString() : 'Enrolled';
          const notes = en.notes ? escapeHtml(en.notes) : '<span class="text-muted">—</span>';
          const actionHtml = status === 'approved'
            ? `<a href="course-detail.html?id=${en.courseId}" class="btn btn-sm btn-primary">Go to Class →</a>`
            : `<a href="https://wa.me/923081077983?text=Assalam-o-Alaikum%2C%20checking%20status%20for%20course%20enrollment%20%23${en.id}" target="_blank" class="btn btn-sm btn-outline">Check Status</a>`;

          return `
            <tr>
              <td>
                <strong>${escapeHtml(c.title || 'Nursing Prep Course')}</strong>
              </td>
              <td><span class="badge-status" style="background:#f1f5f9;color:#334155;">${escapeHtml((c.category || 'NCLEX').toUpperCase())}</span></td>
              <td>${statusBadge}</td>
              <td>${dateStr}</td>
              <td style="font-size:0.85rem;">${notes}</td>
              <td>${actionHtml}</td>
            </tr>
          `;
        }).join('');
      }
    }
  }

  // ── NOTIFICATIONS SYSTEM ──
  async function loadNotifications() {
    const listEl = document.getElementById('notificationsList');
    if (!listEl) return;

    try {
      const res = await fetch('/api/student/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (!data.success) {
        listEl.innerHTML = `<p class="loading-text text-danger">Failed to load notifications.</p>`;
        return;
      }

      updateNotifBadge(data.unreadCount);

      const notifs = data.notifications || [];
      if (notifs.length === 0) {
        listEl.innerHTML = `
          <div class="text-center py-4 text-muted">
            <p style="font-size:1.75rem;margin-bottom:0.5rem">📭</p>
            <p>You have no notifications right now.</p>
          </div>
        `;
        return;
      }

      listEl.innerHTML = notifs.map(n => {
        const isUnread = !n.isRead;
        const timeStr = n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Recently';
        let icon = '📢';
        if (n.type.includes('course')) icon = '📚';
        else if (n.type.includes('sub')) icon = '🔐';
        else if (n.type.includes('sec')) icon = '🛡️';

        const linkHtml = n.link ? `<a href="${n.link}" class="notif-link-btn">Open Page →</a>` : '';
        const markBtn = isUnread ? `<button class="notif-read-btn mark-single-read" data-id="${n.id}">Mark as read</button>` : '';

        return `
          <div class="notif-card ${isUnread ? 'unread' : ''}" id="notif-item-${n.id}">
            <div class="notif-icon">${icon}</div>
            <div class="notif-body">
              <div class="notif-meta-head">
                <h4 class="notif-title">${escapeHtml(n.title)}</h4>
                <span class="notif-time">${timeStr}</span>
              </div>
              <p class="notif-message">${escapeHtml(n.message)}</p>
              <div class="notif-actions">
                ${linkHtml}
                ${markBtn}
              </div>
            </div>
          </div>
        `;
      }).join('');

      // Wire up single mark as read
      document.querySelectorAll('.mark-single-read').forEach(btn => {
        btn.addEventListener('click', async () => {
          const nId = btn.dataset.id;
          try {
            const mRes = await fetch(`/api/student/notifications/${nId}/read`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const mData = await mRes.json();
            if (mData.success) {
              const card = document.getElementById(`notif-item-${nId}`);
              if (card) {
                card.classList.remove('unread');
                btn.remove();
              }
              updateNotifBadge(mData.unreadCount);
            }
          } catch (err) {
            console.error('Failed to mark notification read:', err);
          }
        });
      });

    } catch (err) {
      console.error('Error fetching notifications:', err);
      listEl.innerHTML = `<p class="loading-text text-danger">Connection error loading notifications.</p>`;
    }
  }

  function updateNotifBadge(count) {
    const tabBadge = document.getElementById('tabNotifBadge');
    if (tabBadge) {
      if (count > 0) {
        tabBadge.textContent = count;
        tabBadge.style.display = 'inline-block';
      } else {
        tabBadge.style.display = 'none';
      }
    }

    // Main nav badges
    document.querySelectorAll('.nav-notif-badge').forEach(b => {
      if (count > 0) {
        b.textContent = count;
        b.style.display = 'inline-block';
      } else {
        b.style.display = 'none';
      }
    });
  }

  // Mark all as read button
  const markAllBtn = document.getElementById('markAllReadBtn');
  if (markAllBtn) {
    markAllBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/student/notifications/read-all', {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          if (typeof showToast === 'function') showToast(data.message, 'success');
          loadNotifications();
        }
      } catch (err) {
        console.error('Error marking all notifications read:', err);
      }
    });
  }

  // ── SETTINGS FORMS ──
  function populateSettingsForm(user) {
    if (!user) return;
    const fName = document.getElementById('inputFirstName');
    const lName = document.getElementById('inputLastName');
    const email = document.getElementById('inputEmail');
    const phone = document.getElementById('inputPhone');
    const exam = document.getElementById('selectExamType');

    if (fName) fName.value = user.firstName || '';
    if (lName) lName.value = user.lastName || '';
    if (email) email.value = user.email || '';
    if (phone) phone.value = user.phone || '';
    if (exam && user.examType) exam.value = user.examType;
  }

  // Save profile info
  const profileForm = document.getElementById('profileInfoForm');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('saveProfileBtn');
      const firstName = document.getElementById('inputFirstName').value.trim();
      const lastName = document.getElementById('inputLastName').value.trim();
      const phone = document.getElementById('inputPhone').value.trim();
      const examType = document.getElementById('selectExamType').value;

      try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        const res = await fetch('/api/student/profile', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ firstName, lastName, phone, examType })
        });

        const data = await res.json();
        if (data.success) {
          if (typeof showToast === 'function') showToast('Profile updated successfully!', 'success');
          // Update stored user
          if (currentUser) {
            currentUser.firstName = firstName;
            currentUser.lastName = lastName;
            currentUser.phone = phone;
            currentUser.examType = examType;
            localStorage.setItem('nclex_user', JSON.stringify(currentUser));
          }
          loadProfile();
        } else {
          if (typeof showToast === 'function') showToast(data.message || 'Failed to update profile.', 'error');
        }
      } catch (err) {
        console.error('Profile update failed:', err);
        if (typeof showToast === 'function') showToast('Error updating profile.', 'error');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Profile Changes';
      }
    });
  }

  // Change password form
  const passForm = document.getElementById('changePasswordForm');
  if (passForm) {
    passForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const curPass = document.getElementById('inputCurrentPass').value;
      const newPass = document.getElementById('inputNewPass').value;
      const confPass = document.getElementById('inputConfirmPass').value;
      const saveBtn = document.getElementById('savePasswordBtn');

      if (newPass !== confPass) {
        if (typeof showToast === 'function') showToast('New passwords do not match!', 'error');
        return;
      }

      try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Updating...';

        const res = await fetch('/api/student/change-password', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ currentPassword: curPass, newPassword: newPass })
        });

        const data = await res.json();
        if (data.success) {
          if (typeof showToast === 'function') showToast(data.message, 'success');
          passForm.reset();
        } else {
          if (typeof showToast === 'function') showToast(data.message || 'Failed to change password.', 'error');
        }
      } catch (err) {
        console.error('Password change error:', err);
        if (typeof showToast === 'function') showToast('Error changing password.', 'error');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Update Password';
      }
    });
  }

  // Refresh scores button
  const refreshScoresBtn = document.getElementById('refreshScoresBtn');
  if (refreshScoresBtn) {
    refreshScoresBtn.addEventListener('click', () => {
      loadProfile();
      if (typeof showToast === 'function') showToast('Scores refreshed!', 'info');
    });
  }

  // Initial load
  loadProfile();

  // ── HELPER FUNCTIONS ──
  function formatCategoryName(slug) {
    const map = {
      'management-of-care': 'Management of Care',
      'safety-and-infection-control': 'Safety & Infection Control',
      'health-promotion-and-maintenance': 'Health Promotion & Maintenance',
      'psychosocial-integrity': 'Psychosocial Integrity',
      'basic-care-and-comfort': 'Basic Care & Comfort',
      'pharmacological-and-parenteral-therapies': 'Pharmacological & Parenteral Therapies',
      'reduction-of-risk-potential': 'Reduction of Risk Potential',
      'physiological-adaptation': 'Physiological Adaptation',
      'all': 'All Categories'
    };
    return map[slug] || slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
