/* qbank.js — Simple NCLEX Platform Interactive Question Bank */

(function () {
  'use strict';

  // API endpoints
  const API_QBANK = '/api/qbank';
  const API_SETTINGS = '/api/settings';

  // State
  let state = {
    token: localStorage.getItem('nclex_token') || '',
    user: null,
    hasAccess: false,
    status: 'unauthenticated',
    daysRemaining: 0,
    plans: [],
    questions: [],
    currentIndex: 0,
    selectedOption: null,
    answersRecord: {}, // { questionId: { selectedIndex, isCorrect, checked: true } }
    filters: {
      category: 'all',
      difficulty: 'all',
      exam_type: 'all'
    },
    selectedPlan: null,
    settings: {}
  };

  // DOM Elements
  const statusBadge = document.getElementById('qbankStatusBadge');
  const statusText = document.getElementById('qbankStatusText');
  const statusActionBtn = document.getElementById('qbankStatusActionBtn');
  const questionsCountBadge = document.getElementById('qbankQuestionsCount');

  const questionCard = document.getElementById('questionCard');
  const questionStem = document.getElementById('questionStem');
  const optionsList = document.getElementById('optionsList');
  const submitAnswerBtn = document.getElementById('submitAnswerBtn');
  const nextQuestionBtn = document.getElementById('nextQuestionBtn');
  const prevQuestionBtn = document.getElementById('prevQuestionBtn');
  const questionProgress = document.getElementById('questionProgress');
  const questionCategoryTag = document.getElementById('questionCategoryTag');
  const questionDifficultyTag = document.getElementById('questionDifficultyTag');
  const questionExamTag = document.getElementById('questionExamTag');
  const questionDemoTag = document.getElementById('questionDemoTag');
  const rationaleContainer = document.getElementById('rationaleContainer');

  const plansContainer = document.getElementById('qbankPlansContainer');
  const subscribeModal = document.getElementById('qbankSubscribeModal');
  const subscribeForm = document.getElementById('qbankSubscribeForm');
  const modalCloseBtns = document.querySelectorAll('[data-close-qbank-modal]');

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    initUserSession();
    fetchSiteSettings();
    checkSubscriptionStatus().then(() => {
      fetchPlans();
      fetchQuestions();
    });
    setupEventListeners();
  });

  function initUserSession() {
    const userStr = localStorage.getItem('nclex_user');
    if (userStr) {
      try {
        state.user = JSON.parse(userStr);
      } catch (_) {
        state.user = null;
      }
    }
  }

  async function fetchSiteSettings() {
    try {
      const res = await fetch(API_SETTINGS);
      const data = await res.json();
      if (data.success && data.settings) {
        state.settings = data.settings;
        updatePaymentDetailsInModal();
      }
    } catch (err) {
      console.warn('Failed to fetch settings:', err);
    }
  }

  async function checkSubscriptionStatus() {
    const headers = {};
    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }

    try {
      const res = await fetch(`${API_QBANK}/status`, { headers });
      const data = await res.json();
      if (data.success) {
        state.hasAccess = data.hasAccess;
        state.status = data.status;
        state.daysRemaining = data.daysRemaining || 0;
        renderStatusBar();
      }
    } catch (err) {
      console.warn('Status check failed:', err);
      renderStatusBar();
    }
  }

  function renderStatusBar() {
    if (!statusBadge || !statusText) return;

    if (state.hasAccess) {
      statusBadge.className = 'qbank-status-badge approved';
      statusBadge.innerHTML = '<span>✅</span> All-Access Active';
      statusText.innerHTML = `<strong>Subscriber Access Unlocked!</strong> You have full access to all 2,500+ NCLEX questions with rationales (${state.daysRemaining} days remaining).`;
      if (statusActionBtn) {
        statusActionBtn.textContent = 'View My Plan';
        statusActionBtn.onclick = () => {
          document.getElementById('pricingSection')?.scrollIntoView({ behavior: 'smooth' });
        };
      }
    } else if (state.status === 'pending') {
      statusBadge.className = 'qbank-status-badge pending';
      statusBadge.innerHTML = '<span>⏳</span> Subscription Pending';
      statusText.innerHTML = `<strong>Payment Under Review:</strong> Your Q-Bank subscription request is awaiting administrator confirmation. You can practice demo questions in the meantime.`;
      if (statusActionBtn) {
        statusActionBtn.textContent = 'Contact WhatsApp';
        statusActionBtn.onclick = () => {
          const phone = state.settings.contact_whatsapp || '923085737093';
          window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=Assalam-o-Alaikum!%20I%20have%20submitted%20my%20Q-Bank%20subscription%20payment%20proof.%20Please%20verify.`, '_blank');
        };
      }
    } else {
      statusBadge.className = 'qbank-status-badge demo';
      statusBadge.innerHTML = '<span>🔒</span> Free Demo Mode';
      statusText.innerHTML = `You are currently viewing <strong>Free Demo Questions</strong>. Subscribe to unlock the complete 2,500+ question clinical bank, Next-Gen cases, and rationales.`;
      if (statusActionBtn) {
        statusActionBtn.textContent = 'Unlock Full Q-Bank →';
        statusActionBtn.onclick = () => {
          document.getElementById('pricingSection')?.scrollIntoView({ behavior: 'smooth' });
        };
      }
    }
  }

  async function fetchPlans() {
    try {
      const res = await fetch(`${API_QBANK}/plans`);
      const data = await res.json();
      if (data.success) {
        state.plans = data.plans || [];
        renderPlans();
      }
    } catch (err) {
      console.error('Failed to load plans:', err);
    }
  }

  function renderPlans() {
    if (!plansContainer) return;
    if (!state.plans.length) {
      plansContainer.innerHTML = '<p class="text-center">No subscription plans available at the moment.</p>';
      return;
    }

    plansContainer.innerHTML = state.plans.map((p, idx) => {
      const isFeatured = p.badge && (p.badge.toLowerCase().includes('popular') || p.badge.toLowerCase().includes('recommended'));
      let features = [];
      try {
        features = Array.isArray(p.features) ? p.features : JSON.parse(p.features || '[]');
      } catch (_) {
        features = [];
      }

      return `
        <div class="qbank-plan-card ${isFeatured ? 'featured' : ''}">
          ${p.badge ? `<span class="qbank-plan-badge">${escapeHtml(p.badge)}</span>` : ''}
          <h3 class="qbank-plan-title">${escapeHtml(p.name)}</h3>
          <p class="qbank-plan-desc">${escapeHtml(p.description)}</p>
          <div class="qbank-plan-price-wrap">
            <span class="qbank-plan-price">Rs. ${Number(p.price).toLocaleString()}</span>
            ${p.originalPrice > p.price ? `<span class="qbank-plan-original">Rs. ${Number(p.originalPrice).toLocaleString()}</span>` : ''}
            <span class="qbank-plan-duration">Full ${p.durationDays}-Day Access</span>
          </div>
          <ul class="qbank-plan-features">
            ${features.map(f => `
              <li class="qbank-plan-feature">
                <span class="check">✓</span>
                <span>${escapeHtml(f)}</span>
              </li>
            `).join('')}
          </ul>
          <button class="qbank-btn qbank-btn-primary" style="width:100%" onclick="window.openSubscribeModal(${p.id})">
            ${state.hasAccess ? 'Extend Subscription' : 'Subscribe & Unlock Bank'}
          </button>
        </div>
      `;
    }).join('');
  }

  async function fetchQuestions() {
    const headers = {};
    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }

    const params = new URLSearchParams();
    if (state.filters.category && state.filters.category !== 'all') {
      params.append('category', state.filters.category);
    }
    if (state.filters.difficulty && state.filters.difficulty !== 'all') {
      params.append('difficulty', state.filters.difficulty);
    }
    if (state.filters.exam_type && state.filters.exam_type !== 'all') {
      params.append('exam_type', state.filters.exam_type);
    }

    try {
      const res = await fetch(`${API_QBANK}/questions?${params.toString()}`, { headers });
      const data = await res.json();
      if (data.success) {
        state.questions = data.questions || [];
        state.currentIndex = 0;
        state.answersRecord = {};
        if (questionsCountBadge) {
          questionsCountBadge.textContent = `${state.questions.length} questions available`;
        }
        renderCurrentQuestion();
        updateScoreStats();
      }
    } catch (err) {
      console.error('Failed to load questions:', err);
    }
  }

  function renderCurrentQuestion() {
    if (!state.questions.length) {
      if (questionStem) questionStem.innerHTML = '<em>No questions found for the selected filters. Please adjust your criteria.</em>';
      if (optionsList) optionsList.innerHTML = '';
      if (submitAnswerBtn) submitAnswerBtn.disabled = true;
      if (nextQuestionBtn) nextQuestionBtn.disabled = true;
      if (prevQuestionBtn) prevQuestionBtn.disabled = true;
      if (rationaleContainer) rationaleContainer.style.display = 'none';
      if (questionProgress) questionProgress.textContent = 'Question 0 of 0';
      return;
    }

    const q = state.questions[state.currentIndex];
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const currentAnswer = state.answersRecord[q.id];

    // Tags
    if (questionCategoryTag) questionCategoryTag.textContent = q.category || 'General';
    if (questionDifficultyTag) questionDifficultyTag.textContent = q.difficulty || 'High Yield';
    if (questionExamTag) questionExamTag.textContent = q.examType || 'NCLEX-RN';
    if (questionDemoTag) {
      questionDemoTag.style.display = q.isDemo ? 'inline-block' : 'none';
    }

    // Progress
    if (questionProgress) {
      questionProgress.textContent = `Question ${state.currentIndex + 1} of ${state.questions.length}`;
    }

    // Stem
    if (questionStem) {
      questionStem.textContent = q.statement;
    }

    // Options
    state.selectedOption = currentAnswer ? currentAnswer.selectedIndex : null;
    let opts = [];
    try {
      opts = Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]');
    } catch (_) {
      opts = [];
    }

    if (optionsList) {
      optionsList.innerHTML = opts.map((opt, idx) => {
        let cls = 'qbank-option-item';
        if (currentAnswer && currentAnswer.checked) {
          cls += ' locked';
          if (idx === q.correctIndex) {
            cls += ' correct';
          } else if (idx === currentAnswer.selectedIndex) {
            cls += ' incorrect';
          }
        } else if (state.selectedOption === idx) {
          cls += ' selected';
        }

        return `
          <div class="${cls}" data-index="${idx}">
            <div class="qbank-option-letter">${letters[idx] || idx + 1}</div>
            <div class="qbank-option-text">${escapeHtml(opt)}</div>
          </div>
        `;
      }).join('');

      // Add click listeners to options if not checked yet
      if (!currentAnswer || !currentAnswer.checked) {
        optionsList.querySelectorAll('.qbank-option-item').forEach(el => {
          el.addEventListener('click', () => {
            const idx = parseInt(el.dataset.index, 10);
            selectOption(idx);
          });
        });
      }
    }

    // Buttons
    if (submitAnswerBtn) {
      if (currentAnswer && currentAnswer.checked) {
        submitAnswerBtn.style.display = 'none';
      } else {
        submitAnswerBtn.style.display = 'inline-flex';
        submitAnswerBtn.disabled = (state.selectedOption === null);
      }
    }

    if (prevQuestionBtn) {
      prevQuestionBtn.disabled = (state.currentIndex === 0);
    }

    if (nextQuestionBtn) {
      nextQuestionBtn.disabled = (state.currentIndex === state.questions.length - 1);
    }

    // Rationale Box
    if (currentAnswer && currentAnswer.checked) {
      renderRationale(q, currentAnswer.isCorrect);
    } else {
      if (rationaleContainer) rationaleContainer.style.display = 'none';
    }
  }

  function selectOption(index) {
    state.selectedOption = index;
    const items = optionsList.querySelectorAll('.qbank-option-item');
    items.forEach((item, idx) => {
      item.classList.toggle('selected', idx === index);
    });
    if (submitAnswerBtn) {
      submitAnswerBtn.disabled = false;
    }
  }

  async function checkAnswer() {
    if (state.selectedOption === null) return;
    const q = state.questions[state.currentIndex];

    try {
      submitAnswerBtn.disabled = true;
      submitAnswerBtn.textContent = 'Evaluating...';

      const res = await fetch(`${API_QBANK}/check-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: q.id,
          selectedIndex: state.selectedOption
        })
      });
      const data = await res.json();
      if (data.success) {
        state.answersRecord[q.id] = {
          selectedIndex: state.selectedOption,
          isCorrect: data.isCorrect,
          checked: true
        };
        renderCurrentQuestion();
        updateScoreStats();
      }
    } catch (err) {
      console.error('Answer check failed:', err);
    } finally {
      if (submitAnswerBtn) {
        submitAnswerBtn.textContent = 'Submit Answer';
      }
    }
  }

  function renderRationale(q, isCorrect) {
    if (!rationaleContainer) return;

    let distractors = [];
    try {
      distractors = Array.isArray(q.distractors) ? q.distractors : JSON.parse(q.distractors || '[]');
    } catch (_) {
      distractors = [];
    }

    rationaleContainer.className = `qbank-rationale-box ${isCorrect ? 'correct' : 'incorrect'}`;
    rationaleContainer.style.display = 'block';

    rationaleContainer.innerHTML = `
      <div class="qbank-rationale-header">
        <span style="font-size:1.75rem">${isCorrect ? '🎉' : '❌'}</span>
        <div>
          <h3 class="qbank-rationale-title ${isCorrect ? 'correct' : 'incorrect'}">
            ${isCorrect ? 'Correct! Well Done.' : 'Incorrect Choice.'}
          </h3>
          <span style="font-size:0.85rem;color:var(--qb-text-muted)">
            Correct Answer: Option ${['A','B','C','D','E'][q.correctIndex] || q.correctIndex + 1}
          </span>
        </div>
      </div>

      <div class="qbank-rationale-section">
        <h4><span>📖</span> Saunders & ATI In-Depth Clinical Rationale</h4>
        <p>${escapeHtml(q.correctRationale)}</p>
      </div>

      ${distractors.length ? `
        <div class="qbank-rationale-section">
          <h4><span>🔍</span> Distractor Analysis (Why Other Options Are Incorrect)</h4>
          <ul class="qbank-distractors-list">
            ${distractors.map(d => `<li class="qbank-distractor-item">${escapeHtml(d)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${q.clinicalPearl ? `
        <div class="qbank-pearl-box">
          <strong>💡 High-Yield NCLEX Clinical Pearl</strong>
          <span>${escapeHtml(q.clinicalPearl)}</span>
        </div>
      ` : ''}
    `;
  }

  function updateScoreStats() {
    const attempted = Object.keys(state.answersRecord).length;
    const correct = Object.values(state.answersRecord).filter(a => a.isCorrect).length;
    const pct = attempted ? Math.round((correct / attempted) * 100) : 0;

    const attemptedEl = document.getElementById('statAttempted');
    const correctEl = document.getElementById('statCorrect');
    const accuracyEl = document.getElementById('statAccuracy');

    if (attemptedEl) attemptedEl.textContent = attempted;
    if (correctEl) correctEl.textContent = correct;
    if (accuracyEl) accuracyEl.textContent = `${pct}%`;
  }

  // ── MODAL & SUBSCRIPTION FLOW ──
  window.openSubscribeModal = function (planId) {
    if (!state.token) {
      if (confirm('Please log in or register an account first before subscribing to the Question Bank. Proceed to Login?')) {
        window.location.href = 'login.html?redirect=qbank.html';
      }
      return;
    }

    const plan = state.plans.find(p => p.id === planId) || state.plans[0];
    if (!plan) return;

    state.selectedPlan = plan;
    document.getElementById('modalPlanName').textContent = plan.name;
    document.getElementById('modalPlanDuration').textContent = `${plan.durationDays} Days Full Access`;
    document.getElementById('modalPlanPrice').textContent = `Rs. ${Number(plan.price).toLocaleString()}`;
    document.getElementById('subPlanId').value = plan.id;

    if (subscribeModal) subscribeModal.classList.add('show');
  };

  function updatePaymentDetailsInModal() {
    const s = state.settings;
    const epName = document.getElementById('payEasypaisaName');
    const epNum = document.getElementById('payEasypaisaNumber');
    const bName = document.getElementById('payBankName');
    const bIban = document.getElementById('payBankIban');

    if (epName) epName.textContent = s.payment_easypaisa_name || 'Muhammad Talha Sadeeq';
    if (epNum) epNum.textContent = s.payment_easypaisa_number || '0300-1234567';
    if (bName) bName.textContent = s.payment_bank_name || 'Meezan Bank';
    if (bIban) bIban.textContent = s.payment_bank_iban || 'PK00MEZN0000000000000000';
  }

  async function handleSubscriptionSubmit(e) {
    e.preventDefault();
    if (!state.token) {
      alert('Please log in first.');
      window.location.href = 'login.html?redirect=qbank.html';
      return;
    }

    const whatsapp = document.getElementById('subWhatsapp').value.trim();
    const screenshotFile = document.getElementById('subScreenshot').files[0];
    const notes = document.getElementById('subNotes').value.trim();
    const planId = document.getElementById('subPlanId').value;

    if (!whatsapp) {
      alert('Please provide your WhatsApp number for instant approval notifications.');
      return;
    }

    const formData = new FormData();
    formData.append('planId', planId);
    formData.append('whatsappNumber', whatsapp);
    formData.append('notes', notes);
    if (screenshotFile) {
      formData.append('screenshot', screenshotFile);
    }

    const submitBtn = document.getElementById('subSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting Proof...';

    try {
      const res = await fetch(`${API_QBANK}/subscribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Subscription failed.');

      alert('Your payment proof has been submitted! Admin will verify and activate your Q-Bank subscription shortly.');
      if (subscribeModal) subscribeModal.classList.remove('show');
      subscribeForm.reset();
      checkSubscriptionStatus();
    } catch (err) {
      alert(err.message || 'Error submitting subscription.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm & Submit Payment';
    }
  }

  function setupEventListeners() {
    // Answer button
    if (submitAnswerBtn) {
      submitAnswerBtn.addEventListener('click', checkAnswer);
    }

    // Navigation buttons
    if (nextQuestionBtn) {
      nextQuestionBtn.addEventListener('click', () => {
        if (state.currentIndex < state.questions.length - 1) {
          state.currentIndex++;
          renderCurrentQuestion();
          questionCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    if (prevQuestionBtn) {
      prevQuestionBtn.addEventListener('click', () => {
        if (state.currentIndex > 0) {
          state.currentIndex--;
          renderCurrentQuestion();
          questionCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    // Filter selects
    const catSelect = document.getElementById('filterCategory');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        state.filters.category = e.target.value;
        fetchQuestions();
      });
    }

    const diffSelect = document.getElementById('filterDifficulty');
    if (diffSelect) {
      diffSelect.addEventListener('change', (e) => {
        state.filters.difficulty = e.target.value;
        fetchQuestions();
      });
    }

    const examSelect = document.getElementById('filterExamType');
    if (examSelect) {
      examSelect.addEventListener('change', (e) => {
        state.filters.exam_type = e.target.value;
        fetchQuestions();
      });
    }

    // Form
    if (subscribeForm) {
      subscribeForm.addEventListener('submit', handleSubscriptionSubmit);
    }

    // Modal close
    modalCloseBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (subscribeModal) subscribeModal.classList.remove('show');
      });
    });

    window.addEventListener('click', (e) => {
      if (e.target === subscribeModal) {
        subscribeModal.classList.remove('show');
      }
    });
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

})();
