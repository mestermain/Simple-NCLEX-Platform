import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { execute } from '@/lib/db';
import { logAdminAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

function parseCSV(text: string): Record<string, string>[] {
  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
      currentLine += char;
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (currentLine.trim()) lines.push(currentLine.trim());
      currentLine = '';
      if (char === '\r' && text[i + 1] === '\n') i++;
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) lines.push(currentLine.trim());
  if (lines.length < 2) return [];

  const splitRow = (row: string): string[] => {
    const cells: string[] = [];
    let cell = '';
    let inQ = false;
    for (let i = 0; i < row.length; i++) {
      const c = row[i];
      if (c === '"') {
        inQ = !inQ;
      } else if (c === ',' && !inQ) {
        cells.push(cell.trim().replace(/^["']|["']$/g, ''));
        cell = '';
      } else {
        cell += c;
      }
    }
    cells.push(cell.trim().replace(/^["']|["']$/g, ''));
    return cells;
  };

  const headers = splitRow(lines[0]).map(h => h.toLowerCase().replace(/[\s_-]+/g, '_'));
  const results: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitRow(lines[i]);
    if (values.length === 0 || (values.length === 1 && !values[0])) continue;
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] !== undefined ? values[idx] : '';
    });
    results.push(rowObj);
  }
  return results;
}

export async function POST(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const rawContent = (body.content || body.jsonCode || '').trim();
    const format = body.format || 'auto';
    const defaultCategory = body.defaultCategory || 'Pharmacology & Parenteral Therapies';
    const defaultExamType = body.defaultExamType || 'NCLEX-RN';
    const defaultMockTest = body.defaultMockTest ? Number(body.defaultMockTest) : null;
    const isDemo = Boolean(body.isDemo);

    if (!rawContent) {
      return NextResponse.json({ success: false, message: 'Question data (JSON or CSV) is required' }, { status: 400 });
    }

    let items: any[] = [];
    const isLikelyCsv = format === 'csv' || (!rawContent.startsWith('{') && !rawContent.startsWith('[') && rawContent.includes(','));

    if (isLikelyCsv) {
      const parsedCsv = parseCSV(rawContent);
      if (parsedCsv.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'Unable to parse CSV. Ensure row headers: statement, options, correct_indices, correct_rationale',
        }, { status: 400 });
      }
      items = parsedCsv.map(row => {
        const rawOpts = row.options || row.choices || '';
        const options = rawOpts.includes('|')
          ? rawOpts.split('|').map(s => s.trim())
          : rawOpts.split(';').map(s => s.trim());

        const rawIndices = row.correct_indices || row.correct_index || row.answer || '0';
        const correctIndices = String(rawIndices).split(/[,;]/).map(s => Number(s.trim())).filter(n => !isNaN(n));
        const rowMock = row.mock_test || row.mocktest || row.mock_test_id || row.mockTest;

        return {
          statement: row.statement || row.question || '',
          options,
          correct_indices: correctIndices.length > 0 ? correctIndices : [0],
          correct_rationale: row.correct_rationale || row.rationale || row.explanation || '',
          category: row.category || defaultCategory,
          difficulty: row.difficulty || 'High Yield',
          exam_type: row.exam_type || row.exam || defaultExamType,
          client_need: row.client_need || '',
          clinical_pearl: row.clinical_pearl || row.pearl || '',
          mock_test: rowMock ? Number(rowMock) : (defaultMockTest || null),
        };
      });
    } else {
      let parsedJson: any;
      try {
        parsedJson = JSON.parse(rawContent);
      } catch (e: any) {
        return NextResponse.json({ success: false, message: `Invalid JSON syntax: ${e.message}` }, { status: 400 });
      }
      items = Array.isArray(parsedJson) ? parsedJson : (Array.isArray(parsedJson.questions) ? parsedJson.questions : [parsedJson]);
    }

    if (items.length === 0) {
      return NextResponse.json({ success: false, message: 'No questions detected to import' }, { status: 400 });
    }

    let importedCount = 0;
    let msqCount = 0;
    let mcqCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const rowNum = i + 1;
      const statement = (item.statement || item.question || item.stem || '').trim();
      if (!statement || statement.length < 5) {
        errors.push(`Item #${rowNum}: Statement is missing or too short (min 5 chars)`);
        continue;
      }

      const rawOptions = item.options || item.choices || [];
      const options = (Array.isArray(rawOptions) ? rawOptions : String(rawOptions).split('|'))
        .map(String)
        .map(s => s.trim())
        .filter(Boolean);

      if (options.length < 2) {
        errors.push(`Item #${rowNum}: Requires at least 2 non-empty options`);
        continue;
      }

      const category = (item.category || defaultCategory).trim();
      const difficulty = (item.difficulty || 'High Yield').trim();
      const examType = (item.exam_type || item.examType || defaultExamType).trim();
      const clientNeed = (item.client_need || item.clientNeed || 'Safe and Effective Care Environment').trim();
      const correctRationale = (item.correct_rationale || item.rationale || item.explanation || 'Option rationales validated by nursing faculty.').trim();
      const clinicalPearl = (item.clinical_pearl || item.clinicalPearl || item.pearl || '').trim();

      const rawDistractors = item.distractors || item.distractor_analysis || [];
      const distractors = Array.isArray(rawDistractors) ? rawDistractors.map(String) : [];

      let correctIndices: number[] = [];
      if (Array.isArray(item.correct_indices)) correctIndices = item.correct_indices.map(Number);
      else if (Array.isArray(item.correctIndices)) correctIndices = item.correctIndices.map(Number);
      else if (item.correct_index !== undefined) correctIndices = [Number(item.correct_index)];
      else if (item.correctIndex !== undefined) correctIndices = [Number(item.correctIndex)];
      else if (item.answer !== undefined) correctIndices = [Number(item.answer)];

      if (correctIndices.length === 0) correctIndices = [0];

      const isMultiple = correctIndices.length > 1;
      const qType = isMultiple ? 'multiple' : 'single';
      if (isMultiple) msqCount++;
      else mcqCount++;

      const rowMock = item.mock_test || item.mocktest || item.mock_test_id || item.mockTest;
      const resolvedMockTest = rowMock ? Number(rowMock) : (defaultMockTest || null);

      await execute(
        `INSERT INTO qbank_questions 
         (category, difficulty, exam_type, client_need, statement, options_json, correct_index, correct_rationale, distractors_json, clinical_pearl, is_demo, sort_order, question_type, correct_indices_json, is_published, mock_test, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 1, ?, CURRENT_TIMESTAMP)`,
        [
          category,
          difficulty,
          examType,
          clientNeed,
          statement,
          JSON.stringify(options),
          correctIndices[0] || 0,
          correctRationale,
          JSON.stringify(distractors),
          clinicalPearl,
          isDemo ? 1 : 0,
          qType,
          JSON.stringify(correctIndices),
          resolvedMockTest,
        ]
      );

      importedCount++;
    }

    if (importedCount > 0) {
      await logAdminAction(
        session.userId,
        'question.bulk_import',
        'qbank_questions',
        undefined,
        { importedCount, msqCount, mcqCount, format: isLikelyCsv ? 'csv' : 'json' },
        req
      );
    }

    return NextResponse.json({
      success: importedCount > 0,
      message: `Successfully imported ${importedCount} items (${msqCount} Multi-Choice SATA MSQs, ${mcqCount} Single-Choice MCQs).${errors.length > 0 ? ` ${errors.length} skipped due to validation.` : ''}`,
      importedCount,
      msqCount,
      mcqCount,
      errors: errors.slice(0, 10),
    });
  } catch (error: any) {
    console.error('Bulk import error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

