/* courses.js — search, filter, sort logic + live backend enrollment */

(function () {
  const grid    = document.getElementById('coursesGrid');
  const search  = document.getElementById('searchInput');
  const tabs    = document.querySelectorAll('.filter-tab');
  const sortSel = document.getElementById('sortSelect');
  if (!grid) return;

  const API = '/api';
  let activeFilter = 'all';

  // ── FILTER COURSES ────────────────────────────────────────────────────────
  function filterCourses() {
    const query = search ? search.value.toLowerCase().trim() : '';
    const cards = grid.querySelectorAll('.fame-course-card, .course-card-full');
    cards.forEach(card => {
      const text     = card.textContent.toLowerCase();
      const cats     = card.dataset.category || '';
      const matchCat = activeFilter === 'all' || cats.includes(activeFilter);
      const matchQ   = !query || text.includes(query);
      card.style.display = (matchCat && matchQ) ? '' : 'none';
    });
  }

  // ── SORT COURSES ──────────────────────────────────────────────────────────
  function sortCourses() {
    if (!sortSel) return;
    const val = sortSel.value;
    const cards = Array.from(grid.querySelectorAll('.fame-course-card, .course-card-full'));

    cards.sort((a, b) => {
      const ratingA = parseFloat(a.dataset.rating || '0');
      const ratingB = parseFloat(b.dataset.rating || '0');
      const studentsA = parseInt(a.dataset.students || '0', 10);
      const studentsB = parseInt(b.dataset.students || '0', 10);
      const idA = parseInt(a.dataset.courseId || '0', 10);
      const idB = parseInt(b.dataset.courseId || '0', 10);

      if (val === 'Highest Rated') return ratingB - ratingA;
      if (val === 'Newest') return idB - idA;
      // Default: Most Popular
      return studentsB - studentsA;
    });

    cards.forEach(card => grid.appendChild(card));
  }

  // Support URL query param e.g. courses.html?filter=snle
  const urlParams = new URLSearchParams(window.location.search);
  const initialFilter = urlParams.get('filter');
  if (initialFilter) {
    activeFilter = initialFilter;
    tabs.forEach(t => {
      t.classList.toggle('active', t.dataset.filter === initialFilter);
    });
    filterCourses();
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeFilter = tab.dataset.filter;
      filterCourses();
    });
  });

  if (search) {
    search.addEventListener('input', filterCourses);
  }

  if (sortSel) {
    sortSel.addEventListener('change', sortCourses);
  }

  // ── LIVE BACKEND ENROLLMENT SYNC ──────────────────────────────────────────
  function markButtonEnrolled(btn) {
    if (!btn) return;
    btn.textContent = 'Enrolled ✓';
    btn.disabled = true;
    btn.classList.remove('btn-accent', 'btn-purple', 'btn-primary', 'btn-pending-approval');
    btn.classList.add('btn-enrolled');
  }

  function markButtonPending(btn) {
    if (!btn) return;
    btn.textContent = 'Payment Submitted (Under Review ⏳)';
    btn.disabled = true;
    btn.classList.remove('btn-accent', 'btn-purple', 'btn-primary');
    btn.classList.add('btn-pending-approval');
    btn.title = 'Your payment screenshot receipt has been submitted and is awaiting admin verification.';
  }

  async function syncEnrollmentStatus() {
    const token = localStorage.getItem('nclex_token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`${API}/courses`, { headers });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.courses) return;

      data.courses.forEach(course => {
        const btns = document.querySelectorAll(`.btn-enroll[data-course-id="${course.id}"]`);
        if (course.enrolled || course.enrollmentStatus === 'approved') {
          btns.forEach(markButtonEnrolled);
        } else if (course.enrollmentStatus === 'pending') {
          btns.forEach(markButtonPending);
        }

        // Update cards on index.html and courses.html
        const cards = document.querySelectorAll(`.fame-course-card[data-course-id="${course.id}"], .fame-featured-plan[data-course-id="${course.id}"]`);
        cards.forEach(card => {
          const pill = card.querySelector('.fame-card-demo-pill');
          const viewBtn = card.querySelector('.btn-view-course');

          if (course.enrolled || course.enrollmentStatus === 'approved') {
            if (pill) {
              pill.innerHTML = '✅ Live Class Seat Active';
              pill.style.background = '#d1fae5';
              pill.style.color = '#065f46';
              pill.style.borderColor = '#a7f3d0';
            }
            if (viewBtn) {
              viewBtn.textContent = 'View Program Details ✓';
            }
          } else if (course.enrollmentStatus === 'pending') {
            if (pill) {
              pill.innerHTML = '⏳ Payment Under Review';
              pill.style.background = '#fef3c7';
              pill.style.color = '#92400e';
              pill.style.borderColor = '#fde68a';
            }
            if (viewBtn) {
              viewBtn.textContent = 'View Program Details (Under Review ⏳)';
            }
          }

          // Apply custom course image if updated by admin
          if (course.imageUrl) {
            const header = card.querySelector('.fame-card-header');
            if (header) {
              header.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.15), rgba(0,0,0,0.55)), url('${course.imageUrl}')`;
              header.style.backgroundSize = 'cover';
              header.style.backgroundPosition = 'center';
              const icon = header.querySelector('.fame-card-icon');
              if (icon) icon.style.display = 'none';
            }
          }
        });
      });
    } catch (err) {
      console.warn('Could not sync course enrollment status:', err);
    }
  }

  window.syncEnrollmentStatus = syncEnrollmentStatus;

  // ── HANDLE ENROLL CLICK ───────────────────────────────────────────────────
  async function handleEnrollClick(e) {
    const btn = e.target.closest('.btn-enroll');
    if (!btn) return;

    e.preventDefault();
    const courseId = btn.dataset.courseId;
    if (!courseId) return;

    if (btn.classList.contains('btn-pending-approval')) {
      window.showToast && showToast('Your payment screenshot receipt has been submitted and is currently awaiting admin verification.', 'info');
      return;
    }
    if (btn.classList.contains('btn-enrolled')) {
      window.showToast && showToast('You already have approved full access to this course.', 'success');
      return;
    }

    const token = localStorage.getItem('nclex_token');
    if (!token) {
      window.showToast && showToast('Please create a free account or log in to enroll.', 'info');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1000);
      return;
    }

    if (window.openEnrollPaymentModal) {
      window.openEnrollPaymentModal(courseId);
    } else if (window.openCourseModal) {
      window.openCourseModal(courseId);
    }
  }

  document.addEventListener('click', handleEnrollClick);
  syncEnrollmentStatus();

})();
