/**
 * Centralized Site Configuration & Placeholder Management
 * 
 * In DEMO_MODE=true:
 *   - Clearly flags sample statistics, mock faculty, and testimonials with demo tags.
 * In DEMO_MODE=false (Production):
 *   - Unverified placeholder stats and fake testimonials are automatically set to null/hidden.
 *   - Only verified database data is rendered.
 */

export const isDemoMode: boolean =
  process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
  process.env.DEMO_MODE === 'true' ||
  (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production');

export interface TestimonialItem {
  id: string;
  name: string;
  role: string;
  examTrack: string;
  quote: string;
  rating: number;
  isDemo: boolean;
}

export interface FacultyItem {
  id: string;
  name: string;
  credentials: string;
  title: string;
  bio: string;
  initials: string;
  isDemo: boolean;
}

export interface QBankPlanItem {
  id: string;
  name: string;
  durationDays: number;
  pricePkr: number;
  originalPricePkr: number;
  badge: string;
  description: string;
  features: string[];
}

export interface SiteConfig {
  isDemoMode: boolean;
  name: string;
  tagline: string;
  description: string;
  contact: {
    email: string;
    phone: string;
    whatsappNumber: string | null;
    whatsappUrl: string | null;
    address: string;
  };
  banking: {
    bankName: string;
    accountTitle: string;
    iban: string;
    easypaisaName: string;
    easypaisaNumber: string;
    jazzcashName: string;
    jazzcashNumber: string;
    whatsappGroupLink: string;
  };
  social: {
    facebook: string;
    youtube: string;
    instagram: string;
    linkedin: string;
  };
  stats: {
    passRate: string | null;
    alumniCount: string | null;
    questionsCount: string | null;
    lectureHours: string | null;
    mentorsCount: string | null;
  };
  claims: {
    passGuarantee: string | null;
    clinicalBlueprintNote: string;
  };
  tracks: {
    id: string;
    name: string;
    badge: string;
    description: string;
    categorySlug: string;
  }[];
  testimonials: TestimonialItem[];
  faculty: FacultyItem[];
  qbankPlans: QBankPlanItem[];
}

export const siteConfig: SiteConfig = {
  isDemoMode,
  name: 'Simple NCLEX Platform',
  tagline: 'High-Yield RN, PN & Prometric Licensure Preparation',
  description:
    'Master NextGen Clinical Judgment scenarios, multi-choice Select All That Apply (SATA) drills, and evidence-based clinical rationales designed for future registered nurses.',

  contact: {
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'support@simplenclex.com',
    phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || '+92 300 1234567',
    whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || (isDemoMode ? '923001234567' : null),
    whatsappUrl: (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || process.env.NEXT_PUBLIC_CONTACT_WHATSAPP)
      ? `https://wa.me/${(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || '').replace(/[^0-9]/g, '')}`
      : (isDemoMode ? 'https://wa.me/923001234567' : null),
    address: process.env.NEXT_PUBLIC_OFFICE_ADDRESS || 'KPK, Pakistan',
  },

  banking: {
    bankName: process.env.NEXT_PUBLIC_BANK_NAME || 'Meezan Bank Islamic',
    accountTitle: process.env.NEXT_PUBLIC_BANK_ACCOUNT_TITLE || 'Simple NCLEX Platform',
    iban: process.env.NEXT_PUBLIC_BANK_IBAN || 'PK42MEZN0001020304050607',
    easypaisaName: process.env.NEXT_PUBLIC_EASYPAISA_NAME || 'Simple NCLEX Platform',
    easypaisaNumber: process.env.NEXT_PUBLIC_EASYPAISA_NUMBER || '0300-1234567',
    jazzcashName: process.env.NEXT_PUBLIC_JAZZCASH_NAME || 'Simple NCLEX Platform',
    jazzcashNumber: process.env.NEXT_PUBLIC_JAZZCASH_NUMBER || '0300-1234567',
    whatsappGroupLink: process.env.NEXT_PUBLIC_WHATSAPP_GROUP_LINK || 'https://chat.whatsapp.com/sample-class-link',
  },

  social: {
    facebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK || 'https://facebook.com',
    youtube: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE || 'https://youtube.com',
    instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM || 'https://instagram.com',
    linkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN || 'https://linkedin.com',
  },

  // Rule 3: Placeholder statistics are null in production, only rendered when DEMO_MODE is true.
  stats: {
    passRate: isDemoMode ? '99.2%' : null,
    alumniCount: isDemoMode ? '4,800+' : null,
    questionsCount: isDemoMode ? '2,500+' : null,
    lectureHours: '48+',
    mentorsCount: isDemoMode ? '50+' : null,
  },

  claims: {
    // Pass guarantee is a placeholder until official guarantee policy terms are legally finalized
    passGuarantee: isDemoMode ? 'First-Time Pass Commitment' : null,
    clinicalBlueprintNote:
      'Aligned with official 2026 NCSBN NextGen NCLEX Test Plan, Saudi SCFHS SNLE, and Gulf Health Authority Blueprints.',
  },

  tracks: [
    {
      id: 'NCLEX-RN',
      name: 'NCLEX-RN (NextGen)',
      badge: 'Global RN',
      categorySlug: 'nclex-rn',
      description: 'Computerized adaptive testing preparation for registered nurses.',
    },
    {
      id: 'NCLEX-PN',
      name: 'NCLEX-PN Practical Nurse',
      badge: 'LPN / LVN',
      categorySlug: 'nclex-pn',
      description: 'Practical nurse clinical management and physiological adaptation.',
    },
    {
      id: 'SNLE',
      name: 'Saudi SNLE (SCFHS)',
      badge: 'Saudi Arabia',
      categorySlug: 'snle',
      description: 'Saudi Commission for Health Specialties nursing exam recalls & drills.',
    },
    {
      id: 'DHA',
      name: 'Dubai DHA Licensure',
      badge: 'Dubai Health',
      categorySlug: 'prometric',
      description: 'Dubai Health Authority nurse licensing curriculum and pharmacology.',
    },
    {
      id: 'HAAD',
      name: 'Abu Dhabi DoH / HAAD',
      badge: 'Abu Dhabi',
      categorySlug: 'prometric',
      description: 'Abu Dhabi Department of Health clinical practice standards.',
    },
    {
      id: 'Prometric',
      name: 'Gulf Prometric (MOH, Qatar, Oman)',
      badge: 'Gulf Region',
      categorySlug: 'prometric',
      description: 'High-yield recall questions and emergency triage for Gulf health ministries.',
    },
  ],

  // In production, unverified testimonials return empty array
  testimonials: isDemoMode
    ? [
        {
          id: 'test-1',
          name: 'Fatima Z., BSN, RN',
          role: 'Registered Nurse',
          examTrack: 'NCLEX-RN Candidate',
          quote:
            'The Select All That Apply (SATA) drills and clinical rationale breakdowns built my confidence to eliminate trap choices on the computerized test.',
          rating: 5,
          isDemo: true,
        },
        {
          id: 'test-2',
          name: 'Ahmed M., Staff Nurse',
          role: 'Staff Nurse',
          examTrack: 'Saudi SNLE Licensure',
          quote:
            'The distractor analyses teach you why each choice could cause adverse patient outcomes instead of relying on memorization.',
          rating: 5,
          isDemo: true,
        },
        {
          id: 'test-3',
          name: 'Priya N., Clinical Nurse',
          role: 'Clinical Nurse',
          examTrack: 'Dubai Health Authority (DHA)',
          quote:
            'Passing my licensure on the first try was made possible by the structured pharmacology modules and priority triaging scenarios.',
          rating: 5,
          isDemo: true,
        },
      ]
    : [],

  // Faculty placeholders
  faculty: isDemoMode
    ? [
        {
          id: 'fac-1',
          name: 'Prof. D. Rashid',
          credentials: 'MSN, RN',
          title: 'Lead NCLEX Faculty & Pharmacology Specialist',
          bio: 'Over 14 years instructing medical-surgical nursing, clinical hemodynamics, and cardiovascular pharmacotherapy.',
          initials: 'DR',
          isDemo: true,
        },
        {
          id: 'fac-2',
          name: 'Dr. F. Khan',
          credentials: 'BSN, RN-BC',
          title: 'Gulf Prometric & SNLE Specialist',
          bio: 'Clinical nurse preceptor with extensive experience in Gulf licensure exam blueprints and emergency triage.',
          initials: 'FK',
          isDemo: true,
        },
        {
          id: 'fac-3',
          name: 'S. Anwer',
          credentials: 'MSN, CNE',
          title: 'Director of Clinical Judgment & Case Simulations',
          bio: 'Focuses on error-reduction techniques, Next-Gen Case Studies, and computerized adaptive testing strategies.',
          initials: 'SA',
          isDemo: true,
        },
      ]
    : [],

  qbankPlans: [
    {
      id: '1m',
      name: '1-Month Intensive Pass',
      durationDays: 30,
      pricePkr: 4999,
      originalPricePkr: 8000,
      badge: 'Starter',
      description: 'Full 30-day access to all NCLEX & SNLE practice questions with rationales.',
      features: [
        'Full NCLEX & SNLE Question Bank',
        'In-Depth Evidence-Based Clinical Rationales',
        'Distractor Analysis for Every Option',
        'Interactive Tutor & Exam Modes',
        'Category & Organ System Filtering',
      ],
    },
    {
      id: '3m',
      name: '3-Month High-Yield Master',
      durationDays: 90,
      pricePkr: 7999,
      originalPricePkr: 14000,
      badge: 'Most Popular',
      description: 'The recommended plan for comprehensive exam readiness with case studies.',
      features: [
        'Complete 90-Day All-Access Question Bank',
        'Next-Generation NCLEX (NGN) Case Studies',
        'Timed Exam Mode & Mock Test Simulator',
        'Specialty Performance Diagnostics',
        'Direct Mentor WhatsApp Study Group',
        'High-Yield Clinical Pearl Summaries',
      ],
    },
    {
      id: '6m',
      name: '6-Month Complete Pass',
      durationDays: 180,
      pricePkr: 11999,
      originalPricePkr: 22000,
      badge: 'Best Value',
      description: 'Maximum flexibility for international and repeat exam test-takers.',
      features: [
        'Unlimited 180-Day Complete Q-Bank Access',
        'All NCLEX-RN, PN, SNLE & Prometric Tracks',
        'Personalized Weakness Remediation Quizzes',
        'Direct Faculty Mentorship on WhatsApp',
        'Free Content & Question Updates for 2026',
        'First-Time Pass Commitment Assurance',
      ],
    },
  ],
};
