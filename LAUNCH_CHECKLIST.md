# Simple NCLEX Platform — Pre-Launch Checklist

> **IMPORTANT:** All statistics, alumni figures, testimonials, prices, bank account details, and faculty entries are currently **sample placeholders** managed centrally in `lib/siteConfig.ts` and database seed scripts. Before public production launch, complete each item below.

---

## 1. Statistics & Institutional Metrics
- [ ] **First-Time Pass Rate:** Current placeholder is `99.2%`. Verify actual historical student pass rate or leave `stats.passRate = null` to suppress unverified figures.
- [ ] **Alumni / Students Enrolled:** Current placeholder is `4,800+` (and `12,500+` in settings). Replace with verified enrolled count from database or suppress when `DEMO_MODE=false`.
- [ ] **Active Mentors / Faculty Count:** Current placeholder is `50+`. Replace with actual number of active nurse tutors.
- [ ] **Question Bank Size:** Current live count is `60` questions. Replace marketing claims of "2,500+" with actual count or publish additional questions before making claims.

---

## 2. Testimonials & Student Reviews
- [ ] **Review Verification:** Current testimonials (Fatima Z., Ahmed M., Priya N.) are illustrative demonstration samples.
- [ ] **Collect Real Reviews:** Obtain signed consent/verification from real students who passed NCLEX, SNLE, or DHA using the platform.
- [ ] **Verification Flag:** Set `isDemo: false` in `siteConfig.testimonials` or populate the `testimonials` table with `verified = 1`.

---

## 3. Faculty & Leadership Directory
- [ ] **Faculty Identity:** Current entries (Prof. D. Rashid, Dr. F. Khan, S. Anwer) are placeholder personas with sample biographies.
- [ ] **Real Instructor Bios:** Add verified faculty names, real credentials (RN, MSN, DNP, etc.), institutional affiliations, and professional headshots.
- [ ] **Photo Uploads:** Replace placeholder initials (`DR`, `FK`, `SA`) with high-resolution photos in `public/images/faculty/`.

---

## 4. Brand Mentions & Copyright Compliance (Codebase Status: COMPLETED)
- [x] **Saunders References Removed:** Eliminated all commercial references to Saunders 9th Edition across all pages, layouts, metadata, and Q-Bank rationales; replaced with neutral phrasing (*"original rationales"*, *"course notes"*, *"evidence-based rationales"*).
- [x] **ATI & UWorld References Removed:** Eliminated all competitor comparisons and claims across features, pricing tables, and marketing copy.
- [x] **NCSBN & Test Plan Alignment:** Standardized on official terminology: *"Aligned with the NCSBN Next Generation NCLEX (NGN) Test Plan and Clinical Judgment Measurement Model (CJMM)"*.
- [x] **Pass Guarantee Claims Neutralized:** Removed unconditional guarantees; replaced with neutral, compliant phrasing and suppressible demo fields.
- [x] **SSL Badge Removed:** Meaningless "256-Bit SSL Encrypted Verification" badges removed from login, footer, and checkout modals.

---

## 5. Contact Information & Communication Channels
- [ ] **Primary Support Email:** Update `NEXT_PUBLIC_CONTACT_EMAIL` from `support@simplenclex.com` to your verified business email address.
- [ ] **Official WhatsApp Business:** Set `NEXT_PUBLIC_WHATSAPP_NUMBER` to your registered WhatsApp counselor line (e.g. `923001234567`). If unset or empty, the WhatsApp floating/footer button is automatically hidden.
- [ ] **Live Google Meet WhatsApp Group:** Update `NEXT_PUBLIC_WHATSAPP_GROUP_LINK` with the private class invitation link.
- [ ] **Physical / Registered Address:** Update `NEXT_PUBLIC_OFFICE_ADDRESS` with legal entity location.
- [ ] **Social Media Links:** Connect official Facebook, YouTube, Instagram, and LinkedIn URLs.

---

## 6. Financial & Payment Processing Accounts
- [ ] **Bank Deposit Details:** Update `NEXT_PUBLIC_BANK_NAME`, `NEXT_PUBLIC_BANK_ACCOUNT_TITLE`, and `NEXT_PUBLIC_BANK_IBAN` with verified business banking credentials.
- [ ] **Easypaisa Merchant Details:** Update `NEXT_PUBLIC_EASYPAISA_NAME` and `NEXT_PUBLIC_EASYPAISA_NUMBER`.
- [ ] **JazzCash Merchant Details:** Update `NEXT_PUBLIC_JAZZCASH_NAME` and `NEXT_PUBLIC_JAZZCASH_NUMBER`.
- [ ] **Payment Verification Workflow:** Test manual verification workflow in Admin panel (`/admin?tab=registrations` and `/admin?tab=subscriptions`).

---

## 7. Pricing & Course Curricula
- [ ] **Course Pricing:** Confirm official retail and promotional prices for:
  - NCLEX-RN Complete Prep (Currently placeholder: PKR 15,000)
  - Saudi SNLE Course (Currently placeholder: PKR 18,000)
  - Gulf Prometric / DHA (Currently placeholder: PKR 16,000)
- [ ] **Q-Bank Subscriptions:** Confirm pricing in `qbank_plans` (1m: PKR 4,999, 3m: PKR 7,999, 6m: PKR 11,999).
- [ ] **Lecture Schedule:** Upload actual live class timetable and syllabus modules into course curricula.

---

## 8. Security & Environment Configuration
- [ ] **Set `DEMO_MODE=false`** in Vercel environment variables to deactivate demo banners and hide unverified figures.
- [ ] **Generate Production `JWT_SECRET`:** Run `openssl rand -hex 32` and set `JWT_SECRET` in Vercel project settings.
- [ ] **Rotate Default Admin Password:** Change the seeded admin password from `Admin123!` to a secure, 16+ character password.
- [ ] **PostgreSQL Database URL:** Ensure `DATABASE_URL` is set to your production PostgreSQL connection string (Supabase/Neon/RDS) so serverless instances persist all data.
- [ ] **SSL & Domain:** Connect custom production domain (e.g., `simplenclex.com`) and verify SSL certificate.

---

## 9. Legal Pages (Drafted — Needs Legal Review)
- [ ] **Terms of Service:** Review draft terms on `/terms` with legal advisor.
- [ ] **Privacy Policy:** Ensure compliance with local data protection regulations on `/privacy`.
- [ ] **Refund Policy:** Confirm terms for batch withdrawals and guarantees on `/refund`.
- [ ] **Medical & Educational Disclaimer:** Confirm student acknowledgment that the platform provides preparatory educational materials and is not affiliated with the NCSBN or state licensing boards.
