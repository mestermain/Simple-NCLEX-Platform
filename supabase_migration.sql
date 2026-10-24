-- Supabase PostgreSQL Migration for Simple NCLEX Platform
-- Run this in Supabase SQL Editor (Dashboard -> SQL Editor -> New Query -> Run)

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    plain_password TEXT DEFAULT '',
    exam_type TEXT,
    role TEXT NOT NULL DEFAULT 'student',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Courses Table
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    original_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    rating NUMERIC(3,2) DEFAULT 4.8,
    students_count INTEGER DEFAULT 0,
    duration_hours INTEGER DEFAULT 0,
    emoji TEXT DEFAULT '📚',
    badge_text TEXT,
    badge_style TEXT DEFAULT 'accent',
    level TEXT DEFAULT 'All Levels',
    is_featured INTEGER DEFAULT 0,
    questions_count INTEGER DEFAULT 0,
    image_url TEXT DEFAULT '',
    curriculum_data TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enrollments Table
CREATE TABLE IF NOT EXISTS enrollments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    progress INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    reviewed_at TIMESTAMPTZ,
    notes TEXT,
    whatsapp_number TEXT DEFAULT '',
    payment_screenshot TEXT DEFAULT '',
    transaction_id TEXT DEFAULT '',
    UNIQUE(user_id, course_id)
);

-- 4. Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    user_id INTEGER,
    user_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Site Settings Table
CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- 6. Demo MCQs Table
CREATE TABLE IF NOT EXISTS demo_mcqs (
    id SERIAL PRIMARY KEY,
    category TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    client_need TEXT DEFAULT '',
    statement TEXT NOT NULL,
    options_json TEXT NOT NULL,
    correct_index INTEGER NOT NULL DEFAULT 0,
    correct_rationale TEXT NOT NULL,
    distractors_json TEXT NOT NULL,
    clinical_pearl TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed users
INSERT INTO users (id, first_name, last_name, email, password_hash, exam_type, created_at, is_active, role, plain_password) VALUES (2, 'Admin', 'Director', 'admin@simplenclex.com', 'scrypt:32768:8:1$LAF86kC5z8SM0MY5$40288519b0c48bbe7cb88538c89b2e7fdd6ecdd3d703140707d11bfade3741339cb5685f7f258e909175c2cb2c6b360921d44180f2ec69df0c5570e6864b581a', 'NCLEX-RN', '2026-10-15T12:42:44.334633+00:00', 1, 'admin', 'Admin123!') ON CONFLICT DO NOTHING;
INSERT INTO users (id, first_name, last_name, email, password_hash, exam_type, created_at, is_active, role, plain_password) VALUES (8, 'Talha', 'Sadeeq', 'talhasadveeq.email@gmail.com', 'scrypt:32768:8:1$jGEAWmcq7Nkaceg1$918403803845d6108eaee68004fd26feeb8a32c47ab946bdf2b850726e1c593e02e4b31cf06e55970a45727d78501c251fa73119bd57509de48ac996f1bbf726', 'NCLEX-RN', '2026-10-18T07:50:28.303829+00:00', 1, 'student', 'TalhaPassword123') ON CONFLICT DO NOTHING;
INSERT INTO users (id, first_name, last_name, email, password_hash, exam_type, created_at, is_active, role, plain_password) VALUES (9, 'Fatima', 'Ali', 'test_student_flow@example.com', 'scrypt:32768:8:1$1ZmSk4SHL1CArCJH$e71aa284b9e9df3b03c63054efaa216b32f3718f82e3dbf6ec65fe345c5f64295f30d89b8da846a64d7dd207f3417e9399f3202ae3e7f2c6d2d6b04437a73296', 'NCLEX-RN', '2026-10-18T08:12:45.748485+00:00', 1, 'student', 'Password123!') ON CONFLICT DO NOTHING;
INSERT INTO users (id, first_name, last_name, email, password_hash, exam_type, created_at, is_active, role, plain_password) VALUES (10, 'Sarah', 'Connor', 'test_nurse_1792332472@example.com', 'scrypt:32768:8:1$NKfZmSc5OC3EgK7d$1e3970957c03985e7a53da94fa2484035ed6ad981ce3beff42a1eaa4e7f6f12bb7a2426ddb86f61e3825a0e718c9fb0685253ef9264598cebec5f8a7dad9951a', 'NCLEX-RN', '2026-10-18T14:07:52.958257+00:00', 1, 'student', 'Password123') ON CONFLICT DO NOTHING;
INSERT INTO users (id, first_name, last_name, email, password_hash, exam_type, created_at, is_active, role, plain_password) VALUES (11, 'Emma', 'Watson', 'nurse_pw_test_1792333930@example.com', 'scrypt:32768:8:1$83KUbEAAi6xvimoK$8a494e2d6d315313782caf84d20e4ee9e8e38b7005048997e02310b60ec9dc92797a924b8a3bc586010a5741352246937e66b52973ee599a62c1d7400302d2a0', 'NCLEX-RN', '2026-10-18T14:32:10.705385+00:00', 1, 'student', 'SecretNurse123!') ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE(MAX(id), 1)) FROM users;

-- Seed courses
INSERT INTO courses (id, title, description, category, price, original_price, rating, students_count, duration_hours, emoji, badge_text, badge_style, level, is_featured, questions_count, created_at, image_url, curriculum_data) VALUES (10, 'NCLEX-RN Complete Prep 2026', 'The premier NCLEX-RN preparation course covering all 8 NCSBN Client Needs categories, Saunders & ATI clinical rationales, 48 hours of HD video, and complete Next Generation NCLEX (NGN) case studies.', 'nclex-rn', 15000.0, 25000.0, 4.9, 18244, 48, '🏥', 'Global Licensure', 'accent', 'Beginner → Pro', 1, 2500, '2026-10-15T14:45:57.836606+00:00', '', '[{"moduleTitle": "Module 1: Safe and Effective Care Environment & Client Advocacy", "lectures": [{"id": "nclex-1", "title": "Management of Care, Delegation & Legal Nursing Standards", "duration": "50:00", "notes": ["The Five Rights of Delegation to UAP and LPN/LVN.", "Informed consent, client rights, advance directives, and confidentiality (HIPAA).", "Supervision, leadership principles, and ethical dilemmas in clinical practice."]}, {"id": "nclex-2", "title": "Safety and Infection Control & Accident Prevention", "duration": "45:00", "notes": ["Standard vs transmission-based isolation precautions (airborne, droplet, contact).", "Fall prevention, surgical asepsis, and restraint usage rules.", "Disaster planning, triage tags (emergent/urgent/non-urgent/expectant)."]}]}, {"moduleTitle": "Module 2: Health Promotion, Maintenance & Psychosocial Integrity", "lectures": [{"id": "nclex-3", "title": "Maternal, Newborn & Pediatric Growth and Development", "duration": "55:00", "notes": ["Antepartum, intrapartum, postpartum care and obstetrical emergencies (abruptio vs previa).", "Pediatric developmental stages (Erikson, Piaget) and congenital disorders."]}, {"id": "nclex-4", "title": "Psychosocial Integrity & Mental Health Nursing", "duration": "45:00", "notes": ["Therapeutic communication techniques vs non-therapeutic responses.", "Schizophrenia, bipolar disorder, depressive disorders, and crisis intervention."]}]}, {"moduleTitle": "Module 3: Physiological Integrity & Pharmacological Therapies", "lectures": [{"id": "nclex-5", "title": "High-Yield Pharmacology & Dosage Calculations", "duration": "60:00", "notes": ["Cardiovascular drugs, antimicrobials, insulins, psychotropics, and anticoagulants.", "Adverse effects, therapeutic drug monitoring levels, and nursing precautions.", "Reconstitution, drop factor, and IV flow rate dosage calculations."]}, {"id": "nclex-6", "title": "Reduction of Risk Potential & Physiological Adaptation", "duration": "55:00", "notes": ["Fluid and electrolyte imbalances (hyper/hypokalemia, hyponatremia) and ECG changes.", "Acid-base balances (metabolic/respiratory acidosis and alkalosis) and ABG pearls.", "Acute medical-surgical crises: shock, sepsis, DKA, PE, and stroke management."]}]}, {"moduleTitle": "Module 4: Next-Generation NCLEX (NGN) & Saunders Clinical Decision Making", "lectures": [{"id": "nclex-7", "title": "NCSBN Clinical Judgment Measurement Model (CJMM) 6 Cognitive Steps", "duration": "65:00", "notes": ["Recognize cues, analyze cues, prioritize hypotheses, generate solutions, take action, evaluate outcomes.", "Strategies for answering Bow-Tie, Extended Multiple Response, Matrix, and Trend items."]}, {"id": "nclex-8", "title": "Prioritization Frameworks (ABC, Acute vs Chronic, Maslow)", "duration": "60:00", "notes": ["Saunders Core Rule: Never delay emergency assessment for a routine diagnostic check.", "Differentiating expected vs unexpected findings in acute clinical post-op cases."]}]}]') ON CONFLICT DO NOTHING;
INSERT INTO courses (id, title, description, category, price, original_price, rating, students_count, duration_hours, emoji, badge_text, badge_style, level, is_featured, questions_count, created_at, image_url, curriculum_data) VALUES (11, 'SNLE (Saudi Nursing Licensing Exam) Material', 'Targeted preparation aligned with the official Saudi Commission for Health Specialties (SCFHS) blueprint. High-yield recall questions, adult medical-surgical, maternal-child, and critical care nursing.', 'snle', 18000.0, 30000.0, 4.9, 9850, 36, '🇸🇦', 'SCFHS Aligned', 'green', 'Beginner → Pro', 0, 2000, '2026-10-15T14:45:57.865532+00:00', '/uploads/courses/course_7f5a13cf3ebd.jpeg', '') ON CONFLICT DO NOTHING;
INSERT INTO courses (id, title, description, category, price, original_price, rating, students_count, duration_hours, emoji, badge_text, badge_style, level, is_featured, questions_count, created_at, image_url, curriculum_data) VALUES (12, 'Prometric Nursing Exam Material (DHA, MOH, Qatar, Oman)', 'Comprehensive question bank and video reviews for Gulf health authorities (Dubai DHA, Abu Dhabi HAAD/DoH, UAE MOH, Qatar Prometric QCHP, and Oman OMSB Prometric exams).', 'prometric', 16000.0, 28000.0, 4.8, 12400, 32, '🌐', 'Gulf Licensing', 'teal', 'All Levels', 0, 2200, '2026-10-15T14:45:57.894134+00:00', '', '') ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('courses', 'id'), COALESCE(MAX(id), 1)) FROM courses;

-- Seed site_settings
INSERT INTO site_settings (key, value) VALUES ('hero_headline', 'Master NCLEX-RN, SNLE & Prometric 2026') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO site_settings (key, value) VALUES ('hero_subtitle', 'Interactive live clinical sessions, Next-Gen case studies, and authentic practice questions curated by registered nurses and licensing experts.') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO site_settings (key, value) VALUES ('hero_announcement', '🎯 Next-Gen 2026 Material Now Live for NCLEX-RN, SNLE & Prometric!') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO site_settings (key, value) VALUES ('contact_email', 'talhasadeeq.email@gmail.com') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO site_settings (key, value) VALUES ('contact_phone', '+92 3369533298') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO site_settings (key, value) VALUES ('contact_whatsapp', '+92 3369533298') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO site_settings (key, value) VALUES ('contact_address', 'kumber maidan dir lower kpk') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO site_settings (key, value) VALUES ('instructor_name', 'Talha Sadeeq') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO site_settings (key, value) VALUES ('instructor_title', 'Director of Nursing Education & NCLEX / SNLE Lead Strategist') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO site_settings (key, value) VALUES ('instructor_bio', 'Over 14 years of critical care experience and nursing exam prep coaching. Guided 12,000+ candidates through NCLEX-RN, Saudi SNLE, and Gulf Prometric licensures with an authentic clinical-first approach.') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO site_settings (key, value) VALUES ('instructor_experience', '14+ Years Clinical & Prep Experience') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO site_settings (key, value) VALUES ('instructor_photo', '') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO site_settings (key, value) VALUES ('pass_rate', '99.4%') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO site_settings (key, value) VALUES ('students_helped', '12,500+') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO site_settings (key, value) VALUES ('active_mentors', '50+') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO site_settings (key, value) VALUES ('about_mission', 'Empowering nursing professionals worldwide to conquer NCLEX-RN, SNLE, and Prometric licensing exams with clarity, confidence, and clinical mastery.') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO site_settings (key, value) VALUES ('social_facebook', 'https://www.facebook.com/share/1diP5AnmkS/') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO site_settings (key, value) VALUES ('social_youtube', 'https://youtube.com/@famelectures') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO site_settings (key, value) VALUES ('social_instagram', 'https://www.instagram.com/firstaidmadeeasy_/') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO site_settings (key, value) VALUES ('social_linkedin', 'https://www.linkedin.com/in/talha-sadeeq/') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO site_settings (key, value) VALUES ('payment_easypaisa_name', 'Muhammad Talha Sadeeq') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO site_settings (key, value) VALUES ('payment_easypaisa_number', '0308-5737093') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO site_settings (key, value) VALUES ('payment_bank_name', 'Meezan Bank Islamic') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO site_settings (key, value) VALUES ('payment_bank_iban', 'PK42MEZN0001020304050607') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO site_settings (key, value) VALUES ('payment_whatsapp_group_link', 'https://chat.whatsapp.com/NCLEX-Live-Classes-2026') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO site_settings (key, value) VALUES ('payment_instructions', 'Transfer course fee via Easypaisa or Bank IBAN, upload payment screenshot receipt with your WhatsApp number. Admin will confirm and add you to WhatsApp Group for Google Meet live classes.') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
-- Seed demo_mcqs
INSERT INTO demo_mcqs (id, category, difficulty, client_need, statement, options_json, correct_index, correct_rationale, distractors_json, clinical_pearl, sort_order, created_at) VALUES (1, 'NCLEX-RN • Pharmacology & Client Needs', 'High Yield', 'Physiological Adaptation — Pharmacological & Parenteral Therapies', 'A client with acute pulmonary embolism is receiving a continuous intravenous heparin infusion. The nurse notes active bleeding from the client''s intravenous insertion site, epistaxis, and microscopic hematuria. The laboratory reports an activated partial thromboplastin time (aPTT) of 135 seconds (control baseline: 30 seconds). Which prescription should the nurse anticipate administering immediately?', '["Vitamin K (Phytonadione)", "Protamine Sulfate", "Deferoxamine", "Calcium Gluconate"]', 1, 'Heparin is a fast-acting parenteral anticoagulant that potentiates the action of antithrombin III, inactivating thrombin and factor Xa. The expected therapeutic aPTT target during continuous heparin therapy is 1.5 to 2.5 times the normal control baseline (typically 45 to 75 seconds). An aPTT of 135 seconds accompanied by clinical bleeding (hematuria, epistaxis) signifies severe heparin toxicity. Protamine sulfate is the specific, rapid-acting antidote that binds strongly to heparin to form an inactive, stable neutral salt complex, reversing anticoagulation within 5 minutes.', '["Option A (Vitamin K): Antidote for warfarin (Coumadin) toxicity, not heparin. Vitamin K acts through hepatic synthesis of vitamin K-dependent clotting factors (II, VII, IX, X), taking hours to days to achieve clinical effect.", "Option C (Deferoxamine): A chelating agent indicated for acute iron toxicity and chronic iron overload, not coagulopathies.", "Option D (Calcium Gluconate): The cardioprotective antagonist for severe hyperkalemia or acute magnesium toxicity; it does not reverse heparin."]', 'NCLEX High-Yield Rule: "P" goes with "P" (Protamine for PTT/Heparin); "W" goes with "K" (Warfarin for Vitamin K/PT/INR). Therapeutic PTT is 1.5–2.5x control. Stop the heparin infusion FIRST, then notify the provider and prepare Protamine Sulfate.', 1, '2026-10-18T07:23:44.011161+00:00') ON CONFLICT DO NOTHING;
INSERT INTO demo_mcqs (id, category, difficulty, client_need, statement, options_json, correct_index, correct_rationale, distractors_json, clinical_pearl, sort_order, created_at) VALUES (2, 'NCLEX-RN & Prometric • Priority Triaging', 'High Yield', 'Safe and Effective Care Environment — Management of Care', 'After receiving morning shift handoff report on a busy medical-surgical unit, which client should the registered nurse assess first?', '["A client with chronic obstructive pulmonary disease (COPD) having an SpO2 of 89% on 2 L/min nasal cannula.", "A client who had a subtotal thyroidectomy 6 hours ago and reports tingling around the mouth and fingertips.", "A client with type 1 diabetes mellitus who has a fasting capillary blood glucose of 145 mg/dL.", "A client with acute pancreatitis who reports severe epigastric pain rating 8/10 radiating to the back."]', 1, 'Using the ABCs (Airway, Breathing, Circulation) and acute-over-chronic prioritization principles, the client post-thyroidectomy reporting perioral paresthesia (numbness/tingling around the mouth and fingers) is exhibiting the earliest symptoms of acute hypocalcemia (tetany), caused by accidental trauma or devascularization/removal of the parathyroid glands. Hypocalcemia causes severe neuromuscular excitability that can rapidly progress to laryngospasm, acute airway obstruction, seizures, and cardiac arrest. This client is at immediate risk for imminent airway collapse and requires urgent assessment (Chvostek''s and Trousseau''s signs), seizure precautions, and preparation of intravenous calcium gluconate at the bedside.', '["Option A: An SpO2 of 88%\u201392% is expected for chronic hypercapnic COPD clients due to hypoxic drive; this represents a stable chronic baseline.", "Option C: Fasting blood glucose of 145 mg/dL is mildly elevated post-stress, but does not present acute hypoglycemia or diabetic ketoacidosis.", "Option D: Severe epigastric pain radiating to the back is the expected hallmark presentation of acute pancreatitis. While analgesia is required, airway compromise always takes priority over expected pain."]', 'NCLEX Priority Framework: Post-thyroidectomy emergencies are: 1) Respiratory distress/stridor (edema/hematoma), 2) Tetany/hypocalcemia (numbness/tingling around mouth within 24–48 hours). Always keep an emergency tracheostomy tray, suction, and IV Calcium Gluconate at the bedside.', 2, '2026-10-18T07:23:44.011161+00:00') ON CONFLICT DO NOTHING;
INSERT INTO demo_mcqs (id, category, difficulty, client_need, statement, options_json, correct_index, correct_rationale, distractors_json, clinical_pearl, sort_order, created_at) VALUES (3, 'SNLE (Saudi Licensure) • Cardiac Safety', 'SCFHS High Yield', 'Physiological Adaptation — Reduction of Risk Potential', 'A client with heart failure exacerbation is prescribed oral digoxin 0.25 mg daily and furosemide 40 mg daily. Before administering morning medications, which clinical finding requires the nurse to withhold digoxin and notify the healthcare provider immediately?', '["Apical pulse of 52 beats per minute and reported yellow-green halos around lights.", "Blood pressure of 134/82 mm Hg and trace bilateral ankle edema.", "Serum potassium level of 4.2 mEq/L and serum sodium of 138 mEq/L.", "Serum digoxin level of 1.2 ng/mL."]', 0, 'Digoxin is a cardiac glycoside with positive inotropic and negative chronotropic effects. The nurse must assess the apical pulse for 1 full minute prior to administration; digoxin is withheld if apical heart rate is less than 60 beats/min in an adult. Bradycardia (HR 52) combined with classic visual disturbances (yellow-green halos, blurred or flickering vision) and gastrointestinal complaints (anorexia, nausea) are pathognomonic signs of digitalis toxicity. Concurrent loop diuretic therapy (furosemide) increases the risk of hypokalemia, which directly potentiates digoxin binding and accelerates toxicity.', '["Option B: Blood pressure of 134/82 mm Hg and trace ankle edema are typical baseline findings for chronic heart failure clients and do not represent digoxin toxicity.", "Option C: Serum potassium of 4.2 mEq/L is within normal reference limits (3.5\u20135.0 mEq/L). Hypokalemia (<3.5) would be alarming.", "Option D: Therapeutic serum digoxin range is 0.8\u20132.0 ng/mL. A level of 1.2 ng/mL is optimal therapeutic."]', 'NCLEX & SNLE Safety Rule: Early signs of Digoxin toxicity are GI disturbances (anorexia, nausea, vomiting), followed by neurological/visual changes (yellow-green halos). Late signs are cardiac dysrhythmias (bradycardia, heart blocks). Check apical pulse for 60 seconds; hold if < 60 bpm. Potassium and digoxin compete for the same receptor!', 3, '2026-10-18T07:23:44.011161+00:00') ON CONFLICT DO NOTHING;
INSERT INTO demo_mcqs (id, category, difficulty, client_need, statement, options_json, correct_index, correct_rationale, distractors_json, clinical_pearl, sort_order, created_at) VALUES (4, 'Prometric & Gulf Licensing • Emergency Nursing', 'High Yield Recall', 'Health Promotion & Maintenance — Antepartum Care', 'A client at 34 weeks gestation presents to the emergency department with sudden, severe, continuous abdominal pain and dark red vaginal bleeding. On abdominal examination, the uterus is hypertonic and board-like upon palpation. What is the priority nursing action?', '["Perform a sterile digital vaginal examination to assess cervical dilation and effacement.", "Place the client in left lateral recumbent position, apply continuous electronic fetal monitoring, and alert surgical team.", "Administer intravenous oxytocin to stimulate regular uterine contractions.", "Reassure the client and encourage ambulation around the unit to facilitate labor descent."]', 1, 'Sudden-onset intense abdominal pain, dark red vaginal bleeding, and a rigid, hypertonic ("board-like") uterus are classic symptoms of abruptio placentae (premature detachment of the placenta). This is an obstetric life-threatening emergency causing rapid fetal hypoxia and maternal hemorrhagic shock/disseminated intravascular coagulation (DIC). Immediate interventions include: 1) Placing mother in left lateral recumbent position to relieve inferior vena cava compression and maximize placental perfusion, 2) Applying continuous external fetal and uterine monitoring, 3) Establishing large-bore IV access with crystalloids/blood, and 4) Alerting surgical and neonatal teams for immediate emergency Cesarean delivery.', '["Option A: Vaginal digital examinations are STRICTLY CONTRAINDICATED in any third-trimester bleeding until placenta previa has been ruled out by ultrasound; digital examination can puncture the placenta and cause fatal hemorrhage.", "Option C: Oxytocin is contraindicated because the uterus is already hypertonic and contracting excessively.", "Option D: Ambulation delays emergency surgical intervention and worsens hemorrhagic shock."]', 'NCLEX Comparison Pearl: Abruptio Placentae = Dark red bleeding, SEVERE constant abdominal pain, rigid board-like uterus. Placenta Previa = Bright red bleeding, PAINLESS, soft non-tender uterus. NEVER do a digital vaginal exam on third-trimester bleeding until ultrasound confirms placenta location!', 4, '2026-10-18T07:23:44.011161+00:00') ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('demo_mcqs', 'id'), COALESCE(MAX(id), 1)) FROM demo_mcqs;

-- 7. Q-Bank Questions Table
CREATE TABLE IF NOT EXISTS qbank_questions (
    id SERIAL PRIMARY KEY,
    category TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    exam_type TEXT NOT NULL DEFAULT 'NCLEX-RN',
    client_need TEXT DEFAULT '',
    statement TEXT NOT NULL,
    options_json TEXT NOT NULL,
    correct_index INTEGER NOT NULL DEFAULT 0,
    correct_rationale TEXT NOT NULL,
    distractors_json TEXT NOT NULL DEFAULT '[]',
    clinical_pearl TEXT DEFAULT '',
    is_demo INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    question_type TEXT NOT NULL DEFAULT 'single',
    correct_indices_json TEXT NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration for existing qbank_questions table
ALTER TABLE qbank_questions ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'single';
ALTER TABLE qbank_questions ADD COLUMN IF NOT EXISTS correct_indices_json TEXT DEFAULT '[]';

-- 8. Q-Bank Subscription Plans Table
CREATE TABLE IF NOT EXISTS qbank_plans (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    duration_days INTEGER NOT NULL DEFAULT 30,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    original_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    badge TEXT DEFAULT '',
    features_json TEXT NOT NULL DEFAULT '[]',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Q-Bank Subscriptions Table (Independent from Course Enrollments)
CREATE TABLE IF NOT EXISTS qbank_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES qbank_plans(id) ON DELETE SET NULL,
    plan_name TEXT NOT NULL,
    duration_days INTEGER NOT NULL DEFAULT 30,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    whatsapp_number TEXT DEFAULT '',
    payment_screenshot TEXT DEFAULT '',
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    notes TEXT DEFAULT ''
);

-- Seed Q-Bank Plans
INSERT INTO qbank_plans (id, name, description, duration_days, price, original_price, badge, features_json, is_active)
VALUES
(1, '1-Month Intensive Pass', 'Full 30-day access to all 2,500+ NCLEX & SNLE practice questions with rationales.', 30, 4999.00, 8000.00, 'Starter', '["Full 2,500+ NCLEX & SNLE Question Bank", "In-Depth Saunders & ATI Clinical Rationales", "Distractor Analysis for Every Option", "Interactive Tutor Practice Mode", "Category & Specialty Filtering"]', 1),
(2, '3-Month High-Yield Master', 'The recommended plan for comprehensive exam readiness. Includes Next-Gen cases and simulated exams.', 90, 7999.00, 14000.00, 'Most Popular', '["Complete 90-Day All-Access Question Bank", "Next-Generation NCLEX (NGN) Case Studies", "Timed Exam Mode & Mock Test Simulator", "Specialty Performance Diagnostics", "Priority WhatsApp Study Support Group", "NCLEX High-Yield Clinical Pearl Summaries"]', 1),
(3, '6-Month Complete Pass', 'Maximum flexibility and complete licensure guarantee for international and repeat test-takers.', 180, 11999.00, 22000.00, 'Best Value', '["Unlimited 180-Day Complete Q-Bank Access", "All NCLEX-RN, Next-Gen, SNLE & Prometric Tracks", "Personalized Weakness Remediation Quizzes", "Direct Faculty Mentorship on WhatsApp", "Free Content & Question Updates for 2026", "First-Time Pass Guarantee Commitment"]', 1)
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('qbank_plans', 'id'), COALESCE(MAX(id), 1)) FROM qbank_plans;

-- 10. Student Notifications Table
CREATE TABLE IF NOT EXISTS student_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'general',
    is_read INTEGER DEFAULT 0,
    link TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Student Q-Bank Practice Attempts & Scores Table
CREATE TABLE IF NOT EXISTS student_qbank_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES qbank_questions(id) ON DELETE CASCADE,
    question_type TEXT DEFAULT 'single',
    category TEXT DEFAULT '',
    difficulty TEXT DEFAULT '',
    exam_type TEXT DEFAULT 'NCLEX-RN',
    selected_indices_json TEXT DEFAULT '[]',
    is_correct INTEGER NOT NULL DEFAULT 0,
    attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safe migrations
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE qbank_subscriptions ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- ==============================================================================
-- PHASE 5: ADVANCED DATABASE MODEL MIGRATION (PostgreSQL / Supabase)
-- ==============================================================================

-- 12. Upgrade qbank_questions with Next Gen NCLEX fields
ALTER TABLE qbank_questions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'MCQ';
ALTER TABLE qbank_questions ADD COLUMN IF NOT EXISTS stem TEXT DEFAULT '';
ALTER TABLE qbank_questions ADD COLUMN IF NOT EXISTS options TEXT DEFAULT '[]';
ALTER TABLE qbank_questions ADD COLUMN IF NOT EXISTS correct_answers TEXT DEFAULT '[]';
ALTER TABLE qbank_questions ADD COLUMN IF NOT EXISTS rationale_per_option TEXT DEFAULT '[]';
ALTER TABLE qbank_questions ADD COLUMN IF NOT EXISTS body_system TEXT DEFAULT 'Comprehensive Multi-System';
ALTER TABLE qbank_questions ADD COLUMN IF NOT EXISTS client_needs_category TEXT DEFAULT '';
ALTER TABLE qbank_questions ADD COLUMN IF NOT EXISTS exam_track TEXT DEFAULT 'RN';
ALTER TABLE qbank_questions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published';
ALTER TABLE qbank_questions ADD COLUMN IF NOT EXISTS reviewer TEXT DEFAULT 'Senior NCLEX Clinical Reviewer';
ALTER TABLE qbank_questions ADD COLUMN IF NOT EXISTS case_study_data TEXT DEFAULT '';
ALTER TABLE qbank_questions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Backfill qbank_questions data
UPDATE qbank_questions SET
  stem = CASE WHEN stem IS NULL OR stem = '' THEN statement ELSE stem END,
  options = CASE WHEN options IS NULL OR options = '' OR options = '[]' THEN options_json ELSE options END,
  correct_answers = CASE 
    WHEN (correct_answers IS NULL OR correct_answers = '' OR correct_answers = '[]') AND correct_indices_json IS NOT NULL AND correct_indices_json != '[]' THEN correct_indices_json
    WHEN (correct_answers IS NULL OR correct_answers = '' OR correct_answers = '[]') THEN '[' || correct_index || ']'
    ELSE correct_answers 
  END,
  rationale_per_option = CASE WHEN rationale_per_option IS NULL OR rationale_per_option = '' OR rationale_per_option = '[]' THEN distractors_json ELSE rationale_per_option END,
  body_system = CASE WHEN body_system IS NULL OR body_system = '' OR body_system = 'General' THEN COALESCE(organ_system, 'General') ELSE body_system END,
  client_needs_category = CASE WHEN client_needs_category IS NULL OR client_needs_category = '' THEN COALESCE(client_need, category) ELSE client_needs_category END,
  exam_track = CASE 
    WHEN exam_type LIKE '%PN%' THEN 'PN'
    WHEN exam_type LIKE '%SNLE%' THEN 'SNLE'
    WHEN exam_type LIKE '%DHA%' THEN 'DHA'
    WHEN exam_type LIKE '%HAAD%' THEN 'HAAD'
    ELSE 'RN'
  END,
  status = CASE WHEN is_published = 1 THEN 'published' ELSE 'draft' END,
  type = CASE 
    WHEN question_type = 'multiple' THEN 'SATA'
    WHEN UPPER(question_type) IN ('MCQ', 'SATA', 'MATRIX', 'CLOZE', 'DRAG_DROP', 'BOWTIE', 'CASE_STUDY') THEN UPPER(question_type)
    ELSE 'MCQ'
  END;

-- Unified questions view
CREATE OR REPLACE VIEW questions AS
SELECT 
  id,
  type,
  stem,
  options,
  correct_answers,
  rationale_per_option,
  body_system,
  client_needs_category,
  difficulty,
  exam_track,
  status,
  reviewer,
  clinical_pearl,
  case_study_data,
  is_demo,
  sort_order,
  created_at,
  updated_at,
  statement,
  options_json,
  correct_index,
  correct_indices_json,
  correct_rationale,
  distractors_json,
  question_type,
  organ_system,
  is_published
FROM qbank_questions;

-- 13. Test Sessions Table
CREATE TABLE IF NOT EXISTS test_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Practice Test',
  mode TEXT NOT NULL DEFAULT 'tutor',
  exam_track TEXT NOT NULL DEFAULT 'RN',
  status TEXT NOT NULL DEFAULT 'in_progress',
  filters_json TEXT DEFAULT '{}',
  question_ids_json TEXT NOT NULL DEFAULT '[]',
  current_question_index INTEGER DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 10,
  correct_count INTEGER DEFAULT 0,
  score_percentage NUMERIC(5,2) DEFAULT 0.00,
  time_limit_seconds INTEGER DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 14. Modernized Attempts Table (supports session_id and partial-credit scoring)
CREATE TABLE IF NOT EXISTS attempts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id INTEGER REFERENCES test_sessions(id) ON DELETE SET NULL,
  question_id INTEGER NOT NULL REFERENCES qbank_questions(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL DEFAULT 'MCQ',
  user_answers TEXT NOT NULL DEFAULT '[]',
  score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  is_correct INTEGER NOT NULL DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  category TEXT DEFAULT '',
  body_system TEXT DEFAULT '',
  difficulty TEXT DEFAULT '',
  exam_track TEXT DEFAULT 'RN',
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Question Flags Table
CREATE TABLE IF NOT EXISTS flags (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES qbank_questions(id) ON DELETE CASCADE,
  reason TEXT DEFAULT 'review_later',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

-- 16. Student Question Notes Table
CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES qbank_questions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE(user_id, question_id)
);

-- 17. Flashcard Decks Table
CREATE TABLE IF NOT EXISTS flashcard_decks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'General',
  is_public INTEGER NOT NULL DEFAULT 0,
  card_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- 18. Flashcards Table (with Leitner / SM-2 spaced repetition fields)
CREATE TABLE IF NOT EXISTS flashcards (
  id SERIAL PRIMARY KEY,
  deck_id INTEGER NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES qbank_questions(id) ON DELETE SET NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  clinical_pearl TEXT DEFAULT '',
  box_level INTEGER NOT NULL DEFAULT 1,
  interval_days INTEGER NOT NULL DEFAULT 1,
  ease_factor NUMERIC(4,2) NOT NULL DEFAULT 2.50,
  repetition_count INTEGER NOT NULL DEFAULT 0,
  next_review_at TIMESTAMPTZ,
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payable_type TEXT NOT NULL,
  payable_id INTEGER NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PKR',
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  transaction_id TEXT DEFAULT '',
  receipt_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  payer_account_name TEXT DEFAULT '',
  payer_phone TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. Testimonials Table (with verified flag)
CREATE TABLE IF NOT EXISTS testimonials (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  student_name TEXT NOT NULL,
  avatar_url TEXT DEFAULT '',
  credential TEXT DEFAULT 'RN',
  exam_passed TEXT NOT NULL DEFAULT 'NCLEX-RN',
  score_or_attempt TEXT DEFAULT 'Passed 85 Questions (1st Attempt)',
  quote TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5,
  verified INTEGER NOT NULL DEFAULT 0,
  is_featured INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. FAQ Items Table
CREATE TABLE IF NOT EXISTS faq_items (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_questions_track_type ON qbank_questions(exam_track, type, status);
CREATE INDEX IF NOT EXISTS idx_attempts_user_session ON attempts(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_user_status ON test_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_review ON flashcards(user_id, next_review_at);
CREATE INDEX IF NOT EXISTS idx_testimonials_featured_verified ON testimonials(is_featured, verified);
CREATE INDEX IF NOT EXISTS idx_payments_user_status ON payments(user_id, status);



