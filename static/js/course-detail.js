/* course-detail.js — logic for dedicated course detail page */

(function () {
  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get('id') || '10';

  let currentCourse = null;

  async function loadCourseDetail() {
    const token = localStorage.getItem('nclex_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`/api/courses/${courseId}`, { headers });
      const data = await res.json();
      if (!res.ok || !data.course) throw new Error(data.message || 'Course not found');
      currentCourse = data.course;
      renderCoursePage(data.course);
    } catch (err) {
      console.warn('Fallback loading course details for detail page:', err);
      // Fallback data if API is temporarily unreachable
      let fallback = {
        id: courseId,
        title: 'NCLEX-RN Complete Prep 2026',
        category: 'NCLEX-RN',
        durationHours: 48,
        questionsCount: 2500,
        emoji: '🏥',
        price: '15,000',
        rating: 4.9,
        studentsCount: 18240,
        description: 'Comprehensive exam preparation covering all NCSBN Client Needs categories, Saunders & ATI frameworks, and interactive Google Meet live classes.',
        curriculum: [
          {
            moduleTitle: 'Module 1: Safe and Effective Care Environment & Client Advocacy',
            lectures: [
              {
                id: 'nclex-1',
                title: 'Management of Care, Delegation & Legal Nursing Standards',
                duration: '50:00',
                notes: [
                  'The Five Rights of Delegation to UAP and LPN/LVN.',
                  'Informed consent, client rights, advance directives, and confidentiality (HIPAA).',
                  'Supervision, leadership principles, and ethical dilemmas in clinical practice.'
                ]
              },
              {
                id: 'nclex-2',
                title: 'Safety and Infection Control & Accident Prevention',
                duration: '45:00',
                notes: [
                  'Standard vs transmission-based isolation precautions (airborne, droplet, contact).',
                  'Fall prevention, surgical asepsis, and restraint usage rules.',
                  'Disaster planning and hospital triage categorizations.'
                ]
              }
            ]
          },
          {
            moduleTitle: 'Module 2: Health Promotion, Maintenance & Psychosocial Integrity',
            lectures: [
              {
                id: 'nclex-3',
                title: 'Maternal, Newborn & Pediatric Growth and Development',
                duration: '55:00',
                notes: [
                  'Antepartum, intrapartum, postpartum care and obstetrical emergencies (abruptio vs previa).',
                  'Pediatric developmental stages (Erikson, Piaget) and congenital disorders.'
                ]
              },
              {
                id: 'nclex-4',
                title: 'Psychosocial Integrity & Mental Health Nursing',
                duration: '45:00',
                notes: [
                  'Therapeutic communication techniques vs non-therapeutic responses.',
                  'Schizophrenia, bipolar disorder, depressive disorders, and crisis intervention.'
                ]
              }
            ]
          },
          {
            moduleTitle: 'Module 3: Physiological Integrity & Pharmacological Therapies',
            lectures: [
              {
                id: 'nclex-5',
                title: 'High-Yield Pharmacology & Dosage Calculations',
                duration: '60:00',
                notes: [
                  'Cardiovascular drugs, antimicrobials, insulins, psychotropics, and anticoagulants.',
                  'Adverse effects, therapeutic drug monitoring levels, and nursing precautions.',
                  'Reconstitution, drop factor, and IV flow rate dosage calculations.'
                ]
              },
              {
                id: 'nclex-6',
                title: 'Reduction of Risk Potential & Physiological Adaptation',
                duration: '55:00',
                notes: [
                  'Fluid and electrolyte imbalances (hyper/hypokalemia, hyponatremia) and ECG changes.',
                  'Acid-base balances (metabolic/respiratory acidosis and alkalosis) and ABG pearls.',
                  'Acute medical-surgical crises: shock, sepsis, DKA, PE, and stroke management.'
                ]
              }
            ]
          },
          {
            moduleTitle: 'Module 4: Next-Generation NCLEX (NGN) & Saunders Clinical Decision Making',
            lectures: [
              {
                id: 'nclex-7',
                title: 'NCSBN Clinical Judgment Measurement Model (CJMM) 6 Cognitive Steps',
                duration: '65:00',
                notes: [
                  'Recognize cues, analyze cues, prioritize hypotheses, generate solutions, take action, evaluate outcomes.',
                  'Strategies for answering Bow-Tie, Extended Multiple Response, Matrix, and Trend items.'
                ]
              },
              {
                id: 'nclex-8',
                title: 'Prioritization Frameworks (ABC, Acute vs Chronic, Maslow)',
                duration: '60:00',
                notes: [
                  'Saunders Core Rule: Never delay emergency assessment for a routine diagnostic check.',
                  'Differentiating expected vs unexpected findings in acute clinical post-op cases.'
                ]
              }
            ]
          }
        ]
      };

      const cIdStr = String(courseId);
      if (cIdStr === '11' || cIdStr.includes('snle')) {
        fallback.title = 'SNLE (Saudi Nursing Licensing Exam) Material';
        fallback.category = 'SNLE';
        fallback.durationHours = 36;
        fallback.questionsCount = 2000;
        fallback.price = '18,000';
        fallback.description = 'Targeted preparation aligned with the official Saudi Commission for Health Specialties (SCFHS) blueprint with recall question banks and adult health.';
      } else if (cIdStr === '12' || cIdStr.includes('prometric')) {
        fallback.title = 'Prometric Nursing Exam Material';
        fallback.category = 'PROMETRIC';
        fallback.durationHours = 32;
        fallback.questionsCount = 2200;
        fallback.price = '16,000';
        fallback.description = 'Unified prep package for Dubai DHA, Abu Dhabi HAAD/DoH, UAE MOH, Qatar Prometric (QCHP), and Oman OMSB nursing licensing exams with recall questions.';
      }

      currentCourse = fallback;
      renderCoursePage(fallback);
    }
  }

  function renderCoursePage(course) {
    // Header & Meta elements
    const breadcrumbTitle = document.getElementById('detailBreadcrumbTitle');
    const courseTitle = document.getElementById('detailCourseTitle');
    const courseDesc = document.getElementById('detailCourseDesc');
    const categoryBadge = document.getElementById('detailCategoryBadge');
    const ratingText = document.getElementById('detailRatingText');
    const priceText = document.getElementById('detailPriceText');
    const enrollBtn = document.getElementById('detailEnrollBtn');
    const statusBadge = document.getElementById('detailEnrollStatusBadge');

    const durationText = document.getElementById('detailDurationText');
    const questionsText = document.getElementById('detailQuestionsText');
    const overviewText = document.getElementById('detailOverviewText');
    const moduleCountBadge = document.getElementById('detailModuleCountBadge');

    if (breadcrumbTitle) breadcrumbTitle.textContent = course.title;
    if (courseTitle) courseTitle.textContent = course.title;
    if (courseDesc) courseDesc.textContent = course.description || '';
    if (categoryBadge) categoryBadge.textContent = (course.category || 'NCLEX-RN').toUpperCase();
    if (ratingText) ratingText.textContent = `⭐ ${course.rating || '4.9'} Rating (${(course.students_count || course.studentsCount || 18240).toLocaleString()} Students)`;

    if (durationText) durationText.textContent = `${course.duration_hours || course.durationHours || 48}+ Hours Live`;
    if (questionsText) questionsText.textContent = `${(course.questions_count || course.questionsCount || 2500).toLocaleString()}+ MCQs`;
    if (overviewText && course.description) {
      overviewText.textContent = `${course.description} All live classes are held daily via Google Meet with comprehensive clinical discussions, Saunders & ATI rationales, and full community support on WhatsApp.`;
    }

    if (priceText) {
      if (course.price) {
        priceText.textContent = `Rs. ${course.price.toLocaleString ? course.price.toLocaleString() : course.price}`;
      } else {
        priceText.textContent = 'Rs. 15,000';
      }
    }

    // Enrollment Status
    const isApproved = course.enrolled || course.enrollmentStatus === 'approved';
    const isPending = course.enrollmentStatus === 'pending';

    if (enrollBtn && statusBadge) {
      if (isApproved) {
        statusBadge.textContent = '✅ Enrolled (Live Classes Active)';
        statusBadge.style.background = '#d1fae5';
        statusBadge.style.color = '#065f46';
        statusBadge.style.borderColor = '#a7f3d0';

        enrollBtn.textContent = 'Enrolled ✓ (Live Classes Active)';
        enrollBtn.disabled = true;
        enrollBtn.classList.add('btn-enrolled');
      } else if (isPending) {
        statusBadge.textContent = '⏳ Payment Under Review';
        statusBadge.style.background = '#fef3c7';
        statusBadge.style.color = '#92400e';
        statusBadge.style.borderColor = '#fde68a';

        enrollBtn.textContent = 'Payment Submitted (Under Review ⏳)';
        enrollBtn.disabled = true;
        enrollBtn.classList.add('btn-pending-approval');
      } else {
        statusBadge.textContent = '🟢 Admission Open';
        statusBadge.style.background = '#ecfdf5';
        statusBadge.style.color = '#065f46';
        statusBadge.style.borderColor = '#a7f3d0';

        enrollBtn.textContent = 'Enroll & Join Live Classes →';
        enrollBtn.disabled = false;
        enrollBtn.classList.remove('btn-enrolled', 'btn-pending-approval');
      }
    }

    // Render Full Curriculum Modules
    const modules = course.curriculum || [];
    if (moduleCountBadge) {
      moduleCountBadge.textContent = `${modules.length} Core Modules`;
    }

    const modulesContainer = document.getElementById('curriculumModulesContainer');
    if (modulesContainer) {
      if (!modules.length) {
        modulesContainer.innerHTML = `
          <div style="text-align:center;padding:2rem;color:var(--text-muted)">
            Curriculum details will be provided directly in your official WhatsApp group.
          </div>
        `;
      } else {
        modulesContainer.innerHTML = modules.map((m, mIdx) => {
          const lectures = m.lectures || [];
          return `
            <div class="curriculum-module-box">
              <div class="curriculum-module-head">
                <div style="display:flex;align-items:center;gap:0.75rem">
                  <span style="display:inline-grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--primary);color:#fff;font-size:0.8rem;font-weight:800">
                    ${mIdx + 1}
                  </span>
                  <h4 style="margin:0;font-size:1.05rem;font-weight:800;color:var(--text-title)">
                    ${m.moduleTitle}
                  </h4>
                </div>
                <span style="font-size:0.78rem;font-weight:700;color:var(--text-muted);background:var(--bg-soft);padding:0.25rem 0.65rem;border-radius:9999px">
                  ${lectures.length} Clinical Sessions
                </span>
              </div>
              <ul class="curriculum-topics-list">
                ${lectures.map(lec => `
                  <li class="curriculum-topic-item">
                    <span style="color:var(--primary);font-size:1rem;line-height:1.4">📖</span>
                    <div style="flex:1">
                      <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.25rem">
                        <strong style="color:var(--text-title);font-size:0.95rem">${lec.title}</strong>
                        <span style="font-size:0.8rem;color:var(--text-muted);font-weight:600">⏱ ${lec.duration || '45:00'}</span>
                      </div>
                      ${lec.notes && lec.notes.length ? `
                        <ul style="margin:0;padding-left:1.15rem;font-size:0.84rem;color:var(--text-muted);line-height:1.6">
                          ${lec.notes.map(n => `<li>${n}</li>`).join('')}
                        </ul>
                      ` : ''}
                    </div>
                  </li>
                `).join('')}
              </ul>
            </div>
          `;
        }).join('');
      }
    }

    // Attach Enroll Button listener
    if (enrollBtn) {
      enrollBtn.onclick = (e) => {
        e.preventDefault();
        const token = localStorage.getItem('nclex_token');
        if (!token) {
          window.showToast && showToast('Please create a free account or log in to enroll.', 'info');
          setTimeout(() => window.location.href = 'login.html', 1000);
          return;
        }
        if (window.openEnrollPaymentModal) {
          window.openEnrollPaymentModal(course.id, course);
        }
      };
    }
  }

  loadCourseDetail();
})();
