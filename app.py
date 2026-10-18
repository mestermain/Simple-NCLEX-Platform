"""
Simple NCLEX Platform — Flask Application & Unified Backend
============================================================
A self-contained, production-ready Flask application serving:
  1. Frontend web templates (Home, Courses, Course Detail, About Us, Login, Register, Admin)
  2. Public & Student REST APIs (Auth, Courses, Enrollments, Demo MCQs, Site Settings)
  3. Administration REST APIs (Dashboard Stats, Registrations, Users, Curriculum Editor)
  4. Embedded SQLite Database Layer & High-Yield NCLEX Question Banks
"""

import os
import re
import sys
import json
import uuid
import sqlite3
from datetime import datetime, timezone, timedelta
from functools import wraps

from flask import (
    Flask, Blueprint, request, jsonify, g, render_template,
    send_from_directory, current_app
)
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import jwt


# ==============================================================================
# 1. CONFIGURATION
# ==============================================================================
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'nclex-pro-super-secret-key-2024-change-in-prod')
    DATABASE_PATH = os.environ.get('DATABASE_PATH', os.path.join(BASE_DIR, 'nclex.db'))
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'nclex-jwt-secret-2024')
    JWT_EXPIRATION_DAYS = int(os.environ.get('JWT_EXPIRATION_DAYS', '30'))
    PORT = int(os.environ.get('PORT', '5001'))
    HOST = os.environ.get('HOST', '0.0.0.0')
    DEBUG = os.environ.get('DEBUG', 'True').lower() in ('true', '1', 'yes')
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024


# ==============================================================================
# 2. DATABASE LAYER & DATA MODELS
# ==============================================================================
def get_db():
    """Get a thread-local SQLite database connection."""
    if 'db' not in g:
        g.db = sqlite3.connect(
            Config.DATABASE_PATH,
            detect_types=sqlite3.PARSE_DECLTYPES
        )
        g.db.row_factory = sqlite3.Row
        # Enable foreign key support in SQLite
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


def close_db(e=None):
    """Close the SQLite database connection if open."""
    db = g.pop('db', None)
    if db is not None:
        db.close()


def _ensure_column(cursor, table, column, col_type):
    """Safely add a column to an SQLite table if it does not already exist."""
    cursor.execute(f"PRAGMA table_info({table})")
    columns = [row[1] for row in cursor.fetchall()]
    if column not in columns:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")


def get_default_demo_mcqs(now=None):
    """Return default high-yield clinical practice MCQs."""
    if not now:
        now = datetime.now(timezone.utc).isoformat()
    return [
        (
            'NCLEX-RN • Pharmacology & Client Needs',
            'High Yield',
            'Physiological Adaptation — Pharmacological & Parenteral Therapies',
            "A client with acute pulmonary embolism is receiving a continuous intravenous heparin infusion. The nurse notes active bleeding from the client's intravenous insertion site, epistaxis, and microscopic hematuria. The laboratory reports an activated partial thromboplastin time (aPTT) of 135 seconds (control baseline: 30 seconds). Which prescription should the nurse anticipate administering immediately?",
            json.dumps([
                'Vitamin K (Phytonadione)',
                'Protamine Sulfate',
                'Deferoxamine',
                'Calcium Gluconate'
            ]),
            1,
            'Heparin is a fast-acting parenteral anticoagulant that potentiates the action of antithrombin III, inactivating thrombin and factor Xa. The expected therapeutic aPTT target during continuous heparin therapy is 1.5 to 2.5 times the normal control baseline (typically 45 to 75 seconds). An aPTT of 135 seconds accompanied by clinical bleeding (hematuria, epistaxis) signifies severe heparin toxicity. Protamine sulfate is the specific, rapid-acting antidote that binds strongly to heparin to form an inactive, stable neutral salt complex, reversing anticoagulation within 5 minutes.',
            json.dumps([
                'Option A (Vitamin K): Antidote for warfarin (Coumadin) toxicity, not heparin. Vitamin K acts through hepatic synthesis of vitamin K-dependent clotting factors (II, VII, IX, X), taking hours to days to achieve clinical effect.',
                'Option C (Deferoxamine): A chelating agent indicated for acute iron toxicity and chronic iron overload, not coagulopathies.',
                'Option D (Calcium Gluconate): The cardioprotective antagonist for severe hyperkalemia or acute magnesium toxicity; it does not reverse heparin.'
            ]),
            'NCLEX High-Yield Rule: "P" goes with "P" (Protamine for PTT/Heparin); "W" goes with "K" (Warfarin for Vitamin K/PT/INR). Therapeutic PTT is 1.5–2.5x control. Stop the heparin infusion FIRST, then notify the provider and prepare Protamine Sulfate.',
            1,
            now
        ),
        (
            'NCLEX-RN & Prometric • Priority Triaging',
            'High Yield',
            'Safe and Effective Care Environment — Management of Care',
            'After receiving morning shift handoff report on a busy medical-surgical unit, which client should the registered nurse assess first?',
            json.dumps([
                'A client with chronic obstructive pulmonary disease (COPD) having an SpO2 of 89% on 2 L/min nasal cannula.',
                'A client who had a subtotal thyroidectomy 6 hours ago and reports tingling around the mouth and fingertips.',
                'A client with type 1 diabetes mellitus who has a fasting capillary blood glucose of 145 mg/dL.',
                'A client with acute pancreatitis who reports severe epigastric pain rating 8/10 radiating to the back.'
            ]),
            1,
            "Using the ABCs (Airway, Breathing, Circulation) and acute-over-chronic prioritization principles, the client post-thyroidectomy reporting perioral paresthesia (numbness/tingling around the mouth and fingers) is exhibiting the earliest symptoms of acute hypocalcemia (tetany), caused by accidental trauma or devascularization/removal of the parathyroid glands. Hypocalcemia causes severe neuromuscular excitability that can rapidly progress to laryngospasm, acute airway obstruction, seizures, and cardiac arrest. This client is at immediate risk for imminent airway collapse and requires urgent assessment (Chvostek's and Trousseau's signs), seizure precautions, and preparation of intravenous calcium gluconate at the bedside.",
            json.dumps([
                'Option A: An SpO2 of 88%–92% is expected for chronic hypercapnic COPD clients due to hypoxic drive; this represents a stable chronic baseline.',
                'Option C: Fasting blood glucose of 145 mg/dL is mildly elevated post-stress, but does not present acute hypoglycemia or diabetic ketoacidosis.',
                'Option D: Severe epigastric pain radiating to the back is the expected hallmark presentation of acute pancreatitis. While analgesia is required, airway compromise always takes priority over expected pain.'
            ]),
            "NCLEX Priority Framework: Post-thyroidectomy emergencies are: 1) Respiratory distress/stridor (edema/hematoma), 2) Tetany/hypocalcemia (numbness/tingling around mouth within 24–48 hours). Always keep an emergency tracheostomy tray, suction, and IV Calcium Gluconate at the bedside.",
            2,
            now
        ),
        (
            'SNLE (Saudi Licensure) • Cardiac Safety',
            'SCFHS High Yield',
            'Physiological Adaptation — Reduction of Risk Potential',
            'A client with heart failure exacerbation is prescribed oral digoxin 0.25 mg daily and furosemide 40 mg daily. Before administering morning medications, which clinical finding requires the nurse to withhold digoxin and notify the healthcare provider immediately?',
            json.dumps([
                'Apical pulse of 52 beats per minute and reported yellow-green halos around lights.',
                'Blood pressure of 134/82 mm Hg and trace bilateral ankle edema.',
                'Serum potassium level of 4.2 mEq/L and serum sodium of 138 mEq/L.',
                'Serum digoxin level of 1.2 ng/mL.'
            ]),
            0,
            'Digoxin is a cardiac glycoside with positive inotropic and negative chronotropic effects. The nurse must assess the apical pulse for 1 full minute prior to administration; digoxin is withheld if apical heart rate is less than 60 beats/min in an adult. Bradycardia (HR 52) combined with classic visual disturbances (yellow-green halos, blurred or flickering vision) and gastrointestinal complaints (anorexia, nausea) are pathognomonic signs of digitalis toxicity. Concurrent loop diuretic therapy (furosemide) increases the risk of hypokalemia, which directly potentiates digoxin binding and accelerates toxicity.',
            json.dumps([
                'Option B: Blood pressure of 134/82 mm Hg and trace ankle edema are typical baseline findings for chronic heart failure clients and do not represent digoxin toxicity.',
                'Option C: Serum potassium of 4.2 mEq/L is within normal reference limits (3.5–5.0 mEq/L). Hypokalemia (<3.5) would be alarming.',
                'Option D: Therapeutic serum digoxin range is 0.8–2.0 ng/mL. A level of 1.2 ng/mL is optimal therapeutic.'
            ]),
            'NCLEX & SNLE Safety Rule: Early signs of Digoxin toxicity are GI disturbances (anorexia, nausea, vomiting), followed by neurological/visual changes (yellow-green halos). Late signs are cardiac dysrhythmias (bradycardia, heart blocks). Check apical pulse for 60 seconds; hold if < 60 bpm. Potassium and digoxin compete for the same receptor!',
            3,
            now
        ),
        (
            'Prometric & Gulf Licensing • Emergency Nursing',
            'High Yield Recall',
            'Health Promotion & Maintenance — Antepartum Care',
            'A client at 34 weeks gestation presents to the emergency department with sudden, severe, continuous abdominal pain and dark red vaginal bleeding. On abdominal examination, the uterus is hypertonic and board-like upon palpation. What is the priority nursing action?',
            json.dumps([
                'Perform a sterile digital vaginal examination to assess cervical dilation and effacement.',
                'Place the client in left lateral recumbent position, apply continuous electronic fetal monitoring, and alert surgical team.',
                'Administer intravenous oxytocin to stimulate regular uterine contractions.',
                'Reassure the client and encourage ambulation around the unit to facilitate labor descent.'
            ]),
            1,
            'Sudden-onset intense abdominal pain, dark red vaginal bleeding, and a rigid, hypertonic ("board-like") uterus are classic symptoms of abruptio placentae (premature detachment of the placenta). This is an obstetric life-threatening emergency causing rapid fetal hypoxia and maternal hemorrhagic shock/disseminated intravascular coagulation (DIC). Immediate interventions include: 1) Placing mother in left lateral recumbent position to relieve inferior vena cava compression and maximize placental perfusion, 2) Applying continuous external fetal and uterine monitoring, 3) Establishing large-bore IV access with crystalloids/blood, and 4) Alerting surgical and neonatal teams for immediate emergency Cesarean delivery.',
            json.dumps([
                'Option A: Vaginal digital examinations are STRICTLY CONTRAINDICATED in any third-trimester bleeding until placenta previa has been ruled out by ultrasound; digital examination can puncture the placenta and cause fatal hemorrhage.',
                'Option C: Oxytocin is contraindicated because the uterus is already hypertonic and contracting excessively.',
                'Option D: Ambulation delays emergency surgical intervention and worsens hemorrhagic shock.'
            ]),
            'NCLEX Comparison Pearl: Abruptio Placentae = Dark red bleeding, SEVERE constant abdominal pain, rigid board-like uterus. Placenta Previa = Bright red bleeding, PAINLESS, soft non-tender uterus. NEVER do a digital vaginal exam on third-trimester bleeding until ultrasound confirms placenta location!',
            4,
            now
        ),
    ]


def init_db(app=None):
    """Initialize SQLite database tables and apply backward-compatible schema migrations."""
    conn = sqlite3.connect(Config.DATABASE_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            exam_type TEXT,
            created_at TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            role TEXT NOT NULL DEFAULT 'student'
        );
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT NOT NULL,
            price REAL NOT NULL,
            original_price REAL NOT NULL,
            rating REAL DEFAULT 4.8,
            students_count INTEGER DEFAULT 0,
            duration_hours INTEGER DEFAULT 0,
            emoji TEXT DEFAULT '📚',
            image_url TEXT DEFAULT '',
            badge_text TEXT,
            badge_style TEXT DEFAULT 'accent',
            level TEXT DEFAULT 'All Levels',
            is_featured INTEGER DEFAULT 0,
            questions_count INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        );
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS enrollments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
            enrolled_at TEXT NOT NULL,
            progress INTEGER DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'pending',
            reviewed_at TEXT,
            notes TEXT,
            UNIQUE(user_id, course_id)
        );
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            details TEXT NOT NULL,
            user_id INTEGER,
            user_email TEXT,
            created_at TEXT NOT NULL
        );
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS site_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS demo_mcqs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
            created_at TEXT NOT NULL
        );
    """)

    # Safe migrations for existing databases
    _ensure_column(cursor, "users", "role", "TEXT NOT NULL DEFAULT 'student'")
    _ensure_column(cursor, "courses", "image_url", "TEXT DEFAULT ''")
    _ensure_column(cursor, "courses", "curriculum_data", "TEXT DEFAULT ''")
    _ensure_column(cursor, "enrollments", "status", "TEXT NOT NULL DEFAULT 'pending'")
    _ensure_column(cursor, "enrollments", "reviewed_at", "TEXT")
    _ensure_column(cursor, "enrollments", "notes", "TEXT")
    _ensure_column(cursor, "enrollments", "whatsapp_number", "TEXT DEFAULT ''")
    _ensure_column(cursor, "enrollments", "payment_screenshot", "TEXT DEFAULT ''")
    _ensure_column(cursor, "users", "plain_password", "TEXT DEFAULT ''")
    cursor.execute("UPDATE users SET plain_password = 'Admin123!' WHERE role = 'admin' AND (plain_password IS NULL OR plain_password = '')")
    cursor.execute("UPDATE users SET plain_password = 'Password123' WHERE id = 10 AND (plain_password IS NULL OR plain_password = '')")
    cursor.execute("UPDATE users SET plain_password = 'Password123!' WHERE id = 9 AND (plain_password IS NULL OR plain_password = '')")

    # Ensure at least one admin account exists
    cursor.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
    admin_exists = cursor.fetchone()

    # Promote user #1 to admin if exists
    cursor.execute("UPDATE users SET role = 'admin' WHERE id = 1")

    # If no admin exists at all, seed a dedicated default admin
    cursor.execute("SELECT id FROM users WHERE email = 'admin@simplenclex.com'")
    if not cursor.fetchone():
        now = datetime.now(timezone.utc).isoformat()
        admin_pw_hash = generate_password_hash("Admin123!")
        cursor.execute(
            """
            INSERT INTO users (first_name, last_name, email, password_hash, exam_type, created_at, is_active, role, plain_password)
            VALUES (?, ?, ?, ?, ?, ?, 1, 'admin', 'Admin123!')
            """,
            ("Admin", "Director", "admin@simplenclex.com", admin_pw_hash, "NCLEX-RN", now)
        )

    # Seed default site settings if table is empty
    default_settings = {
        'hero_headline': 'Master NCLEX-RN, SNLE & Prometric on Your First Attempt',
        'hero_subtitle': 'High-yield video modules, Next-Gen clinical case studies, and authentic practice questions curated by registered nurses and licensing experts.',
        'hero_announcement': '🎯 Next-Gen 2026 Material Now Live for NCLEX-RN, SNLE & Prometric!',
        'contact_email': 'support@simplenclex.com',
        'contact_phone': '+1 (800) 555-NCLEX',
        'contact_whatsapp': '+18005556253',
        'contact_address': 'Houston Medical Center, Texas, USA',
        'instructor_name': 'Dr. Sarah Jenkins, DNP, RN, CCRN',
        'instructor_title': 'Director of Nursing Education & NCLEX / SNLE Lead Strategist',
        'instructor_bio': 'Over 14 years of critical care experience and nursing exam prep coaching. Guided 12,000+ candidates through NCLEX-RN, Saudi SNLE, and Gulf Prometric licensures with an authentic clinical-first approach.',
        'instructor_experience': '14+ Years Clinical & Prep Experience',
        'instructor_photo': '',
        'pass_rate': '99.4%',
        'students_helped': '12,500+',
        'active_mentors': '50+',
        'about_mission': 'Empowering nursing professionals worldwide to conquer NCLEX-RN, SNLE, and Prometric licensing exams with clarity, confidence, and clinical mastery.',
        'social_facebook': 'https://www.facebook.com/share/1diP5AnmkS/',
        'social_youtube': 'https://youtube.com/@famelectures',
        'social_instagram': 'https://www.instagram.com/firstaidmadeeasy_/',
        'social_linkedin': 'https://www.linkedin.com/company/firstaidmadeeasy/',
        'payment_easypaisa_name': 'Muhammad Talha Sadeeq',
        'payment_easypaisa_number': '0300-1234567',
        'payment_bank_name': 'Meezan Bank',
        'payment_bank_iban': 'PK00MEZN0000000000000000',
        'payment_whatsapp_group_link': 'https://chat.whatsapp.com/sample-group-invite',
        'payment_instructions': 'Transfer course fee via Easypaisa or Bank IBAN, upload payment screenshot receipt with your WhatsApp number. Admin will confirm and add you to WhatsApp Group for Google Meet live classes.'
    }
    for k, v in default_settings.items():
        cursor.execute("INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)", (k, v))

    # Seed default demo MCQs if table is empty
    cursor.execute("SELECT COUNT(*) FROM demo_mcqs")
    if cursor.fetchone()[0] == 0:
        now = datetime.now(timezone.utc).isoformat()
        cursor.executemany("""
            INSERT INTO demo_mcqs (
                category, difficulty, client_need, statement, options_json,
                correct_index, correct_rationale, distractors_json,
                clinical_pearl, sort_order, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, get_default_demo_mcqs(now))

    conn.commit()
    conn.close()


class User:
    def __init__(self, data):
        self.id = data['id']
        self.first_name = data['first_name']
        self.last_name = data['last_name']
        self.email = data['email']
        self.password_hash = data['password_hash']
        self.plain_password = data.get('plain_password') or ''
        self.exam_type = data.get('exam_type')
        self.created_at = data.get('created_at', '')
        self.is_active = bool(data.get('is_active', 1))
        self.role = data.get('role') or 'student'

    def to_dict(self, include_password=False):
        d = {
            'id': self.id,
            'firstName': self.first_name,
            'lastName': self.last_name,
            'name': f"{self.first_name} {self.last_name}".strip(),
            'email': self.email,
            'examType': self.exam_type,
            'createdAt': self.created_at,
            'isActive': self.is_active,
            'role': self.role,
        }
        if include_password:
            d['password'] = self.plain_password or ''
            d['plainPassword'] = self.plain_password or ''
        return d

    @classmethod
    def find_by_email(cls, email):
        db = get_db()
        cur = db.execute("SELECT * FROM users WHERE email = ? COLLATE NOCASE", (email,))
        row = cur.fetchone()
        return cls(dict(row)) if row else None

    @classmethod
    def find_by_id(cls, user_id):
        db = get_db()
        cur = db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cur.fetchone()
        return cls(dict(row)) if row else None

    @classmethod
    def create(cls, first_name, last_name, email, password_hash, exam_type, role='student', plain_password=''):
        db = get_db()
        now = datetime.now(timezone.utc).isoformat()
        cur = db.cursor()
        cur.execute(
            """
            INSERT INTO users (first_name, last_name, email, password_hash, exam_type, created_at, is_active, role, plain_password)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
            """,
            (first_name, last_name, email, password_hash, exam_type, now, role, plain_password)
        )
        db.commit()
        return cls.find_by_id(cur.lastrowid)

    @classmethod
    def all(cls, query=None):
        db = get_db()
        sql = """
            SELECT u.*,
                   (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id) as total_enrollments,
                   (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id AND e.status = 'approved') as approved_enrollments
            FROM users u
            WHERE 1=1
        """
        params = []
        if query:
            sql += " AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)"
            q = f"%{query}%"
            params.extend([q, q, q])
        sql += " ORDER BY u.id DESC"
        cur = db.execute(sql, params)
        users = []
        for row in cur.fetchall():
            d = dict(row)
            user_obj = cls(d)
            user_dict = user_obj.to_dict(include_password=True)
            user_dict['totalEnrollments'] = d.get('total_enrollments', 0)
            user_dict['approvedEnrollments'] = d.get('approved_enrollments', 0)
            users.append(user_dict)
        return users

    @classmethod
    def update_role(cls, user_id, role):
        db = get_db()
        db.execute("UPDATE users SET role = ? WHERE id = ?", (role, user_id))
        db.commit()
        return cls.find_by_id(user_id)

    @classmethod
    def toggle_active(cls, user_id, is_active):
        db = get_db()
        db.execute("UPDATE users SET is_active = ? WHERE id = ?", (1 if is_active else 0, user_id))
        db.commit()
        return cls.find_by_id(user_id)

    @classmethod
    def delete(cls, user_id):
        db = get_db()
        db.execute("DELETE FROM enrollments WHERE user_id = ?", (user_id,))
        db.execute("DELETE FROM users WHERE id = ?", (user_id,))
        db.commit()

    @classmethod
    def update_password(cls, user_id, new_password_hash, plain_password=''):
        db = get_db()
        db.execute("UPDATE users SET password_hash = ?, plain_password = ? WHERE id = ?", (new_password_hash, plain_password, user_id))
        db.commit()
        return cls.find_by_id(user_id)

    @classmethod
    def update(cls, user_id, **kwargs):
        db = get_db()
        fields = []
        values = []
        allowed = {'first_name', 'last_name', 'email', 'exam_type', 'role', 'is_active', 'password_hash', 'plain_password'}
        for k, v in kwargs.items():
            if k in allowed:
                fields.append(f"{k} = ?")
                if k == 'is_active':
                    values.append(1 if v else 0)
                else:
                    values.append(v)

        if not fields:
            return cls.find_by_id(user_id)

        values.append(user_id)
        sql = f"UPDATE users SET {', '.join(fields)} WHERE id = ?"
        db.execute(sql, values)
        db.commit()
        return cls.find_by_id(user_id)


class Course:
    def __init__(self, data):
        self.id = data['id']
        self.title = data['title']
        self.description = data['description']
        self.category = data['category']
        self.price = float(data['price'])
        self.original_price = float(data['original_price'])
        self.rating = float(data.get('rating') or 4.8)
        self.students_count = int(data.get('students_count') or 0)
        self.duration_hours = int(data.get('duration_hours') or 0)
        self.emoji = data.get('emoji') or '📚'
        self.image_url = data.get('image_url') or ''
        self.badge_text = data.get('badge_text')
        self.badge_style = data.get('badge_style') or 'accent'
        self.level = data.get('level') or 'All Levels'
        self.is_featured = bool(data.get('is_featured'))
        self.questions_count = int(data.get('questions_count') or 0)
        self.curriculum_data = data.get('curriculum_data') or ''
        self.created_at = data.get('created_at', '')

    def to_dict(self, enrolled=False, enrollment_status=None):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'price': self.price,
            'originalPrice': self.original_price,
            'rating': self.rating,
            'studentsCount': self.students_count,
            'durationHours': self.duration_hours,
            'emoji': self.emoji,
            'imageUrl': self.image_url,
            'badgeText': self.badge_text,
            'badgeStyle': self.badge_style,
            'level': self.level,
            'isFeatured': self.is_featured,
            'questionsCount': self.questions_count,
            'curriculumData': self.curriculum_data,
            'enrolled': enrolled,
            'enrollmentStatus': enrollment_status,
        }

    @classmethod
    def count(cls):
        db = get_db()
        cur = db.execute("SELECT COUNT(*) FROM courses")
        return cur.fetchone()[0]

    @classmethod
    def find_by_id(cls, course_id):
        db = get_db()
        cur = db.execute("SELECT * FROM courses WHERE id = ?", (course_id,))
        row = cur.fetchone()
        return cls(dict(row)) if row else None

    @classmethod
    def all(cls, category=None, query=None):
        db = get_db()
        sql = "SELECT * FROM courses WHERE 1=1"
        params = []

        if category and category != 'all':
            sql += " AND category LIKE ?"
            params.append(f'%{category}%')

        if query:
            sql += " AND (title LIKE ? OR description LIKE ? OR category LIKE ?)"
            q_param = f'%{query}%'
            params.extend([q_param, q_param, q_param])

        sql += " ORDER BY is_featured DESC, students_count DESC, id ASC"
        cur = db.execute(sql, params)
        return [cls(dict(row)) for row in cur.fetchall()]

    @classmethod
    def create(cls, **kwargs):
        db = get_db()
        now = datetime.now(timezone.utc).isoformat()
        cur = db.cursor()
        cur.execute(
            """
            INSERT INTO courses (
                title, description, category, price, original_price, rating,
                students_count, duration_hours, emoji, image_url, badge_text, badge_style,
                level, is_featured, questions_count, curriculum_data, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                kwargs['title'],
                kwargs['description'],
                kwargs['category'],
                kwargs['price'],
                kwargs.get('original_price', kwargs['price']),
                kwargs.get('rating', 4.8),
                kwargs.get('students_count', 0),
                kwargs.get('duration_hours', 0),
                kwargs.get('emoji', '📚'),
                kwargs.get('image_url', ''),
                kwargs.get('badge_text'),
                kwargs.get('badge_style', 'accent'),
                kwargs.get('level', 'All Levels'),
                1 if kwargs.get('is_featured') else 0,
                kwargs.get('questions_count', 0),
                kwargs.get('curriculum_data', ''),
                now
            )
        )
        db.commit()
        return cls.find_by_id(cur.lastrowid)

    @classmethod
    def update(cls, course_id, **kwargs):
        db = get_db()
        fields = []
        values = []
        allowed = {
            'title', 'description', 'category', 'price', 'original_price',
            'rating', 'students_count', 'duration_hours', 'emoji', 'image_url',
            'badge_text', 'badge_style', 'level', 'is_featured', 'questions_count',
            'curriculum_data'
        }

        for k, v in kwargs.items():
            if k in allowed:
                fields.append(f"{k} = ?")
                if k == 'is_featured':
                    values.append(1 if v else 0)
                else:
                    values.append(v)

        if not fields:
            return cls.find_by_id(course_id)

        values.append(course_id)
        sql = f"UPDATE courses SET {', '.join(fields)} WHERE id = ?"
        db.execute(sql, values)
        db.commit()
        return cls.find_by_id(course_id)

    @classmethod
    def update_curriculum(cls, course_id, curriculum_data):
        db = get_db()
        db.execute("UPDATE courses SET curriculum_data = ? WHERE id = ?", (curriculum_data, course_id))
        db.commit()
        return cls.find_by_id(course_id)

    @classmethod
    def delete(cls, course_id):
        db = get_db()
        db.execute("DELETE FROM enrollments WHERE course_id = ?", (course_id,))
        db.execute("DELETE FROM courses WHERE id = ?", (course_id,))
        db.commit()

    @classmethod
    def increment_students(cls, course_id):
        db = get_db()
        db.execute("UPDATE courses SET students_count = students_count + 1 WHERE id = ?", (course_id,))
        db.commit()


class Enrollment:
    def __init__(self, data, course_data=None, user_data=None):
        self.id = data['id']
        self.user_id = data['user_id']
        self.course_id = data['course_id']
        self.enrolled_at = data.get('enrolled_at', '')
        self.progress = int(data.get('progress') or 0)
        self.status = data.get('status') or 'pending'
        self.reviewed_at = data.get('reviewed_at')
        self.notes = data.get('notes')
        self.whatsapp_number = data.get('whatsapp_number') or ''
        self.payment_screenshot = data.get('payment_screenshot') or ''
        self.transaction_id = data.get('transaction_id') or ''
        self.course = Course(course_data) if course_data else None
        self.user = User(user_data) if user_data else None

    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'courseId': self.course_id,
            'course': self.course.to_dict(enrolled=(self.status == 'approved'), enrollment_status=self.status) if self.course else None,
            'user': self.user.to_dict() if self.user else None,
            'enrolledAt': self.enrolled_at,
            'progress': self.progress,
            'status': self.status,
            'reviewedAt': self.reviewed_at,
            'notes': self.notes,
            'whatsappNumber': self.whatsapp_number,
            'paymentScreenshot': self.payment_screenshot,
            'transactionId': self.transaction_id,
        }

    @classmethod
    def find(cls, user_id, course_id):
        db = get_db()
        cur = db.execute("SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?", (user_id, course_id))
        row = cur.fetchone()
        return cls(dict(row)) if row else None

    @classmethod
    def find_by_id(cls, enrollment_id):
        db = get_db()
        cur = db.execute("SELECT * FROM enrollments WHERE id = ?", (enrollment_id,))
        row = cur.fetchone()
        return cls(dict(row)) if row else None

    @classmethod
    def find_by_user(cls, user_id):
        db = get_db()
        sql = """
            SELECT e.*, c.title, c.description, c.category, c.price, c.original_price,
                   c.rating, c.students_count, c.duration_hours, c.emoji, c.image_url, c.badge_text,
                   c.badge_style, c.level, c.is_featured, c.questions_count, c.created_at as course_created_at
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            WHERE e.user_id = ?
            ORDER BY e.enrolled_at DESC
        """
        cur = db.execute(sql, (user_id,))
        results = []
        for row in cur.fetchall():
            d = dict(row)
            course_dict = {
                'id': d['course_id'],
                'title': d['title'],
                'description': d['description'],
                'category': d['category'],
                'price': d['price'],
                'original_price': d['original_price'],
                'rating': d['rating'],
                'students_count': d['students_count'],
                'duration_hours': d['duration_hours'],
                'emoji': d['emoji'],
                'image_url': d.get('image_url', ''),
                'badge_text': d['badge_text'],
                'badge_style': d['badge_style'],
                'level': d['level'],
                'is_featured': d['is_featured'],
                'questions_count': d['questions_count'],
                'created_at': d['course_created_at'],
            }
            results.append(cls(d, course_data=course_dict))
        return results

    @classmethod
    def create(cls, user_id, course_id, status='pending', notes=None, whatsapp_number='', payment_screenshot='', transaction_id=''):
        db = get_db()
        now = datetime.now(timezone.utc).isoformat()
        cur = db.cursor()
        cur.execute(
            """
            INSERT INTO enrollments (user_id, course_id, enrolled_at, progress, status, notes, whatsapp_number, payment_screenshot, transaction_id)
            VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?)
            """,
            (user_id, course_id, now, status, notes, whatsapp_number, payment_screenshot, transaction_id)
        )
        if status == 'approved':
            Course.increment_students(course_id)
        db.commit()
        return cls.find(user_id, course_id)

    @classmethod
    def update_payment_submission(cls, enrollment_id, whatsapp_number=None, payment_screenshot=None, transaction_id=None, notes=None):
        db = get_db()
        now = datetime.now(timezone.utc).isoformat()
        db.execute(
            """
            UPDATE enrollments
            SET status = 'pending',
                whatsapp_number = COALESCE(?, whatsapp_number),
                payment_screenshot = COALESCE(?, payment_screenshot),
                transaction_id = COALESCE(?, transaction_id),
                notes = COALESCE(?, notes),
                enrolled_at = ?
            WHERE id = ?
            """,
            (whatsapp_number, payment_screenshot, transaction_id, notes, now, enrollment_id)
        )
        db.commit()
        return cls.find_by_id(enrollment_id)

    @classmethod
    def update_status(cls, enrollment_id, status, notes=None):
        db = get_db()
        now = datetime.now(timezone.utc).isoformat()
        cur = db.execute("SELECT * FROM enrollments WHERE id = ?", (enrollment_id,))
        row = cur.fetchone()
        if not row:
            return None

        old_status = row['status']
        course_id = row['course_id']

        db.execute(
            """
            UPDATE enrollments
            SET status = ?, reviewed_at = ?, notes = COALESCE(?, notes)
            WHERE id = ?
            """,
            (status, now, notes, enrollment_id)
        )

        # If transitioning to approved, increment students count
        if old_status != 'approved' and status == 'approved':
            Course.increment_students(course_id)

        db.commit()
        return cls.find_by_id(enrollment_id)

    @classmethod
    def all_with_details(cls, status=None, query=None):
        db = get_db()
        sql = """
            SELECT e.*,
                   u.first_name, u.last_name, u.email, u.exam_type, u.created_at as user_created_at, u.role as user_role, u.is_active as user_is_active,
                   c.title as course_title, c.category as course_category, c.price as course_price,
                   c.original_price as course_original_price, c.emoji as course_emoji, c.image_url as course_image_url
            FROM enrollments e
            JOIN users u ON e.user_id = u.id
            JOIN courses c ON e.course_id = c.id
            WHERE 1=1
        """
        params = []
        if status and status != 'all':
            sql += " AND e.status = ?"
            params.append(status)

        if query:
            sql += " AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR c.title LIKE ?)"
            q = f"%{query}%"
            params.extend([q, q, q, q])

        sql += " ORDER BY CASE WHEN e.status = 'pending' THEN 0 ELSE 1 END, e.id DESC"
        cur = db.execute(sql, params)
        items = []
        for row in cur.fetchall():
            d = dict(row)
            items.append({
                'id': d['id'],
                'userId': d['user_id'],
                'courseId': d['course_id'],
                'enrolledAt': d['enrolled_at'],
                'progress': d['progress'],
                'status': d['status'],
                'reviewedAt': d.get('reviewed_at'),
                'notes': d.get('notes'),
                'whatsappNumber': d.get('whatsapp_number') or '',
                'paymentScreenshot': d.get('payment_screenshot') or '',
                'transactionId': d.get('transaction_id') or '',
                'user': {
                    'id': d['user_id'],
                    'firstName': d['first_name'],
                    'lastName': d['last_name'],
                    'name': f"{d['first_name']} {d['last_name']}".strip(),
                    'email': d['email'],
                    'examType': d.get('exam_type'),
                    'role': d.get('user_role'),
                },
                'course': {
                    'id': d['course_id'],
                    'title': d['course_title'],
                    'category': d['course_category'],
                    'price': d['course_price'],
                    'originalPrice': d.get('course_original_price'),
                    'emoji': d.get('course_emoji') or '📚',
                    'imageUrl': d.get('course_image_url') or '',
                }
            })
        return items

    @classmethod
    def count_pending(cls):
        db = get_db()
        cur = db.execute("SELECT COUNT(*) FROM enrollments WHERE status = 'pending'")
        return cur.fetchone()[0]

    @classmethod
    def count_by_status(cls):
        db = get_db()
        cur = db.execute("""
            SELECT
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
                COUNT(*) as total_count
            FROM enrollments
        """)
        row = cur.fetchone()
        return dict(row) if row else {'pending_count': 0, 'approved_count': 0, 'rejected_count': 0, 'total_count': 0}

    @classmethod
    def delete(cls, enrollment_id):
        db = get_db()
        db.execute("DELETE FROM enrollments WHERE id = ?", (enrollment_id,))
        db.commit()


class ActivityLog:
    @classmethod
    def log(cls, action, details, user_id=None, user_email=None):
        try:
            db = get_db()
            now = datetime.now(timezone.utc).isoformat()
            db.execute(
                """
                INSERT INTO activity_logs (action, details, user_id, user_email, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (action, details, user_id, user_email, now)
            )
            db.commit()
        except Exception as e:
            print(f"Error logging activity: {e}")

    @classmethod
    def recent(cls, limit=50):
        db = get_db()
        cur = db.execute("SELECT * FROM activity_logs ORDER BY id DESC LIMIT ?", (limit,))
        return [dict(r) for r in cur.fetchall()]


class SiteSetting:
    @classmethod
    def get_all(cls):
        db = get_db()
        cur = db.execute("SELECT key, value FROM site_settings")
        return {row['key']: row['value'] for row in cur.fetchall()}

    @classmethod
    def get(cls, key, default=''):
        db = get_db()
        cur = db.execute("SELECT value FROM site_settings WHERE key = ?", (key,))
        row = cur.fetchone()
        return row['value'] if row else default

    @classmethod
    def set(cls, key, value):
        db = get_db()
        db.execute(
            "INSERT INTO site_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, str(value) if value is not None else '')
        )
        db.commit()
        return value

    @classmethod
    def set_many(cls, settings_dict):
        db = get_db()
        for k, v in settings_dict.items():
            db.execute(
                "INSERT INTO site_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (k, str(v) if v is not None else '')
            )
        db.commit()
        return cls.get_all()


class DemoMCQ:
    def __init__(self, data):
        self.id = data['id']
        self.category = data['category']
        self.difficulty = data['difficulty']
        self.client_need = data.get('client_need') or ''
        self.statement = data['statement']

        options_raw = data.get('options_json', '[]')
        if isinstance(options_raw, list):
            self.options = options_raw
        elif isinstance(options_raw, str):
            try:
                self.options = json.loads(options_raw)
            except Exception:
                self.options = [opt.strip() for opt in options_raw.split('\n') if opt.strip()]
        else:
            self.options = []

        self.correct_index = int(data.get('correct_index', 0))
        self.correct_rationale = data.get('correct_rationale') or ''

        distractors_raw = data.get('distractors_json', '[]')
        if isinstance(distractors_raw, list):
            self.distractors = distractors_raw
        elif isinstance(distractors_raw, str):
            try:
                self.distractors = json.loads(distractors_raw)
            except Exception:
                self.distractors = [d.strip() for d in distractors_raw.split('\n') if d.strip()]
        else:
            self.distractors = []

        self.clinical_pearl = data.get('clinical_pearl') or ''
        self.sort_order = int(data.get('sort_order', 0))
        self.created_at = data.get('created_at', '')

    def to_dict(self):
        return {
            'id': self.id,
            'category': self.category,
            'difficulty': self.difficulty,
            'clientNeed': self.client_need,
            'statement': self.statement,
            'options': self.options,
            'correctIndex': self.correct_index,
            'description': {
                'correctRationale': self.correct_rationale,
                'distractors': self.distractors,
                'clinicalPearl': self.clinical_pearl,
            },
            'sortOrder': self.sort_order,
            'createdAt': self.created_at,
        }

    @classmethod
    def all(cls):
        db = get_db()
        cur = db.execute("SELECT * FROM demo_mcqs ORDER BY sort_order ASC, id ASC")
        return [cls(dict(r)) for r in cur.fetchall()]

    @classmethod
    def find_by_id(cls, mcq_id):
        db = get_db()
        cur = db.execute("SELECT * FROM demo_mcqs WHERE id = ?", (mcq_id,))
        row = cur.fetchone()
        return cls(dict(row)) if row else None

    @classmethod
    def create(cls, category, difficulty, statement, options, correct_index, correct_rationale, distractors=None, clinical_pearl='', client_need='', sort_order=0):
        db = get_db()
        now = datetime.now(timezone.utc).isoformat()
        if isinstance(options, list):
            options_json = json.dumps(options)
        else:
            options_json = str(options)

        if isinstance(distractors, list):
            distractors_json = json.dumps(distractors)
        elif isinstance(distractors, str):
            try:
                parsed = json.loads(distractors)
                distractors_json = json.dumps(parsed) if isinstance(parsed, list) else json.dumps([distractors])
            except Exception:
                lines = [d.strip() for d in distractors.split('\n') if d.strip()]
                distractors_json = json.dumps(lines)
        else:
            distractors_json = '[]'

        cur = db.cursor()
        cur.execute(
            """
            INSERT INTO demo_mcqs (
                category, difficulty, client_need, statement, options_json,
                correct_index, correct_rationale, distractors_json, clinical_pearl, sort_order, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                category, difficulty, client_need, statement, options_json,
                int(correct_index), correct_rationale, distractors_json, clinical_pearl, int(sort_order), now
            )
        )
        db.commit()
        return cls.find_by_id(cur.lastrowid)

    @classmethod
    def update(cls, mcq_id, **kwargs):
        db = get_db()
        mcq = cls.find_by_id(mcq_id)
        if not mcq:
            return None

        category = kwargs.get('category', mcq.category)
        difficulty = kwargs.get('difficulty', mcq.difficulty)
        client_need = kwargs.get('client_need', mcq.client_need)
        statement = kwargs.get('statement', mcq.statement)

        if 'options' in kwargs:
            opts = kwargs['options']
            options_json = json.dumps(opts) if isinstance(opts, list) else str(opts)
        else:
            options_json = json.dumps(mcq.options)

        correct_index = int(kwargs.get('correct_index', mcq.correct_index))
        correct_rationale = kwargs.get('correct_rationale', mcq.correct_rationale)

        if 'distractors' in kwargs:
            dist = kwargs['distractors']
            if isinstance(dist, list):
                distractors_json = json.dumps(dist)
            elif isinstance(dist, str):
                try:
                    parsed = json.loads(dist)
                    distractors_json = json.dumps(parsed) if isinstance(parsed, list) else json.dumps([dist])
                except Exception:
                    lines = [d.strip() for d in dist.split('\n') if d.strip()]
                    distractors_json = json.dumps(lines)
            else:
                distractors_json = '[]'
        else:
            distractors_json = json.dumps(mcq.distractors)

        clinical_pearl = kwargs.get('clinical_pearl', mcq.clinical_pearl)
        sort_order = int(kwargs.get('sort_order', mcq.sort_order))

        db.execute(
            """
            UPDATE demo_mcqs
            SET category = ?, difficulty = ?, client_need = ?, statement = ?, options_json = ?,
                correct_index = ?, correct_rationale = ?, distractors_json = ?, clinical_pearl = ?, sort_order = ?
            WHERE id = ?
            """,
            (
                category, difficulty, client_need, statement, options_json,
                correct_index, correct_rationale, distractors_json, clinical_pearl, sort_order, mcq_id
            )
        )
        db.commit()
        return cls.find_by_id(mcq_id)

    @classmethod
    def delete(cls, mcq_id):
        db = get_db()
        db.execute("DELETE FROM demo_mcqs WHERE id = ?", (mcq_id,))
        db.commit()

    @classmethod
    def reset_to_defaults(cls):
        db = get_db()
        db.execute("DELETE FROM demo_mcqs")
        now = datetime.now(timezone.utc).isoformat()
        db.cursor().executemany("""
            INSERT INTO demo_mcqs (
                category, difficulty, client_need, statement, options_json,
                correct_index, correct_rationale, distractors_json,
                clinical_pearl, sort_order, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, get_default_demo_mcqs(now))
        db.commit()
        return cls.all()

    @classmethod
    def get_all(cls):
        return [m.to_dict() for m in cls.all()]

    @classmethod
    def get_by_id(cls, mcq_id):
        m = cls.find_by_id(mcq_id)
        return m.to_dict() if m else None


# ==============================================================================
# 3. JWT AUTHENTICATION UTILITIES & DECORATORS
# ==============================================================================
def create_access_token(identity, expires_days=None):
    """Generate a signed JWT token for the specified user identity."""
    if expires_days is None:
        expires_days = Config.JWT_EXPIRATION_DAYS

    payload = {
        'sub': str(identity),
        'iat': datetime.now(timezone.utc),
        'exp': datetime.now(timezone.utc) + timedelta(days=expires_days),
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm='HS256')


def decode_token(token):
    """Decode and validate a JWT token string."""
    return jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=['HS256'])


def verify_jwt_in_request(optional=False):
    """
    Inspect Authorization header and set g.user_id if valid.
    Returns True if valid token present, False otherwise.
    """
    auth_header = request.headers.get('Authorization', '')
    token = None
    if auth_header.startswith('Bearer '):
        token = auth_header.split(' ', 1)[1].strip()

    if not token:
        g.user_id = None
        if not optional:
            raise ValueError('Authorization header with Bearer token is missing.')
        return False

    try:
        payload = decode_token(token)
        g.user_id = int(payload['sub'])
        return True
    except jwt.ExpiredSignatureError:
        g.user_id = None
        if not optional:
            raise ValueError('Token has expired.')
        return False
    except Exception:
        g.user_id = None
        if not optional:
            raise ValueError('Token is invalid.')
        return False


def get_jwt_identity():
    """Return the currently authenticated user id, or None."""
    return getattr(g, 'user_id', None)


def jwt_required(optional=False):
    """Decorator to protect routes with JWT authentication."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request(optional=optional)
            except ValueError as e:
                return jsonify({'success': False, 'message': str(e)}), 401
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def admin_required():
    """Decorator to protect routes requiring admin privileges."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request(optional=False)
            except ValueError as e:
                return jsonify({'success': False, 'message': str(e)}), 401

            user_id = get_jwt_identity()
            user = User.find_by_id(user_id)
            if not user or user.role != 'admin':
                return jsonify({'success': False, 'message': 'Administrator access required.'}), 403

            g.current_user = user
            return fn(*args, **kwargs)
        return wrapper
    return decorator


# ==============================================================================
# 4. BLUEPRINTS INITIALIZATION
# ==============================================================================
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
courses_bp = Blueprint('courses', __name__, url_prefix='/api/courses')
admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


# ==============================================================================
# 5. AUTHENTICATION REST API ROUTES (/api/auth)
# ==============================================================================
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


def is_valid_email(email: str) -> bool:
    return bool(re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email))


# ── REGISTER ──────────────────────────────────────────────────────────────────
@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}

    first_name = data.get('firstName', '').strip()
    last_name  = data.get('lastName',  '').strip()
    email      = data.get('email',     '').strip().lower()
    password   = data.get('password',  '')
    exam_type  = data.get('examType',  '').strip()

    # ── Validation ──
    errors = {}
    if not first_name:
        errors['firstName'] = 'First name is required.'
    if not last_name:
        errors['lastName'] = 'Last name is required.'
    if not email:
        errors['email'] = 'Email is required.'
    elif not is_valid_email(email):
        errors['email'] = 'Enter a valid email address.'
    if not password:
        errors['password'] = 'Password is required.'
    elif len(password) < 8:
        errors['password'] = 'Password must be at least 8 characters.'
    if not exam_type:
        errors['examType'] = 'Please select your exam type.'

    if errors:
        return jsonify({'success': False, 'errors': errors}), 422

    # ── Check duplicate ──
    if User.find_by_email(email):
        return jsonify({'success': False, 'errors': {'email': 'An account with this email already exists.'}}), 409

    # ── Hash password & save ──
    pw_hash = generate_password_hash(password)
    user = User.create(
        first_name=first_name,
        last_name=last_name,
        email=email,
        password_hash=pw_hash,
        exam_type=exam_type,
        plain_password=password,
    )

    token = create_access_token(identity=user.id)
    return jsonify({
        'success': True,
        'message': f'Welcome, {first_name}! Your account has been created.',
        'token':   token,
        'user':    user.to_dict(),
    }), 201


# ── LOGIN ─────────────────────────────────────────────────────────────────────
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}

    email    = data.get('email',    '').strip().lower()
    password = data.get('password', '')

    errors = {}
    if not email:
        errors['email'] = 'Email is required.'
    elif not is_valid_email(email):
        errors['email'] = 'Enter a valid email.'
    if not password:
        errors['password'] = 'Password is required.'

    if errors:
        return jsonify({'success': False, 'errors': errors}), 422

    user = User.find_by_email(email)

    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'success': False, 'errors': {'email': 'Invalid email or password.'}}), 401

    if not user.is_active:
        return jsonify({'success': False, 'errors': {'email': 'This account has been deactivated.'}}), 403

    token = create_access_token(identity=user.id)
    return jsonify({
        'success': True,
        'message': f'Welcome back, {user.first_name}!',
        'token':   token,
        'user':    user.to_dict(),
    }), 200


# ── GET CURRENT USER ──────────────────────────────────────────────────────────
@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user    = User.find_by_id(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found.'}), 404
    return jsonify({'success': True, 'user': user.to_dict()}), 200


# ── CHANGE PASSWORD ───────────────────────────────────────────────────────────
@auth_bp.route('/change-password', methods=['PUT'])
@jwt_required()
def change_password():
    user_id = get_jwt_identity()
    user    = User.find_by_id(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found.'}), 404

    data = request.get_json(silent=True) or {}
    old_pw = data.get('oldPassword', '')
    new_pw = data.get('newPassword', '')

    if not check_password_hash(user.password_hash, old_pw):
        return jsonify({'success': False, 'message': 'Current password is incorrect.'}), 400
    if len(new_pw) < 8:
        return jsonify({'success': False, 'message': 'New password must be at least 8 characters.'}), 422

    new_hash = generate_password_hash(new_pw)
    User.update_password(user_id, new_hash)
    return jsonify({'success': True, 'message': 'Password updated successfully.'}), 200


# ==============================================================================
# 6. COURSES & ENROLLMENT REST API ROUTES (/api/courses)
# ==============================================================================
courses_bp = Blueprint('courses', __name__, url_prefix='/api/courses')


def _current_user_id():
    """Return current user id if a valid JWT was supplied, else None."""
    try:
        if verify_jwt_in_request(optional=True):
            return get_jwt_identity()
        return None
    except Exception:
        return None


# ── LIST ALL COURSES ──────────────────────────────────────────────────────────
@courses_bp.route('', methods=['GET'])
def list_courses():
    category = request.args.get('category', '').strip()
    q        = request.args.get('q', '').strip()

    courses = Course.all(category=category, query=q)

    user_id = _current_user_id()
    enrollment_map = {}
    if user_id:
        user_enrollments = Enrollment.find_by_user(user_id)
        enrollment_map = {e.course_id: e.status for e in user_enrollments}

    course_list = []
    for c in courses:
        status = enrollment_map.get(c.id)
        course_list.append(c.to_dict(
            enrolled=(status == 'approved'),
            enrollment_status=status
        ))

    return jsonify({
        'success': True,
        'courses': course_list,
        'total':   len(courses),
    }), 200


# ── USER'S ENROLLED COURSES ───────────────────────────────────────────────────
# Place before <int:course_id> route to prevent route collision
@courses_bp.route('/my-courses', methods=['GET'])
@jwt_required()
def my_courses():
    user_id     = get_jwt_identity()
    enrollments = Enrollment.find_by_user(user_id)
    return jsonify({
        'success':     True,
        'enrollments': [e.to_dict() for e in enrollments],
        'total':       len(enrollments),
    }), 200


# ── GET SINGLE COURSE & CURRICULUM ───────────────────────────────────────────
def _get_course_curriculum(course, is_approved=True):
    """
    Generate comprehensive course curriculum modules for the program.
    All regular lectures, daily clinical rationales, and live session links
    are conducted directly via WhatsApp & Google Meet.
    """
    # Check if admin defined custom curriculum for this course
    if getattr(course, 'curriculum_data', None):
        try:
            raw_modules = json.loads(course.curriculum_data)
            if isinstance(raw_modules, list) and len(raw_modules) > 0:
                filtered = []
                for m in raw_modules:
                    m_title = (m.get('moduleTitle') or '').lower()
                    if 'demo' in m_title or 'preview' in m_title:
                        continue
                    clean_lecs = []
                    for lec in m.get('lectures', []):
                        l_title = (lec.get('title') or '').lower()
                        if 'demo' in l_title or 'preview' in l_title:
                            continue
                        clean_lec = dict(lec)
                        clean_lec.pop('videoUrl', None)
                        clean_lec.pop('isPreview', None)
                        clean_lecs.append(clean_lec)
                    if clean_lecs:
                        m_copy = dict(m)
                        m_copy['lectures'] = clean_lecs
                        filtered.append(m_copy)
                if filtered:
                    return filtered
        except Exception as e:
            print(f"Error parsing course curriculum_data for course {course.id}: {e}")

    cat = (course.category or '').lower()
    title = (course.title or '').lower()

    if 'snle' in cat or 'snle' in title:
        return [
            {
                'moduleTitle': 'Module 1: SCFHS Exam Blueprint & Clinical Standards',
                'lectures': [
                    {
                        'id': 'snle-1',
                        'title': 'Saudi Healthcare Regulations, Code of Ethics & Patient Rights',
                        'duration': '45:00',
                        'notes': [
                            'Overview of the Saudi Commission for Health Specialties (SCFHS) blueprint.',
                            'Nursing scope of practice and legal-ethical responsibilities in Saudi hospital systems.',
                            'Patient safety goals and incident reporting procedures.'
                        ]
                    },
                    {
                        'id': 'snle-2',
                        'title': 'Clinical Prioritization & Acute Deterioration (ABCDE)',
                        'duration': '50:00',
                        'notes': [
                            'Application of ABCDE principles in acute emergency situations.',
                            'Differentiating emergent, urgent, and non-urgent clinical presentations.',
                            'Core Saunders and SCFHS clinical prioritization pearls.'
                        ]
                    }
                ]
            },
            {
                'moduleTitle': 'Module 2: Medical-Surgical & Critical Care Nursing',
                'lectures': [
                    {
                        'id': 'snle-3',
                        'title': 'Cardiovascular & Respiratory Emergencies Management',
                        'duration': '55:00',
                        'notes': [
                            'Acute coronary syndromes, heart failure, and dysrhythmia identification.',
                            'ABG interpretation and mechanical ventilation nursing care.'
                        ]
                    },
                    {
                        'id': 'snle-4',
                        'title': 'Endocrine, Renal & Gastrointestinal Disorders',
                        'duration': '50:00',
                        'notes': [
                            'DKA vs HHS clinical management and sliding scale insulin.',
                            'Acute kidney injury, dialysis access care, and electrolyte imbalances.'
                        ]
                    }
                ]
            },
            {
                'moduleTitle': 'Module 3: Maternal, Child & Pharmacology Calculations',
                'lectures': [
                    {
                        'id': 'snle-5',
                        'title': 'High-Alert Medications & Pediatric Dosage Calculations',
                        'duration': '45:00',
                        'notes': [
                            'Safe dose ranges, IV flow rate formulas, and pediatric weight-based calculations.',
                            'High-alert medications: anticoagulants, insulin, and concentrated electrolytes.'
                        ]
                    },
                    {
                        'id': 'snle-6',
                        'title': 'SCFHS High-Yield Question Bank & Recall Scenarios',
                        'duration': '60:00',
                        'notes': [
                            'Analysis of frequent past SCFHS recall question patterns.',
                            'Distractor elimination strategies and timing optimization.'
                        ]
                    }
                ]
            }
        ]

    if 'prometric' in cat or 'prometric' in title:
        return [
            {
                'moduleTitle': 'Module 1: Gulf Licensing Protocols & Infection Prevention',
                'lectures': [
                    {
                        'id': 'prom-1',
                        'title': 'DHA, MOH, Qatar & Oman Prometric Test Architecture',
                        'duration': '45:00',
                        'notes': [
                            'Comprehensive guide to Prometric computer-based testing for Gulf countries.',
                            'Understanding question formats, passing thresholds, and time management.',
                            'Key clinical protocols required across Dubai (DHA), UAE (MOH), and Qatar (QCHP).'
                        ]
                    },
                    {
                        'id': 'prom-2',
                        'title': 'Infection Prevention, Isolation Precautions & Safety Standards',
                        'duration': '40:00',
                        'notes': [
                            'Standard, Contact, Droplet, and Airborne isolation precautions.',
                            'Hand hygiene guidelines and WHO 5 moments of hand hygiene.',
                            'Needlestick injury protocols and post-exposure prophylaxis (PEP).'
                        ]
                    }
                ]
            },
            {
                'moduleTitle': 'Module 2: Emergency, Cardiopulmonary & Adult Nursing',
                'lectures': [
                    {
                        'id': 'prom-3',
                        'title': 'Triage Decision-Making & Resuscitation (ACLS/BLS)',
                        'duration': '50:00',
                        'notes': [
                            'Hospital triage categorization and acute rapid response protocols.',
                            'Cardiopulmonary resuscitation and airway emergency interventions.'
                        ]
                    },
                    {
                        'id': 'prom-4',
                        'title': 'Fluid, Electrolyte Imbalances & Surgical Care',
                        'duration': '45:00',
                        'notes': [
                            'Postoperative monitoring, wound care, and complication prevention.',
                            'Sodium and potassium imbalances: clinical manifestations and emergency treatment.'
                        ]
                    }
                ]
            },
            {
                'moduleTitle': 'Module 3: Obstetric, Pediatric & Prometric Recall Recaps',
                'lectures': [
                    {
                        'id': 'prom-5',
                        'title': 'Maternal-Newborn Complications & Pediatric Milestones',
                        'duration': '45:00',
                        'notes': [
                            'Preeclampsia, postpartum hemorrhage, and neonatal resuscitation.',
                            'Pediatric developmental milestones and immunization schedules.'
                        ]
                    },
                    {
                        'id': 'prom-6',
                        'title': 'High-Yield Gulf Prometric Recall Analysis',
                        'duration': '60:00',
                        'notes': [
                            'Real Prometric recall patterns with step-by-step rationales.',
                            'Clinical keyword triggers and error-prevention techniques.'
                        ]
                    }
                ]
            }
        ]

    # Default: NCLEX-RN Flagship Program
    return [
        {
            'moduleTitle': 'Module 1: Safe and Effective Care Environment & Client Advocacy',
            'lectures': [
                {
                    'id': 'nclex-1',
                    'title': 'Management of Care, Delegation & Legal Nursing Standards',
                    'duration': '50:00',
                    'notes': [
                        'The Five Rights of Delegation to UAP and LPN/LVN.',
                        'Informed consent, client rights, advance directives, and confidentiality (HIPAA).',
                        'Supervision, leadership principles, and ethical dilemmas in clinical practice.'
                    ]
                },
                {
                    'id': 'nclex-2',
                    'title': 'Safety and Infection Control & Accident Prevention',
                    'duration': '45:00',
                    'notes': [
                        'Standard vs transmission-based isolation precautions (airborne, droplet, contact).',
                        'Fall prevention, surgical asepsis, and restraint usage rules.',
                        'Disaster planning, triage tags (emergent/urgent/non-urgent/expectant).'
                    ]
                }
            ]
        },
        {
            'moduleTitle': 'Module 2: Health Promotion, Maintenance & Psychosocial Integrity',
            'lectures': [
                {
                    'id': 'nclex-3',
                    'title': 'Maternal, Newborn & Pediatric Growth and Development',
                    'duration': '55:00',
                    'notes': [
                        'Antepartum, intrapartum, postpartum care and obstetrical emergencies (abruptio vs previa).',
                        'Pediatric developmental stages (Erikson, Piaget) and congenital disorders.'
                    ]
                },
                {
                    'id': 'nclex-4',
                    'title': 'Psychosocial Integrity & Mental Health Nursing',
                    'duration': '45:00',
                    'notes': [
                        'Therapeutic communication techniques vs non-therapeutic responses.',
                        'Schizophrenia, bipolar disorder, depressive disorders, and crisis intervention.'
                    ]
                }
            ]
        },
        {
            'moduleTitle': 'Module 3: Physiological Integrity & Pharmacological Therapies',
            'lectures': [
                {
                    'id': 'nclex-5',
                    'title': 'High-Yield Pharmacology & Dosage Calculations',
                    'duration': '60:00',
                    'notes': [
                        'Cardiovascular drugs, antimicrobials, insulins, psychotropics, and anticoagulants.',
                        'Adverse effects, therapeutic drug monitoring levels, and nursing precautions.',
                        'Reconstitution, drop factor, and IV flow rate dosage calculations.'
                    ]
                },
                {
                    'id': 'nclex-6',
                    'title': 'Reduction of Risk Potential & Physiological Adaptation',
                    'duration': '55:00',
                    'notes': [
                        'Fluid and electrolyte imbalances (hyper/hypokalemia, hyponatremia) and ECG changes.',
                        'Acid-base balances (metabolic/respiratory acidosis and alkalosis) and ABG pearls.',
                        'Acute medical-surgical crises: shock, sepsis, DKA, PE, and stroke management.'
                    ]
                }
            ]
        },
        {
            'moduleTitle': 'Module 4: Next-Generation NCLEX (NGN) & Saunders Clinical Decision Making',
            'lectures': [
                {
                    'id': 'nclex-7',
                    'title': 'NCSBN Clinical Judgment Measurement Model (CJMM) 6 Cognitive Steps',
                    'duration': '65:00',
                    'notes': [
                        'Recognize cues, analyze cues, prioritize hypotheses, generate solutions, take action, evaluate outcomes.',
                        'Strategies for answering Bow-Tie, Extended Multiple Response, Matrix, and Trend items.'
                    ]
                },
                {
                    'id': 'nclex-8',
                    'title': 'Prioritization Frameworks (ABC, Acute vs Chronic, Maslow)',
                    'duration': '60:00',
                    'notes': [
                        'Saunders Core Rule: Never delay emergency assessment for a routine diagnostic check.',
                        'Differentiating expected vs unexpected findings in acute clinical post-op cases.'
                    ]
                }
            ]
        }
    ]


@courses_bp.route('/<int:course_id>', methods=['GET'])
def get_course(course_id):
    course = Course.find_by_id(course_id)
    if not course:
        return jsonify({'success': False, 'message': 'Course not found.'}), 404

    user_id = _current_user_id()
    enrolled = False
    status = None
    if user_id:
        enrollment = Enrollment.find(user_id, course_id)
        if enrollment:
            status = enrollment.status
            enrolled = (status == 'approved')

    course_data = course.to_dict(enrolled=enrolled, enrollment_status=status)
    course_data['curriculum'] = _get_course_curriculum(course, is_approved=enrolled)

    return jsonify({
        'success': True,
        'course': course_data
    }), 200


# ── ENROLL / REGISTER IN A COURSE (WITH PAYMENT SCREENSHOT) ─────────────────
@courses_bp.route('/<int:course_id>/enroll', methods=['POST'])
@jwt_required()
def enroll(course_id):
    user_id = get_jwt_identity()
    user = User.find_by_id(user_id)
    course = Course.find_by_id(course_id)
    if not course:
        return jsonify({'success': False, 'message': 'Course not found.'}), 404

    # Extract form or JSON data
    whatsapp_number = ''
    transaction_id = ''
    notes = ''
    payment_screenshot = ''

    if request.is_json:
        data = request.get_json(silent=True) or {}
        whatsapp_number = data.get('whatsapp_number') or data.get('whatsappNumber') or ''
        transaction_id = data.get('transaction_id') or data.get('transactionId') or ''
        notes = data.get('notes') or ''
        payment_screenshot = data.get('payment_screenshot') or data.get('paymentScreenshot') or ''
    else:
        whatsapp_number = request.form.get('whatsapp_number') or request.form.get('whatsappNumber') or ''
        transaction_id = request.form.get('transaction_id') or request.form.get('transactionId') or ''
        notes = request.form.get('notes') or ''
        payment_screenshot = request.form.get('payment_screenshot') or request.form.get('paymentScreenshot') or ''

    # Handle payment receipt screenshot file upload
    file = request.files.get('screenshot') or request.files.get('payment_screenshot') or request.files.get('paymentScreenshot')
    if file and file.filename:
        filename = secure_filename(file.filename)
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf']:
            ext = '.jpg'
        saved_filename = f"pay_u{user_id}_c{course_id}_{uuid.uuid4().hex[:8]}{ext}"
        upload_folder = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'uploads', 'payments')
        os.makedirs(upload_folder, exist_ok=True)
        file.save(os.path.join(upload_folder, saved_filename))
        payment_screenshot = f"/uploads/payments/{saved_filename}"

    existing = Enrollment.find(user_id, course_id)
    if existing:
        if existing.status == 'approved':
            return jsonify({
                'success': False,
                'status': 'approved',
                'message': 'You are already enrolled with approved access to this course.'
            }), 409

        # If resubmitting or updating payment screenshot for pending/rejected
        if user and user.role != 'admin':
            if not payment_screenshot and not existing.payment_screenshot:
                return jsonify({
                    'success': False,
                    'message': 'Please upload your Easypaisa/Bank payment screenshot receipt.'
                }), 400
            if not whatsapp_number and not existing.whatsapp_number:
                return jsonify({
                    'success': False,
                    'message': 'Please provide your WhatsApp number for Google Meet class invites.'
                }), 400

        updated_notes = notes or ('Student updated payment receipt.' if existing.status == 'pending' else 'Student resubmitted enrollment with payment receipt.')
        Enrollment.update_payment_submission(
            existing.id,
            whatsapp_number=whatsapp_number or None,
            payment_screenshot=payment_screenshot or None,
            transaction_id=transaction_id or None,
            notes=updated_notes
        )
        user_name = f"{user.first_name} {user.last_name}".strip() if user else f"User #{user_id}"
        ActivityLog.log(
            'Enrollment Payment Submitted',
            f'{user_name} submitted/updated payment receipt for "{course.title}" (WhatsApp: {whatsapp_number or existing.whatsapp_number})',
            user_id,
            user.email if user else None
        )
        return jsonify({
            'success': True,
            'status': 'pending',
            'message': f'Payment receipt submitted for "{course.title}"! Admin will review your screenshot and add you to the WhatsApp group for Google Meet live classes.',
            'enrollment': Enrollment.find_by_id(existing.id).to_dict()
        }), 200

    # Auto-approve only if user is an admin
    is_admin = (user and user.role == 'admin')
    if not is_admin:
        if not payment_screenshot:
            return jsonify({
                'success': False,
                'message': 'Please upload your Easypaisa/Bank payment screenshot receipt.'
            }), 400
        if not whatsapp_number:
            return jsonify({
                'success': False,
                'message': 'Please provide your WhatsApp number so we can add you to the Google Meet live class group.'
            }), 400

    init_status = 'approved' if is_admin else 'pending'
    enrollment = Enrollment.create(
        user_id,
        course_id,
        status=init_status,
        notes=notes or ('Admin self-enrollment' if is_admin else 'Payment receipt uploaded, pending verification'),
        whatsapp_number=whatsapp_number,
        payment_screenshot=payment_screenshot,
        transaction_id=transaction_id
    )

    user_name = f"{user.first_name} {user.last_name}".strip() if user else f"User #{user_id}"
    user_email = user.email if user else None

    if init_status == 'approved':
        ActivityLog.log(
            'Admin Enrolled',
            f'Admin {user_name} self-enrolled into "{course.title}"',
            user_id,
            user_email
        )
        msg = f'Enrolled successfully in "{course.title}"!'
    else:
        ActivityLog.log(
            'Course Enrollment Submitted',
            f'{user_name} ({user_email}) submitted enrollment payment for "{course.title}" (WhatsApp: {whatsapp_number}, TrxID: {transaction_id or "N/A"})',
            user_id,
            user_email
        )
        msg = f'Enrollment submitted for "{course.title}"! Our team will verify your Easypaisa screenshot and add you to the WhatsApp group for Google Meet live classes.'

    return jsonify({
        'success':    True,
        'status':     init_status,
        'message':    msg,
        'enrollment': enrollment.to_dict(),
    }), 201


# ── UPDATE COURSE PROGRESS ────────────────────────────────────────────────────
@courses_bp.route('/<int:course_id>/progress', methods=['PUT'])
@jwt_required()
def update_progress(course_id):
    user_id    = get_jwt_identity()
    enrollment = Enrollment.find(user_id, course_id)
    if not enrollment or enrollment.status != 'approved':
        return jsonify({'success': False, 'message': 'You must have an approved enrollment in this course.'}), 404

    data     = request.get_json(silent=True) or {}
    progress = data.get('progress', enrollment.progress)

    try:
        progress = max(0, min(100, int(progress)))
    except (ValueError, TypeError):
        return jsonify({'success': False, 'message': 'Progress must be an integer between 0 and 100.'}), 422

    Enrollment.update_progress(user_id, course_id, progress)
    return jsonify({
        'success':  True,
        'message':  'Progress updated.',
        'progress': progress,
    }), 200


# ==============================================================================
# 7. ADMIN MANAGEMENT REST API ROUTES (/api/admin)
# ==============================================================================
admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# ── STATS & DASHBOARD OVERVIEW ────────────────────────────────────────────────
@admin_bp.route('/stats', methods=['GET'])
@admin_required()
def get_stats():
    db = get_db()

    # User counts
    cur = db.execute("""
        SELECT
            COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
            COUNT(CASE WHEN role != 'admin' THEN 1 END) as student_count,
            COUNT(*) as total_users
        FROM users
    """)
    u_counts = dict(cur.fetchone())

    # Registration / Enrollment counts
    cur = db.execute("""
        SELECT
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
            COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
            COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
            COUNT(*) as total_enrollments
        FROM enrollments
    """)
    e_counts = dict(cur.fetchone())

    # Total courses count
    cur = db.execute("SELECT COUNT(*) FROM courses")
    total_courses = cur.fetchone()[0]

    # Revenue estimation from approved enrollments
    cur = db.execute("""
        SELECT COALESCE(SUM(c.price), 0) as total_revenue
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.status = 'approved'
    """)
    total_revenue = float(cur.fetchone()[0])

    # Recent pending registrations
    recent_pending = Enrollment.all_with_details(status='pending')[:5]

    # Recent activity logs
    recent_activities = ActivityLog.recent(limit=10)

    return jsonify({
        'success': True,
        'stats': {
            'totalStudents': u_counts['student_count'],
            'totalAdmins': u_counts['admin_count'],
            'totalUsers': u_counts['total_users'],
            'totalCourses': total_courses,
            'pendingRegistrations': e_counts['pending_count'],
            'approvedEnrollments': e_counts['approved_count'],
            'rejectedRegistrations': e_counts['rejected_count'],
            'totalEnrollments': e_counts['total_enrollments'],
            'totalRevenue': total_revenue,
        },
        'recentPending': recent_pending,
        'recentActivities': recent_activities,
    }), 200


# ── COURSE REGISTRATIONS (APPROVAL WORKFLOW) ──────────────────────────────────
@admin_bp.route('/registrations', methods=['GET'])
@admin_required()
def list_registrations():
    status = request.args.get('status', 'all').strip()
    query  = request.args.get('q', '').strip()

    items = Enrollment.all_with_details(status=status, query=query)
    counts = Enrollment.count_by_status()

    return jsonify({
        'success': True,
        'registrations': items,
        'counts': counts,
        'total': len(items)
    }), 200


@admin_bp.route('/registrations/<int:reg_id>/approve', methods=['PUT'])
@admin_required()
def approve_registration(reg_id):
    enrollment = Enrollment.find_by_id(reg_id)
    if not enrollment:
        return jsonify({'success': False, 'message': 'Registration not found.'}), 404

    data = request.get_json(silent=True) or {}
    notes = data.get('notes', 'Approved by administrator')

    updated = Enrollment.update_status(reg_id, 'approved', notes=notes)
    admin_user = g.current_user
    admin_name = f"{admin_user.first_name} {admin_user.last_name}".strip()

    # Get student & course details for logging
    db = get_db()
    cur = db.execute("""
        SELECT u.first_name, u.last_name, u.email, c.title
        FROM enrollments e
        JOIN users u ON e.user_id = u.id
        JOIN courses c ON e.course_id = c.id
        WHERE e.id = ?
    """, (reg_id,))
    row = cur.fetchone()
    if row:
        student_name = f"{row['first_name']} {row['last_name']}".strip()
        course_title = row['title']
        ActivityLog.log(
            'Registration Approved',
            f'Admin {admin_name} approved registration #{reg_id} for {student_name} ({row["email"]}) in "{course_title}"',
            admin_user.id,
            admin_user.email
        )

    return jsonify({
        'success': True,
        'message': 'Course registration has been APPROVED! Student now has full course access.',
        'registration': updated.to_dict() if updated else None
    }), 200


@admin_bp.route('/registrations/<int:reg_id>/reject', methods=['PUT'])
@admin_required()
def reject_registration(reg_id):
    enrollment = Enrollment.find_by_id(reg_id)
    if not enrollment:
        return jsonify({'success': False, 'message': 'Registration not found.'}), 404

    data = request.get_json(silent=True) or {}
    notes = data.get('notes', 'Registration declined by administrator.')

    updated = Enrollment.update_status(reg_id, 'rejected', notes=notes)
    admin_user = g.current_user
    admin_name = f"{admin_user.first_name} {admin_user.last_name}".strip()

    db = get_db()
    cur = db.execute("""
        SELECT u.first_name, u.last_name, u.email, c.title
        FROM enrollments e
        JOIN users u ON e.user_id = u.id
        JOIN courses c ON e.course_id = c.id
        WHERE e.id = ?
    """, (reg_id,))
    row = cur.fetchone()
    if row:
        student_name = f"{row['first_name']} {row['last_name']}".strip()
        course_title = row['title']
        ActivityLog.log(
            'Registration Rejected',
            f'Admin {admin_name} rejected registration #{reg_id} for {student_name} in "{course_title}". Reason: {notes}',
            admin_user.id,
            admin_user.email
        )

    return jsonify({
        'success': True,
        'message': 'Course registration has been REJECTED.',
        'registration': updated.to_dict() if updated else None
    }), 200


@admin_bp.route('/registrations/<int:reg_id>', methods=['DELETE'])
@admin_required()
def delete_registration(reg_id):
    enrollment = Enrollment.find_by_id(reg_id)
    if not enrollment:
        return jsonify({'success': False, 'message': 'Registration not found.'}), 404

    Enrollment.delete(reg_id)
    admin_user = g.current_user
    admin_name = f"{admin_user.first_name} {admin_user.last_name}".strip()
    ActivityLog.log(
        'Registration Deleted',
        f'Admin {admin_name} deleted registration record #{reg_id}',
        admin_user.id,
        admin_user.email
    )

    return jsonify({'success': True, 'message': 'Registration record deleted successfully.'}), 200


@admin_bp.route('/registrations/manual', methods=['POST'])
@admin_required()
def manual_registration():
    data = request.get_json(silent=True) or {}
    user_id = data.get('userId')
    course_id = data.get('courseId')
    status = data.get('status', 'approved')
    notes = data.get('notes', 'Manual grant by admin')

    if not user_id or not course_id:
        return jsonify({'success': False, 'message': 'User ID and Course ID are required.'}), 422

    user = User.find_by_id(user_id)
    course = Course.find_by_id(course_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found.'}), 404
    if not course:
        return jsonify({'success': False, 'message': 'Course not found.'}), 404

    existing = Enrollment.find(user_id, course_id)
    if existing:
        Enrollment.update_status(existing.id, status, notes=notes)
        return jsonify({'success': True, 'message': 'Updated existing registration status.', 'registration': Enrollment.find_by_id(existing.id).to_dict()}), 200

    new_reg = Enrollment.create(user_id, course_id, status=status, notes=notes)
    admin_user = g.current_user
    admin_name = f"{admin_user.first_name} {admin_user.last_name}".strip()
    ActivityLog.log(
        'Manual Course Registration',
        f'Admin {admin_name} manually enrolled {user.first_name} {user.last_name} into "{course.title}" ({status})',
        admin_user.id,
        admin_user.email
    )

    return jsonify({
        'success': True,
        'message': f'Successfully registered {user.first_name} for "{course.title}"!',
        'registration': new_reg.to_dict()
    }), 201


# ── COURSE MANAGEMENT & PICTURE EDITING ───────────────────────────────────────
@admin_bp.route('/courses', methods=['GET'])
@admin_required()
def list_courses():
    courses = Course.all()
    db = get_db()

    # Get enrollment counts per course
    cur = db.execute("""
        SELECT course_id,
               COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
               COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
               COUNT(*) as total_count
        FROM enrollments
        GROUP BY course_id
    """)
    enrollment_counts = {r['course_id']: dict(r) for r in cur.fetchall()}

    results = []
    for c in courses:
        cd = c.to_dict()
        counts = enrollment_counts.get(c.id, {'pending_count': 0, 'approved_count': 0, 'total_count': 0})
        cd['pendingCount'] = counts['pending_count']
        cd['approvedCount'] = counts['approved_count']
        cd['totalRegistrations'] = counts['total_count']
        results.append(cd)

    return jsonify({'success': True, 'courses': results, 'total': len(results)}), 200


@admin_bp.route('/courses', methods=['POST'])
@admin_required()
def create_course():
    data = request.get_json(silent=True) or {}
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    category = data.get('category', '').strip()
    price = data.get('price')

    if not title:
        return jsonify({'success': False, 'message': 'Course title is required.'}), 422
    if not description:
        return jsonify({'success': False, 'message': 'Course description is required.'}), 422
    if not category:
        return jsonify({'success': False, 'message': 'Category is required.'}), 422
    if price is None:
        return jsonify({'success': False, 'message': 'Price is required.'}), 422

    try:
        price = float(price)
        original_price = float(data.get('originalPrice', price))
    except (ValueError, TypeError):
        return jsonify({'success': False, 'message': 'Invalid price value.'}), 422

    course = Course.create(
        title=title,
        description=description,
        category=category,
        price=price,
        original_price=original_price,
        rating=float(data.get('rating', 4.8)),
        students_count=int(data.get('studentsCount', 0)),
        duration_hours=int(data.get('durationHours', 0)),
        emoji=data.get('emoji', '📚'),
        image_url=data.get('imageUrl', '').strip(),
        badge_text=data.get('badgeText'),
        badge_style=data.get('badgeStyle', 'accent'),
        level=data.get('level', 'All Levels'),
        is_featured=bool(data.get('isFeatured', False)),
        questions_count=int(data.get('questionsCount', 0))
    )

    admin_user = g.current_user
    admin_name = f"{admin_user.first_name} {admin_user.last_name}".strip()
    ActivityLog.log(
        'Course Created',
        f'Admin {admin_name} created course "{course.title}" (${course.price})',
        admin_user.id,
        admin_user.email
    )

    return jsonify({
        'success': True,
        'message': f'Course "{course.title}" created successfully!',
        'course': course.to_dict()
    }), 201


@admin_bp.route('/courses/<int:course_id>', methods=['PUT'])
@admin_required()
def update_course(course_id):
    course = Course.find_by_id(course_id)
    if not course:
        return jsonify({'success': False, 'message': 'Course not found.'}), 404

    data = request.get_json(silent=True) or {}
    update_data = {}

    field_map = {
        'title': 'title',
        'description': 'description',
        'category': 'category',
        'price': 'price',
        'originalPrice': 'original_price',
        'rating': 'rating',
        'studentsCount': 'students_count',
        'durationHours': 'duration_hours',
        'emoji': 'emoji',
        'imageUrl': 'image_url',
        'badgeText': 'badge_text',
        'badgeStyle': 'badge_style',
        'level': 'level',
        'isFeatured': 'is_featured',
        'questionsCount': 'questions_count',
    }

    for json_key, db_col in field_map.items():
        if json_key in data:
            val = data[json_key]
            if json_key in ('price', 'originalPrice', 'rating') and val is not None:
                val = float(val)
            elif json_key in ('studentsCount', 'durationHours', 'questionsCount') and val is not None:
                val = int(val)
            elif json_key == 'imageUrl' and val is not None:
                val = str(val).strip()
            update_data[db_col] = val

    updated = Course.update(course_id, **update_data)
    admin_user = g.current_user
    admin_name = f"{admin_user.first_name} {admin_user.last_name}".strip()
    ActivityLog.log(
        'Course Updated',
        f'Admin {admin_name} updated course "{updated.title}" (including pictures/details)',
        admin_user.id,
        admin_user.email
    )

    return jsonify({
        'success': True,
        'message': f'Course "{updated.title}" updated successfully!',
        'course': updated.to_dict()
    }), 200


@admin_bp.route('/courses/<int:course_id>', methods=['DELETE'])
@admin_required()
def delete_course(course_id):
    course = Course.find_by_id(course_id)
    if not course:
        return jsonify({'success': False, 'message': 'Course not found.'}), 404

    title = course.title
    Course.delete(course_id)
    admin_user = g.current_user
    admin_name = f"{admin_user.first_name} {admin_user.last_name}".strip()
    ActivityLog.log(
        'Course Deleted',
        f'Admin {admin_name} deleted course "{title}" (id #{course_id})',
        admin_user.id,
        admin_user.email
    )

    return jsonify({'success': True, 'message': f'Course "{title}" was successfully deleted.'}), 200


# ── PICTURE / IMAGE UPLOAD ────────────────────────────────────────────────────
@admin_bp.route('/upload', methods=['POST'])
@admin_required()
def upload_file():
    if 'image' not in request.files:
        return jsonify({'success': False, 'message': 'No image file uploaded in request.'}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({'success': False, 'message': 'Empty file selected.'}), 400

    if not allowed_file(file.filename):
        return jsonify({
            'success': False,
            'message': f'Invalid file format. Allowed formats: {", ".join(ALLOWED_EXTENSIONS)}'
        }), 400

    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    upload_dir = os.path.join(root_dir, 'uploads', 'courses')
    os.makedirs(upload_dir, exist_ok=True)

    orig_name = secure_filename(file.filename)
    ext = orig_name.rsplit('.', 1)[1].lower() if '.' in orig_name else 'jpg'
    unique_name = f"course_{uuid.uuid4().hex[:12]}.{ext}"
    dest_path = os.path.join(upload_dir, unique_name)

    file.save(dest_path)
    file_url = f"/uploads/courses/{unique_name}"

    admin_user = g.current_user
    admin_name = f"{admin_user.first_name} {admin_user.last_name}".strip()
    ActivityLog.log(
        'Image Uploaded',
        f'Admin {admin_name} uploaded course picture {unique_name}',
        admin_user.id,
        admin_user.email
    )

    return jsonify({
        'success': True,
        'message': 'Image uploaded successfully!',
        'url': file_url,
        'filename': unique_name
    }), 201


# ── COURSE CURRICULUM & VIDEOS MANAGEMENT ─────────────────────────────────────
@admin_bp.route('/courses/<int:course_id>/curriculum', methods=['GET'])
@admin_required()
def get_course_curriculum_admin(course_id):
    course = Course.find_by_id(course_id)
    if not course:
        return jsonify({'success': False, 'message': 'Course not found.'}), 404

    curriculum = []
    if course.curriculum_data:
        try:
            raw_curriculum = json.loads(course.curriculum_data)
            if isinstance(raw_curriculum, list):
                for m in raw_curriculum:
                    m_title = (m.get('moduleTitle') or '').lower()
                    if 'demo' in m_title or 'preview' in m_title:
                        continue
                    clean_lecs = []
                    for lec in m.get('lectures', []):
                        l_title = (lec.get('title') or '').lower()
                        if 'demo' in l_title or 'preview' in l_title:
                            continue
                        clean_lec = dict(lec)
                        clean_lec.pop('videoUrl', None)
                        clean_lec.pop('isPreview', None)
                        clean_lecs.append(clean_lec)
                    if clean_lecs:
                        m_copy = dict(m)
                        m_copy['lectures'] = clean_lecs
                        curriculum.append(m_copy)
        except Exception:
            curriculum = []

    if not curriculum:
        # Fallback to default curriculum blueprint
        # _get_course_curriculum is defined above
        curriculum = _get_course_curriculum(course, is_approved=True)

    return jsonify({
        'success': True,
        'courseId': course.id,
        'courseTitle': course.title,
        'curriculum': curriculum
    }), 200


@admin_bp.route('/courses/<int:course_id>/curriculum', methods=['PUT'])
@admin_required()
def save_course_curriculum_admin(course_id):
    course = Course.find_by_id(course_id)
    if not course:
        return jsonify({'success': False, 'message': 'Course not found.'}), 404

    data = request.get_json(silent=True) or {}
    curriculum = data.get('curriculum')
    if not isinstance(curriculum, list):
        return jsonify({'success': False, 'message': 'Curriculum must be a list of modules.'}), 400

    curriculum_json = json.dumps(curriculum)
    updated = Course.update_curriculum(course_id, curriculum_json)

    admin_user = g.current_user
    admin_name = f"{admin_user.first_name} {admin_user.last_name}".strip()
    total_lectures = sum(len(m.get('lectures', [])) for m in curriculum)
    ActivityLog.log(
        'Curriculum Updated',
        f'Admin {admin_name} updated curriculum for "{course.title}" ({len(curriculum)} modules, {total_lectures} sessions)',
        admin_user.id,
        admin_user.email
    )

    return jsonify({
        'success': True,
        'message': f'Curriculum for "{course.title}" saved successfully!',
        'course': updated.to_dict()
    }), 200


# ── USER MANAGEMENT ───────────────────────────────────────────────────────────
@admin_bp.route('/users', methods=['GET'])
@admin_required()
def list_users():
    q = request.args.get('q', '').strip()
    users = User.all(query=q)
    return jsonify({'success': True, 'users': users, 'total': len(users)}), 200


@admin_bp.route('/users/<int:user_id>/role', methods=['PUT'])
@admin_required()
def update_user_role(user_id):
    admin_user = g.current_user
    if admin_user.id == user_id:
        return jsonify({'success': False, 'message': 'You cannot change your own admin role.'}), 400

    data = request.get_json(silent=True) or {}
    role = data.get('role', 'student').strip()
    if role not in ('admin', 'student'):
        return jsonify({'success': False, 'message': 'Role must be either "admin" or "student".'}), 422

    user = User.find_by_id(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found.'}), 404

    updated = User.update_role(user_id, role)
    admin_name = f"{admin_user.first_name} {admin_user.last_name}".strip()
    ActivityLog.log(
        'User Role Changed',
        f'Admin {admin_name} changed role of {user.first_name} {user.last_name} ({user.email}) to "{role}"',
        admin_user.id,
        admin_user.email
    )

    return jsonify({'success': True, 'message': f'Role updated to {role}.', 'user': updated.to_dict()}), 200


@admin_bp.route('/users/<int:user_id>/status', methods=['PUT'])
@admin_required()
def toggle_user_status(user_id):
    admin_user = g.current_user
    if admin_user.id == user_id:
        return jsonify({'success': False, 'message': 'You cannot deactivate your own account.'}), 400

    data = request.get_json(silent=True) or {}
    is_active = bool(data.get('isActive', True))

    user = User.find_by_id(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found.'}), 404

    updated = User.toggle_active(user_id, is_active)
    status_str = "activated" if is_active else "deactivated"
    admin_name = f"{admin_user.first_name} {admin_user.last_name}".strip()
    ActivityLog.log(
        'User Status Changed',
        f'Admin {admin_name} {status_str} account for {user.first_name} {user.last_name} ({user.email})',
        admin_user.id,
        admin_user.email
    )

    return jsonify({
        'success': True,
        'message': f'User account has been {status_str}.',
        'user': updated.to_dict()
    }), 200


@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@admin_required()
def update_user_details(user_id):
    user = User.find_by_id(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found.'}), 404

    data = request.get_json(silent=True) or {}
    first_name = data.get('firstName', user.first_name).strip()
    last_name = data.get('lastName', user.last_name).strip()
    email = data.get('email', user.email).strip().lower()
    exam_type = data.get('examType', user.exam_type)
    role = data.get('role', user.role).strip().lower()
    is_active = data.get('isActive', user.is_active)

    if not first_name or not last_name or not email:
        return jsonify({'success': False, 'message': 'First name, last name, and email are required.'}), 422

    if role not in ('admin', 'student'):
        return jsonify({'success': False, 'message': 'Role must be either "admin" or "student".'}), 422

    # Prevent current admin from revoking own admin or deactivating self
    admin_user = g.current_user
    if admin_user.id == user_id:
        if role != 'admin':
            return jsonify({'success': False, 'message': 'You cannot revoke your own admin privileges.'}), 400
        if not is_active:
            return jsonify({'success': False, 'message': 'You cannot deactivate your own account.'}), 400

    # Check for email collision
    existing = User.find_by_email(email)
    if existing and existing.id != user_id:
        return jsonify({'success': False, 'message': 'This email address is already taken by another account.'}), 409

    password = data.get('password', '').strip()
    update_kwargs = {
        'first_name': first_name,
        'last_name': last_name,
        'email': email,
        'exam_type': exam_type,
        'role': role,
        'is_active': is_active
    }
    if password:
        update_kwargs['password_hash'] = generate_password_hash(password)
        update_kwargs['plain_password'] = password

    updated = User.update(user_id, **update_kwargs)

    admin_name = f"{admin_user.first_name} {admin_user.last_name}".strip()
    ActivityLog.log(
        'User Details Updated',
        f'Admin {admin_name} updated personal profile for {updated.first_name} {updated.last_name} ({updated.email})',
        admin_user.id,
        admin_user.email
    )

    return jsonify({
        'success': True,
        'message': f'Personal details for {updated.first_name} {updated.last_name} updated successfully!',
        'user': updated.to_dict()
    }), 200


@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@admin_required()
def delete_user(user_id):
    admin_user = g.current_user
    if admin_user.id == user_id:
        return jsonify({'success': False, 'message': 'You cannot delete your own account.'}), 400

    user = User.find_by_id(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found.'}), 404

    user_name = f"{user.first_name} {user.last_name}".strip()
    user_email = user.email
    User.delete(user_id)

    admin_name = f"{admin_user.first_name} {admin_user.last_name}".strip()
    ActivityLog.log(
        'User Deleted',
        f'Admin {admin_name} deleted user {user_name} ({user_email})',
        admin_user.id,
        admin_user.email
    )

    return jsonify({'success': True, 'message': f'User {user_name} was deleted successfully.'}), 200


# ── ACTIVITY LOGS (AUDIT TRAIL) ───────────────────────────────────────────────
@admin_bp.route('/activities', methods=['GET'])
@admin_required()
def list_activities():
    limit = int(request.args.get('limit', 100))
    logs = ActivityLog.recent(limit=min(limit, 200))
    return jsonify({'success': True, 'activities': logs, 'total': len(logs)}), 200


# ── SITE SETTINGS & PERSONAL DETAILS MANAGEMENT ──────────────────────────────
@admin_bp.route('/settings', methods=['GET'])
@admin_required()
def get_site_settings():
    settings = SiteSetting.get_all()
    return jsonify({'success': True, 'settings': settings}), 200


@admin_bp.route('/settings', methods=['POST'])
@admin_required()
def update_site_settings():
    data = request.get_json(silent=True) or {}
    updated_settings = SiteSetting.set_many(data)

    admin_user = g.current_user
    admin_name = f"{admin_user.first_name} {admin_user.last_name}".strip()
    ActivityLog.log(
        'Site Settings Updated',
        f'Admin {admin_name} updated site content and personal/instructor details ({len(data)} settings)',
        admin_user.id,
        admin_user.email
    )

    return jsonify({
        'success': True,
        'message': 'Platform content and personal details updated successfully!',
        'settings': updated_settings
    }), 200


@admin_bp.route('/public-settings', methods=['GET'])
def get_public_site_settings():
    settings = SiteSetting.get_all()
    return jsonify({'success': True, 'settings': settings}), 200


# ── DEMO MCQS MANAGEMENT ───────────────────────────────────────────────────
@admin_bp.route('/demo-mcqs', methods=['GET'])
@admin_required()
def list_demo_mcqs():
    mcqs = DemoMCQ.all()
    return jsonify({
        'success': True,
        'mcqs': [m.to_dict() for m in mcqs],
        'total': len(mcqs)
    }), 200


@admin_bp.route('/demo-mcqs/<int:mcq_id>', methods=['GET'])
@admin_required()
def get_demo_mcq(mcq_id):
    mcq = DemoMCQ.find_by_id(mcq_id)
    if not mcq:
        return jsonify({'success': False, 'message': 'Demo MCQ not found.'}), 404
    return jsonify({'success': True, 'mcq': mcq.to_dict()}), 200


@admin_bp.route('/demo-mcqs', methods=['POST'])
@admin_required()
def create_demo_mcq():
    data = request.get_json(silent=True) or {}
    statement = data.get('statement', '').strip()
    options = data.get('options', [])
    category = data.get('category', 'NCLEX-RN • Pharmacology & Client Needs').strip()
    difficulty = data.get('difficulty', 'High Yield').strip()
    client_need = (data.get('clientNeed') or data.get('client_need') or '').strip()
    correct_index = int(data.get('correctIndex', data.get('correct_index', 0)))

    desc = data.get('description', {})
    correct_rationale = data.get('correctRationale') or data.get('correct_rationale') or (desc.get('correctRationale') if isinstance(desc, dict) else '')
    distractors = data.get('distractors') or (desc.get('distractors') if isinstance(desc, dict) else [])
    clinical_pearl = data.get('clinicalPearl') or data.get('clinical_pearl') or (desc.get('clinicalPearl') if isinstance(desc, dict) else '')
    sort_order = int(data.get('sortOrder', data.get('sort_order', 0)))

    if not statement:
        return jsonify({'success': False, 'message': 'Question statement is required.'}), 400
    if not isinstance(options, list) or len(options) < 2:
        return jsonify({'success': False, 'message': 'At least 2 options are required.'}), 400

    new_mcq = DemoMCQ.create(
        category=category,
        difficulty=difficulty,
        statement=statement,
        options=options,
        correct_index=correct_index,
        correct_rationale=correct_rationale or '',
        distractors=distractors,
        clinical_pearl=clinical_pearl or '',
        client_need=client_need,
        sort_order=sort_order
    )

    admin_user = g.current_user
    admin_name = f"{admin_user.first_name} {admin_user.last_name}".strip()
    ActivityLog.log(
        'Demo MCQ Created',
        f'Admin {admin_name} created new demo MCQ #{new_mcq.id}: "{new_mcq.statement[:40]}..."',
        admin_user.id,
        admin_user.email
    )

    return jsonify({
        'success': True,
        'message': 'Demo MCQ created successfully!',
        'mcq': new_mcq.to_dict()
    }), 201


@admin_bp.route('/demo-mcqs/<int:mcq_id>', methods=['PUT'])
@admin_required()
def update_demo_mcq(mcq_id):
    mcq = DemoMCQ.find_by_id(mcq_id)
    if not mcq:
        return jsonify({'success': False, 'message': 'Demo MCQ not found.'}), 404

    data = request.get_json(silent=True) or {}
    statement = data.get('statement', mcq.statement).strip()
    options = data.get('options', mcq.options)
    category = data.get('category', mcq.category).strip()
    difficulty = data.get('difficulty', mcq.difficulty).strip()
    client_need = (data.get('clientNeed') or data.get('client_need') or mcq.client_need).strip()
    correct_index = int(data.get('correctIndex', data.get('correct_index', mcq.correct_index)))

    desc = data.get('description', {})
    correct_rationale = data.get('correctRationale', data.get('correct_rationale', (desc.get('correctRationale') if isinstance(desc, dict) else mcq.correct_rationale)))
    distractors = data.get('distractors', (desc.get('distractors') if isinstance(desc, dict) else mcq.distractors))
    clinical_pearl = data.get('clinicalPearl', data.get('clinical_pearl', (desc.get('clinicalPearl') if isinstance(desc, dict) else mcq.clinical_pearl)))
    sort_order = int(data.get('sortOrder', data.get('sort_order', mcq.sort_order)))

    if not statement:
        return jsonify({'success': False, 'message': 'Question statement cannot be empty.'}), 400
    if not isinstance(options, list) or len(options) < 2:
        return jsonify({'success': False, 'message': 'At least 2 options are required.'}), 400

    updated = DemoMCQ.update(
        mcq_id,
        category=category,
        difficulty=difficulty,
        statement=statement,
        options=options,
        correct_index=correct_index,
        correct_rationale=correct_rationale or '',
        distractors=distractors,
        clinical_pearl=clinical_pearl or '',
        client_need=client_need,
        sort_order=sort_order
    )

    admin_user = g.current_user
    admin_name = f"{admin_user.first_name} {admin_user.last_name}".strip()
    ActivityLog.log(
        'Demo MCQ Updated',
        f'Admin {admin_name} updated demo MCQ #{mcq_id}',
        admin_user.id,
        admin_user.email
    )

    return jsonify({
        'success': True,
        'message': f'Demo MCQ #{mcq_id} updated successfully!',
        'mcq': updated.to_dict()
    }), 200


@admin_bp.route('/demo-mcqs/<int:mcq_id>', methods=['DELETE'])
@admin_required()
def delete_demo_mcq(mcq_id):
    mcq = DemoMCQ.find_by_id(mcq_id)
    if not mcq:
        return jsonify({'success': False, 'message': 'Demo MCQ not found.'}), 404

    DemoMCQ.delete(mcq_id)

    admin_user = g.current_user
    admin_name = f"{admin_user.first_name} {admin_user.last_name}".strip()
    ActivityLog.log(
        'Demo MCQ Deleted',
        f'Admin {admin_name} deleted demo MCQ #{mcq_id}',
        admin_user.id,
        admin_user.email
    )

    return jsonify({'success': True, 'message': f'Demo MCQ #{mcq_id} deleted successfully.'}), 200


@admin_bp.route('/demo-mcqs/reset', methods=['POST'])
@admin_required()
def reset_demo_mcqs():
    mcqs = DemoMCQ.reset_to_defaults()
    admin_user = g.current_user
    admin_name = f"{admin_user.first_name} {admin_user.last_name}".strip()
    ActivityLog.log(
        'Demo MCQs Reset',
        f'Admin {admin_name} reset all demo MCQs to original defaults',
        admin_user.id,
        admin_user.email
    )
    return jsonify({
        'success': True,
        'message': 'All Demo MCQs have been reset to original default questions.',
        'mcqs': [m.to_dict() for m in mcqs]
    }), 200


# ==============================================================================
# 8. SEED DATA & PUBLIC ENDPOINTS
# ==============================================================================
def seed_courses():
    """Populate the database with strictly NCLEX-RN, SNLE, and Prometric courses."""
    db = get_db()
    cursor = db.cursor()
    rows = cursor.execute("SELECT category FROM courses").fetchall()
    categories = {r['category'] for r in rows}
    if categories == {'nclex-rn', 'snle', 'prometric'}:
        return

    cursor.execute("DELETE FROM courses")
    db.commit()

    sample_courses = [
        dict(
            title='NCLEX-RN Complete Prep 2026',
            description='The premier NCLEX-RN preparation course covering all 8 NCSBN Client Needs categories, Saunders & ATI clinical rationales, 48+ hours of live classes, and complete Next Generation NCLEX (NGN) case studies.',
            category='nclex-rn',
            price=0, original_price=0,
            rating=4.9, students_count=18240,
            duration_hours=48, emoji='🏥',
            badge_text='Global Licensure', badge_style='accent',
            level='Beginner → Pro',
            is_featured=True, questions_count=2500,
        ),
        dict(
            title='SNLE (Saudi Nursing Licensing Exam) Material',
            description='Targeted preparation aligned with the official Saudi Commission for Health Specialties (SCFHS) blueprint. High-yield recall questions, adult medical-surgical, maternal-child, and critical care nursing.',
            category='snle',
            price=0, original_price=0,
            rating=4.9, students_count=9850,
            duration_hours=36, emoji='🇸🇦',
            badge_text='SCFHS Aligned', badge_style='green',
            level='Beginner → Pro',
            is_featured=False, questions_count=2000,
        ),
        dict(
            title='Prometric Nursing Exam Material (DHA, MOH, Qatar, Oman)',
            description='Comprehensive question bank and live class reviews for Gulf health authorities (Dubai DHA, Abu Dhabi HAAD/DoH, UAE MOH, Qatar Prometric QCHP, and Oman OMSB Prometric exams).',
            category='prometric',
            price=0, original_price=0,
            rating=4.8, students_count=12400,
            duration_hours=32, emoji='🌐',
            badge_text='Gulf Licensing', badge_style='teal',
            level='All Levels',
            is_featured=False, questions_count=2200,
        ),
    ]

    for c in sample_courses:
        Course.create(**c)


# ==============================================================================
# 9. APPLICATION FACTORY & ROUTE MOUNTING
# ==============================================================================
def create_app():
    root_dir = BASE_DIR
    app = Flask(
        __name__,
        static_folder=os.path.join(root_dir, 'static'),
        template_folder=os.path.join(root_dir, 'templates')
    )

    app.config['SECRET_KEY'] = Config.SECRET_KEY
    app.config['MAX_CONTENT_LENGTH'] = Config.MAX_CONTENT_LENGTH

    os.makedirs(os.path.join(root_dir, 'uploads', 'payments'), exist_ok=True)
    os.makedirs(os.path.join(root_dir, 'uploads', 'courses'), exist_ok=True)

    with app.app_context():
        init_db(app)
        seed_courses()

    app.teardown_appcontext(close_db)

    # Register API Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(courses_bp)
    app.register_blueprint(admin_bp)

    # ── Public APIs ────────────────────────────────────────────────────────────
    @app.route('/api/health', methods=['GET'])
    def health():
        return jsonify({'status': 'ok', 'app': 'Simple NCLEX Platform'}), 200

    @app.route('/api/settings', methods=['GET'])
    def public_settings():
        settings = SiteSetting.get_all()
        return jsonify({'success': True, 'settings': settings}), 200

    @app.route('/api/demo-mcqs', methods=['GET'])
    def public_demo_mcqs():
        mcqs = DemoMCQ.get_all()
        return jsonify({'success': True, 'mcqs': mcqs}), 200

    @app.route('/api/newsletter', methods=['POST'])
    def newsletter_subscribe():
        data = request.get_json(silent=True) or {}
        email = data.get('email', '').strip().lower()
        if not email or not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
            return jsonify({'success': False, 'message': 'Please provide a valid email address.'}), 422
        return jsonify({'success': True, 'message': 'Thank you for subscribing to NCLEX updates!'}), 200

    # ── Uploads & Favicons ─────────────────────────────────────────────────────
    @app.route('/uploads/<path:filename>')
    def uploaded_file(filename):
        uploads_dir = os.path.join(root_dir, 'uploads')
        return send_from_directory(uploads_dir, filename)

    @app.route('/favicon.ico')
    @app.route('/favicon.png')
    def favicon():
        return send_from_directory(os.path.join(root_dir, 'static', 'images'), 'favicon.png')

    # ── Frontend Web Pages ─────────────────────────────────────────────────────
    @app.route('/')
    @app.route('/index.html')
    def home():
        return render_template('index.html')

    @app.route('/about')
    @app.route('/about.html')
    def about():
        return render_template('about.html')

    @app.route('/courses')
    @app.route('/courses.html')
    def courses_page():
        return render_template('courses.html')

    @app.route('/course-detail')
    @app.route('/course-detail.html')
    @app.route('/courses/<int:course_id>')
    def course_detail_page(course_id=None):
        return render_template('course-detail.html')

    @app.route('/login')
    @app.route('/login.html')
    def login_page():
        return render_template('login.html')

    @app.route('/register')
    @app.route('/register.html')
    def register_page():
        return render_template('register.html')

    @app.route('/admin')
    @app.route('/admin.html')
    def admin_page():
        return render_template('admin.html')

    # ── Root static file fallback (backward compatibility) ─────────────────────
    @app.route('/<path:filename>')
    def legacy_root_static(filename):
        for sub in ['css', 'js', 'images']:
            sub_dir = os.path.join(root_dir, 'static', sub)
            if os.path.isfile(os.path.join(sub_dir, filename)):
                return send_from_directory(sub_dir, filename)
        if request.path.startswith('/api/'):
            return jsonify({'success': False, 'message': 'Resource not found.'}), 404
        return render_template('index.html'), 404

    # ── Error handlers ─────────────────────────────────────────────────────────
    @app.errorhandler(404)
    def not_found(e):
        if request.path.startswith('/api/'):
            return jsonify({'success': False, 'message': 'API endpoint not found.'}), 404
        return render_template('index.html'), 404

    @app.errorhandler(500)
    def server_error(e):
        if request.path.startswith('/api/'):
            return jsonify({'success': False, 'message': 'Internal server error.'}), 500
        return render_template('index.html'), 500

    return app


# Module-level app instance
app = create_app()

if __name__ == '__main__':
    print(f"\n* Simple NCLEX Platform running at http://{Config.HOST}:{Config.PORT}")
    print(f"* Database path: {Config.DATABASE_PATH}")
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)
