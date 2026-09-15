import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, authenticateRequest, checkRateLimit, getClientIp } from './auth-utils.js';

export interface QuestionPointerInput {
  id?: string | number;
  questionText: string;
  examYear?: string;
  marks?: string;
  topic?: string;
  solution?: string;
}

export interface AnswerSlideContent {
  slideTitle?: string;           // Optional title for this specific slide (null = inherit from question)
  identifiedSolution?: string;   // ALWAYS present on slide 1 — direct, authoritative solution upfront
  definition?: string;           // Formal academic definition (only for theory questions, slide 1)
  bullets: string[];             // Point-wise organic explanations — bold lead-in + explanation
  formulaOrCode?: string;        // Monospace equation / recurrence / trace (any slide)
  professorNote?: string;        // Teaching advice / common exam pitfall (typically last slide)
}

export interface AnswerPointerResult {
  questionIndex: number;
  coreConcept: string;           // Crisp technical topic title (3–6 words)
  isTheory: boolean;
  slides: AnswerSlideContent[];  // 1+ slides — DeepSeek decides count organically
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // ─── AUTHENTICATION CHECK ──────────────────────────────────────────────────
  const auth = authenticateRequest(req);
  if (!auth.authenticated || !auth.user) {
    return res.status(401).json({
      success: false,
      error: auth.error || 'Authentication required to generate PYQ pointers.',
    });
  }

  const ip = getClientIp(req);
  const rl = checkRateLimit(`ai_pointers:${auth.user.sub}:${ip}`, 20, 60 * 1000); // 20 requests/min
  if (!rl.allowed) {
    return res.status(429).json({ success: false, error: 'AI pointer generation rate limit exceeded. Please wait a moment.' });
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

  const systemPrompt = `You are a distinguished university professor and acclaimed textbook author for ${subject}.
Your task is to craft authentic, pedagogically superior lecture slide notes for university exam questions.
These notes will be rendered directly onto slides shown to engineering students — they must feel human-authored.

═══ CARDINAL RULES ═══

1. NEVER produce rigid AI templates:
   — ZERO conversational filler: no "Let's explore", "Certainly!", "Here is a breakdown", "In conclusion".
   — ZERO artificial template labels: no "Milestone 1:", "Milestone 2:", "SOLUTION ROADMAP", "Marking Rubric: [2M]".
   — ZERO generic placeholder text. Every bullet must contain real subject-matter knowledge.
   — Slides must feel authored by a real professor who knows the subject deeply.

2. SLIDE COUNT IS ORGANIC — NOT FIXED:
   — Use AS MANY slides as the content genuinely requires (minimum 1, typically 2 for non-trivial questions).
   — Simple definitional or single-step questions: 1 slide is fine.
   — Theory concepts with formal definitions + multiple key principles: 2 slides.
   — Numerical derivations or algorithmic traces: 2 slides (Slide 1: Setup & approach; Slide 2: Worked derivation & complexity).
   — Complex proofs or multi-part analysis: up to 3 slides.
   — Do NOT pad slides to meet a quota. Do NOT cram everything into 1 slide if it makes slides cluttered.

3. SLIDE 1 STRUCTURE (mandatory for every question):
   a. "identifiedSolution": 1–2 authoritative sentences directly stating THE ANSWER / core theorem / target result upfront.
      — Numerical: state the result / formula immediately.
      — Theory: state the core concept / theorem that resolves the question.
      — Never vague, never filler.
   b. "definition": (ONLY if isTheory=true OR if formal definitions are required)
      — Rigorous, formal academic definition of the central concept involved.
      — Include mathematical notation where applicable.
      — Omit for purely numerical derivation questions.
   c. "bullets": 3–5 organic, professor-level bullet points.
      — Each bullet starts with a **Bold Technical Anchor** followed by a colon and precise explanation.
      — Example: "**Optimal Substructure:** Every sub-path of a shortest path is itself a shortest path — enables safe greedy relaxation."
      — No numbered lists, no Milestone labels, no Step prefixes.

4. SLIDE 2+ (if needed):
   — Continue the pedagogical narrative naturally.
   — "bullets": 3–5 additional organic bullet points covering the next logical layer:
     * For theory: deeper operational mechanisms, trade-offs, edge cases, comparison with alternatives.
     * For numerical: worked step-by-step derivation, intermediate computations, final result verification.
     * For algorithmic: pseudocode trace, invariant maintenance, runtime analysis.
   — "formulaOrCode": Include the governing equation, recurrence, or complexity bound on whichever slide it is most relevant to.
   — "professorNote": 1 authentic teaching tip, common exam mistake, or high-yield exam advice. Put on the LAST slide.
   — "slideTitle": Optional short title for this slide (e.g., "Worked Derivation", "Complexity & Trade-offs").

5. QUALITY STANDARD:
   — Each bullet must contain REAL content. No placeholder prose.
   — "coreConcept": Crisp 3–6 word technical topic title (e.g., "AVL Tree Rotations & Balance Factor", "Master Theorem Case Analysis").
   — "isTheory": true if question asks for explanation, definition, comparison, architecture, or properties. false if purely numerical/derivation/code.

═══ RETURN FORMAT ═══

Return ONLY valid JSON with key "results" containing an array:
{
  "results": [
    {
      "questionIndex": 0,
      "coreConcept": "...",
      "isTheory": true,
      "slides": [
        {
          "slideTitle": null,
          "identifiedSolution": "...",
          "definition": "...",
          "bullets": ["**Bold Anchor:** explanation", "**Another Anchor:** explanation"],
          "formulaOrCode": null,
          "professorNote": null
        },
        {
          "slideTitle": "Worked Analysis & Trade-offs",
          "identifiedSolution": null,
          "definition": null,
          "bullets": ["**Bold Anchor:** explanation", "**Another Anchor:** explanation"],
          "formulaOrCode": "T(n) = Θ(n log n)",
          "professorNote": "Watch for..."
        }
      ]
    }
  ]
}`;

  const userPrompt = `Subject: ${subject}
Total Questions: ${trimmedQuestions.length}

Questions List:
${formattedQuestionsList}

Generate multi-slide professor lecture notes for each question now. Remember: organic slide count, solution upfront, real technical content — not AI templates.`;

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
        temperature: 0.25,
        max_tokens: 8192,
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

    // Helper for safe JSON repair
    const safeParse = (str: string): any => {
      const clean = str.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      try { return JSON.parse(clean); } catch (e) {}
      try {
        const sanitized = clean.replace(/[\u0000-\u001F]+/g, (m) => (m === '\n' ? '\\n' : m === '\r' ? '\\r' : m === '\t' ? '\\t' : ''));
        return JSON.parse(sanitized);
      } catch (e) {}
      let endPos = clean.length;
      while (endPos > 0) {
        const lastCloseBrace = clean.lastIndexOf('}', endPos - 1);
        if (lastCloseBrace === -1) break;
        const sub = clean.slice(0, lastCloseBrace + 1);
        for (const cand of [sub + ']}', sub + ']', sub + '}']) {
          try {
            const p = JSON.parse(cand);
            if (p && (Array.isArray(p) || Array.isArray(p.results) || typeof p === 'object')) return p;
          } catch (e) {}
        }
        endPos = lastCloseBrace;
      }
      const extracted: any[] = [];
      const objectRegex = /\{\s*"questionIndex"\s*:\s*\d+[\s\S]*?\n\s*\}/g;
      let match: RegExpExecArray | null;
      while ((match = objectRegex.exec(clean)) !== null) {
        try {
          const obj = JSON.parse(match[0]);
          if (obj && typeof obj.questionIndex === 'number') extracted.push(obj);
        } catch (e) {}
      }
      if (extracted.length > 0) return { results: extracted };
      return null;
    };

    let parsedResults: AnswerPointerResult[] = [];
    const parsed = safeParse(rawContent);
    if (parsed) {
      if (Array.isArray(parsed)) {
        parsedResults = parsed;
      } else if (parsed.results && Array.isArray(parsed.results)) {
        parsedResults = parsed.results;
      } else {
        const values = Object.values(parsed);
        const arrayVal = values.find((v) => Array.isArray(v));
        if (arrayVal) {
          parsedResults = arrayVal as AnswerPointerResult[];
        }
      }
    } else {
      return res.status(500).json({
        success: false,
        error: 'Failed to parse DeepSeek JSON response.',
        rawContent,
      });
    }

    // Build a map keyed by questionIndex (0..N-1)
    const pointersMap: Record<number, AnswerPointerResult> = {};
    parsedResults.forEach((item, fallbackIdx) => {
      const idx = typeof item.questionIndex === 'number' ? item.questionIndex : fallbackIdx;

      // Normalise slides — handle both new multi-slide format and old flat format for backward compat
      let slides: AnswerSlideContent[] = [];

      if (Array.isArray(item.slides) && item.slides.length > 0) {
        // New multi-slide format
        slides = item.slides.map((s: any) => ({
          slideTitle: s.slideTitle || null,
          identifiedSolution: s.identifiedSolution || null,
          definition: s.definition || null,
          bullets: Array.isArray(s.bullets) ? s.bullets.map((b: string) => b.replace(/^Milestone\s*\d+[:.-]?\s*/i, '').trim()).filter((b: string) => b.length > 0) : [],
          formulaOrCode: s.formulaOrCode || s.formulaOrResult || null,
          professorNote: s.professorNote || null,
        }));
      } else {
        // Legacy flat format — convert to single slide
        const legacyPointers = Array.isArray((item as any).pointers) ? (item as any).pointers : [];
        slides = [{
          identifiedSolution: (item as any).identifiedSolution || null,
          definition: (item as any).definition || null,
          bullets: legacyPointers.map((p: string) => p.replace(/^Milestone\s*\d+[:.-]?\s*/i, '').trim()).filter((p: string) => p.length > 0),
          formulaOrCode: (item as any).formulaOrResult || (item as any).formulaOrCode || null,
          professorNote: (item as any).professorNote || null,
        }];
      }

      // Ensure at least 1 slide
      if (slides.length === 0) {
        slides = [{ bullets: ['Solution identified and verified.'] }];
      }

      pointersMap[idx] = {
        questionIndex: idx,
        coreConcept: item.coreConcept || 'Core Principle & Solution Steps',
        isTheory: typeof item.isTheory === 'boolean' ? item.isTheory : false,
        slides,
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
