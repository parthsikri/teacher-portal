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

  const systemPrompt = `You are a distinguished Engineering Professor and Master Pedagogical Presentation Designer.
Your task is to generate a comprehensive, highly engaging, visually structured 16:9 presentation slide deck for a specific university syllabus topic.

CRITICAL PEDAGOGICAL WORKFLOW (MANDATORY 2-STEP REASONING):

STEP 1: FIRST-PRINCIPLES SUBTOPIC DECONSTRUCTION
- Deconstruct the target topic into an exhaustive, prerequisite-to-mastery list of subtopics needed so that a student with ZERO prior knowledge can understand the subject completely from foundational intuition to technical mastery.
- Sequence: Foundational Problem/Intuition -> Core Mathematical/Architectural Definition -> Mechanics & Execution -> Edge Cases -> Solved Examination Problems.

STEP 2: PYQ GAP ANALYSIS & STRICT TOPIC FILTERING
- Review the provided candidate PYQs (Previous Year Questions) and STRICTLY SELECT ONLY the questions that are directly relevant to "${topicTitle}" (and ${unit}). Ignore all unrelated questions from other syllabus chapters.
- Cross-examine your Step 1 Subtopic list against the selected relevant PYQs.
- If any subtopic, nuance, edge case, or mathematical technique tested in the PYQs was missing from your initial list, AUGMENT your subtopic roadmap to ensure 100% topic and exam coverage. Nothing must be left out!

STEP 3: ACCURATE, MATURE ENGINEERING ANALOGIES (NON-FRUSTRATING)
- Use analogies that are intellectually satisfying, technically accurate, and relatable to university engineering students (e.g. comparing shortest-path algorithms to GPS navigation with dynamic traffic weights, caching in CPUs to an engineer's desk vs a library bookshelf, thermodynamic entropy to information uncertainty and irreversible heat dissipation, dynamic programming to memoized tax calculations).
- NEVER use childish, oversimplified, or cringe analogies that frustrate students. Always explicitly bridge the analogy directly into the mathematical/algorithmic mechanics!

STEP 4: STEP-BY-STEP PYQ SOLVED WALKS
- For every relevant PYQ included in the slides, provide a clean, complete, step-by-step breakdown:
  * Problem Statement & Parameters Given
  * Step-by-Step Mathematical/Algorithmic Execution Trace
  * Common Pitfalls & Traps to Avoid
  * Key Exam Strategy / Marking Tip

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
      "subtopicName": "1. Why [Concept] Exists: The Fundamental Problem",
      "pedagogicalGoal": "Build intuitive motivation before formal definitions",
      "addedFromPyqReview": false
    },
    {
      "subtopicName": "2. Core Architectural Definition & Invariants",
      "pedagogicalGoal": "Establish mathematical formulation and data structures",
      "addedFromPyqReview": false
    },
    {
      "subtopicName": "3. Step-by-Step Execution Algorithm",
      "pedagogicalGoal": "Trace algorithm transitions on sample input",
      "addedFromPyqReview": false
    },
    {
      "subtopicName": "4. Edge Case Handling & Complexity Analysis",
      "pedagogicalGoal": "Unpack performance bounds and tricky constraints from PYQ analysis",
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
      "bullets": ["Roadmap item 1", "Roadmap item 2", "Roadmap item 3"],
      "calloutTip": "Expected Learning Outcome: Master first principles & solve university examination problems."
    },
    {
      "slideNumber": 2,
      "type": "first_principles",
      "badge": "CORE INTUITION",
      "title": "Why Does This Exist? (First Principles)",
      "analogy": "Accurate engineering analogy explaining the 'Why' in plain English",
      "bullets": [
        "**The Naive Flaw:** Why basic approaches break down under real constraints...",
        "**The Core Breakthrough:** How this concept solves the bottleneck..."
      ],
      "calloutTip": "Mental Model: Remember that..."
    },
    {
      "slideNumber": 3,
      "type": "concept_card",
      "badge": "FUNDAMENTAL THEORY",
      "title": "Mathematical Formulation & Definitions",
      "bullets": [
        "**Formal Definition:** Clear technical statement",
        "**Governing Properties:** Key invariants and rules",
        "**Notation & Assumptions:** Essential parameters"
      ],
      "formulaOrCode": "Key formula or concise pseudocode snippet",
      "calloutTip": "Exam Note: Examiners look for correct invariant formulation."
    },
    {
      "slideNumber": 4,
      "type": "two_column",
      "badge": "COMPARATIVE ANALYSIS",
      "title": "Trade-offs & Technical Variations",
      "leftColumnTitle": "Standard Approach / Pros",
      "leftColumnBullets": ["Key property 1", "Key property 2"],
      "rightColumnTitle": "Alternative / Limitations",
      "rightColumnBullets": ["Constraint 1", "Constraint 2"],
      "calloutTip": "Selection Rule: Use standard approach when..."
    },
    {
      "slideNumber": 5,
      "type": "step_by_step",
      "badge": "EXECUTION TRACE",
      "title": "Step-by-Step Algorithm & Procedure",
      "bullets": [
        "**Step 1: Initialization** - Base state setup...",
        "**Step 2: Iterative Relaxation/Update** - Transformation loop...",
        "**Step 3: Convergence & Termination** - Output extraction..."
      ],
      "formulaOrCode": "Algorithmic step trace or recurrence relation",
      "calloutTip": "Time & Space Complexity: Detailed Big-O derivation."
    },
    {
      "slideNumber": 6,
      "type": "pyq_solution",
      "badge": "SOLVED UNIVERSITY / GATE PYQ",
      "title": "Examination Problem Walkthrough",
      "bullets": [
        "**Problem Type:** Standard university examination pattern",
        "**Key Method:** Identified technique to apply"
      ],
      "pyqDetails": {
        "examYear": "GATE / University Exam",
        "marks": "10 Marks",
        "question": "Exact question statement directly related to this topic...",
        "stepByStepSolution": [
          "Step 1: Parse input parameters and state boundary conditions...",
          "Step 2: Apply the governing formula or trace table...",
          "Step 3: Compute final numerical / derived answer with proper units..."
        ],
        "keyTakeaway": "Exam Strategy: Step-by-step marks distribution."
      },
      "calloutTip": "Common Trap: Do NOT make the common mistake of..."
    },
    {
      "slideNumber": 7,
      "type": "common_mistakes",
      "badge": "EXAM PITFALLS & TRAPS",
      "title": "Critical Student Mistakes to Avoid",
      "bullets": [
        "**Mistake 1:** Confusing X with Y -> **Correction:** Remember that...",
        "**Mistake 2:** Missing boundary / negative condition -> **Correction:** Always check...",
        "**Mistake 3:** Incorrect time complexity estimation -> **Correction:** Detail..."
      ],
      "calloutTip": "High-Yield Tip: Top scoring students always verify..."
    },
    {
      "slideNumber": 8,
      "type": "summary",
      "badge": "QUICK REVISION CHECKLIST",
      "title": "Key Takeaways & Formulas to Memorize",
      "bullets": [
        "**Master Concept:** Core takeaway in one sentence",
        "**Master Formula / Pseudocode:** Essential equation to remember",
        "**Exam Checklist:** 3 checkpoints to verify during the test"
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
        temperature: 0.3,
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
