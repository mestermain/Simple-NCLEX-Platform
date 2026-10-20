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
import urllib.parse



# ==============================================================================
# 1. CONFIGURATION
# ==============================================================================
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'nclex-pro-super-secret-key-2024-change-in-prod')
    DATABASE_URL = os.environ.get('DATABASE_URL')
    DATABASE_PATH = os.environ.get('DATABASE_PATH', os.path.join(BASE_DIR, 'nclex.db'))
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'nclex-jwt-secret-2024')
    JWT_EXPIRATION_DAYS = int(os.environ.get('JWT_EXPIRATION_DAYS', '30'))
    PORT = int(os.environ.get('PORT', '5001'))
    HOST = os.environ.get('HOST', '0.0.0.0')
    DEBUG = os.environ.get('DEBUG', 'False').lower() in ('true', '1', 'yes')
    IS_VERCEL = bool(os.environ.get('VERCEL'))
    UPLOAD_FOLDER = '/tmp/uploads' if bool(os.environ.get('VERCEL')) else os.path.join(BASE_DIR, 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024


# ==============================================================================
# 2. DATABASE LAYER & DATA MODELS
# ==============================================================================
class PostgresCursorWrapper:
    """Wrapper around psycopg2 RealDictCursor providing sqlite-compatible interface."""
    def __init__(self, cur):
        self._cur = cur
        self.lastrowid = None

    def execute(self, query, params=None):
        pg_query = query.replace('?', '%s')
        if params is not None:
            self._cur.execute(pg_query, params)
        else:
            self._cur.execute(pg_query)
        if pg_query.strip().upper().startswith('INSERT'):
            try:
                self._cur.execute("SELECT LASTVAL()")
                r = self._cur.fetchone()
                if r:
                    self.lastrowid = list(r.values())[0] if isinstance(r, dict) else r[0]
            except Exception:
                self.lastrowid = None
        return self

    def executemany(self, query, seq_of_params):
        pg_query = query.replace('?', '%s')
        self._cur.executemany(pg_query, seq_of_params)
        return self

    def fetchone(self):
        return self._cur.fetchone()

    def fetchall(self):
        return self._cur.fetchall()

    def fetchmany(self, size=None):
        return self._cur.fetchmany(size)

    def __iter__(self):
        return iter(self._cur)

    def close(self):
        try:
            self._cur.close()
        except Exception:
            pass


class PostgresConnectionWrapper:
    """Wrapper around psycopg2 connection providing sqlite-compatible interface."""
    def __init__(self, conn):
        self._conn = conn

    def cursor(self):
        import psycopg2.extras
        cur = self._conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        return PostgresCursorWrapper(cur)

    def execute(self, query, params=None):
        cur = self.cursor()
        cur.execute(query, params)
        return cur

    def commit(self):
        try:
            self._conn.commit()
        except Exception:
            pass

    def rollback(self):
        try:
            self._conn.rollback()
        except Exception:
            pass

    def close(self):
        try:
            self._conn.close()
        except Exception:
            pass


def get_db():
    """Get a thread-local database connection (PostgreSQL/Supabase if DATABASE_URL is set, else SQLite)."""
    if 'db' not in g:
        connected = False
        if Config.DATABASE_URL:
            try:
                import psycopg2
                import psycopg2.extras
                db_url = Config.DATABASE_URL
                if db_url.startswith('postgres://'):
                    db_url = db_url.replace('postgres://', 'postgresql://', 1)
                raw_conn = psycopg2.connect(db_url, connect_timeout=8)
                g.db = PostgresConnectionWrapper(raw_conn)
                connected = True
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"PostgreSQL/Supabase connection failed: {e}")

        if not connected:
            # Fallback to local SQLite (copy to /tmp on read-only serverless runtimes)
            db_path = Config.DATABASE_PATH
            if Config.IS_VERCEL:
                tmp_db = '/tmp/nclex.db'
                if not os.path.exists(tmp_db) and os.path.exists(db_path):
                    import shutil
                    try:
                        shutil.copyfile(db_path, tmp_db)
                    except Exception:
                        pass
                if os.path.exists(tmp_db):
                    db_path = tmp_db
            g.db = sqlite3.connect(
                db_path,
                detect_types=sqlite3.PARSE_DECLTYPES
            )
            g.db.row_factory = sqlite3.Row
            try:
                g.db.execute("PRAGMA foreign_keys = ON")
            except Exception:
                pass
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


def get_default_qbank_plans(now=None):
    """Return default high-yield Q-Bank subscription plans."""
    if not now:
        now = datetime.now(timezone.utc).isoformat()
    return [
        (
            '1-Month Intensive Pass',
            'Full 30-day access to all 2,500+ NCLEX & SNLE practice questions with rationales.',
            30,
            4999.0,
            8000.0,
            'Starter',
            json.dumps([
                'Full 2,500+ NCLEX & SNLE Question Bank',
                'In-Depth Saunders & ATI Clinical Rationales',
                'Distractor Analysis for Every Option',
                'Interactive Tutor Practice Mode',
                'Category & Specialty Filtering'
            ]),
            1,
            now
        ),
        (
            '3-Month High-Yield Master',
            'The recommended plan for comprehensive exam readiness. Includes Next-Gen cases and simulated exams.',
            90,
            7999.0,
            14000.0,
            'Most Popular',
            json.dumps([
                'Complete 90-Day All-Access Question Bank',
                'Next-Generation NCLEX (NGN) Case Studies',
                'Timed Exam Mode & Mock Test Simulator',
                'Specialty Performance Diagnostics',
                'Priority WhatsApp Study Support Group',
                'NCLEX High-Yield Clinical Pearl Summaries'
            ]),
            1,
            now
        ),
        (
            '6-Month Complete Pass',
            'Maximum flexibility and complete licensure guarantee for international and repeat test-takers.',
            180,
            11999.0,
            22000.0,
            'Best Value',
            json.dumps([
                'Unlimited 180-Day Complete Q-Bank Access',
                'All NCLEX-RN, Next-Gen, SNLE & Prometric Tracks',
                'Personalized Weakness Remediation Quizzes',
                'Direct Faculty Mentorship on WhatsApp',
                'Free Content & Question Updates for 2026',
                'First-Time Pass Guarantee Commitment'
            ]),
            1,
            now
        )
    ]


def get_default_qbank_questions(now=None):
    """Return initial comprehensive clinical practice questions for Q-Bank."""
    if not now:
        now = datetime.now(timezone.utc).isoformat()
    return [
        (
            'Pharmacology & Parenteral Therapies',
            'High Yield',
            'NCLEX-RN',
            'Physiological Adaptation — Pharmacological & Parenteral Therapies',
            "A client with acute pulmonary embolism is receiving a continuous intravenous heparin infusion. The nurse notes active bleeding from the client's intravenous insertion site, epistaxis, and microscopic hematuria. The laboratory reports an activated partial thromboplastin time (aPTT) of 135 seconds (control baseline: 30 seconds). Which prescription should the nurse anticipate administering immediately?",
            json.dumps([
                'Vitamin K (Phytonadione)',
                'Protamine Sulfate',
                'Deferoxamine',
                'Calcium Gluconate'
            ]),
            1,
            'Heparin is a fast-acting parenteral anticoagulant that potentiates the action of antithrombin III, inactivating thrombin and factor Xa. The expected therapeutic aPTT target during continuous heparin therapy is 1.5 to 2.5 times normal control baseline (typically 45 to 75 seconds). An aPTT of 135 seconds accompanied by clinical bleeding signifies severe heparin toxicity. Protamine sulfate is the specific antidote that forms an inactive neutral salt complex, reversing anticoagulation within 5 minutes.',
            json.dumps([
                'Option A (Vitamin K): Antidote for warfarin (Coumadin) toxicity, not heparin. Vitamin K acts through hepatic synthesis of clotting factors, taking hours to days.',
                'Option C (Deferoxamine): A chelating agent indicated for acute iron toxicity and chronic iron overload.',
                'Option D (Calcium Gluconate): Cardioprotective antagonist for severe hyperkalemia or magnesium toxicity; it does not reverse heparin.'
            ]),
            'NCLEX High-Yield Rule: "P" goes with "P" (Protamine for PTT/Heparin); "W" goes with "K" (Warfarin for Vitamin K/PT/INR). Stop the heparin infusion FIRST, then notify the provider and administer Protamine Sulfate.',
            1,
            1,
            now
        ),
        (
            'Management of Care & Priority Triaging',
            'High Yield',
            'NCLEX-RN',
            'Safe and Effective Care Environment — Management of Care',
            'After receiving morning shift handoff report on a busy medical-surgical unit, which client should the registered nurse assess first?',
            json.dumps([
                'A client with chronic obstructive pulmonary disease (COPD) having an SpO2 of 89% on 2 L/min nasal cannula.',
                'A client who had a subtotal thyroidectomy 6 hours ago and reports tingling around the mouth and fingertips.',
                'A client with type 1 diabetes mellitus who has a fasting capillary blood glucose of 145 mg/dL.',
                'A client with acute pancreatitis who reports severe epigastric pain rating 8/10 radiating to the back.'
            ]),
            1,
            'Using the ABCs and acute-over-chronic prioritization principles, the client post-thyroidectomy reporting perioral paresthesia (tingling around mouth and fingers) is exhibiting the earliest symptoms of acute hypocalcemia (tetany), caused by accidental trauma or devascularization of the parathyroid glands. Hypocalcemia causes severe neuromuscular excitability that can rapidly progress to laryngospasm, acute airway obstruction, seizures, and cardiac arrest.',
            json.dumps([
                'Option A: An SpO2 of 88%–92% is expected for chronic hypercapnic COPD clients due to hypoxic drive; this represents a stable chronic baseline.',
                'Option C: Fasting blood glucose of 145 mg/dL is mildly elevated post-stress, but does not present acute hypoglycemia or diabetic ketoacidosis.',
                'Option D: Severe epigastric pain radiating to the back is the expected hallmark presentation of acute pancreatitis. While analgesia is required, airway compromise always takes priority over expected pain.'
            ]),
            'NCLEX Priority Framework: Post-thyroidectomy emergencies are: 1) Respiratory distress/stridor (edema/hematoma), 2) Tetany/hypocalcemia (numbness/tingling around mouth within 24–48 hours). Always keep an emergency tracheostomy tray, suction, and IV Calcium Gluconate at bedside.',
            1,
            2,
            now
        ),
        (
            'Reduction of Risk Potential & Cardiac',
            'High Yield',
            'SNLE',
            'Physiological Adaptation — Reduction of Risk Potential',
            'A client with heart failure exacerbation is prescribed oral digoxin 0.25 mg daily and furosemide 40 mg daily. Before administering morning medications, which clinical finding requires the nurse to withhold digoxin and notify the healthcare provider immediately?',
            json.dumps([
                'Apical pulse of 52 beats per minute and reported yellow-green halos around lights.',
                'Blood pressure of 134/82 mm Hg and trace bilateral ankle edema.',
                'Serum potassium level of 4.2 mEq/L and serum sodium of 138 mEq/L.',
                'Serum digoxin level of 1.2 ng/mL.'
            ]),
            0,
            'Digoxin is a cardiac glycoside with positive inotropic and negative chronotropic effects. The nurse must assess the apical pulse for 1 full minute prior to administration; digoxin is withheld if apical heart rate is less than 60 beats/min in an adult. Bradycardia (HR 52) combined with classic visual disturbances (yellow-green halos, blurred vision) and GI complaints (anorexia, nausea) are pathognomonic signs of digitalis toxicity.',
            json.dumps([
                'Option B: Blood pressure of 134/82 mm Hg and trace ankle edema are typical baseline findings for chronic heart failure clients and do not represent digoxin toxicity.',
                'Option C: Serum potassium of 4.2 mEq/L is within normal reference limits (3.5–5.0 mEq/L). Hypokalemia (<3.5) would be alarming.',
                'Option D: Therapeutic serum digoxin range is 0.8–2.0 ng/mL. A level of 1.2 ng/mL is optimal therapeutic.'
            ]),
            'NCLEX & SNLE Safety Rule: Early signs of Digoxin toxicity are GI disturbances (anorexia, nausea, vomiting), followed by neurological/visual changes (yellow-green halos). Late signs are cardiac dysrhythmias. Check apical pulse for 60 seconds; hold if < 60 bpm. Potassium and digoxin compete for the same receptor!',
            1,
            3,
            now
        ),
        (
            'Maternal & Newborn Care',
            'High Yield',
            'NCLEX-RN',
            'Health Promotion & Maintenance — Antepartum Care',
            'A client at 34 weeks gestation presents to the emergency department with sudden, severe, continuous abdominal pain and dark red vaginal bleeding. On abdominal examination, the uterus is hypertonic and board-like upon palpation. What is the priority nursing action?',
            json.dumps([
                'Perform a sterile digital vaginal examination to assess cervical dilation and effacement.',
                'Place the client in left lateral recumbent position, apply continuous electronic fetal monitoring, and alert surgical team.',
                'Administer intravenous oxytocin to stimulate regular uterine contractions.',
                'Reassure the client and encourage ambulation around the unit to facilitate labor descent.'
            ]),
            1,
            'Sudden-onset intense abdominal pain, dark red vaginal bleeding, and a rigid, hypertonic ("board-like") uterus are classic symptoms of abruptio placentae (premature detachment of the placenta). This is an obstetric life-threatening emergency causing rapid fetal hypoxia and maternal hemorrhagic shock. Immediate interventions include placing mother in left lateral recumbent position, continuous electronic fetal monitoring, and alerting surgical team for immediate Cesarean delivery.',
            json.dumps([
                'Option A: Vaginal digital examinations are STRICTLY CONTRAINDICATED in any third-trimester bleeding until placenta previa has been ruled out by ultrasound; digital exam can puncture placenta and cause fatal hemorrhage.',
                'Option C: Oxytocin is contraindicated because uterus is already hypertonic and contracting excessively.',
                'Option D: Ambulation delays emergency surgical intervention and worsens hemorrhagic shock.'
            ]),
            'NCLEX Comparison Pearl: Abruptio Placentae = Dark red bleeding, SEVERE constant abdominal pain, rigid board-like uterus. Placenta Previa = Bright red bleeding, PAINLESS, soft non-tender uterus. NEVER do a digital vaginal exam on third-trimester bleeding until ultrasound confirms placenta location!',
            1,
            4,
            now
        ),
        (
            'Physiological Adaptation & Med-Surg',
            'High Yield',
            'NCLEX-RN',
            'Physiological Adaptation — Neurological Disorders',
            "A client with a complete T4 spinal cord injury reports a sudden, throbbing headache, blurred vision, and nasal congestion. The nurse notes profuse diaphoresis and flushing above the clavicles, with pale, cool skin below the lesion level. Blood pressure is 214/110 mm Hg and heart rate is 50 beats/min. Which action should the nurse take FIRST?",
            json.dumps([
                'Administer prescribed sublingual nifedipine immediately.',
                "Raise the head of the bed to a high-Fowler's position (90 degrees) with legs lowered.",
                'Perform a digital rectal exam to assess for fecal impaction.',
                'Notify the healthcare provider and prepare a cardiac monitor.'
            ]),
            1,
            "This client is experiencing autonomic dysreflexia (hyperreflexia), a life-threatening medical emergency seen in spinal cord injuries at or above T6. Unopposed sympathetic discharge triggered by a noxious stimulus below the injury causes severe paroxysmal vasoconstriction, extreme hypertension, and reflex vagal bradycardia with vasodilation above the level of injury. The FIRST priority intervention is to immediately sit the client upright in high-Fowler's position (90 degrees) with feet dangling or lowered. This utilizes orthostatic pooling of venous blood to instantly lower intracranial pressure and reduce blood pressure before complications (cerebral hemorrhage, stroke, seizure) occur.",
            json.dumps([
                'Option A: Antihypertensive medications may be required if BP remains critically elevated, but non-pharmacologic positional elevation must be done FIRST within seconds.',
                'Option C: Checking for full bladder or fecal impaction is essential to remove the noxious trigger, but only AFTER positioning the client upright and loosening tight clothing.',
                'Option D: Healthcare provider notification occurs after initiating life-saving positioning and assessing immediate causative factors.'
            ]),
            "NCLEX Rule: Autonomic Dysreflexia First Steps: 1) Elevate HOB to 90 degrees (high-Fowler's), 2) Loosen tight clothing/constrictive devices, 3) Check urinary catheter for kinks or distension (most common cause = distended bladder), 4) Check for fecal impaction.",
            0,
            5,
            now
        ),
        (
            'Pediatric Nursing',
            'High Yield',
            'NCLEX-RN',
            'Physiological Adaptation — Pediatric Respiratory Disorders',
            'A 4-year-old child is brought to the pediatric urgent care clinic with sudden high fever, sore throat, muffled voice, and difficulty swallowing. The child is sitting upright, leaning forward with the chin extended (tripod position), and is drooling saliva onto the shirt. Inspiratory stridor is audible without a stethoscope. What is the essential nursing precaution?',
            json.dumps([
                'Directly inspect the posterior pharynx using a tongue depressor and penlight.',
                'Obtain a throat swab culture for group A beta-hemolytic Streptococcus.',
                'Keep the child calm, avoid any oral examination or throat instrumentation, and assemble emergency airway equipment.',
                'Place the child supine and initiate immediate bag-valve-mask positive pressure ventilation.'
            ]),
            2,
            'The clinical tetrad of Drooling, Dysphagia, Dysphonia, and Distressed inspiratory stridor with tripod posturing in a febrile child is hallmark for acute epiglottitis (usually caused by Haemophilus influenzae type B or Streptococcus pneumoniae). Acute epiglottitis causes rapid, severe edema of the supraglottic structures. Any invasive examination of the mouth or throat (such as inserting a tongue depressor, taking a throat culture swab, or agitating the child with crying/IV attempts) can trigger complete laryngospasm and immediate, fatal airway occlusion.',
            json.dumps([
                'Option A: Direct throat inspection with a tongue depressor is strictly contraindicated because stimulation of the posterior pharynx can precipitate immediate total airway obstruction.',
                'Option B: Throat cultures must never be performed in epiglottitis until the airway is secured in an operating room by anesthesia.',
                'Option D: Forcing the child into a supine position can cause the enlarged epiglottis to fall backward over the glottis, causing immediate asphyxiation.'
            ]),
            "NCLEX Pediatric Pearl: Epiglottitis = \"AIRWAY EMERGENCY\". Look for the 4 D's: Drooling, Dysphagia, Dysphonia, Distressed stridor. NEVER use a tongue blade, NEVER leave the child unattended, keep the child in the caregiver's lap to minimize stress, and prepare for immediate endotracheal intubation or tracheostomy.",
            0,
            6,
            now
        ),
        (
            'Physiological Adaptation & Med-Surg',
            'High Yield',
            'NCLEX-RN',
            'Physiological Adaptation — Endocrine Emergencies',
            'A client with type 1 diabetes mellitus is admitted to the intensive care unit in Diabetic Ketoacidosis (DKA). Assessment reveals deep, rapid respirations (Kussmaul breathing) with a fruity acetone odor, dry mucous membranes, blood pressure 88/54 mm Hg, and pulse 124 beats/min. Capillary blood glucose is 580 mg/dL, and arterial blood gas shows pH 7.18 and HCO3- 10 mEq/L. Which medical prescription should the nurse implement FIRST?',
            json.dumps([
                'Administer an intravenous bolus of regular insulin at 0.1 units/kg.',
                'Infuse 0.9% Normal Saline at 1,000 mL/hr intravenously.',
                'Infuse 5% Dextrose in water (D5W) at 150 mL/hr.',
                'Administer an intravenous infusion of sodium bicarbonate 50 mEq.'
            ]),
            1,
            'In diabetic ketoacidosis (DKA), profound osmotic diuresis induced by hyperglycemia causes severe extracellular and intracellular volume depletion (typically 5 to 10 liters fluid deficit), resulting in hypotension, tachycardia, and compromised renal perfusion. The FIRST priority in DKA resuscitation is rapid fluid replacement with isotonic saline (0.9% Normal Saline) to restore vascular circulating volume, re-establish perfusion to vital organs, and prevent hypovolemic shock. Administering insulin before adequate volume replacement causes rapid shifts of water and potassium into cells, which can trigger cardiovascular collapse and acute renal failure.',
            json.dumps([
                'Option A: Insulin is vital to stop lipolysis and ketogenesis, but isotonic fluid resuscitation MUST be initiated first. Insulin without fluid resuscitation precipitates profound vascular collapse and hypokalemia.',
                'Option C: Dextrose-containing solutions (D5W or D5 0.45% NS) are added later only when blood glucose drops below 250 mg/dL to prevent hypoglycemia and cerebral edema.',
                'Option D: Sodium bicarbonate is rarely indicated and only considered for life-threatening severe acidosis (pH < 6.9); premature bicarbonate therapy causes paradoxical intracellular acidosis and severe hypokalemia.'
            ]),
            'NCLEX DKA Sequence: 1) FLUIDS FIRST (0.9% Normal Saline 1 L/hr), 2) Check potassium before insulin (if K+ < 3.3, replace potassium before insulin!), 3) Regular Insulin IV infusion, 4) When blood glucose hits 250 mg/dL, add DEXTROSE (D5W) to prevent cerebral edema!',
            0,
            7,
            now
        ),
        (
            'Management of Care & Priority Triaging',
            'High Yield',
            'NCLEX-RN',
            'Safe and Effective Care Environment — Delegation and Supervision',
            'The registered nurse (RN) is planning assignments on an acute medical surgical unit. Which client care task is appropriate to delegate to an experienced Unlicensed Assistive Personnel (UAP)?',
            json.dumps([
                'Assess skin turgor and capillary refill in a client receiving IV fluids for dehydration.',
                'Teach a client with newly diagnosed hypertension how to read food nutrition labels for sodium content.',
                'Assist an alert, stable client who had a laparoscopic cholecystectomy 2 days ago to ambulate in the hallway.',
                'Administer scheduled oral docusate sodium to a client with chronic constipation.'
            ]),
            2,
            'Delegation to Unlicensed Assistive Personnel (UAP) is governed by the state nurse practice act and NCSBN delegation guidelines. UAP scope of practice includes assisting stable clients with basic activities of daily living (ADLs), routine ambulation, hygiene, toileting, feeding (without swallowing dysfunction), and recording routine vital signs. Assisting an alert, stable postoperative client to ambulate on post-op day 2 is within the standard competency of UAP.',
            json.dumps([
                'Option A: Clinical physical assessment (skin turgor, capillary refill, lung sounds) requires registered nursing judgment and cannot be delegated to UAP.',
                'Option B: Client teaching and education require formulation and evaluation of nursing diagnoses and are strictly the responsibility of the RN.',
                'Option D: Medication administration (even routine oral stool softeners) requires pharmacological knowledge and cannot be delegated to UAP.'
            ]),
            'NCLEX Delegation Golden Rule: "Do NOT delegate what you can EAT!": E = Evaluate, A = Assess, T = Teach. The RN NEVER delegates Assessment, Teaching, Evaluation, or Nursing Judgment to UAP or LPN.',
            0,
            8,
            now
        ),
        (
            'Pharmacology & Parenteral Therapies',
            'High Yield',
            'NCLEX-RN',
            'Physiological Adaptation — Pharmacological Therapies',
            'A client with bipolar I disorder is prescribed lithium carbonate 300 mg three times daily. During a routine follow-up visit, which instruction is most critical for the nurse to emphasize to prevent lithium toxicity?',
            json.dumps([
                'Restrict dietary sodium intake and drink less than 1,000 mL of fluids daily.',
                'Maintain consistent daily sodium intake and drink 2,000 to 3,000 mL of fluids daily.',
                'Take ibuprofen 400 mg with each dose of lithium to prevent gastrointestinal upset.',
                'Stop taking lithium immediately if fine hand tremors occur and resume when tremors resolve.'
            ]),
            1,
            'Lithium is an alkali metal salt with a very narrow therapeutic index (0.6 to 1.2 mEq/L; acute mania up to 1.5 mEq/L). The kidneys handle lithium exactly like sodium. When the body becomes sodium-depleted or dehydrated (from diaphoresis, low-sodium diets, vomiting, diarrhea, or diuretics), the renal tubules reabsorb lithium in place of sodium, causing rapid, life-threatening lithium accumulation and toxicity. Clients must maintain normal, consistent dietary sodium intake and consume 2 to 3 liters of fluid daily.',
            json.dumps([
                'Option A: Restricting sodium and fluid intake directly precipitates severe lithium toxicity by forcing renal reabsorption of lithium.',
                'Option C: NSAIDs (such as ibuprofen and naproxen) significantly decrease renal blood flow and clearance of lithium, increasing serum lithium levels by up to 40%. Aspirin or acetaminophen are preferred.',
                'Option D: Fine resting hand tremors are a common, benign initial side effect of lithium. Lithium must never be abruptly discontinued without provider consultation.'
            ]),
            'NCLEX Lithium Rule: Lithium therapeutic range = 0.6–1.2 mEq/L (toxicity begins at > 1.5 mEq/L). Signs of toxicity: Coarse hand tremors, ataxia, confusion, polyuria, persistent vomiting/diarrhea. Avoid: Low sodium diet, dehydration, NSAIDs, and Thiazide diuretics!',
            0,
            9,
            now
        ),
        (
            'Pediatric Nursing',
            'High Yield',
            'NCLEX-RN',
            'Physiological Adaptation — Pediatric Cardiology',
            'An 8-month-old infant with diagnosed Tetralogy of Fallot begins crying vigorously after blood sampling and suddenly turns deeply cyanotic, tachypneic, and lethargic. Which immediate nursing intervention should be performed FIRST?',
            json.dumps([
                'Place the infant in the knee-chest position immediately.',
                'Administer an intravenous bolus of normal saline at 20 mL/kg.',
                'Administer sublingual nitroglycerin to promote systemic vasodilation.',
                'Place the infant in high-Fowler\'s position and apply cold compresses to the forehead.'
            ]),
            0,
            'This infant is experiencing a hypercyanotic "tet" spell (paroxysmal hypoxemic episode), which occurs when crying, agitation, feeding, or defecation causes an abrupt spasm of the infundibular right ventricular outflow tract, sharply increasing right-to-left shunting of unoxygenated blood through the ventricular septal defect into the systemic circulation. The immediate first-line nursing intervention is placing the infant in the knee-to-chest position (or flexing the infant\'s legs tightly against the chest). This mechanical compression kinks the femoral arteries, instantly increasing Systemic Vascular Resistance (SVR). The increased systemic resistance overcomes pulmonary resistance, forcing blood from the right ventricle into the pulmonary artery for oxygenation.',
            json.dumps([
                'Option B: IV fluids and morphine may be ordered subsequently by the physician, but physical knee-chest positioning must be initiated within seconds without delay.',
                'Option C: Nitroglycerin causes systemic vasodilation, which would catastrophically decrease SVR, worsening right-to-left shunting and deepening fatal hypoxia.',
                'Option D: High-Fowler\'s position does not increase systemic vascular resistance and provides no physiologic relief for infundibular spasm.'
            ]),
            'NCLEX Congenital Heart Pearl: Tetralogy of Fallot 4 defects: "PROVe" = Pulmonary stenosis, Right ventricular hypertrophy, Overriding aorta, Ventricular septal defect. Hypercyanotic Tet Spell = Knee-Chest position FIRST, 100% blow-by oxygen, calm the infant, IV Morphine if needed.',
            0,
            10,
            now
        ),
        (
            'Maternal & Newborn Care',
            'High Yield',
            'NCLEX-RN',
            'Health Promotion & Maintenance — High-Risk Labor and Delivery',
            'A client with severe pre-eclampsia at 36 weeks gestation is receiving a continuous intravenous infusion of magnesium sulfate at 2 g/hr. On hourly reassessment, the nurse notes: respiratory rate of 10 breaths/min, absent deep tendon reflexes (patellar DTRs 0/4+), urine output of 15 mL over the past hour, and lethargy. Which intervention should the nurse implement FIRST?',
            json.dumps([
                'Increase the intravenous maintenance fluid infusion rate to flush the kidneys.',
                'Immediately discontinue the magnesium sulfate infusion and administer Calcium Gluconate IV.',
                'Place the client in Trendelenburg position and apply a non-rebreather oxygen mask.',
                'Notify the healthcare provider and recheck deep tendon reflexes in 30 minutes.'
            ]),
            1,
            'Magnesium sulfate is the drug of choice in severe pre-eclampsia for seizure prophylaxis (prevention of eclampsia). Therapeutic magnesium level is 4 to 7 mg/dL (or 2.0 to 3.5 mmol/L). Signs of magnesium toxicity occur progressively: 1) Loss of deep tendon reflexes (DTRs) at 8–10 mg/dL, 2) Respiratory depression (<12 breaths/min) at 10–12 mg/dL, 3) Oliguria (<30 mL/hr) due to renal hypoperfusion, and 4) Cardiac arrest at >15 mg/dL. The nurse must STOP the magnesium sulfate infusion immediately and administer the specific antidote: 10% Calcium Gluconate (1 g IV over 3–5 minutes).',
            json.dumps([
                'Option A: Increasing fluids will worsen pulmonary edema risk in pre-eclampsia and fails to stop toxic magnesium exposure.',
                'Option C: Trendelenburg position increases intracranial pressure and impedes diaphragmatic excursion in a client with severe respiratory depression.',
                'Option D: Waiting 30 minutes to recheck reflexes in a client with respiratory depression (<10/min) is negligence; cardiac arrest can occur rapidly.'
            ]),
            'NCLEX Pre-Eclampsia Safety Rule: Magnesium toxicity triad: 1) Absent DTRs (0/4+), 2) Respiratory rate < 12 breaths/min, 3) Urine output < 30 mL/hr. PRIORITY ACTION: STOP the infusion immediately, give CALCIUM GLUCONATE IV slowly, notify provider, give oxygen.',
            0,
            11,
            now
        ),
        (
            'Pharmacology & Parenteral Therapies',
            'High Yield',
            'NCLEX-RN',
            'Physiological Adaptation — Pharmacological Therapies',
            'The nurse is preparing to administer scheduled subcutaneous insulin lispro (Humalog) 6 units to a hospitalized client with type 2 diabetes mellitus at 0730. Breakfast trays are scheduled to arrive from dietary at 0830. Which action is the priority for the nurse?',
            json.dumps([
                'Administer the insulin lispro at 0730 as scheduled so the medication stays on time.',
                'Hold the insulin lispro until the meal tray is present on the unit and the client is ready to eat.',
                'Administer half the dose (3 units) now and the remaining 3 units after breakfast.',
                'Instruct the client to drink 8 ounces of orange juice at 0730 to prevent hypoglycemia.'
            ]),
            1,
            "Insulin lispro (Humalog), insulin aspart (NovoLog), and insulin glulisine (Apidra) are rapid-acting insulins. Rapid-acting insulins have an onset of action of 10 to 15 minutes, with a peak effect at 30 to 90 minutes. Because of the rapid onset, rapid-acting insulin must NEVER be administered unless the client's food tray is directly at the bedside and the client is actively preparing to eat. Administering insulin lispro 1 hour before meal delivery (0730 with breakfast at 0830) will cause severe hypoglycemia during the drug's peak before food absorption occurs.",
            json.dumps([
                'Option A: Administering rapid-acting insulin 60 minutes before food arrives is a critical medication safety error that will induce severe hypoglycemic shock.',
                'Option C: Splitting or altering prescribed insulin doses without a healthcare provider\'s order violates safe medication administration rules.',
                'Option D: Giving orange juice to prevent anticipated hypoglycemia is inappropriate; insulin timing must match meal delivery.'
            ]),
            'NCLEX Insulin Timing Rules: 1) Rapid-Acting (Lispro, Aspart): Onset 15 min, Peak 1 hr. Give with food tray AT BEDSIDE! 2) Regular (Short-Acting): Onset 30-60 min, Peak 2-4 hrs. Give 30 min before meal. 3) NPH (Intermediate): Onset 2-4 hrs, Peak 4-12 hrs. Watch for afternoon hypoglycemia! 4) Glargine (Long-Acting): NO PEAK, cannot be mixed!',
            0,
            12,
            now
        ),
        (
            'Reduction of Risk Potential & Cardiac',
            'High Yield',
            'NCLEX-RN',
            'Physiological Adaptation — Reduction of Risk Potential',
            'A client returns to the cardiac telemetry unit following a percutaneous coronary intervention (PCI) with stent placement via the right common femoral artery. One hour post-procedure, the client reports sudden severe right groin pain. On examination, the nurse notes a rapidly expanding, firm, tender hematoma at the right groin puncture site, with weak (+1) right pedal pulse and heart rate 118 bpm. Which action should the nurse take FIRST?',
            json.dumps([
                'Apply immediate, firm, direct manual pressure 1 inch above (proximal to) the arterial puncture site.',
                'Elevate the right leg on two pillows to reduce venous congestion.',
                'Perform an immediate Doppler ultrasound scan of the right lower extremity.',
                'Administer prescribed intravenous morphine 2 mg for severe puncture pain.'
            ]),
            0,
            "A rapidly expanding groin hematoma accompanied by severe pain, tachycardia (HR 118), and decreased distal peripheral pulses is an acute arterial puncture blowout or pseudoaneurysm following femoral artery catheterization. The nurse's immediate, emergent priority is to apply continuous, direct, firm manual compression approximately 1 inch proximal (above) to the visible skin puncture site (where the arteriotomy in the femoral artery is located). Direct manual pressure must be held continuously for at least 15 to 30 minutes to achieve arterial hemostasis and prevent retroperitoneal hematoma, hypovolemic shock, and limb ischemia.",
            json.dumps([
                'Option B: Elevating or flexing the leg is contraindicated because femoral arterial sheath puncture sites require strict flat bed rest with the affected leg kept straight for 4 to 6 hours to prevent clot dislodgement.',
                'Option C: Diagnostic ultrasound may confirm pseudoaneurysm, but active arterial bleeding requires immediate manual compression FIRST.',
                'Option D: Administering analgesics without stopping the arterial hemorrhage delays life-saving physical hemostasis.'
            ]),
            "NCLEX Post-Cath Procedure Pearls: 1) Puncture site hematoma/bleeding = Direct manual pressure 1 inch PROXIMAL to puncture site immediately. 2) Post-femoral cath: Client must remain SUPINE with affected extremity STRAIGHT for 4–6 hours. 3) Assess the 6 P's of peripheral perfusion (Pulses, Pallor, Pain, Paresthesia, Paralysis, Poikilothermia) distally.",
            0,
            13,
            now
        ),
        (
            'Pharmacology & Parenteral Therapies',
            'High Yield',
            'NCLEX-RN',
            'Physiological Adaptation — Pharmacological Therapies',
            'A client with heart failure is newly prescribed oral lisinopril 10 mg daily. Which clinical manifestations and adverse effects should the nurse instruct the client to monitor and report immediately to the healthcare provider? Select all that apply.',
            json.dumps([
                'Swelling of the lips, tongue, or pharynx (angioedema)',
                'Persistent, dry, hacking nocturnal cough',
                'Sudden severe podagra (first metatarsophalangeal joint pain)',
                'Dizziness or lightheadedness when transitioning from lying to standing',
                'Muscle weakness, paresthesia, or palpitations (hyperkalemia)',
                'Yellow-green halos around light fixtures'
            ]),
            0,
            'ACE inhibitors (such as lisinopril, enalapril) block the conversion of angiotensin I to angiotensin II, decreasing aldosterone secretion and inhibiting bradykinin degradation. Key clinical teaching points: 1) Angioedema (swelling of lips, tongue, or airway) is a life-threatening emergency caused by bradykinin accumulation that can occur at any time during therapy; client must seek emergent care and discontinue the drug permanently. 2) A persistent dry cough occurs in 10-20% of clients due to localized bradykinin accumulation in the respiratory tract. 3) Orthostatic hypotension is frequent upon initiation ("first-dose phenomenon"). 4) Hyperkalemia occurs because decreased aldosterone causes renal potassium retention; clients must avoid salt substitutes and potassium supplements.',
            json.dumps([
                'Option C (Gout): Gouty arthritis is not an adverse effect of ACE inhibitors (it is associated with thiazide or loop diuretics that compete with uric acid excretion).',
                'Option F (Yellow-green halos): Yellow-green halos and blurred vision are classic pathognomonic signs of digitalis (digoxin) toxicity, not ACE inhibitor therapy.'
            ]),
            'NCLEX ACE Inhibitor Rule: "A-C-E-I": A = Angioedema (life-threatening airway compromise, hold drug permanently!), C = Cough (dry/hacking due to bradykinin), E = Elevated potassium (hyperkalemia, avoid salt substitutes!), I = Hypotension (first-dose syncope precaution).',
            1,
            14,
            now,
            'multiple',
            json.dumps([0, 1, 3, 4])
        ),
        (
            'Safe & Effective Care Environment',
            'High Yield',
            'NCLEX-RN',
            'Safe and Effective Care Environment — Safety and Infection Control',
            'A hospitalized client is admitted with active pulmonary tuberculosis (TB) confirmed by acid-fast bacillus (AFB) sputum smear. Which infection prevention and control interventions are mandatory for the registered nurse to implement? Select all that apply.',
            json.dumps([
                'Place the client in an airborne infection isolation room (AIIR) with negative airflow pressure.',
                'Wear a fit-tested N95 particulate respirator mask prior to entering the client room.',
                'Have the client wear a standard surgical mask whenever transport outside the room is medically necessary.',
                'Place the client on standard droplet precautions with a surgical mask for healthcare providers.',
                'Ensure the isolation room maintains a minimum of 6 to 12 air exchanges per hour.',
                'Keep the door to the negative pressure isolation room closed at all times.'
            ]),
            0,
            'Mycobacterium tuberculosis is transmitted via airborne droplet nuclei (<5 micrometers) that remain suspended in room air for extended periods. Mandatory airborne precautions include: 1) Negative-pressure airborne infection isolation room (AIIR) with air exhausted directly to the outside or recirculated through high-efficiency particulate air (HEPA) filtration. 2) Minimum of 6 to 12 air exchanges per hour to rapidly dilute infectious particles. 3) Room door must remain tightly closed at all times to maintain negative pressure gradient. 4) Fit-tested N95 (or higher) particulate respirator mask donned prior to room entry. 5) When transport outside the room is medically essential, the client must wear a standard surgical mask to trap respiratory secretions at the source.',
            json.dumps([
                'Option D: Droplet precautions with a simple surgical mask are inadequate for tuberculosis. Droplet precautions are for larger droplets (>5 microns, e.g. influenza, pertussis) that travel only 3-6 feet. TB droplet nuclei stay airborne indefinitely and require an N95 respirator mask.'
            ]),
            'NCLEX Airborne Precautions Mnemonic: "Airborne MTV": M = Measles (Rubeola), T = Tuberculosis, V = Varicella (Chickenpox / Disseminated Herpes Zoster). Required: Negative-pressure room (6–12 air changes/hr), door strictly CLOSED, N95 respirator mask for staff, surgical mask on client during transport.',
            1,
            15,
            now,
            'multiple',
            json.dumps([0, 1, 2, 4, 5])
        )
    ]


def init_db(app=None):
    """Initialize database tables and apply schema migrations (both SQLite and PostgreSQL)."""
    if Config.DATABASE_URL:
        try:
            import psycopg2
            db_url = Config.DATABASE_URL
            if db_url.startswith('postgres://'):
                db_url = db_url.replace('postgres://', 'postgresql://', 1)
            conn = psycopg2.connect(db_url, connect_timeout=8)
            cur = conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS qbank_questions (
                    id SERIAL PRIMARY KEY,
                    category TEXT NOT NULL,
                    difficulty TEXT NOT NULL,
                    exam_type TEXT DEFAULT 'NCLEX-RN',
                    client_need TEXT DEFAULT '',
                    statement TEXT NOT NULL,
                    options_json TEXT NOT NULL,
                    correct_index INTEGER NOT NULL DEFAULT 0,
                    correct_rationale TEXT NOT NULL,
                    distractors_json TEXT NOT NULL,
                    clinical_pearl TEXT DEFAULT '',
                    is_demo INTEGER DEFAULT 0,
                    sort_order INTEGER DEFAULT 0,
                    question_type TEXT DEFAULT 'single',
                    correct_indices_json TEXT DEFAULT '[]',
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
                ALTER TABLE qbank_questions ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'single';
                ALTER TABLE qbank_questions ADD COLUMN IF NOT EXISTS correct_indices_json TEXT DEFAULT '[]';
                CREATE TABLE IF NOT EXISTS qbank_plans (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT NOT NULL,
                    duration_days INTEGER NOT NULL DEFAULT 30,
                    price NUMERIC(10,2) NOT NULL DEFAULT 0,
                    original_price NUMERIC(10,2) NOT NULL DEFAULT 0,
                    badge TEXT DEFAULT '',
                    features_json TEXT NOT NULL,
                    is_active INTEGER DEFAULT 1,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
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
                    notes TEXT
                );
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
                ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
            """)
            conn.commit()
            # Seed plans if empty
            cur.execute("SELECT COUNT(*) FROM qbank_plans")
            if cur.fetchone()[0] == 0:
                now = datetime.now(timezone.utc).isoformat()
                for p in get_default_qbank_plans(now):
                    cur.execute("INSERT INTO qbank_plans (name, description, duration_days, price, original_price, badge, features_json, is_active, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)", p)
                conn.commit()
            # Seed questions if empty, or backfill default SATA questions if none exist
            cur.execute("SELECT COUNT(*) FROM qbank_questions")
            if cur.fetchone()[0] == 0:
                now = datetime.now(timezone.utc).isoformat()
                for q in get_default_qbank_questions(now):
                    if len(q) == 13:
                        q = q + ('single', json.dumps([q[6]]))
                    cur.execute("INSERT INTO qbank_questions (category, difficulty, exam_type, client_need, statement, options_json, correct_index, correct_rationale, distractors_json, clinical_pearl, is_demo, sort_order, created_at, question_type, correct_indices_json) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)", q)
                conn.commit()
            else:
                cur.execute("SELECT COUNT(*) FROM qbank_questions WHERE question_type = 'multiple'")
                if cur.fetchone()[0] == 0:
                    now = datetime.now(timezone.utc).isoformat()
                    for q in get_default_qbank_questions(now):
                        if len(q) > 13 and q[13] == 'multiple':
                            cur.execute("INSERT INTO qbank_questions (category, difficulty, exam_type, client_need, statement, options_json, correct_index, correct_rationale, distractors_json, clinical_pearl, is_demo, sort_order, created_at, question_type, correct_indices_json) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)", q)
                    conn.commit()
            cur.close()
            conn.close()
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"PostgreSQL init note: {e}")
        return

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

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS qbank_questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            difficulty TEXT NOT NULL,
            exam_type TEXT DEFAULT 'NCLEX-RN',
            client_need TEXT DEFAULT '',
            statement TEXT NOT NULL,
            options_json TEXT NOT NULL,
            correct_index INTEGER NOT NULL DEFAULT 0,
            correct_rationale TEXT NOT NULL,
            distractors_json TEXT NOT NULL,
            clinical_pearl TEXT DEFAULT '',
            is_demo INTEGER DEFAULT 0,
            sort_order INTEGER DEFAULT 0,
            question_type TEXT DEFAULT 'single',
            correct_indices_json TEXT DEFAULT '[]',
            created_at TEXT NOT NULL
        );
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS qbank_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            duration_days INTEGER NOT NULL DEFAULT 30,
            price REAL NOT NULL,
            original_price REAL NOT NULL,
            badge TEXT DEFAULT '',
            features_json TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL
        );
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS qbank_subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            plan_id INTEGER REFERENCES qbank_plans(id) ON DELETE SET NULL,
            plan_name TEXT NOT NULL,
            duration_days INTEGER NOT NULL DEFAULT 30,
            price REAL NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'pending',
            whatsapp_number TEXT DEFAULT '',
            payment_screenshot TEXT DEFAULT '',
            enrolled_at TEXT NOT NULL,
            reviewed_at TEXT,
            expires_at TEXT,
            notes TEXT
        );
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS student_notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT DEFAULT 'general',
            is_read INTEGER DEFAULT 0,
            link TEXT DEFAULT '',
            created_at TEXT NOT NULL
        );
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS student_qbank_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            question_id INTEGER NOT NULL REFERENCES qbank_questions(id) ON DELETE CASCADE,
            question_type TEXT DEFAULT 'single',
            category TEXT DEFAULT '',
            difficulty TEXT DEFAULT '',
            exam_type TEXT DEFAULT 'NCLEX-RN',
            selected_indices_json TEXT DEFAULT '[]',
            is_correct INTEGER NOT NULL DEFAULT 0,
            attempted_at TEXT NOT NULL
        );
    """)

    # Safe migrations for existing databases
    _ensure_column(cursor, "users", "role", "TEXT NOT NULL DEFAULT 'student'")
    _ensure_column(cursor, "users", "phone", "TEXT DEFAULT ''")
    _ensure_column(cursor, "courses", "image_url", "TEXT DEFAULT ''")
    _ensure_column(cursor, "courses", "curriculum_data", "TEXT DEFAULT ''")
    _ensure_column(cursor, "enrollments", "status", "TEXT NOT NULL DEFAULT 'pending'")
    _ensure_column(cursor, "enrollments", "reviewed_at", "TEXT")
    _ensure_column(cursor, "enrollments", "notes", "TEXT")
    _ensure_column(cursor, "enrollments", "whatsapp_number", "TEXT DEFAULT ''")
    _ensure_column(cursor, "enrollments", "payment_screenshot", "TEXT DEFAULT ''")
    _ensure_column(cursor, "users", "plain_password", "TEXT DEFAULT ''")
    _ensure_column(cursor, "qbank_questions", "question_type", "TEXT DEFAULT 'single'")
    _ensure_column(cursor, "qbank_questions", "correct_indices_json", "TEXT DEFAULT '[]'")
    cursor.execute("UPDATE qbank_questions SET question_type = 'single' WHERE question_type IS NULL OR question_type = ''")
    cursor.execute("UPDATE qbank_questions SET correct_indices_json = '[' || correct_index || ']' WHERE correct_indices_json IS NULL OR correct_indices_json = '' OR correct_indices_json = '[]'")
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

    # Seed default Q-Bank plans if table is empty
    cursor.execute("SELECT COUNT(*) FROM qbank_plans")
    if cursor.fetchone()[0] == 0:
        now = datetime.now(timezone.utc).isoformat()
        cursor.executemany("""
            INSERT INTO qbank_plans (
                name, description, duration_days, price, original_price,
                badge, features_json, is_active, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, get_default_qbank_plans(now))

    # Seed default Q-Bank questions if table is empty, or backfill default SATA questions if none exist
    cursor.execute("SELECT COUNT(*) FROM qbank_questions")
    if cursor.fetchone()[0] == 0:
        now = datetime.now(timezone.utc).isoformat()
        for q in get_default_qbank_questions(now):
            if len(q) == 13:
                q = q + ('single', json.dumps([q[6]]))
            cursor.execute("""
                INSERT INTO qbank_questions (
                    category, difficulty, exam_type, client_need, statement,
                    options_json, correct_index, correct_rationale, distractors_json,
                    clinical_pearl, is_demo, sort_order, created_at, question_type, correct_indices_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, q)
    else:
        cursor.execute("SELECT COUNT(*) FROM qbank_questions WHERE question_type = 'multiple'")
        if cursor.fetchone()[0] == 0:
            now = datetime.now(timezone.utc).isoformat()
            for q in get_default_qbank_questions(now):
                if len(q) > 13 and q[13] == 'multiple':
                    cursor.execute("""
                        INSERT INTO qbank_questions (
                            category, difficulty, exam_type, client_need, statement,
                            options_json, correct_index, correct_rationale, distractors_json,
                            clinical_pearl, is_demo, sort_order, created_at, question_type, correct_indices_json
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, q)

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
        self.phone = data.get('phone') or ''
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
            'phone': self.phone,
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
    def create(cls, first_name, last_name, email, password_hash, exam_type, role='student', plain_password='', phone=''):
        db = get_db()
        now = datetime.now(timezone.utc).isoformat()
        cur = db.cursor()
        cur.execute(
            """
            INSERT INTO users (first_name, last_name, email, password_hash, exam_type, created_at, is_active, role, plain_password, phone)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
            """,
            (first_name, last_name, email, password_hash, exam_type, now, role, plain_password, phone)
        )
        db.commit()
        return cls.find_by_id(cur.lastrowid)

    @classmethod
    def update_profile(cls, user_id, first_name=None, last_name=None, exam_type=None, phone=None):
        db = get_db()
        user = cls.find_by_id(user_id)
        if not user:
            return None
        fn = first_name.strip() if first_name is not None and str(first_name).strip() else user.first_name
        ln = last_name.strip() if last_name is not None and str(last_name).strip() else user.last_name
        et = exam_type.strip() if exam_type is not None else user.exam_type
        ph = phone.strip() if phone is not None else getattr(user, 'phone', '')
        db.execute("""
            UPDATE users
            SET first_name = ?, last_name = ?, exam_type = ?, phone = ?
            WHERE id = ?
        """, (fn, ln, et, ph, user_id))
        db.commit()
        return cls.find_by_id(user_id)

    @classmethod
    def all(cls, query=None):
        db = get_db()
        sql = """
            SELECT u.*,
                   (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id) as total_enrollments,
                   (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id AND e.status = 'approved') as approved_enrollments,
                   (SELECT status FROM qbank_subscriptions qs WHERE qs.user_id = u.id ORDER BY qs.id DESC LIMIT 1) as qbank_sub_status,
                   (SELECT plan_name FROM qbank_subscriptions qs WHERE qs.user_id = u.id ORDER BY qs.id DESC LIMIT 1) as qbank_plan_name,
                   (SELECT duration_days FROM qbank_subscriptions qs WHERE qs.user_id = u.id ORDER BY qs.id DESC LIMIT 1) as qbank_duration_days,
                   (SELECT expires_at FROM qbank_subscriptions qs WHERE qs.user_id = u.id ORDER BY qs.id DESC LIMIT 1) as qbank_expires_at
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
            user_dict['qbankSubStatus'] = d.get('qbank_sub_status') or 'none'
            user_dict['qbankPlanName'] = d.get('qbank_plan_name') or ''
            user_dict['qbankDurationDays'] = d.get('qbank_duration_days') or 0
            user_dict['qbankExpiresAt'] = d.get('qbank_expires_at') or ''
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
        allowed = {'first_name', 'last_name', 'email', 'exam_type', 'role', 'is_active', 'password_hash', 'plain_password', 'phone'}
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


class QBankQuestion:
    def __init__(self, data):
        self.id = data['id']
        self.category = data['category']
        self.difficulty = data.get('difficulty') or 'High Yield'
        self.exam_type = data.get('exam_type') or 'NCLEX-RN'
        self.client_need = data.get('client_need') or ''
        self.statement = data['statement']
        try:
            self.options = json.loads(data['options_json']) if isinstance(data['options_json'], str) else data['options_json']
        except Exception:
            self.options = []
        self.correct_index = int(data.get('correct_index', 0))

        raw_indices = data.get('correct_indices_json')
        self.correct_indices = []
        if raw_indices:
            try:
                parsed = json.loads(raw_indices) if isinstance(raw_indices, str) else raw_indices
                if isinstance(parsed, list) and len(parsed) > 0:
                    self.correct_indices = [int(x) for x in parsed]
            except Exception:
                self.correct_indices = []
        if not self.correct_indices:
            self.correct_indices = [self.correct_index]

        raw_type = data.get('question_type')
        if raw_type:
            self.question_type = raw_type
        else:
            self.question_type = 'multiple' if len(self.correct_indices) > 1 else 'single'

        self.correct_rationale = data.get('correct_rationale') or ''
        try:
            self.distractors = json.loads(data['distractors_json']) if isinstance(data['distractors_json'], str) else data['distractors_json']
        except Exception:
            self.distractors = []
        self.clinical_pearl = data.get('clinical_pearl') or ''
        self.is_demo = bool(data.get('is_demo', 0))
        self.sort_order = int(data.get('sort_order', 0))
        self.created_at = data.get('created_at', '')

    def to_dict(self, include_answers=True):
        is_sata = bool(self.question_type == 'multiple' or len(self.correct_indices) > 1)
        d = {
            'id': self.id,
            'category': self.category,
            'difficulty': self.difficulty,
            'examType': self.exam_type,
            'clientNeed': self.client_need,
            'statement': self.statement,
            'options': self.options,
            'isDemo': self.is_demo,
            'sortOrder': self.sort_order,
            'createdAt': self.created_at,
            'questionType': self.question_type,
            'isMultipleResponse': is_sata,
            'isSata': is_sata,
        }
        if include_answers:
            d['correctIndex'] = self.correct_index
            d['correctIndices'] = self.correct_indices
            letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
            d['correctLetters'] = [letters[i] for i in self.correct_indices if i < len(letters)]
            d['correctRationale'] = self.correct_rationale
            d['distractors'] = self.distractors
            d['clinicalPearl'] = self.clinical_pearl
            d['description'] = {
                'correctRationale': self.correct_rationale,
                'distractors': self.distractors,
                'clinicalPearl': self.clinical_pearl,
            }
        return d

    @classmethod
    def all(cls, category=None, difficulty=None, exam_type=None, is_demo_only=False, is_demo=None):
        db = get_db()
        sql = "SELECT * FROM qbank_questions WHERE 1=1"
        params = []
        if is_demo_only:
            sql += " AND is_demo = 1"
        elif is_demo is not None and str(is_demo).strip().lower() != 'all':
            demo_str = str(is_demo).strip().lower()
            if demo_str in ('1', 'true', 'yes'):
                sql += " AND is_demo = 1"
            elif demo_str in ('0', 'false', 'no'):
                sql += " AND is_demo = 0"

        if category and category.lower() != 'all':
            cat_clean = category.strip()
            cat_lower = cat_clean.lower()
            if 'pharmacology' in cat_lower:
                sql += " AND LOWER(category) LIKE '%pharmacology%'"
            elif 'physiological' in cat_lower or 'med-surg' in cat_lower:
                sql += " AND (LOWER(category) LIKE '%physiological%' OR LOWER(category) LIKE '%med-surg%')"
            elif 'reduction of risk' in cat_lower or 'cardiac' in cat_lower:
                sql += " AND (LOWER(category) LIKE '%reduction of risk%' OR LOWER(category) LIKE '%cardiac%')"
            elif 'management of care' in cat_lower or 'delegation' in cat_lower or 'triaging' in cat_lower:
                sql += " AND LOWER(category) LIKE '%management of care%'"
            elif 'maternal' in cat_lower or 'newborn' in cat_lower or 'ob' in cat_lower:
                sql += " AND (LOWER(category) LIKE '%maternal%' OR LOWER(category) LIKE '%newborn%')"
            elif 'pediatric' in cat_lower:
                sql += " AND LOWER(category) LIKE '%pediatric%'"
            elif 'psychosocial' in cat_lower or 'mental' in cat_lower:
                sql += " AND (LOWER(category) LIKE '%psychosocial%' OR LOWER(category) LIKE '%mental%')"
            elif 'safe' in cat_lower or 'infection' in cat_lower or 'safety' in cat_lower:
                sql += " AND (LOWER(category) LIKE '%safe%' OR LOWER(category) LIKE '%infection%')"
            else:
                sql += " AND (category = ? OR LOWER(category) LIKE ?)"
                params.extend([cat_clean, f"%{cat_lower}%"])

        if difficulty and difficulty.lower() != 'all':
            sql += " AND LOWER(difficulty) = ?"
            params.append(difficulty.strip().lower())

        if exam_type and exam_type.lower() != 'all':
            sql += " AND (LOWER(exam_type) = ? OR LOWER(exam_type) LIKE ?)"
            params.extend([exam_type.strip().lower(), f"%{exam_type.strip().lower()}%"])

        sql += " ORDER BY sort_order ASC, id ASC"
        cur = db.execute(sql, tuple(params)) if params else db.execute(sql)
        return [cls(dict(r)) for r in cur.fetchall()]

    @classmethod
    def find_by_id(cls, question_id):
        db = get_db()
        cur = db.execute("SELECT * FROM qbank_questions WHERE id = ?", (question_id,))
        row = cur.fetchone()
        return cls(dict(row)) if row else None

    @classmethod
    def count(cls, is_demo_only=False):
        db = get_db()
        if is_demo_only:
            cur = db.execute("SELECT COUNT(*) FROM qbank_questions WHERE is_demo = 1")
        else:
            cur = db.execute("SELECT COUNT(*) FROM qbank_questions")
        row = cur.fetchone()
        return row[0] if row else 0

    @classmethod
    def create(cls, category, difficulty, statement, options, correct_index=0, correct_rationale='', distractors=None, clinical_pearl='', client_need='', exam_type='NCLEX-RN', is_demo=0, sort_order=0, question_type='single', correct_indices=None):
        db = get_db()
        now = datetime.now(timezone.utc).isoformat()
        options_json = json.dumps(options) if isinstance(options, list) else str(options)
        if isinstance(distractors, list):
            distractors_json = json.dumps(distractors)
        elif isinstance(distractors, str):
            try:
                p = json.loads(distractors)
                distractors_json = json.dumps(p) if isinstance(p, list) else json.dumps([distractors])
            except Exception:
                distractors_json = json.dumps([d.strip() for d in distractors.split('\n') if d.strip()])
        else:
            distractors_json = '[]'

        if correct_indices and isinstance(correct_indices, list):
            clean_indices = [int(x) for x in correct_indices]
            if len(clean_indices) > 1:
                question_type = 'multiple'
            correct_index = clean_indices[0] if clean_indices else int(correct_index)
            correct_indices_json = json.dumps(clean_indices)
        else:
            correct_index = int(correct_index)
            correct_indices_json = json.dumps([correct_index])

        cur = db.cursor()
        cur.execute("""
            INSERT INTO qbank_questions (
                category, difficulty, exam_type, client_need, statement, options_json,
                correct_index, correct_rationale, distractors_json, clinical_pearl, is_demo, sort_order, created_at,
                question_type, correct_indices_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (category, difficulty, exam_type, client_need, statement, options_json, int(correct_index), correct_rationale, distractors_json, clinical_pearl, 1 if is_demo else 0, int(sort_order), now, question_type, correct_indices_json))
        db.commit()
        return cls.find_by_id(cur.lastrowid)

    @classmethod
    def update(cls, question_id, **kwargs):
        db = get_db()
        q = cls.find_by_id(question_id)
        if not q:
            return None
        category = kwargs.get('category', q.category)
        difficulty = kwargs.get('difficulty', q.difficulty)
        exam_type = kwargs.get('exam_type', q.exam_type)
        client_need = kwargs.get('client_need', q.client_need)
        statement = kwargs.get('statement', q.statement)
        if 'options' in kwargs:
            opts = kwargs['options']
            options_json = json.dumps(opts) if isinstance(opts, list) else str(opts)
        else:
            options_json = json.dumps(q.options)

        question_type = kwargs.get('question_type', q.question_type)
        if 'correct_indices' in kwargs and kwargs['correct_indices'] is not None:
            clean_indices = [int(x) for x in kwargs['correct_indices']]
            if len(clean_indices) > 1:
                question_type = 'multiple'
            correct_indices_json = json.dumps(clean_indices)
            correct_index = clean_indices[0] if clean_indices else q.correct_index
        else:
            correct_index = int(kwargs.get('correct_index', q.correct_index))
            correct_indices_json = json.dumps(q.correct_indices)

        correct_rationale = kwargs.get('correct_rationale', q.correct_rationale)
        if 'distractors' in kwargs:
            dist = kwargs['distractors']
            if isinstance(dist, list):
                distractors_json = json.dumps(dist)
            elif isinstance(dist, str):
                try:
                    p = json.loads(dist)
                    distractors_json = json.dumps(p) if isinstance(p, list) else json.dumps([dist])
                except Exception:
                    distractors_json = json.dumps([d.strip() for d in dist.split('\n') if d.strip()])
            else:
                distractors_json = '[]'
        else:
            distractors_json = json.dumps(q.distractors)
        clinical_pearl = kwargs.get('clinical_pearl', q.clinical_pearl)
        is_demo = 1 if kwargs.get('is_demo', q.is_demo) else 0
        sort_order = int(kwargs.get('sort_order', q.sort_order))

        db.execute("""
            UPDATE qbank_questions
            SET category = ?, difficulty = ?, exam_type = ?, client_need = ?, statement = ?,
                options_json = ?, correct_index = ?, correct_rationale = ?, distractors_json = ?,
                clinical_pearl = ?, is_demo = ?, sort_order = ?, question_type = ?, correct_indices_json = ?
            WHERE id = ?
        """, (category, difficulty, exam_type, client_need, statement, options_json, correct_index, correct_rationale, distractors_json, clinical_pearl, is_demo, sort_order, question_type, correct_indices_json, question_id))
        db.commit()
        return cls.find_by_id(question_id)

    @classmethod
    def delete(cls, question_id):
        db = get_db()
        db.execute("DELETE FROM qbank_questions WHERE id = ?", (question_id,))
        db.commit()

    @classmethod
    def reset_to_defaults(cls):
        db = get_db()
        db.execute("DELETE FROM qbank_questions")
        now = datetime.now(timezone.utc).isoformat()
        for q in get_default_qbank_questions(now):
            if len(q) == 13:
                q = q + ('single', json.dumps([q[6]]))
            db.execute("""
                INSERT INTO qbank_questions (
                    category, difficulty, exam_type, client_need, statement,
                    options_json, correct_index, correct_rationale, distractors_json,
                    clinical_pearl, is_demo, sort_order, created_at, question_type, correct_indices_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, q)
        db.commit()
        return cls.all()


class QBankPlan:
    def __init__(self, data):
        self.id = data['id']
        self.name = data['name']
        self.description = data.get('description') or ''
        self.duration_days = int(data.get('duration_days', 30))
        self.price = float(data.get('price', 0))
        self.original_price = float(data.get('original_price', 0))
        self.badge = data.get('badge') or ''
        try:
            self.features = json.loads(data['features_json']) if isinstance(data['features_json'], str) else data['features_json']
        except Exception:
            self.features = []
        self.is_active = bool(data.get('is_active', 1))
        self.created_at = data.get('created_at', '')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'durationDays': self.duration_days,
            'price': self.price,
            'originalPrice': self.original_price,
            'badge': self.badge,
            'features': self.features,
            'isActive': self.is_active,
            'createdAt': self.created_at,
        }

    @classmethod
    def all(cls, active_only=False):
        db = get_db()
        sql = "SELECT * FROM qbank_plans"
        if active_only:
            sql += " WHERE is_active = 1"
        sql += " ORDER BY duration_days ASC, price ASC"
        cur = db.execute(sql)
        return [cls(dict(r)) for r in cur.fetchall()]

    @classmethod
    def find_by_id(cls, plan_id):
        db = get_db()
        cur = db.execute("SELECT * FROM qbank_plans WHERE id = ?", (plan_id,))
        row = cur.fetchone()
        return cls(dict(row)) if row else None

    @classmethod
    def create(cls, name, description, duration_days, price, original_price=0, badge='', features=None):
        db = get_db()
        now = datetime.now(timezone.utc).isoformat()
        features_json = json.dumps(features) if isinstance(features, list) else str(features or '[]')
        cur = db.cursor()
        cur.execute("""
            INSERT INTO qbank_plans (name, description, duration_days, price, original_price, badge, features_json, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
        """, (name, description, int(duration_days), float(price), float(original_price), badge, features_json, now))
        db.commit()
        return cls.find_by_id(cur.lastrowid)

    @classmethod
    def update(cls, plan_id, **kwargs):
        db = get_db()
        p = cls.find_by_id(plan_id)
        if not p:
            return None
        name = kwargs.get('name', p.name)
        description = kwargs.get('description', p.description)
        duration_days = int(kwargs.get('duration_days', p.duration_days))
        price = float(kwargs.get('price', p.price))
        original_price = float(kwargs.get('original_price', p.original_price))
        badge = kwargs.get('badge', p.badge)
        if 'features' in kwargs:
            feats = kwargs['features']
            features_json = json.dumps(feats) if isinstance(feats, list) else str(feats)
        else:
            features_json = json.dumps(p.features)
        is_active = 1 if kwargs.get('is_active', p.is_active) else 0

        db.execute("""
            UPDATE qbank_plans
            SET name = ?, description = ?, duration_days = ?, price = ?, original_price = ?, badge = ?, features_json = ?, is_active = ?
            WHERE id = ?
        """, (name, description, duration_days, price, original_price, badge, features_json, is_active, plan_id))
        db.commit()
        return cls.find_by_id(plan_id)


class QBankSubscription:
    def __init__(self, data):
        self.id = data['id']
        self.user_id = data['user_id']
        self.plan_id = data.get('plan_id')
        self.plan_name = data.get('plan_name') or 'Q-Bank Subscription'
        self.duration_days = int(data.get('duration_days', 30))
        self.price = float(data.get('price', 0))
        self.status = data.get('status') or 'pending'
        self.whatsapp_number = data.get('whatsapp_number') or ''
        self.payment_screenshot = data.get('payment_screenshot') or ''
        self.enrolled_at = data.get('enrolled_at', '')
        self.reviewed_at = data.get('reviewed_at')
        self.expires_at = data.get('expires_at')
        self.notes = data.get('notes') or ''

    def to_dict(self):
        user = User.find_by_id(self.user_id) if self.user_id else None
        now_dt = datetime.now(timezone.utc)
        is_active = False
        days_remaining = 0
        if self.status == 'approved':
            if not self.expires_at:
                is_active = True
                days_remaining = 999
            else:
                try:
                    exp_dt = datetime.fromisoformat(self.expires_at.replace('Z', '+00:00'))
                    if exp_dt > now_dt:
                        is_active = True
                        days_remaining = max(0, (exp_dt - now_dt).days)
                except Exception:
                    is_active = True
                    days_remaining = self.duration_days

        return {
            'id': self.id,
            'userId': self.user_id,
            'user': user.to_dict() if user else None,
            'studentName': f"{user.first_name} {user.last_name}".strip() if user else 'Unknown Student',
            'studentEmail': user.email if user else '',
            'planId': self.plan_id,
            'planName': self.plan_name,
            'durationDays': self.duration_days,
            'price': self.price,
            'status': self.status,
            'whatsappNumber': self.whatsapp_number,
            'paymentScreenshot': self.payment_screenshot,
            'enrolledAt': self.enrolled_at,
            'reviewedAt': self.reviewed_at,
            'expiresAt': self.expires_at,
            'isActive': is_active,
            'daysRemaining': days_remaining,
            'notes': self.notes,
        }

    @classmethod
    def find_by_id(cls, sub_id):
        db = get_db()
        cur = db.execute("SELECT * FROM qbank_subscriptions WHERE id = ?", (sub_id,))
        row = cur.fetchone()
        return cls(dict(row)) if row else None

    @classmethod
    def find_by_user_id(cls, user_id):
        db = get_db()
        cur = db.execute("SELECT * FROM qbank_subscriptions WHERE user_id = ? ORDER BY id DESC", (user_id,))
        return [cls(dict(r)) for r in cur.fetchall()]

    find_by_user = find_by_user_id

    @classmethod
    def user_has_active(cls, user_id):
        db = get_db()
        cur = db.execute("""
            SELECT * FROM qbank_subscriptions
            WHERE user_id = ? AND status = 'approved'
            ORDER BY id DESC
        """, (user_id,))
        now_dt = datetime.now(timezone.utc)
        for r in cur.fetchall():
            sub = cls(dict(r))
            if not sub.expires_at:
                return True
            try:
                exp_dt = datetime.fromisoformat(sub.expires_at.replace('Z', '+00:00'))
                if exp_dt > now_dt:
                    return True
            except Exception:
                return True
        return False

    @classmethod
    def get_active_for_user(cls, user_id):
        subs = cls.find_by_user(user_id)
        now_dt = datetime.now(timezone.utc)
        for s in subs:
            if s.status == 'approved':
                if not s.expires_at:
                    return s
                try:
                    exp_dt = datetime.fromisoformat(s.expires_at.replace('Z', '+00:00'))
                    if exp_dt > now_dt:
                        return s
                except Exception:
                    return s
        return None

    @classmethod
    def get_user_status(cls, user_id):
        db = get_db()
        cur = db.execute("""
            SELECT * FROM qbank_subscriptions
            WHERE user_id = ?
            ORDER BY id DESC
        """, (user_id,))
        rows = [cls(dict(r)) for r in cur.fetchall()]
        if not rows:
            return {'hasAccess': False, 'status': 'none', 'subscription': None, 'daysRemaining': 0}

        now_dt = datetime.now(timezone.utc)
        for sub in rows:
            if sub.status == 'approved':
                if not sub.expires_at:
                    return {'hasAccess': True, 'status': 'approved', 'subscription': sub.to_dict(), 'daysRemaining': 999}
                try:
                    exp_dt = datetime.fromisoformat(sub.expires_at.replace('Z', '+00:00'))
                    if exp_dt > now_dt:
                        days = max(0, (exp_dt - now_dt).days)
                        return {'hasAccess': True, 'status': 'approved', 'subscription': sub.to_dict(), 'daysRemaining': days}
                except Exception:
                    return {'hasAccess': True, 'status': 'approved', 'subscription': sub.to_dict(), 'daysRemaining': sub.duration_days}

        latest = rows[0]
        return {
            'hasAccess': False,
            'status': latest.status,
            'subscription': latest.to_dict(),
            'daysRemaining': 0
        }

    @classmethod
    def create(cls, user_id, plan_id, plan_name, duration_days, price, whatsapp_number='', payment_screenshot='', status='pending'):
        db = get_db()
        now = datetime.now(timezone.utc).isoformat()
        cur = db.cursor()
        cur.execute("""
            INSERT INTO qbank_subscriptions (
                user_id, plan_id, plan_name, duration_days, price,
                status, whatsapp_number, payment_screenshot, enrolled_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (user_id, plan_id, plan_name, int(duration_days), float(price), status, whatsapp_number, payment_screenshot, now))
        db.commit()
        return cls.find_by_id(cur.lastrowid)

    @classmethod
    def all(cls, status=None):
        db = get_db()
        sql = "SELECT * FROM qbank_subscriptions"
        params = []
        if status:
            sql += " WHERE status = ?"
            params.append(status)
        sql += " ORDER BY id DESC"
        cur = db.execute(sql, tuple(params)) if params else db.execute(sql)
        return [cls(dict(r)) for r in cur.fetchall()]

    @classmethod
    def approve(cls, sub_id, notes=None):
        db = get_db()
        sub = cls.find_by_id(sub_id)
        if not sub:
            return None
        now_dt = datetime.now(timezone.utc)
        exp_dt = now_dt + timedelta(days=sub.duration_days)
        reviewed_at = now_dt.isoformat()
        expires_at = exp_dt.isoformat()
        db.execute("""
            UPDATE qbank_subscriptions
            SET status = 'approved', reviewed_at = ?, expires_at = ?, notes = COALESCE(?, notes)
            WHERE id = ?
        """, (reviewed_at, expires_at, notes, sub_id))
        db.commit()
        return cls.find_by_id(sub_id)

    @classmethod
    def reject(cls, sub_id, notes=None):
        db = get_db()
        now_dt = datetime.now(timezone.utc)
        reviewed_at = now_dt.isoformat()
        db.execute("""
            UPDATE qbank_subscriptions
            SET status = 'rejected', reviewed_at = ?, notes = COALESCE(?, notes)
            WHERE id = ?
        """, (reviewed_at, notes, sub_id))
        db.commit()
        return cls.find_by_id(sub_id)

    @classmethod
    def delete(cls, sub_id):
        db = get_db()
        db.execute("DELETE FROM qbank_subscriptions WHERE id = ?", (sub_id,))
        db.commit()

    @classmethod
    def update(cls, sub_id, **kwargs):
        db = get_db()
        sub = cls.find_by_id(sub_id)
        if not sub:
            return None
        status = kwargs.get('status', sub.status)
        plan_name = kwargs.get('plan_name', sub.plan_name)
        duration_days = int(kwargs.get('duration_days', sub.duration_days))
        expires_at = kwargs.get('expires_at', sub.expires_at)
        notes = kwargs.get('notes', sub.notes)
        db.execute("""
            UPDATE qbank_subscriptions
            SET status = ?, plan_name = ?, duration_days = ?, expires_at = ?, notes = ?
            WHERE id = ?
        """, (status, plan_name, duration_days, expires_at, notes, sub_id))
        db.commit()
        return cls.find_by_id(sub_id)

    @classmethod
    def extend(cls, sub_id, add_days=30, notes=None):
        db = get_db()
        sub = cls.find_by_id(sub_id)
        if not sub:
            return None
        now_dt = datetime.now(timezone.utc)
        current_exp = None
        if sub.expires_at:
            try:
                current_exp = datetime.fromisoformat(sub.expires_at.replace('Z', '+00:00'))
            except Exception:
                pass
        base_dt = current_exp if (current_exp and current_exp > now_dt) else now_dt
        new_exp_dt = base_dt + timedelta(days=int(add_days))
        new_duration = sub.duration_days + int(add_days)
        new_notes = f"{sub.notes} | Extended +{add_days}d".strip(' |') if not notes else notes
        db.execute("""
            UPDATE qbank_subscriptions
            SET status = 'approved', expires_at = ?, duration_days = ?, notes = ?
            WHERE id = ?
        """, (new_exp_dt.isoformat(), new_duration, new_notes, sub_id))
        db.commit()
        return cls.find_by_id(sub_id)


class StudentNotification:
    def __init__(self, data):
        self.id = data['id']
        self.user_id = data['user_id']
        self.title = data['title']
        self.message = data['message']
        self.type = data.get('type') or 'general'
        self.is_read = bool(data.get('is_read', 0))
        self.link = data.get('link') or ''
        self.created_at = data.get('created_at', '')

    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'title': self.title,
            'message': self.message,
            'type': self.type,
            'isRead': self.is_read,
            'link': self.link,
            'createdAt': self.created_at
        }

    @classmethod
    def create(cls, user_id, title, message, type='general', link=''):
        db = get_db()
        now = datetime.now(timezone.utc).isoformat()
        cur = db.cursor()
        cur.execute("""
            INSERT INTO student_notifications (user_id, title, message, type, is_read, link, created_at)
            VALUES (?, ?, ?, ?, 0, ?, ?)
        """, (int(user_id), title, message, type, link, now))
        db.commit()
        return cls.find_by_id(cur.lastrowid)

    @classmethod
    def find_by_id(cls, notif_id):
        db = get_db()
        cur = db.execute("SELECT * FROM student_notifications WHERE id = ?", (notif_id,))
        row = cur.fetchone()
        return cls(dict(row)) if row else None

    @classmethod
    def get_for_user(cls, user_id, limit=40):
        db = get_db()
        cur = db.execute("""
            SELECT * FROM student_notifications
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT ?
        """, (int(user_id), int(limit)))
        return [cls(dict(r)) for r in cur.fetchall()]

    @classmethod
    def get_unread_count(cls, user_id):
        db = get_db()
        cur = db.execute("SELECT COUNT(*) FROM student_notifications WHERE user_id = ? AND is_read = 0", (int(user_id),))
        row = cur.fetchone()
        return row[0] if row else 0

    @classmethod
    def mark_as_read(cls, notif_id, user_id=None):
        db = get_db()
        if user_id:
            db.execute("UPDATE student_notifications SET is_read = 1 WHERE id = ? AND user_id = ?", (notif_id, user_id))
        else:
            db.execute("UPDATE student_notifications SET is_read = 1 WHERE id = ?", (notif_id,))
        db.commit()

    @classmethod
    def mark_all_as_read(cls, user_id):
        db = get_db()
        db.execute("UPDATE student_notifications SET is_read = 1 WHERE user_id = ?", (int(user_id),))
        db.commit()


class StudentQBankAttempt:
    def __init__(self, data):
        self.id = data['id']
        self.user_id = data['user_id']
        self.question_id = data['question_id']
        self.question_type = data.get('question_type') or 'single'
        self.category = data.get('category') or ''
        self.difficulty = data.get('difficulty') or ''
        self.exam_type = data.get('exam_type') or 'NCLEX-RN'
        self.selected_indices_json = data.get('selected_indices_json') or '[]'
        self.is_correct = bool(data.get('is_correct', 0))
        self.attempted_at = data.get('attempted_at', '')

    @classmethod
    def record(cls, user_id, question_id, is_correct, selected_indices=None, question_type='single', category='', difficulty='', exam_type='NCLEX-RN'):
        db = get_db()
        now = datetime.now(timezone.utc).isoformat()
        sel_json = json.dumps(selected_indices) if isinstance(selected_indices, list) else str(selected_indices or '[]')
        cur = db.cursor()
        cur.execute("""
            INSERT INTO student_qbank_attempts (
                user_id, question_id, question_type, category, difficulty, exam_type, selected_indices_json, is_correct, attempted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (int(user_id), int(question_id), question_type, category, difficulty, exam_type, sel_json, 1 if is_correct else 0, now))
        db.commit()
        return cur.lastrowid

    @classmethod
    def get_user_stats(cls, user_id):
        db = get_db()
        cur = db.execute("""
            SELECT
                COUNT(*) as total_attempts,
                COUNT(CASE WHEN is_correct = 1 THEN 1 END) as total_correct,
                COUNT(CASE WHEN question_type = 'single' THEN 1 END) as single_attempts,
                COUNT(CASE WHEN question_type = 'single' AND is_correct = 1 THEN 1 END) as single_correct,
                COUNT(CASE WHEN question_type = 'multiple' THEN 1 END) as multiple_attempts,
                COUNT(CASE WHEN question_type = 'multiple' AND is_correct = 1 THEN 1 END) as multiple_correct
            FROM student_qbank_attempts
            WHERE user_id = ?
        """, (int(user_id),))
        row = cur.fetchone()
        counts = dict(row) if row else {}
        total_att = counts.get('total_attempts', 0)
        total_corr = counts.get('total_correct', 0)
        overall_accuracy = round((total_corr / total_att * 100), 1) if total_att > 0 else 0.0

        cur = db.execute("""
            SELECT COUNT(DISTINCT question_id) FROM student_qbank_attempts WHERE user_id = ?
        """, (int(user_id),))
        unique_questions = cur.fetchone()[0] or 0

        cur = db.execute("""
            SELECT
                category,
                COUNT(*) as attempted,
                COUNT(CASE WHEN is_correct = 1 THEN 1 END) as correct
            FROM student_qbank_attempts
            WHERE user_id = ? AND category != ''
            GROUP BY category
            ORDER BY attempted DESC
        """, (int(user_id),))
        category_breakdown = []
        for r in cur.fetchall():
            att = r['attempted']
            corr = r['correct']
            rate = round((corr / att * 100), 1) if att > 0 else 0.0
            category_breakdown.append({
                'category': r['category'],
                'attempted': att,
                'correct': corr,
                'accuracyRate': rate
            })

        cur = db.execute("""
            SELECT a.*, q.statement, q.options_json, q.correct_indices_json, q.clinical_pearl
            FROM student_qbank_attempts a
            LEFT JOIN qbank_questions q ON a.question_id = q.id
            WHERE a.user_id = ?
            ORDER BY a.id DESC
            LIMIT 15
        """, (int(user_id),))
        recent_attempts = []
        for r in cur.fetchall():
            d = dict(r)
            recent_attempts.append({
                'id': d['id'],
                'questionId': d['question_id'],
                'questionType': d['question_type'],
                'statement': d.get('statement') or 'Clinical Practice Question',
                'category': d['category'],
                'difficulty': d['difficulty'],
                'isCorrect': bool(d['is_correct']),
                'attemptedAt': d['attempted_at']
            })

        return {
            'totalAttempted': total_att,
            'totalCorrect': total_corr,
            'correctCount': total_corr,
            'incorrectCount': max(0, total_att - total_corr),
            'uniqueQuestions': unique_questions,
            'uniqueQuestionsAnswered': unique_questions,
            'accuracyRate': overall_accuracy,
            'singleAttempts': counts.get('single_attempts', 0),
            'singleCorrect': counts.get('single_correct', 0),
            'multipleAttempts': counts.get('multiple_attempts', 0),
            'multipleCorrect': counts.get('multiple_correct', 0),
            'categoryBreakdown': category_breakdown,
            'categoryBreakdownMap': {r['category']: r for r in category_breakdown},
            'recentAttempts': recent_attempts
        }



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
    Inspect Authorization header, query parameter, or cookies and set g.user_id if valid.
    Returns True if valid token present, False otherwise.
    """
    auth_header = request.headers.get('Authorization', '')
    token = None
    if auth_header.startswith('Bearer '):
        token = auth_header.split(' ', 1)[1].strip()
    elif 'token' in request.args:
        token = request.args.get('token', '').strip()
    elif 'nclex_token' in request.cookies:
        token = request.cookies.get('nclex_token', '').strip()
    elif 'token' in request.cookies:
        token = request.cookies.get('token', '').strip()

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
            user_id = getattr(g, 'user_id', None)
            g.current_user = User.find_by_id(user_id) if user_id else None
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
        upload_folder = os.path.join(Config.UPLOAD_FOLDER, 'payments')
        try:
            os.makedirs(upload_folder, exist_ok=True)
            file.save(os.path.join(upload_folder, saved_filename))
        except Exception:
            pass
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
# 6B. Q-BANK (QUESTION BANK) REST API ROUTES (/api/qbank)
# ==============================================================================
qbank_bp = Blueprint('qbank', __name__, url_prefix='/api/qbank')


# ── 1. GET ALL ACTIVE PLANS (Public) ───────────────────────────────────────────
@qbank_bp.route('/plans', methods=['GET'])
def get_qbank_plans():
    plans = QBankPlan.all(active_only=True)
    return jsonify({
        'success': True,
        'plans': [p.to_dict() for p in plans]
    }), 200


def check_user_platform_access(user_id):
    """
    Check if a user has full platform MCQ access.
    Returns a dict with:
        has_access: bool
        is_admin: bool
        is_course_enrolled: bool
        has_qbank_sub: bool
        status: str ('approved', 'pending', 'expired', 'none', 'unauthenticated')
        plan_name: str
        days_remaining: int
        subscription: dict or None
    """
    if not user_id:
        return {
            'has_access': False,
            'is_admin': False,
            'is_course_enrolled': False,
            'has_qbank_sub': False,
            'status': 'unauthenticated',
            'plan_name': None,
            'days_remaining': 0,
            'subscription': None
        }

    try:
        uid = int(user_id)
    except (ValueError, TypeError):
        return {
            'has_access': False,
            'is_admin': False,
            'is_course_enrolled': False,
            'has_qbank_sub': False,
            'status': 'invalid',
            'plan_name': None,
            'days_remaining': 0,
            'subscription': None
        }

    user = User.find_by_id(uid)
    if not user:
        return {
            'has_access': False,
            'is_admin': False,
            'is_course_enrolled': False,
            'has_qbank_sub': False,
            'status': 'not_found',
            'plan_name': None,
            'days_remaining': 0,
            'subscription': None
        }

    # 1. Administrator has immediate, permanent 100% full access to all MCQs across the platform
    if user.role == 'admin':
        return {
            'has_access': True,
            'is_admin': True,
            'is_course_enrolled': False,
            'has_qbank_sub': True,
            'status': 'approved',
            'plan_name': 'Administrator All-Access',
            'days_remaining': 9999,
            'subscription': {
                'planName': 'Administrator All-Access',
                'status': 'approved',
                'daysRemaining': 9999
            }
        }

    # 2. Check active Q-Bank subscription
    sub_status = QBankSubscription.get_user_status(uid)
    if sub_status.get('hasAccess'):
        sub_dict = sub_status.get('subscription') or {}
        return {
            'has_access': True,
            'is_admin': False,
            'is_course_enrolled': False,
            'has_qbank_sub': True,
            'status': 'approved',
            'plan_name': sub_dict.get('planName') or 'Q-Bank Subscription',
            'days_remaining': sub_status.get('daysRemaining', 30),
            'subscription': sub_dict
        }

    # 3. Check approved course enrollments:
    # "if some one got approval then they can use every MCQs of the platform"
    enrollments = Enrollment.find_by_user(uid)
    approved_enrollments = [e for e in enrollments if e.status == 'approved']
    if approved_enrollments:
        first_course_name = approved_enrollments[0].course.title if (approved_enrollments[0].course and approved_enrollments[0].course.title) else 'Enrolled Course'
        return {
            'has_access': True,
            'is_admin': False,
            'is_course_enrolled': True,
            'has_qbank_sub': False,
            'status': 'approved',
            'plan_name': f'Course Enrolled All-Access ({first_course_name})',
            'days_remaining': 365,
            'subscription': {
                'planName': f'Course Enrolled All-Access ({first_course_name})',
                'status': 'approved',
                'daysRemaining': 365
            }
        }

    # Check for pending status
    pending_sub = (sub_status.get('status') == 'pending')
    pending_course = any(e.status == 'pending' for e in enrollments)
    status_str = 'pending' if (pending_sub or pending_course) else sub_status.get('status', 'none')

    return {
        'has_access': False,
        'is_admin': False,
        'is_course_enrolled': False,
        'has_qbank_sub': False,
        'status': status_str,
        'plan_name': None,
        'days_remaining': 0,
        'subscription': sub_status.get('subscription')
    }


# ── 2. GET USER Q-BANK SUBSCRIPTION STATUS ────────────────────────────────────
@qbank_bp.route('/status', methods=['GET'])
@jwt_required(optional=True)
def get_qbank_status():
    user_id = get_jwt_identity()
    if not user_id:
        return jsonify({
            'success': True,
            'isAuthenticated': False,
            'hasAccess': False,
            'isAdmin': False,
            'status': 'unauthenticated',
            'subscription': None,
            'daysRemaining': 0
        }), 200

    access = check_user_platform_access(user_id)
    if access['status'] == 'not_found':
        return jsonify({'success': False, 'message': 'User not found.'}), 404

    return jsonify({
        'success': True,
        'isAuthenticated': True,
        'hasAccess': access['has_access'],
        'isAdmin': access['is_admin'],
        'isCourseEnrolled': access['is_course_enrolled'],
        'status': access['status'],
        'subscription': access.get('subscription') or {
            'planName': access['plan_name'],
            'status': access['status'],
            'daysRemaining': access['days_remaining']
        },
        'daysRemaining': access['days_remaining']
    }), 200


# ── 3. SUBSCRIBE TO Q-BANK (Upload payment receipt / submit plan) ───────────────
@qbank_bp.route('/subscribe', methods=['POST'])
@jwt_required()
def subscribe_qbank():
    user_id = get_jwt_identity()
    user = User.find_by_id(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found.'}), 404

    whatsapp_number = ''
    plan_id = None
    notes = ''
    payment_screenshot = ''

    if request.is_json:
        data = request.get_json(silent=True) or {}
        plan_id = data.get('planId') or data.get('plan_id')
        whatsapp_number = data.get('whatsappNumber') or data.get('whatsapp_number') or ''
        notes = data.get('notes') or ''
        payment_screenshot = data.get('paymentScreenshot') or data.get('payment_screenshot') or ''
    else:
        plan_id = request.form.get('planId') or request.form.get('plan_id')
        whatsapp_number = request.form.get('whatsappNumber') or request.form.get('whatsapp_number') or ''
        notes = request.form.get('notes') or ''
        payment_screenshot = request.form.get('paymentScreenshot') or request.form.get('payment_screenshot') or ''

    # Handle file upload for payment screenshot
    file = request.files.get('screenshot') or request.files.get('payment_screenshot') or request.files.get('paymentScreenshot')
    if file and file.filename:
        filename = secure_filename(file.filename)
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf']:
            ext = '.jpg'
        saved_filename = f"qbank_pay_u{user_id}_p{plan_id}_{uuid.uuid4().hex[:8]}{ext}"
        upload_folder = os.path.join(Config.UPLOAD_FOLDER, 'payments')
        try:
            os.makedirs(upload_folder, exist_ok=True)
            file.save(os.path.join(upload_folder, saved_filename))
            payment_screenshot = f"/uploads/payments/{saved_filename}"
        except Exception as e:
            app.logger.warning(f"QBank payment screenshot upload failed: {e}")

    # Validate plan
    plan = None
    if plan_id:
        try:
            plan = QBankPlan.find_by_id(int(plan_id))
        except (ValueError, TypeError):
            plan = None

    if not plan:
        plans = QBankPlan.all(active_only=True)
        if plans:
            plan = plans[0]
        else:
            return jsonify({'success': False, 'message': 'Invalid plan selected.'}), 400

    # Create subscription record
    sub = QBankSubscription.create(
        user_id=user_id,
        plan_id=plan.id,
        plan_name=plan.name,
        duration_days=plan.duration_days,
        price=plan.price,
        whatsapp_number=whatsapp_number,
        payment_screenshot=payment_screenshot,
        status='pending'
    )

    ActivityLog.log(
        'Q-Bank Subscription Requested',
        f'Student {user.first_name} {user.last_name} ({user.email}) requested Q-Bank "{plan.name}" ({plan.duration_days} days, Rs. {plan.price:,.0f})',
        user.id,
        user.email
    )

    return jsonify({
        'success': True,
        'message': 'Your Q-Bank subscription request has been submitted successfully! The administrator will review and approve your access shortly.',
        'subscription': sub.to_dict()
    }), 201


# ── 4. GET PRACTICE QUESTIONS (Demo mode vs Full Subscriber mode) ───────────────
@qbank_bp.route('/questions', methods=['GET'])
@jwt_required(optional=True)
def get_qbank_questions():
    user_id = get_jwt_identity()
    access = check_user_platform_access(user_id)
    has_access = access['has_access']

    category = request.args.get('category')
    difficulty = request.args.get('difficulty')
    exam_type = request.args.get('exam_type')

    # If user has access (admin, subscribed, or course-approved), return all matching questions.
    # Otherwise return only questions with is_demo = 1.
    questions = QBankQuestion.all(
        category=category,
        difficulty=difficulty,
        exam_type=exam_type,
        is_demo_only=not has_access
    )

    total_in_db = QBankQuestion.count(is_demo_only=False)
    demo_in_db = QBankQuestion.count(is_demo_only=True)

    return jsonify({
        'success': True,
        'isSubscribed': has_access,
        'hasAccess': has_access,
        'isAdmin': access['is_admin'],
        'isCourseEnrolled': access['is_course_enrolled'],
        'demoMode': not has_access,
        'totalAvailable': len(questions),
        'totalInBank': total_in_db,
        'demoCount': demo_in_db,
        'questions': [q.to_dict(include_answers=True) for q in questions]
    }), 200


# ── 5. CHECK ANSWER & GET RATIONALE (Tutor Mode) ──────────────────────────────
@qbank_bp.route('/check-answer', methods=['POST'])
@jwt_required(optional=True)
def check_qbank_answer():
    data = request.get_json(silent=True) or {}
    question_id = data.get('questionId') or data.get('question_id')
    selected_indices = data.get('selectedIndices') or data.get('selected_indices')
    selected_index = data.get('selectedIndex') if 'selectedIndex' in data else data.get('selected_index')

    if question_id is None or (selected_indices is None and selected_index is None):
        return jsonify({'success': False, 'message': 'questionId and selectedIndex or selectedIndices are required.'}), 422

    q = QBankQuestion.find_by_id(int(question_id))
    if not q:
        return jsonify({'success': False, 'message': 'Question not found.'}), 404

    if selected_indices is not None and isinstance(selected_indices, list):
        user_picks = sorted(set(int(x) for x in selected_indices if str(x).lstrip('-').isdigit() or isinstance(x, int)))
    elif selected_index is not None:
        user_picks = [int(selected_index)]
    else:
        user_picks = []

    target_picks = sorted(set(q.correct_indices))
    is_correct = (user_picks == target_picks)

    letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    correct_letters = [letters[i] for i in target_picks if i < len(letters)]
    user_letters = [letters[i] for i in user_picks if i < len(letters)]

    matched = [idx for idx in user_picks if idx in target_picks]
    missed = [idx for idx in target_picks if idx not in user_picks]
    extra = [idx for idx in user_picks if idx not in target_picks]

    # If student is authenticated, log their question attempt & update clinical score
    user_id = get_jwt_identity()
    if user_id:
        try:
            StudentQBankAttempt.record(
                user_id=user_id,
                question_id=q.id,
                is_correct=1 if is_correct else 0,
                selected_indices=user_picks,
                question_type=q.question_type,
                category=q.category,
                difficulty=q.difficulty,
                exam_type=q.exam_type
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Error recording student question attempt: {e}")

    return jsonify({
        'success': True,
        'isCorrect': is_correct,
        'questionType': q.question_type,
        'isMultipleResponse': bool(q.question_type == 'multiple' or len(target_picks) > 1),
        'correctIndex': q.correct_index,
        'correctIndices': target_picks,
        'correctLetters': correct_letters,
        'userIndices': user_picks,
        'userLetters': user_letters,
        'matched': matched,
        'missed': missed,
        'extra': extra,
        'correctRationale': q.correct_rationale,
        'distractors': q.distractors,
        'clinicalPearl': q.clinical_pearl
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

    # Q-Bank metrics
    cur = db.execute("""
        SELECT
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as qbank_pending,
            COUNT(CASE WHEN status = 'approved' THEN 1 END) as qbank_approved,
            COUNT(CASE WHEN status = 'rejected' THEN 1 END) as qbank_rejected,
            COUNT(*) as qbank_total,
            COALESCE(SUM(CASE WHEN status = 'approved' THEN price ELSE 0 END), 0) as qbank_revenue
        FROM qbank_subscriptions
    """)
    qb_counts = dict(cur.fetchone())

    cur = db.execute("SELECT COUNT(*) FROM qbank_questions")
    qbank_questions_count = cur.fetchone()[0]

    cur = db.execute("SELECT COUNT(*) FROM qbank_questions WHERE is_demo = 1")
    qbank_demo_count = cur.fetchone()[0]

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
            # Q-Bank Metrics
            'qbankQuestionsCount': qbank_questions_count,
            'qbankDemoCount': qbank_demo_count,
            'qbankPendingCount': qb_counts['qbank_pending'],
            'qbankApprovedCount': qb_counts['qbank_approved'],
            'qbankRejectedCount': qb_counts['qbank_rejected'],
            'qbankTotalSubscriptions': qb_counts['qbank_total'],
            'qbankRevenue': float(qb_counts['qbank_revenue']),
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
        StudentNotification.create(
            enrollment.user_id,
            'Course Enrollment Verified! 📚',
            f'Your registration for "{course_title}" has been approved! You now have full access to class curriculum and live sessions.',
            type='course',
            link='/courses'
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
        StudentNotification.create(
            enrollment.user_id,
            'Course Registration Update ⚠️',
            f'Your registration for "{course_title}" requires attention: {notes}',
            type='course',
            link='/courses'
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

    upload_dir = os.path.join(Config.UPLOAD_FOLDER, 'courses')
    try:
        os.makedirs(upload_dir, exist_ok=True)
    except Exception:
        pass

    orig_name = secure_filename(file.filename)
    ext = orig_name.rsplit('.', 1)[1].lower() if '.' in orig_name else 'jpg'
    unique_name = f"course_{uuid.uuid4().hex[:12]}.{ext}"
    dest_path = os.path.join(upload_dir, unique_name)

    try:
        file.save(dest_path)
    except Exception:
        pass
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


# ── Q-BANK QUESTIONS MANAGEMENT (Admin) ───────────────────────────────────────
@admin_bp.route('/qbank/questions', methods=['GET'])
@admin_required()
def admin_list_qbank_questions():
    category = request.args.get('category')
    difficulty = request.args.get('difficulty')
    exam_type = request.args.get('exam_type')
    is_demo = request.args.get('is_demo')
    q_search = request.args.get('q', '').strip().lower()

    questions = QBankQuestion.all(
        category=category,
        difficulty=difficulty,
        exam_type=exam_type,
        is_demo=is_demo
    )

    if q_search:
        questions = [
            q for q in questions
            if q_search in q.statement.lower() or
               q_search in q.category.lower() or
               q_search in q.correct_rationale.lower() or
               q_search in q.clinical_pearl.lower()
        ]

    return jsonify({
        'success': True,
        'total': len(questions),
        'questions': [q.to_dict(include_answers=True) for q in questions]
    }), 200


@admin_bp.route('/qbank/questions', methods=['POST'])
@admin_required()
def admin_create_qbank_question():
    data = request.get_json(silent=True) or {}
    statement = data.get('statement', '').strip()
    options = data.get('options', [])
    question_type = data.get('question_type') or data.get('questionType') or 'single'
    correct_indices = data.get('correct_indices') or data.get('correctIndices')
    correct_index = data.get('correct_index') if 'correct_index' in data else data.get('correctIndex')
    correct_rationale = data.get('correct_rationale') or data.get('correctRationale', '').strip()
    category = data.get('category', 'Pharmacology & Parenteral Therapies')
    difficulty = data.get('difficulty', 'High Yield')
    exam_type = data.get('exam_type') or data.get('examType', 'NCLEX-RN')
    client_need = data.get('client_need') or data.get('clientNeed', '')
    distractors = data.get('distractors', [])
    clinical_pearl = data.get('clinical_pearl') or data.get('clinicalPearl', '')
    is_demo = 1 if (data.get('is_demo') or data.get('isDemo')) else 0
    sort_order = int(data.get('sort_order') or data.get('sortOrder') or 0)

    if not statement:
        return jsonify({'success': False, 'message': 'Question statement is required.'}), 422
    if not isinstance(options, list) or len(options) < 2:
        return jsonify({'success': False, 'message': 'At least 2 answer choices are required.'}), 422

    if correct_indices and isinstance(correct_indices, list):
        clean_indices = [int(x) for x in correct_indices if str(x).isdigit() or isinstance(x, int)]
        if len(clean_indices) > 1:
            question_type = 'multiple'
        if correct_index is None and clean_indices:
            correct_index = clean_indices[0]
        correct_indices = clean_indices
    elif correct_index is not None:
        correct_indices = [int(correct_index)]
    else:
        return jsonify({'success': False, 'message': 'Valid correct choice is required.'}), 422

    if correct_index is None or int(correct_index) < 0 or int(correct_index) >= len(options):
        return jsonify({'success': False, 'message': 'Valid correct choice is required.'}), 422
    if not correct_rationale:
        return jsonify({'success': False, 'message': 'Correct answer rationale is required.'}), 422

    q = QBankQuestion.create(
        category=category,
        difficulty=difficulty,
        statement=statement,
        options=options,
        correct_index=int(correct_index),
        correct_rationale=correct_rationale,
        distractors=distractors,
        clinical_pearl=clinical_pearl,
        client_need=client_need,
        exam_type=exam_type,
        is_demo=is_demo,
        sort_order=sort_order,
        question_type=question_type,
        correct_indices=correct_indices
    )

    admin_user = g.current_user
    admin_name = f"{admin_user.first_name} {admin_user.last_name}".strip()
    ActivityLog.log(
        'Q-Bank Question Created',
        f'Admin {admin_name} created question #{q.id} in "{category}" ({exam_type})',
        admin_user.id,
        admin_user.email
    )

    return jsonify({
        'success': True,
        'message': 'Q-Bank question created successfully.',
        'question': q.to_dict(include_answers=True)
    }), 201


def _normalize_bulk_qbank_item(item, index=0, default_exam_type='NCLEX-RN', default_category='Pharmacology & Parenteral Therapies', default_demo=0):
    """
    Robust normalizer for bulk imported MCQ and MSQ (Select All That Apply) questions.
    Supports varied keys (type/msq_type/question_type, options, correct_index/indices/letters, rationales).
    """
    if not isinstance(item, dict):
        return None, f"Item #{index + 1} is not a valid JSON object."

    statement = (
        item.get('statement') or
        item.get('question') or
        item.get('title') or
        item.get('stem') or
        item.get('prompt') or
        item.get('text') or
        item.get('question_text') or
        item.get('questionText') or
        ''
    )
    if not isinstance(statement, str) or not statement.strip():
        return None, f"Item #{index + 1} has an empty or missing question statement."
    statement = statement.strip()

    # Determine MSQ / MCQ Question Type
    raw_type = (
        item.get('type') or
        item.get('question_type') or
        item.get('questionType') or
        item.get('msq_type') or
        item.get('msqType') or
        item.get('mcq_type') or
        item.get('mcqType') or
        item.get('item_type') or
        item.get('itemType') or
        ''
    )
    raw_type_str = str(raw_type).strip().lower()

    # Parse options array or dictionary
    raw_options = item.get('options') or item.get('choices') or item.get('answers') or []
    extracted_correct_from_options = []
    options = []

    if isinstance(raw_options, dict):
        # e.g. {"A": "Option 1", "B": "Option 2"}
        sorted_keys = sorted(raw_options.keys())
        for k in sorted_keys:
            v = str(raw_options[k]).strip()
            if v:
                options.append(v)
    elif isinstance(raw_options, list):
        for opt_idx, opt in enumerate(raw_options):
            if isinstance(opt, dict):
                opt_text = opt.get('text') or opt.get('option') or opt.get('label') or str(opt)
                opt_text = str(opt_text).strip()
                options.append(opt_text)
                if opt.get('is_correct') or opt.get('isCorrect') or opt.get('correct'):
                    extracted_correct_from_options.append(opt_idx)
            else:
                opt_text = str(opt).strip()
                if opt_text:
                    options.append(opt_text)
    else:
        return None, f"Item #{index + 1} options must be an array or object."

    if len(options) < 2:
        return None, f"Item #{index + 1} must have at least 2 valid options (found {len(options)})."

    # Parse correct answers (indices, letters, or matching values)
    correct_indices = []
    if extracted_correct_from_options:
        correct_indices = extracted_correct_from_options
    else:
        raw_correct = (
            item.get('correct_indices') if 'correct_indices' in item else
            item.get('correctIndices') if 'correctIndices' in item else
            item.get('correct_index') if 'correct_index' in item else
            item.get('correctIndex') if 'correctIndex' in item else
            item.get('correct_letters') if 'correct_letters' in item else
            item.get('correctLetters') if 'correctLetters' in item else
            item.get('correct_letter') if 'correct_letter' in item else
            item.get('correctLetter') if 'correctLetter' in item else
            item.get('correct_answers') if 'correct_answers' in item else
            item.get('correctAnswers') if 'correctAnswers' in item else
            item.get('correct_answer') if 'correct_answer' in item else
            item.get('correctAnswer') if 'correctAnswer' in item else
            item.get('correct') if 'correct' in item else
            item.get('answer') if 'answer' in item else
            item.get('key')
        )

        def _parse_token(tok):
            if isinstance(tok, int):
                return tok
            tok_str = str(tok).strip()
            if tok_str.isdigit():
                return int(tok_str)
            clean_tok = tok_str.upper()
            if clean_tok.startswith('OPTION ') or clean_tok.startswith('CHOICE '):
                clean_tok = clean_tok.split()[-1]
            if len(clean_tok) == 1 and 'A' <= clean_tok <= 'Z':
                return ord(clean_tok) - ord('A')
            # Check match against option text
            for o_i, o_val in enumerate(options):
                if o_val.strip().lower() == tok_str.lower():
                    return o_i
            return None

        if isinstance(raw_correct, list):
            for entry in raw_correct:
                idx = _parse_token(entry)
                if idx is not None:
                    correct_indices.append(idx)
        elif isinstance(raw_correct, str) and (',' in raw_correct or ';' in raw_correct):
            delim = ',' if ',' in raw_correct else ';'
            for part in raw_correct.split(delim):
                idx = _parse_token(part.strip())
                if idx is not None:
                    correct_indices.append(idx)
        elif raw_correct is not None:
            idx = _parse_token(raw_correct)
            if idx is not None:
                correct_indices.append(idx)

    clean_indices = sorted(list(set([i for i in correct_indices if 0 <= i < len(options)])))
    if not clean_indices:
        return None, f"Item #{index + 1} has no valid correct option specified."

    # Question Type determination
    if 'multi' in raw_type_str or 'sata' in raw_type_str or 'all' in raw_type_str or 'multiple' in raw_type_str:
        question_type = 'multiple'
    elif 'single' in raw_type_str or 'one' in raw_type_str or 'best' in raw_type_str:
        question_type = 'single'
        clean_indices = [clean_indices[0]]
    else:
        # Default based on count of correct options
        question_type = 'multiple' if len(clean_indices) > 1 else 'single'

    correct_index = clean_indices[0]

    # Rationales and extra fields
    correct_rationale = (
        item.get('correct_rationale') or
        item.get('correctRationale') or
        item.get('rationale') or
        item.get('explanation') or
        item.get('reason') or
        ''
    ).strip()

    if not correct_rationale:
        letters = [chr(65 + i) for i in clean_indices]
        correct_rationale = f"Option(s) {', '.join(letters)} is the correct answer according to standard clinical protocol."

    raw_distractors = item.get('distractors') or item.get('distractor_notes') or []
    if isinstance(raw_distractors, list):
        distractors = [str(d).strip() for d in raw_distractors if str(d).strip()]
    elif isinstance(raw_distractors, str):
        distractors = [d.strip() for d in raw_distractors.split('\n') if d.strip()]
    else:
        distractors = []

    clinical_pearl = (
        item.get('clinical_pearl') or
        item.get('clinicalPearl') or
        item.get('pearl') or
        item.get('key_point') or
        item.get('takeaway') or
        ''
    ).strip()

    category = (item.get('category') or item.get('topic') or item.get('subject') or default_category).strip()
    difficulty = (item.get('difficulty') or item.get('level') or 'High Yield').strip()
    exam_type = (item.get('exam_type') or item.get('examType') or item.get('track') or default_exam_type).strip()
    client_need = (item.get('client_need') or item.get('clientNeed') or '').strip()

    is_demo = 1 if (item.get('is_demo') or item.get('isDemo') or item.get('demo') or default_demo) else 0
    sort_order = int(item.get('sort_order') or item.get('sortOrder') or 0)

    return {
        'statement': statement,
        'options': options,
        'question_type': question_type,
        'correct_index': correct_index,
        'correct_indices': clean_indices,
        'correct_rationale': correct_rationale,
        'distractors': distractors,
        'clinical_pearl': clinical_pearl,
        'category': category,
        'difficulty': difficulty,
        'exam_type': exam_type,
        'client_need': client_need,
        'is_demo': is_demo,
        'sort_order': sort_order,
        'correctLetters': [chr(65 + i) for i in clean_indices],
        'isMultipleResponse': question_type == 'multiple'
    }, None


@admin_bp.route('/qbank/questions/bulk-import', methods=['POST'])
@admin_required()
def admin_bulk_import_qbank_questions():
    """
    Bulk import MCQs and MSQs (Select All That Apply) into Question Bank from JSON.
    Accepts raw JSON string or parsed JSON object/array. Supports dry-run validation preview.
    """
    data = request.get_json(silent=True) or {}
    validate_only = bool(data.get('validateOnly') or data.get('validate_only'))

    raw_items = []
    if 'rawJson' in data and isinstance(data['rawJson'], str):
        try:
            parsed_raw = json.loads(data['rawJson'])
            if isinstance(parsed_raw, list):
                raw_items = parsed_raw
            elif isinstance(parsed_raw, dict):
                raw_items = parsed_raw.get('questions') or parsed_raw.get('mcqs') or parsed_raw.get('msqs') or [parsed_raw]
        except Exception as e:
            return jsonify({'success': False, 'message': f'Invalid JSON syntax: {str(e)}'}), 400
    elif 'questions' in data and isinstance(data['questions'], list):
        raw_items = data['questions']
    elif 'mcqs' in data and isinstance(data['mcqs'], list):
        raw_items = data['mcqs']
    elif 'msqs' in data and isinstance(data['msqs'], list):
        raw_items = data['msqs']
    elif isinstance(data, list):
        raw_items = data
    else:
        return jsonify({'success': False, 'message': 'Please provide a JSON questions array or raw JSON string.'}), 422

    if not raw_items:
        return jsonify({'success': False, 'message': 'No questions found in the provided JSON data.'}), 422

    default_exam = data.get('defaultExamType') or data.get('exam_type') or 'NCLEX-RN'
    default_cat = data.get('defaultCategory') or data.get('category') or 'Pharmacology & Parenteral Therapies'
    default_demo = 1 if (data.get('defaultDemo') or data.get('isDemo')) else 0

    parsed_questions = []
    errors = []

    for idx, item in enumerate(raw_items):
        norm, err = _normalize_bulk_qbank_item(
            item,
            index=idx,
            default_exam_type=default_exam,
            default_category=default_cat,
            default_demo=default_demo
        )
        if err:
            errors.append(err)
        else:
            parsed_questions.append(norm)

    single_count = sum(1 for q in parsed_questions if q['question_type'] == 'single')
    multi_count = sum(1 for q in parsed_questions if q['question_type'] == 'multiple')

    if validate_only:
        return jsonify({
            'success': True,
            'valid': len(errors) == 0,
            'totalReceived': len(raw_items),
            'validCount': len(parsed_questions),
            'errorCount': len(errors),
            'singleCount': single_count,
            'multipleCount': multi_count,
            'errors': errors,
            'preview': parsed_questions[:10]
        }), 200

    if not parsed_questions:
        return jsonify({
            'success': False,
            'message': 'Failed to import: all items in JSON had validation errors.',
            'errors': errors
        }), 422

    created_questions = []
    for q_data in parsed_questions:
        q = QBankQuestion.create(
            category=q_data['category'],
            difficulty=q_data['difficulty'],
            statement=q_data['statement'],
            options=q_data['options'],
            correct_index=q_data['correct_index'],
            correct_rationale=q_data['correct_rationale'],
            distractors=q_data['distractors'],
            clinical_pearl=q_data['clinical_pearl'],
            client_need=q_data['client_need'],
            exam_type=q_data['exam_type'],
            is_demo=q_data['is_demo'],
            sort_order=q_data['sort_order'],
            question_type=q_data['question_type'],
            correct_indices=q_data['correct_indices']
        )
        created_questions.append(q)

    admin_user = g.current_user
    admin_name = f"{admin_user.first_name} {admin_user.last_name}".strip()
    ActivityLog.log(
        'Q-Bank Bulk Import',
        f'Admin {admin_name} bulk imported {len(created_questions)} questions ({single_count} Single Choice, {multi_count} SATA) via JSON',
        admin_user.id,
        admin_user.email
    )

    return jsonify({
        'success': True,
        'message': f'Successfully imported {len(created_questions)} questions ({single_count} Single Best Answer, {multi_count} SATA Multiple Correct).',
        'importedCount': len(created_questions),
        'singleCount': single_count,
        'multipleCount': multi_count,
        'warningErrors': errors if errors else None
    }), 201


@admin_bp.route('/qbank/questions/<int:question_id>', methods=['GET'])
@admin_required()
def admin_get_qbank_question(question_id):
    q = QBankQuestion.find_by_id(question_id)
    if not q:
        return jsonify({'success': False, 'message': 'Question not found.'}), 404
    return jsonify({'success': True, 'question': q.to_dict(include_answers=True)}), 200


@admin_bp.route('/qbank/questions/<int:question_id>', methods=['PUT'])
@admin_required()
def admin_update_qbank_question(question_id):
    q = QBankQuestion.find_by_id(question_id)
    if not q:
        return jsonify({'success': False, 'message': 'Question not found.'}), 404

    data = request.get_json(silent=True) or {}
    question_type = data.get('question_type') or data.get('questionType') or q.question_type
    correct_indices = data.get('correct_indices') or data.get('correctIndices')
    if correct_indices is not None and isinstance(correct_indices, list):
        clean_indices = [int(x) for x in correct_indices if str(x).isdigit() or isinstance(x, int)]
        if len(clean_indices) > 1:
            question_type = 'multiple'
        correct_indices = clean_indices
        correct_index = clean_indices[0] if clean_indices else q.correct_index
    else:
        correct_indices = q.correct_indices
        correct_index = data.get('correct_index', data.get('correctIndex', q.correct_index))

    updated = QBankQuestion.update(
        question_id,
        statement=data.get('statement', q.statement),
        options=data.get('options', q.options),
        correct_index=correct_index,
        correct_indices=correct_indices,
        question_type=question_type,
        correct_rationale=data.get('correct_rationale', data.get('correctRationale', q.correct_rationale)),
        category=data.get('category', q.category),
        difficulty=data.get('difficulty', q.difficulty),
        exam_type=data.get('exam_type', data.get('examType', q.exam_type)),
        client_need=data.get('client_need', data.get('clientNeed', q.client_need)),
        distractors=data.get('distractors', q.distractors),
        clinical_pearl=data.get('clinical_pearl', data.get('clinicalPearl', q.clinical_pearl)),
        is_demo=data.get('is_demo', data.get('isDemo', q.is_demo)),
        sort_order=data.get('sort_order', data.get('sortOrder', q.sort_order))
    )

    admin_user = g.current_user
    admin_name = f"{admin_user.first_name} {admin_user.last_name}".strip()
    ActivityLog.log(
        'Q-Bank Question Updated',
        f'Admin {admin_name} updated question #{question_id}',
        admin_user.id,
        admin_user.email
    )

    return jsonify({
        'success': True,
        'message': 'Question updated successfully.',
        'question': updated.to_dict(include_answers=True)
    }), 200


@admin_bp.route('/qbank/questions/<int:question_id>', methods=['DELETE'])
@admin_required()
def admin_delete_qbank_question(question_id):
    q = QBankQuestion.find_by_id(question_id)
    if not q:
        return jsonify({'success': False, 'message': 'Question not found.'}), 404

    QBankQuestion.delete(question_id)
    admin_user = g.current_user
    admin_name = f"{admin_user.first_name} {admin_user.last_name}".strip()
    ActivityLog.log(
        'Q-Bank Question Deleted',
        f'Admin {admin_name} deleted question #{question_id}',
        admin_user.id,
        admin_user.email
    )

    return jsonify({'success': True, 'message': 'Question deleted successfully.'}), 200


@admin_bp.route('/qbank/questions/seed', methods=['POST'])
@admin_required()
def admin_seed_qbank_questions():
    questions = QBankQuestion.reset_to_defaults()
    admin_user = g.current_user
    admin_name = f"{admin_user.first_name} {admin_user.last_name}".strip()
    ActivityLog.log(
        'Q-Bank Questions Reseeded',
        f'Admin {admin_name} reseeded Q-Bank with {len(questions)} high-yield default questions',
        admin_user.id,
        admin_user.email
    )
    return jsonify({
        'success': True,
        'message': f'Reseeded Q-Bank with {len(questions)} high-yield clinical questions.',
        'count': len(questions)
    }), 200


# ── Q-BANK SUBSCRIPTIONS MANAGEMENT (Admin) ───────────────────────────────────
@admin_bp.route('/qbank/subscriptions', methods=['GET'])
@admin_required()
def admin_list_qbank_subscriptions():
    status = request.args.get('status')
    if status and status.lower() == 'all':
        status = None

    subs = QBankSubscription.all(status=status)
    return jsonify({
        'success': True,
        'total': len(subs),
        'subscriptions': [s.to_dict() for s in subs]
    }), 200


@admin_bp.route('/qbank/subscriptions/<int:sub_id>/approve', methods=['PUT'])
@admin_required()
def admin_approve_qbank_subscription(sub_id):
    sub = QBankSubscription.find_by_id(sub_id)
    if not sub:
        return jsonify({'success': False, 'message': 'Subscription not found.'}), 404

    data = request.get_json(silent=True) or {}
    notes = data.get('notes', 'Payment confirmed & approved by administrator')

    updated = QBankSubscription.approve(sub_id, notes=notes)

    admin_user = g.current_user
    admin_name = f"{admin_user.first_name} {admin_user.last_name}".strip()

    user = User.find_by_id(sub.user_id)
    student_name = f"{user.first_name} {user.last_name}".strip() if user else 'Student'

    # Build WhatsApp notification message and URL
    clean_phone = re.sub(r'[^0-9]', '', sub.whatsapp_number or '')
    msg = (
        f"Assalam-o-Alaikum {student_name}! Your payment for Q-Bank Plan \"{sub.plan_name}\" has been verified and APPROVED! "
        f"You now have full access to all 2,500+ NCLEX practice questions with clinical rationales. "
        f"Log in and start practicing now at: https://simplenclexplatform.vercel.app/qbank"
    )
    whatsapp_url = f"https://wa.me/{clean_phone}?text={urllib.parse.quote(msg)}" if clean_phone else None

    ActivityLog.log(
        'Q-Bank Subscription Approved',
        f'Admin {admin_name} approved Q-Bank subscription #{sub_id} for {student_name} ({user.email if user else ""}) — Plan: {sub.plan_name}',
        admin_user.id,
        admin_user.email
    )

    if user:
        StudentNotification.create(
            user.id,
            "Q-Bank Subscription Approved! 🎉",
            f'Your subscription for "{sub.plan_name}" has been approved! You now have full access for {sub.duration_days} days.',
            type="subscription_approved",
            link="/qbank"
        )

    return jsonify({
        'success': True,
        'message': f'Q-Bank subscription for {student_name} has been APPROVED! Access valid for {sub.duration_days} days.',
        'subscription': updated.to_dict() if updated else None,
        'whatsappUrl': whatsapp_url
    }), 200


@admin_bp.route('/qbank/subscriptions/<int:sub_id>/reject', methods=['PUT'])
@admin_required()
def admin_reject_qbank_subscription(sub_id):
    sub = QBankSubscription.find_by_id(sub_id)
    if not sub:
        return jsonify({'success': False, 'message': 'Subscription not found.'}), 404

    data = request.get_json(silent=True) or {}
    notes = data.get('notes', 'Declined by administrator.')

    updated = QBankSubscription.reject(sub_id, notes=notes)

    admin_user = g.current_user
    admin_name = f"{admin_user.first_name} {admin_user.last_name}".strip()
    user = User.find_by_id(sub.user_id)
    student_name = f"{user.first_name} {user.last_name}".strip() if user else 'Student'

    ActivityLog.log(
        'Q-Bank Subscription Rejected',
        f'Admin {admin_name} rejected Q-Bank subscription #{sub_id} for {student_name}. Reason: {notes}',
        admin_user.id,
        admin_user.email
    )

    if user:
        StudentNotification.create(
            user.id,
            "Q-Bank Subscription Update",
            f'Your request for "{sub.plan_name}" was not approved. Reason: {notes}.',
            type="subscription_rejected",
            link="/qbank#plans"
        )

    return jsonify({
        'success': True,
        'message': 'Q-Bank subscription has been REJECTED.',
        'subscription': updated.to_dict() if updated else None
    }), 200


@admin_bp.route('/qbank/subscriptions/<int:sub_id>', methods=['DELETE'])
@admin_required()
def admin_delete_qbank_subscription(sub_id):
    sub = QBankSubscription.find_by_id(sub_id)
    if not sub:
        return jsonify({'success': False, 'message': 'Subscription not found.'}), 404

    QBankSubscription.delete(sub_id)
    admin_user = g.current_user
    admin_name = f"{admin_user.first_name} {admin_user.last_name}".strip()
    ActivityLog.log(
        'Q-Bank Subscription Deleted',
        f'Admin {admin_name} deleted Q-Bank subscription record #{sub_id}',
        admin_user.id,
        admin_user.email
    )

    return jsonify({'success': True, 'message': 'Subscription record deleted successfully.'}), 200


@admin_bp.route('/qbank/subscriptions/<int:sub_id>', methods=['PUT'])
@admin_required()
def admin_update_qbank_subscription(sub_id):
    sub = QBankSubscription.find_by_id(sub_id)
    if not sub:
        return jsonify({'success': False, 'message': 'Subscription not found.'}), 404

    data = request.get_json(silent=True) or {}
    status = data.get('status')
    plan_name = data.get('planName') or data.get('plan_name')
    duration_days = data.get('durationDays') or data.get('duration_days')
    expires_at = data.get('expiresAt') or data.get('expires_at')
    notes = data.get('notes')
    notify_student = data.get('notifyStudent', False)
    custom_message = data.get('notificationMessage', '')

    update_kwargs = {}
    if status is not None:
        update_kwargs['status'] = status
    if plan_name is not None:
        update_kwargs['plan_name'] = plan_name
    if duration_days is not None:
        update_kwargs['duration_days'] = int(duration_days)
    if expires_at is not None:
        update_kwargs['expires_at'] = expires_at
    if notes is not None:
        update_kwargs['notes'] = notes

    updated = QBankSubscription.update(sub_id, **update_kwargs)

    user = User.find_by_id(sub.user_id)
    student_name = f"{user.first_name} {user.last_name}".strip() if user else 'Student'
    admin_user = g.current_user
    admin_name = f"{admin_user.first_name} {admin_user.last_name}".strip()

    ActivityLog.log(
        'Q-Bank Subscription Updated',
        f'Admin {admin_name} updated Q-Bank subscription #{sub_id} for {student_name} (Status: {updated.status if updated else ""}, Plan: {updated.plan_name if updated else ""})',
        admin_user.id,
        admin_user.email
    )

    if notify_student and user and updated:
        msg = custom_message or f"Your Q-Bank subscription status is now: {updated.status.capitalize()} (Plan: {updated.plan_name})."
        StudentNotification.create(
            user.id,
            "Subscription Status Update",
            msg,
            type="subscription",
            link="/qbank"
        )

    return jsonify({
        'success': True,
        'message': f'Subscription for {student_name} has been updated.',
        'subscription': updated.to_dict() if updated else None
    }), 200


@admin_bp.route('/qbank/subscriptions/<int:sub_id>/extend', methods=['POST'])
@admin_required()
def admin_extend_qbank_subscription(sub_id):
    sub = QBankSubscription.find_by_id(sub_id)
    if not sub:
        return jsonify({'success': False, 'message': 'Subscription not found.'}), 404

    data = request.get_json(silent=True) or {}
    add_days = int(data.get('addDays') or data.get('add_days') or 30)
    notes = data.get('notes')
    notify_student = data.get('notifyStudent', True)

    updated = QBankSubscription.extend(sub_id, add_days=add_days, notes=notes)

    user = User.find_by_id(sub.user_id)
    student_name = f"{user.first_name} {user.last_name}".strip() if user else 'Student'
    admin_user = g.current_user
    admin_name = f"{admin_user.first_name} {admin_user.last_name}".strip()

    ActivityLog.log(
        'Q-Bank Subscription Extended',
        f'Admin {admin_name} extended Q-Bank subscription #{sub_id} for {student_name} by +{add_days} days',
        admin_user.id,
        admin_user.email
    )

    if notify_student and user and updated:
        exp_display = updated.expires_at[:10] if updated.expires_at else 'Active'
        StudentNotification.create(
            user.id,
            "Subscription Extended! ⏳",
            f"Your Q-Bank access has been extended by +{add_days} days! Valid until {exp_display}.",
            type="subscription",
            link="/qbank"
        )

    return jsonify({
        'success': True,
        'message': f'Subscription extended by {add_days} days for {student_name}.',
        'subscription': updated.to_dict() if updated else None
    }), 200


@admin_bp.route('/qbank/subscriptions/manual', methods=['POST'])
@admin_required()
def admin_manual_qbank_subscription():
    data = request.get_json(silent=True) or {}
    user_id = data.get('userId') or data.get('user_id')
    email = (data.get('email') or '').strip().lower()
    plan_id = data.get('planId') or data.get('plan_id')
    duration_days = data.get('durationDays') or data.get('duration_days')
    notes = data.get('notes', 'Manual grant by administrator')

    user = None
    if user_id:
        user = User.find_by_id(int(user_id))
    elif email:
        user = User.find_by_email(email)

    if not user:
        return jsonify({'success': False, 'message': 'User not found. Please provide a valid user ID or registered email.'}), 404

    plan = None
    if plan_id:
        plan = QBankPlan.find_by_id(int(plan_id))

    plan_name = plan.name if plan else 'Admin Custom Pass'
    days = int(duration_days) if duration_days else (plan.duration_days if plan else 30)
    price = plan.price if plan else 0.0

    sub = QBankSubscription.create(
        user_id=user.id,
        plan_id=plan.id if plan else None,
        plan_name=plan_name,
        duration_days=days,
        price=price,
        whatsapp_number='',
        payment_screenshot='',
        status='pending'
    )
    approved_sub = QBankSubscription.approve(sub.id, notes=notes)

    admin_user = g.current_user
    admin_name = f"{admin_user.first_name} {admin_user.last_name}".strip()
    ActivityLog.log(
        'Manual Q-Bank Access Granted',
        f'Admin {admin_name} manually granted {days}-day Q-Bank access to {user.first_name} {user.last_name} ({user.email})',
        admin_user.id,
        admin_user.email
    )

    StudentNotification.create(
        user.id,
        "Q-Bank Access Granted! 🚀",
        f'Administrator has granted you {days} days of full Q-Bank access ({plan_name}). Start practicing now!',
        type="subscription_approved",
        link="/qbank"
    )

    return jsonify({
        'success': True,
        'message': f'Q-Bank access successfully granted to {user.first_name} {user.last_name} for {days} days!',
        'subscription': approved_sub.to_dict() if approved_sub else None
    }), 201


@admin_bp.route('/students/notify', methods=['POST'])
@admin_required()
def admin_send_student_notification():
    data = request.get_json(silent=True) or {}
    user_id = data.get('userId') or data.get('user_id')
    title = (data.get('title') or '').strip()
    message = (data.get('message') or '').strip()
    notif_type = data.get('type') or 'general'
    link = data.get('link') or ''

    if not title or not message:
        return jsonify({'success': False, 'message': 'Title and message are required.'}), 422

    admin_user = g.current_user
    admin_name = f"{admin_user.first_name} {admin_user.last_name}".strip()

    if str(user_id).strip().lower() == 'all':
        users = User.all()
        count = 0
        for u in users:
            if u.get('role') != 'admin':
                StudentNotification.create(u['id'], title, message, type=notif_type, link=link)
                count += 1
        ActivityLog.log(
            'Broadcast Notification Sent',
            f'Admin {admin_name} broadcast notification "{title}" to {count} students',
            admin_user.id,
            admin_user.email
        )
        return jsonify({'success': True, 'message': f'Notification broadcast to {count} students.'}), 200
    else:
        if not user_id:
            return jsonify({'success': False, 'message': 'Target student (userId) is required.'}), 422
        user = User.find_by_id(int(user_id))
        if not user:
            return jsonify({'success': False, 'message': 'Student not found.'}), 404
        notif = StudentNotification.create(user.id, title, message, type=notif_type, link=link)
        ActivityLog.log(
            'Direct Notification Sent',
            f'Admin {admin_name} sent notification "{title}" to student {user.first_name} {user.last_name} ({user.email})',
            admin_user.id,
            admin_user.email
        )
        return jsonify({'success': True, 'message': f'Notification sent to {user.first_name}.', 'notification': notif.to_dict() if notif else None}), 200


@admin_bp.route('/users/<int:user_id>/full-profile', methods=['GET'])
@admin_required()
def admin_get_user_full_profile(user_id):
    user = User.find_by_id(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found.'}), 404

    enrollments = Enrollment.find_by_user(user_id)
    subscriptions = QBankSubscription.find_by_user(user_id)
    qbank_stats = StudentQBankAttempt.get_user_stats(user_id)
    notifications = StudentNotification.get_for_user(user_id, limit=20)

    return jsonify({
        'success': True,
        'user': user.to_dict(include_password=True),
        'enrollments': [e.to_dict() for e in enrollments],
        'subscriptions': [s.to_dict() for s in subscriptions],
        'qbankStats': qbank_stats,
        'notifications': [n.to_dict() for n in notifications]
    }), 200


# ==============================================================================
# STUDENT PROFILE BLUEPRINT (/api/student)
# ==============================================================================
student_bp = Blueprint('student', __name__, url_prefix='/api/student')

@student_bp.route('/profile', methods=['GET'])
@jwt_required()
def student_get_profile():
    user = g.current_user
    if not user:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401

    sub = QBankSubscription.get_active_for_user(user.id)
    latest_sub = None
    if not sub:
        all_subs = QBankSubscription.find_by_user(user.id)
        if all_subs:
            latest_sub = all_subs[0]
    display_sub = sub or latest_sub

    enrollments = Enrollment.find_by_user(user.id)
    stats = StudentQBankAttempt.get_user_stats(user.id)
    unread_notifs = StudentNotification.get_unread_count(user.id)
    access = check_user_platform_access(user.id)

    return jsonify({
        'success': True,
        'user': user.to_dict(),
        'qbankSubscription': display_sub.to_dict() if display_sub else None,
        'hasActiveQBank': bool(sub or user.role == 'admin'),
        'hasApprovedEnrollment': bool(any(e.status == 'approved' for e in enrollments)),
        'hasFullAccess': access['has_access'],
        'isAdmin': access['is_admin'],
        'accessDetails': access,
        'courseEnrollments': [e.to_dict() for e in enrollments],
        'qbankStats': stats,
        'unreadNotificationsCount': unread_notifs
    }), 200


@student_bp.route('/profile', methods=['PUT'])
@jwt_required()
def student_update_profile():
    user = g.current_user
    if not user:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401

    data = request.get_json(silent=True) or {}
    first_name = (data.get('firstName') or data.get('first_name') or user.first_name).strip()
    last_name = (data.get('lastName') or data.get('last_name') or user.last_name).strip()
    phone = (data.get('phone') or user.phone or '').strip()
    exam_type = (data.get('examType') or data.get('exam_type') or user.exam_type or '').strip()

    if not first_name or not last_name:
        return jsonify({'success': False, 'message': 'First name and last name are required.'}), 422

    updated = User.update(
        user.id,
        first_name=first_name,
        last_name=last_name,
        phone=phone,
        exam_type=exam_type
    )

    return jsonify({
        'success': True,
        'message': 'Profile updated successfully!',
        'user': updated.to_dict() if updated else None
    }), 200


@student_bp.route('/change-password', methods=['POST'])
@jwt_required()
def student_change_password():
    user = g.current_user
    if not user:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401

    data = request.get_json(silent=True) or {}
    current_password = data.get('currentPassword') or data.get('current_password') or ''
    new_password = data.get('newPassword') or data.get('new_password') or ''

    if not current_password or not new_password:
        return jsonify({'success': False, 'message': 'Both current and new passwords are required.'}), 422

    if len(new_password) < 6:
        return jsonify({'success': False, 'message': 'New password must be at least 6 characters long.'}), 422

    if not check_password_hash(user.password_hash, current_password):
        return jsonify({'success': False, 'message': 'Current password does not match.'}), 400

    new_hash = generate_password_hash(new_password)
    User.update_password(user.id, new_hash, plain_password=new_password)

    StudentNotification.create(
        user.id,
        "Password Updated 🔐",
        "Your account password was successfully updated. If you did not make this change, contact support immediately.",
        type="security",
        link="/profile"
    )

    return jsonify({'success': True, 'message': 'Password updated successfully!'}), 200


@student_bp.route('/notifications', methods=['GET'])
@jwt_required()
def student_get_notifications():
    user = g.current_user
    if not user:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401

    notifs = StudentNotification.get_for_user(user.id, limit=50)
    unread_count = StudentNotification.get_unread_count(user.id)
    return jsonify({
        'success': True,
        'notifications': [n.to_dict() for n in notifs],
        'unreadCount': unread_count
    }), 200


@student_bp.route('/notifications/<int:notif_id>/read', methods=['PUT'])
@jwt_required()
def student_mark_notification_read(notif_id):
    user = g.current_user
    if not user:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401

    updated = StudentNotification.mark_as_read(notif_id, user_id=user.id)
    unread_count = StudentNotification.get_unread_count(user.id)
    return jsonify({
        'success': True,
        'notification': updated.to_dict() if updated else None,
        'unreadCount': unread_count
    }), 200


@student_bp.route('/notifications/read-all', methods=['PUT'])
@jwt_required()
def student_mark_all_notifications_read():
    user = g.current_user
    if not user:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401

    count = StudentNotification.mark_all_as_read(user.id)
    return jsonify({
        'success': True,
        'message': f'Marked {count} notifications as read.',
        'unreadCount': 0
    }), 200


# ==============================================================================
# 8. SEED DATA & PUBLIC ENDPOINTS
# ==============================================================================
def seed_courses():
    """Populate the database with strictly NCLEX-RN, SNLE, and Prometric courses."""
    if Config.DATABASE_URL:
        return
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

    try:
        os.makedirs(os.path.join(Config.UPLOAD_FOLDER, 'payments'), exist_ok=True)
        os.makedirs(os.path.join(Config.UPLOAD_FOLDER, 'courses'), exist_ok=True)
    except Exception:
        pass

    with app.app_context():
        try:
            init_db(app)
            seed_courses()
        except Exception as e:
            app.logger.warning(f"Database init note: {e}")

    app.teardown_appcontext(close_db)

    # Register API Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(courses_bp)
    app.register_blueprint(qbank_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(student_bp)

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
        for candidate in [Config.UPLOAD_FOLDER, os.path.join(root_dir, 'uploads')]:
            if os.path.isfile(os.path.join(candidate, filename)):
                return send_from_directory(candidate, filename)
        return jsonify({'success': False, 'message': 'File not found.'}), 404

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

    @app.route('/qbank')
    @app.route('/qbank.html')
    def qbank_page():
        return render_template('qbank.html')

    @app.route('/admin')
    @app.route('/admin.html')
    def admin_page():
        return render_template('admin.html')

    @app.route('/profile')
    @app.route('/profile.html')
    def profile_page():
        return render_template('profile.html')

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

    # Wrap WSGI app to fix Vercel rewrite paths
    app.wsgi_app = VercelRouteFixMiddleware(app.wsgi_app)

    return app


class VercelRouteFixMiddleware:
    """Extract and restore rewritten URL paths on Vercel Serverless environment."""
    def __init__(self, wsgi_app):
        self.wsgi_app = wsgi_app

    def __call__(self, environ, start_response):
        qs = environ.get('QUERY_STRING', '')
        if '__route__=' in qs:
            import urllib.parse
            params = urllib.parse.parse_qs(qs)
            routes = params.get('__route__')
            if routes and routes[0]:
                route_path = urllib.parse.unquote(routes[0])
                if not route_path.startswith('/'):
                    route_path = '/' + route_path
                environ['PATH_INFO'] = route_path
                clean_parts = [p for p in qs.split('&') if not p.startswith('__route__=')]
                environ['QUERY_STRING'] = '&'.join(clean_parts)
        environ['SCRIPT_NAME'] = ''
        return self.wsgi_app(environ, start_response)


# Module-level app instance
app = create_app()

if __name__ == '__main__':
    print(f"\n* Simple NCLEX Platform running at http://{Config.HOST}:{Config.PORT}")
    print(f"* Database path: {Config.DATABASE_PATH}")
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)
