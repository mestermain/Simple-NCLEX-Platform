/**
 * TypeScript Data Models for Phase 5 Schema
 * Simple NCLEX Platform
 */

export type QuestionType =
  | 'MCQ'
  | 'SATA'
  | 'MATRIX'
  | 'CLOZE'
  | 'DRAG_DROP'
  | 'BOWTIE'
  | 'CASE_STUDY';

export type QuestionStatus = 'draft' | 'published';
export type ExamTrack = 'RN' | 'PN' | 'DHA' | 'HAAD' | 'SNLE' | 'Prometric';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface Question {
  id: number;
  type: QuestionType;
  stem: string;
  options: string[] | Record<string, any>;
  correct_answers: number[] | string[] | Record<string, any>;
  rationale_per_option: string[] | Record<string, string>;
  body_system: string;
  client_needs_category: string;
  difficulty: DifficultyLevel;
  exam_track: ExamTrack;
  status: QuestionStatus;
  reviewer?: string;
  clinical_pearl?: string;
  case_study_data?: {
    patientProfile?: {
      name: string;
      age: number;
      gender: string;
      admissionDiagnosis: string;
      allergies: string;
    };
    tabs?: Array<{
      title: string;
      content: string;
      timestamp?: string;
    }>;
    stepIndex?: number;
    totalSteps?: number;
  } | null;
  sort_order?: number;
  created_at: string;
  updated_at?: string;
}

export type TestSessionMode = 'tutor' | 'timed' | 'cat';
export type TestSessionStatus = 'in_progress' | 'completed' | 'abandoned';

export interface TestSession {
  id: number;
  user_id: number;
  title: string;
  mode: TestSessionMode;
  exam_track: ExamTrack;
  status: TestSessionStatus;
  filters_json: {
    category?: string;
    body_system?: string;
    question_type?: string;
    difficulty?: string;
    source?: 'all' | 'unused' | 'incorrect' | 'flagged';
  };
  question_ids_json: number[];
  current_question_index: number;
  total_questions: number;
  correct_count: number;
  score_percentage: number;
  time_limit_seconds: number;
  time_spent_seconds: number;
  created_at: string;
  completed_at?: string | null;
}

export interface Attempt {
  id: number;
  user_id: number;
  session_id?: number | null;
  question_id: number;
  question_type: QuestionType;
  user_answers: number[] | string[] | Record<string, any>;
  score: number; // 0.0 to 1.0 partial credit
  is_correct: number; // 1 or 0
  time_spent_seconds: number;
  category?: string;
  body_system?: string;
  difficulty?: string;
  exam_track?: ExamTrack;
  attempted_at: string;
}

export interface Flag {
  id: number;
  user_id: number;
  question_id: number;
  reason?: string;
  created_at: string;
}

export interface Note {
  id: number;
  user_id: number;
  question_id: number;
  content: string;
  created_at: string;
  updated_at?: string;
}

export interface FlashcardDeck {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  category: string;
  is_public: number;
  card_count: number;
  created_at: string;
  updated_at?: string;
}

export interface Flashcard {
  id: number;
  deck_id: number;
  user_id: number;
  question_id?: number | null;
  front: string;
  back: string;
  clinical_pearl?: string;
  box_level: number; // 1-5 (Leitner system)
  interval_days: number;
  ease_factor: number; // SM-2 parameter (default 2.50)
  repetition_count: number;
  next_review_at?: string | null;
  last_reviewed_at?: string | null;
  created_at: string;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  category: string;
  exam_track: ExamTrack;
  price: number;
  original_price: number;
  rating: number;
  students_count: number;
  duration_hours: number;
  emoji: string;
  badge_text?: string;
  badge_style?: string;
  level: string;
  is_featured: number;
  questions_count: number;
  image_url?: string;
  curriculum_data: any[];
  what_is_included: string[];
  status: 'draft' | 'published';
  created_at: string;
  updated_at?: string;
}

export interface Enrollment {
  id: number;
  user_id: number;
  course_id: number;
  enrolled_at: string;
  progress: number;
  status: 'pending' | 'active' | 'completed' | 'rejected';
  reviewed_at?: string | null;
  notes?: string;
  whatsapp_number?: string;
  payment_screenshot?: string;
  transaction_id?: string;
  payment_method?: string;
}

export type PaymentStatus = 'pending' | 'verified' | 'failed' | 'refunded';
export type PaymentMethod = 'easypaisa' | 'jazzcash' | 'bank_transfer' | 'stripe' | 'manual';

export interface Payment {
  id: number;
  user_id: number;
  payable_type: 'course' | 'qbank_plan';
  payable_id: number;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  transaction_id?: string;
  receipt_url?: string;
  status: PaymentStatus;
  payer_account_name?: string;
  payer_phone?: string;
  notes?: string;
  verified_by?: number | null;
  verified_at?: string | null;
  created_at: string;
}

export interface Testimonial {
  id: number;
  user_id?: number | null;
  student_name: string;
  avatar_url?: string;
  credential: string;
  exam_passed: ExamTrack;
  score_or_attempt?: string;
  quote: string;
  rating: number;
  verified: number; // 1 for real verified student, 0 for demo/unverified
  is_featured: number;
  sort_order: number;
  created_at: string;
}

export interface FaqItem {
  id: number;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
  is_published: number;
  created_at: string;
}
