import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';
import { jsPDF } from 'jspdf';
import { StorageService } from './storage';

export interface TopicQuestionGroup {
  topicName: string;
  topicOrderIndex: number;
  questions: DirectPyqRow[];
}

export interface UnitQuestionGroup {
  unitNumber: string;
  unitOrderNumber: number;
  totalQuestions: number;
  topicGroups: TopicQuestionGroup[];
}

export interface DirectPyqRow {
  id: string;
  yearExam: string;
  unitNumber: string;
  mappedTopic: string;
  questionText: string;
  marks?: string;
  solution?: string;
}

export interface PyqItem {
  yearExam?: string;
  unitNumber?: string;
  mappedTopic?: string;
  questionText: string;
  marks?: string;
  solution?: string;
}

export interface AnswerPointersData {
  coreConcept?: string;
  pointers: string[];
  formulaOrResult?: string;
  commonPitfall?: string;
  examYear?: string;
  marks?: string;
}

export interface AiSlide {
  slideNumber: number;
  type: 'title' | 'unit_divider' | 'topic_divider' | 'direct_pyq' | 'blank_workspace' | 'answer_pointers' | 'first_principles' | 'concept_card' | 'two_column' | 'step_by_step' | 'pyq_solution' | 'common_mistakes' | 'summary' | string;
  badge?: string;
  title: string;
  subtitle?: string;
  bullets?: string[];
  analogy?: string;
  formulaOrCode?: string;
  leftColumnTitle?: string;
  leftColumnBullets?: string[];
  rightColumnTitle?: string;
  rightColumnBullets?: string[];
  pyqDetails?: {
    examYear?: string;
    marks?: string;
    question: string;
    stepByStepSolution?: string[];
    keyTakeaway?: string;
  };
  calloutTip?: string;
  // Blank Working Sheets & Separate Answer Pointers
  workspacePage?: number;
  workspaceTotalPages?: number;
  questionReference?: string;
  questionNumber?: number;
  answerPointers?: AnswerPointersData;
}

export interface SubtopicRoadmapItem {
  subtopicName: string;
  pedagogicalGoal: string;
  addedFromPyqReview?: boolean;
}

export interface AiGeneratedDeck {
  deckTitle: string;
  subject: string;
  unit: string;
  topicTitle: string;
  summary?: string;
  estimatedDurationMinutes?: number;
  subtopicRoadmap?: SubtopicRoadmapItem[];
  relevantPyqCount?: number;
  slides: AiSlide[];
  generatedAt?: string;
}

const DEEPSEEK_KEY_STORAGE = 'aew_deepseek_api_key_v1';

export const AiPptService = {
  getStoredApiKey(): string {
    return localStorage.getItem(DEEPSEEK_KEY_STORAGE) || '';
  },

  saveStoredApiKey(key: string): void {
    if (key && key.trim() !== '') {
      localStorage.setItem(DEEPSEEK_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(DEEPSEEK_KEY_STORAGE);
    }
  },

  /**
   * Normalizes any unit string to standard "UNIT 1", "UNIT 2", etc.
   */
  normalizeUnitNumber(raw?: string): string {
    if (!raw || !raw.trim()) return 'UNIT 1';
    const trimmed = raw.trim();
    const match = trimmed.match(/(?:unit|module|mod|u|m)?\s*[-_.:#]?\s*(\d+)/i);
    if (match && match[1]) {
      return `UNIT ${parseInt(match[1], 10)}`;
    }
    if (/^[A-Z0-9\s-]+$/i.test(trimmed) && trimmed.length <= 15) {
      return trimmed.toUpperCase();
    }
    return trimmed;
  },

  /**
   * Extracts integer unit number for natural sorting
   */
  extractUnitNumber(unitStr?: string): number {
    if (!unitStr) return 999;
    const match = unitStr.match(/\d+/);
    return match ? parseInt(match[0], 10) : 999;
  },

  /**
   * Parses Excel / CSV file containing PYQs into structured list
   */
  async parsePyqsFromExcel(file: File): Promise<PyqItem[]> {
    const directRows = await this.parseDirectPyqsFromExcel(file);
    return directRows.map((r) => ({
      questionText: r.questionText,
      yearExam: r.yearExam || undefined,
      unitNumber: r.unitNumber || undefined,
      mappedTopic: r.mappedTopic || undefined,
      marks: r.marks || undefined,
      solution: r.solution || undefined,
    }));
  },

  /**
   * Specifically parses Excel file with headers:
   * "Year & Exam", "Unit Number", "Mapped Topic", "Full Question Text"
   */
  async parseDirectPyqsFromExcel(file: File): Promise<DirectPyqRow[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

          if (!jsonData || jsonData.length === 0) {
            return resolve([]);
          }

          const parsedList: DirectPyqRow[] = [];

          jsonData.forEach((row, idx) => {
            // Flexible fuzzy key finder
            const findVal = (keys: string[]) => {
              for (const k of Object.keys(row)) {
                const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                for (const candidate of keys) {
                  if (cleanK.includes(candidate.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
                    return String(row[k] || '').trim();
                  }
                }
              }
              return '';
            };

            const questionText = findVal([
              'fullquestiontext', 'fullquestion', 'questiontext', 'question',
              'problemstatement', 'problem', 'qtext', 'ques'
            ]);
            const yearExam = findVal([
              'yearexam', 'yearandexam', 'year', 'exam', 'session', 'term', 'gate'
            ]);
            const unitNumberRaw = findVal([
              'unitnumber', 'unitno', 'unitnum', 'unit', 'module', 'mod'
            ]);
            const mappedTopic = findVal([
              'mappedtopic', 'topic', 'concept', 'subtopic', 'chapter', 'syllabus topic'
            ]);
            const marks = findVal(['marks', 'weightage', 'score', 'pts']);
            const solution = findVal(['solution', 'ans', 'answer', 'key', 'explanation']);

            if (questionText && questionText.length > 2) {
              const normalizedUnit = AiPptService.normalizeUnitNumber(unitNumberRaw);
              parsedList.push({
                id: `pyq-row-${idx}-${Date.now()}`,
                questionText,
                yearExam: yearExam || 'Examination PYQ',
                unitNumber: normalizedUnit,
                mappedTopic: mappedTopic || 'General Concept',
                marks: marks || undefined,
                solution: solution || undefined,
              });
            }
          });

          resolve(parsedList);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * Groups questions:
   * 1. By Unit (Unit 1, Unit 2, Unit 3...)
   * 2. Within each unit, combines all questions of each Mapped Topic together.
   * 3. Orders topics in each unit according to the dashboard syllabus order.
   */
  groupAndSortPyqsByUnitAndTopic(
    pyqs: DirectPyqRow[],
    syllabusTopicsOrder: string[] = []
  ): UnitQuestionGroup[] {
    const cleanSyllabusList = syllabusTopicsOrder.map((t) => t.trim().toLowerCase()).filter(Boolean);

    const getTopicRank = (topicName: string): number => {
      const cleanTopic = topicName.trim().toLowerCase();
      if (!cleanTopic) return 9999;

      // Exact match
      const exactIdx = cleanSyllabusList.indexOf(cleanTopic);
      if (exactIdx !== -1) return exactIdx;

      // Substring match
      const subIdx = cleanSyllabusList.findIndex((s) => cleanTopic.includes(s) || s.includes(cleanTopic));
      if (subIdx !== -1) return subIdx;

      return 9999;
    };

    // 1. Group by unit
    const unitMap = new Map<string, DirectPyqRow[]>();
    pyqs.forEach((q) => {
      const unit = q.unitNumber || 'UNIT 1';
      if (!unitMap.has(unit)) unitMap.set(unit, []);
      unitMap.get(unit)!.push(q);
    });

    const unitGroups: UnitQuestionGroup[] = [];

    unitMap.forEach((questionsInUnit, unitName) => {
      // 2. Within unit, group by topic
      const topicMap = new Map<string, DirectPyqRow[]>();
      questionsInUnit.forEach((q) => {
        const topic = q.mappedTopic?.trim() || 'General Concept';
        if (!topicMap.has(topic)) topicMap.set(topic, []);
        topicMap.get(topic)!.push(q);
      });

      const topicGroups: TopicQuestionGroup[] = [];
      topicMap.forEach((questionsInTopic, topicName) => {
        topicGroups.push({
          topicName,
          topicOrderIndex: getTopicRank(topicName),
          questions: questionsInTopic,
        });
      });

      // Sort topic groups by syllabus order, then alphabetically
      topicGroups.sort((a, b) => {
        if (a.topicOrderIndex !== b.topicOrderIndex) {
          return a.topicOrderIndex - b.topicOrderIndex;
        }
        return a.topicName.localeCompare(b.topicName);
      });

      unitGroups.push({
        unitNumber: unitName,
        unitOrderNumber: AiPptService.extractUnitNumber(unitName),
        totalQuestions: questionsInUnit.length,
        topicGroups,
      });
    });

    // Sort units naturally (UNIT 1 < UNIT 2 < UNIT 10)
    unitGroups.sort((a, b) => {
      if (a.unitOrderNumber !== b.unitOrderNumber) {
        return a.unitOrderNumber - b.unitOrderNumber;
      }
      return a.unitNumber.localeCompare(b.unitNumber);
    });

    return unitGroups;
  },

  /**
   * Sorts PYQs: combines all questions of a topic together, and all topics of a unit together.
   */
  sortDirectPyqs(pyqs: DirectPyqRow[], syllabusTopicsOrder: string[] = []): DirectPyqRow[] {
    const unitGroups = this.groupAndSortPyqsByUnitAndTopic(pyqs, syllabusTopicsOrder);
    const flattened: DirectPyqRow[] = [];

    unitGroups.forEach((uGroup) => {
      uGroup.topicGroups.forEach((tGroup) => {
        tGroup.questions.forEach((q) => {
          flattened.push(q);
        });
      });
    });

    return flattened;
  },

  /**
   * Formats raw solution notes or questions into clean, high-yield Answer Pointers
   * (Pointers only, not verbose text, structured with concept, step milestones, and pitfall checks)
   */
  formatSolutionIntoPointers(
    solutionText?: string,
    questionText?: string,
    topicName?: string
  ): AnswerPointersData {
    const cleanSol = solutionText?.replace(/<[^>]*>?/gm, '').trim() || '';
    const cleanQ = questionText?.replace(/<[^>]*>?/gm, '').trim() || '';
    const cleanTopic = topicName || 'General Engineering';

    if (cleanSol) {
      // Split into clean sentence or step pointers
      const rawChunks = cleanSol
        .split(/(?:\r?\n|;|\.\s+(?=[A-Z0-9])|(?:\b(?:Step\s*\d+|[1-9]\.|\([a-z]\))\s*[:.-]?\s*))/i)
        .map((s) => s.trim())
        .filter((s) => s.length > 5);

      const pointerList = (rawChunks.length > 0 ? rawChunks : [cleanSol])
        .slice(0, 5)
        .map((p) => {
          const stripped = p.replace(/^(?:Step\s*\d+[:.-]?|[1-9]\.[:.-]?)\s*/i, '').trim();
          return stripped.charAt(0).toUpperCase() + stripped.slice(1);
        });

      // Extract formula or complexity if available
      let formulaResult: string | undefined;
      const formulaMatch = cleanSol.match(/(?:T\(n\)\s*=[^.\n]+|O\([^)]+\)|Theta\([^)]+\)|Omega\([^)]+\)|[A-Za-z0-9_]+\s*=\s*[^.,;\n]+)/i);
      if (formulaMatch && formulaMatch[0].length < 70) {
        formulaResult = formulaMatch[0].trim();
      }

      const commonPitfall = cleanQ.toLowerCase().includes('recurrence') || cleanSol.toLowerCase().includes('master')
        ? 'Examiner Note: Verify Master Theorem regularity condition f(n) vs n^(log_b a) before concluding.'
        : cleanQ.toLowerCase().includes('list') || cleanQ.toLowerCase().includes('tree')
        ? 'Examiner Note: Don\'t forget pointer reassignment sequence to avoid memory leaks or lost links.'
        : cleanQ.toLowerCase().includes('complexity')
        ? 'Examiner Note: Differentiate worst-case vs average-case tight bounds (Theta vs Big-O).'
        : 'Examiner Note: State initial boundary conditions and justify every step reduction for full marks.';

      return {
        coreConcept: `${cleanTopic}: Core Formulation`,
        pointers: pointerList,
        formulaOrResult: formulaResult || 'Key Invariant / Result Verification Required',
        commonPitfall,
      };
    }

    // Realistic professor lecture board pointers (No AI jargon)
    return {
      coreConcept: `${cleanTopic}: Solution Roadmap`,
      pointers: [
        'State given parameters, constraints, and boundary conditions clearly.',
        'Apply fundamental governing theorem or recurrence relation.',
        'Show intermediate derivation steps or execution trace table.',
        'Compute final symbolic/numerical result and state appropriate units.',
      ],
      formulaOrResult: 'Governing Formula & Dimensional Consistency Verification',
      commonPitfall: 'Examiner Note: Ensure all intermediate derivation steps are explicitly stated to receive step marks.',
    };
  },

  /**
   * Generates concise, human-professor style solution pointers for questions using DeepSeek API.
   * Strips out all AI fluff and conversational filler to produce clean, authentic lecture board notes.
   */
  async fetchDeepSeekAnswerPointers(params: {
    subject: string;
    questions: Array<{
      id?: string | number;
      questionText: string;
      examYear?: string;
      marks?: string;
      topic?: string;
      solution?: string;
    }>;
    apiKey?: string;
  }): Promise<{
    success: boolean;
    pointersMap?: Record<number, AnswerPointersData>;
    error?: string;
    needsApiKey?: boolean;
  }> {
    const activeApiKey = params.apiKey || this.getStoredApiKey();

    // 1. Try internal serverless endpoint
    try {
      const response = await fetch('/api/deepseek-generate-pointers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...StorageService.getAuthHeaders(),
        },
        body: JSON.stringify({
          subject: params.subject,
          questions: params.questions,
          apiKey: activeApiKey || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.pointersMap) {
          return { success: true, pointersMap: data.pointersMap };
        }
      } else if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.needsApiKey) {
          return { success: false, needsApiKey: true, error: errorData.error };
        }
      }
    } catch (apiErr) {
      console.warn('Endpoint /api/deepseek-generate-pointers unavailable, checking direct DeepSeek API...', apiErr);
    }

    // 2. Direct DeepSeek API fallback (if user has API key configured in localStorage / client)
    if (activeApiKey && activeApiKey.trim() !== '') {
      try {
        const trimmedQuestions = params.questions.slice(0, 30);
        const formattedQuestionsList = trimmedQuestions
          .map((q, idx) => `[Q#${idx + 1}] ${q.examYear ? `[${q.examYear}]` : ''} ${q.marks ? `[${q.marks}]` : ''}\nQuestion: ${q.questionText}`)
          .join('\n\n');

        const systemPrompt = `You are a distinguished university engineering professor writing concise board solution pointers and marking roadmap for exam questions in ${params.subject}.
CRITICAL STYLE RULES:
- MUST NOT LOOK LIKE AI: No conversational fluff, no "Certainly!", no "Here is...", no robotic emoji spam.
- Write crisp, authentic professor notes like written on a classroom whiteboard.
- Return ONLY valid JSON: {"results": [{"questionIndex": 0, "coreConcept": "...", "pointers": ["...", "..."], "formulaOrResult": "...", "commonPitfall": "..."}]}`;

        const directRes = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeApiKey.trim()}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Generate concise professor solution pointers for:\n\n${formattedQuestionsList}` },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
          }),
        });

        if (directRes.ok) {
          const directData = await directRes.json();
          const content = directData.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim());
            const list: any[] = Array.isArray(parsed) ? parsed : (parsed.results || parsed.pointers || []);
            const pointersMap: Record<number, AnswerPointersData> = {};
            list.forEach((item, idx) => {
              const qIdx = typeof item.questionIndex === 'number' ? item.questionIndex : idx;
              pointersMap[qIdx] = {
                coreConcept: item.coreConcept || 'Solution Roadmap',
                pointers: Array.isArray(item.pointers) ? item.pointers : ['State given parameters clearly', 'Apply governing theorem', 'Compute final expression'],
                formulaOrResult: item.formulaOrResult,
                commonPitfall: item.commonPitfall,
              };
            });
            return { success: true, pointersMap };
          }
        }
      } catch (directErr: any) {
        return { success: false, error: directErr?.message || 'Direct DeepSeek API call failed.' };
      }
    }

    return {
      success: false,
      needsApiKey: true,
      error: 'DeepSeek API Key is required to generate AI answer pointers.',
    };
  },

  /**
   * Deterministically generates a presentation deck from PYQs
   * Combines all questions of a topic, then all topics of a unit!
   * Supports 2 Blank Workspace pages per question and Separate Answer Pointers slides.
   */
  generateDirectPyqDeck(params: {
    subject: string;
    deckTitle?: string;
    pyqs: DirectPyqRow[];
    syllabusTopicsOrder?: string[];
    includeUnitDividers?: boolean;
    includeTopicDividers?: boolean;
    addBlankPagesPerQuestion?: boolean;
    blankPagesCount?: number;
    generateAnswerPointers?: boolean;
    answersPlacement?: 'after_question' | 'end_of_deck' | 'none';
    deepSeekPointersMap?: Record<number, AnswerPointersData>;
  }): AiGeneratedDeck {
    const {
      subject,
      deckTitle = `${subject} - Previous Year Questions (PYQs)`,
      pyqs,
      syllabusTopicsOrder = [],
      includeUnitDividers = true,
      includeTopicDividers = true,
      addBlankPagesPerQuestion = true,
      blankPagesCount = 2,
      generateAnswerPointers = true,
      answersPlacement = 'after_question',
      deepSeekPointersMap,
    } = params;

    const unitGroups = this.groupAndSortPyqsByUnitAndTopic(pyqs, syllabusTopicsOrder);
    const totalQuestions = pyqs.length;

    const slides: AiSlide[] = [];
    let slideCounter = 1;

    // 1. Title Cover Slide (Clean Executive Academic Design)
    const unitNames = unitGroups.map((u) => u.unitNumber).join(', ');
    slides.push({
      slideNumber: slideCounter++,
      type: 'title',
      badge: 'UNIVERSITY & COMPETITIVE EXAMINATION SERIES',
      title: subject.toUpperCase(),
      subtitle: `Topic-Mapped Previous Year Questions (PYQ Bank) • Comprehensive Solutions`,
      bullets: [
        `Curriculum Scope: ${unitNames || 'Complete Syllabus Units'}`,
        `Problem Set: ${totalQuestions} Curated Examination Questions`,
        `Structure: ${addBlankPagesPerQuestion ? `${blankPagesCount} Blank Working Sheets/Q` : 'Question Slides'} ${generateAnswerPointers ? '• Separate Answer Pointers' : ''}`,
      ],
      calloutTip: `Academic Session • Department of Computer Science & Engineering`,
    });

    // Staging container for end_of_deck answer pointers if selected
    const endDeckAnswerPointers: AiSlide[] = [];

    // 2. Iterate Unit Groups -> Topic Groups -> Questions
    let globalQuestionCounter = 1;

    unitGroups.forEach((uGroup) => {
      // 2a. Unit Transition Divider Slide
      if (includeUnitDividers) {
        const topicsList = uGroup.topicGroups.map(
          (t, idx) => `${String(idx + 1).padStart(2, '0')}. ${t.topicName} (${t.questions.length} ${t.questions.length === 1 ? 'PYQ' : 'PYQs'})`
        );
        slides.push({
          slideNumber: slideCounter++,
          type: 'unit_divider',
          badge: `MODULE / ${uGroup.unitNumber}`,
          title: `${uGroup.unitNumber} — Core Examination Problem Sets`,
          subtitle: `${uGroup.totalQuestions} Questions across ${uGroup.topicGroups.length} Topics • ${subject}`,
          bullets: topicsList,
          calloutTip: `Target: Mid-Term, University End-Term & Technical Examinations`,
        });
      }

      // 2b. Iterate Topic Groups inside this Unit
      uGroup.topicGroups.forEach((tGroup, tIdx) => {
        // Topic Section Divider Slide
        if (includeTopicDividers) {
          const questionExamYears = tGroup.questions.map(
            (q, qNum) => `Problem ${qNum + 1}: ${q.yearExam}${q.marks ? ` [${q.marks}]` : ''}`
          );

          slides.push({
            slideNumber: slideCounter++,
            type: 'topic_divider',
            badge: `${uGroup.unitNumber} ‣ TOPIC ${tIdx + 1}`,
            title: tGroup.topicName,
            subtitle: `Problem Set (${tGroup.questions.length} ${tGroup.questions.length === 1 ? 'Question' : 'Questions'}) • ${subject}`,
            bullets: questionExamYears,
            calloutTip: `Focus: Core Analytical Formulations, Proofs & Working Derivations`,
          });
        }

        // 2c. Question Slides for this Topic
        tGroup.questions.forEach((pyq, qIdxInTopic) => {
          const currentQNum = globalQuestionCounter;
          const currentZeroBasedIdx = globalQuestionCounter - 1;
          const deepSeekItem = deepSeekPointersMap?.[currentZeroBasedIdx];

          const pointersData: AnswerPointersData = deepSeekItem
            ? {
                coreConcept: deepSeekItem.coreConcept,
                pointers: deepSeekItem.pointers,
                formulaOrResult: deepSeekItem.formulaOrResult,
                commonPitfall: deepSeekItem.commonPitfall,
                examYear: pyq.yearExam,
                marks: pyq.marks,
              }
            : this.formatSolutionIntoPointers(pyq.solution, pyq.questionText, tGroup.topicName);

          if (!deepSeekItem) {
            pointersData.examYear = pyq.yearExam;
            pointersData.marks = pyq.marks;
          }

          // (i) PURE QUESTION SLIDE (Answers kept completely separate!)
          slides.push({
            slideNumber: slideCounter++,
            type: 'direct_pyq',
            badge: `${uGroup.unitNumber} • ${tGroup.topicName}`,
            title: `${tGroup.topicName} — Problem ${qIdxInTopic + 1} of ${tGroup.questions.length}`,
            subtitle: pyq.yearExam ? `${pyq.yearExam}${pyq.marks ? ` • Weightage: ${pyq.marks}` : ''}` : undefined,
            questionNumber: currentQNum,
            pyqDetails: {
              examYear: pyq.yearExam,
              marks: pyq.marks,
              question: pyq.questionText,
              // Only attach inline step solution if answer pointers are disabled AND placement is none
              stepByStepSolution: (!generateAnswerPointers && answersPlacement === 'none')
                ? (pyq.solution ? [pyq.solution] : undefined)
                : undefined,
            },
            calloutTip: `${uGroup.unitNumber} • Topic: ${tGroup.topicName} • Problem #${currentQNum}`,
          });

          // (ii) ADD BLANK PAGES PER QUESTION (Default 2 pages for live digital pen derivation)
          if (addBlankPagesPerQuestion) {
            const numPages = Math.max(1, Math.min(5, blankPagesCount || 2));
            for (let page = 1; page <= numPages; page++) {
              slides.push({
                slideNumber: slideCounter++,
                type: 'blank_workspace',
                badge: `${uGroup.unitNumber} • WORKING CANVAS`,
                title: `Problem ${currentQNum} Working Canvas (Sheet ${page} of ${numPages})`,
                subtitle: `${tGroup.topicName}${pyq.yearExam ? ` • ${pyq.yearExam}` : ''}`,
                workspacePage: page,
                workspaceTotalPages: numPages,
                questionNumber: currentQNum,
                questionReference: pyq.questionText,
                calloutTip: `Use digital stylus or whiteboard pen to derive equations and write proofs in class`,
              });
            }
          }

          // (iii) ANSWER POINTERS SLIDE (Pointers only, well formatted, kept separate)
          if (generateAnswerPointers && answersPlacement === 'after_question') {
            slides.push({
              slideNumber: slideCounter++,
              type: 'answer_pointers',
              badge: `${uGroup.unitNumber} • KEY ANSWER POINTERS`,
              title: `Problem ${currentQNum} — Solution Pointers & Concept Roadmap`,
              subtitle: `${tGroup.topicName} • Reference for ${pyq.yearExam || `Problem #${currentQNum}`}${pyq.marks ? ` [${pyq.marks}]` : ''}`,
              questionNumber: currentQNum,
              questionReference: pyq.questionText,
              answerPointers: pointersData,
              calloutTip: `Evaluation Checklist • Core Formulas • Key Intermediate Steps`,
            });
          } else if (generateAnswerPointers && answersPlacement === 'end_of_deck') {
            endDeckAnswerPointers.push({
              slideNumber: 0, // Assigned sequentially later
              type: 'answer_pointers',
              badge: `${uGroup.unitNumber} • KEY ANSWER POINTERS`,
              title: `Problem ${currentQNum} — Solution Pointers & Concept Roadmap`,
              subtitle: `${tGroup.topicName} • Reference for ${pyq.yearExam || `Problem #${currentQNum}`}${pyq.marks ? ` [${pyq.marks}]` : ''}`,
              questionNumber: currentQNum,
              questionReference: pyq.questionText,
              answerPointers: pointersData,
              calloutTip: `Evaluation Checklist • Core Formulas • Key Intermediate Steps`,
            });
          }

          globalQuestionCounter++;
        });
      });
    });

    // If answers are placed at the end of the deck, append section divider and pointer slides
    if (generateAnswerPointers && answersPlacement === 'end_of_deck' && endDeckAnswerPointers.length > 0) {
      slides.push({
        slideNumber: slideCounter++,
        type: 'unit_divider',
        badge: 'PART II: SOLUTIONS APPENDIX',
        title: 'Complete Solution Pointers & Concept Roadmaps',
        subtitle: `Separate Reference Section • ${endDeckAnswerPointers.length} Solved Problem Sets`,
        bullets: [
          'Structured Key Pointers for Faculty Reference & Evaluation Criteria',
          'Core Mathematical & Algorithmic Formulas',
          'Common Student Examination Pitfalls to Highlight in Class',
        ],
        calloutTip: 'Apna Engineering Wallah • Faculty Solution Pointers Directory',
      });

      endDeckAnswerPointers.forEach((pSlide) => {
        pSlide.slideNumber = slideCounter++;
        slides.push(pSlide);
      });
    }

    return {
      deckTitle,
      subject,
      unit: unitNames,
      topicTitle: `${totalQuestions} Exam PYQs`,
      summary: `Comprehensive presentation of ${totalQuestions} previous year questions combined topic-wise and unit-wise with separate answer pointers and live working pages.`,
      relevantPyqCount: totalQuestions,
      slides,
      generatedAt: new Date().toISOString(),
    };
  },

  /**
   * Generates and downloads a pre-formatted Excel template for PYQs
   */
  downloadSamplePyqExcel(subjectName: string = 'Data Structures & Algorithms'): void {
    const sampleRows = [
      {
        'Year & Exam': 'GATE CS 2023',
        'Unit Number': 'UNIT 1',
        'Mapped Topic': 'Asymptotic Notations & Complexity',
        'Full Question Text': 'Find the time complexity of the recurrence relation T(n) = 2T(n/2) + n*log(n) using Master Theorem or recursion tree method.',
        'Marks / Weightage': '8 Marks',
        'Faculty Solution / Notes': 'Using Master Theorem Case 2: a=2, b=2, f(n)=n*log(n). n^(log_b(a)) = n^1 = n. Since f(n) = Theta(n*log(n)), T(n) = Theta(n * (log n)^2).'
      },
      {
        'Year & Exam': 'University End-Term Dec 2022',
        'Unit Number': 'UNIT 1',
        'Mapped Topic': 'Asymptotic Notations & Complexity',
        'Full Question Text': 'Explain the formal mathematical definitions of Big-O, Big-Omega, and Big-Theta notations with suitable asymptotic graphs.',
        'Marks / Weightage': '10 Marks',
        'Faculty Solution / Notes': '1. Big-O (Upper Bound): 0 <= f(n) <= c*g(n) for all n >= n0. 2. Big-Omega (Lower Bound): 0 <= c*g(n) <= f(n). 3. Big-Theta (Tight Bound): c1*g(n) <= f(n) <= c2*g(n).'
      },
      {
        'Year & Exam': 'Mid-Term Exam 2021',
        'Unit Number': 'UNIT 1',
        'Mapped Topic': 'Array Operations & Searching',
        'Full Question Text': 'Write an efficient iterative algorithm for Binary Search in a sorted 1D array. Derive its best-case and worst-case time complexities.',
        'Marks / Weightage': '6 Marks',
        'Faculty Solution / Notes': 'Binary Search reduces search space by half at each step: T(n) = T(n/2) + O(1). Best Case: O(1). Worst Case: O(log n). Auxiliary Space: O(1).'
      },
      {
        'Year & Exam': 'GATE CS 2022',
        'Unit Number': 'UNIT 2',
        'Mapped Topic': 'Singly Linked Lists',
        'Full Question Text': 'Given a singly linked list with head pointer, write an algorithm to reverse the linked list in-place using O(1) extra space.',
        'Marks / Weightage': '8 Marks',
        'Faculty Solution / Notes': 'Use 3 pointers: prev = NULL, curr = head, next = NULL. Loop while curr != NULL: next = curr->next, curr->next = prev, prev = curr, curr = next. Return prev.'
      },
      {
        'Year & Exam': 'End-Term May 2023',
        'Unit Number': 'UNIT 2',
        'Mapped Topic': 'Stack Applications & Infix to Postfix',
        'Full Question Text': 'Convert the given infix expression to postfix using stack operator precedence: (A + B) * (C - D) / E ^ F.',
        'Marks / Weightage': '10 Marks',
        'Faculty Solution / Notes': 'Operator Precedence: ^ > *,/ > +,-. Trace table with stack symbols. Final Postfix Expression: A B + C D - * E F ^ /.'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    
    // Set nice column widths
    worksheet['!cols'] = [
      { wch: 24 }, // Year & Exam
      { wch: 14 }, // Unit Number
      { wch: 32 }, // Mapped Topic
      { wch: 60 }, // Full Question Text
      { wch: 18 }, // Marks
      { wch: 50 }, // Solution
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PYQ_Bank');

    const cleanName = (subjectName || 'Course').replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(workbook, `${cleanName}_PYQ_Template.xlsx`);
  },

  /**
   * Parses raw pasted text into individual PYQ items
   */
  parsePyqsFromText(rawText: string): PyqItem[] {
    if (!rawText || !rawText.trim()) return [];
    
    // Split by question numbers like "1.", "Q1:", "Question 1", or double linebreaks
    const chunks = rawText
      .split(/\n(?=(?:Q\d+[:.]|\d+[.)]|Question\s*\d+[:.]))/i)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);

    if (chunks.length <= 1 && rawText.includes('\n\n')) {
      return rawText
        .split(/\n\s*\n/)
        .map((s) => s.trim())
        .filter((s) => s.length > 5)
        .map((qText, idx) => ({
          questionText: qText,
          yearExam: `PYQ #${idx + 1}`,
        }));
    }

    return chunks.map((qText, idx) => ({
      questionText: qText,
      yearExam: `PYQ #${idx + 1}`,
    }));
  },

  /**
   * Alias for generatePpt (calls DeepSeek LLM)
   */
  async generateDeck(params: {
    subject: string;
    unit: string;
    topicTitle: string;
    subtopics?: string[];
    pedagogyMode?: string;
    slideCount?: number;
    customInstructions?: string;
    pyqs?: PyqItem[];
    pyqList?: PyqItem[];
    apiKey?: string;
    targetAudience?: string;
  }): Promise<{ success: boolean; deck?: AiGeneratedDeck; error?: string; needsApiKey?: boolean }> {
    return this.generatePpt({
      subject: params.subject,
      unit: params.unit,
      topicTitle: params.topicTitle,
      subtopics: params.subtopics,
      pedagogyMode: params.pedagogyMode,
      slideCount: params.slideCount,
      customInstructions: params.customInstructions,
      pyqs: params.pyqs || params.pyqList,
      apiKey: params.apiKey,
    });
  },

  /**
   * Calls DeepSeek LLM to generate pedagogy-driven slides
   */
  async generatePpt(params: {
    subject: string;
    unit: string;
    topicTitle: string;
    subtopics?: string[];
    pedagogyMode?: string;
    slideCount?: number;
    customInstructions?: string;
    pyqs?: PyqItem[];
    apiKey?: string;
  }): Promise<{ success: boolean; deck?: AiGeneratedDeck; error?: string; needsApiKey?: boolean }> {
    const activeApiKey = params.apiKey || this.getStoredApiKey();

    const baseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '5173'
      ? ''
      : '';

    try {
      const response = await fetch(`${baseUrl}/api/deepseek-generate-ppt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...StorageService.getAuthHeaders(),
        },
        body: JSON.stringify({
          ...params,
          apiKey: activeApiKey || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || `Generation failed with status ${response.status}`,
          needsApiKey: data.needsApiKey,
        };
      }

      const deck: AiGeneratedDeck = {
        ...data.deck,
        generatedAt: new Date().toISOString(),
      };

      return {
        success: true,
        deck,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to connect to DeepSeek presentation generator.',
      };
    }
  },

  /**
   * Export Generated Deck to PowerPoint (.pptx) with PPT-safe layout mode (zero overflow)
   */
  async exportToPptx(
    deck: AiGeneratedDeck,
    theme: 'dark_tech' | 'deep_navy' | 'clean_minimal' = 'dark_tech'
  ): Promise<void> {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9'; // 10 x 5.625 inches

    const themeColors = {
      dark_tech: {
        bg: '0B0F19',
        cardBg: '161E2E',
        cardBorder: '2D3748',
        textPrimary: 'F8FAFC',
        textSecondary: '94A3B8',
        accentPrimary: '6366F1', // Indigo
        accentSecondary: '10B981', // Emerald
        badgeBg: '1E1B4B',
        badgeText: 'A5B4FC',
        codeBg: '030712',
      },
      deep_navy: {
        bg: '0F172A',
        cardBg: '1E293B',
        cardBorder: '334155',
        textPrimary: 'FFFFFF',
        textSecondary: 'CBD5E1',
        accentPrimary: '38BDF8', // Sky Blue
        accentSecondary: 'F59E0B', // Amber
        badgeBg: '082F49',
        badgeText: '7DD3FC',
        codeBg: '020617',
      },
      clean_minimal: {
        bg: 'F8FAFC',
        cardBg: 'FFFFFF',
        cardBorder: 'E2E8F0',
        textPrimary: '0F172A',
        textSecondary: '475569',
        accentPrimary: '4F46E5', // Indigo
        accentSecondary: '059669', // Emerald
        badgeBg: 'EEF2FF',
        badgeText: '4338CA',
        codeBg: 'F1F5F9',
      },
    }[theme];

    deck.slides.forEach((slide) => {
      const pptSlide = pptx.addSlide();
      pptSlide.background = { color: themeColors.bg };

      // ── 1. TYPE: TITLE / COVER SLIDE (Executive Academic Style) ───────
      if (slide.type === 'title') {
        // Top Series Badge Pill
        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: 0.75,
          w: 8.4,
          h: 0.38,
          fill: { color: themeColors.badgeBg },
          line: { color: themeColors.accentPrimary, width: 1 },
          rectRadius: 0.08,
        });

        pptSlide.addText(slide.badge || 'UNIVERSITY & COMPETITIVE EXAMINATION SERIES', {
          x: 0.8,
          y: 0.75,
          w: 8.4,
          h: 0.38,
          fontSize: 10,
          bold: true,
          color: themeColors.badgeText,
          align: 'center',
          fontFace: 'Arial',
        });

        // Subject Title
        pptSlide.addText(deck.subject || slide.title, {
          x: 0.8,
          y: 1.3,
          w: 8.4,
          h: 0.9,
          fontSize: 26,
          bold: true,
          color: themeColors.textPrimary,
          align: 'center',
          fontFace: 'Arial',
        });

        // Decorative Accent Line
        pptSlide.addShape(pptx.ShapeType.line, {
          x: 2.5,
          y: 2.3,
          w: 5.0,
          h: 0.0,
          line: { color: themeColors.accentPrimary, width: 2 },
        });

        // Subtitle
        pptSlide.addText(slide.subtitle || 'Previous Year Questions (PYQ Bank) • Topic-Mapped Solutions', {
          x: 0.8,
          y: 2.45,
          w: 8.4,
          h: 0.45,
          fontSize: 12,
          italic: true,
          color: themeColors.textSecondary,
          align: 'center',
          fontFace: 'Arial',
        });

        // 3 Info Cards
        const cardW = 2.6;
        const cardH = 1.1;
        const cardGap = 0.3;
        const startX = 0.8;
        const cardY = 3.15;

        const infoItems = [
          { label: 'CURRICULUM MODULES', val: deck.unit || 'All Units', col: themeColors.accentPrimary },
          { label: 'PROBLEM SET SIZE', val: `${deck.relevantPyqCount || 0} Examination PYQs`, col: themeColors.accentSecondary },
          { label: 'SYLLABUS MAPPING', val: 'Unit & Topic Sequence', col: themeColors.badgeText },
        ];

        infoItems.forEach((info, idx) => {
          const cx = startX + idx * (cardW + cardGap);
          pptSlide.addShape(pptx.ShapeType.roundRect, {
            x: cx,
            y: cardY,
            w: cardW,
            h: cardH,
            fill: { color: themeColors.cardBg },
            line: { color: themeColors.cardBorder, width: 1 },
            rectRadius: 0.1,
          });

          pptSlide.addText(info.label, {
            x: cx,
            y: cardY + 0.15,
            w: cardW,
            h: 0.25,
            fontSize: 8,
            bold: true,
            color: info.col,
            align: 'center',
            fontFace: 'Arial',
          });

          pptSlide.addText(info.val, {
            x: cx + 0.1,
            y: cardY + 0.45,
            w: cardW - 0.2,
            h: 0.5,
            fontSize: 11,
            bold: true,
            color: themeColors.textPrimary,
            align: 'center',
            fontFace: 'Arial',
          });
        });

        // Bottom Footer
        pptSlide.addText('Apna Engineering Wallah • Faculty Lecture & Problem Repository', {
          x: 0.8,
          y: 4.85,
          w: 8.4,
          h: 0.3,
          fontSize: 9,
          color: themeColors.textSecondary,
          align: 'center',
          fontFace: 'Arial',
        });
        return;
      }

      // Top Breadcrumb Bar for Slides 2..N
      if (slide.badge || deck.subject) {
        pptSlide.addText(
          `${(slide.badge || 'CONCEPT').toUpperCase()}  •  ${deck.subject} (${deck.unit})`,
          {
            x: 0.8,
            y: 0.4,
            w: 7.2,
            h: 0.3,
            fontSize: 10,
            bold: true,
            color: themeColors.accentPrimary,
            fontFace: 'Arial',
          }
        );
      }

      // Slide Title
      pptSlide.addText(slide.title, {
        x: 0.8,
        y: 0.75,
        w: 8.4,
        h: 0.6,
        fontSize: 20,
        bold: true,
        color: themeColors.textPrimary,
        fontFace: 'Arial',
      });

      // Subtitle if available
      if (slide.subtitle) {
        pptSlide.addText(slide.subtitle, {
          x: 0.8,
          y: 1.35,
          w: 8.4,
          h: 0.35,
          fontSize: 12,
          italic: true,
          color: themeColors.textSecondary,
          fontFace: 'Arial',
        });
      }

      const contentStartY = slide.subtitle ? 1.75 : 1.45;

      // ── 2. TYPE: UNIT DIVIDER ─────────────────────────────────────────
      if (slide.type === 'unit_divider') {
        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: contentStartY,
          w: 8.4,
          h: 3.1,
          fill: { color: themeColors.cardBg },
          line: { color: themeColors.accentPrimary, width: 1.5 },
          rectRadius: 0.12,
        });

        pptSlide.addText('Syllabus Topics & Examination Questions in this Unit:', {
          x: 1.1,
          y: contentStartY + 0.2,
          w: 7.8,
          h: 0.3,
          fontSize: 11,
          bold: true,
          color: themeColors.accentPrimary,
          fontFace: 'Arial',
        });

        if (slide.bullets && slide.bullets.length > 0) {
          const half = Math.ceil(slide.bullets.length / 2);
          const col1 = slide.bullets.slice(0, half).join('\n\n');
          const col2 = slide.bullets.slice(half).join('\n\n');

          pptSlide.addText(col1, {
            x: 1.1,
            y: contentStartY + 0.55,
            w: 3.8,
            h: 2.3,
            fontSize: 11,
            color: themeColors.textPrimary,
            fontFace: 'Arial',
            lineSpacing: 16,
          });

          if (col2) {
            pptSlide.addText(col2, {
              x: 5.1,
              y: contentStartY + 0.55,
              w: 3.8,
              h: 2.3,
              fontSize: 11,
              color: themeColors.textPrimary,
              fontFace: 'Arial',
              lineSpacing: 16,
            });
          }
        }
      }

      // ── 3. TYPE: TOPIC DIVIDER ─────────────────────────────────────────
      else if (slide.type === 'topic_divider') {
        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: contentStartY,
          w: 8.4,
          h: 3.1,
          fill: { color: themeColors.cardBg },
          line: { color: themeColors.accentSecondary, width: 1.5 },
          rectRadius: 0.12,
        });

        pptSlide.addText('Problem Sets Included in this Topic Series:', {
          x: 1.1,
          y: contentStartY + 0.2,
          w: 7.8,
          h: 0.3,
          fontSize: 11,
          bold: true,
          color: themeColors.accentSecondary,
          fontFace: 'Arial',
        });

        if (slide.bullets && slide.bullets.length > 0) {
          const qList = slide.bullets.join('\n\n');
          pptSlide.addText(qList, {
            x: 1.1,
            y: contentStartY + 0.55,
            w: 7.8,
            h: 2.3,
            fontSize: 11,
            color: themeColors.textPrimary,
            fontFace: 'Arial',
            lineSpacing: 16,
          });
        }
      }

      // ── 4. TYPE: DIRECT PYQ (EXCEL PYQ) ───────────────────────────────
      else if (slide.type === 'direct_pyq' && slide.pyqDetails) {
        const hasInlineSolution = slide.pyqDetails.stepByStepSolution && slide.pyqDetails.stepByStepSolution.length > 0;
        const qBoxHeight = hasInlineSolution ? 2.0 : 3.25;

        // Question Problem Box (Top Container)
        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: contentStartY,
          w: 8.4,
          h: qBoxHeight,
          fill: { color: themeColors.cardBg },
          line: { color: themeColors.cardBorder, width: 1.5 },
          rectRadius: 0.1,
        });

        // Exam Year & Tag pill inside card
        if (slide.pyqDetails.examYear) {
          pptSlide.addText(
            `📝 ${slide.pyqDetails.examYear}${slide.pyqDetails.marks ? ` [${slide.pyqDetails.marks}]` : ''}`,
            {
              x: 1.0,
              y: contentStartY + 0.12,
              w: 8.0,
              h: 0.3,
              fontSize: 11,
              bold: true,
              color: themeColors.accentSecondary,
              fontFace: 'Arial',
            }
          );
        }

        // Full Question Statement
        pptSlide.addText(slide.pyqDetails.question, {
          x: 1.0,
          y: contentStartY + (slide.pyqDetails.examYear ? 0.45 : 0.2),
          w: 8.0,
          h: hasInlineSolution ? 1.45 : 2.65,
          fontSize: hasInlineSolution ? 13 : 15,
          bold: true,
          color: themeColors.textPrimary,
          fontFace: 'Arial',
          lineSpacing: hasInlineSolution ? 18 : 22,
        });

        // Solution & Derivation Workspace (Bottom Box) - only if inline solution exists
        if (hasInlineSolution) {
          pptSlide.addShape(pptx.ShapeType.roundRect, {
            x: 0.8,
            y: contentStartY + 2.15,
            w: 8.4,
            h: 1.05,
            fill: { color: themeColors.codeBg },
            line: { color: themeColors.accentPrimary, width: 1 },
            rectRadius: 0.08,
          });

          const solText = slide.pyqDetails.stepByStepSolution!.join('\n');

          pptSlide.addText(`💡 Faculty Notes & Solution Derivation:\n${solText}`, {
            x: 1.0,
            y: contentStartY + 2.22,
            w: 8.0,
            h: 0.9,
            fontSize: 10,
            color: themeColors.textSecondary,
            fontFace: 'Arial',
            lineSpacing: 15,
          });
        }
      }

      // ── 4b. TYPE: BLANK WORKSPACE / LIVE SOLVING SHEET ─────────────────
      else if (slide.type === 'blank_workspace') {
        // Top Whiteboard Header Banner
        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: contentStartY,
          w: 8.4,
          h: 0.55,
          fill: { color: themeColors.cardBg },
          line: { color: themeColors.accentSecondary, width: 1.2 },
          rectRadius: 0.08,
        });

        pptSlide.addText(
          `✍️ Live Working Canvas (Sheet ${slide.workspacePage || 1} of ${slide.workspaceTotalPages || 2}) • ${slide.subtitle || 'Faculty Derivation'}`,
          {
            x: 1.0,
            y: contentStartY + 0.1,
            w: 8.0,
            h: 0.35,
            fontSize: 12,
            bold: true,
            color: themeColors.accentSecondary,
            fontFace: 'Arial',
          }
        );

        // Large Open Writing Canvas
        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: contentStartY + 0.65,
          w: 8.4,
          h: 2.65,
          fill: { color: themeColors.bg },
          line: { color: themeColors.cardBorder, width: 1.5, dashType: 'dash' },
          rectRadius: 0.1,
        });

        // Question preview snippet at the top of workspace
        if (slide.questionReference) {
          const previewText = slide.questionReference.length > 140 
            ? `${slide.questionReference.slice(0, 140)}…` 
            : slide.questionReference;
          pptSlide.addText(`Problem Statement: ${previewText}`, {
            x: 1.0,
            y: contentStartY + 0.75,
            w: 8.0,
            h: 0.45,
            fontSize: 10,
            italic: true,
            color: themeColors.textSecondary,
            fontFace: 'Arial',
          });
        }

        // Center Guide Note
        pptSlide.addText(
          `[ DIGITAL WHITEBOARD / LIVE STYLUS DERIVATION WORKSPACE ]\nFaculty members can write step-by-step mathematical proofs, draw diagrams, and trace algorithm states here.`,
          {
            x: 1.2,
            y: contentStartY + 1.55,
            w: 7.6,
            h: 0.8,
            fontSize: 10,
            color: themeColors.cardBorder,
            align: 'center',
            fontFace: 'Arial',
          }
        );
      }

      // ── 4c. TYPE: ANSWER POINTERS (KEPT SEPARATE, NOT ANSWERS JUST POINTERS) ──
      else if (slide.type === 'answer_pointers' && slide.answerPointers) {
        const pointers = slide.answerPointers;

        // Top Concept Headline Card
        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: contentStartY,
          w: 8.4,
          h: 0.5,
          fill: { color: themeColors.badgeBg },
          line: { color: themeColors.accentPrimary, width: 1 },
          rectRadius: 0.08,
        });

        pptSlide.addText(
          `${pointers.coreConcept || 'Solution Roadmap & Key Pointers'}`,
          {
            x: 1.0,
            y: contentStartY + 0.08,
            w: 8.0,
            h: 0.35,
            fontSize: 12,
            bold: true,
            color: themeColors.badgeText,
            fontFace: 'Arial',
          }
        );

        // Left Container: Step Pointers (Width: 5.2, Height: 2.65)
        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: contentStartY + 0.6,
          w: 5.2,
          h: 2.65,
          fill: { color: themeColors.cardBg },
          line: { color: themeColors.cardBorder, width: 1.2 },
          rectRadius: 0.1,
        });

        pptSlide.addText('Solving Milestones & Derivation Steps:', {
          x: 1.0,
          y: contentStartY + 0.72,
          w: 4.8,
          h: 0.28,
          fontSize: 11,
          bold: true,
          color: themeColors.accentSecondary,
          fontFace: 'Arial',
        });

        const pointerBullets = pointers.pointers.map((p, idx) => `${idx + 1}. ${p}`).join('\n\n');
        pptSlide.addText(pointerBullets, {
          x: 1.0,
          y: contentStartY + 1.05,
          w: 4.8,
          h: 2.1,
          fontSize: 11,
          color: themeColors.textPrimary,
          fontFace: 'Arial',
          lineSpacing: 16,
        });

        // Right Container: Formula & Examination Pitfall (Width: 3.05, Height: 2.65)
        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 6.15,
          y: contentStartY + 0.6,
          w: 3.05,
          h: 2.65,
          fill: { color: themeColors.cardBg },
          line: { color: themeColors.cardBorder, width: 1.2 },
          rectRadius: 0.1,
        });

        // Top right: Formula / Target Check
        pptSlide.addText('Governing Formula / Result Check:', {
          x: 6.3,
          y: contentStartY + 0.72,
          w: 2.75,
          h: 0.25,
          fontSize: 10,
          bold: true,
          color: themeColors.accentPrimary,
          fontFace: 'Arial',
        });

        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 6.3,
          y: contentStartY + 1.0,
          w: 2.75,
          h: 0.65,
          fill: { color: themeColors.codeBg },
          line: { color: themeColors.accentPrimary, width: 1 },
          rectRadius: 0.06,
        });

        pptSlide.addText(pointers.formulaOrResult || 'Verification Check Required', {
          x: 6.4,
          y: contentStartY + 1.05,
          w: 2.55,
          h: 0.55,
          fontSize: 10,
          bold: true,
          color: themeColors.textPrimary,
          fontFace: 'Courier New',
        });

        // Bottom right: Examination Trap / Pitfall
        pptSlide.addText("Examiner's Note & Grading Check:", {
          x: 6.3,
          y: contentStartY + 1.75,
          w: 2.75,
          h: 0.25,
          fontSize: 10,
          bold: true,
          color: 'F59E0B',
          fontFace: 'Arial',
        });

        pptSlide.addText(
          pointers.commonPitfall || 'State initial assumptions and justify intermediate transitions to receive full step credit.',
          {
            x: 6.3,
            y: contentStartY + 2.05,
            w: 2.75,
            h: 1.1,
            fontSize: 10,
            color: themeColors.textSecondary,
            fontFace: 'Arial',
            lineSpacing: 14,
          }
        );
      }

      // ── 5. TYPE: FIRST PRINCIPLES / ANALOGY ─────────────────────────────
      else if (slide.type === 'first_principles' && slide.analogy) {
        // Analogy Box
        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: contentStartY,
          w: 8.4,
          h: 1.1,
          fill: { color: themeColors.badgeBg },
          line: { color: themeColors.accentPrimary, width: 1 },
          rectRadius: 0.1,
        });

        pptSlide.addText(`💡 Real-World Analogy (Intuition):\n${slide.analogy}`, {
          x: 1.0,
          y: contentStartY + 0.1,
          w: 8.0,
          h: 0.9,
          fontSize: 11,
          bold: false,
          color: themeColors.textPrimary,
          fontFace: 'Arial',
        });

        // Bullets underneath
        if (slide.bullets && slide.bullets.length > 0) {
          const bulletText = slide.bullets.map((b) => `• ${b.replace(/\*\*/g, '')}`).join('\n\n');
          pptSlide.addText(bulletText, {
            x: 0.8,
            y: contentStartY + 1.25,
            w: 8.4,
            h: 2.0,
            fontSize: 12,
            color: themeColors.textSecondary,
            fontFace: 'Arial',
            lineSpacing: 18,
          });
        }
      }

      // ── 6. TYPE: TWO COLUMN COMPARISON ─────────────────────────────────
      else if (slide.type === 'two_column') {
        // Left Column Box
        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: contentStartY,
          w: 4.05,
          h: 3.1,
          fill: { color: themeColors.cardBg },
          line: { color: themeColors.cardBorder, width: 1 },
          rectRadius: 0.1,
        });

        pptSlide.addText(slide.leftColumnTitle || 'Approach A', {
          x: 1.0,
          y: contentStartY + 0.15,
          w: 3.65,
          h: 0.35,
          fontSize: 13,
          bold: true,
          color: themeColors.accentPrimary,
          fontFace: 'Arial',
        });

        if (slide.leftColumnBullets) {
          pptSlide.addText(slide.leftColumnBullets.map((b) => `• ${b.replace(/\*\*/g, '')}`).join('\n\n'), {
            x: 1.0,
            y: contentStartY + 0.55,
            w: 3.65,
            h: 2.4,
            fontSize: 11,
            color: themeColors.textSecondary,
            fontFace: 'Arial',
            lineSpacing: 16,
          });
        }

        // Right Column Box
        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 5.15,
          y: contentStartY,
          w: 4.05,
          h: 3.1,
          fill: { color: themeColors.cardBg },
          line: { color: themeColors.cardBorder, width: 1 },
          rectRadius: 0.1,
        });

        pptSlide.addText(slide.rightColumnTitle || 'Approach B', {
          x: 5.35,
          y: contentStartY + 0.15,
          w: 3.65,
          h: 0.35,
          fontSize: 13,
          bold: true,
          color: themeColors.accentSecondary,
          fontFace: 'Arial',
        });

        if (slide.rightColumnBullets) {
          pptSlide.addText(slide.rightColumnBullets.map((b) => `• ${b.replace(/\*\*/g, '')}`).join('\n\n'), {
            x: 5.35,
            y: contentStartY + 0.55,
            w: 3.65,
            h: 2.4,
            fontSize: 11,
            color: themeColors.textSecondary,
            fontFace: 'Arial',
            lineSpacing: 16,
          });
        }
      }

      // ── 7. DEFAULT / CONCEPT / STEP-BY-STEP ────────────────────────────
      else {
        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: contentStartY,
          w: 8.4,
          h: slide.formulaOrCode ? 2.0 : 3.1,
          fill: { color: themeColors.cardBg },
          line: { color: themeColors.cardBorder, width: 1 },
          rectRadius: 0.1,
        });

        if (slide.bullets && slide.bullets.length > 0) {
          const bulletLines = slide.bullets.map((b) => `• ${b.replace(/\*\*/g, '')}`).join('\n\n');
          pptSlide.addText(bulletLines, {
            x: 1.0,
            y: contentStartY + 0.15,
            w: 8.0,
            h: slide.formulaOrCode ? 1.7 : 2.8,
            fontSize: 12,
            color: themeColors.textPrimary,
            fontFace: 'Arial',
            lineSpacing: 18,
          });
        }

        if (slide.formulaOrCode) {
          pptSlide.addShape(pptx.ShapeType.roundRect, {
            x: 0.8,
            y: contentStartY + 2.15,
            w: 8.4,
            h: 1.0,
            fill: { color: themeColors.codeBg },
            line: { color: themeColors.accentPrimary, width: 1 },
            rectRadius: 0.08,
          });

          pptSlide.addText(slide.formulaOrCode, {
            x: 1.0,
            y: contentStartY + 2.25,
            w: 8.0,
            h: 0.8,
            fontSize: 11,
            fontFace: 'Courier New',
            color: themeColors.accentSecondary,
          });
        }
      }

      // Bottom Callout / Exam Tip
      if (slide.calloutTip) {
        pptSlide.addText(`⚡ ${slide.calloutTip}`, {
          x: 0.8,
          y: 4.95,
          w: 8.4,
          h: 0.35,
          fontSize: 10,
          bold: true,
          color: themeColors.accentSecondary,
          fontFace: 'Arial',
        });
      }

      // Footer: Slide Number
      pptSlide.addText(`${slide.slideNumber} / ${deck.slides.length}`, {
        x: 8.5,
        y: 5.25,
        w: 1.0,
        h: 0.25,
        fontSize: 9,
        color: themeColors.textSecondary,
        align: 'right',
        fontFace: 'Arial',
      });
    });

    const safeFileName = `${deck.topicTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_Deck.pptx`;
    await pptx.writeFile({ fileName: safeFileName });
  },

  /**
   * Export Generated Deck to PDF (.pdf)
   */
  async exportToPdf(
    deck: AiGeneratedDeck,
    theme: 'dark_tech' | 'deep_navy' | 'clean_minimal' = 'dark_tech'
  ): Promise<void> {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [297, 210], // A4 Landscape
    });

    const isDark = theme !== 'clean_minimal';
    const bgRGB = isDark ? [15, 23, 42] : [248, 250, 252];
    const textPrimaryRGB = isDark ? [248, 250, 252] : [15, 23, 42];
    const textSecondaryRGB = isDark ? [148, 163, 184] : [71, 85, 105];
    const cardBgRGB = isDark ? [30, 41, 59] : [255, 255, 255];
    const accentRGB = [99, 102, 241];

    deck.slides.forEach((slide, idx) => {
      if (idx > 0) doc.addPage();

      // Background
      doc.setFillColor(bgRGB[0], bgRGB[1], bgRGB[2]);
      doc.rect(0, 0, 297, 210, 'F');

      // ── 1. TITLE / COVER SLIDE ───────────────────────────────────────
      if (slide.type === 'title') {
        doc.setFillColor(accentRGB[0], accentRGB[1], accentRGB[2]);
        doc.roundedRect(20, 25, 257, 10, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(slide.badge || 'UNIVERSITY & COMPETITIVE EXAMINATION SERIES', 148.5, 31.5, { align: 'center' });

        doc.setTextColor(textPrimaryRGB[0], textPrimaryRGB[1], textPrimaryRGB[2]);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text(deck.subject || slide.title, 148.5, 55, { align: 'center' });

        doc.setTextColor(textSecondaryRGB[0], textSecondaryRGB[1], textSecondaryRGB[2]);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'italic');
        doc.text(slide.subtitle || 'Topic-Mapped Solved Previous Year Questions Bank', 148.5, 68, { align: 'center' });

        // Info cards
        const cardW = 75;
        const cardH = 35;
        const startX = 20;
        const gap = 16;
        const cardY = 90;

        const infoItems = [
          { label: 'CURRICULUM MODULES', val: deck.unit || 'All Units' },
          { label: 'PROBLEM SET SIZE', val: `${deck.relevantPyqCount || 0} Examination PYQs` },
          { label: 'SYLLABUS MAPPING', val: 'Unit & Topic Sequence' },
        ];

        infoItems.forEach((info, cIdx) => {
          const cx = startX + cIdx * (cardW + gap);
          doc.setFillColor(cardBgRGB[0], cardBgRGB[1], cardBgRGB[2]);
          doc.roundedRect(cx, cardY, cardW, cardH, 3, 3, 'F');

          doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text(info.label, cx + cardW / 2, cardY + 12, { align: 'center' });

          doc.setTextColor(textPrimaryRGB[0], textPrimaryRGB[1], textPrimaryRGB[2]);
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(info.val, cx + cardW / 2, cardY + 24, { align: 'center' });
        });

        doc.setTextColor(textSecondaryRGB[0], textSecondaryRGB[1], textSecondaryRGB[2]);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Apna Engineering Wallah • Faculty Lecture & Problem Repository', 148.5, 185, { align: 'center' });
        return;
      }

      // Header Badge for Slides 2..N
      doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${(slide.badge || 'CONCEPT').toUpperCase()}  •  ${deck.subject} (${deck.unit})`, 20, 18);

      // Title
      doc.setTextColor(textPrimaryRGB[0], textPrimaryRGB[1], textPrimaryRGB[2]);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(slide.title, 20, 28);

      // Subtitle
      if (slide.subtitle) {
        doc.setTextColor(textSecondaryRGB[0], textSecondaryRGB[1], textSecondaryRGB[2]);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'italic');
        doc.text(slide.subtitle, 20, 36);
      }

      const contentY = slide.subtitle ? 44 : 36;

      // Card Box
      doc.setFillColor(cardBgRGB[0], cardBgRGB[1], cardBgRGB[2]);
      doc.roundedRect(20, contentY, 257, 140, 3, 3, 'F');

      let currentY = contentY + 12;

      // ── 2. BLANK WORKSPACE / DERIVATION SHEET ───────────────────────
      if (slide.type === 'blank_workspace') {
        doc.setTextColor(16, 185, 129); // Emerald
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`✍️ Live Working Canvas (Sheet ${slide.workspacePage || 1} of ${slide.workspaceTotalPages || 2}):`, 26, currentY);
        currentY += 7;

        if (slide.questionReference) {
          doc.setTextColor(textSecondaryRGB[0], textSecondaryRGB[1], textSecondaryRGB[2]);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'italic');
          const previewText = slide.questionReference.length > 140 ? `${slide.questionReference.slice(0, 140)}…` : slide.questionReference;
          const splitQRef = doc.splitTextToSize(`Problem Statement: ${previewText}`, 245);
          doc.text(splitQRef, 26, currentY);
          currentY += splitQRef.length * 5 + 4;
        }

        // Dashed writing area
        doc.setDrawColor(textSecondaryRGB[0], textSecondaryRGB[1], textSecondaryRGB[2]);
        doc.setLineDashPattern([2, 2], 0);
        doc.roundedRect(26, currentY, 245, 95, 2, 2, 'S');
        doc.setLineDashPattern([], 0); // reset

        doc.setTextColor(textSecondaryRGB[0], textSecondaryRGB[1], textSecondaryRGB[2]);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('[ Digital Whiteboard / Tablet Stylus Derivation Space ]', 148.5, currentY + 45, { align: 'center' });
      }

      // ── 3. ANSWER POINTERS (KEPT SEPARATE) ───────────────────────────
      else if (slide.type === 'answer_pointers' && slide.answerPointers) {
        const pointers = slide.answerPointers;
        doc.setTextColor(99, 102, 241); // Indigo
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`${pointers.coreConcept || 'Solution Roadmap & Key Pointers'}:`, 26, currentY);
        currentY += 8;

        // Pointers list
        doc.setTextColor(textPrimaryRGB[0], textPrimaryRGB[1], textPrimaryRGB[2]);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        pointers.pointers.forEach((p, pIdx) => {
          const splitP = doc.splitTextToSize(`${pIdx + 1}. ${p}`, 245);
          doc.text(splitP, 26, currentY);
          currentY += splitP.length * 5.5 + 2;
        });

        currentY += 4;

        // Formula / Result check
        if (pointers.formulaOrResult) {
          doc.setTextColor(16, 185, 129);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text(`Governing Formula / Result: ${pointers.formulaOrResult}`, 26, currentY);
          currentY += 7;
        }

        // Pitfall
        if (pointers.commonPitfall) {
          doc.setTextColor(245, 158, 11); // Amber
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          const splitPitfall = doc.splitTextToSize(`Examiner's Note: ${pointers.commonPitfall}`, 245);
          doc.text(splitPitfall, 26, currentY);
          currentY += splitPitfall.length * 5 + 2;
        }
      }

      // ── 4. PYQ Question (Question Only or with Solution) ─────────────
      else if (slide.pyqDetails) {
        doc.setTextColor(16, 185, 129); // Emerald
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`📝 ${slide.pyqDetails.examYear || 'Exam PYQ'}${slide.pyqDetails.marks ? ` [${slide.pyqDetails.marks}]` : ''}:`, 26, currentY);
        currentY += 6;

        doc.setTextColor(textPrimaryRGB[0], textPrimaryRGB[1], textPrimaryRGB[2]);
        doc.setFont('helvetica', 'bold');
        const splitQ = doc.splitTextToSize(slide.pyqDetails.question, 245);
        doc.text(splitQ, 26, currentY);
        currentY += splitQ.length * 6 + 6;

        if (slide.pyqDetails.stepByStepSolution) {
          doc.setTextColor(textSecondaryRGB[0], textSecondaryRGB[1], textSecondaryRGB[2]);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          slide.pyqDetails.stepByStepSolution.forEach((step, sIdx) => {
            const splitStep = doc.splitTextToSize(`Step ${sIdx + 1}: ${step.replace(/\*\*/g, '')}`, 245);
            doc.text(splitStep, 26, currentY);
            currentY += splitStep.length * 5.5 + 2;
          });
        }
      }

      // Bullets (e.g. for Unit & Topic dividers)
      else if (slide.bullets && slide.bullets.length > 0) {
        doc.setTextColor(textPrimaryRGB[0], textPrimaryRGB[1], textPrimaryRGB[2]);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');

        slide.bullets.forEach((b) => {
          const cleanB = `• ${b.replace(/\*\*/g, '')}`;
          const splitB = doc.splitTextToSize(cleanB, 245);
          doc.text(splitB, 26, currentY);
          currentY += splitB.length * 6 + 3;
        });
      }

      // Callout Tip
      if (slide.calloutTip) {
        doc.setTextColor(245, 158, 11); // Amber
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`⚡ ${slide.calloutTip}`, 20, 192);
      }

      // Slide Number
      doc.setTextColor(textSecondaryRGB[0], textSecondaryRGB[1], textSecondaryRGB[2]);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`${slide.slideNumber} / ${deck.slides.length}`, 275, 195, { align: 'right' });
    });

    const safeFileName = `${deck.topicTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_Deck.pdf`;
    doc.save(safeFileName);
  },

  /**
   * Export only Answer Pointers slides as a separate PowerPoint presentation
   */
  async exportAnswerPointersOnlyPptx(
    deck: AiGeneratedDeck,
    theme: 'dark_tech' | 'deep_navy' | 'clean_minimal' = 'dark_tech'
  ): Promise<void> {
    const answerSlides = deck.slides.filter(
      (s) => s.type === 'title' || s.type === 'unit_divider' || s.type === 'answer_pointers'
    );
    const answersOnlyDeck: AiGeneratedDeck = {
      ...deck,
      deckTitle: `${deck.deckTitle} - Answer Pointers Guide`,
      topicTitle: `${deck.topicTitle} - Answer Pointers`,
      slides: answerSlides.map((s, idx) => ({ ...s, slideNumber: idx + 1 })),
    };
    await this.exportToPptx(answersOnlyDeck, theme);
  },

  /**
   * Export only Questions and Blank Workspace slides (without answers)
   */
  async exportQuestionsAndBlanksOnlyPptx(
    deck: AiGeneratedDeck,
    theme: 'dark_tech' | 'deep_navy' | 'clean_minimal' = 'dark_tech'
  ): Promise<void> {
    const questionsSlides = deck.slides.filter((s) => s.type !== 'answer_pointers');
    const questionsOnlyDeck: AiGeneratedDeck = {
      ...deck,
      deckTitle: `${deck.deckTitle} - Questions & Whiteboard`,
      topicTitle: `${deck.topicTitle} - Questions`,
      slides: questionsSlides.map((s, idx) => ({ ...s, slideNumber: idx + 1 })),
    };
    await this.exportToPptx(questionsOnlyDeck, theme);
  },

  /**
   * Export only Answer Pointers slides as a separate PDF document
   */
  async exportAnswerPointersOnlyPdf(
    deck: AiGeneratedDeck,
    theme: 'dark_tech' | 'deep_navy' | 'clean_minimal' = 'dark_tech'
  ): Promise<void> {
    const answerSlides = deck.slides.filter(
      (s) => s.type === 'title' || s.type === 'unit_divider' || s.type === 'answer_pointers'
    );
    const answersOnlyDeck: AiGeneratedDeck = {
      ...deck,
      deckTitle: `${deck.deckTitle} - Answer Pointers Guide`,
      topicTitle: `${deck.topicTitle} - Answer Pointers`,
      slides: answerSlides.map((s, idx) => ({ ...s, slideNumber: idx + 1 })),
    };
    await this.exportToPdf(answersOnlyDeck, theme);
  },
};
