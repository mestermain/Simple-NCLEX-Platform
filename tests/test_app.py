"""
Test suite for Simple NCLEX Platform.
Tests template rendering, static asset delivery, fallback routes, and API endpoints.
"""

import unittest
from app import create_app


class SimpleNCLEXPlatformTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.client = cls.app.test_client()

    def test_pages_render_successfully(self):
        pages = [
            '/',
            '/index.html',
            '/about',
            '/about.html',
            '/courses',
            '/courses.html',
            '/course-detail',
            '/course-detail.html',
            '/qbank',
            '/qbank.html',
            '/login',
            '/login.html',
            '/register',
            '/register.html',
            '/admin',
            '/admin.html',
        ]
        for page in pages:
            with self.subTest(page=page):
                res = self.client.get(page)
                self.assertEqual(res.status_code, 200, f"Page {page} returned {res.status_code}")
                self.assertIn(b'<!DOCTYPE html>', res.data)

    def test_static_assets_served(self):
        assets = [
            '/static/css/style.css',
            '/static/css/home.css',
            '/static/css/about.css',
            '/static/css/courses.css',
            '/static/css/qbank.css',
            '/static/css/auth.css',
            '/static/css/admin.css',
            '/static/js/main.js',
            '/static/js/courses.js',
            '/static/js/course-detail.js',
            '/static/js/qbank.js',
            '/static/js/auth.js',
            '/static/js/admin.js',
            '/static/images/logo.png',
            '/static/images/favicon.png',
            '/favicon.ico',
            '/favicon.png',
        ]
        for asset in assets:
            with self.subTest(asset=asset):
                res = self.client.get(asset)
                self.assertEqual(res.status_code, 200, f"Asset {asset} returned {res.status_code}")

    def test_legacy_root_static_fallback(self):
        legacy_assets = [
            '/style.css',
            '/main.js',
            '/logo.png',
        ]
        for asset in legacy_assets:
            with self.subTest(legacy_asset=asset):
                res = self.client.get(asset)
                self.assertEqual(res.status_code, 200, f"Legacy fallback for {asset} failed with {res.status_code}")

    def test_api_endpoints(self):
        res = self.client.get('/api/health')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'ok')

        res = self.client.get('/api/settings')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('success'))

        res = self.client.get('/api/courses')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('success'))

        res = self.client.get('/api/demo-mcqs')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('success'))
        self.assertIsInstance(data.get('mcqs'), list)
        self.assertGreaterEqual(len(data['mcqs']), 1)

    def test_course_detail_returns_comprehensive_curriculum(self):
        """Verify each course returns comprehensive curriculum modules."""
        courses_res = self.client.get('/api/courses')
        courses = courses_res.get_json()['courses']
        self.assertGreaterEqual(len(courses), 1)

        for course in courses:
            c_id = course['id']
            res = self.client.get(f'/api/courses/{c_id}')
            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            self.assertTrue(data['success'])
            curriculum = data['course']['curriculum']
            self.assertGreaterEqual(len(curriculum), 1, f"Course {c_id} should have curriculum modules")
            for module in curriculum:
                self.assertTrue(module.get('moduleTitle'))
                self.assertGreaterEqual(len(module.get('lectures', [])), 1)

    def test_admin_demo_mcqs_crud(self):
        # 1. Login as admin
        login_res = self.client.post('/api/auth/login', json={
            'email': 'admin@simplenclex.com',
            'password': 'Admin123!'
        })
        self.assertEqual(login_res.status_code, 200)
        token = login_res.get_json()['token']
        headers = {'Authorization': f'Bearer {token}'}

        # 2. List demo MCQs
        res = self.client.get('/api/admin/demo-mcqs', headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        initial_count = len(data['mcqs'])

        # 3. Create a new demo MCQ
        new_mcq = {
            'category': 'NCLEX-RN • Pharmacology Test',
            'difficulty': 'High Yield • Test',
            'clientNeed': 'Pharmacological Therapies',
            'statement': 'Which medication is an antidote for acetaminophen overdose?',
            'options': [
                'N-acetylcysteine (NAC)',
                'Flumazenil',
                'Naloxone',
                'Atropine'
            ],
            'correctIndex': 0,
            'correctRationale': 'N-acetylcysteine restores hepatic glutathione reserves.',
            'distractors': [
                'Flumazenil is for benzodiazepines.',
                'Naloxone is for opioids.',
                'Atropine is for cholinergic toxicity.'
            ],
            'clinicalPearl': 'Give NAC within 8 hours of acetaminophen ingestion for optimal hepatoprotection.'
        }
        res = self.client.post('/api/admin/demo-mcqs', headers=headers, json=new_mcq)
        self.assertEqual(res.status_code, 201)
        created = res.get_json()['mcq']
        mcq_id = created['id']
        self.assertEqual(created['statement'], new_mcq['statement'])

        # 4. Update the MCQ
        res = self.client.put(f'/api/admin/demo-mcqs/{mcq_id}', headers=headers, json={
            'statement': 'Updated: Which medication is an antidote for acetaminophen overdose?',
            'options': [
                'N-acetylcysteine (NAC)',
                'Flumazenil',
                'Naloxone',
                'Atropine'
            ],
            'correctIndex': 0,
            'correctRationale': 'Updated rationale text.'
        })
        self.assertEqual(res.status_code, 200)
        updated = res.get_json()['mcq']
        self.assertTrue(updated['statement'].startswith('Updated:'))

        # 5. Delete the MCQ
        res = self.client.delete(f'/api/admin/demo-mcqs/{mcq_id}', headers=headers)
        self.assertEqual(res.status_code, 200)

        # 6. Verify count restored
        res = self.client.get('/api/admin/demo-mcqs', headers=headers)
        self.assertEqual(len(res.get_json()['mcqs']), initial_count)

    def test_api_404_json(self):
        res = self.client.get('/api/not-a-real-endpoint')
        self.assertEqual(res.status_code, 404)
        data = res.get_json()
        self.assertEqual(data.get('success'), False)

    def test_course_detail_page_content(self):
        res = self.client.get('/course-detail.html')
        self.assertEqual(res.status_code, 200)
        html = res.data.decode('utf-8')
        self.assertIn('course-detail-layout', html)
        self.assertIn('Google Meet', html)
        self.assertIn('curriculumModulesContainer', html)
        self.assertIn('course-detail.js', html)

    def test_qbank_plans_and_questions_api(self):
        """Test public Q-Bank plans and questions APIs."""
        # 1. Fetch plans
        res = self.client.get('/api/qbank/plans')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertGreaterEqual(len(data['plans']), 3)

        # 2. Fetch questions as guest (unauthenticated)
        res = self.client.get('/api/qbank/questions')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertFalse(data['isSubscribed'])
        self.assertTrue(data['demoMode'])
        self.assertGreaterEqual(len(data['questions']), 1)
        # All returned questions must be demo items
        for q in data['questions']:
            self.assertEqual(q['isDemo'], 1)

    def test_qbank_tutor_mode_check_answer(self):
        """Test tutor mode answer checking endpoint."""
        # Get first question
        res = self.client.get('/api/qbank/questions')
        q = res.get_json()['questions'][0]

        # Submit correct answer
        res = self.client.post('/api/qbank/check-answer', json={
            'questionId': q['id'],
            'selectedIndex': q['correctIndex']
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertTrue(data['isCorrect'])
        self.assertTrue(data['correctRationale'])

        # Submit wrong answer
        wrong_idx = (q['correctIndex'] + 1) % len(q['options'])
        res = self.client.post('/api/qbank/check-answer', json={
            'questionId': q['id'],
            'selectedIndex': wrong_idx
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertFalse(data['isCorrect'])

    def test_qbank_subscription_and_course_separation(self):
        """
        Verify that Q-Bank subscription is completely independent from course enrollment.
        Course access does not grant Q-Bank access, and Q-Bank subscribers do not need course enrollment.
        """
        import uuid
        uid = uuid.uuid4().hex[:6]
        student_email = f"qbank_student_{uid}@example.com"

        # Register fresh student
        reg_res = self.client.post('/api/auth/register', json={
            'firstName': 'QBank',
            'lastName': 'Student',
            'email': student_email,
            'password': 'Password123!',
            'examType': 'NCLEX-RN'
        })
        self.assertEqual(reg_res.status_code, 201)
        token = reg_res.get_json()['token']
        headers = {'Authorization': f'Bearer {token}'}

        # Check initial Q-Bank status: unapproved / none
        status_res = self.client.get('/api/qbank/status', headers=headers)
        self.assertEqual(status_res.status_code, 200)
        self.assertFalse(status_res.get_json()['hasAccess'])

        # Subscribe to Q-Bank
        sub_res = self.client.post('/api/qbank/subscribe', headers=headers, json={
            'planId': 1,
            'whatsappNumber': '+923001234567',
            'notes': 'Test payment proof'
        })
        self.assertEqual(sub_res.status_code, 201)
        sub_data = sub_res.get_json()['subscription']
        sub_id = sub_data['id']

        # Status is pending
        status_res = self.client.get('/api/qbank/status', headers=headers)
        self.assertEqual(status_res.get_json()['status'], 'pending')
        self.assertFalse(status_res.get_json()['hasAccess'])

        # User enrolls in a course (e.g. course 10)
        course_res = self.client.post('/api/courses/10/enroll', headers=headers, json={
            'whatsappNumber': '+923001234567',
            'paymentScreenshot': '/uploads/payments/sample.jpg',
            'transactionId': 'TX123'
        })
        self.assertIn(course_res.status_code, [200, 201])

        # Login as admin to approve Q-Bank subscription ONLY
        admin_login = self.client.post('/api/auth/login', json={
            'email': 'admin@simplenclex.com',
            'password': 'Admin123!'
        })
        admin_headers = {'Authorization': f"Bearer {admin_login.get_json()['token']}"}

        approve_res = self.client.put(f'/api/admin/qbank/subscriptions/{sub_id}/approve', headers=admin_headers)
        self.assertEqual(approve_res.status_code, 200)

        # Student checks Q-Bank status: now has full access!
        status_res = self.client.get('/api/qbank/status', headers=headers)
        self.assertTrue(status_res.get_json()['hasAccess'])
        self.assertEqual(status_res.get_json()['status'], 'approved')

        # BUT student course enrollment is STILL PENDING (they are decoupled!)
        my_courses_res = self.client.get('/api/courses/my-courses', headers=headers)
        enrollments = my_courses_res.get_json()['enrollments']
        self.assertEqual(len(enrollments), 1)
        self.assertEqual(enrollments[0]['status'], 'pending')

    def test_qbank_admin_crud_and_manual_grant(self):
        """Test admin CRUD on questions and manual subscription grant."""
        admin_login = self.client.post('/api/auth/login', json={
            'email': 'admin@simplenclex.com',
            'password': 'Admin123!'
        })
        headers = {'Authorization': f"Bearer {admin_login.get_json()['token']}"}

        # 1. Create Question
        new_q = {
            'statement': 'Which symptom indicates neuroleptic malignant syndrome (NMS)?',
            'category': 'Psychosocial Integrity & Mental Health',
            'difficulty': 'High Yield',
            'examType': 'NCLEX-RN',
            'clientNeed': 'Pharmacological Therapies',
            'options': [
                'Hypothermia and bradycardia',
                'Hyperthermia, severe muscle rigidity, and autonomic instability',
                'Fine hand tremors and polydipsia',
                'Hypotension and pin-point pupils'
            ],
            'correctIndex': 1,
            'correctRationale': 'NMS is a life-threatening idiosyncratic reaction to dopamine antagonists characterized by hyperthermia and lead-pipe rigidity.',
            'distractors': [
                'Option A: NMS causes extreme fever, not hypothermia.',
                'Option C: Tremor and polydipsia are lithium toxicity symptoms.',
                'Option D: Opioid overdose signs.'
            ],
            'clinicalPearl': 'Dantrolene (muscle relaxant) and bromocriptine (dopamine agonist) treat NMS.',
            'isDemo': 0,
            'sortOrder': 99
        }
        create_res = self.client.post('/api/admin/qbank/questions', headers=headers, json=new_q)
        self.assertEqual(create_res.status_code, 201)
        q_id = create_res.get_json()['question']['id']

        # 2. Update Question
        update_res = self.client.put(f'/api/admin/qbank/questions/{q_id}', headers=headers, json={
            'difficulty': 'Hard',
            'clinicalPearl': 'Updated NMS pearl.'
        })
        self.assertEqual(update_res.status_code, 200)
        self.assertEqual(update_res.get_json()['question']['difficulty'], 'Hard')

        # 3. Delete Question
        del_res = self.client.delete(f'/api/admin/qbank/questions/{q_id}', headers=headers)
        self.assertEqual(del_res.status_code, 200)

        # 4. Manual grant Q-Bank access
        grant_res = self.client.post('/api/admin/qbank/subscriptions/manual', headers=headers, json={
            'email': 'admin@simplenclex.com',
            'planId': 2,
            'durationDays': 90,
            'notes': 'Admin test manual grant'
        })
        self.assertEqual(grant_res.status_code, 201)
        sub = grant_res.get_json()['subscription']
        self.assertEqual(sub['status'], 'approved')
        self.assertEqual(sub['durationDays'], 90)

    def test_qbank_sata_questions_seed_and_evaluation(self):
        """
        Verify that SATA (Select All That Apply) questions support multi-choice submission
        and accurately evaluate full match, partial match, and extraneous distractor selections.
        """
        # 1. Fetch questions and locate a SATA question
        res = self.client.get('/api/qbank/questions')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        questions = data['questions']
        sata_questions = [q for q in questions if q.get('questionType') == 'multiple' or q.get('isMultipleResponse')]
        self.assertGreaterEqual(len(sata_questions), 1, "At least one SATA question should be available in Q-Bank")
        q = sata_questions[0]
        correct_indices = q['correctIndices']
        self.assertGreaterEqual(len(correct_indices), 2, "SATA questions should have at least 2 correct options")

        # 2. Fully correct submission
        res = self.client.post('/api/qbank/check-answer', json={
            'questionId': q['id'],
            'selectedIndices': correct_indices
        })
        self.assertEqual(res.status_code, 200)
        ans_data = res.get_json()
        self.assertTrue(ans_data['success'])
        self.assertTrue(ans_data['isCorrect'])
        self.assertEqual(ans_data['matched'], correct_indices)
        self.assertEqual(ans_data['missed'], [])
        self.assertEqual(ans_data['extra'], [])

        # 3. Partial correct submission (misses at least one correct option)
        partial_indices = correct_indices[:-1]
        res = self.client.post('/api/qbank/check-answer', json={
            'questionId': q['id'],
            'selectedIndices': partial_indices
        })
        self.assertEqual(res.status_code, 200)
        ans_data = res.get_json()
        self.assertTrue(ans_data['success'])
        self.assertFalse(ans_data['isCorrect'])
        self.assertEqual(ans_data['missed'], [correct_indices[-1]])

        # 4. Extraneous distractor submission (includes incorrect option)
        all_option_indices = list(range(len(q['options'])))
        distractor_candidates = [i for i in all_option_indices if i not in correct_indices]
        if distractor_candidates:
            distractor = distractor_candidates[0]
            distractor_indices = sorted(correct_indices + [distractor])
            res = self.client.post('/api/qbank/check-answer', json={
                'questionId': q['id'],
                'selectedIndices': distractor_indices
            })
            self.assertEqual(res.status_code, 200)
            ans_data = res.get_json()
            self.assertTrue(ans_data['success'])
            self.assertFalse(ans_data['isCorrect'])
            self.assertIn(distractor, ans_data['extra'])

    def test_qbank_sata_admin_crud(self):
        """
        Verify Admin can create, read, update, and delete a SATA question with multiple correct indices.
        """
        admin_login = self.client.post('/api/auth/login', json={
            'email': 'admin@simplenclex.com',
            'password': 'Admin123!'
        })
        headers = {'Authorization': f"Bearer {admin_login.get_json()['token']}"}

        # 1. Create SATA Question
        sata_payload = {
            'statement': 'Which laboratory results require immediate notification of the healthcare provider for a client receiving digoxin? (Select all that apply.)',
            'category': 'Pharmacological & Parenteral Therapies',
            'difficulty': 'High Yield',
            'examType': 'NCLEX-RN',
            'clientNeed': 'Pharmacological Therapies',
            'questionType': 'multiple',
            'options': [
                'Serum potassium: 2.8 mEq/L (Hypokalemia)',
                'Serum digoxin level: 1.0 ng/mL (Normal therapeutic range)',
                'Serum magnesium: 1.1 mEq/L (Hypomagnesemia)',
                'Serum calcium: 9.5 mg/dL (Normal)',
                'Serum digoxin level: 2.6 ng/mL (Toxic range)',
                'Serum sodium: 139 mEq/L (Normal)'
            ],
            'correctIndices': [0, 2, 4],
            'correctRationale': 'Hypokalemia, hypomagnesemia, and digoxin levels > 2.0 ng/mL all precipitate or indicate life-threatening digoxin toxicity.',
            'clinicalPearl': 'Hypokalemia increases myocardial sensitivity to digoxin, precipitating dysrhythmias even at borderline drug levels.',
            'isDemo': 1,
            'sortOrder': 90
        }

        create_res = self.client.post('/api/admin/qbank/questions', headers=headers, json=sata_payload)
        self.assertEqual(create_res.status_code, 201)
        created_q = create_res.get_json()['question']
        q_id = created_q['id']
        self.assertEqual(created_q['questionType'], 'multiple')
        self.assertTrue(created_q['isMultipleResponse'])
        self.assertEqual(created_q['correctIndices'], [0, 2, 4])
        self.assertEqual(created_q['correctLetters'], ['A', 'C', 'E'])

        # 2. Verify answer checking against the created SATA question
        ans_res = self.client.post('/api/qbank/check-answer', json={
            'questionId': q_id,
            'selectedIndices': [0, 2, 4]
        })
        self.assertEqual(ans_res.status_code, 200)
        self.assertTrue(ans_res.get_json()['isCorrect'])

        # 3. Update SATA question (change correct indices and difficulty)
        update_res = self.client.put(f'/api/admin/qbank/questions/{q_id}', headers=headers, json={
            'difficulty': 'Expert',
            'correctIndices': [0, 4]
        })
        self.assertEqual(update_res.status_code, 200)
        updated_q = update_res.get_json()['question']
        self.assertEqual(updated_q['difficulty'], 'Expert')
        self.assertEqual(updated_q['correctIndices'], [0, 4])
        self.assertEqual(updated_q['correctLetters'], ['A', 'E'])

        # 4. Clean up / delete created test question
        del_res = self.client.delete(f'/api/admin/qbank/questions/{q_id}', headers=headers)
        self.assertEqual(del_res.status_code, 200)


if __name__ == '__main__':
    unittest.main()



