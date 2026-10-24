import { NextResponse } from 'next/server';
import { getAuthFromRequest, checkUserPlatformAccess, verifyPassword, hashPassword, validatePasswordStrength } from '@/lib/auth';
import { queryOne, query, execute } from '@/lib/db';
import { updateProfileSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const user = await queryOne('SELECT * FROM users WHERE id = ?', [session.id]);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const access = await checkUserPlatformAccess(user.id);

    // Fetch enrollments with course details
    const enrollments = await query(
      `SELECT e.*, c.title as course_title, c.category as course_category, c.emoji as course_emoji
       FROM enrollments e
       LEFT JOIN courses c ON e.course_id = c.id
       WHERE e.user_id = ?
       ORDER BY e.enrolled_at DESC`,
      [user.id]
    );

    // Fetch subscriptions
    const subscriptions = await query(
      `SELECT * FROM qbank_subscriptions WHERE user_id = ? ORDER BY enrolled_at DESC`,
      [user.id]
    );

    // Fetch notifications
    const notifications = await query(
      `SELECT * FROM student_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30`,
      [user.id]
    );
    const unreadCount = notifications.filter(n => n.is_read === 0).length;

    // Fetch all attempts from modern `attempts` table (or fallback to legacy)
    let attempts = await query(
      `SELECT a.*, q.body_system as q_body_system, q.organ_system as q_organ_system,
              q.client_needs_category as q_client_category, q.category as q_category
       FROM attempts a
       LEFT JOIN qbank_questions q ON a.question_id = q.id
       WHERE a.user_id = ?
       ORDER BY a.attempted_at DESC`,
      [user.id]
    );

    if (attempts.length === 0) {
      // Check legacy attempts
      attempts = await query(
        `SELECT a.*, q.organ_system as q_body_system, q.category as q_category
         FROM student_qbank_attempts a
         LEFT JOIN qbank_questions q ON a.question_id = q.id
         WHERE a.user_id = ?
         ORDER BY a.attempted_at DESC`,
        [user.id]
      );
    }

    const totalAttempted = attempts.length;
    const totalCorrect = attempts.filter(a => Number(a.is_correct) === 1 || Number(a.score) >= 1.0).length;
    const overallAccuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

    // Average time per question
    let totalSecondsSpent = 0;
    let timedAttemptsCount = 0;
    for (const a of attempts) {
      if (a.time_spent_seconds && a.time_spent_seconds > 0) {
        totalSecondsSpent += a.time_spent_seconds;
        timedAttemptsCount++;
      }
    }
    const avgSecondsPerQuestion = timedAttemptsCount > 0 ? Math.round(totalSecondsSpent / timedAttemptsCount) : 48;

    // Accuracy by Body System
    const systemStats: Record<string, { total: number; correct: number; accuracy: number }> = {};
    const standardSystems = [
      'Cardiovascular System',
      'Respiratory System',
      'Neurological & Sensory System',
      'Gastrointestinal & Hepatic System',
      'Renal & Urinary System',
      'Endocrine System',
      'Musculoskeletal System',
      'Hematologic & Immune System',
      'Reproductive & Maternal-Newborn',
      'Mental Health & Psychosocial',
    ];

    for (const sys of standardSystems) {
      systemStats[sys] = { total: 0, correct: 0, accuracy: 0 };
    }

    for (const a of attempts) {
      const rawSys = a.body_system || a.q_body_system || a.q_organ_system || 'General Clinical';
      const matchedSys = standardSystems.find(s => s.toLowerCase() === rawSys.toLowerCase()) || rawSys;
      if (!systemStats[matchedSys]) {
        systemStats[matchedSys] = { total: 0, correct: 0, accuracy: 0 };
      }
      systemStats[matchedSys].total++;
      if (Number(a.is_correct) === 1 || Number(a.score) >= 0.8) {
        systemStats[matchedSys].correct++;
      }
    }

    for (const sys in systemStats) {
      if (systemStats[sys].total > 0) {
        systemStats[sys].accuracy = Math.round((systemStats[sys].correct / systemStats[sys].total) * 100);
      }
    }

    const systemsList = Object.entries(systemStats)
      .map(([system, data]) => ({ system, ...data }))
      .sort((a, b) => b.total - a.total);

    // Accuracy by Client-Needs Category
    const categoryStats: Record<string, { total: number; correct: number; accuracy: number }> = {};
    for (const a of attempts) {
      const cat = a.client_needs_category || a.q_client_category || a.category || a.q_category || 'Management of Care';
      if (!categoryStats[cat]) {
        categoryStats[cat] = { total: 0, correct: 0, accuracy: 0 };
      }
      categoryStats[cat].total++;
      if (Number(a.is_correct) === 1 || Number(a.score) >= 0.8) {
        categoryStats[cat].correct++;
      }
    }

    for (const cat in categoryStats) {
      if (categoryStats[cat].total > 0) {
        categoryStats[cat].accuracy = Math.round((categoryStats[cat].correct / categoryStats[cat].total) * 100);
      }
    }

    const categoriesList = Object.entries(categoryStats).map(([category, data]) => ({
      category,
      attempts: data.total,
      correct: data.correct,
      accuracy: data.accuracy,
    }));

    // Weak topics list (systems or categories with < 65% accuracy and >= 1 attempt)
    const weakTopics = systemsList
      .filter(s => s.total >= 1 && s.accuracy < 65)
      .concat(
        categoriesList
          .filter(c => c.attempts >= 1 && c.accuracy < 65)
          .map(c => ({ system: c.category, total: c.attempts, correct: c.correct, accuracy: c.accuracy }))
      )
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);

    // Practice Streak (consecutive distinct days with attempts)
    const distinctDates = new Set<string>();
    for (const a of attempts) {
      if (a.attempted_at) {
        const d = new Date(a.attempted_at).toISOString().split('T')[0];
        distinctDates.add(d);
      }
    }

    let streakDays = 0;
    const sortedDates = Array.from(distinctDates).sort().reverse();
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (sortedDates.includes(todayStr) || sortedDates.includes(yesterday)) {
      let currentCheck = new Date(sortedDates[0]);
      streakDays = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(sortedDates[i]);
        const diffDays = Math.round((currentCheck.getTime() - prevDate.getTime()) / (1000 * 3600 * 24));
        if (diffDays === 1) {
          streakDays++;
          currentCheck = prevDate;
        } else {
          break;
        }
      }
    }

    // Readiness Estimate (Algorithmic model combining volume, accuracy, and difficulty)
    // Formula: Base 50 + (Overall Accuracy * 0.4) + min(10, totalAttempted * 0.1)
    let readinessScore: number | null = null;
    let readinessLevel = 'Developing';

    if (totalAttempted >= 5) {
      const rawScore = Math.min(99, Math.round(overallAccuracy * 0.85 + Math.min(15, totalAttempted * 0.15)));
      readinessScore = rawScore;
      if (rawScore >= 80) readinessLevel = 'High Probability';
      else if (rawScore >= 65) readinessLevel = 'Moderate Probability';
      else readinessLevel = 'Needs Remediation';
    }

    // Recent test sessions trend
    const recentSessions = await query(
      `SELECT id, title, mode, exam_track, score_percentage, total_questions, correct_count, time_spent_seconds, completed_at, created_at
       FROM test_sessions
       WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 8`,
      [user.id]
    );

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone || '',
        role: user.role,
        examType: user.exam_type || 'NCLEX-RN',
        createdAt: user.created_at,
      },
      hasFullAccess: access.hasAccess,
      access,
      stats: {
        totalAttempts: totalAttempted,
        correctAttempts: totalCorrect,
        accuracyPct: overallAccuracy,
        avgSecondsPerQuestion,
        streakDays,
        readinessScore,
        readinessLevel,
        readinessDisclaimer: 'Estimated NCLEX Readiness Score — Formulated from your practice diagnostics. Not an official guarantee of licensure.',
      },
      analytics: {
        systemsList,
        categoriesList,
        weakTopics,
        recentSessions,
      },
      scores: {
        totalAttempted,
        totalCorrect,
        overallAccuracy,
        categoryBreakdown: categoryStats,
      },
      categories: categoriesList,
      enrollments: enrollments.map(e => ({
        id: e.id,
        courseId: e.course_id,
        courseTitle: e.course_title || 'NCLEX Course',
        courseCategory: e.course_category,
        courseEmoji: e.course_emoji || '📚',
        status: e.status,
        enrolledAt: e.enrolled_at,
        reviewedAt: e.reviewed_at,
        whatsappNumber: e.whatsapp_number,
        paymentScreenshot: e.payment_screenshot,
        transactionId: e.transaction_id,
        notes: e.notes,
      })),
      subscriptions: subscriptions.map(s => ({
        id: s.id,
        planId: s.plan_id,
        planName: s.plan_name,
        durationDays: s.duration_days,
        price: Number(s.price),
        status: s.status,
        enrolledAt: s.enrolled_at,
        expiresAt: s.expires_at,
        whatsappNumber: s.whatsapp_number,
        paymentScreenshot: s.payment_screenshot,
      })),
      notifications: notifications.map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.is_read === 1,
        link: n.link,
        createdAt: n.created_at,
      })),
      unreadNotificationsCount: unreadCount,
    });
  } catch (error: any) {
    console.error('Student profile error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const user = await queryOne('SELECT * FROM users WHERE id = ?', [session.id]);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.issues[0].message }, { status: 400 });
    }

    const { firstName, lastName, phone, examType, currentPassword, newPassword } = parsed.data;

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ success: false, message: 'Current password is required to change your password.' }, { status: 400 });
      }

      const isValid = await verifyPassword(currentPassword, user.password_hash);
      if (!isValid) {
        return NextResponse.json({ success: false, message: 'Current password is incorrect.' }, { status: 400 });
      }

      const strength = validatePasswordStrength(newPassword);
      if (!strength.valid) {
        return NextResponse.json({ success: false, message: strength.message }, { status: 400 });
      }

      const newHash = await hashPassword(newPassword);
      await execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, user.id]);
    }

    const updatedFirstName = firstName ? firstName.trim() : user.first_name;
    const updatedLastName = lastName ? lastName.trim() : user.last_name;
    const updatedPhone = phone !== undefined ? phone.trim() : (user.phone || '');
    const updatedExamType = examType || user.exam_type || 'NCLEX-RN';

    await execute(
      'UPDATE users SET first_name = ?, last_name = ?, phone = ?, exam_type = ? WHERE id = ?',
      [updatedFirstName, updatedLastName, updatedPhone, updatedExamType, user.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: user.id,
        email: user.email,
        firstName: updatedFirstName,
        lastName: updatedLastName,
        phone: updatedPhone,
        examType: updatedExamType,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
