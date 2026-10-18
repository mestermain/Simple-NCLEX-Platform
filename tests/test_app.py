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
            '/static/css/auth.css',
            '/static/css/admin.css',
            '/static/js/main.js',
            '/static/js/courses.js',
            '/static/js/course-detail.js',
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


if __name__ == '__main__':
    unittest.main()

