/* main.js — Simple NCLEX Platform */

(function () {

  // ── TOAST NOTIFICATIONS ───────────────────────────────────────────────────
  function showToast(message, type = 'info', duration = 3500) {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = '';
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
  }

  // ── AUTH STATE / NAVBAR INTEGRATION ───────────────────────────────────────
  function getSession() {
    const token = localStorage.getItem('nclex_token');
    const userJson = localStorage.getItem('nclex_user');
    let user = null;
    if (userJson) {
      try {
        user = JSON.parse(userJson);
      } catch (_) {
        user = null;
      }
    }
    return { token, user };
  }

  function updateNavAuth() {
    const desktopActions = document.querySelector('.fame-navbar-inner > .fame-nav-actions');
    const navMenu = document.getElementById('navMenu');

    // Create or locate the mobile auth item inside #navMenu
    let mobileAuthLi = document.getElementById('mobileNavAuth');
    if (navMenu && !mobileAuthLi) {
      mobileAuthLi = document.createElement('li');
      mobileAuthLi.id = 'mobileNavAuth';
      mobileAuthLi.className = 'fame-nav-item fame-mobile-nav-auth';
      navMenu.appendChild(mobileAuthLi);
    }

    const { token, user } = getSession();

    if (token && user) {
      const isAdmin = user.role === 'admin';
      const desktopHtml = `
        ${isAdmin ? `<a href="admin.html" class="fame-auth-btn" style="background:#0284c7;color:#fff;padding:0.4rem 0.95rem;font-size:0.85rem;display:inline-flex;align-items:center;gap:0.4rem;font-weight:700;border-radius:8px;box-shadow:0 2px 8px rgba(2,132,199,0.35);">⚡ Admin Panel</a>` : ''}
        <div class="nav-user-pill" title="${user.email}">
          <span>${isAdmin ? '👑' : '🩺'}</span>
          <span>Hi, ${user.firstName || 'User'}</span>
        </div>
        <button class="fame-auth-btn fame-auth-btn--login logout-trigger" style="padding:0.4rem 0.9rem;font-size:0.85rem">Log Out</button>
      `;

      const mobileHtml = `
        ${isAdmin ? `<a href="admin.html" class="fame-auth-btn" style="background:#0284c7;color:#fff;font-weight:700;border-radius:8px;box-shadow:0 2px 8px rgba(2,132,199,0.35);">⚡ Admin Panel</a>` : ''}
        <div class="nav-user-pill" title="${user.email}">
          <span>${isAdmin ? '👑' : '🩺'}</span>
          <span>Hi, ${user.firstName || 'User'}</span>
        </div>
        <button class="fame-auth-btn fame-auth-btn--login logout-trigger">Log Out</button>
      `;

      if (desktopActions) desktopActions.innerHTML = desktopHtml;
      if (mobileAuthLi) mobileAuthLi.innerHTML = mobileHtml;

      document.querySelectorAll('.logout-trigger').forEach(btn => {
        btn.addEventListener('click', () => {
          localStorage.removeItem('nclex_token');
          localStorage.removeItem('nclex_user');
          showToast('You have been logged out.', 'info');
          setTimeout(() => {
            window.location.reload();
          }, 500);
        });
      });
    } else {
      const authHtml = `
        <a href="login.html" class="fame-auth-btn fame-auth-btn--login">Login</a>
        <a href="register.html" class="fame-auth-btn fame-auth-btn--register">Register</a>
      `;
      if (desktopActions) desktopActions.innerHTML = authHtml;
      if (mobileAuthLi) mobileAuthLi.innerHTML = authHtml;
    }
  }

  // ── HAMBURGER MENU ────────────────────────────────────────────────────────
  function setupHamburger() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    if (!hamburger || !navMenu) return;

    hamburger.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
        navMenu.classList.remove('active');
      }
    });

    // Close when clicking nav links
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
      });
    });
  }

  // ── INTERACTIVE FAQ TABS ──────────────────────────────────────────────────
  function setupFaqTabs() {
    const tabBtns = document.querySelectorAll('.fame-faq-tab-btn');
    const panels = document.querySelectorAll('.fame-faq-panel');
    if (!tabBtns.length || !panels.length) return;

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const index = btn.dataset.faqIndex;

        tabBtns.forEach(b => b.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const targetPanel = document.getElementById(`faq-panel-${index}`);
        if (targetPanel) {
          targetPanel.classList.add('active');
        }
      });
    });
  }

  // ── FREE DEMO MCQS DATA & LOGIC ──────────────────────────────────────────
  const DEMO_MCQS = [
    {
      id: 1,
      category: 'NCLEX-RN • Pharmacology & Client Needs',
      difficulty: 'High Yield',
      clientNeed: 'Physiological Adaptation — Pharmacological & Parenteral Therapies',
      statement: 'A client with acute pulmonary embolism is receiving a continuous intravenous heparin infusion. The nurse notes active bleeding from the client\'s intravenous insertion site, epistaxis, and microscopic hematuria. The laboratory reports an activated partial thromboplastin time (aPTT) of 135 seconds (control baseline: 30 seconds). Which prescription should the nurse anticipate administering immediately?',
      options: [
        'Vitamin K (Phytonadione)',
        'Protamine Sulfate',
        'Deferoxamine',
        'Calcium Gluconate'
      ],
      correctIndex: 1,
      description: {
        correctRationale: 'Heparin is a fast-acting parenteral anticoagulant that potentiates the action of antithrombin III, inactivating thrombin and factor Xa. The expected therapeutic aPTT target during continuous heparin therapy is 1.5 to 2.5 times the normal control baseline (typically 45 to 75 seconds). An aPTT of 135 seconds accompanied by clinical bleeding (hematuria, epistaxis) signifies severe heparin toxicity. Protamine sulfate is the specific, rapid-acting antidote that binds strongly to heparin to form an inactive, stable neutral salt complex, reversing anticoagulation within 5 minutes.',
        distractors: [
          'Option A (Vitamin K): Antidote for warfarin (Coumadin) toxicity, not heparin. Vitamin K acts through hepatic synthesis of vitamin K-dependent clotting factors (II, VII, IX, X), taking hours to days to achieve clinical effect.',
          'Option C (Deferoxamine): A chelating agent indicated for acute iron toxicity and chronic iron overload, not coagulopathies.',
          'Option D (Calcium Gluconate): The cardioprotective antagonist for severe hyperkalemia or acute magnesium toxicity; it does not reverse heparin.'
        ],
        clinicalPearl: 'NCLEX High-Yield Rule: "P" goes with "P" (Protamine for PTT/Heparin); "W" goes with "K" (Warfarin for Vitamin K/PT/INR). Therapeutic PTT is 1.5–2.5x control. Stop the heparin infusion FIRST, then notify the provider and prepare Protamine Sulfate.'
      }
    },
    {
      id: 2,
      category: 'NCLEX-RN & Prometric • Priority Triaging',
      difficulty: 'High Yield',
      clientNeed: 'Safe and Effective Care Environment — Management of Care',
      statement: 'After receiving morning shift handoff report on a busy medical-surgical unit, which client should the registered nurse assess first?',
      options: [
        'A client with chronic obstructive pulmonary disease (COPD) having an SpO2 of 89% on 2 L/min nasal cannula.',
        'A client who had a subtotal thyroidectomy 6 hours ago and reports tingling around the mouth and fingertips.',
        'A client with type 1 diabetes mellitus who has a fasting capillary blood glucose of 145 mg/dL.',
        'A client with acute pancreatitis who reports severe epigastric pain rating 8/10 radiating to the back.'
      ],
      correctIndex: 1,
      description: {
        correctRationale: 'Using the ABCs (Airway, Breathing, Circulation) and acute-over-chronic prioritization principles, the client post-thyroidectomy reporting perioral paresthesia (numbness/tingling around the mouth and fingers) is exhibiting the earliest symptoms of acute hypocalcemia (tetany), caused by accidental trauma or devascularization/removal of the parathyroid glands. Hypocalcemia causes severe neuromuscular excitability that can rapidly progress to laryngospasm, acute airway obstruction, seizures, and cardiac arrest. This client is at immediate risk for imminent airway collapse and requires urgent assessment (Chvostek\'s and Trousseau\'s signs), seizure precautions, and preparation of intravenous calcium gluconate at the bedside.',
        distractors: [
          'Option A: An SpO2 of 88%–92% is expected for chronic hypercapnic COPD clients due to hypoxic drive; this represents a stable chronic baseline.',
          'Option C: Fasting blood glucose of 145 mg/dL is mildly elevated post-stress, but does not present acute hypoglycemia or diabetic ketoacidosis.',
          'Option D: Severe epigastric pain radiating to the back is the expected hallmark presentation of acute pancreatitis. While analgesia is required, airway compromise always takes priority over expected pain.'
        ],
        clinicalPearl: 'NCLEX Priority Framework: Post-thyroidectomy emergencies are: 1) Respiratory distress/stridor (edema/hematoma), 2) Tetany/hypocalcemia (numbness/tingling around mouth within 24–48 hours). Always keep an emergency tracheostomy tray, suction, and IV Calcium Gluconate at the bedside.'
      }
    },
    {
      id: 3,
      category: 'SNLE (Saudi Licensure) • Cardiac Safety',
      difficulty: 'SCFHS High Yield',
      clientNeed: 'Physiological Adaptation — Reduction of Risk Potential',
      statement: 'A client with heart failure exacerbation is prescribed oral digoxin 0.25 mg daily and furosemide 40 mg daily. Before administering morning medications, which clinical finding requires the nurse to withhold digoxin and notify the healthcare provider immediately?',
      options: [
        'Apical pulse of 52 beats per minute and reported yellow-green halos around lights.',
        'Blood pressure of 134/82 mm Hg and trace bilateral ankle edema.',
        'Serum potassium level of 4.2 mEq/L and serum sodium of 138 mEq/L.',
        'Serum digoxin level of 1.2 ng/mL.'
      ],
      correctIndex: 0,
      description: {
        correctRationale: 'Digoxin is a cardiac glycoside with positive inotropic and negative chronotropic effects. The nurse must assess the apical pulse for 1 full minute prior to administration; digoxin is withheld if apical heart rate is less than 60 beats/min in an adult. Bradycardia (HR 52) combined with classic visual disturbances (yellow-green halos, blurred or flickering vision) and gastrointestinal complaints (anorexia, nausea) are pathognomonic signs of digitalis toxicity. Concurrent loop diuretic therapy (furosemide) increases the risk of hypokalemia, which directly potentiates digoxin binding and accelerates toxicity.',
        distractors: [
          'Option B: Blood pressure of 134/82 mm Hg and trace ankle edema are typical baseline findings for chronic heart failure clients and do not represent digoxin toxicity.',
          'Option C: Serum potassium of 4.2 mEq/L is within normal reference limits (3.5–5.0 mEq/L). Hypokalemia (<3.5) would be alarming.',
          'Option D: Therapeutic serum digoxin range is 0.8–2.0 ng/mL. A level of 1.2 ng/mL is optimal therapeutic.'
        ],
        clinicalPearl: 'NCLEX & SNLE Safety Rule: Early signs of Digoxin toxicity are GI disturbances (anorexia, nausea, vomiting), followed by neurological/visual changes (yellow-green halos). Late signs are cardiac dysrhythmias (bradycardia, heart blocks). Check apical pulse for 60 seconds; hold if < 60 bpm. Potassium and digoxin compete for the same receptor!'
      }
    },
    {
      id: 4,
      category: 'Prometric & Gulf Licensing • Emergency Nursing',
      difficulty: 'High Yield Recall',
      clientNeed: 'Health Promotion & Maintenance — Antepartum Care',
      statement: 'A client at 34 weeks gestation presents to the emergency department with sudden, severe, continuous abdominal pain and dark red vaginal bleeding. On abdominal examination, the uterus is hypertonic and board-like upon palpation. What is the priority nursing action?',
      options: [
        'Perform a sterile digital vaginal examination to assess cervical dilation and effacement.',
        'Place the client in left lateral recumbent position, apply continuous electronic fetal monitoring, and alert surgical team.',
        'Administer intravenous oxytocin to stimulate regular uterine contractions.',
        'Reassure the client and encourage ambulation around the unit to facilitate labor descent.'
      ],
      correctIndex: 1,
      description: {
        correctRationale: 'Sudden-onset intense abdominal pain, dark red vaginal bleeding, and a rigid, hypertonic ("board-like") uterus are classic symptoms of abruptio placentae (premature detachment of the placenta). This is an obstetric life-threatening emergency causing rapid fetal hypoxia and maternal hemorrhagic shock/disseminated intravascular coagulation (DIC). Immediate interventions include: 1) Placing mother in left lateral recumbent position to relieve inferior vena cava compression and maximize placental perfusion, 2) Applying continuous external fetal and uterine monitoring, 3) Establishing large-bore IV access with crystalloids/blood, and 4) Alerting surgical and neonatal teams for immediate emergency Cesarean delivery.',
        distractors: [
          'Option A: Vaginal digital examinations are STRICTLY CONTRAINDICATED in any third-trimester bleeding until placenta previa has been ruled out by ultrasound; digital examination can puncture the placenta and cause fatal hemorrhage.',
          'Option C: Oxytocin is contraindicated because the uterus is already hypertonic and contracting excessively.',
          'Option D: Ambulation delays emergency surgical intervention and worsens hemorrhagic shock.'
        ],
        clinicalPearl: 'NCLEX Comparison Pearl: Abruptio Placentae = Dark red bleeding, SEVERE constant abdominal pain, rigid board-like uterus. Placenta Previa = Bright red bleeding, PAINLESS, soft non-tender uterus. NEVER do a digital vaginal exam on third-trimester bleeding until ultrasound confirms placenta location!'
      }
    }
  ];

  async function setupDemoMcqs() {
    const navWrap = document.getElementById('mcqNavTabs');
    const container = document.getElementById('demoMcqCard');
    if (!container) return;

    let mcqsList = DEMO_MCQS;

    try {
      const res = await fetch('/api/demo-mcqs');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.mcqs) && data.mcqs.length > 0) {
          mcqsList = data.mcqs;
        }
      }
    } catch (e) {
      console.warn('Could not fetch dynamic demo MCQs, falling back to defaults:', e);
    }

    let activeIndex = 0;
    let answered = {};

    function renderNav() {
      if (!navWrap) return;
      navWrap.innerHTML = mcqsList.map((q, idx) => {
        const catLabel = q.category ? q.category.split('•')[0].trim() : `Question ${idx + 1}`;
        return `
          <button type="button" class="fame-mcq-tab-btn ${idx === activeIndex ? 'active' : ''}" data-mcq-idx="${idx}">
            <span>${idx === activeIndex ? '▶' : 'Q' + (idx + 1)}</span>
            <span>Question ${idx + 1} (${catLabel})</span>
          </button>
        `;
      }).join('');

      navWrap.querySelectorAll('.fame-mcq-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          activeIndex = parseInt(btn.dataset.mcqIdx, 10);
          renderNav();
          renderQuestion();
        });
      });
    }

    function renderQuestion() {
      if (!mcqsList[activeIndex]) return;
      const q = mcqsList[activeIndex];
      const state = answered[q.id]; // { selectedIndex, isCorrect }
      const options = Array.isArray(q.options) ? q.options : [];
      const correctIdx = q.correctIndex !== undefined ? q.correctIndex : 0;
      const desc = q.description || {};
      const rationale = desc.correctRationale || q.correctRationale || '';
      const distractors = Array.isArray(desc.distractors) ? desc.distractors : (Array.isArray(q.distractors) ? q.distractors : []);
      const pearl = desc.clinicalPearl || q.clinicalPearl || '';

      container.innerHTML = `
        <div class="fame-mcq-meta">
          <div style="display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap">
            <span class="fame-mcq-badge">${q.category || 'NCLEX Practice'}</span>
            <span class="fame-mcq-diff">⚡ ${q.difficulty || 'High Yield'}</span>
          </div>
          <span style="font-size:0.82rem;font-weight:700;color:var(--text-muted)">
            Question ${activeIndex + 1} of ${mcqsList.length}
          </span>
        </div>

        <div class="fame-mcq-statement">
          ${q.statement}
        </div>

        <div class="fame-mcq-options">
          ${options.map((opt, optIdx) => {
            const letter = String.fromCharCode(65 + optIdx);
            let optionClass = 'fame-mcq-option';
            if (state) {
              optionClass += ' disabled';
              if (optIdx === correctIdx) {
                optionClass += ' correct';
              } else if (optIdx === state.selectedIndex) {
                optionClass += ' incorrect';
              }
            }
            return `
              <div class="${optionClass}" data-opt-idx="${optIdx}">
                <div class="fame-mcq-opt-letter">${state && optIdx === correctIdx ? '✓' : (state && optIdx === state.selectedIndex ? '✕' : letter)}</div>
                <div class="fame-mcq-opt-text">${opt}</div>
              </div>
            `;
          }).join('')}
        </div>

        ${state ? `
          <div class="fame-mcq-description-box">
            <div class="fame-mcq-desc-header">
              <h4><span>📖</span> Detailed Clinical Rationale & Explanation</h4>
              <span class="fame-mcq-answer-pill">✓ Correct Answer: Option ${String.fromCharCode(65 + correctIdx)}</span>
            </div>
            <div class="fame-mcq-desc-content">
              ${rationale ? `
                <div class="fame-mcq-desc-section-title"><span>🎯</span> Correct Answer Rationale:</div>
                <p>${rationale}</p>
              ` : ''}

              ${distractors.length > 0 ? `
                <div class="fame-mcq-desc-section-title"><span>✕</span> Why Other Options Are Incorrect:</div>
                <ul>
                  ${distractors.map(d => `<li>${d}</li>`).join('')}
                </ul>
              ` : ''}

              ${pearl ? `
                <div class="fame-mcq-desc-section-title"><span>💡</span> Saunders & ATI Clinical Pearl:</div>
                <p style="background:#e0f2fe;border-left:4px solid var(--primary);padding:0.75rem 1rem;border-radius:4px;color:#0369a1;font-weight:600">
                  ${pearl}
                </p>
              ` : ''}
            </div>
          </div>
        ` : ''}

        <div class="fame-mcq-controls">
          <div>
            ${state ? `
              <button type="button" class="btn btn-secondary btn-sm" id="resetMcqBtn">
                🔄 Try Again
              </button>
            ` : `
              <span style="font-size:0.85rem;color:var(--text-muted);font-style:italic">
                👉 Click an option above to test your clinical judgment and reveal full rationales.
              </span>
            `}
          </div>
          <div>
            ${activeIndex < mcqsList.length - 1 ? `
              <button type="button" class="btn btn-primary btn-sm" id="nextMcqBtn">
                Next Question (${activeIndex + 2}/${mcqsList.length}) →
              </button>
            ` : `
              <button type="button" class="btn btn-primary btn-sm" onclick="document.querySelector('#curriculum').scrollIntoView({behavior:'smooth'})">
                Explore Full Courses & Lectures ↓
              </button>
            `}
          </div>
        </div>
      `;

      // Attach option click listeners if not yet answered
      if (!state) {
        container.querySelectorAll('.fame-mcq-option').forEach(optEl => {
          optEl.addEventListener('click', () => {
            const chosenIdx = parseInt(optEl.dataset.optIdx, 10);
            answered[q.id] = {
              selectedIndex: chosenIdx,
              isCorrect: chosenIdx === correctIdx
            };
            renderQuestion();
          });
        });
      }

      // Reset button
      const resetBtn = document.getElementById('resetMcqBtn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          delete answered[q.id];
          renderQuestion();
        });
      }

      // Next Question button
      const nextBtn = document.getElementById('nextMcqBtn');
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          if (activeIndex < mcqsList.length - 1) {
            activeIndex++;
            renderNav();
            renderQuestion();
          }
        });
      }
    }

    renderNav();
    renderQuestion();
  }

  // ── COURSE CONTENT & LECTURE VIEWER (NAVIGATES TO DEDICATED PAGE) ───────────
  function setupCourseDetailModal() {
    // Global Course Opener -> Navigates to dedicated clear page
    window.openCourseModal = function (courseId) {
      window.location.href = `course-detail.html?id=${courseId || '10'}`;
    };


    // Attach click listeners to all Course Cards and View buttons across pages -> navigates to full page!
    document.addEventListener('click', (e) => {
      const viewBtn = e.target.closest('.btn-view-course');
      if (viewBtn) {
        e.preventDefault();
        const courseId = viewBtn.dataset.courseId || viewBtn.closest('[data-course-id]')?.dataset.courseId || '10';
        window.location.href = `course-detail.html?id=${courseId}`;
        return;
      }

      // If user clicked direct enroll button on a course card
      const enrollBtn = e.target.closest('.btn-enroll');
      if (enrollBtn) {
        e.preventDefault();
        const courseId = enrollBtn.dataset.courseId;
        if (!courseId) return;
        const token = localStorage.getItem('nclex_token');
        if (!token) {
          showToast('Please create a free account or log in to enroll.', 'info');
          setTimeout(() => window.location.href = 'login.html', 1000);
          return;
        }
        if (window.openEnrollPaymentModal) {
          window.openEnrollPaymentModal(courseId, window.currentOpenCourse);
        } else {
          window.location.href = `course-detail.html?id=${courseId}`;
        }
        return;
      }

      const card = e.target.closest('.fame-course-card, .fame-featured-plan, .course-card-full');
      if (card) {
        // Do not trigger navigation if clicking an interactive element inside card (e.g. direct link or button)
        if (e.target.closest('a, button, input')) return;
        const courseId = card.dataset.courseId || card.querySelector('[data-course-id]')?.dataset.courseId || '10';
        window.location.href = `course-detail.html?id=${courseId}`;
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const card = e.target.closest('.fame-course-card, .fame-featured-plan, .course-card-full');
        if (card && e.target === card) {
          e.preventDefault();
          const courseId = card.dataset.courseId || card.querySelector('[data-course-id]')?.dataset.courseId || '10';
          window.location.href = `course-detail.html?id=${courseId}`;
        }
      }
    });
  }

  // ── ENROLLMENT PAYMENT POPUP (EASYPAISA / BANK IBAN / WHATSAPP / SCREENSHOT) ──
  function setupEnrollPaymentModal() {
    let modal = document.getElementById('enrollPaymentModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'enrollPaymentModal';
      modal.className = 'fame-modal-backdrop';
      modal.style.display = 'none';
      modal.style.zIndex = '2100';
      modal.innerHTML = `
        <div class="fame-modal-content" style="max-width:580px;box-shadow:0 25px 60px -15px rgba(0,0,0,0.3)">
          <div class="fame-modal-header" style="background:#f8fafc">
            <div style="display:flex;align-items:center;gap:0.75rem">
              <div style="font-size:1.8rem">💳</div>
              <div>
                <h3 style="font-size:1.25rem;font-weight:800;color:var(--text-title);line-height:1.2">Course Enrollment & Fee Payment</h3>
                <span style="font-size:0.82rem;color:var(--text-muted)" id="payCourseTitleSubtitle">NCLEX-RN Prep 2026</span>
              </div>
            </div>
            <button type="button" class="fame-modal-close" id="closeEnrollPaymentModalBtn" aria-label="Close">✕</button>
          </div>

          <div class="fame-modal-body" style="padding:1.5rem">
            <!-- Official Payment Accounts Box -->
            <div class="pay-details-card">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;padding-bottom:0.6rem;border-bottom:1px dashed #a7f3d0">
                <span style="font-size:0.82rem;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:#065f46">Official Payment Accounts</span>
                <span id="payCourseFeeBadge" style="background:#059669;color:#fff;font-weight:700;font-size:0.82rem;padding:0.25rem 0.65rem;border-radius:9999px">Course Fee</span>
              </div>

              <!-- Easypaisa Row -->
              <div class="pay-acc-block">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem">
                  <div>
                    <div style="font-size:0.75rem;color:#047857;font-weight:700">EASYPAISA ACCOUNT</div>
                    <div style="font-size:0.95rem;font-weight:800;color:#065f46" id="payEasypaisaTitle">Muhammad Talha Sadeeq</div>
                    <div style="font-size:1.05rem;font-weight:800;letter-spacing:0.04em;color:#0f172a;font-family:monospace" id="payEasypaisaNumber">0300-1234567</div>
                  </div>
                  <button type="button" class="pay-copy-btn" id="copyEasypaisaBtn">
                    📋 Copy Number
                  </button>
                </div>
              </div>

              <!-- Bank IBAN Row -->
              <div class="pay-acc-block" style="margin-top:0.75rem">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem">
                  <div>
                    <div style="font-size:0.75rem;color:#047857;font-weight:700">BANK TRANSFER / IBAN (<span id="payBankName">Meezan Bank</span>)</div>
                    <div style="font-size:0.95rem;font-weight:800;color:#065f46" id="payBankTitle">Muhammad Talha Sadeeq</div>
                    <div style="font-size:0.92rem;font-weight:800;letter-spacing:0.04em;color:#0f172a;font-family:monospace;word-break:break-all" id="payBankIban">PK00MEZN0000000000000000</div>
                  </div>
                  <button type="button" class="pay-copy-btn" id="copyIbanBtn">
                    📋 Copy IBAN
                  </button>
                </div>
              </div>
            </div>

            <!-- Google Meet & WhatsApp Guidance Banner -->
            <div class="pay-guidance-box">
              <div style="display:flex;gap:0.6rem">
                <span style="font-size:1.2rem">🔴</span>
                <div>
                  <strong style="display:block;margin-bottom:0.25rem">Live Classes on Google Meet & WhatsApp Community</strong>
                  <span>Transfer fee via Easypaisa or Bank IBAN, upload receipt below, and provide your WhatsApp number. Admin will confirm payment and add you to the official WhatsApp Group for <strong>Google Meet live class links</strong> and study guides.</span>
                </div>
              </div>
            </div>

            <!-- Form -->
            <form id="enrollPaymentForm">
              <input type="hidden" id="enrollCourseId" value="" />

              <!-- WhatsApp Number Input -->
              <div class="form-group" style="margin-bottom:1.15rem">
                <label style="display:block;font-weight:700;font-size:0.9rem;margin-bottom:0.35rem;color:var(--text-title)">
                  Your WhatsApp Number * <span style="font-size:0.75rem;font-weight:400;color:var(--text-muted)">(For Google Meet invites)</span>
                </label>
                <div style="position:relative">
                  <input type="text" id="enrollWhatsappInput" required placeholder="e.g. +92 308 5737093 or 03085737093" style="width:100%;padding:0.7rem 0.9rem 0.7rem 2.4rem;border:1.5px solid var(--border-color);border-radius:8px;font-size:0.92rem" />
                  <span style="position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);font-size:1.1rem">💬</span>
                </div>
                <span style="font-size:0.75rem;color:var(--text-muted);margin-top:0.25rem;display:block">
                  Admin will message you on WhatsApp with your Google Meet live class link.
                </span>
              </div>

              <!-- Payment Screenshot File Upload -->
              <div class="form-group" style="margin-bottom:1.15rem">
                <label style="display:block;font-weight:700;font-size:0.9rem;margin-bottom:0.35rem;color:var(--text-title)">
                  Upload Payment Screenshot Receipt *
                </label>
                <div class="pay-upload-dropzone" id="payDropzone">
                  <input type="file" id="enrollScreenshotFile" accept="image/*,.pdf" style="display:none" required />
                  <div id="dropzonePrompt">
                    <div style="font-size:2rem;margin-bottom:0.35rem">📸</div>
                    <strong style="color:var(--primary);font-size:0.92rem">Click to choose or drop screenshot</strong>
                    <p style="font-size:0.78rem;color:var(--text-muted);margin:0.25rem 0 0">Accepts JPG, PNG, WEBP, or PDF receipt</p>
                  </div>
                  <div id="screenshotPreviewWrap" style="display:none;margin-top:0.5rem">
                    <img id="screenshotPreviewImg" src="" alt="Receipt Preview" class="pay-screenshot-preview" />
                    <div style="font-size:0.8rem;color:#059669;font-weight:700;margin-top:0.35rem" id="screenshotFileName">Receipt selected ✓</div>
                    <button type="button" class="btn btn-sm btn-outline-secondary" id="removeScreenshotBtn" style="margin-top:0.35rem;padding:0.2rem 0.6rem;font-size:0.75rem">Change File</button>
                  </div>
                </div>
              </div>

              <!-- Transaction ID (Optional) -->
              <div class="form-group" style="margin-bottom:1.15rem">
                <label style="display:block;font-weight:700;font-size:0.9rem;margin-bottom:0.35rem;color:var(--text-title)">
                  Transaction ID / Trx ID <span style="font-size:0.75rem;font-weight:400;color:var(--text-muted)">(Optional)</span>
                </label>
                <input type="text" id="enrollTrxIdInput" placeholder="e.g. 2849182348 from Easypaisa SMS" style="width:100%;padding:0.65rem 0.85rem;border:1.5px solid var(--border-color);border-radius:8px;font-size:0.9rem" />
              </div>

              <!-- Additional Notes (Optional) -->
              <div class="form-group" style="margin-bottom:1.5rem">
                <label style="display:block;font-weight:700;font-size:0.9rem;margin-bottom:0.35rem;color:var(--text-title)">
                  Message / Notes for Instructor <span style="font-size:0.75rem;font-weight:400;color:var(--text-muted)">(Optional)</span>
                </label>
                <textarea id="enrollNotesInput" rows="2" placeholder="Any specific requirements or questions..." style="width:100%;padding:0.65rem 0.85rem;border:1.5px solid var(--border-color);border-radius:8px;font-size:0.9rem"></textarea>
              </div>

              <div style="display:flex;gap:0.75rem;justify-content:flex-end">
                <button type="button" class="btn btn-outline-secondary" id="cancelEnrollBtn" style="padding:0.7rem 1.25rem">Cancel</button>
                <button type="submit" class="btn btn-primary" id="submitEnrollBtn" style="padding:0.7rem 1.5rem;font-weight:700">
                  <span>📤 Submit Receipt & Request Approval</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // Close events
      document.getElementById('closeEnrollPaymentModalBtn')?.addEventListener('click', () => modal.style.display = 'none');
      document.getElementById('cancelEnrollBtn')?.addEventListener('click', () => modal.style.display = 'none');
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
      });

      // Copy buttons
      const copyBtnEasypaisa = document.getElementById('copyEasypaisaBtn');
      if (copyBtnEasypaisa) {
        copyBtnEasypaisa.addEventListener('click', () => {
          const num = document.getElementById('payEasypaisaNumber')?.textContent.trim();
          if (num) {
            navigator.clipboard.writeText(num).then(() => {
              copyBtnEasypaisa.textContent = '✓ Copied!';
              copyBtnEasypaisa.classList.add('copied');
              setTimeout(() => {
                copyBtnEasypaisa.textContent = '📋 Copy Number';
                copyBtnEasypaisa.classList.remove('copied');
              }, 2000);
            });
          }
        });
      }

      const copyBtnIban = document.getElementById('copyIbanBtn');
      if (copyBtnIban) {
        copyBtnIban.addEventListener('click', () => {
          const iban = document.getElementById('payBankIban')?.textContent.trim();
          if (iban) {
            navigator.clipboard.writeText(iban).then(() => {
              copyBtnIban.textContent = '✓ Copied!';
              copyBtnIban.classList.add('copied');
              setTimeout(() => {
                copyBtnIban.textContent = '📋 Copy IBAN';
                copyBtnIban.classList.remove('copied');
              }, 2000);
            });
          }
        });
      }

      // Dropzone and File Picker
      const dropzone = document.getElementById('payDropzone');
      const fileInput = document.getElementById('enrollScreenshotFile');
      const dropzonePrompt = document.getElementById('dropzonePrompt');
      const previewWrap = document.getElementById('screenshotPreviewWrap');
      const previewImg = document.getElementById('screenshotPreviewImg');
      const fileNameEl = document.getElementById('screenshotFileName');
      const removeBtn = document.getElementById('removeScreenshotBtn');

      if (dropzone && fileInput) {
        dropzone.addEventListener('click', (e) => {
          if (e.target !== removeBtn) fileInput.click();
        });

        fileInput.addEventListener('change', () => {
          const file = fileInput.files && fileInput.files[0];
          if (file) {
            fileNameEl.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;
            if (file.type.startsWith('image/')) {
              const reader = new FileReader();
              reader.onload = (re) => {
                previewImg.src = re.target.result;
                previewImg.style.display = 'block';
              };
              reader.readAsDataURL(file);
            } else {
              previewImg.style.display = 'none';
            }
            dropzonePrompt.style.display = 'none';
            previewWrap.style.display = 'block';
          }
        });

        if (removeBtn) {
          removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.value = '';
            previewWrap.style.display = 'none';
            dropzonePrompt.style.display = 'block';
          });
        }
      }

      // Form Submit
      const form = document.getElementById('enrollPaymentForm');
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const courseId = document.getElementById('enrollCourseId').value;
          if (!courseId) return;

          const token = localStorage.getItem('nclex_token');
          if (!token) {
            showToast('Please log in or register your account first.', 'error');
            setTimeout(() => window.location.href = 'login.html', 1000);
            return;
          }

          const file = fileInput.files && fileInput.files[0];
          if (!file) {
            showToast('Please select your payment screenshot receipt.', 'error');
            return;
          }

          const whatsapp = document.getElementById('enrollWhatsappInput').value.trim();
          if (!whatsapp) {
            showToast('Please enter your WhatsApp number for Google Meet class invites.', 'error');
            return;
          }

          const submitBtn = document.getElementById('submitEnrollBtn');
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span>⏳ Uploading Receipt…</span>';

          const formData = new FormData();
          formData.append('screenshot', file);
          formData.append('whatsapp_number', whatsapp);
          formData.append('transaction_id', document.getElementById('enrollTrxIdInput').value.trim());
          formData.append('notes', document.getElementById('enrollNotesInput').value.trim());

          try {
            const res = await fetch(`/api/courses/${courseId}/enroll`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`
              },
              body: formData
            });
            const data = await res.json();

            if (res.ok) {
              showToast(data.message || 'Payment receipt submitted successfully!', 'success');
              modal.style.display = 'none';

              // Update course modal UI
              const banner = document.getElementById('modalAccessBanner');
              if (banner) {
                banner.className = 'fame-access-banner pending';
                banner.innerHTML = `<span>⏳</span> <strong>Payment Receipt Submitted (Under Review)</strong> — Admin will verify your Easypaisa screenshot and add you to the WhatsApp group for Google Meet live class invites.`;
              }
              const enrollBtn = document.getElementById('modalEnrollBtn');
              if (enrollBtn) {
                enrollBtn.textContent = 'Payment Submitted (Under Review ⏳)';
                enrollBtn.disabled = true;
                enrollBtn.classList.add('btn-pending-approval');
              }
              const footerTitle = document.getElementById('modalFooterStatusTitle');
              if (footerTitle) footerTitle.textContent = 'Enrollment Under Review';
              const footerDesc = document.getElementById('modalFooterStatusDesc');
              if (footerDesc) footerDesc.textContent = 'Our administration will verify your payment receipt shortly and add your WhatsApp to the live class group.';

              if (window.syncEnrollmentStatus) window.syncEnrollmentStatus();
            } else if (res.status === 409) {
              showToast(data.message || 'Already enrolled or pending review.', 'info');
              modal.style.display = 'none';
            } else {
              showToast(data.message || 'Failed to submit payment receipt.', 'error');
            }
          } catch (err) {
            console.error('Payment upload error:', err);
            showToast('Network error while uploading payment receipt.', 'error');
          } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>📤 Submit Receipt & Request Approval</span>';
          }
        });
      }
    }

    // Global opener
    window.openEnrollPaymentModal = async function(courseId, courseObj = null) {
      const token = localStorage.getItem('nclex_token');
      if (!token) {
        showToast('Please create a free account or log in to enroll.', 'info');
        setTimeout(() => window.location.href = 'login.html', 1000);
        return;
      }

      document.getElementById('enrollCourseId').value = courseId;
      if (courseObj) {
        document.getElementById('payCourseTitleSubtitle').textContent = courseObj.title || 'Course Enrollment';
        document.getElementById('payCourseFeeBadge').textContent = courseObj.price ? `Rs. ${courseObj.price}` : 'Course Fee';
      }

      // Pre-fill user's WhatsApp number if in localStorage
      try {
        const u = JSON.parse(localStorage.getItem('nclex_user') || '{}');
        const waInput = document.getElementById('enrollWhatsappInput');
        if (waInput && !waInput.value && u.phone) waInput.value = u.phone;
      } catch (e) {}

      // Fetch latest payment settings
      try {
        const res = await fetch('/api/admin/public-settings');
        if (res.ok) {
          const d = await res.json();
          const s = d.settings || {};
          if (s.payment_easypaisa_name) {
            document.getElementById('payEasypaisaTitle').textContent = s.payment_easypaisa_name;
            document.getElementById('payBankTitle').textContent = s.payment_easypaisa_name;
          }
          if (s.payment_easypaisa_number) document.getElementById('payEasypaisaNumber').textContent = s.payment_easypaisa_number;
          if (s.payment_bank_name) document.getElementById('payBankName').textContent = s.payment_bank_name;
          if (s.payment_bank_iban) document.getElementById('payBankIban').textContent = s.payment_bank_iban;
        }
      } catch (e) {
        console.warn('Could not fetch dynamic payment settings:', e);
      }

      modal.style.display = 'flex';
    };
  }

  // ── NEWSLETTER SUBSCRIPTION FORM ──────────────────────────────────────────
  function setupNewsletter() {
    const form = document.getElementById('newsletterForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('nlName')?.value.trim();
      const email = document.getElementById('nlEmail')?.value.trim();

      if (!name || !email) {
        showToast('Please provide your name and email.', 'error');
        return;
      }

      try {
        const res = await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email })
        });
        const data = await res.json();
        showToast(data.message || 'Thank you for subscribing to Simple NCLEX Platform updates! 🎉', 'success');
        form.reset();
      } catch (err) {
        showToast('Thank you for subscribing!', 'success');
        form.reset();
      }
    });
  }

  // ── DYNAMIC PLATFORM SETTINGS & PERSONAL INFO ────────────────────────────
  async function applyDynamicSettings() {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success || !data.settings) return;
      const s = data.settings;

      // 1. Hero text & announcement (apply only to Homepage hero)
      const path = window.location.pathname;
      const isHome = path === '/' || path.endsWith('/index.html') || path === '' || path.endsWith('/index');
      if (isHome) {
        if (s.hero_headline) {
          const titleEl = document.querySelector('.fame-hero .fame-title');
          if (titleEl) titleEl.textContent = s.hero_headline;
        }
        if (s.hero_subtitle) {
          const descEl = document.querySelector('.fame-hero .fame-desc');
          if (descEl) descEl.textContent = s.hero_subtitle;
        }
        if (s.hero_announcement) {
          const eyebrowEl = document.querySelector('.fame-hero .fame-eyebrow');
          if (eyebrowEl) eyebrowEl.textContent = s.hero_announcement;
        }
      }

      // About page mission text
      if (s.about_mission) {
        const missionEl = document.querySelector('.about-mission-text');
        if (missionEl) missionEl.textContent = s.about_mission;
      }

      // 2. Instructor / Faculty profile
      if (s.instructor_name) {
        document.querySelectorAll('h3, .faculty-name').forEach(el => {
          if (el.textContent.includes('Dr. Sarah') || el.classList.contains('faculty-name')) {
            el.textContent = s.instructor_name;
          }
        });
      }
      if (s.instructor_title) {
        document.querySelectorAll('p, .faculty-title').forEach(el => {
          if (el.textContent.includes('Lead Nursing Faculty') || el.classList.contains('faculty-title')) {
            el.textContent = s.instructor_title;
          }
        });
      }
      if (s.instructor_bio) {
        document.querySelectorAll('p, .faculty-bio').forEach(el => {
          if (el.textContent.includes('Licensing success in the NCLEX') || el.classList.contains('faculty-bio')) {
            el.textContent = `"${s.instructor_bio}"`;
          }
        });
      }
      if (s.instructor_photo) {
        document.querySelectorAll('img').forEach(img => {
          if (img.alt && (img.alt.includes('Faculty') || img.alt.includes('Instructor') || img.alt.includes('Director'))) {
            img.src = s.instructor_photo;
          }
        });
      }
      if (s.instructor_experience) {
        document.querySelectorAll('strong').forEach(el => {
          if (el.nextElementSibling && el.nextElementSibling.textContent.includes('Clinical Experience')) {
            el.textContent = s.instructor_experience.split(' ')[0] || s.instructor_experience;
          }
        });
      }
      if (s.pass_rate) {
        document.querySelectorAll('.stat-number, strong').forEach(el => {
          if (el.textContent.includes('95%') || el.textContent.includes('99%') ||
              (el.nextElementSibling && el.nextElementSibling.textContent.includes('Pass Rate'))) {
            el.textContent = s.pass_rate;
          }
        });
      }

      // 3. Contact & WhatsApp details
      const waNumber = (s.contact_whatsapp || s.contact_phone || '923085737093').replace(/[^0-9]/g, '');
      const waDisplay = s.contact_phone || s.contact_whatsapp || '+92 308 5737093';
      const waMsg = encodeURIComponent('Hi, I would like to get more information about the NCLEX preparation courses.');
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const waUrl = isMobile 
        ? `https://wa.me/${waNumber}?text=${waMsg}`
        : `https://web.whatsapp.com/send?phone=${waNumber}&text=${waMsg}`;

      document.querySelectorAll('.fame-wa-float, .wa-link').forEach(a => {
        a.href = waUrl;
        a.setAttribute('data-phone', waNumber);
        const l2 = a.querySelector('.l2');
        if (l2) l2.textContent = waDisplay;
        if (a.classList.contains('wa-text')) a.textContent = waDisplay;
      });

      if (s.contact_phone) {
        document.querySelectorAll('a[href^="tel:"]').forEach(a => {
          a.href = `tel:${s.contact_phone.replace(/[^0-9+]/g, '')}`;
          a.textContent = s.contact_phone;
        });
      }
      if (s.contact_email) {
        document.querySelectorAll('a[href^="mailto:"]').forEach(a => {
          a.href = `mailto:${s.contact_email}`;
          if (a.textContent.includes('@')) a.textContent = s.contact_email;
        });
      }
      if (s.contact_address) {
        document.querySelectorAll('.contact-address-text').forEach(el => {
          el.textContent = s.contact_address;
        });
      }

      // 4. Social Media links
      if (s.social_facebook) {
        document.querySelectorAll('.social-facebook, a[title="Facebook"]').forEach(a => {
          a.href = s.social_facebook;
        });
      }
      if (s.social_youtube) {
        document.querySelectorAll('.social-youtube, a[title="YouTube"]').forEach(a => {
          a.href = s.social_youtube;
        });
      }
      if (s.social_instagram) {
        document.querySelectorAll('.social-instagram, a[title="Instagram"]').forEach(a => {
          a.href = s.social_instagram;
        });
      }
      if (s.social_linkedin) {
        document.querySelectorAll('.social-linkedin, a[title="LinkedIn"]').forEach(a => {
          a.href = s.social_linkedin;
        });
      }
    } catch (err) {
      console.warn('Could not apply dynamic settings:', err);
    }
  }

  // ── CROSS-PLATFORM WHATSAPP HANDLER ──────────────────────────────────────
  function setupWhatsApp() {
    document.addEventListener('click', (e) => {
      const waBtn = e.target.closest('.fame-wa-float, .wa-link, [href*="wa.me"], [href*="whatsapp.com"]');
      if (!waBtn) return;

      const phone = (waBtn.getAttribute('data-phone') || '923085737093').replace(/[^0-9]/g, '');
      const defaultText = waBtn.getAttribute('data-text') || 'Hi, I would like to get more information about the NCLEX preparation courses.';
      const encodedMsg = encodeURIComponent(defaultText);

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      if (isMobile) {
        // Universal wa.me link directly opens native WhatsApp app instantly on mobile
        e.preventDefault();
        window.location.href = `https://wa.me/${phone}?text=${encodedMsg}`;
      } else {
        // On desktop, open WhatsApp Web in a separate tab
        e.preventDefault();
        window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodedMsg}`, '_blank', 'noopener,noreferrer');
      }
    });
  }

  // ── INITIALIZE ON LOAD ────────────────────────────────────────────────────
  function initAll() {
    updateNavAuth();
    setupHamburger();
    setupFaqTabs();
    setupDemoMcqs();
    setupCourseDetailModal();
    setupEnrollPaymentModal();
    setupNewsletter();
    setupWhatsApp();
    applyDynamicSettings();
  }

  document.addEventListener('DOMContentLoaded', initAll);
  if (document.readyState !== 'loading') {
    initAll();
  }

  // Expose helpers globally
  window.showToast = showToast;
  window.getSession = getSession;
  window.updateNavAuth = updateNavAuth;

})();

