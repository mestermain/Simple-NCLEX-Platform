/* auth.js — wired to Flask /api/auth/* endpoints */

(function () {

  const API = '/api';   // Flask serves on same origin

  // ── HELPERS ──────────────────────────────────────────────────────────────
  function setError(id, msg) {
    const el = document.getElementById(id);
    if (el) el.textContent = msg;
  }
  function clearAllErrors(...ids) {
    ids.forEach(id => setError(id, ''));
  }
  function setLoading(btnId, textId, spinnerId, loading) {
    const btn = document.getElementById(btnId);
    const txt = document.getElementById(textId);
    const sp  = document.getElementById(spinnerId);
    if (!btn) return;
    btn.disabled = loading;
    if (txt) txt.style.display = loading ? 'none' : '';
    if (sp)  sp.classList.toggle('hidden', !loading);
  }
  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }
  function saveSession(token, user) {
    localStorage.setItem('nclex_token', token);
    localStorage.setItem('nclex_user',  JSON.stringify(user));
  }

  // ── TOGGLE PASSWORD VISIBILITY ────────────────────────────────────────────
  function setupTogglePw(toggleId, inputId) {
    const btn = document.getElementById(toggleId);
    const inp = document.getElementById(inputId);
    if (!btn || !inp) return;
    btn.addEventListener('click', () => {
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      btn.textContent = show ? '🙈' : '👁️';
    });
  }
  setupTogglePw('togglePw',    'loginPassword');
  setupTogglePw('toggleRegPw', 'regPassword');

  // ── PASSWORD STRENGTH ────────────────────────────────────────────────────
  const regPw   = document.getElementById('regPassword');
  const pwFill  = document.getElementById('pwFill');
  const pwLabel = document.getElementById('pwStrengthLabel');

  function getStrength(pw) {
    let s = 0;
    if (pw.length >= 8)          s++;
    if (pw.length >= 12)         s++;
    if (/[A-Z]/.test(pw))        s++;
    if (/[0-9]/.test(pw))        s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  }
  const strengthInfo = [
    { pct: 0,   color: 'transparent', label: 'Enter a password' },
    { pct: 20,  color: '#f43f5e',     label: 'Very Weak' },
    { pct: 40,  color: '#f59e0b',     label: 'Weak' },
    { pct: 60,  color: '#eab308',     label: 'Fair' },
    { pct: 80,  color: '#10b981',     label: 'Strong' },
    { pct: 100, color: '#06b6d4',     label: '💪 Very Strong' },
  ];
  if (regPw) {
    regPw.addEventListener('input', () => {
      const info = strengthInfo[getStrength(regPw.value)] || strengthInfo[0];
      if (pwFill)  { pwFill.style.width = info.pct + '%'; pwFill.style.backgroundColor = info.color; }
      if (pwLabel) { pwLabel.textContent = info.label; pwLabel.style.color = info.color; }
    });
  }

  // ── LOGIN FORM ─────────────────────────────────────────────────────────────
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAllErrors('emailError', 'pwError');

      const email    = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;

      // Client-side pre-validation
      let valid = true;
      if (!email)               { setError('emailError', 'Email is required.');      valid = false; }
      else if (!isValidEmail(email)) { setError('emailError', 'Enter a valid email.'); valid = false; }
      if (!password)            { setError('pwError', 'Password is required.');      valid = false; }
      if (!valid) return;

      setLoading('loginBtn', 'loginBtnText', 'loginSpinner', true);

      try {
        const res  = await fetch(`${API}/auth/login`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (!res.ok) {
          // Map server errors back to fields
          if (data.errors) {
            Object.entries(data.errors).forEach(([field, msg]) => {
              const map = { email: 'emailError', password: 'pwError' };
              setError(map[field] || 'emailError', msg);
            });
          } else {
            setError('emailError', data.message || 'Login failed. Please try again.');
          }
          return;
        }

        saveSession(data.token, data.user);
        window.showToast && showToast(data.message || 'Login successful! Redirecting…', 'success');
        setTimeout(() => {
          if (data.user && data.user.role === 'admin') {
            window.location.href = 'admin.html';
          } else {
            window.location.href = 'index.html';
          }
        }, 1200);

      } catch (err) {
        setError('emailError', 'Cannot reach the server. Please try again.');
        console.error('Login error:', err);
      } finally {
        setLoading('loginBtn', 'loginBtnText', 'loginSpinner', false);
      }
    });
  }

  // ── REGISTER FORM ──────────────────────────────────────────────────────────
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAllErrors(
        'firstNameError','lastNameError','regEmailError',
        'examTypeError','regPwError','confirmPwError','termsError'
      );

      const firstName = (document.getElementById('firstName')?.value || '').trim();
      const lastName  = (document.getElementById('lastName')?.value || '').trim();
      const email     = (document.getElementById('regEmail')?.value || '').trim();
      const examType  = document.getElementById('examType')?.value || '';
      const password  = document.getElementById('regPassword')?.value || '';
      const confirmEl = document.getElementById('confirmPassword');
      const confirm   = confirmEl ? confirmEl.value : password;
      const termsEl   = document.getElementById('agreeTerms');
      const terms     = termsEl ? termsEl.checked : true;

      let valid = true;
      if (!firstName)               { setError('firstNameError', 'First name is required.'); valid = false; }
      if (!lastName)                { setError('lastNameError',  'Last name is required.'); valid = false; }
      if (!email)                   { setError('regEmailError', 'Email is required.'); valid = false; }
      else if (!isValidEmail(email)){ setError('regEmailError', 'Enter a valid email.'); valid = false; }
      if (!examType)                { setError('examTypeError', 'Please select exam type.'); valid = false; }
      if (!password)                { setError('regPwError', 'Password is required.'); valid = false; }
      else if (password.length < 8) { setError('regPwError', 'Min. 8 characters required.'); valid = false; }
      if (confirmEl && password && confirm !== password) { setError('confirmPwError', 'Passwords do not match.'); valid = false; }
      if (termsEl && !terms)        { setError('termsError', 'You must agree to the terms.'); valid = false; }
      if (!valid) return;

      setLoading('registerBtn', 'registerBtnText', 'registerSpinner', true);

      try {
        const res  = await fetch(`${API}/auth/register`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ firstName, lastName, email, examType, password }),
        });
        const data = await res.json();

        if (!res.ok) {
          if (data.errors) {
            const map = {
              firstName: 'firstNameError', lastName: 'lastNameError',
              email: 'regEmailError', examType: 'examTypeError',
              password: 'regPwError',
            };
            Object.entries(data.errors).forEach(([field, msg]) => {
              setError(map[field] || 'regEmailError', msg);
            });
          } else {
            setError('regEmailError', data.message || 'Registration failed.');
          }
          return;
        }

        saveSession(data.token, data.user);
        window.showToast && showToast(data.message || `Welcome, ${firstName}! 🎉`, 'success');
        setTimeout(() => { window.location.href = 'index.html'; }, 1500);

      } catch (err) {
        setError('regEmailError', 'Cannot reach the server. Please try again.');
        console.error('Register error:', err);
      } finally {
        setLoading('registerBtn', 'registerBtnText', 'registerSpinner', false);
      }
    });
  }

})();
