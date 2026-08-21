import type { VercelRequest, VercelResponse } from '@vercel/node';

export interface PyqItemInput {
  yearExam?: string;
  unitNumber?: string;
  mappedTopic?: string;
  questionText: string;
  marks?: string;
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

  // Format PYQ list if provided
  let formattedPyqs = 'No specific PYQ list provided. Generate high-yield sample university examination questions with step-by-step solutions.';
  if (Array.isArray(pyqList) && pyqList.length > 0) {
    formattedPyqs = pyqList
      .slice(0, 8)
      .map(
        (q: PyqItemInput, i: number) =>
          `[PYQ #${i + 1}] ${q.yearExam ? `(${q.yearExam}) ` : ''}${q.questionText}${q.marks ? ` [${q.marks}]` : ''}`
      )
      .join('\n\n');
  }

  const systemPrompt = `You are a world-class Professor and Master Pedagogical Presentation Designer for Engineering & University students.
Your mission is to generate a comprehensive, highly engaging, visually structured 16:9 presentation slide deck for a specific university syllabus topic.

PEDAGOGICAL PHILOSOPHY:
1. FIRST PRINCIPLES (ZERO-KNOWLEDGE TO MASTERY):
   - Assume the student has ZERO prior knowledge of this specific topic.
   - Start with pure intuition: "Why does this exist? What painful real-world problem does it solve?"
   - Use vivid, unforgettable real-world analogies (e.g. comparing graphs to GPS navigation, entropy to messy rooms, dynamic programming to remembering sub-calculations).
   - Never use unexplained jargon. Every formula or technical term must be unpacked step-by-step.

2. HIGHLY STRUCTURED VISUAL SLIDES:
   - Break down complex concepts into bite-sized, high-retention slides.
   - Use clear headers, bold keywords, numbered step-by-step logic, and high-impact callout boxes.
   - Structure each slide cleanly with bullet points, formulas/code snippets, and takeaway tips.

3. PREVIOUS YEAR QUESTIONS (PYQs) & EXAMINATION DRILLS:
   - For every examination problem / PYQ included, provide a comprehensive STEP-BY-STEP breakdown:
     * Problem Statement
     * Identifying the Core Technique
     * Step-by-Step Mathematical/Algorithmic Trace
     * Common Traps/Mistakes Students Make
     * High-Yield Exam Tip

OUTPUT FORMAT:
You MUST respond with a valid, clean JSON object strictly adhering to this JSON schema:
{
  "deckTitle": "Main Presentation Title",
  "subject": "Subject Name",
  "unit": "Unit/Module Number",
  "topicTitle": "Topic Name",
  "summary": "Brief 2-sentence summary of what this deck covers",
  "estimatedDurationMinutes": 45,
  "slides": [
    {
      "slideNumber": 1,
      "type": "title",
      "badge": "COURSE OVERVIEW",
      "title": "Main Title",
      "subtitle": "Clear Subtitle / Tagline",
      "bullets": ["Key bullet 1", "Key bullet 2"],
      "calloutTip": "Learning objective"
    },
    {
      "slideNumber": 2,
      "type": "first_principles",
      "badge": "CORE INTUITION",
      "title": "Why Does This Exist? (First Principles)",
      "analogy": "Relatable real-world analogy in plain English",
      "bullets": [
        "**The Problem:** Why naive approaches fail...",
        "**The Breakthrough Idea:** How this concept solves it..."
      ],
      "calloutTip": "Mental Model: Remember that..."
    },
    {
      "slideNumber": 3,
      "type": "concept_card",
      "badge": "FUNDAMENTAL THEORY",
      "title": "Core Technical Architecture & Definition",
      "bullets": [
        "**Formal Definition:** ...",
        "**Key Properties:** ...",
        "**Mathematical Formulation / Invariants:** ..."
      ],
      "formulaOrCode": "Key formula or concise pseudocode snippet (clean text)",
      "calloutTip": "Exam Note: Always verify..."
    },
    {
      "slideNumber": 4,
      "type": "two_column",
      "badge": "COMPARATIVE ANALYSIS",
      "title": "Trade-offs & Comparison",
      "leftColumnTitle": "Approach A / Advantages",
      "leftColumnBullets": ["Point 1", "Point 2"],
      "rightColumnTitle": "Approach B / Limitations",
      "rightColumnBullets": ["Point 1", "Point 2"],
      "calloutTip": "Decision Rule: Choose Approach A when..."
    },
    {
      "slideNumber": 5,
      "type": "step_by_step",
      "badge": "STEP-BY-STEP METHOD",
      "title": "Standard Execution Algorithm / Derivation",
      "bullets": [
        "**Step 1: Initialization** - Details...",
        "**Step 2: Iterative Processing** - Details...",
        "**Step 3: Termination & Output** - Details..."
      ],
      "formulaOrCode": "Algorithmic steps or mathematical flow",
      "calloutTip": "Time & Space Complexity analysis"
    },
    {
      "slideNumber": 6,
      "type": "pyq_solution",
      "badge": "SOLVED UNIVERSITY / GATE PYQ",
      "title": "Exam Problem Walkthrough",
      "bullets": [
        "**Given:** Problem parameters...",
        "**Target:** What we need to solve for..."
      ],
      "pyqDetails": {
        "examYear": "GATE / University Exam 2023",
        "marks": "10 Marks",
        "question": "Exact question statement...",
        "stepByStepSolution": [
          "Step 1: Identify base conditions...",
          "Step 2: Apply the governing formula...",
          "Step 3: Final numerical evaluation..."
        ],
        "keyTakeaway": "Key exam strategy for this pattern"
      },
      "calloutTip": "Frequent Trap: Do NOT forget to..."
    },
    {
      "slideNumber": 7,
      "type": "common_mistakes",
      "badge": "PITFALLS & EXAM TRAPS",
      "title": "Common Student Mistakes & How to Avoid Them",
      "bullets": [
        "**Mistake #1:** Confusing X with Y -> **Fix:** Remember that...",
        "**Mistake #2:** Edge cases like null/zero -> **Fix:** Always check...",
        "**Mistake #3:** Forgetting units/boundary limits -> **Fix:** Double check..."
      ],
      "calloutTip": "Scoring Secret: Examiners specifically check for..."
    },
    {
      "slideNumber": 8,
      "type": "summary",
      "badge": "QUICK REVISION CHECKLIST",
      "title": "Lecture Summary & Key Formulas to Remember",
      "bullets": [
        "**Key Concept 1:** Brief takeaway",
        "**Key Concept 2:** Brief takeaway",
        "**Master Formula:** Core equation to memorize"
      ],
      "calloutTip": "Next Lecture Preview or Action Item"
    }
  ]
}

Ensure the deck has between ${Math.max(6, Math.min(15, slideCount))} high-quality slides. Return ONLY the valid JSON object with NO markdown code backticks.`;

  const userPrompt = `Generate a master slide deck for:
Subject: ${subject}
Unit: ${unit}
Topic: ${topicTitle}
Target Audience Pedagogy: ${targetAudience} (Break down from first principles for zero-knowledge beginners)
Custom Instructions: ${customInstructions || 'Make the slides visual, high-yield, and easy to present.'}

Previous Year Questions (PYQs) to incorporate and solve:
${formattedPyqs}

Please generate the complete, comprehensive JSON slide deck now.`;

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
        temperature: 0.4,
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
      // Clean possible markdown code fences if present
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
