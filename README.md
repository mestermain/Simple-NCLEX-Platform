# Simple NCLEX Platform

A full-stack NCLEX & Nursing Licensure preparation platform powered by a Python/Flask backend and an interactive web frontend.

---

## 📁 Project Structure

```text
simple_NCLEX_platform/
├── app.py                     # Unified Flask application (models, auth, APIs, routes & factory)
├── nclex.db                   # SQLite database (courses, users, enrollments, settings, mcqs)
├── requirements.txt           # Python package dependencies
├── README.md                  # Project documentation & run instructions
├── .gitignore                 # Standard git ignore rules
│
├── templates/                 # Frontend HTML templates
│   ├── index.html             # Landing page & overview
│   ├── courses.html           # Course catalog & search
│   ├── course-detail.html     # Course details & comprehensive syllabus
│   ├── about.html             # About us, faculty & mission
│   ├── login.html             # User login page
│   ├── register.html          # Student registration page
│   └── admin.html             # Admin portal interface
│
├── static/                    # Frontend static assets
│   ├── css/                   # Stylesheets
│   │   ├── style.css          # Global design system & typography
│   │   ├── home.css           # Landing page specific styles
│   │   ├── about.css          # About page styles
│   │   ├── courses.css        # Course catalog styling
│   │   ├── auth.css           # Login & registration styling
│   │   └── admin.css          # Admin portal styling
│   ├── js/                    # Client-side scripts
│   │   ├── main.js            # Global navbar, session & demo MCQ controller
│   │   ├── courses.js         # Course filter, search & enrollment logic
│   │   ├── course-detail.js   # Syllabus & curriculum renderer
│   │   ├── auth.js            # Authentication forms & token handling
│   │   └── admin.js           # Admin dashboard controllers
│   └── images/                # Brand images & icons
│       ├── logo.png
│       ├── logo.jpg
│       ├── favicon.png
│       └── favicon.ico
│
├── uploads/                   # Uploaded payment proofs & course media
│   ├── courses/
│   └── payments/
│
└── tests/                     # Automated test suites
    └── test_app.py            # Route, asset & API integration tests
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the Server
```bash
python3 app.py
```

The web server will start at `http://localhost:5001` (or the host/port specified via environment variables `HOST` and `PORT`).

### 3. Key URLs
- **Homepage**: [http://localhost:5001/](http://localhost:5001/)
- **Courses**: [http://localhost:5001/courses.html](http://localhost:5001/courses.html)
- **About**: [http://localhost:5001/about.html](http://localhost:5001/about.html)
- **Login**: [http://localhost:5001/login.html](http://localhost:5001/login.html)
- **Register**: [http://localhost:5001/register.html](http://localhost:5001/register.html)
- **Admin Portal**: [http://localhost:5001/admin.html](http://localhost:5001/admin.html)
- **API Health**: [http://localhost:5001/api/health](http://localhost:5001/api/health)

---

## 🧪 Running Tests

Run the test suite to verify templates, static assets, and API routes:
```bash
python3 -m unittest discover -s tests -p "test_*.py"
```
