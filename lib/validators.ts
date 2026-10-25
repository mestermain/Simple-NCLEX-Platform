import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().min(3, 'Identifier must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  email: z.string().trim().toLowerCase().email('Invalid email address format'),
  phone: z.string().trim().min(8, 'Phone/WhatsApp number must have at least 8 digits'),
  examType: z.string().default('NCLEX-RN'),
  password: z.string().min(6, 'Password must be at least 6 characters')
    .refine((val) => /[a-zA-Z]/.test(val) && /[0-9]/.test(val), {
      message: 'Password must contain both letters and numbers',
    }),
});

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(8).optional(),
  examType: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
});

export const questionSchema = z.object({
  id: z.number().optional(),
  statement: z.string().trim().min(5, 'Question statement must be at least 5 characters'),
  category: z.string().trim().min(2, 'Category is required'),
  organSystem: z.string().default('Comprehensive Multi-System'),
  clientNeed: z.string().default('Safe and Effective Care Environment'),
  difficulty: z.string().default('High Yield'),
  examType: z.string().default('NCLEX-RN'),
  questionType: z.enum(['single', 'multiple']).default('single'),
  options: z.array(z.string().trim().min(1, 'Option cannot be empty')).min(2, 'At least 2 options required'),
  correctIndex: z.number().int().nonnegative().default(0),
  correctIndices: z.array(z.number().int().nonnegative()).optional(),
  correctRationale: z.string().trim().min(5, 'Clinical rationale is required'),
  clinicalPearl: z.string().trim().default(''),
  isPublished: z.boolean().default(true),
  mockTest: z.coerce.number().int().min(1).max(4).nullable().optional(),
});

export const courseSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().trim().min(3, 'Course title is required'),
  description: z.string().trim().min(5, 'Description is required'),
  category: z.string().default('NCLEX-RN'),
  price: z.coerce.number().min(0, 'Price must be 0 or positive'),
  originalPrice: z.coerce.number().optional(),
  durationHours: z.coerce.number().default(40),
  studentsCount: z.coerce.number().default(0),
  questionsCount: z.coerce.number().optional(),
  level: z.string().optional(),
  badgeText: z.string().optional(),
  emoji: z.string().optional(),
  imageUrl: z.string().optional(),
  status: z.enum(['published', 'draft', 'archived']).default('published'),
});

export const updateStatusSchema = z.object({
  id: z.coerce.number().int().positive(),
  status: z.enum(['approved', 'rejected', 'pending']),
  notes: z.string().optional(),
});

export const updateSubscriptionStatusSchema = z.object({
  id: z.coerce.number().int().positive(),
  status: z.enum(['approved', 'rejected', 'pending']),
  notes: z.string().optional(),
  durationDays: z.coerce.number().int().positive().optional(),
});

export const resetPasswordSchema = z.object({
  userId: z.coerce.number().int().positive(),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

