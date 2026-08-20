import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';
import { 
  FileSpreadsheet, Download, 
  ChevronLeft, ChevronRight, CheckCircle2,
  Trash2, Sliders,
  HelpCircle, RefreshCw, Layers,
  Calendar, BookOpen, Sparkles
} from 'lucide-react';

export interface ParsedQuestion {
  id: string;
  yearExam: string;       // "Year & Exam" e.g. "GATE 2024", "AKTU End-Sem 2023", "Mid-Sem 2024"
  unitNumber: string;     // "Unit Number" e.g. "Unit 1", "Unit 2", "Module 3"
  mappedTopic: string;    // "Mapped Topic" e.g. "Binary Search Trees & AVL Trees"
  fullQuestionText: string; // "Full Question Text"
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctAnswer?: string;
  solution?: string;
  questionNumber?: number;
}

interface PptGeneratorProps {
  userSubject?: string;
  userName?: string;
}

type SlideTheme = 'dark_tech' | 'clean_minimal' | 'deep_navy';

export const PptGenerator: React.FC<PptGeneratorProps> = ({
  userSubject = 'Data Structures & Algorithms',
  userName = 'Faculty',
}) => {
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [deckTitle, setDeckTitle] = useState<string>('Comprehensive Question Bank & PYQs');
  const [subjectName, setSubjectName] = useState<string>(userSubject);
  const [theme, setTheme] = useState<SlideTheme>('dark_tech');
  const [includeSolutions, setIncludeSolutions] = useState<boolean>(true);
  const [includeAnswerKeySlide, setIncludeAnswerKeySlide] = useState<boolean>(true);
  const [isGeneratingPpt, setIsGeneratingPpt] = useState<boolean>(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Group questions by Mapped Topic
  const topicGroups = React.useMemo(() => {
    const groups: { [key: string]: ParsedQuestion[] } = {};
    questions.forEach((q) => {
      const t = q.mappedTopic.trim() || 'General Topic';
      if (!groups[t]) groups[t] = [];
      groups[t].push(q);
    });
    return groups;
  }, [questions]);

  // Group questions by Unit Number
  const unitGroups = React.useMemo(() => {
    const groups: { [key: string]: ParsedQuestion[] } = {};
    questions.forEach((q) => {
      const u = q.unitNumber.trim() || 'Unit 1';
      if (!groups[u]) groups[u] = [];
      groups[u].push(q);
    });
    return groups;
  }, [questions]);

  const uniqueTopics = Object.keys(topicGroups);
  const uniqueUnits = Object.keys(unitGroups);

  const filteredQuestions = React.useMemo(() => {
    return questions.filter((q) => {
      const matchTopic = selectedTopic === 'all' || (q.mappedTopic.trim() || 'General Topic') === selectedTopic;
      const matchUnit = selectedUnit === 'all' || (q.unitNumber.trim() || 'Unit 1') === selectedUnit;
      return matchTopic && matchUnit;
    });
  }, [questions, selectedTopic, selectedUnit]);

  // ─── DOWNLOAD SAMPLE EXCEL TEMPLATE ──────────────────────────────────────────
  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        'Year & Exam': 'GATE 2024 (CS)',
        'Unit Number': 'Unit 1',
        'Mapped Topic': 'Asymptotic Notations & Recurrence Relations',
        'Full Question Text': 'Consider the recurrence relation T(n) = 2T(n/2) + n log n with T(1) = 1. What is the asymptotic time complexity of T(n)?',
        'Option A': 'Θ(n log n)',
        'Option B': 'Θ(n log² n)',
        'Option C': 'Θ(n²)',
        'Option D': 'Θ(2^n)',
        'Correct Answer': 'Option B',
        'Solution / Explanation': 'Applying Master Theorem Case 2 Extension: Since f(n) = n log n = n^(log_b a) * log^k n with a=2, b=2, k=1, we get T(n) = Θ(n log^(k+1) n) = Θ(n log² n).',
      },
      {
        'Year & Exam': 'AKTU End-Sem 2023',
        'Unit Number': 'Unit 2',
        'Mapped Topic': 'Binary Search Trees & AVL Trees',
        'Full Question Text': 'In an AVL Tree of height h (where height of single node is 0), what is the minimum number of nodes N(h) required? State the recurrence relation and minimum nodes for height 4.',
        'Option A': 'N(h) = N(h-1) + N(h-2) + 1 (Nodes for h=4 is 12)',
        'Option B': 'N(h) = 2^(h+1) - 1 (Nodes for h=4 is 31)',
        'Option C': 'N(h) = 2 * N(h-1) (Nodes for h=4 is 16)',
        'Option D': 'N(h) = N(h-1) + h (Nodes for h=4 is 10)',
        'Correct Answer': 'Option A',
        'Solution / Explanation': 'The minimum nodes in an AVL tree satisfies Fibonacci-like recurrence: N(h) = N(h-1) + N(h-2) + 1 with N(0)=1, N(1)=2, N(2)=4, N(3)=7, N(4)=12.',
      },
      {
        'Year & Exam': 'GATE 2023',
        'Unit Number': 'Unit 2',
        'Mapped Topic': 'Binary Search Trees & AVL Trees',
        'Full Question Text': 'Which of the following traversals is sufficient to construct a unique Binary Search Tree without needing any additional traversal sequence?',
        'Option A': 'Preorder Traversal alone',
        'Option B': 'Inorder Traversal alone',
        'Option C': 'Postorder Traversal with Level Order',
        'Option D': 'Inorder Traversal with Postorder Traversal',
        'Correct Answer': 'Option A',
        'Solution / Explanation': 'For a BST, sorting the Preorder traversal gives the Inorder traversal. Thus, Preorder alone is sufficient to construct a unique BST.',
      },
      {
        'Year & Exam': 'ESE Prelims 2022',
        'Unit Number': 'Unit 3',
        'Mapped Topic': 'Graph Algorithms & Shortest Path',
        'Full Question Text': 'Which shortest path algorithm uses Dynamic Programming and computes all-pairs shortest paths in a directed graph with time complexity O(V³)?',
        'Option A': 'Dijkstra Algorithm',
        'Option B': 'Bellman-Ford Algorithm',
        'Option C': 'Floyd-Warshall Algorithm',
        'Option D': 'Johnson Algorithm',
        'Correct Answer': 'Option C',
        'Solution / Explanation': 'Floyd-Warshall is a DP-based all-pairs shortest path algorithm with time complexity O(V³) and space complexity O(V²).',
      },
      {
        'Year & Exam': 'GATE 2022 (Set-2)',
        'Unit Number': 'Unit 4',
        'Mapped Topic': 'Greedy Algorithms & Dynamic Programming',
        'Full Question Text': 'Consider the 0/1 Knapsack problem with weights {2, 3, 4, 5} and values {3, 4, 5, 6} for maximum capacity W = 5. What is the maximum value that can be achieved?',
        'Option A': '6',
        'Option B': '7',
        'Option C': '8',
        'Option D': '9',
        'Correct Answer': 'Option B',
        'Solution / Explanation': 'Selecting items with weights 2 (val 3) and 3 (val 4) gives total weight 2 + 3 = 5 <= 5 and maximum value 3 + 4 = 7.',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws['!cols'] = [
      { wch: 22 }, // Year & Exam
      { wch: 15 }, // Unit Number
      { wch: 38 }, // Mapped Topic
      { wch: 65 }, // Full Question Text
      { wch: 30 }, // Option A
      { wch: 30 }, // Option B
      { wch: 30 }, // Option C
      { wch: 30 }, // Option D
      { wch: 18 }, // Correct Answer
      { wch: 65 }, // Solution / Explanation
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');
    XLSX.writeFile(wb, 'AEW_Questions_Template.xlsx');

    setSuccessToast('Downloaded AEW Question Bank Template (.xlsx)');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // ─── PARSE UPLOADED EXCEL OR CSV FILE ─────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

        if (!rawData || rawData.length === 0) {
          setErrorMessage('The uploaded spreadsheet contains no rows or data.');
          return;
        }

        // Flexible key resolver for Year & Exam, Unit Number, Mapped Topic, Full Question Text
        const parsed: ParsedQuestion[] = rawData.map((row, idx) => {
          const findVal = (...aliases: string[]) => {
            for (const key of Object.keys(row)) {
              const clean = key.toLowerCase().replace(/[^a-z0-9]/g, '');
              for (const alias of aliases) {
                if (clean.includes(alias.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
                  const val = row[key];
                  if (val !== undefined && val !== null) return String(val).trim();
                }
              }
            }
            return undefined;
          };

          const yearExam = findVal('yearexam', 'year', 'exam', 'session', 'pyq', 'source') || 'Practice PYQ';
          const unitNumber = findVal('unitnumber', 'unitno', 'unit', 'module', 'chapter') || 'Unit 1';
          const mappedTopic = findVal('mappedtopic', 'topic', 'topicname', 'subtopic', 'concept') || 'Core Engineering Topic';
          const fullQuestionText = findVal('fullquestiontext', 'questiontext', 'question', 'problem', 'statement', 'qtext') || `Question ${idx + 1}`;

          const optionA = findVal('optiona', 'opta', 'choicea', 'a');
          const optionB = findVal('optionb', 'optb', 'choiceb', 'b');
          const optionC = findVal('optionc', 'optc', 'choicec', 'c');
          const optionD = findVal('optiond', 'optd', 'choiced', 'd');
          const correctAnswer = findVal('correctanswer', 'answer', 'ans', 'correct', 'key');
          const solution = findVal('solution', 'explanation', 'explain', 'solutionexplanation', 'hint');

          return {
            id: `q-${Date.now()}-${idx}`,
            questionNumber: idx + 1,
            yearExam,
            unitNumber,
            mappedTopic,
            fullQuestionText,
            optionA,
            optionB,
            optionC,
            optionD,
            correctAnswer,
            solution,
          };
        });

        const valid = parsed.filter((q) => q.fullQuestionText && q.fullQuestionText.length > 2);

        if (valid.length === 0) {
          setErrorMessage('Could not find question statements in uploaded file. Please ensure columns: Year & Exam, Unit Number, Mapped Topic, Full Question Text.');
          return;
        }

        setQuestions(valid);
        setActiveSlideIndex(0);
        setSelectedTopic('all');
        setSelectedUnit('all');
        setSuccessToast(`Parsed ${valid.length} questions across ${new Set(valid.map((q) => q.mappedTopic)).size} topics!`);
        setTimeout(() => setSuccessToast(null), 3500);
      } catch (err) {
        setErrorMessage('Failed to parse Excel file. Please ensure valid .xlsx, .xls, or .csv format.');
      }
    };

    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── EXPORT STUNNING POWERPOINT (.PPTX) ───────────────────────────────────────
  const handleExportPowerPoint = async () => {
    if (questions.length === 0) {
      alert('Please upload an Excel file with questions first.');
      return;
    }

    setIsGeneratingPpt(true);
    try {
      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_16x9'; // 13.33 x 7.5 inches

      // Color themes with high contrast & aesthetic elegance
      const themeColors = {
        dark_tech: {
          bg: '090D16',          // Deep sleek slate
          cardBg: '131B2E',      // Card surface
          cardBorder: '24324F',  // Card stroke
          headerBg: '1E293B',
          textPrimary: 'FFFFFF',
          textSecondary: '94A3B8',
          textMuted: '64748B',
          accent: '6366F1',      // Pure Indigo
          accentLight: 'C7D2FE',
          tagBg: '312E81',       // Dark indigo tag
          tagText: 'A5B4FC',
          examBadgeBg: '78350F', // Amber badge
          examBadgeText: 'FDE68A',
          optionBg: '0F172A',
          optionBorder: '334155',
          correctBg: '064E3B',
          correctText: '6EE7B7',
          gold: 'F59E0B',
        },
        clean_minimal: {
          bg: 'FAFAFA',          // Soft light surface
          cardBg: 'FFFFFF',      // Pure white card
          cardBorder: 'E2E8F0',  // Border
          headerBg: 'F1F5F9',
          textPrimary: '0F172A',
          textSecondary: '475569',
          textMuted: '94A3B8',
          accent: '4F46E5',
          accentLight: '3730A3',
          tagBg: 'EEF2FF',
          tagText: '4338CA',
          examBadgeBg: 'FEF3C7',
          examBadgeText: '92400E',
          optionBg: 'F8FAFC',
          optionBorder: 'CBD5E1',
          correctBg: 'ECFDF5',
          correctText: '047857',
          gold: 'D97706',
        },
        deep_navy: {
          bg: '0A192F',          // Deep academic navy
          cardBg: '112240',      // Card navy
          cardBorder: '233554',
          headerBg: '1D3557',
          textPrimary: 'CCD6F6',
          textSecondary: '8892B0',
          textMuted: '495670',
          accent: '64FFDA',      // Teal accent
          accentLight: 'E6FAF6',
          tagBg: '1E3A8A',
          tagText: 'BFDBFE',
          examBadgeBg: '451A03',
          examBadgeText: 'FDE68A',
          optionBg: '0A192F',
          optionBorder: '233554',
          correctBg: '064E3B',
          correctText: '6EE7B7',
          gold: 'F59E0B',
        },
      }[theme];

      // ─── 1. COVER / TITLE SLIDE ───
      const titleSlide = pptx.addSlide();
      titleSlide.background = { color: themeColors.bg };

      // Top brand line
      titleSlide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8,
        y: 1.0,
        w: 3.2,
        h: 0.4,
        rectRadius: 0.08,
        fill: { color: themeColors.tagBg },
      });

      titleSlide.addText('APNA ENGINEERING WALLAH', {
        x: 0.8,
        y: 1.0,
        w: 3.2,
        h: 0.4,
        fontSize: 11,
        bold: true,
        color: themeColors.tagText,
        align: 'center',
        fontFace: 'Calibri',
      });

      titleSlide.addText(deckTitle, {
        x: 0.8,
        y: 1.6,
        w: 11.5,
        h: 1.8,
        fontSize: 36,
        bold: true,
        color: themeColors.textPrimary,
        fontFace: 'Arial',
      });

      titleSlide.addText(`${subjectName} • Topic-Wise Question Bank with 1 Question Per Slide`, {
        x: 0.8,
        y: 3.6,
        w: 11.5,
        h: 0.6,
        fontSize: 16,
        color: themeColors.textSecondary,
        fontFace: 'Calibri',
      });

      // Stats pills on title slide
      const statPills = [
        `📚 ${questions.length} Total Questions`,
        `📑 ${uniqueTopics.length} Mapped Topics`,
        `🏛️ ${uniqueUnits.length} Units & Modules`,
      ];

      statPills.forEach((stat, i) => {
        titleSlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8 + (i * 3.5),
          y: 4.5,
          w: 3.2,
          h: 0.65,
          rectRadius: 0.1,
          fill: { color: themeColors.cardBg },
          line: { color: themeColors.cardBorder, width: 1 },
        });

        titleSlide.addText(stat, {
          x: 0.8 + (i * 3.5),
          y: 4.5,
          w: 3.2,
          h: 0.65,
          fontSize: 12,
          bold: true,
          color: themeColors.textPrimary,
          align: 'center',
          valign: 'middle',
          fontFace: 'Calibri',
        });
      });

      titleSlide.addText(`Faculty: ${userName} • Prepared for Video Recording & Classroom Delivery`, {
        x: 0.8,
        y: 6.6,
        w: 10.0,
        h: 0.4,
        fontSize: 11,
        color: themeColors.textMuted,
        fontFace: 'Calibri',
      });

      // ─── 2. TOPIC DIVIDERS & 1-QUESTION-PER-SLIDE GENERATION ───
      let globalCounter = 1;

      for (const topicName of uniqueTopics) {
        const topicQuestions = topicGroups[topicName];
        const unitName = topicQuestions[0]?.unitNumber || 'Unit';

        // A. TOPIC SECTION HEADER SLIDE
        const sectionSlide = pptx.addSlide();
        sectionSlide.background = { color: themeColors.bg };

        // Unit Tag
        sectionSlide.addShape(pptx.ShapeType.roundRect, {
          x: 1.0,
          y: 1.8,
          w: 2.2,
          h: 0.45,
          rectRadius: 0.08,
          fill: { color: themeColors.accent },
        });

        sectionSlide.addText(unitName.toUpperCase(), {
          x: 1.0,
          y: 1.8,
          w: 2.2,
          h: 0.45,
          fontSize: 12,
          bold: true,
          color: 'FFFFFF',
          align: 'center',
          valign: 'middle',
          fontFace: 'Calibri',
        });

        // Topic Title
        sectionSlide.addText(topicName, {
          x: 1.0,
          y: 2.5,
          w: 11.2,
          h: 2.0,
          fontSize: 34,
          bold: true,
          color: themeColors.textPrimary,
          fontFace: 'Arial',
        });

        sectionSlide.addText(`${topicQuestions.length} Practice Questions & Previous Year Exam Problems (1 Question Per Page)`, {
          x: 1.0,
          y: 4.8,
          w: 11.0,
          h: 0.6,
          fontSize: 16,
          color: themeColors.textSecondary,
          fontFace: 'Calibri',
        });

        // B. INDIVIDUAL QUESTION SLIDES (1 QUESTION PER PAGE)
        for (let qIdx = 0; qIdx < topicQuestions.length; qIdx++) {
          const q = topicQuestions[qIdx];
          const slide = pptx.addSlide();
          slide.background = { color: themeColors.bg };

          // 1. TOP HEADER BAR: UNIT + MAPPED TOPIC (Left) and YEAR & EXAM BADGE (Right)
          // Unit Tag
          slide.addShape(pptx.ShapeType.roundRect, {
            x: 0.8,
            y: 0.35,
            w: 1.4,
            h: 0.38,
            rectRadius: 0.08,
            fill: { color: themeColors.tagBg },
          });

          slide.addText(q.unitNumber.toUpperCase(), {
            x: 0.8,
            y: 0.35,
            w: 1.4,
            h: 0.38,
            fontSize: 10,
            bold: true,
            color: themeColors.tagText,
            align: 'center',
            valign: 'middle',
            fontFace: 'Calibri',
          });

          // Mapped Topic Name
          slide.addText(q.mappedTopic, {
            x: 2.35,
            y: 0.35,
            w: 6.8,
            h: 0.38,
            fontSize: 11,
            bold: true,
            color: themeColors.textSecondary,
            valign: 'middle',
            fontFace: 'Calibri',
          });

          // Year & Exam Highlight Badge (Top Right)
          if (q.yearExam) {
            slide.addShape(pptx.ShapeType.roundRect, {
              x: 9.3,
              y: 0.32,
              w: 3.2,
              h: 0.44,
              rectRadius: 0.08,
              fill: { color: themeColors.examBadgeBg },
            });

            slide.addText(`🏷️ ${q.yearExam}`, {
              x: 9.3,
              y: 0.32,
              w: 3.2,
              h: 0.44,
              fontSize: 11,
              bold: true,
              color: themeColors.examBadgeText,
              align: 'center',
              valign: 'middle',
              fontFace: 'Calibri',
            });
          }

          // 2. MAIN QUESTION STATEMENT CONTAINER
          slide.addShape(pptx.ShapeType.roundRect, {
            x: 0.8,
            y: 0.9,
            w: 11.7,
            h: 2.2,
            rectRadius: 0.12,
            fill: { color: themeColors.cardBg },
            line: { color: themeColors.cardBorder, width: 1.2 },
          });

          // Question Number Label
          slide.addText(`Q.${qIdx + 1}`, {
            x: 1.1,
            y: 1.05,
            w: 1.0,
            h: 0.5,
            fontSize: 20,
            bold: true,
            color: themeColors.accent,
            fontFace: 'Arial',
          });

          // Full Question Text
          slide.addText(q.fullQuestionText, {
            x: 2.0,
            y: 1.0,
            w: 10.2,
            h: 1.95,
            fontSize: 16,
            bold: true,
            color: themeColors.textPrimary,
            fontFace: 'Calibri',
            valign: 'middle',
          });

          // 3. MCQ OPTIONS (A, B, C, D) - 2x2 Grid or Vertical List
          const hasOptions = q.optionA || q.optionB || q.optionC || q.optionD;

          if (hasOptions) {
            const optW = 5.7;
            const optH = 1.35;
            const row1Y = 3.3;
            const row2Y = 4.8;
            const col1X = 0.8;
            const col2X = 6.8;

            const renderOption = (letter: string, text: string | undefined, x: number, y: number) => {
              if (!text) return;

              slide.addShape(pptx.ShapeType.roundRect, {
                x,
                y,
                w: optW,
                h: optH,
                rectRadius: 0.1,
                fill: { color: themeColors.optionBg },
                line: { color: themeColors.optionBorder, width: 1 },
              });

              // Letter Badge
              slide.addShape(pptx.ShapeType.roundRect, {
                x: x + 0.25,
                y: y + 0.35,
                w: 0.65,
                h: 0.65,
                rectRadius: 0.08,
                fill: { color: themeColors.accent },
              });

              slide.addText(letter, {
                x: x + 0.25,
                y: y + 0.35,
                w: 0.65,
                h: 0.65,
                fontSize: 14,
                bold: true,
                color: 'FFFFFF',
                align: 'center',
                valign: 'middle',
                fontFace: 'Arial',
              });

              slide.addText(text, {
                x: x + 1.05,
                y: y + 0.15,
                w: optW - 1.25,
                h: optH - 0.3,
                fontSize: 13,
                color: themeColors.textPrimary,
                fontFace: 'Calibri',
                valign: 'middle',
              });
            };

            renderOption('A', q.optionA, col1X, row1Y);
            renderOption('B', q.optionB, col2X, row1Y);
            renderOption('C', q.optionC, col1X, row2Y);
            renderOption('D', q.optionD, col2X, row2Y);
          }

          // 4. FOOTER: Course Name + Pagination
          slide.addText(`Apna Engineering Wallah • ${subjectName}`, {
            x: 0.8,
            y: 6.85,
            w: 6.0,
            h: 0.3,
            fontSize: 9,
            color: themeColors.textMuted,
            fontFace: 'Calibri',
          });

          slide.addText(`Question ${qIdx + 1} of ${topicQuestions.length} (Overall Q${globalCounter})`, {
            x: 8.0,
            y: 6.85,
            w: 4.5,
            h: 0.3,
            fontSize: 9,
            color: themeColors.textMuted,
            align: 'right',
            fontFace: 'Calibri',
          });

          // 5. OPTIONAL: FULL SOLUTION / EXPLANATION SLIDE (1 Question Solution Per Slide)
          if (includeSolutions && (q.correctAnswer || q.solution)) {
            const solSlide = pptx.addSlide();
            solSlide.background = { color: themeColors.bg };

            // Header
            solSlide.addText(`SOLUTION & EXPLANATION • Q.${qIdx + 1}`, {
              x: 0.8,
              y: 0.4,
              w: 7.0,
              h: 0.35,
              fontSize: 12,
              bold: true,
              color: themeColors.correctText,
              fontFace: 'Calibri',
            });

            if (q.yearExam) {
              solSlide.addText(`Exam: ${q.yearExam}`, {
                x: 8.0,
                y: 0.4,
                w: 4.5,
                h: 0.35,
                fontSize: 11,
                color: themeColors.textSecondary,
                align: 'right',
                fontFace: 'Calibri',
              });
            }

            // Question summary card
            solSlide.addShape(pptx.ShapeType.roundRect, {
              x: 0.8,
              y: 0.9,
              w: 11.7,
              h: 1.4,
              rectRadius: 0.1,
              fill: { color: themeColors.cardBg },
              line: { color: themeColors.cardBorder, width: 1 },
            });

            solSlide.addText(`Q.${qIdx + 1} Question Statement:\n${q.fullQuestionText}`, {
              x: 1.0,
              y: 1.0,
              w: 11.3,
              h: 1.2,
              fontSize: 12,
              color: themeColors.textSecondary,
              fontFace: 'Calibri',
            });

            // Correct Answer Callout
            if (q.correctAnswer) {
              solSlide.addShape(pptx.ShapeType.roundRect, {
                x: 0.8,
                y: 2.5,
                w: 11.7,
                h: 0.8,
                rectRadius: 0.1,
                fill: { color: themeColors.correctBg },
                line: { color: themeColors.correctText, width: 1.5 },
              });

              solSlide.addText(`✓ CORRECT ANSWER: ${q.correctAnswer}`, {
                x: 1.1,
                y: 2.5,
                w: 11.0,
                h: 0.8,
                fontSize: 16,
                bold: true,
                color: themeColors.correctText,
                fontFace: 'Arial',
                valign: 'middle',
              });
            }

            // Solution Step-by-Step Box
            if (q.solution) {
              solSlide.addShape(pptx.ShapeType.roundRect, {
                x: 0.8,
                y: 3.5,
                w: 11.7,
                h: 3.0,
                rectRadius: 0.1,
                fill: { color: themeColors.cardBg },
                line: { color: themeColors.cardBorder, width: 1 },
              });

              solSlide.addText(`Step-by-Step Solution & Concepts:\n\n${q.solution}`, {
                x: 1.1,
                y: 3.7,
                w: 11.1,
                h: 2.6,
                fontSize: 13,
                color: themeColors.textPrimary,
                fontFace: 'Calibri',
              });
            }
          }

          globalCounter++;
        }
      }

      // ─── 3. SUMMARY ANSWER KEY SLIDE ───
      if (includeAnswerKeySlide) {
        const keySlide = pptx.addSlide();
        keySlide.background = { color: themeColors.bg };

        keySlide.addText('COMPLETE ANSWER KEY & SUMMARY', {
          x: 0.8,
          y: 0.5,
          w: 11.0,
          h: 0.5,
          fontSize: 22,
          bold: true,
          color: themeColors.textPrimary,
          fontFace: 'Arial',
        });

        const keyLines = questions.map((q, idx) => `Q${idx + 1} (${q.yearExam || q.unitNumber}): ${q.correctAnswer || 'Subjective'}`).join('   •   ');

        keySlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: 1.2,
          w: 11.7,
          h: 5.2,
          rectRadius: 0.1,
          fill: { color: themeColors.cardBg },
          line: { color: themeColors.cardBorder, width: 1 },
        });

        keySlide.addText(keyLines, {
          x: 1.1,
          y: 1.4,
          w: 11.1,
          h: 4.8,
          fontSize: 12,
          color: themeColors.textPrimary,
          fontFace: 'Calibri',
        });
      }

      // Trigger PowerPoint download
      const filename = `${subjectName.replace(/[^a-zA-Z0-9]/g, '_')}_Questions_Presentation.pptx`;
      await pptx.writeFile({ fileName: filename });

      setSuccessToast(`PowerPoint generated successfully: ${filename}`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      alert('Failed to generate PowerPoint: ' + (err as Error).message);
    } finally {
      setIsGeneratingPpt(false);
    }
  };

  const currentPreviewQuestion = filteredQuestions[activeSlideIndex];

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6 animate-in fade-in duration-150 text-slate-200">
      
      {/* TOAST FEEDBACK */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {successToast}
        </div>
      )}

      {/* HEADER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 font-bold">
              <FileSpreadsheet className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">
              Excel to PowerPoint Slide Deck Studio
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Required Schema: <strong>Year & Exam</strong> • <strong>Unit Number</strong> • <strong>Mapped Topic</strong> • <strong>Full Question Text</strong> (1 Question Per Slide)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadSampleExcel}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-medium text-xs rounded-xl transition-colors flex items-center gap-1.5"
            title="Download Excel template with required fields"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" /> Download Template (.xlsx)
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Upload Excel Questions
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-950/20 border border-red-500/30 text-red-300 rounded-xl text-xs flex items-center gap-2 font-medium">
          <span>🛑</span> {errorMessage}
        </div>
      )}

      {/* MAIN WORKSPACE */}
      {questions.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto text-2xl">
            📊
          </div>
          
          <div className="space-y-1.5">
            <h3 className="font-bold text-base text-slate-100">Upload Your Questions Spreadsheet</h3>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">
              Upload your question bank. The system automatically reads <strong>Year & Exam</strong>, <strong>Unit Number</strong>, <strong>Mapped Topic</strong>, and <strong>Full Question Text</strong> to format a slide deck with 1 question per page.
            </p>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={handleDownloadSampleExcel}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" /> Download Excel Template (.xlsx)
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-md"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Upload Excel File
            </button>
          </div>

          {/* REQUIRED FIELDS HIGHLIGHT */}
          <div className="pt-6 border-t border-slate-800/60 max-w-xl mx-auto text-left text-xs text-slate-400 space-y-3">
            <div className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Required Excel Template Columns:
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1">
                <div className="font-bold text-amber-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Year & Exam
                </div>
                <div className="text-[11px] text-slate-400">e.g. <em>GATE 2024</em>, <em>AKTU End-Sem 2023</em></div>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1">
                <div className="font-bold text-indigo-400 flex items-center gap-1">
                  <Layers className="w-3 h-3" /> Unit Number
                </div>
                <div className="text-[11px] text-slate-400">e.g. <em>Unit 1</em>, <em>Unit 2</em>, <em>Module 3</em></div>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1">
                <div className="font-bold text-purple-300 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> Mapped Topic
                </div>
                <div className="text-[11px] text-slate-400">e.g. <em>Binary Search Trees & AVL Trees</em></div>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1">
                <div className="font-bold text-emerald-400 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" /> Full Question Text
                </div>
                <div className="text-[11px] text-slate-400">The complete question statement & formula</div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 italic">
              Optional columns: Option A, Option B, Option C, Option D, Correct Answer, Solution / Explanation.
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN: PRESENTATION SETTINGS & FILTER */}
          <div className="space-y-4">
            
            {/* DECK CONFIGURATION */}
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" /> Presentation Settings
                </span>
                <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  {questions.length} Questions
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Presentation Title</label>
                  <input
                    type="text"
                    value={deckTitle}
                    onChange={(e) => setDeckTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Subject / Course Name</label>
                  <input
                    type="text"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* THEME SELECTOR */}
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Slide Visual Theme</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTheme('dark_tech')}
                      className={`p-2 rounded-lg border text-[11px] font-semibold text-center transition-all ${
                        theme === 'dark_tech'
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Dark Tech
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('clean_minimal')}
                      className={`p-2 rounded-lg border text-[11px] font-semibold text-center transition-all ${
                        theme === 'clean_minimal'
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Clean White
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('deep_navy')}
                      className={`p-2 rounded-lg border text-[11px] font-semibold text-center transition-all ${
                        theme === 'deep_navy'
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Deep Navy
                    </button>
                  </div>
                </div>

                {/* TOGGLES */}
                <div className="space-y-2 pt-2 border-t border-slate-800/60">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={includeSolutions}
                      onChange={(e) => setIncludeSolutions(e.target.checked)}
                      className="rounded accent-indigo-600"
                    />
                    <span>Add Solution Slide after each question</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={includeAnswerKeySlide}
                      onChange={(e) => setIncludeAnswerKeySlide(e.target.checked)}
                      className="rounded accent-indigo-600"
                    />
                    <span>Add Summary Answer Key at end</span>
                  </label>
                </div>
              </div>

              {/* EXPORT BUTTON */}
              <button
                onClick={handleExportPowerPoint}
                disabled={isGeneratingPpt}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGeneratingPpt ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating Slides...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> Download PowerPoint (.pptx)
                  </>
                )}
              </button>
            </div>

            {/* TOPIC & UNIT FILTER */}
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 space-y-3 text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" /> Mapped Topics ({uniqueTopics.length})
              </span>

              <div className="space-y-1 max-h-52 overflow-y-auto">
                <button
                  onClick={() => { setSelectedTopic('all'); setActiveSlideIndex(0); }}
                  className={`w-full px-3 py-2 rounded-lg text-left transition-colors flex items-center justify-between ${
                    selectedTopic === 'all'
                      ? 'bg-slate-800 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/60'
                  }`}
                >
                  <span>All Topics</span>
                  <span className="font-mono text-[10px] text-slate-500">{questions.length}</span>
                </button>

                {uniqueTopics.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => { setSelectedTopic(topic); setActiveSlideIndex(0); }}
                    className={`w-full px-3 py-2 rounded-lg text-left transition-colors flex items-center justify-between ${
                      selectedTopic === topic
                        ? 'bg-slate-800 text-indigo-300 font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/60'
                    }`}
                  >
                    <span className="truncate mr-2">{topic}</span>
                    <span className="font-mono text-[10px] text-slate-500 shrink-0">
                      {topicGroups[topic]?.length || 0}
                    </span>
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                <button
                  onClick={() => setQuestions([])}
                  className="text-red-400 hover:text-red-300 text-[11px] flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear Questions
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-indigo-400 hover:text-indigo-300 text-[11px]"
                >
                  + Upload More
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: HIGH-AESTHETIC SLIDE CANVAS PREVIEW */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* SLIDE NAVIGATION STRIP */}
            <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800/80 rounded-xl px-4 py-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-200">
                  Slide {activeSlideIndex + 1} of {filteredQuestions.length}
                </span>
                <span className="text-[11px] text-slate-400">• 1 Question Per Slide View</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveSlideIndex((i) => Math.max(0, i - 1))}
                  disabled={activeSlideIndex === 0}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:hover:bg-slate-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActiveSlideIndex((i) => Math.min(filteredQuestions.length - 1, i + 1))}
                  disabled={activeSlideIndex === filteredQuestions.length - 1}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:hover:bg-slate-800"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* LIVE 16:9 SLIDE CANVAS PREVIEW */}
            {currentPreviewQuestion ? (
              <div className={`aspect-[16/9] w-full rounded-2xl border p-6 md:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden transition-all ${
                theme === 'dark_tech'
                  ? 'bg-[#090D16] border-[#24324F] text-slate-100'
                  : theme === 'clean_minimal'
                  ? 'bg-[#FAFAFA] border-[#E2E8F0] text-slate-900'
                  : 'bg-[#0A192F] border-[#233554] text-[#CCD6F6]'
              }`}>
                
                {/* 1. TOP HEADER BAR: UNIT + TOPIC (Left) & YEAR & EXAM BADGE (Right) */}
                <div className="flex items-center justify-between border-b pb-3 border-slate-800/80">
                  <div className="flex items-center gap-2 truncate">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase tracking-wider shrink-0">
                      {currentPreviewQuestion.unitNumber}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold truncate">
                      {currentPreviewQuestion.mappedTopic}
                    </span>
                  </div>

                  {currentPreviewQuestion.yearExam && (
                    <span className="px-3 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0 font-mono">
                      🏷️ {currentPreviewQuestion.yearExam}
                    </span>
                  )}
                </div>

                {/* 2. MAIN QUESTION STATEMENT */}
                <div className="my-auto py-3">
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                    <div className="flex items-start gap-3">
                      <span className="text-indigo-400 font-black text-base font-mono">
                        Q.{activeSlideIndex + 1}
                      </span>
                      <div className="text-sm md:text-base font-bold leading-relaxed">
                        {currentPreviewQuestion.fullQuestionText}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. MCQ OPTIONS (2x2 GRID) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {currentPreviewQuestion.optionA && (
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                        A
                      </span>
                      <span className="text-xs truncate">{currentPreviewQuestion.optionA}</span>
                    </div>
                  )}

                  {currentPreviewQuestion.optionB && (
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                        B
                      </span>
                      <span className="text-xs truncate">{currentPreviewQuestion.optionB}</span>
                    </div>
                  )}

                  {currentPreviewQuestion.optionC && (
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                        C
                      </span>
                      <span className="text-xs truncate">{currentPreviewQuestion.optionC}</span>
                    </div>
                  )}

                  {currentPreviewQuestion.optionD && (
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                        D
                      </span>
                      <span className="text-xs truncate">{currentPreviewQuestion.optionD}</span>
                    </div>
                  )}
                </div>

                {/* 4. SLIDE FOOTER */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-[10px] text-slate-500">
                  <span>Apna Engineering Wallah • {subjectName}</span>
                  {currentPreviewQuestion.correctAnswer && (
                    <span className="text-emerald-400 font-semibold font-mono">
                      Answer: {currentPreviewQuestion.correctAnswer}
                    </span>
                  )}
                </div>
              </div>
            ) : null}

            {/* QUICK QUESTION NAVIGATION CAROUSEL */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3 space-y-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Question Quick Navigation
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {filteredQuestions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => setActiveSlideIndex(idx)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                      activeSlideIndex === idx
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Q{idx + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
