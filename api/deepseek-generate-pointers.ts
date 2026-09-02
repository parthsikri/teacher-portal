import type { VercelRequest, VercelResponse } from '@vercel/node';

export interface QuestionPointerInput {
  id?: string | number;
  questionText: string;
  examYear?: string;
  marks?: string;
  topic?: string;
  solution?: string;
}

export interface AnswerPointerResult {
  questionIndex: number;
  coreConcept: string;
  pointers: string[];
  formulaOrResult?: string;
  commonPitfall?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const {
    subject = 'Engineering',
    questions = [],
    apiKey: userApiKey,
  } = req.body || {};

  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ success: false, error: 'No questions provided for pointer generation.' });
  }

  const apiKey = (userApiKey && typeof userApiKey === 'string' && userApiKey.trim() !== '')
    ? userApiKey.trim()
    : process.env.DEEPSEEK_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'DeepSeek API Key is not configured. Please provide your DeepSeek API key (starts with sk-...) or set DEEPSEEK_API_KEY.',
      needsApiKey: true,
    });
  }

  // Format candidate questions concisely (cap at 30 questions per batch to fit context limits)
  const trimmedQuestions = questions.slice(0, 30);
  const formattedQuestionsList = trimmedQuestions
    .map((q: QuestionPointerInput, idx: number) => {
      let item = `[Q#${idx + 1}]`;
      if (q.examYear) item += ` [${q.examYear}]`;
      if (q.marks) item += ` [${q.marks}]`;
      if (q.topic) item += ` [Topic: ${q.topic}]`;
      item += `\nQuestion: ${q.questionText}`;
      if (q.solution && q.solution.trim() !== '') {
        item += `\nReference Solution Draft: ${q.solution.slice(0, 400)}`;
      }
      return item;
    })
    .join('\n\n');

  const systemPrompt = `You are a distinguished university engineering professor and university chief examiner for ${subject}.
Your task is to write high-yield, step-by-step solution pointers and marking roadmap for each previous year examination question.

CRITICAL TONE & FORMAT RULES (MUST COMPLY STRICTLY):
1. ABSOLUTELY CANNOT LOOK LIKE AI:
   - NO AI conversational filler, polite openings, or meta-commentary (NEVER say "Certainly!", "Here is a breakdown", "Let's delve into", "It is crucial to understand", "As an AI model", "In conclusion").
   - NO emoji spam.
   - Output must look like authentic, human-written lecture notes by an experienced professor on a lecture board or marking handout.
   - Use crisp, economical, authoritative engineering language with standard academic notation (e.g., O(n log n), Kirchhoff KCL, Maxwell equations, Taylor series, Laplace transform s-domain, boundary values).

2. FOR EACH QUESTION, PRODUCE:
   - "coreConcept": Short 3 to 6 word concept heading (e.g., "Breadth-First Traversal via Queue", "Nodal Analysis using Kirchhoff's Current Law", "B-Tree Node Overflow Split").
   - "pointers": Array of 3 to 5 concise, actionable derivation milestones that an examiner looks for when awarding step marks:
     * Mention governing laws, initial conditions, or boundary assumptions.
     * State exact intermediate mathematical step or transformation.
     * State final simplification or verification step.
   - "formulaOrResult": The essential formula, recurrence, or final numerical/asymptotic expression. Keep it exact and clean (e.g., "T(n) = 2T(n/2) + O(n) => O(n log n)", "I_b = (V_cc - V_be) / (R_b + (1+β)R_e)").
   - "commonPitfall": 1 realistic, sharp exam trap that costs students marks (e.g., "Missing the negative sign in clockwise loop orientation", "Neglecting to check empty queue edge condition").

RETURN FORMAT:
Return ONLY a valid JSON object with key "results" containing an array of objects matching this schema:
{
  "results": [
    {
      "questionIndex": 0,
      "coreConcept": "...",
      "pointers": ["...", "...", "..."],
      "formulaOrResult": "...",
      "commonPitfall": "..."
    }
  ]
}`;

  const userPrompt = `Subject: ${subject}
Total Questions: ${trimmedQuestions.length}

Questions List:
${formattedQuestionsList}

Generate concise, human-professor solution pointers for each question now.`;

  try {
    const deepSeekResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 3500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!deepSeekResponse.ok) {
      const errorText = await deepSeekResponse.text();
      return res.status(deepSeekResponse.status).json({
        success: false,
        error: `DeepSeek API returned error ${deepSeekResponse.status}: ${errorText}`,
      });
    }

    const data = await deepSeekResponse.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      return res.status(500).json({
        success: false,
        error: 'DeepSeek returned an empty response.',
      });
    }

    let parsedResults: AnswerPointerResult[] = [];
    try {
      const cleanJson = rawContent
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      const parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed)) {
        parsedResults = parsed;
      } else if (parsed.results && Array.isArray(parsed.results)) {
        parsedResults = parsed.results;
      } else if (parsed.pointers && Array.isArray(parsed.pointers)) {
        parsedResults = parsed.pointers;
      } else {
        const values = Object.values(parsed);
        const arrayVal = values.find((v) => Array.isArray(v));
        if (arrayVal) {
          parsedResults = arrayVal as AnswerPointerResult[];
        }
      }
    } catch (parseErr: any) {
      return res.status(500).json({
        success: false,
        error: `Failed to parse DeepSeek JSON response: ${parseErr.message}`,
        rawContent,
      });
    }

    // Build a map keyed by questionIndex (0..N-1)
    const pointersMap: Record<number, AnswerPointerResult> = {};
    parsedResults.forEach((item, fallbackIdx) => {
      const idx = typeof item.questionIndex === 'number' ? item.questionIndex : fallbackIdx;
      pointersMap[idx] = {
        questionIndex: idx,
        coreConcept: item.coreConcept || 'Core Principle & Solution Steps',
        pointers: Array.isArray(item.pointers) && item.pointers.length > 0
          ? item.pointers
          : ['Identify given parameters and boundary conditions.', 'Apply fundamental governing equation.', 'Verify final solution consistency.'],
        formulaOrResult: item.formulaOrResult || undefined,
        commonPitfall: item.commonPitfall || undefined,
      };
    });

    return res.status(200).json({
      success: true,
      pointersMap,
      count: Object.keys(pointersMap).length,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Network error communicating with DeepSeek API.',
    });
  }
}
