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

export interface AnswerSlideContent {
  slideTitle?: string | null;      // Optional per-slide heading
  identifiedSolution?: string | null; // Upfront solution (slide 1)
  definition?: string | null;      // Formal academic definition (slide 1, theory only)
  bullets: string[];               // Point-wise organic pointers with **Bold** lead-ins
  formulaOrCode?: string | null;   // Governing formula / recurrence / result
  professorNote?: string | null;   // Teaching tip / exam advice (typically last slide)
}

export interface AnswerPointersData {
  coreConcept?: string;
  isTheory?: boolean;
  // Legacy single-slide fields (kept for backward compatibility with formatSolutionIntoPointers)
  identifiedSolution?: string;
  definition?: string;
  pointers: string[];
  formulaOrResult?: string;
  professorNote?: string;
  commonPitfall?: string;
  markingRubric?: string;
  givenSetup?: string;
  examYear?: string;
  marks?: string;
  // Multi-slide answer architecture (populated by DeepSeek)
  slides?: AnswerSlideContent[];
}

export interface AiSlide {
  slideNumber: number;
  type: 'title' | 'unit_divider' | 'topic_divider' | 'direct_pyq' | 'blank_workspace' | 'answer_pointers' | 'first_principles' | 'concept_card' | 'two_column' | 'step_by_step' | 'pyq_solution' | 'common_mistakes' | 'summary' | string;
  badge?: string;
  unitBadge?: string;
  topicBadge?: string;
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
  // Multi-slide answer index (which slide in the slides[] array this AiSlide represents)
  answerSlideIndex?: number;
  answerSlideTotalCount?: number;
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
   * Generates a stable, canonical question key from question text for 1:1 Q&A mapping.
   * Strips whitespace, punctuation, and case so questions and answers NEVER mismatch.
   */
  getQuestionKey(text?: string): string {
    if (!text || typeof text !== 'string') return '';
    const clean = text.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 100);
    return clean ? `q_${clean}` : '';
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
   * Intelligently parses embedded metadata (Year of Question, Marks, Solution)
   * from raw question text when separate columns are missing or contain defaults.
   * Handles bracketed tags like [GATE CS 2023 - 10 Marks], (End-Term Dec 2022, 5M),
   * standalone "Marks: 10", "Year: 2021", and trailing "Answer: ...".
   */
  extractEmbeddedPyqMetadata(rawQuestionText: string): {
    cleanQuestionText: string;
    extractedYearExam?: string;
    extractedMarks?: string;
    extractedSolution?: string;
  } {
    let cleanText = (rawQuestionText || '').trim();
    let extractedYearExam: string | undefined;
    let extractedMarks: string | undefined;
    let extractedSolution: string | undefined;

    // 1. Extract embedded Solution / Answer if present (e.g. "Answer: ...", "Ans: ...", "Solution: ...")
    const solMatch = cleanText.match(/(?:(?:\r?\n)+|\s{2,}|\b)(?:Answer|Ans|Solution|Sol|Model Answer|Faculty Solution|Faculty Answer|Key)\s*[:：-]\s*([\s\S]+)$/i);
    if (solMatch && solMatch[1] && solMatch[1].trim().length > 3) {
      extractedSolution = solMatch[1].trim();
      cleanText = cleanText.substring(0, solMatch.index).trim();
    }

    // 2. Check for combined bracket: e.g. [GATE CS 2023 - 10 Marks] or (End-Term Dec 2022, 5M)
    const combinedMatch = cleanText.match(/(\[|\()([^\]\)]+)(\]|\))/);
    if (combinedMatch) {
      const inner = combinedMatch[2].trim();
      const mMatch = inner.match(/(\d{1,2})\s*(?:Marks?|M|pts?|points?)/i);
      if (mMatch) {
        extractedMarks = `${mMatch[1]} Marks`;
      }

      // Strip marks part from inner to isolate year/exam cleanly without "Marks" conflicting with "Mar"
      const innerWithoutMarks = mMatch ? inner.replace(mMatch[0], '').replace(/[-–/,]\s*$/, '').trim() : inner;
      const yMatch = innerWithoutMarks.match(/(?:(?:GATE(?:\s+[A-Z]{2})?|ESE|UGC[- ]?NET|ISRO|BARC|End[- ]?Term|Mid[- ]?Term|Univ(?:ersity)?|Annual|Board|Exam|Session)\s*)?(?:(?:19|20)\d{2}(?:\s*[-–/]\s*\d{2,4})?|\b(?:19|20)\d{2}\b)(?:\s*(?:Dec|May|June?|July?|Nov|Spring|Fall|Winter|Summer|Jan|Feb|March?|Apr|Aug|Sept?|Oct)(?![a-z]))?/i);

      if (yMatch && /\d{4}/.test(yMatch[0])) {
        extractedYearExam = yMatch[0].replace(/^[-–/,]\s*/, '').replace(/[-–/,]\s*$/, '').trim();
      }

      if (extractedMarks || extractedYearExam) {
        cleanText = cleanText.replace(combinedMatch[0], ' ').replace(/\s{2,}/g, ' ').trim();
      }
    }

    // 3. Fallback standalone Marks extractor
    if (!extractedMarks) {
      const marksMatch = cleanText.match(/(?:\[|\(|\b)(?:Marks?|Weightage)?\s*[:：-]?\s*(\d{1,2})\s*(?:Marks?|M|pts?|points?|marks?)(?:\]|\)|\b)/i)
        || cleanText.match(/\[(\d{1,2})\s*M\]/i);
      if (marksMatch) {
        extractedMarks = `${marksMatch[1]} Marks`;
        cleanText = cleanText.replace(marksMatch[0], ' ').replace(/\s{2,}/g, ' ').trim();
      }
    }

    // 4. Fallback standalone Year extractor
    if (!extractedYearExam) {
      const yearMatch = cleanText.match(/(?:\[|\()((?:GATE(?:\s+[A-Z]{2})?|ESE|UGC[- ]?NET|ISRO|BARC|End[- ]?Term|Mid[- ]?Term|Univ(?:ersity)?|Annual|Board|Exam|Session)?\s*(?:(?:19|20)\d{2}(?:\s*[-–/]\s*\d{2,4})?|\b(?:19|20)\d{2}\b)(?:\s*(?:Dec|May|June?|July?|Nov|Spring|Fall|Winter|Summer|Jan|Feb|March?|Apr|Aug|Sept?|Oct)(?![a-z]))?)(?:\]|\))/i)
        || cleanText.match(/(?:Year of Question|Question Year|Exam Year|Year|Exam|Session|Asked in)\s*[:：-]\s*([A-Za-z0-9\s/–-]{4,30})/i);

      if (yearMatch && yearMatch[1]) {
        const candidateYear = yearMatch[1].trim();
        if (/\d{4}/.test(candidateYear)) {
          extractedYearExam = candidateYear;
          cleanText = cleanText.replace(yearMatch[0], ' ').replace(/\s{2,}/g, ' ').trim();
        }
      }
    }

    // Clean up leading question numbers and punctuation like "Q1.", "1.", "| ", ": "
    cleanText = cleanText
      .replace(/^(?:Q(?:uestion)?\s*\d+[:.-]?|\d+[.)]\s*)/i, '')
      .replace(/^[|:：-]\s*/, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    return {
      cleanQuestionText: cleanText || rawQuestionText,
      extractedYearExam,
      extractedMarks,
      extractedSolution,
    };
  },

  /**
   * Parses Excel file with broad fuzzy column matching:
   * "Year of Question", "Question Year", "Year & Exam", "Unit Number", "Mapped Topic", "Full Question Text", "Answer/Solution", "Marks"
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
            // Flexible, fuzzy key finder supporting exact and substring matching
            const findVal = (keys: string[]) => {
              for (const k of Object.keys(row)) {
                const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                for (const candidate of keys) {
                  const cleanCand = candidate.toLowerCase().replace(/[^a-z0-9]/g, '');
                  if (cleanK === cleanCand || cleanK.includes(cleanCand)) {
                    return String(row[k] || '').trim();
                  }
                }
              }
              return '';
            };

            const rawQuestion = findVal([
              'fullquestiontext', 'fullquestion', 'questiontext', 'question',
              'problemstatement', 'problem', 'qstatement', 'qtext', 'ques', 'statement', 'questiondescription'
            ]);
            const rawYearExam = findVal([
              'yearofquestion', 'questionyear', 'examyear', 'yearexam', 'yearandexam',
              'pyqyear', 'yearquestion', 'year', 'exam', 'session', 'batch', 'term', 'gate', 'askedin', 'paper'
            ]);
            const unitNumberRaw = findVal([
              'unitnumber', 'unitno', 'unitnum', 'unit', 'module', 'mod', 'chapter', 'ch'
            ]);
            const mappedTopic = findVal([
              'mappedtopic', 'topic', 'concept', 'subtopic', 'chapter', 'syllabustopic', 'unittopic'
            ]);
            const rawMarks = findVal([
              'marks', 'mark', 'weightage', 'maxmarks', 'totalmarks', 'score', 'pts', 'points'
            ]);
            const rawSolution = findVal([
              'solution', 'answer', 'facultysolution', 'facultyanswer', 'modelanswer',
              'answerkey', 'ans', 'sol', 'explanation', 'stepbystep', 'stepbystepsolution', 'working', 'key'
            ]);

            // If rawQuestion exists, extract any embedded year, marks, or solution
            if (rawQuestion && rawQuestion.length > 2) {
              const embedded = this.extractEmbeddedPyqMetadata(rawQuestion);
              const questionText = embedded.cleanQuestionText;
              
              // Prioritize column values, fall back to embedded values
              const yearExam = rawYearExam || embedded.extractedYearExam || 'Examination PYQ';
              const marks = rawMarks || embedded.extractedMarks;
              const solution = rawSolution || embedded.extractedSolution;
              const normalizedUnit = AiPptService.normalizeUnitNumber(unitNumberRaw);

              parsedList.push({
                id: `pyq-row-${idx}-${Date.now()}`,
                questionText,
                yearExam,
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
   * Parses raw multi-unit syllabus text (e.g. from course handbooks or syllabus outlines)
   * into a clean dictionary of unitName -> list of topics.
   * Handles patterns like:
   * "UNIT 1: Core Analysis\n- Asymptotic Bounds\n- Divide and Conquer\n\nUNIT 2: Linear Structures\n- Stacks\n- Queues"
   */
  parseMultiUnitSyllabus(rawText: string): Record<string, string[]> {
    if (!rawText || !rawText.trim()) return {};

    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const result: Record<string, string[]> = {};
    let currentUnit = 'UNIT 1';

    const unitHeaderRegex = /^(?:unit|module|mod|chapter|ch)\s*[-_.:#]?\s*(\d+)(?:\s*[:：\-–]\s*(.*))?$/i;

    lines.forEach((line) => {
      const unitMatch = line.match(unitHeaderRegex);
      if (unitMatch) {
        const unitNum = parseInt(unitMatch[1], 10);
        currentUnit = `UNIT ${unitNum}`;
        if (!result[currentUnit]) result[currentUnit] = [];
        if (unitMatch[2] && unitMatch[2].trim().length > 2) {
          const inlineTopic = unitMatch[2].trim();
          if (inlineTopic.includes(',') && !inlineTopic.includes('(')) {
            inlineTopic.split(',').forEach((sub) => {
              const cleaned = sub.trim().replace(/^[-*•]\s*/, '');
              if (cleaned.length > 2 && !result[currentUnit].includes(cleaned)) {
                result[currentUnit].push(cleaned);
              }
            });
          } else if (!result[currentUnit].includes(inlineTopic)) {
            result[currentUnit].push(inlineTopic);
          }
        }
      } else {
        const cleanTopic = line
          .replace(/^(?:[-*•–—]|\d+[.)]|\([a-zA-Z0-9]+\))\s*/, '')
          .replace(/;$/, '')
          .trim();

        if (cleanTopic.length > 2) {
          if (!result[currentUnit]) result[currentUnit] = [];
          if (cleanTopic.includes(',') && !cleanTopic.includes('(')) {
            cleanTopic.split(',').forEach((sub) => {
              const cleaned = sub.trim();
              if (cleaned.length > 2 && !result[currentUnit].includes(cleaned)) {
                result[currentUnit].push(cleaned);
              }
            });
          } else if (!result[currentUnit].includes(cleanTopic)) {
            result[currentUnit].push(cleanTopic);
          }
        }
      }
    });

    return result;
  },

  /**
   * Extracts only the Month and Year from verbose examination strings.
   * e.g. "November 2023 Mid-Term Examination (CIC-305)" -> "November 2023"
   * e.g. "May 2022 End Semester Exam (CS-201)" -> "May 2022"
   * e.g. "May/June 2023 Paper 2" -> "May/June 2023"
   * e.g. "Dec 2021 University Exam" -> "Dec 2021"
   * e.g. "2023 Dec" -> "Dec 2023"
   * e.g. "GATE CS 2023" -> "2023"
   */
  formatExamYearAndMonth(rawText?: string): string {
    if (!rawText || typeof rawText !== 'string') return '';
    const trimmed = rawText.trim();
    if (!trimmed) return '';

    const months = '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
    const seasons = '(?:Spring|Summer|Autumn|Fall|Winter)';
    const period = `(?:${months}|${seasons})(?:[\\s\\/\\-]+(?:${months}|${seasons}))?`;

    // 1. Month/Season + Year (e.g. "November 2023", "May/June 2022")
    const monthYearRegex = new RegExp(`\\b(${period})\\s*['’]?(20\\d{2}|19\\d{2}|\\d{2})\\b`, 'i');
    const myMatch = trimmed.match(monthYearRegex);
    if (myMatch) {
      const monthPart = myMatch[1].trim();
      let yearPart = myMatch[2].trim();
      if (yearPart.length === 2) {
        yearPart = (parseInt(yearPart, 10) > 50 ? '19' : '20') + yearPart;
      }
      return `${monthPart} ${yearPart}`;
    }

    // 2. Year + Month/Season (e.g. "2023 Nov")
    const yearMonthRegex = new RegExp(`\\b(20\\d{2}|19\\d{2})\\s*(${period})\\b`, 'i');
    const ymMatch = trimmed.match(yearMonthRegex);
    if (ymMatch) {
      return `${ymMatch[2].trim()} ${ymMatch[1].trim()}`;
    }

    // 3. Fallback: Standalone 4-digit Year (e.g. "2023", "GATE CS 2023")
    const yearOnlyMatch = trimmed.match(/\b(20\d{2}|19\d{2})\b/);
    if (yearOnlyMatch) {
      return yearOnlyMatch[1];
    }

    // 4. Clean up any remaining examination suffix
    const cleaned = trimmed
      .replace(/\s*\([^)]*\)/g, '')
      .replace(/(?:Mid-Term|End-Term|End-Sem|Semester|Final|University|Examination|Exam|Paper\s*\d+)/gi, '')
      .trim();

    return cleaned || trimmed;
  },

  /**
   * Groups questions:
   * 1. By Unit (Unit 1, Unit 2, Unit 3...)
   * 2. Within each unit, combines all questions of each Mapped Topic together.
   * 3. Orders topics in each unit according to either unit-wise syllabus or global syllabus order.
   */
  groupAndSortPyqsByUnitAndTopic(
    pyqs: DirectPyqRow[],
    syllabusTopicsOrder: string[] = [],
    unitWiseSyllabusOrder?: Record<string, string[]>
  ): UnitQuestionGroup[] {
    const cleanGlobalSyllabusList = syllabusTopicsOrder.map((t) => t.trim().toLowerCase()).filter(Boolean);

    // 1. Group by unit
    const unitMap = new Map<string, DirectPyqRow[]>();
    pyqs.forEach((q) => {
      const unit = q.unitNumber || 'UNIT 1';
      if (!unitMap.has(unit)) unitMap.set(unit, []);
      unitMap.get(unit)!.push(q);
    });

    const unitGroups: UnitQuestionGroup[] = [];

    unitMap.forEach((questionsInUnit, unitName) => {
      // Find unit-specific syllabus if configured
      const normUnit = AiPptService.normalizeUnitNumber(unitName);
      let unitSpecificList: string[] = [];
      if (unitWiseSyllabusOrder) {
        if (unitWiseSyllabusOrder[unitName] && unitWiseSyllabusOrder[unitName].length > 0) {
          unitSpecificList = unitWiseSyllabusOrder[unitName];
        } else if (unitWiseSyllabusOrder[normUnit] && unitWiseSyllabusOrder[normUnit].length > 0) {
          unitSpecificList = unitWiseSyllabusOrder[normUnit];
        } else {
          const foundKey = Object.keys(unitWiseSyllabusOrder).find(
            (k) => k.trim().toLowerCase() === unitName.trim().toLowerCase() || k.trim().toLowerCase() === normUnit.toLowerCase()
          );
          if (foundKey && unitWiseSyllabusOrder[foundKey].length > 0) {
            unitSpecificList = unitWiseSyllabusOrder[foundKey];
          }
        }
      }

      const activeUnitSyllabus = unitSpecificList.length > 0
        ? unitSpecificList.map((t) => t.trim().toLowerCase()).filter(Boolean)
        : cleanGlobalSyllabusList;

      const getTopicRank = (topicName: string): number => {
        const cleanTopic = topicName.trim().toLowerCase();
        if (!cleanTopic) return 9999;

        // Exact match in active syllabus
        const exactIdx = activeUnitSyllabus.indexOf(cleanTopic);
        if (exactIdx !== -1) return exactIdx;

        // Substring match in active syllabus
        const subIdx = activeUnitSyllabus.findIndex((s) => cleanTopic.includes(s) || s.includes(cleanTopic));
        if (subIdx !== -1) return subIdx;

        // Fallback to global syllabus if active was unit-specific and topic wasn't found
        if (unitSpecificList.length > 0) {
          const globalExact = cleanGlobalSyllabusList.indexOf(cleanTopic);
          if (globalExact !== -1) return 1000 + globalExact;
          const globalSub = cleanGlobalSyllabusList.findIndex((s) => cleanTopic.includes(s) || s.includes(cleanTopic));
          if (globalSub !== -1) return 1000 + globalSub;
        }

        return 9999;
      };

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
  sortDirectPyqs(
    pyqs: DirectPyqRow[],
    syllabusTopicsOrder: string[] = [],
    unitWiseSyllabusOrder?: Record<string, string[]>
  ): DirectPyqRow[] {
    const unitGroups = this.groupAndSortPyqsByUnitAndTopic(pyqs, syllabusTopicsOrder, unitWiseSyllabusOrder);
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
   * Formats raw solution notes or questions into clean, human-crafted professor lecture notes.
   * Identifies the direct solution upfront, extracts formal academic definitions for theory questions,
   * and articulates natural, high-yield technical pointers (no rigid "Milestone" templates).
   */
  formatSolutionIntoPointers(
    solutionText?: string,
    questionText?: string,
    topicName?: string
  ): AnswerPointersData {
    const cleanSol = solutionText?.replace(/<[^>]*>?/gm, '').trim() || '';
    const cleanQ = questionText?.replace(/<[^>]*>?/gm, '').trim() || '';
    const cleanTopic = topicName || 'General Engineering';
    const lowerQ = cleanQ.toLowerCase();
    const lowerSol = cleanSol.toLowerCase();

    // 1. Detect if Theory / Conceptual Question
    const isTheory = /explain|what is|define|discuss|describe|differentiate|compare|illustrate|advantages|disadvantages|properties|types|principles|overview|architecture|components|invariants|working of/i.test(cleanQ);

    // 2. Identify Core Concept & Technical Headline
    let coreConcept = `${cleanTopic}: Core Method & Analysis`;
    if (lowerQ.includes('dijkstra')) coreConcept = 'Dijkstra Single-Source Shortest Path';
    else if (lowerQ.includes('recurrence') || lowerSol.includes('master')) coreConcept = 'Recurrence Relations & Asymptotic Master Bounds';
    else if (lowerQ.includes('binary search tree') || lowerQ.includes('bst')) coreConcept = 'Binary Search Tree (BST) Properties & Operations';
    else if (lowerQ.includes('binary search')) coreConcept = 'Binary Search & Logarithmic Search Spaces';
    else if (lowerQ.includes('linked list')) coreConcept = 'Linked List Manipulation & Pointer Invariants';
    else if (lowerQ.includes('stack')) coreConcept = 'Stack LIFO Mechanics & Expression Parsing';
    else if (lowerQ.includes('queue')) coreConcept = 'Queue FIFO Operations & Buffer Architectures';
    else if (lowerQ.includes('avl') || lowerQ.includes('balance')) coreConcept = 'AVL Tree Self-Balancing & Rotation Mechanics';
    else if (lowerQ.includes('graph') || lowerQ.includes('traversal')) coreConcept = 'Graph Traversals (BFS/DFS) & Cut Properties';
    else if (lowerQ.includes('dynamic programming') || lowerQ.includes('dp')) coreConcept = 'Dynamic Programming: Memoization & Optimal Substructure';
    else if (lowerQ.includes('greedy')) coreConcept = 'Greedy Choice Property & Local Optima';
    else if (lowerQ.includes('asymptotic') || lowerQ.includes('complexity') || lowerQ.includes('big o')) coreConcept = 'Asymptotic Growth Classes (O, Ω, Θ) Analysis';
    else if (cleanTopic) coreConcept = `${cleanTopic} Solution Analysis`;

    // 3. Extract / Formulate Identified Solution Upfront
    let identifiedSolution = '';
    if (cleanSol) {
      const solSentences = cleanSol.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 15);
      if (solSentences.length > 0) {
        identifiedSolution = solSentences[0].replace(/^(?:Answer\b|Ans\b|Solution\b|Sol\b|Step\s*\d+)[:.-]?\s*/i, '');
      }
    }

    if (!identifiedSolution) {
      if (lowerQ.includes('dijkstra')) {
        identifiedSolution = "Greedy single-source shortest path algorithm on weighted graphs with non-negative edge weights using priority-queue relaxation.";
      } else if (lowerQ.includes('recurrence') || lowerSol.includes('master')) {
        identifiedSolution = "Apply the Master Theorem to compare subproblem splitting cost against driving function f(n) to determine the dominant asymptotic term.";
      } else if (lowerQ.includes('binary search')) {
        identifiedSolution = "Divide-and-conquer search on sorted collections halving search space per step, achieving logarithmic O(log n) time.";
      } else if (lowerQ.includes('linked list')) {
        identifiedSolution = "Iterative pointer redirection preserves constant O(1) auxiliary space without modifying node allocations.";
      } else if (lowerQ.includes('avl')) {
        identifiedSolution = "Maintains strict O(log n) height by executing single (LL, RR) or double (LR, RL) rotations whenever balance factor |h_L - h_R| > 1.";
      } else if (isTheory) {
        identifiedSolution = `Authoritative technical resolution for ${cleanTopic}, detailing primary operational invariants, structural behavior, and trade-offs.`;
      } else {
        identifiedSolution = `Algorithmic execution establishing boundary invariants and deriving the verified closed-form result.`;
      }
    }

    // 4. Formal Academic Definition (For Theory / Concepts)
    let definition: string | undefined;
    if (isTheory || lowerQ.includes('define') || lowerQ.includes('what is')) {
      if (lowerQ.includes('asymptotic') || lowerQ.includes('big o') || lowerQ.includes('complexity')) {
        definition = 'Asymptotic notations (Big-O, Omega, Theta) define mathematical limits and upper/lower bounds on the execution time or space requirements of an algorithm as input size n approaches infinity.';
      } else if (lowerQ.includes('dijkstra')) {
        definition = "Dijkstra's Algorithm is a greedy graph search algorithm that solves the single-source shortest path problem for a directed/undirected graph with non-negative edge weights.";
      } else if (lowerQ.includes('bst') || lowerQ.includes('binary search tree')) {
        definition = 'A Binary Search Tree is a node-based binary tree data structure where each node satisfies the key invariant: all keys in its left subtree are smaller, and all keys in its right subtree are greater.';
      } else if (lowerQ.includes('avl')) {
        definition = 'An AVL tree is a self-balancing binary search tree in which the heights of the two child subtrees of any node differ by at most one; otherwise, tree rebalancing rotations are performed.';
      } else if (lowerQ.includes('dynamic programming')) {
        definition = 'Dynamic Programming is an algorithmic paradigm that solves complex problems by breaking them down into simpler overlapping subproblems, solving each subproblem once, and storing solutions in a lookup table.';
      } else if (lowerQ.includes('stack')) {
        definition = 'A Stack is an abstract linear data structure operating under the Last-In, First-Out (LIFO) principle, where insertions and deletions occur strictly at the top pointer.';
      } else if (lowerQ.includes('queue')) {
        definition = 'A Queue is an abstract linear data structure operating under the First-In, First-Out (FIFO) principle, where elements are enqueued at the rear and dequeued from the front.';
      } else {
        definition = `${cleanTopic} establishes the foundational operational principles and architectural constraints governing this engineering problem.`;
      }
    }

    // 5. Extract Formula / Asymptotic Bound
    let formulaResult: string | undefined;
    const formulaMatch = cleanSol.match(/(?:T\(n\)\s*=[^.\n]+|O\([^)]+\)|Theta\([^)]+\)|Omega\([^)]+\)|[A-Za-z0-9_]+\s*=\s*[^.,;\n]{3,45})/i);
    if (formulaMatch && formulaMatch[0].length < 75) {
      formulaResult = formulaMatch[0].trim();
    } else if (lowerQ.includes('recurrence') || lowerSol.includes('recurrence') || lowerSol.includes('master')) {
      formulaResult = 'T(n) = aT(n/b) + f(n)  ⇒  T(n) = Θ(n^(log_b a) · log^(k+1) n)';
    } else if (lowerQ.includes('binary search')) {
      formulaResult = 'T(n) = T(n/2) + O(1)  ⇒  Time: O(log n), Space: O(1)';
    } else if (lowerQ.includes('dijkstra') || lowerQ.includes('shortest path')) {
      formulaResult = 'd[v] = min(d[v], d[u] + w(u,v))  ⇒  Time: O((V + E) log V)';
    } else if (lowerQ.includes('avl')) {
      formulaResult = 'Balance Factor = Height(Left) - Height(Right) ∈ {-1, 0, +1}';
    } else if (lowerQ.includes('tree') || lowerQ.includes('traversal')) {
      formulaResult = 'Time: O(N) traversal  |  Auxiliary Space: O(H) recursion stack';
    } else {
      formulaResult = 'Governing Mathematical Formulation Verified';
    }

    // 6. Extract Professor Teaching Note
    let professorNote: string;
    if (lowerQ.includes('recurrence') || lowerSol.includes('master')) {
      professorNote = 'Always verify polynomial difference ε > 0 and regularity condition af(n/b) ≤ cf(n) before declaring Master Theorem cases.';
    } else if (lowerQ.includes('linked list') || lowerQ.includes('pointer')) {
      professorNote = 'Remember to cache curr->next before modifying curr->next to prevent pointer orphan leaks.';
    } else if (lowerQ.includes('dijkstra') || lowerQ.includes('graph')) {
      professorNote = 'Greedy relaxation fails when negative edge weights exist; Bellman-Ford or SPFA is required instead.';
    } else if (lowerQ.includes('avl')) {
      professorNote = 'Identify the deepest unbalanced node (pivot); single rotation fixes same-side imbalances (LL/RR), while double rotation fixes zigzag imbalances (LR/RL).';
    } else if (lowerQ.includes('complexity') || lowerQ.includes('asymptotic')) {
      professorNote = 'Never confuse worst-case O(f(n)) with tight asymptotic class Θ(f(n)); tight bounds require matching upper and lower bounds.';
    } else {
      professorNote = 'State boundary assumptions clearly and justify each intermediate reduction for complete academic rigor.';
    }

    // 7. Generate Articulate Professor Pointers (NO "Milestone" prefixes!)
    let pointers: string[] = [];
    if (cleanSol) {
      const rawChunks = cleanSol
        .split(/(?:\r?\n|;|\.\s+(?=[A-Z0-9])|(?:\b(?:Step\s*\d+|[1-9]\.|\([a-z]\))\s*[:.-]?\s*))/i)
        .map((s) => s.replace(/^(?:Step\s*\d+[:.-]?|[1-9]\.[:.-]?|Milestone\s*\d+[:.-]?)\s*/i, '').trim())
        .filter((s) => s.length > 10 && !s.toLowerCase().startsWith('ans') && !s.toLowerCase().startsWith('solution'));

      if (rawChunks.length >= 2) {
        pointers = rawChunks.slice(0, 4).map((p) => {
          const capitalized = p.charAt(0).toUpperCase() + p.slice(1);
          return capitalized;
        });
      }
    }

    if (pointers.length === 0) {
      if (lowerQ.includes('dijkstra')) {
        pointers = [
          '**Initialization:** Set source distance dist[src] = 0 and all other vertices dist[v] = ∞. Insert all vertices into min-priority queue.',
          '**Greedy Vertex Extraction:** In each iteration, extract vertex u with minimum provisional distance from priority queue.',
          '**Neighbor Edge Relaxation:** For each outgoing edge (u, v, w), if dist[u] + w < dist[v], update dist[v] = dist[u] + w and decrease key.',
          '**Non-Negative Invariant:** Once vertex u is extracted, its distance is finalized and will never be relaxed again.'
        ];
      } else if (lowerQ.includes('recurrence') || lowerSol.includes('master')) {
        pointers = [
          '**Identify Parameters:** Extract subproblem count a, subproblem reduction factor b, and driving function f(n).',
          '**Compute Critical Exponent:** Calculate the critical value c_crit = log_b(a) and form the watershed function n^(log_b a).',
          '**Asymptotic Comparison:** Compare driving function f(n) against n^(log_b a) polynomially to determine case 1, 2, or 3.',
          '**State Conclusion:** Formulate tight asymptotic bound Θ(g(n)) and verify regularity conditions.'
        ];
      } else if (isTheory) {
        pointers = [
          '**Core Theoretical Premise:** Governed by structural mathematical properties and computational invariants.',
          '**Operational Working & Mechanism:** Processes state transitions sequentially while maintaining system integrity.',
          '**Key Engineering Trade-offs:** Balances time complexity overhead against memory footprint requirements.',
          '**Boundary & Edge Cases:** Robust handling of empty inputs, null pointers, and extreme scale factors.'
        ];
      } else {
        pointers = [
          '**Initial State Formulation:** Establish input constraints, variable dimensions, and boundary invariants.',
          '**Analytical Execution:** Execute iterative state reductions and compute intermediate matrix transitions.',
          '**Invariant Verification:** Confirm dimensional consistency and check boundary edge conditions.',
          '**Final Formulation:** Box the tight asymptotic bound or verified numerical result.'
        ];
      }
    }

    // Partition answer into multiple slides so explanations can span multiple slides as requested
    const slides: AnswerSlideContent[] = [];
    if (pointers.length >= 3 || (identifiedSolution && (formulaResult || professorNote))) {
      const half = Math.ceil(pointers.length / 2);
      slides.push({
        slideTitle: 'Foundations & Approach',
        identifiedSolution: identifiedSolution || null,
        definition: definition || null,
        bullets: pointers.slice(0, half),
        formulaOrCode: null,
        professorNote: null,
      });
      slides.push({
        slideTitle: 'Detailed Invariants & Notes',
        identifiedSolution: null,
        definition: null,
        bullets: pointers.slice(half),
        formulaOrCode: formulaResult || null,
        professorNote: professorNote || null,
      });
    } else {
      slides.push({
        slideTitle: null,
        identifiedSolution: identifiedSolution || null,
        definition: definition || null,
        bullets: pointers,
        formulaOrCode: formulaResult || null,
        professorNote: professorNote || null,
      });
    }

    return {
      coreConcept,
      isTheory,
      identifiedSolution,
      definition,
      pointers,
      formulaOrResult: formulaResult,
      professorNote,
      commonPitfall: professorNote,
      markingRubric: undefined,
      slides,
    };
  },

  /**
   * Safely parses JSON string even if truncated by LLM token limits
   * or containing unescaped control characters.
   */
  safeParseJsonWithRepair<T = any>(rawStr: string): { success: boolean; data?: T; error?: string; repaired?: boolean } {
    if (!rawStr || typeof rawStr !== 'string') {
      return { success: false, error: 'Empty input string' };
    }

    const clean = rawStr
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    // 1. Direct standard parse
    try {
      const parsed = JSON.parse(clean);
      return { success: true, data: parsed, repaired: false };
    } catch (e1) {
      // Continue to repair strategies
    }

    // 2. Unescaped control characters repair
    try {
      const sanitized = clean.replace(/[\u0000-\u001F]+/g, (match) => {
        if (match === '\n') return '\\n';
        if (match === '\r') return '\\r';
        if (match === '\t') return '\\t';
        return '';
      });
      const parsed = JSON.parse(sanitized);
      return { success: true, data: parsed, repaired: true };
    } catch (e2) {}

    // 3. Truncated array / object repair:
    // If output ended mid-string or mid-object, walk backwards looking for the last
    // complete object closing brace '}' that closes a valid element.
    let endPos = clean.length;
    while (endPos > 0) {
      const lastCloseBrace = clean.lastIndexOf('}', endPos - 1);
      if (lastCloseBrace === -1) break;

      const sub = clean.slice(0, lastCloseBrace + 1);
      const candidates = [
        sub + ']}',
        sub + ']',
        sub + '}',
      ];

      for (const cand of candidates) {
        try {
          const parsed = JSON.parse(cand);
          if (parsed && (Array.isArray(parsed) || Array.isArray((parsed as any).results) || typeof parsed === 'object')) {
            return { success: true, data: parsed, repaired: true };
          }
        } catch (candErr) {}
      }

      endPos = lastCloseBrace;
    }

    // 4. Regex extraction of individual valid question objects
    try {
      const extractedResults: any[] = [];
      const objectRegex = /\{\s*"questionIndex"\s*:\s*\d+[\s\S]*?\n\s*\}/g;
      let match: RegExpExecArray | null;
      while ((match = objectRegex.exec(clean)) !== null) {
        try {
          const obj = JSON.parse(match[0]);
          if (obj && typeof obj.questionIndex === 'number') {
            extractedResults.push(obj);
          }
        } catch (objErr) {}
      }

      if (extractedResults.length > 0) {
        return { success: true, data: { results: extractedResults } as any, repaired: true };
      }
    } catch (regexErr) {}

    return { success: false, error: 'Could not parse or repair JSON response' };
  },

  /**
   * Generates concise, human-professor style solution pointers for questions using DeepSeek API.
   * Processes questions in safe batches (max 5 per call) to avoid LLM token limits and truncated JSON.
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
    onProgress?: (completed: number, total: number) => void;
  }): Promise<{
    success: boolean;
    pointersMap?: Record<string | number, AnswerPointersData>;
    error?: string;
    needsApiKey?: boolean;
  }> {
    const activeApiKey = params.apiKey || this.getStoredApiKey();
    const totalQuestions = params.questions.length;
    if (totalQuestions === 0) {
      return { success: true, pointersMap: {} };
    }

    const pointersMap: Record<string | number, AnswerPointersData> = {};
    const BATCH_SIZE = 5; // Safe batch size that will NEVER hit token completion limits

    // Helper to process a single batch of questions
    const processBatch = async (
      batchQuestions: Array<{
        question: typeof params.questions[0];
        globalIndex: number;
      }>
    ): Promise<boolean> => {
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
            questions: batchQuestions.map((b) => ({
              id: b.question.id !== undefined ? b.question.id : b.globalIndex,
              questionText: b.question.questionText,
              examYear: b.question.examYear,
              marks: b.question.marks,
              topic: b.question.topic,
              solution: b.question.solution,
            })),
            apiKey: activeApiKey || undefined,
          }),
        });

        if (response.ok) {
          const rawText = await response.text();
          const parsedRes = this.safeParseJsonWithRepair(rawText);
          if (parsedRes.success && parsedRes.data) {
            const data = parsedRes.data;
            const rawList: any[] = Array.isArray(data.results)
              ? data.results
              : Array.isArray(data.pointersMap)
              ? data.pointersMap
              : Array.isArray(data)
              ? data
              : Object.values(data.pointersMap || data.results || data);

            if (Array.isArray(rawList) && rawList.length > 0) {
              rawList.forEach((item: any, itemIdx: number) => {
                // 1. Strict match by question ID (e.g. pyq-row-...)
                let matched = batchQuestions.find(
                  (b) => item.id !== undefined && b.question.id !== undefined && String(b.question.id).trim() === String(item.id).trim()
                );

                // 2. Match by canonical question text if text was echoed
                if (!matched && (item.questionText || item.question)) {
                  const itemQKey = this.getQuestionKey(item.questionText || item.question);
                  matched = batchQuestions.find(
                    (b) => this.getQuestionKey(b.question.questionText) === itemQKey
                  );
                }

                // 3. Match by questionIndex if present, carefully handling 1-based vs 0-based
                if (!matched && typeof item.questionIndex === 'number') {
                  if (item.questionIndex >= 1 && item.questionIndex <= batchQuestions.length) {
                    matched = batchQuestions[item.questionIndex - 1];
                  } else if (item.questionIndex >= 0 && item.questionIndex < batchQuestions.length) {
                    matched = batchQuestions[item.questionIndex];
                  }
                }

                // 4. Positional fallback: corresponding position in batchQuestions
                if (!matched && itemIdx < batchQuestions.length) {
                  matched = batchQuestions[itemIdx];
                }

                if (!matched) return;

                const targetGlobalIdx = matched.globalIndex;
                const firstSlide = (item.slides && item.slides.length > 0) ? item.slides[0] : null;
                const pointerObj: AnswerPointersData = {
                  coreConcept: item.coreConcept || 'Solution & Concept Analysis',
                  isTheory: item.isTheory ?? false,
                  identifiedSolution: firstSlide?.identifiedSolution || item.identifiedSolution || undefined,
                  definition: firstSlide?.definition || item.definition || undefined,
                  pointers: firstSlide?.bullets || item.pointers || [],
                  formulaOrResult: firstSlide?.formulaOrCode || item.formulaOrResult || undefined,
                  professorNote: (item.slides?.[item.slides.length - 1]?.professorNote) || item.professorNote || undefined,
                  slides: item.slides || undefined,
                };

                // Store with 3-way indexing for guaranteed 1:1 question-answer mapping
                pointersMap[targetGlobalIdx] = pointerObj;
                if (matched.question.id !== undefined) {
                  pointersMap[String(matched.question.id)] = pointerObj;
                }
                if (matched.question.questionText) {
                  const qKey = this.getQuestionKey(matched.question.questionText);
                  if (qKey) pointersMap[qKey] = pointerObj;
                }
              });
              return true;
            }
          }
        }
      } catch (apiErr) {
        console.warn('Endpoint /api/deepseek-generate-pointers failed for batch, trying direct API...', apiErr);
      }

      // 2. Direct DeepSeek API fallback (if user has API key in localStorage or passed)
      if (activeApiKey && activeApiKey.trim() !== '') {
        try {
          const formattedQuestionsList = batchQuestions
            .map((b, localIdx) => {
              let item = `[QUESTION ITEM #${localIdx + 1}] ID: ${b.question.id !== undefined ? b.question.id : b.globalIndex}`;
              if (b.question.examYear) item += ` [${b.question.examYear}]`;
              if (b.question.marks) item += ` [${b.question.marks}]`;
              item += `\nQuestion: ${b.question.questionText}`;
              if (b.question.solution && b.question.solution.trim()) {
                item += `\nReference: ${b.question.solution.slice(0, 300)}`;
              }
              return item;
            })
            .join('\n\n');

          const systemPrompt = `You are an expert university professor for ${params.subject}.
Write authentic, human-crafted lecture slide answers for previous year university examination questions.
NO AI TEMPLATES, NO ROBOTIC LABELS, NO GENERIC ROADMAPS.
Each slide must contain pure, high-yield, authoritative bullet pointers directly answering the question.

Rules for Pointers:
1. Every pointer MUST start with a **Bold Anchor** (e.g. "**Core Definition:** ...", "**Layer Invariant:** ...", "**State Transitions:** ...", "**Hardware Boundary:** ...", "**Key Formula:** ...", "**Professor Exam Tip:** ...").
2. Answer the EXACT specific question asked. Do not wander or give generic textbook filler.
3. For each question, divide the answer across 1 or 2 clean slides (4-6 pointers per slide) so text is spacious, readable, and never crowded.
4. Slide 1 starts with the direct, authoritative core answer/definition pointer, followed by technical mechanisms.
5. Slide 2 (if needed) covers working invariants, trade-offs, governing mathematical expressions/formulas, and practical examination tips.
6. CRITICAL: You MUST include the exact "id" from input in your output object so questions and answers map 100% accurately.

RETURN ONLY VALID JSON:
{"results": [{"id": "<exact ID from question input>", "questionText": "<exact question statement>", "coreConcept": "...", "isTheory": true, "slides": [{"part": 1, "bullets": ["**Anchor:** detail"]}]}]}`;

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
                { role: 'user', content: `Generate structured professor lecture notes and solutions for:\n${formattedQuestionsList}` },
              ],
              temperature: 0.25,
              max_tokens: 8192,
              response_format: { type: 'json_object' },
            }),
          });

          if (directRes.ok) {
            const directData = await directRes.json();
            const content = directData.choices?.[0]?.message?.content;
            if (content) {
              const parsedRes = this.safeParseJsonWithRepair(content);
              if (parsedRes.success && parsedRes.data) {
                const parsed = parsedRes.data;
                const list: any[] = Array.isArray(parsed)
                  ? parsed
                  : Array.isArray(parsed.results)
                  ? parsed.results
                  : Object.values(parsed.results || parsed);

                list.forEach((item: any, itemIdx: number) => {
                  let matched = batchQuestions.find(
                    (b) => item.id !== undefined && b.question.id !== undefined && String(b.question.id).trim() === String(item.id).trim()
                  );

                  if (!matched && (item.questionText || item.question)) {
                    const itemQKey = this.getQuestionKey(item.questionText || item.question);
                    matched = batchQuestions.find(
                      (b) => this.getQuestionKey(b.question.questionText) === itemQKey
                    );
                  }

                  if (!matched && typeof item.questionIndex === 'number') {
                    if (item.questionIndex >= 1 && item.questionIndex <= batchQuestions.length) {
                      matched = batchQuestions[item.questionIndex - 1];
                    } else if (item.questionIndex >= 0 && item.questionIndex < batchQuestions.length) {
                      matched = batchQuestions[item.questionIndex];
                    }
                  }

                  if (!matched && itemIdx < batchQuestions.length) {
                    matched = batchQuestions[itemIdx];
                  }

                  if (!matched) return;

                  const globalIdx = matched.globalIndex;
                  let slides: AnswerSlideContent[] = [];
                  if (Array.isArray(item.slides) && item.slides.length > 0) {
                    slides = item.slides.map((s: any) => ({
                      slideTitle: s.slideTitle || null,
                      identifiedSolution: s.identifiedSolution || null,
                      definition: s.definition || null,
                      bullets: Array.isArray(s.bullets) ? s.bullets.map((b: string) => b.replace(/^Milestone\s*\d+[:.-]?\s*/i, '').trim()).filter((b: string) => b.length > 0) : [],
                      formulaOrCode: s.formulaOrCode || s.formulaOrResult || null,
                      professorNote: s.professorNote || null,
                    }));
                  } else {
                    const legacyPointers = Array.isArray(item.pointers) ? item.pointers : [];
                    slides = [{
                      identifiedSolution: item.identifiedSolution || null,
                      definition: item.definition || null,
                      bullets: legacyPointers.map((p: string) => p.replace(/^Milestone\s*\d+[:.-]?\s*/i, '').trim()).filter((p: string) => p.length > 0),
                      formulaOrCode: item.formulaOrResult || item.formulaOrCode || null,
                      professorNote: item.professorNote || null,
                    }];
                  }

                  const firstSlide = slides[0] || { bullets: [] };
                  const pointerObj: AnswerPointersData = {
                    coreConcept: item.coreConcept || 'Solution & Concept Analysis',
                    isTheory: typeof item.isTheory === 'boolean' ? item.isTheory : false,
                    identifiedSolution: firstSlide.identifiedSolution || undefined,
                    definition: firstSlide.definition || undefined,
                    pointers: firstSlide.bullets.length > 0 ? firstSlide.bullets : ['Identify parameters.', 'Apply governing invariant.', 'Verify result.'],
                    formulaOrResult: firstSlide.formulaOrCode || undefined,
                    professorNote: slides[slides.length - 1]?.professorNote || undefined,
                    slides,
                  };

                  pointersMap[globalIdx] = pointerObj;
                  if (matched.question.id !== undefined) {
                    pointersMap[String(matched.question.id)] = pointerObj;
                  }
                  if (matched.question.questionText) {
                    const qKey = this.getQuestionKey(matched.question.questionText);
                    if (qKey) pointersMap[qKey] = pointerObj;
                  }
                });
                return true;
              }
            }
          }
        } catch (directErr) {
          console.warn('Direct DeepSeek call failed for batch:', directErr);
        }
      }

      return false;
    };

    // Split all questions into batches of BATCH_SIZE (5)
    const batches: Array<Array<{ question: typeof params.questions[0]; globalIndex: number }>> = [];
    for (let i = 0; i < totalQuestions; i += BATCH_SIZE) {
      const slice = params.questions.slice(i, i + BATCH_SIZE).map((q, idx) => ({
        question: q,
        globalIndex: i + idx,
      }));
      batches.push(slice);
    }

    // Process batches sequentially
    for (let bIdx = 0; bIdx < batches.length; bIdx++) {
      const batch = batches[bIdx];
      await processBatch(batch);
      if (params.onProgress) {
        params.onProgress(Math.min((bIdx + 1) * BATCH_SIZE, totalQuestions), totalQuestions);
      }
    }

    // 3. Fallback for any questions that weren't returned by DeepSeek:
    // Generate deterministic high-yield lecture pointers so 100% of questions are populated!
    params.questions.forEach((q, globalIdx) => {
      const qKey = this.getQuestionKey(q.questionText);
      const hasMatch = pointersMap[globalIdx] || (q.id !== undefined && pointersMap[String(q.id)]) || (qKey && pointersMap[qKey]);
      if (!hasMatch) {
        const fallback = this.formatSolutionIntoPointers(q.solution, q.questionText, q.topic);
        fallback.examYear = q.examYear;
        fallback.marks = q.marks;
        pointersMap[globalIdx] = fallback;
        if (q.id !== undefined) pointersMap[String(q.id)] = fallback;
        if (qKey) pointersMap[qKey] = fallback;
      }
    });

    return { success: true, pointersMap };
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
    unitWiseSyllabusOrder?: Record<string, string[]>;
    includeUnitDividers?: boolean;
    includeTopicDividers?: boolean;
    addBlankPagesPerQuestion?: boolean;
    blankPagesCount?: number;
    generateAnswerPointers?: boolean;
    answersPlacement?: 'integrated_same_slide' | 'after_question' | 'end_of_deck' | 'none';
    deepSeekPointersMap?: Record<string | number, AnswerPointersData>;
  }): AiGeneratedDeck {
    const {
      subject,
      deckTitle = `${subject} - Previous Year Questions (PYQs)`,
      pyqs,
      syllabusTopicsOrder = [],
      unitWiseSyllabusOrder,
      includeUnitDividers = true,
      includeTopicDividers = true,
      addBlankPagesPerQuestion = true,
      blankPagesCount = 2,
      generateAnswerPointers = true,
      answersPlacement = 'after_question',
      deepSeekPointersMap,
    } = params;

    const unitGroups = this.groupAndSortPyqsByUnitAndTopic(pyqs, syllabusTopicsOrder, unitWiseSyllabusOrder);
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
        `Structure: Separate Question, Blank Derivation & Solution Slides ${addBlankPagesPerQuestion ? `• ${blankPagesCount} Working Sheets/Q` : ''}`,
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
        const normUnit = AiPptService.normalizeUnitNumber(uGroup.unitNumber);
        const definedUnitTopics = (unitWiseSyllabusOrder && (unitWiseSyllabusOrder[uGroup.unitNumber] || unitWiseSyllabusOrder[normUnit])) || [];

        const topicsList = (definedUnitTopics && definedUnitTopics.length > 0)
          ? definedUnitTopics.map((t, idx) => {
              const matched = uGroup.topicGroups.find(
                (tg) => tg.topicName.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(tg.topicName.toLowerCase())
              );
              const qCount = matched ? matched.questions.length : 0;
              return `${String(idx + 1).padStart(2, '0')}. ${t}${qCount > 0 ? ` (${qCount} ${qCount === 1 ? 'PYQ' : 'PYQs'})` : ''}`;
            })
          : uGroup.topicGroups.map((tg, idx) => `${String(idx + 1).padStart(2, '0')}. ${tg.topicName} (${tg.questions.length} ${tg.questions.length === 1 ? 'PYQ' : 'PYQs'})`);

        slides.push({
          slideNumber: slideCounter++,
          type: 'unit_divider',
          unitBadge: uGroup.unitNumber,
          topicBadge: 'MODULE CURRICULUM',
          badge: `${uGroup.unitNumber} • MODULE CURRICULUM`,
          title: `${uGroup.unitNumber} : COURSE MODULE REVIEW`,
          subtitle: `${subject} • ${uGroup.totalQuestions} Solved Problem Sets`,
          bullets: topicsList,
          calloutTip: `University Examination Preparation • Standard Academic Syllabus Sequence`,
        });
      }

      // 2b. Iterate Topic Groups inside this Unit
      uGroup.topicGroups.forEach((tGroup) => {
        // Topic Section Divider Slide
        if (includeTopicDividers) {
          const questionExamYears = tGroup.questions.map(
            (q, idx) => `Prob #${idx + 1}: ${this.formatExamYearAndMonth(q.yearExam) || q.yearExam || 'Exam PYQ'}${q.marks ? ` [${q.marks}]` : ''} — ${q.questionText.slice(0, 58)}...`
          );

          slides.push({
            slideNumber: slideCounter++,
            type: 'topic_divider',
            unitBadge: uGroup.unitNumber,
            topicBadge: tGroup.topicName,
            badge: `${uGroup.unitNumber} • ${tGroup.topicName}`,
            title: tGroup.topicName,
            subtitle: `Problem Set (${tGroup.questions.length} ${tGroup.questions.length === 1 ? 'Question' : 'Questions'}) • ${subject}`,
            bullets: questionExamYears,
            calloutTip: `Focus: Core Analytical Formulations, Proofs & Working Derivations`,
          });
        }

        // 2c. Question Slides for this Topic
        tGroup.questions.forEach((pyq, qIdxInTopic) => {
          const currentQNum = globalQuestionCounter;
          const qKey = this.getQuestionKey(pyq.questionText);
          const deepSeekItem =
            (pyq.id && (deepSeekPointersMap as any)?.[pyq.id]) ||
            (qKey && (deepSeekPointersMap as any)?.[qKey]);

          const pointersData: AnswerPointersData = deepSeekItem
            ? {
                coreConcept: deepSeekItem.coreConcept,
                isTheory: deepSeekItem.isTheory,
                identifiedSolution: deepSeekItem.identifiedSolution,
                definition: deepSeekItem.definition,
                pointers: deepSeekItem.pointers,
                formulaOrResult: deepSeekItem.formulaOrResult,
                professorNote: deepSeekItem.professorNote || deepSeekItem.commonPitfall,
                commonPitfall: deepSeekItem.professorNote || deepSeekItem.commonPitfall,
                examYear: pyq.yearExam,
                marks: pyq.marks,
                slides: deepSeekItem.slides,
              }
            : this.formatSolutionIntoPointers(pyq.solution, pyq.questionText, tGroup.topicName);

          if (!deepSeekItem) {
            pointersData.examYear = pyq.yearExam;
            pointersData.marks = pyq.marks;
          }

          // Clean month and year only (e.g. "November 2023", not the full exam name)
          const cleanExamYear = this.formatExamYearAndMonth(pyq.yearExam);

          // (i) QUESTION SLIDE — Dedicated solely to the Question (Answer starts from another slide!)
          slides.push({
            slideNumber: slideCounter++,
            type: 'direct_pyq',
            unitBadge: uGroup.unitNumber,
            topicBadge: tGroup.topicName,
            badge: `${uGroup.unitNumber} • ${tGroup.topicName}`,
            title: `Problem #${currentQNum}${tGroup.questions.length > 1 ? ` (${qIdxInTopic + 1} of ${tGroup.questions.length})` : ''}`,
            subtitle: cleanExamYear ? `${cleanExamYear}${pyq.marks ? ` • Weightage: ${pyq.marks}` : ''}` : undefined,
            questionNumber: currentQNum,
            questionReference: pyq.questionText,
            answerPointers: undefined, // Pure question slide — answers start on separate slide
            pyqDetails: {
              examYear: cleanExamYear || pyq.yearExam,
              marks: pyq.marks,
              question: pyq.questionText,
              stepByStepSolution: (answersPlacement as any) === 'integrated_same_slide' && pyq.solution ? [pyq.solution] : undefined,
              keyTakeaway: pointersData.formulaOrResult || pointersData.identifiedSolution,
            },
            calloutTip: `${uGroup.unitNumber} • Topic: ${tGroup.topicName} • Problem #${currentQNum}`,
          });

          // (ii) ADD BLANK PAGES PER QUESTION (Default 2 pages for live digital pen derivation)
          // Blank pages are completely empty — pure canvas for stylus derivation
          if (addBlankPagesPerQuestion) {
            const numPages = Math.max(1, Math.min(5, blankPagesCount || 2));
            for (let page = 1; page <= numPages; page++) {
              slides.push({
                slideNumber: slideCounter++,
                type: 'blank_workspace',
                unitBadge: uGroup.unitNumber,
                topicBadge: tGroup.topicName,
                title: '',  // Pure blank — no text in exports
                workspacePage: page,
                workspaceTotalPages: numPages,
                questionNumber: currentQNum,
              });
            }
          }

          // (iii) ANSWER SLIDES: Starts from another slide, and can take multiple slides as well
          if (generateAnswerPointers && (answersPlacement === 'after_question' || answersPlacement === 'end_of_deck')) {
            let answerSlides = pointersData.slides && pointersData.slides.length > 0
              ? pointersData.slides
              : [];

            if (answerSlides.length === 0) {
              if (pointersData.pointers.length >= 4 || (pointersData.identifiedSolution && (pointersData.formulaOrResult || pointersData.professorNote))) {
                const half = Math.ceil(pointersData.pointers.length / 2);
                answerSlides = [
                  {
                    slideTitle: 'Part 1: Key Principles & Approach',
                    identifiedSolution: pointersData.identifiedSolution,
                    definition: pointersData.definition,
                    bullets: pointersData.pointers.slice(0, half),
                    formulaOrCode: null,
                    professorNote: null,
                  },
                  {
                    slideTitle: 'Part 2: Invariants & Analysis',
                    identifiedSolution: null,
                    definition: null,
                    bullets: pointersData.pointers.slice(half),
                    formulaOrCode: pointersData.formulaOrResult,
                    professorNote: pointersData.professorNote || pointersData.commonPitfall,
                  }
                ];
              } else {
                answerSlides = [{
                  identifiedSolution: pointersData.identifiedSolution,
                  definition: pointersData.definition,
                  bullets: pointersData.pointers,
                  formulaOrCode: pointersData.formulaOrResult,
                  professorNote: pointersData.professorNote || pointersData.commonPitfall,
                }];
              }
            }

            answerSlides.forEach((aSlide, aSlideIdx) => {
              // Flatten all slide elements into a clean, natural list of authoritative pointers
              const slidePointers: string[] = [];

              if (aSlide.identifiedSolution) {
                slidePointers.push(`**Core Answer:** ${aSlide.identifiedSolution}`);
              }
              if (aSlide.definition) {
                slidePointers.push(`**Definition:** ${aSlide.definition}`);
              }
              if (aSlide.bullets && aSlide.bullets.length > 0) {
                aSlide.bullets.forEach((b) => {
                  const cleanB = b.replace(/^(?:Milestone\s*\d+[:.-]?|Step\s*\d+[:.-]?)\s*/i, '').trim();
                  if (cleanB) slidePointers.push(cleanB);
                });
              }
              if (aSlide.formulaOrCode) {
                slidePointers.push(`**Governing Invariant / Formula:** ${aSlide.formulaOrCode}`);
              }
              if (aSlide.professorNote) {
                slidePointers.push(`**Examination Note:** ${aSlide.professorNote}`);
              }

              const slideSuffix = answerSlides.length > 1
                ? ` (Part ${aSlideIdx + 1} of ${answerSlides.length})`
                : '';
              const cleanSnippet = pyq.questionText.length > 85 ? pyq.questionText.slice(0, 82) + '...' : pyq.questionText;

              const emittedSlide: AiSlide = {
                slideNumber: slideCounter++,
                type: 'answer_pointers',
                unitBadge: uGroup.unitNumber,
                topicBadge: tGroup.topicName,
                badge: cleanExamYear ? `${cleanExamYear}${pyq.marks ? ` • Weightage: ${pyq.marks}` : ''}` : 'EXAMINATION ANSWER',
                title: `Problem #${currentQNum}: ${cleanSnippet}`,
                subtitle: cleanExamYear ? `${cleanExamYear}${pyq.marks ? ` • Weightage: ${pyq.marks}` : ''}${slideSuffix}` : slideSuffix,
                questionNumber: currentQNum,
                questionReference: pyq.questionText,
                pyqDetails: {
                  examYear: cleanExamYear || pyq.yearExam,
                  marks: pyq.marks,
                  question: pyq.questionText,
                },
                answerSlideIndex: aSlideIdx,
                answerSlideTotalCount: answerSlides.length,
                bullets: slidePointers,
                calloutTip: `${uGroup.unitNumber} • Topic: ${tGroup.topicName} • Problem #${currentQNum} Solution`,
                answerPointers: {
                  coreConcept: pointersData.coreConcept,
                  isTheory: pointersData.isTheory,
                  pointers: slidePointers,
                  examYear: cleanExamYear || pyq.yearExam,
                  marks: pyq.marks,
                  slides: answerSlides,
                },
              };

              if (answersPlacement === 'after_question') {
                slides.push(emittedSlide);
              } else if (answersPlacement === 'end_of_deck') {
                endDeckAnswerPointers.push(emittedSlide);
              }
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
        unitBadge: 'SOLUTIONS',
        topicBadge: 'EXAMINATION ANSWER DIRECTORY',
        badge: 'PART II: SOLUTIONS APPENDIX',
        title: 'Complete Solutions & Conceptual Notes',
        subtitle: `Separate Reference Section • ${endDeckAnswerPointers.length} Solved Problem Sets`,
        bullets: [
          'Identified Solutions and Key Theoretical Definitions Upfront',
          'Core Mathematical Formulations & Algorithmic Invariants',
          'High-Yield Faculty Teaching Pointers & Examination Tips',
        ],
        calloutTip: 'Apna Engineering Wallah • Faculty Solution Directory',
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
   * Parses raw pasted text into individual PYQ items, extracting
   * embedded Year of Question, Marks, and Solution if present.
   */
  parsePyqsFromText(rawText: string): PyqItem[] {
    if (!rawText || !rawText.trim()) return [];
    
    // Split by question numbers like "1.", "Q1:", "Question 1", or double linebreaks
    const chunks = rawText
      .split(/\n(?=(?:Q\d+[:.]|\d+[.)]|Question\s*\d+[:.]))/i)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);

    const items = (chunks.length <= 1 && rawText.includes('\n\n'))
      ? rawText.split(/\n\s*\n/).map((s) => s.trim()).filter((s) => s.length > 5)
      : chunks;

    return items.map((rawQ, idx) => {
      const embedded = this.extractEmbeddedPyqMetadata(rawQ);
      return {
        questionText: embedded.cleanQuestionText,
        yearExam: embedded.extractedYearExam || `PYQ #${idx + 1}`,
        marks: embedded.extractedMarks,
        solution: embedded.extractedSolution,
      };
    });
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

      // Pure blank workspace: skip ALL common header/breadcrumb — 100% clean canvas
      if (slide.type === 'blank_workspace') {
        // Absolutely nothing added — pure background fill only
        return;
      }

      // Top Breadcrumb Bar for Slides 2..N: Display Unit Number in Top-Left, Topic Name in Top-Right
      const rawUnit = slide.unitBadge || (slide.badge && slide.badge.includes('•') ? slide.badge.split('•')[0].trim() : '') || deck.unit || '';
      const rawTopic = slide.topicBadge || (slide.badge && slide.badge.includes('•') ? slide.badge.split('•')[1].trim() : (slide.badge && slide.badge !== 'CONCEPT' && slide.badge !== 'QUESTION' ? slide.badge : '')) || deck.topicTitle || '';
      const unitText = rawUnit ? rawUnit.toUpperCase() : '';
      const topicText = rawTopic ? rawTopic.toUpperCase() : '';

      // Top-Left: Unit Number
      if (unitText) {
        pptSlide.addText(unitText, {
          x: 0.8,
          y: 0.38,
          w: 3.5,
          h: 0.3,
          fontSize: 10.5,
          bold: true,
          color: themeColors.accentPrimary,
          fontFace: 'Arial',
          align: 'left',
        });
      }

      // Top-Right: Topic Name
      if (topicText) {
        const topicFontSize = topicText.length > 50 ? 8.5 : 10;
        pptSlide.addText(topicText, {
          x: 4.4,
          y: 0.38,
          w: 4.8,
          h: 0.3,
          fontSize: topicFontSize,
          bold: true,
          color: themeColors.accentSecondary,
          fontFace: 'Arial',
          align: 'right',
        });
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
        const hasIntegratedPointers = Boolean(slide.answerPointers && slide.answerPointers.pointers && slide.answerPointers.pointers.length > 0);
        const hasInlineSolution = Boolean(slide.pyqDetails.stepByStepSolution && slide.pyqDetails.stepByStepSolution.length > 0);
        const showAnswerOnSlide = hasIntegratedPointers || hasInlineSolution;
        
        const qText = (slide.pyqDetails.question || '').trim();
        const qLen = qText.length;

        // Proportional card height — question should NOT take full screen!
        let qBoxHeight: number;
        if (showAnswerOnSlide) {
          qBoxHeight = 1.65;
        } else {
          // Compact, well-proportioned card height based on question length (never fills entire screen)
          if (qLen < 120) {
            qBoxHeight = 1.45;
          } else if (qLen < 260) {
            qBoxHeight = 1.85;
          } else if (qLen < 420) {
            qBoxHeight = 2.25;
          } else {
            qBoxHeight = 2.65;
          }
        }

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

        // Exam Year & Tag pill inside card (only if not already cleanly shown in subtitle)
        const hasSubtitleMeta = Boolean(slide.subtitle && (slide.subtitle.toLowerCase().includes('weightage') || slide.subtitle.toLowerCase().includes('20')));
        const showCardTag = !hasSubtitleMeta && Boolean(slide.pyqDetails.examYear || slide.pyqDetails.marks);

        if (showCardTag) {
          const cleanYear = this.formatExamYearAndMonth(slide.pyqDetails.examYear);
          pptSlide.addText(
            `📝 Exam Question${cleanYear ? `: ${cleanYear}` : ''}${slide.pyqDetails.marks ? ` • Weightage: ${slide.pyqDetails.marks}` : ''}`,
            {
              x: 1.0,
              y: contentStartY + 0.1,
              w: 8.0,
              h: 0.26,
              fontSize: 10,
              bold: true,
              color: themeColors.accentSecondary,
              fontFace: 'Arial',
            }
          );
        }

        // Full Question Statement
        const qTextY = contentStartY + (showCardTag ? 0.38 : 0.20);
        const qTextH = qBoxHeight - (showCardTag ? 0.48 : 0.30);
        const qFontSize = showAnswerOnSlide ? 12 : (qLen < 140 ? 15 : (qLen < 280 ? 13.5 : 12));

        pptSlide.addText(qText, {
          x: 1.0,
          y: qTextY,
          w: 8.0,
          h: qTextH,
          fontSize: qFontSize,
          bold: true,
          color: themeColors.textPrimary,
          fontFace: 'Arial',
          lineSpacing: showAnswerOnSlide ? 16 : 22,
          valign: 'top',
        });

        // If integrated answer pointers exist: Render the complete, sober, professional solution on the SAME SLIDE!
        if (hasIntegratedPointers && slide.answerPointers) {
          const ap = slide.answerPointers;
          const solStartY = contentStartY + 1.78;
          const solHeight = 5.20 - solStartY;

          // Left Box: Identified Solution & Analytical Pointers
          const hasRightInfo = Boolean(ap.formulaOrResult || ap.professorNote || ap.commonPitfall);
          const leftW = hasRightInfo ? 5.3 : 8.4;

          pptSlide.addShape(pptx.ShapeType.roundRect, {
            x: 0.8,
            y: solStartY,
            w: leftW,
            h: solHeight,
            fill: { color: themeColors.cardBg },
            line: { color: themeColors.accentPrimary, width: 1 },
            rectRadius: 0.08,
          });

          // Solution Title Pill
          pptSlide.addText(
            `🎯 Solution & Key Principles: ${ap.identifiedSolution ? (ap.identifiedSolution.length > 70 ? ap.identifiedSolution.slice(0, 68) + '...' : ap.identifiedSolution) : 'Core Technical Invariants'}`,
            {
              x: 1.0,
              y: solStartY + 0.08,
              w: leftW - 0.4,
              h: 0.22,
              fontSize: 9.5,
              bold: true,
              color: themeColors.accentSecondary,
              fontFace: 'Arial',
            }
          );

          // Pointers
          const bulletLines = ap.pointers.slice(0, 4).map((p) => `• ${p.replace(/\*\*/g, '').replace(/^(?:Milestone\s*\d+[:.-]?|Step\s*\d+[:.-]?)\s*/i, '').trim()}`).join('\n\n');
          pptSlide.addText(bulletLines, {
            x: 1.0,
            y: solStartY + 0.32,
            w: leftW - 0.4,
            h: solHeight - 0.40,
            fontSize: 9.5,
            color: themeColors.textPrimary,
            fontFace: 'Arial',
            lineSpacing: 13,
          });

          // Right Box: Formula / Bound & Professor Note
          if (hasRightInfo) {
            const rightX = 6.35;
            const rightW = 2.85;
            const hasFormula = Boolean(ap.formulaOrResult);
            const hasNote = Boolean(ap.professorNote || ap.commonPitfall);
            const fH = (hasFormula && hasNote) ? 0.95 : hasFormula ? solHeight : 0;
            const nH = (hasFormula && hasNote) ? (solHeight - fH - 0.1) : hasNote ? solHeight : 0;

            if (hasFormula) {
              pptSlide.addShape(pptx.ShapeType.roundRect, {
                x: rightX,
                y: solStartY,
                w: rightW,
                h: fH,
                fill: { color: themeColors.codeBg },
                line: { color: themeColors.accentPrimary, width: 0.8 },
                rectRadius: 0.06,
              });

              pptSlide.addText(`Formula / Bound:\n${ap.formulaOrResult}`, {
                x: rightX + 0.12,
                y: solStartY + 0.08,
                w: rightW - 0.24,
                h: fH - 0.16,
                fontSize: 9,
                bold: true,
                color: themeColors.accentSecondary,
                fontFace: 'Arial',
              });
            }

            if (hasNote) {
              const noteY = solStartY + (hasFormula ? fH + 0.1 : 0);
              pptSlide.addShape(pptx.ShapeType.roundRect, {
                x: rightX,
                y: noteY,
                w: rightW,
                h: nH,
                fill: { color: themeColors.cardBg },
                line: { color: themeColors.cardBorder, width: 0.8 },
                rectRadius: 0.06,
              });

              pptSlide.addText(`💡 Faculty Exam Note:\n${ap.professorNote || ap.commonPitfall}`, {
                x: rightX + 0.12,
                y: noteY + 0.08,
                w: rightW - 0.24,
                h: nH - 0.16,
                fontSize: 8.5,
                color: themeColors.textSecondary,
                fontFace: 'Arial',
                lineSpacing: 12,
              });
            }
          }
        } else if (hasInlineSolution) {
          pptSlide.addShape(pptx.ShapeType.roundRect, {
            x: 0.8,
            y: contentStartY + 1.78,
            w: 8.4,
            h: 1.55,
            fill: { color: themeColors.cardBg },
            line: { color: themeColors.accentPrimary, width: 1 },
            rectRadius: 0.08,
          });

          const solText = slide.pyqDetails.stepByStepSolution!.join('\n');
          pptSlide.addText(`💡 Faculty Notes & Solution Derivation:\n${solText}`, {
            x: 1.0,
            y: contentStartY + 1.88,
            w: 8.0,
            h: 1.30,
            fontSize: 10,
            color: themeColors.textSecondary,
            fontFace: 'Arial',
            lineSpacing: 14,
          });
        }
      }

      // ── 4b. TYPE: BLANK WORKSPACE / LIVE SOLVING SHEET ─────────────────
      else if (slide.type === 'blank_workspace') {
        // Pure blank canvas — no text, no shapes, no dashed borders.
        // The slide has only the background fill so the faculty can derive freely with a stylus.
        // (Background is already set by the global pptSlide background above.)
      }

      // ── 4c. TYPE: ANSWER & EXPLANATION (HUMAN-MADE, NON-TEMPLATE, PURE POINTERS) ──
      else if (slide.type === 'answer_pointers' && (slide.answerPointers || slide.bullets)) {
        const pointersList = slide.answerPointers?.pointers || slide.bullets || [];
        const curY = contentStartY;
        const maxCardHeight = Math.max(2.4, Math.min(3.10, 4.85 - curY));

        // Clean Pointers Presentation Container (Starts right under title/subtitle with maximum vertical space)
        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: curY,
          w: 8.4,
          h: maxCardHeight,
          fill: { color: themeColors.cardBg },
          line: { color: themeColors.cardBorder, width: 1 },
          rectRadius: 0.08,
        });

        // Dynamic font sizing & line spacing based on text length to prevent overflow
        const totalChars = pointersList.reduce((acc, p) => acc + p.length, 0);
        const fontSize = pointersList.length >= 5 || totalChars > 400 ? 10 : pointersList.length >= 4 ? 10.5 : 11.5;
        const lineSpacing = pointersList.length >= 5 || totalChars > 400 ? 13 : pointersList.length >= 4 ? 14 : 16;
        const paraGap = pointersList.length >= 5 ? '\n' : '\n\n';

        const textRuns: any[] = [];
        pointersList.forEach((p, idx) => {
          const clean = p.replace(/^(?:Milestone\s*\d+[:.-]?|Step\s*\d+[:.-]?)\s*/i, '').trim();
          const boldMatch = clean.match(/^\*\*([^*]+)\*\*[:\s]*(.*)/s);
          const prefix = (idx > 0 ? paraGap : '') + '•  ';

          if (boldMatch) {
            textRuns.push({
              text: prefix + boldMatch[1].trim() + ': ',
              options: {
                bold: true,
                color: themeColors.accentSecondary || themeColors.textPrimary,
                fontSize,
              },
            });
            textRuns.push({
              text: boldMatch[2].trim().replace(/\*\*/g, ''),
              options: {
                bold: false,
                color: themeColors.textPrimary,
                fontSize,
              },
            });
          } else {
            textRuns.push({
              text: prefix + clean.replace(/\*\*/g, ''),
              options: {
                bold: false,
                color: themeColors.textPrimary,
                fontSize,
              },
            });
          }
        });

        pptSlide.addText(textRuns, {
          x: 1.05,
          y: curY + 0.16,
          w: 7.9,
          h: maxCardHeight - 0.32,
          fontFace: 'Arial',
          lineSpacing,
        });
      }

      // ── 5. TYPE: FIRST PRINCIPLES / ANALOGY ─────────────────────────────
      else if (slide.type === 'first_principles') {
        // Top Intuition Analogy Container
        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: contentStartY,
          w: 8.4,
          h: 1.05,
          fill: { color: themeColors.badgeBg },
          line: { color: themeColors.accentPrimary, width: 1.2 },
          rectRadius: 0.1,
        });

        pptSlide.addText(`💡 Real-World Engineering Analogy (Intuition):\n${slide.analogy || slide.subtitle || 'Foundational conceptual model'}`, {
          x: 1.0,
          y: contentStartY + 0.1,
          w: 8.0,
          h: 0.85,
          fontSize: 11,
          color: themeColors.textPrimary,
          fontFace: 'Arial',
          lineSpacing: 15,
        });

        // Left Card: The Naive Approach / Failure Mode
        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: contentStartY + 1.15,
          w: 4.05,
          h: 2.15,
          fill: { color: themeColors.cardBg },
          line: { color: 'EF4444', width: 1 },
          rectRadius: 0.1,
        });

        pptSlide.addText('⚠️ Why Naive Approaches Fail (Motivation):', {
          x: 1.0,
          y: contentStartY + 1.25,
          w: 3.65,
          h: 0.3,
          fontSize: 11,
          bold: true,
          color: 'EF4444',
          fontFace: 'Arial',
        });

        const half = slide.bullets ? Math.ceil(slide.bullets.length / 2) : 0;
        const leftBullets = slide.bullets ? slide.bullets.slice(0, half) : [];
        const rightBullets = slide.bullets ? slide.bullets.slice(half) : [];

        pptSlide.addText(leftBullets.map((b) => `• ${b.replace(/\*\*/g, '')}`).join('\n\n'), {
          x: 1.0,
          y: contentStartY + 1.6,
          w: 3.65,
          h: 1.6,
          fontSize: 10,
          color: themeColors.textSecondary,
          fontFace: 'Arial',
          lineSpacing: 14,
        });

        // Right Card: First-Principles Breakthrough
        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 5.15,
          y: contentStartY + 1.15,
          w: 4.05,
          h: 2.15,
          fill: { color: themeColors.cardBg },
          line: { color: themeColors.accentSecondary, width: 1 },
          rectRadius: 0.1,
        });

        pptSlide.addText('⚡ First-Principles Breakthrough & Invariant:', {
          x: 5.35,
          y: contentStartY + 1.25,
          w: 3.65,
          h: 0.3,
          fontSize: 11,
          bold: true,
          color: themeColors.accentSecondary,
          fontFace: 'Arial',
        });

        pptSlide.addText(rightBullets.map((b) => `• ${b.replace(/\*\*/g, '')}`).join('\n\n'), {
          x: 5.35,
          y: contentStartY + 1.6,
          w: 3.65,
          h: 1.6,
          fontSize: 10,
          color: themeColors.textPrimary,
          fontFace: 'Arial',
          lineSpacing: 14,
        });
      }

      // ── 6. TYPE: CONCEPT CARD WITH CODE/FORMULA ─────────────────────────
      else if (slide.type === 'concept_card') {
        const hasCode = Boolean(slide.formulaOrCode);
        const leftW = hasCode ? 4.95 : 8.4;

        // Left Container: Theory & Invariant Principles
        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: contentStartY,
          w: leftW,
          h: 3.25,
          fill: { color: themeColors.cardBg },
          line: { color: themeColors.cardBorder, width: 1.2 },
          rectRadius: 0.1,
        });

        pptSlide.addText('Core Formulation & Invariant Principles:', {
          x: 1.0,
          y: contentStartY + 0.15,
          w: leftW - 0.4,
          h: 0.3,
          fontSize: 12,
          bold: true,
          color: themeColors.accentPrimary,
          fontFace: 'Arial',
        });

        if (slide.bullets && slide.bullets.length > 0) {
          pptSlide.addText(slide.bullets.map((b) => `• ${b.replace(/\*\*/g, '')}`).join('\n\n'), {
            x: 1.0,
            y: contentStartY + 0.55,
            w: leftW - 0.4,
            h: 2.5,
            fontSize: 10.5,
            color: themeColors.textPrimary,
            fontFace: 'Arial',
            lineSpacing: 16,
          });
        }

        // Right Container: Code / Formula Container
        if (hasCode) {
          pptSlide.addShape(pptx.ShapeType.roundRect, {
            x: 5.95,
            y: contentStartY,
            w: 3.25,
            h: 3.25,
            fill: { color: themeColors.codeBg },
            line: { color: themeColors.accentPrimary, width: 1.2 },
            rectRadius: 0.1,
          });

          pptSlide.addText('Formal Definition / Invariant Code:', {
            x: 6.15,
            y: contentStartY + 0.15,
            w: 2.85,
            h: 0.28,
            fontSize: 10,
            bold: true,
            color: themeColors.accentSecondary,
            fontFace: 'Arial',
          });

          pptSlide.addText(slide.formulaOrCode!, {
            x: 6.15,
            y: contentStartY + 0.5,
            w: 2.85,
            h: 2.55,
            fontSize: 9.5,
            color: themeColors.textPrimary,
            fontFace: 'Courier New',
            lineSpacing: 13,
          });
        }
      }

      // ── 7. TYPE: TWO COLUMN COMPARISON ─────────────────────────────────
      else if (slide.type === 'two_column') {
        // Left Column Box
        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: contentStartY,
          w: 4.05,
          h: 3.25,
          fill: { color: themeColors.cardBg },
          line: { color: themeColors.accentPrimary, width: 1.2 },
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
            h: 2.55,
            fontSize: 10.5,
            color: themeColors.textSecondary,
            fontFace: 'Arial',
            lineSpacing: 15,
          });
        }

        // Right Column Box
        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 5.15,
          y: contentStartY,
          w: 4.05,
          h: 3.25,
          fill: { color: themeColors.cardBg },
          line: { color: themeColors.accentSecondary, width: 1.2 },
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
            h: 2.55,
            fontSize: 10.5,
            color: themeColors.textSecondary,
            fontFace: 'Arial',
            lineSpacing: 15,
          });
        }
      }

      // ── 8. TYPE: STEP BY STEP PROCEDURE ────────────────────────────────
      else if (slide.type === 'step_by_step') {
        const hasCode = Boolean(slide.formulaOrCode);
        const mainW = hasCode ? 5.15 : 8.4;

        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: contentStartY,
          w: mainW,
          h: 3.25,
          fill: { color: themeColors.cardBg },
          line: { color: themeColors.cardBorder, width: 1.2 },
          rectRadius: 0.1,
        });

        pptSlide.addText('Algorithmic State Transition & Execution Steps:', {
          x: 1.0,
          y: contentStartY + 0.15,
          w: mainW - 0.4,
          h: 0.3,
          fontSize: 12,
          bold: true,
          color: themeColors.accentSecondary,
          fontFace: 'Arial',
        });

        if (slide.bullets && slide.bullets.length > 0) {
          const stepBullets = slide.bullets.map((b, idx) => {
            const clean = b.replace(/\*\*/g, '');
            return clean.startsWith('Step') || clean.startsWith('Milestone') ? clean : `Step ${idx + 1}: ${clean}`;
          }).join('\n\n');

          pptSlide.addText(stepBullets, {
            x: 1.0,
            y: contentStartY + 0.55,
            w: mainW - 0.4,
            h: 2.55,
            fontSize: 10.5,
            color: themeColors.textPrimary,
            fontFace: 'Arial',
            lineSpacing: 16,
          });
        }

        if (hasCode) {
          pptSlide.addShape(pptx.ShapeType.roundRect, {
            x: 6.15,
            y: contentStartY,
            w: 3.05,
            h: 3.25,
            fill: { color: themeColors.codeBg },
            line: { color: themeColors.accentSecondary, width: 1.2 },
            rectRadius: 0.1,
          });

          pptSlide.addText('State Trace / Recurrence:', {
            x: 6.35,
            y: contentStartY + 0.15,
            w: 2.65,
            h: 0.28,
            fontSize: 10,
            bold: true,
            color: themeColors.accentSecondary,
            fontFace: 'Arial',
          });

          pptSlide.addText(slide.formulaOrCode!, {
            x: 6.35,
            y: contentStartY + 0.5,
            w: 2.65,
            h: 2.55,
            fontSize: 9.5,
            color: themeColors.textPrimary,
            fontFace: 'Courier New',
            lineSpacing: 13,
          });
        }
      }

      // ── 9. TYPE: SOLVED EXAMINATION PYQ ────────────────────────────────
      else if (slide.type === 'pyq_solution') {
        const details = slide.pyqDetails;

        // Top Exam Question Statement Box
        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: contentStartY,
          w: 8.4,
          h: 1.15,
          fill: { color: themeColors.cardBg },
          line: { color: themeColors.cardBorder, width: 1.2 },
          rectRadius: 0.08,
        });

        const cleanExamYear = details?.examYear ? this.formatExamYearAndMonth(details.examYear) : '';
        const qTag = cleanExamYear ? `📝 ${cleanExamYear}${details?.marks ? ` [${details.marks}]` : ''}` : (details?.examYear ? `📝 ${details.examYear}` : '📝 University Examination Problem');
        pptSlide.addText(qTag, {
          x: 1.0,
          y: contentStartY + 0.08,
          w: 8.0,
          h: 0.22,
          fontSize: 9.5,
          bold: true,
          color: themeColors.accentSecondary,
          fontFace: 'Arial',
        });

        pptSlide.addText(details?.question || slide.title, {
          x: 1.0,
          y: contentStartY + 0.32,
          w: 8.0,
          h: 0.75,
          fontSize: 11,
          bold: true,
          color: themeColors.textPrimary,
          fontFace: 'Arial',
          lineSpacing: 14,
        });

        // Bottom Left: Step-by-Step Worked Derivation
        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: contentStartY + 1.25,
          w: 5.15,
          h: 2.0,
          fill: { color: themeColors.cardBg },
          line: { color: themeColors.accentPrimary, width: 1.2 },
          rectRadius: 0.08,
        });

        pptSlide.addText('Step-by-Step Worked Derivation & Solution:', {
          x: 1.0,
          y: contentStartY + 1.35,
          w: 4.75,
          h: 0.25,
          fontSize: 10,
          bold: true,
          color: themeColors.accentPrimary,
          fontFace: 'Arial',
        });

        const solSteps = details?.stepByStepSolution || slide.bullets || [];
        const solText = solSteps.map((s, idx) => `Step ${idx + 1}: ${s.replace(/\*\*/g, '')}`).join('\n\n');

        pptSlide.addText(solText, {
          x: 1.0,
          y: contentStartY + 1.62,
          w: 4.75,
          h: 1.55,
          fontSize: 9.5,
          color: themeColors.textPrimary,
          fontFace: 'Arial',
          lineSpacing: 13,
        });

        // Bottom Right: Boxed Final Result & Rubric
        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 6.1,
          y: contentStartY + 1.25,
          w: 3.1,
          h: 2.0,
          fill: { color: themeColors.codeBg },
          line: { color: themeColors.accentSecondary, width: 1.2 },
          rectRadius: 0.08,
        });

        pptSlide.addText('Boxed Final Result & Invariants:', {
          x: 6.25,
          y: contentStartY + 1.35,
          w: 2.8,
          h: 0.25,
          fontSize: 10,
          bold: true,
          color: themeColors.accentSecondary,
          fontFace: 'Arial',
        });

        pptSlide.addText(details?.keyTakeaway || slide.formulaOrCode || 'Asymptotic Class Verified', {
          x: 6.25,
          y: contentStartY + 1.62,
          w: 2.8,
          h: 0.7,
          fontSize: 10,
          bold: true,
          color: themeColors.textPrimary,
          fontFace: 'Courier New',
        });

        pptSlide.addText('Chief Examiner Scoring:\n[20% Assumptions | 60% Trace | 20% Result]', {
          x: 6.25,
          y: contentStartY + 2.4,
          w: 2.8,
          h: 0.75,
          fontSize: 9,
          color: themeColors.textSecondary,
          fontFace: 'Arial',
        });
      }

      // ── 10. TYPE: COMMON MISTAKES / PITFALLS VS CORRECTIONS ─────────────
      else if (slide.type === 'common_mistakes') {
        const half = slide.bullets ? Math.ceil(slide.bullets.length / 2) : 0;
        const pitfalls = slide.bullets ? slide.bullets.slice(0, half) : [];
        const corrections = slide.bullets ? slide.bullets.slice(half) : [];

        // Left Container: Pitfalls (Red/Amber Border)
        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: contentStartY,
          w: 4.05,
          h: 3.25,
          fill: { color: themeColors.cardBg },
          line: { color: 'EF4444', width: 1.5 },
          rectRadius: 0.1,
        });

        pptSlide.addText('❌ Common Student Traps & Misconceptions:', {
          x: 1.0,
          y: contentStartY + 0.15,
          w: 3.65,
          h: 0.35,
          fontSize: 11.5,
          bold: true,
          color: 'EF4444',
          fontFace: 'Arial',
        });

        pptSlide.addText(pitfalls.map((b) => `• ${b.replace(/\*\*/g, '')}`).join('\n\n'), {
          x: 1.0,
          y: contentStartY + 0.55,
          w: 3.65,
          h: 2.55,
          fontSize: 10,
          color: themeColors.textSecondary,
          fontFace: 'Arial',
          lineSpacing: 15,
        });

        // Right Container: Corrections (Emerald Border)
        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 5.15,
          y: contentStartY,
          w: 4.05,
          h: 3.25,
          fill: { color: themeColors.cardBg },
          line: { color: '10B981', width: 1.5 },
          rectRadius: 0.1,
        });

        pptSlide.addText('✅ Chief Examiner Corrections & Invariants:', {
          x: 5.35,
          y: contentStartY + 0.15,
          w: 3.65,
          h: 0.35,
          fontSize: 11.5,
          bold: true,
          color: '10B981',
          fontFace: 'Arial',
        });

        pptSlide.addText(corrections.map((b) => `• ${b.replace(/\*\*/g, '')}`).join('\n\n'), {
          x: 5.35,
          y: contentStartY + 0.55,
          w: 3.65,
          h: 2.55,
          fontSize: 10,
          color: themeColors.textPrimary,
          fontFace: 'Arial',
          lineSpacing: 15,
        });
      }

      // ── 11. TYPE: SUMMARY / 3-PILLAR CHECKLIST ──────────────────────────
      else if (slide.type === 'summary') {
        const pillarW = 2.65;
        const gap = 0.22;
        const pillars = [
          { title: '1. Governing Theory', color: themeColors.accentPrimary, bullets: slide.bullets?.slice(0, 2) || [] },
          { title: '2. Complexity Bounds', color: themeColors.accentSecondary, bullets: slide.bullets?.slice(2, 4) || [] },
          { title: '3. Exam Checklist', color: 'F59E0B', bullets: slide.bullets?.slice(4) || [] },
        ];

        pillars.forEach((pillar, pIdx) => {
          const px = 0.8 + pIdx * (pillarW + gap);
          pptSlide.addShape(pptx.ShapeType.roundRect, {
            x: px,
            y: contentStartY,
            w: pillarW,
            h: 3.25,
            fill: { color: themeColors.cardBg },
            line: { color: pillar.color, width: 1.2 },
            rectRadius: 0.1,
          });

          pptSlide.addText(pillar.title, {
            x: px + 0.15,
            y: contentStartY + 0.15,
            w: pillarW - 0.3,
            h: 0.35,
            fontSize: 11,
            bold: true,
            color: pillar.color,
            fontFace: 'Arial',
          });

          pptSlide.addText(pillar.bullets.map((b) => `• ${b.replace(/\*\*/g, '')}`).join('\n\n'), {
            x: px + 0.15,
            y: contentStartY + 0.55,
            w: pillarW - 0.3,
            h: 2.55,
            fontSize: 9.5,
            color: themeColors.textPrimary,
            fontFace: 'Arial',
            lineSpacing: 14,
          });
        });
      }

      // ── 12. DEFAULT FALLBACK SLIDE ──────────────────────────────────────
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

      // Pure blank workspace — skip ALL text/shapes, just background fill
      if (slide.type === 'blank_workspace') {
        // Page background is already set above. Nothing else added.
        return;
      }

      // Header: Unit Number in Top-Left and Topic Name in Top-Right
      const rawUnit = slide.unitBadge || (slide.badge && slide.badge.includes('•') ? slide.badge.split('•')[0].trim() : '') || deck.unit || '';
      const rawTopic = slide.topicBadge || (slide.badge && slide.badge.includes('•') ? slide.badge.split('•')[1].trim() : (slide.badge && slide.badge !== 'CONCEPT' && slide.badge !== 'QUESTION' ? slide.badge : '')) || deck.topicTitle || '';
      const unitText = rawUnit ? rawUnit.toUpperCase() : '';
      const topicText = rawTopic ? rawTopic.toUpperCase() : '';

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      if (unitText) {
        doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
        doc.text(unitText, 20, 18);
      }
      if (topicText) {
        doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
        doc.text(topicText, 277, 18, { align: 'right' });
      }

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

      // Card Box (Proportional: Question slides shouldn't take full page)
      const isQuestionOnly = slide.type === 'direct_pyq' && !slide.answerPointers && !slide.pyqDetails?.stepByStepSolution;
      let cardHeight = 140;
      if (isQuestionOnly) {
        const qLen = (slide.pyqDetails?.question || '').length;
        cardHeight = qLen < 120 ? 44 : (qLen < 260 ? 60 : 80);
      }
      doc.setFillColor(cardBgRGB[0], cardBgRGB[1], cardBgRGB[2]);
      doc.roundedRect(20, contentY, 257, cardHeight, 3, 3, 'F');

      let currentY = contentY + 12;

      // ── 2. ANSWER & EXPLANATION (HUMAN-MADE, NON-TEMPLATE, PURE POINTERS) ──
      if (slide.type === 'answer_pointers' && (slide.answerPointers || slide.bullets)) {
        const pointersList = slide.answerPointers?.pointers || slide.bullets || [];
        const totalChars = pointersList.reduce((acc, p) => acc + p.length, 0);
        const fontSize = pointersList.length >= 5 || totalChars > 400 ? 9.5 : 10.5;
        const lineH = pointersList.length >= 5 || totalChars > 400 ? 5.0 : 5.8;

        doc.setFontSize(fontSize);

        pointersList.forEach((p) => {
          const cleanP = p.replace(/^(?:Milestone\s*\d+[:.-]?|Step\s*\d+[:.-]?)\s*/i, '').trim();
          const boldMatch = cleanP.match(/^\*\*([^*]+)\*\*[:\s]*(.*)/s);

          if (boldMatch) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
            const anchorText = `•  ${boldMatch[1].trim()}: `;
            doc.text(anchorText, 26, currentY);
            const anchorWidth = doc.getTextWidth(anchorText);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(textPrimaryRGB[0], textPrimaryRGB[1], textPrimaryRGB[2]);
            const detailText = boldMatch[2].trim().replace(/\*\*/g, '');
            const splitDetail = doc.splitTextToSize(detailText, 245 - anchorWidth);

            if (splitDetail.length > 0) {
              doc.text(splitDetail[0], 26 + anchorWidth, currentY);
              for (let i = 1; i < splitDetail.length; i++) {
                currentY += lineH;
                doc.text(splitDetail[i], 32, currentY);
              }
            }
            currentY += lineH + 3.0;
          } else {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(textPrimaryRGB[0], textPrimaryRGB[1], textPrimaryRGB[2]);
            const splitP = doc.splitTextToSize('•  ' + cleanP.replace(/\*\*/g, ''), 245);
            doc.text(splitP, 26, currentY);
            currentY += (splitP.length * lineH) + 3.0;
          }
        });
      }

      // ── 4. FIRST PRINCIPLES (Intuition + Failure vs Breakthrough) ────
      else if (slide.type === 'first_principles') {
        if (slide.analogy) {
          doc.setFillColor(isDark ? 11 : 238, isDark ? 15 : 242, isDark ? 25 : 255);
          doc.roundedRect(26, currentY, 245, 20, 2, 2, 'F');
          doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
          doc.setFontSize(9.5);
          doc.setFont('helvetica', 'bold');
          doc.text('💡 Real-World Engineering Analogy (Intuition):', 30, currentY + 7);
          doc.setTextColor(textPrimaryRGB[0], textPrimaryRGB[1], textPrimaryRGB[2]);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          const splitAnalogy = doc.splitTextToSize(slide.analogy, 235);
          doc.text(splitAnalogy, 30, currentY + 13);
          currentY += 25;
        }

        const half = slide.bullets ? Math.ceil(slide.bullets.length / 2) : 0;
        const leftB = slide.bullets ? slide.bullets.slice(0, half) : [];
        const rightB = slide.bullets ? slide.bullets.slice(half) : [];

        // Left box (Naive failure)
        doc.setFillColor(cardBgRGB[0], cardBgRGB[1], cardBgRGB[2]);
        doc.roundedRect(26, currentY, 118, 85, 2, 2, 'F');
        doc.setTextColor(239, 68, 68); // Red
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('⚠️ Why Naive Approaches Fail:', 30, currentY + 8);

        let ly = currentY + 16;
        doc.setTextColor(textSecondaryRGB[0], textSecondaryRGB[1], textSecondaryRGB[2]);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        leftB.forEach((b) => {
          const split = doc.splitTextToSize(`• ${b.replace(/\*\*/g, '')}`, 110);
          doc.text(split, 30, ly);
          ly += split.length * 5 + 2;
        });

        // Right box (Breakthrough)
        doc.setFillColor(cardBgRGB[0], cardBgRGB[1], cardBgRGB[2]);
        doc.roundedRect(152, currentY, 119, 85, 2, 2, 'F');
        doc.setTextColor(16, 185, 129); // Emerald
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('⚡ First-Principles Invariant:', 156, currentY + 8);

        let ry = currentY + 16;
        doc.setTextColor(textPrimaryRGB[0], textPrimaryRGB[1], textPrimaryRGB[2]);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        rightB.forEach((b) => {
          const split = doc.splitTextToSize(`• ${b.replace(/\*\*/g, '')}`, 110);
          doc.text(split, 156, ry);
          ry += split.length * 5 + 2;
        });
      }

      // ── 5. TWO COLUMN COMPARISON ─────────────────────────────────────
      else if (slide.type === 'two_column') {
        const colW = 118;
        // Left Column
        doc.setFillColor(cardBgRGB[0], cardBgRGB[1], cardBgRGB[2]);
        doc.roundedRect(26, currentY, colW, 110, 2, 2, 'F');
        doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(slide.leftColumnTitle || 'Approach A', 30, currentY + 8);

        let ly = currentY + 16;
        doc.setTextColor(textSecondaryRGB[0], textSecondaryRGB[1], textSecondaryRGB[2]);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        (slide.leftColumnBullets || []).forEach((b) => {
          const split = doc.splitTextToSize(`• ${b.replace(/\*\*/g, '')}`, colW - 8);
          doc.text(split, 30, ly);
          ly += split.length * 5 + 2;
        });

        // Right Column
        doc.setFillColor(cardBgRGB[0], cardBgRGB[1], cardBgRGB[2]);
        doc.roundedRect(152, currentY, colW, 110, 2, 2, 'F');
        doc.setTextColor(16, 185, 129);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(slide.rightColumnTitle || 'Approach B', 156, currentY + 8);

        let ry = currentY + 16;
        doc.setTextColor(textSecondaryRGB[0], textSecondaryRGB[1], textSecondaryRGB[2]);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        (slide.rightColumnBullets || []).forEach((b) => {
          const split = doc.splitTextToSize(`• ${b.replace(/\*\*/g, '')}`, colW - 8);
          doc.text(split, 156, ry);
          ry += split.length * 5 + 2;
        });
      }

      // ── 6. COMMON MISTAKES (Pitfalls vs Corrections) ─────────────────
      else if (slide.type === 'common_mistakes') {
        const half = slide.bullets ? Math.ceil(slide.bullets.length / 2) : 0;
        const pitfalls = slide.bullets ? slide.bullets.slice(0, half) : [];
        const corrections = slide.bullets ? slide.bullets.slice(half) : [];
        const colW = 118;

        // Pitfalls (Red)
        doc.setFillColor(cardBgRGB[0], cardBgRGB[1], cardBgRGB[2]);
        doc.roundedRect(26, currentY, colW, 110, 2, 2, 'F');
        doc.setTextColor(239, 68, 68);
        doc.setFontSize(10.5);
        doc.setFont('helvetica', 'bold');
        doc.text('❌ Common Student Pitfalls:', 30, currentY + 8);

        let ly = currentY + 16;
        doc.setTextColor(textSecondaryRGB[0], textSecondaryRGB[1], textSecondaryRGB[2]);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        pitfalls.forEach((b) => {
          const split = doc.splitTextToSize(`• ${b.replace(/\*\*/g, '')}`, colW - 8);
          doc.text(split, 30, ly);
          ly += split.length * 5 + 2;
        });

        // Corrections (Emerald)
        doc.setFillColor(cardBgRGB[0], cardBgRGB[1], cardBgRGB[2]);
        doc.roundedRect(152, currentY, colW, 110, 2, 2, 'F');
        doc.setTextColor(16, 185, 129);
        doc.setFontSize(10.5);
        doc.setFont('helvetica', 'bold');
        doc.text('✅ Chief Examiner Corrections:', 156, currentY + 8);

        let ry = currentY + 16;
        doc.setTextColor(textPrimaryRGB[0], textPrimaryRGB[1], textPrimaryRGB[2]);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        corrections.forEach((b) => {
          const split = doc.splitTextToSize(`• ${b.replace(/\*\*/g, '')}`, colW - 8);
          doc.text(split, 156, ry);
          ry += split.length * 5 + 2;
        });
      }

      // ── 7. SUMMARY (3 Pillars) ──────────────────────────────────────
      else if (slide.type === 'summary') {
        const pillarW = 77;
        const pillars = [
          { title: '1. Governing Theory', color: [99, 102, 241], bullets: slide.bullets?.slice(0, 2) || [] },
          { title: '2. Complexity Bounds', color: [16, 185, 129], bullets: slide.bullets?.slice(2, 4) || [] },
          { title: '3. Exam Checklist', color: [245, 158, 11], bullets: slide.bullets?.slice(4) || [] },
        ];

        pillars.forEach((p, pIdx) => {
          const px = 26 + pIdx * (pillarW + 7);
          doc.setFillColor(cardBgRGB[0], cardBgRGB[1], cardBgRGB[2]);
          doc.roundedRect(px, currentY, pillarW, 110, 2, 2, 'F');
          doc.setTextColor(p.color[0], p.color[1], p.color[2]);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text(p.title, px + 4, currentY + 8);

          let py = currentY + 16;
          doc.setTextColor(textPrimaryRGB[0], textPrimaryRGB[1], textPrimaryRGB[2]);
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'normal');
          p.bullets.forEach((b) => {
            const split = doc.splitTextToSize(`• ${b.replace(/\*\*/g, '')}`, pillarW - 8);
            doc.text(split, px + 4, py);
            py += split.length * 4.5 + 2;
          });
        });
      }

      // ── 8. PYQ Question (Question Only or with Solution) ─────────────
      else if (slide.pyqDetails) {
        const cleanYear = this.formatExamYearAndMonth(slide.pyqDetails.examYear);
        doc.setTextColor(16, 185, 129); // Emerald
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`📝 Year of Question: ${cleanYear || slide.pyqDetails.examYear || 'Exam PYQ'}${slide.pyqDetails.marks ? ` • Weightage: ${slide.pyqDetails.marks}` : ''}`, 26, currentY);
        currentY += 6;

        doc.setTextColor(textPrimaryRGB[0], textPrimaryRGB[1], textPrimaryRGB[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        const splitQ = doc.splitTextToSize(slide.pyqDetails.question, 245);
        doc.text(splitQ, 26, currentY);
        currentY += splitQ.length * 5.5 + 5;

        // If integrated answer pointers exist: Render solution card directly in PDF
        if (slide.answerPointers) {
          const ap = slide.answerPointers;
          doc.setFillColor(isDark ? 22 : 241, isDark ? 30 : 245, isDark ? 46 : 249);
          doc.roundedRect(26, currentY, 245, 11, 2, 2, 'F');
          doc.setTextColor(16, 185, 129);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text(`🎯 Identified Solution: ${ap.identifiedSolution ? (ap.identifiedSolution.length > 80 ? ap.identifiedSolution.slice(0, 77) + '...' : ap.identifiedSolution) : 'Verified Formulation'}`, 30, currentY + 7.5);
          currentY += 15;

          doc.setTextColor(textSecondaryRGB[0], textSecondaryRGB[1], textSecondaryRGB[2]);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          (ap.pointers || []).slice(0, 4).forEach((p) => {
            const splitStep = doc.splitTextToSize(`• ${p.replace(/\*\*/g, '')}`, 240);
            doc.text(splitStep, 30, currentY);
            currentY += splitStep.length * 4.8 + 2;
          });

          if (ap.formulaOrResult) {
            doc.setTextColor(16, 185, 129);
            doc.setFont('courier', 'bold');
            doc.setFontSize(8.5);
            doc.text(`Formula / Bound: ${ap.formulaOrResult}`, 30, currentY + 2);
            currentY += 6;
          }
        } else if (slide.pyqDetails.stepByStepSolution) {
          doc.setTextColor(textSecondaryRGB[0], textSecondaryRGB[1], textSecondaryRGB[2]);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.5);
          slide.pyqDetails.stepByStepSolution.forEach((step, sIdx) => {
            const splitStep = doc.splitTextToSize(`Step ${sIdx + 1}: ${step.replace(/\*\*/g, '')}`, 245);
            doc.text(splitStep, 26, currentY);
            currentY += splitStep.length * 5 + 2;
          });
        }
      }

      // Bullets (e.g. for Unit & Topic dividers, or concept cards)
      else if (slide.bullets && slide.bullets.length > 0) {
        doc.setTextColor(textPrimaryRGB[0], textPrimaryRGB[1], textPrimaryRGB[2]);
        doc.setFontSize(10.5);
        doc.setFont('helvetica', 'normal');

        slide.bullets.forEach((b) => {
          const cleanB = `• ${b.replace(/\*\*/g, '')}`;
          const splitB = doc.splitTextToSize(cleanB, 245);
          doc.text(splitB, 26, currentY);
          currentY += splitB.length * 5.5 + 3;
        });

        if (slide.formulaOrCode) {
          currentY += 4;
          doc.setTextColor(16, 185, 129);
          doc.setFont('courier', 'bold');
          doc.setFontSize(9.5);
          const splitCode = doc.splitTextToSize(slide.formulaOrCode, 245);
          doc.text(splitCode, 26, currentY);
        }
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
