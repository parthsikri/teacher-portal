import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, authenticateRequest, checkRateLimit, getClientIp } from './auth-utils.js';

export interface PyqItemInput {
  yearExam?: string;
  unitNumber?: string;
  mappedTopic?: string;
  questionText: string;
  marks?: string;
  solution?: string;
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
      error: auth.error || 'Authentication required to generate PPT presentations.',
    });
  }

  const ip = getClientIp(req);
  const rl = checkRateLimit(`ai_ppt:${auth.user.sub}:${ip}`, 20, 60 * 1000); // 20 requests/min
  if (!rl.allowed) {
    return res.status(429).json({ success: false, error: 'AI generation rate limit exceeded. Please wait a moment.' });
  }

  const {
    subject = 'Engineering',
    unit = 'UNIT 1',
    topicTitle,
    pyqList = [],
    customInstructions = '',
    targetAudience = 'zero_knowledge',
    slideCount = 10,
    apiKey: userApiKey,
  } = req.body || {};

  if (!topicTitle || typeof topicTitle !== 'string' || topicTitle.trim() === '') {
    return res.status(400).json({ success: false, error: 'topicTitle is required.' });
  }

  const apiKey = (userApiKey && userApiKey.trim() !== '') ? userApiKey.trim() : process.env.DEEPSEEK_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'DeepSeek API Key is not configured. Please enter your DeepSeek API key in the studio settings or set DEEPSEEK_API_KEY in Vercel environment variables.',
      needsApiKey: true,
    });
  }

  // Pre-filter PYQs: Include those matching the topic/unit, or feed up to 15 questions for the AI to filter strictly
  let rawPyqSection = 'No user PYQs provided. Generate 2 to 3 standard university/GATE examination problems matching this exact topic.';
  if (Array.isArray(pyqList) && pyqList.length > 0) {
    rawPyqSection = pyqList
      .slice(0, 20)
      .map(
        (q: PyqItemInput, i: number) =>
          `[Question #${i + 1}] ${q.mappedTopic ? `Topic: ${q.mappedTopic} | ` : ''}${q.unitNumber ? `Unit: ${q.unitNumber} | ` : ''}${q.yearExam ? `Exam: ${q.yearExam} | ` : ''}Text: ${q.questionText}${q.marks ? ` [${q.marks}]` : ''}`
      )
      .join('\n\n');
  }

  const systemPrompt = `You are a distinguished University Professor, Department Chair, and Master Pedagogical Presentation Designer in ${subject}.
Your task is to generate a comprehensive, visually structured, publication-grade 16:9 lecture presentation slide deck for university engineering students.

CRITICAL ANTI-AI AESTHETIC & EDITORIAL DIRECTIVES (MANDATORY COMPLIANCE):
1. ABSOLUTELY CANNOT LOOK LIKE AI:
   - ZERO conversational openings, robotic pleasantries, or AI meta-commentary (NEVER say "In today's lecture", "Let's explore", "It is crucial to remember", "In conclusion", "As we delve deeper", "Understanding the basics of").
   - ZERO vague, generic bullet points. Every bullet MUST start with a bold technical anchor: e.g. "**Cache Invalidation Overhead:** ...", "**Recurrence Relation Form:** ...", "**State Invariant Preservation:** ...".
   - Dense with concrete engineering details: specify real variables, asymptotic bounds (O, \\Omega, \\Theta), concrete numerical values, actual code/pseudocode, and governing theorems.
   - Do NOT produce repetitive walls of bullets. Structure the slides using varied pedagogical archetypes (first-principles intuition, two-column comparative analysis, step-by-step procedure trace, exam problem breakdown, student pitfall corrections, and cheat-sheet summary).

2. FIRST-PRINCIPLES SUBTOPIC DECONSTRUCTION:
   - Deconstruct the topic from zero-knowledge intuition to rigorous technical mastery.
   - Sequence: Concrete Engineering Need/Intuition -> Core Mathematical/Architectural Definition -> Execution Trace & Mechanics -> Boundary/Edge Cases -> University Exam Problem Breakdown.

3. ACCURATE, MATURE ENGINEERING ANALOGIES:
   - Use intellectually satisfying, technically accurate engineering analogies (e.g. comparing virtual memory demand paging to OS page fault disk latency vs L1 cache, Dijkstra to GPS road graph edge weighting with turn penalties, dynamic programming to memoized DAG shortest paths).
   - Never use childish or oversimplified analogies. Explicitly connect the analogy directly to the mathematical and algorithmic reality.

4. STEP-BY-STEP PYQ SOLVED WALKS:
   - For every examination problem, provide:
     * Problem statement & given parameters.
     * Step-by-step mathematical/algorithmic execution trace with intermediate numbers.
     * Common student pitfalls to avoid.
     * Examiner marking strategy / step marks distribution.

OUTPUT FORMAT:
You MUST respond with a valid, clean JSON object strictly adhering to this schema:
{
  "deckTitle": "Main Presentation Title",
  "subject": "${subject}",
  "unit": "${unit}",
  "topicTitle": "${topicTitle}",
  "summary": "2-sentence executive overview of the lesson",
  "subtopicRoadmap": [
    {
      "subtopicName": "1. Fundamental Problem & Intuition",
      "pedagogicalGoal": "Build concrete engineering motivation before formalization",
      "addedFromPyqReview": false
    },
    {
      "subtopicName": "2. Formal Invariants & Architecture",
      "pedagogicalGoal": "Establish mathematical formulation and data structures",
      "addedFromPyqReview": false
    },
    {
      "subtopicName": "3. Step-by-Step Algorithmic Trace",
      "pedagogicalGoal": "Trace state transitions on concrete sample input",
      "addedFromPyqReview": false
    },
    {
      "subtopicName": "4. Edge Case Handling & Complexity Proof",
      "pedagogicalGoal": "Unpack tight bounds and tricky exam constraints",
      "addedFromPyqReview": true
    }
  ],
  "relevantPyqCount": 2,
  "slides": [
    {
      "slideNumber": 1,
      "type": "title",
      "badge": "COURSE BLUEPRINT",
      "title": "Main Lecture Title",
      "subtitle": "Clear Subtitle / Key Learning Objective",
      "bullets": ["Curriculum Scope", "Core Theorems Covered", "Target Examination Competencies"],
      "calloutTip": "Expected Learning Outcome: Master first principles & solve university examination problems."
    },
    {
      "slideNumber": 2,
      "type": "first_principles",
      "badge": "CORE INTUITION",
      "title": "Why Does This Exist? (First Principles)",
      "analogy": "Accurate, mature engineering analogy explaining the 'Why' in plain English",
      "bullets": [
        "**The Naive Flaw:** Why basic approaches break down under real constraints...",
        "**The Core Breakthrough:** How this concept solves the architectural bottleneck..."
      ],
      "calloutTip": "Mental Model: Core intuition connecting intuition to mathematical mechanics."
    },
    {
      "slideNumber": 3,
      "type": "concept_card",
      "badge": "FUNDAMENTAL THEORY",
      "title": "Mathematical Formulation & Definitions",
      "bullets": [
        "**Formal Definition:** Rigorous mathematical or algorithmic statement",
        "**Governing Invariants:** Fundamental properties that must hold true",
        "**Boundary Conditions:** Base cases and initial state assumptions"
      ],
      "formulaOrCode": "Key governing formula or concise pseudocode snippet",
      "calloutTip": "Exam Note: Examiners look for correct invariant formulation."
    },
    {
      "slideNumber": 4,
      "type": "two_column",
      "badge": "COMPARATIVE ANALYSIS",
      "title": "Trade-offs & Technical Variations",
      "leftColumnTitle": "Standard Approach / Primary Method",
      "leftColumnBullets": ["**Time Complexity:** O(...)", "**Memory Footprint:** Space bounds", "**Optimal For:** Primary use cases"],
      "rightColumnTitle": "Alternative / Constrained Variant",
      "rightColumnBullets": ["**Limitation:** Critical bottleneck", "**Degraded Case:** Worst-case behavior", "**Selection Criteria:** When to avoid"],
      "calloutTip": "Design Selection Rule: Choose approach A over B when..."
    },
    {
      "slideNumber": 5,
      "type": "step_by_step",
      "badge": "EXECUTION TRACE",
      "title": "Step-by-Step Algorithm & Procedure",
      "bullets": [
        "**Step 1: Initialization** - Setup initial pointers/variables...",
        "**Step 2: Iterative Relaxation/Update** - Main invariant transformation...",
        "**Step 3: Convergence & Termination** - Output extraction & validation..."
      ],
      "formulaOrCode": "Execution trace table or state transition recurrence",
      "calloutTip": "Time & Space Complexity: Detailed Big-O derivation."
    },
    {
      "slideNumber": 6,
      "type": "pyq_solution",
      "badge": "SOLVED UNIVERSITY / GATE PYQ",
      "title": "Examination Problem Walkthrough",
      "bullets": [
        "**Problem Classification:** Standard university pattern",
        "**Governing Technique:** Identified method to apply"
      ],
      "pyqDetails": {
        "examYear": "GATE / University Exam",
        "marks": "10 Marks",
        "question": "Exact question statement directly related to this topic...",
        "stepByStepSolution": [
          "Step 1: State given parameters and initial boundary conditions...",
          "Step 2: Apply the governing formula or trace table with intermediate values...",
          "Step 3: Compute final numerical / derived answer with proper units..."
        ],
        "keyTakeaway": "Examiner Marking Rubric: Step-by-step marks distribution."
      },
      "calloutTip": "Common Trap: Do NOT make the mistake of..."
    },
    {
      "slideNumber": 7,
      "type": "common_mistakes",
      "badge": "EXAM PITFALLS & TRAPS",
      "title": "Critical Student Mistakes to Avoid",
      "bullets": [
        "**Mistake 1:** Confusing X with Y -> **Correction:** Remember that...",
        "**Mistake 2:** Missing boundary condition -> **Correction:** Always check...",
        "**Mistake 3:** Incorrect complexity estimation -> **Correction:** Detail..."
      ],
      "calloutTip": "High-Yield Tip: Top scoring students always verify..."
    },
    {
      "slideNumber": 8,
      "type": "summary",
      "badge": "QUICK REVISION CHECKLIST",
      "title": "Key Takeaways & Formulas to Memorize",
      "bullets": [
        "**Master Concept:** Core takeaway in one definitive sentence",
        "**Governing Invariant:** Essential formula or invariant to remember",
        "**Exam Verification Checklist:** 3 checkpoints to verify before submitting"
      ],
      "calloutTip": "Next Lecture / Homework Problem Preview"
    }
  ]
}

Ensure the deck has between ${Math.max(6, Math.min(15, slideCount))} high-quality slides. Return ONLY the valid JSON object with NO markdown code fences.`;

  const userPrompt = `Generate a master first-principles slide deck for:
Subject: ${subject}
Unit: ${unit}
Topic: ${topicTitle}
Target Audience Pedagogy: ${targetAudience} (Zero-knowledge first principles + Gap analysis on PYQs)
Custom Instructions: ${customInstructions || 'Provide accurate engineering analogies, complete subtopic roadmap, and solve relevant PYQs step-by-step.'}

Candidate Previous Year Questions (Filter strictly for "${topicTitle}"):
${rawPyqSection}

Please generate the complete JSON slide deck now.`;

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
        temperature: 0.2,
        max_tokens: 4500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!deepSeekResponse.ok) {
      const errText = await deepSeekResponse.text();
      let parsedErr = errText;
      try {
        const errJson = JSON.parse(errText);
        parsedErr = errJson.error?.message || errText;
      } catch {
        // ignore
      }

      return res.status(deepSeekResponse.status).json({
        success: false,
        error: `DeepSeek API returned error (${deepSeekResponse.status}): ${parsedErr}`,
      });
    }

    const data = await deepSeekResponse.json();
    const messageContent = data.choices?.[0]?.message?.content;

    if (!messageContent) {
      return res.status(500).json({ success: false, error: 'DeepSeek returned an empty response.' });
    }

    let parsedDeck: any;
    try {
      const cleanJsonStr = messageContent
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      parsedDeck = JSON.parse(cleanJsonStr);
    } catch (parseErr: any) {
      return res.status(500).json({
        success: false,
        error: `Failed to parse DeepSeek response into JSON: ${parseErr?.message}`,
        rawContent: messageContent,
      });
    }

    return res.status(200).json({
      success: true,
      deck: parsedDeck,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Network error communicating with DeepSeek API.',
    });
  }
}
