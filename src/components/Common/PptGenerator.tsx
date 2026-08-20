import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';
import { jsPDF } from 'jspdf';
import { 
  FileSpreadsheet, Download, 
  ChevronLeft, ChevronRight, CheckCircle2,
  Trash2, Sliders,
  HelpCircle, RefreshCw, Layers,
  Calendar, BookOpen, Sparkles, Maximize2, X,
  FileText, FolderKanban
} from 'lucide-react';

export interface ParsedQuestion {
  id: string;
  yearExam: string;       // "Year & Exam" e.g. "End Term Feb 2023"
  unitNumber: string;     // "Unit Number" e.g. "UNIT 2"
  mappedTopic: string;    // "Mapped Topic" e.g. "Sparse Matrix Representation"
  fullQuestionText: string; // "Full Question Text"
  solution?: string;      // Optional solution / key points
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
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [deckTitle, setDeckTitle] = useState<string>('University Question Bank & PYQs');
  const [subjectName, setSubjectName] = useState<string>(userSubject);
  const [theme, setTheme] = useState<SlideTheme>('dark_tech');
  const [includeSolutions, setIncludeSolutions] = useState<boolean>(false);
  const [isGeneratingPpt, setIsGeneratingPpt] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper for natural sorting of unit numbers: "UNIT 1" -> 1, "Unit 2" -> 2, "Module 10" -> 10
  const getUnitSortNumber = (unitStr: string): number => {
    const clean = (unitStr || '').trim();
    const match = clean.match(/(\d+)/);
    if (match) return parseInt(match[1], 10);
    return 9999;
  };

  // Group questions by Unit Number (Sorted Naturally: Unit 1, Unit 2, Unit 3...)
  const uniqueUnits = React.useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => {
      set.add(q.unitNumber.trim() || 'UNIT 1');
    });
    return Array.from(set).sort((a, b) => {
      const numA = getUnitSortNumber(a);
      const numB = getUnitSortNumber(b);
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });
  }, [questions]);

  // Nested Unit Hierarchy: Unit -> Topics -> Questions
  const unitHierarchy = React.useMemo(() => {
    const hierarchy: {
      unitName: string;
      topics: {
        topicName: string;
        questions: ParsedQuestion[];
      }[];
      totalQuestions: number;
    }[] = [];

    uniqueUnits.forEach((unitName) => {
      const unitQuestions = questions.filter(
        (q) => (q.unitNumber.trim() || 'UNIT 1') === unitName
      );

      // Group topics within this unit
      const topicMap: { [topic: string]: ParsedQuestion[] } = {};
      unitQuestions.forEach((q) => {
        const t = q.mappedTopic.trim() || 'General Topic';
        if (!topicMap[t]) topicMap[t] = [];
        topicMap[t].push(q);
      });

      const topics = Object.keys(topicMap).map((topicName) => ({
        topicName,
        questions: topicMap[topicName],
      }));

      hierarchy.push({
        unitName,
        topics,
        totalQuestions: unitQuestions.length,
      });
    });

    return hierarchy;
  }, [questions, uniqueUnits]);

  // Topics available under current unit selection
  const availableTopics = React.useMemo(() => {
    const set = new Set<string>();
    const pool = selectedUnit === 'all' 
      ? questions 
      : questions.filter((q) => (q.unitNumber.trim() || 'UNIT 1') === selectedUnit);
    pool.forEach((q) => set.add(q.mappedTopic.trim() || 'General Topic'));
    return Array.from(set);
  }, [questions, selectedUnit]);

  // All questions strictly sorted Unit-Wise first, then Topic-Wise
  const sortedQuestionsUnitWise = React.useMemo(() => {
    const list: ParsedQuestion[] = [];
    unitHierarchy.forEach((unit) => {
      unit.topics.forEach((top) => {
        list.push(...top.questions);
      });
    });
    return list;
  }, [unitHierarchy]);

  // Filtered questions for active preview
  const filteredQuestions = React.useMemo(() => {
    return sortedQuestionsUnitWise.filter((q) => {
      const matchUnit = selectedUnit === 'all' || (q.unitNumber.trim() || 'UNIT 1') === selectedUnit;
      const matchTopic = selectedTopic === 'all' || (q.mappedTopic.trim() || 'General Topic') === selectedTopic;
      return matchUnit && matchTopic;
    });
  }, [sortedQuestionsUnitWise, selectedUnit, selectedTopic]);

  // ─── DOWNLOAD SAMPLE EXCEL TEMPLATE ──────────────────────────────────────────
  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        'Year & Exam': 'March 2020 First-Term Examination',
        'Unit Number': 'UNIT 1',
        'Mapped Topic': 'Multiprogrammed Batches Systems',
        'Full Question Text': 'Differentiate between multiprogramming and multi tasking. Explain how CPU scheduling facilitates context switching in modern operating systems.',
        'Solution / Key Points': '1. Multiprogramming keeps multiple jobs in memory to maximize CPU utilization.\n2. Multitasking switches CPU rapidly between user tasks for interactive execution.',
      },
      {
        'Year & Exam': 'December 2022 End-Sem Examination',
        'Unit Number': 'UNIT 1',
        'Mapped Topic': 'Operating System Structures & System Calls',
        'Full Question Text': 'What are System Calls? Explain the step-by-step mechanism of handling a system call with the help of a dual-mode (User Mode vs Kernel Mode) transition diagram.',
        'Solution / Key Points': 'System calls provide an interface between a user program and OS kernel. Transition happens via software trap instruction setting mode bit to 0 (Kernel Mode).',
      },
      {
        'Year & Exam': 'End Term Feb 2023',
        'Unit Number': 'UNIT 2',
        'Mapped Topic': 'Sparse Matrix Representation',
        'Full Question Text': 'What is sparse matrix? Explain different types of sparse matrix with suitable examples. State different storage formats of sparse matrix.',
        'Solution / Key Points': '1. A sparse matrix is a matrix in which most of the elements are zero.\n2. Formats: 3-Tuple (Row, Column, Value), Linked List node representation.\n3. Benefits: Reduces memory consumption from O(N*M) to O(non-zero elements).',
      },
      {
        'Year & Exam': 'Mid Term October 2024',
        'Unit Number': 'UNIT 2',
        'Mapped Topic': 'Stack Applications & Polish Notations',
        'Full Question Text': 'What are polish notations in stack? Explain the complete conversion algorithm from Infix expression to Postfix notation with a trace table.',
        'Solution / Key Points': 'Polish notations include Prefix, Infix, and Postfix. Postfix eliminates ambiguity of operator precedence without needing parentheses.',
      },
      {
        'Year & Exam': 'December 2023 End-Sem',
        'Unit Number': 'UNIT 3',
        'Mapped Topic': 'Deadlocks & Banker Algorithm',
        'Full Question Text': 'State the four necessary and sufficient conditions for Deadlock occurrence. How does Banker’s Algorithm ensure Deadlock Avoidance in a multi-resource system?',
        'Solution / Key Points': 'Four Conditions: Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait. Banker algorithm simulates resource safety sequence.',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws['!cols'] = [
      { wch: 35 }, // Year & Exam
      { wch: 15 }, // Unit Number
      { wch: 40 }, // Mapped Topic
      { wch: 80 }, // Full Question Text
      { wch: 60 }, // Solution / Key Points
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');
    XLSX.writeFile(wb, 'AEW_Questions_Template.xlsx');

    setSuccessToast('Downloaded Unit-Wise AEW Question Bank Template (.xlsx)');
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

        // Clean parser for Year & Exam, Unit Number, Mapped Topic, Full Question Text
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

          const yearExam = findVal('yearexam', 'year', 'exam', 'session', 'pyq', 'source') || 'University Exam';
          const unitNumber = findVal('unitnumber', 'unitno', 'unit', 'module', 'chapter') || 'UNIT 1';
          const mappedTopic = findVal('mappedtopic', 'topic', 'topicname', 'subtopic', 'concept') || 'Core Topic';
          const fullQuestionText = findVal('fullquestiontext', 'questiontext', 'question', 'problem', 'statement', 'qtext') || `Question ${idx + 1}`;
          const solution = findVal('solution', 'explanation', 'keypoints', 'solutionkeypoints', 'hint');

          return {
            id: `q-${Date.now()}-${idx}`,
            questionNumber: idx + 1,
            yearExam,
            unitNumber,
            mappedTopic,
            fullQuestionText,
            solution,
          };
        });

        const valid = parsed.filter((q) => q.fullQuestionText && q.fullQuestionText.length > 2);

        if (valid.length === 0) {
          setErrorMessage('Could not find question statements. Please ensure columns: Year & Exam, Unit Number, Mapped Topic, Full Question Text.');
          return;
        }

        setQuestions(valid);
        setActiveSlideIndex(0);
        setSelectedUnit('all');
        setSelectedTopic('all');
        setSuccessToast(`Parsed ${valid.length} questions organized Unit-Wise!`);
        setTimeout(() => setSuccessToast(null), 3500);
      } catch (err) {
        setErrorMessage('Failed to parse Excel file. Please ensure valid .xlsx, .xls, or .csv format.');
      }
    };

    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── THEME PALETTES ──────────────────────────────────────────────────────────
  const themeColors = {
    dark_tech: {
      bg: '090D16',          // Luxury matte dark background
      cardBg: '111728',      // Card surface
      cardBorder: '212D4A',  // Crisp card hairline
      accentGradient: '6366F1', // Royal indigo
      textPrimary: 'FFFFFF',
      textSecondary: '94A3B8',
      textMuted: '64748B',
      unitTagBg: '23255A',
      unitTagText: 'A5B4FC',
      examBadgeBg: '422006',
      examBadgeBorder: '78350F',
      examBadgeText: 'FDE68A',
      rgbBg: [9, 13, 22] as [number, number, number],
      rgbCard: [17, 23, 40] as [number, number, number],
      rgbBorder: [33, 45, 74] as [number, number, number],
      rgbAccent: [99, 102, 241] as [number, number, number],
      rgbTextPrimary: [255, 255, 255] as [number, number, number],
      rgbTextSecondary: [148, 163, 184] as [number, number, number],
      rgbTextMuted: [100, 116, 139] as [number, number, number],
      rgbUnitBg: [35, 37, 90] as [number, number, number],
      rgbUnitText: [165, 180, 252] as [number, number, number],
      rgbExamBg: [66, 32, 6] as [number, number, number],
      rgbExamText: [253, 230, 138] as [number, number, number],
    },
    clean_minimal: {
      bg: 'F8FAFC',
      cardBg: 'FFFFFF',
      cardBorder: 'E2E8F0',
      accentGradient: '4F46E5',
      textPrimary: '0F172A',
      textSecondary: '475569',
      textMuted: '94A3B8',
      unitTagBg: 'EEF2FF',
      unitTagText: '4338CA',
      examBadgeBg: 'FEF3C7',
      examBadgeBorder: 'FDE68A',
      examBadgeText: '92400E',
      rgbBg: [248, 250, 252] as [number, number, number],
      rgbCard: [255, 255, 255] as [number, number, number],
      rgbBorder: [226, 232, 240] as [number, number, number],
      rgbAccent: [79, 70, 229] as [number, number, number],
      rgbTextPrimary: [15, 23, 42] as [number, number, number],
      rgbTextSecondary: [71, 85, 105] as [number, number, number],
      rgbTextMuted: [148, 163, 184] as [number, number, number],
      rgbUnitBg: [238, 242, 255] as [number, number, number],
      rgbUnitText: [67, 56, 202] as [number, number, number],
      rgbExamBg: [254, 243, 199] as [number, number, number],
      rgbExamText: [146, 64, 14] as [number, number, number],
    },
    deep_navy: {
      bg: '061426',
      cardBg: '0D213A',
      cardBorder: '1A3A60',
      accentGradient: '00ADB5',
      textPrimary: 'FFFFFF',
      textSecondary: '94A3B8',
      textMuted: '4E6987',
      unitTagBg: '16385C',
      unitTagText: '7DD3FC',
      examBadgeBg: '422006',
      examBadgeBorder: '713F12',
      examBadgeText: 'FDE047',
      rgbBg: [6, 20, 38] as [number, number, number],
      rgbCard: [13, 33, 58] as [number, number, number],
      rgbBorder: [26, 58, 96] as [number, number, number],
      rgbAccent: [0, 173, 181] as [number, number, number],
      rgbTextPrimary: [255, 255, 255] as [number, number, number],
      rgbTextSecondary: [148, 163, 184] as [number, number, number],
      rgbTextMuted: [78, 105, 135] as [number, number, number],
      rgbUnitBg: [22, 56, 92] as [number, number, number],
      rgbUnitText: [125, 211, 252] as [number, number, number],
      rgbExamBg: [66, 32, 6] as [number, number, number],
      rgbExamText: [253, 224, 71] as [number, number, number],
    },
  }[theme];

  // ─── 1. EXPORT UNIT-WISE BROADCAST POWERPOINT (.PPTX) ─────────────────────────
  // EXACT CANVAS DIMENSIONS: 16:9 Widescreen (13.333" width × 7.500" height)
  const handleExportPowerPoint = async () => {
    if (questions.length === 0) {
      alert('Please upload an Excel file with questions first.');
      return;
    }

    setIsGeneratingPpt(true);
    try {
      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_16x9'; // Exact 13.333 x 7.500 inches (1920x1080 equivalent)

      // ─── 1. COVER / TITLE SLIDE ───
      const titleSlide = pptx.addSlide();
      titleSlide.background = { color: themeColors.bg };

      titleSlide.addText('APNA ENGINEERING WALLAH', {
        shape: pptx.ShapeType.roundRect,
        rectRadius: 0.08,
        x: 0.8,
        y: 1.0,
        w: 3.5,
        h: 0.45,
        fill: { color: themeColors.unitTagBg },
        color: themeColors.unitTagText,
        fontSize: 11,
        bold: true,
        align: 'center',
        valign: 'middle',
        margin: 0,
        fontFace: 'Arial',
      });

      titleSlide.addText(deckTitle, {
        x: 0.8,
        y: 1.7,
        w: 11.733,
        h: 1.8,
        fontSize: 32,
        bold: true,
        color: themeColors.textPrimary,
        valign: 'top',
        align: 'left',
        wrap: true,
        margin: 0,
        isTextBox: true,
        fontFace: 'Arial',
      });

      titleSlide.addText(`${subjectName} • Complete Unit-Wise Question Bank Presentation`, {
        x: 0.8,
        y: 3.7,
        w: 11.5,
        h: 0.5,
        fontSize: 16,
        color: themeColors.textSecondary,
        valign: 'middle',
        margin: 0,
        fontFace: 'Calibri',
      });

      const totalTopicsCount = unitHierarchy.reduce((acc, u) => acc + u.topics.length, 0);
      const stats = [
        `🏛️ ${uniqueUnits.length} Units Covered`,
        `📑 ${totalTopicsCount} Mapped Topics`,
        `📚 ${questions.length} Exam Questions`,
      ];

      stats.forEach((st, i) => {
        titleSlide.addText(st, {
          shape: pptx.ShapeType.roundRect,
          rectRadius: 0.1,
          x: 0.8 + (i * 3.6),
          y: 4.6,
          w: 3.3,
          h: 0.7,
          fill: { color: themeColors.cardBg },
          line: { color: themeColors.cardBorder, width: 1 },
          fontSize: 13,
          bold: true,
          color: themeColors.textPrimary,
          align: 'center',
          valign: 'middle',
          margin: 0,
          fontFace: 'Arial',
        });
      });

      titleSlide.addText(`Faculty: ${userName} • Organized Unit-Wise for Structured Delivery`, {
        x: 0.8,
        y: 6.7,
        w: 10.0,
        h: 0.4,
        fontSize: 11,
        color: themeColors.textMuted,
        margin: 0,
        fontFace: 'Calibri',
      });

      // ─── 2. UNIT-WISE HIERARCHICAL SLIDE GENERATION ───
      let globalCounter = 1;

      for (const unit of unitHierarchy) {
        // A. UNIT MASTER SECTION COVER SLIDE
        const unitCoverSlide = pptx.addSlide();
        unitCoverSlide.background = { color: themeColors.bg };

        unitCoverSlide.addText(unit.unitName.toUpperCase(), {
          shape: pptx.ShapeType.roundRect,
          rectRadius: 0.08,
          x: 1.0,
          y: 1.5,
          w: 2.5,
          h: 0.48,
          fill: { color: themeColors.accentGradient },
          fontSize: 13,
          bold: true,
          color: 'FFFFFF',
          align: 'center',
          valign: 'middle',
          margin: 0,
          fontFace: 'Arial',
        });

        unitCoverSlide.addText(`${unit.unitName} : Question Bank & PYQs`, {
          x: 1.0,
          y: 2.2,
          w: 11.2,
          h: 1.4,
          fontSize: 34,
          bold: true,
          color: themeColors.textPrimary,
          valign: 'top',
          wrap: true,
          margin: 0,
          isTextBox: true,
          fontFace: 'Arial',
        });

        unitCoverSlide.addText(
          `Covering ${unit.topics.length} Mapped Topics • ${unit.totalQuestions} Practice & Exam Problems • 1 Question Per Slide`,
          {
            x: 1.0,
            y: 3.8,
            w: 11.0,
            h: 0.6,
            fontSize: 16,
            color: themeColors.textSecondary,
            margin: 0,
            fontFace: 'Calibri',
          }
        );

        // Render Topic Badges on the Unit Cover
        const topicListText = unit.topics.map((t, idx) => `${idx + 1}. ${t.topicName} (${t.questions.length}Q)`).join('   |   ');
        unitCoverSlide.addText(topicListText, {
          shape: pptx.ShapeType.roundRect,
          rectRadius: 0.08,
          x: 1.0,
          y: 4.7,
          w: 11.2,
          h: 1.4,
          fill: { color: themeColors.cardBg },
          line: { color: themeColors.cardBorder, width: 1 },
          fontSize: 12,
          color: themeColors.textSecondary,
          valign: 'middle',
          align: 'left',
          wrap: true,
          margin: 10,
          fontFace: 'Calibri',
        });

        // B. TOPICS & QUESTIONS INSIDE THIS UNIT
        for (const topic of unit.topics) {
          // TOPIC SUB-DIVIDER SLIDE
          const topicSlide = pptx.addSlide();
          topicSlide.background = { color: themeColors.bg };

          topicSlide.addText(unit.unitName.toUpperCase(), {
            shape: pptx.ShapeType.roundRect,
            rectRadius: 0.08,
            x: 1.0,
            y: 1.8,
            w: 2.2,
            h: 0.45,
            fill: { color: themeColors.unitTagBg },
            color: themeColors.unitTagText,
            fontSize: 11,
            bold: true,
            align: 'center',
            valign: 'middle',
            margin: 0,
            fontFace: 'Arial',
          });

          topicSlide.addText(topic.topicName, {
            x: 1.0,
            y: 2.5,
            w: 11.2,
            h: 2.0,
            fontSize: 30,
            bold: true,
            color: themeColors.textPrimary,
            valign: 'top',
            wrap: true,
            margin: 0,
            isTextBox: true,
            fontFace: 'Arial',
          });

          topicSlide.addText(`${topic.questions.length} Questions in this topic • ${unit.unitName}`, {
            x: 1.0,
            y: 4.8,
            w: 11.0,
            h: 0.6,
            fontSize: 15,
            color: themeColors.textSecondary,
            margin: 0,
            fontFace: 'Calibri',
          });

          // 1-QUESTION-PER-PAGE SLIDES
          for (let qIdx = 0; qIdx < topic.questions.length; qIdx++) {
            const q = topic.questions[qIdx];
            const slide = pptx.addSlide();
            slide.background = { color: themeColors.bg };

            // 1. TOP HEADER BAR: UNIT + MAPPED TOPIC (Left) & YEAR & EXAM BADGE (Right)
            slide.addText(q.unitNumber.toUpperCase(), {
              shape: pptx.ShapeType.roundRect,
              rectRadius: 0.08,
              x: 0.8,
              y: 0.45,
              w: 1.4,
              h: 0.42,
              fill: { color: themeColors.unitTagBg },
              fontSize: 10,
              bold: true,
              color: themeColors.unitTagText,
              align: 'center',
              valign: 'middle',
              margin: 0,
              fontFace: 'Arial',
            });

            slide.addText(q.mappedTopic, {
              x: 2.35,
              y: 0.45,
              w: 5.3,
              h: 0.42,
              fontSize: 12,
              bold: true,
              color: themeColors.textSecondary,
              valign: 'middle',
              align: 'left',
              margin: 0,
              wrap: true,
              isTextBox: true,
              fontFace: 'Calibri',
            });

            if (q.yearExam) {
              slide.addText(`🏷️ ${q.yearExam}`, {
                shape: pptx.ShapeType.roundRect,
                rectRadius: 0.08,
                x: 7.8,
                y: 0.45,
                w: 4.733,
                h: 0.42,
                fill: { color: themeColors.examBadgeBg },
                line: { color: themeColors.examBadgeBorder, width: 1 },
                fontSize: 10,
                bold: true,
                color: themeColors.examBadgeText,
                align: 'center',
                valign: 'middle',
                margin: 0,
                fontFace: 'Calibri',
              });
            }

            // 2. MAIN GRAND HERO QUESTION CONTAINER (Width: 11.733", Height: 5.20")
            slide.addShape(pptx.ShapeType.roundRect, {
              x: 0.8,
              y: 1.15,
              w: 11.733,
              h: 5.20,
              rectRadius: 0.12,
              fill: { color: themeColors.cardBg },
              line: { color: themeColors.cardBorder, width: 1.2 },
            });

            // Left Accent Stripe
            slide.addShape(pptx.ShapeType.roundRect, {
              x: 0.8,
              y: 1.15,
              w: 0.14,
              h: 5.20,
              rectRadius: 0.05,
              fill: { color: themeColors.accentGradient },
            });

            // Conservative PPT-Safe Typography
            const qLen = q.fullQuestionText.length;
            const pptFontSize = qLen > 360 ? 11 : qLen > 220 ? 12.5 : qLen > 120 ? 14.5 : qLen > 60 ? 16.5 : 18;

            slide.addText(
              [
                {
                  text: `QUESTION ${qIdx + 1}`,
                  options: {
                    fontSize: 12,
                    bold: true,
                    color: themeColors.accentGradient,
                    fontFace: 'Arial',
                    paraSpaceAfter: 8,
                  },
                },
                {
                  text: q.fullQuestionText,
                  options: {
                    fontSize: pptFontSize,
                    bold: true,
                    color: themeColors.textPrimary,
                    fontFace: 'Calibri',
                    lineSpacingMultiple: 1.18,
                  },
                },
              ],
              {
                x: 1.30,
                y: 1.45,
                w: 10.80,
                h: 4.50,
                valign: 'top',
                align: 'left',
                wrap: true,
                margin: 0,
                isTextBox: true,
              }
            );

            // 3. FOOTER
            slide.addText(`Apna Engineering Wallah • ${subjectName}`, {
              x: 0.8,
              y: 6.75,
              w: 6.0,
              h: 0.35,
              fontSize: 9.5,
              color: themeColors.textMuted,
              margin: 0,
              valign: 'middle',
              fontFace: 'Calibri',
            });

            slide.addText(`Question ${qIdx + 1} of ${topic.questions.length} (Overall Q${globalCounter}) • ${unit.unitName}`, {
              x: 7.0,
              y: 6.75,
              w: 5.533,
              h: 0.35,
              fontSize: 9.5,
              color: themeColors.textMuted,
              align: 'right',
              margin: 0,
              valign: 'middle',
              fontFace: 'Calibri',
            });

            // Optional Solution Slide
            if (includeSolutions && q.solution) {
              const solSlide = pptx.addSlide();
              solSlide.background = { color: themeColors.bg };

              solSlide.addText(`SOLUTION & KEY CONCEPTS • Q.${qIdx + 1} (${unit.unitName})`, {
                x: 0.8,
                y: 0.45,
                w: 7.0,
                h: 0.4,
                fontSize: 13,
                bold: true,
                color: '34D399',
                margin: 0,
                fontFace: 'Arial',
              });

              if (q.yearExam) {
                solSlide.addText(`Exam: ${q.yearExam}`, {
                  x: 8.0,
                  y: 0.45,
                  w: 4.533,
                  h: 0.4,
                  fontSize: 11,
                  color: themeColors.textSecondary,
                  align: 'right',
                  margin: 0,
                  fontFace: 'Calibri',
                });
              }

              solSlide.addShape(pptx.ShapeType.roundRect, {
                x: 0.8,
                y: 1.05,
                w: 11.733,
                h: 1.3,
                rectRadius: 0.1,
                fill: { color: themeColors.cardBg },
                line: { color: themeColors.cardBorder, width: 1 },
              });

              solSlide.addText(`Q.${qIdx + 1}: ${q.fullQuestionText}`, {
                x: 1.1,
                y: 1.15,
                w: 11.1,
                h: 1.1,
                fontSize: 13,
                color: themeColors.textSecondary,
                margin: 0,
                wrap: true,
                isTextBox: true,
                fontFace: 'Calibri',
              });

              solSlide.addShape(pptx.ShapeType.roundRect, {
                x: 0.8,
                y: 2.55,
                w: 11.733,
                h: 3.9,
                rectRadius: 0.1,
                fill: { color: themeColors.cardBg },
                line: { color: '34D399', width: 1.2 },
              });

              solSlide.addText(`Step-by-Step Solution & Key Points:\n\n${q.solution}`, {
                x: 1.2,
                y: 2.75,
                w: 10.9,
                h: 3.4,
                fontSize: 14,
                color: themeColors.textPrimary,
                margin: 0,
                wrap: true,
                isTextBox: true,
                fontFace: 'Calibri',
                lineSpacingMultiple: 1.2,
              });
            }

            globalCounter++;
          }
        }
      }

      const filename = `${subjectName.replace(/[^a-zA-Z0-9]/g, '_')}_UnitWise_Deck.pptx`;
      await pptx.writeFile({ fileName: filename });

      setSuccessToast(`Unit-Wise PowerPoint generated: ${filename}`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      alert('Failed to generate PowerPoint: ' + (err as Error).message);
    } finally {
      setIsGeneratingPpt(false);
    }
  };

  // ─── 2. EXPORT UNIT-WISE 16:9 PDF PRESENTATION DECK (.PDF) ────────────────────
  const handleExportPDF = async () => {
    if (questions.length === 0) {
      alert('Please upload an Excel file with questions first.');
      return;
    }

    setIsGeneratingPdf(true);
    try {
      // 16:9 Landscape Widescreen (297mm x 167.06mm)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [297, 167.06],
      });

      const pageWidth = 297;
      const pageHeight = 167.06;

      // ─── COVER SLIDE ───
      pdf.setFillColor(...themeColors.rgbBg);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      // Top Tag
      pdf.setFillColor(...themeColors.rgbUnitBg);
      pdf.roundedRect(18, 20, 60, 9, 2, 2, 'F');
      pdf.setTextColor(...themeColors.rgbUnitText);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text('APNA ENGINEERING WALLAH', 48, 26, { align: 'center' });

      // Deck Title
      pdf.setTextColor(...themeColors.rgbTextPrimary);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(24);
      pdf.text(deckTitle, 18, 44, { maxWidth: 260 });

      // Subtitle
      pdf.setTextColor(...themeColors.rgbTextSecondary);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(13);
      pdf.text(`${subjectName} • Complete Unit-Wise Question Bank Presentation`, 18, 65);

      // Stats Cards
      const totalTopicsCount = unitHierarchy.reduce((acc, u) => acc + u.topics.length, 0);
      const stats = [
        `* ${uniqueUnits.length} Units Covered`,
        `* ${totalTopicsCount} Mapped Topics`,
        `* ${questions.length} Exam Questions`,
      ];

      stats.forEach((st, idx) => {
        const xPos = 18 + (idx * 88);
        pdf.setFillColor(...themeColors.rgbCard);
        pdf.setDrawColor(...themeColors.rgbBorder);
        pdf.roundedRect(xPos, 85, 80, 16, 3, 3, 'FD');
        pdf.setTextColor(...themeColors.rgbTextPrimary);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.text(st, xPos + 40, 95, { align: 'center' });
      });

      // Cover Footer
      pdf.setTextColor(...themeColors.rgbTextMuted);
      pdf.setFontSize(9);
      pdf.text(`Faculty: ${userName} • Organized Unit-Wise for Structured Delivery`, 18, 155);

      // ─── UNIT-WISE SLIDE GENERATION ───
      let globalIdx = 1;

      for (const unit of unitHierarchy) {
        // A. UNIT MASTER SECTION COVER SLIDE
        pdf.addPage([297, 167.06], 'landscape');
        pdf.setFillColor(...themeColors.rgbBg);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        // Unit Pill
        pdf.setFillColor(...themeColors.rgbAccent);
        pdf.roundedRect(20, 30, 48, 11, 2, 2, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text(unit.unitName.toUpperCase(), 44, 37.5, { align: 'center' });

        // Unit Title
        pdf.setTextColor(...themeColors.rgbTextPrimary);
        pdf.setFontSize(26);
        pdf.text(`${unit.unitName} : Question Bank & PYQs`, 20, 58, { maxWidth: 257 });

        // Subtitle
        pdf.setTextColor(...themeColors.rgbTextSecondary);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(13);
        pdf.text(`Covering ${unit.topics.length} Mapped Topics • ${unit.totalQuestions} Questions • 1 Question Per Slide`, 20, 78);

        // Topic Box on Unit Cover
        pdf.setFillColor(...themeColors.rgbCard);
        pdf.setDrawColor(...themeColors.rgbBorder);
        pdf.roundedRect(20, 95, 257, 45, 3, 3, 'FD');
        pdf.setTextColor(...themeColors.rgbTextPrimary);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text('MAPPED TOPICS IN THIS UNIT:', 28, 105);

        pdf.setTextColor(...themeColors.rgbTextSecondary);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9.5);
        const topicSummary = unit.topics.map((t, idx) => `${idx + 1}. ${t.topicName} (${t.questions.length} Questions)`).join('\n');
        pdf.text(topicSummary, 28, 114);

        // B. TOPICS & QUESTIONS
        for (const topic of unit.topics) {
          // TOPIC DIVIDER SLIDE
          pdf.addPage([297, 167.06], 'landscape');
          pdf.setFillColor(...themeColors.rgbBg);
          pdf.rect(0, 0, pageWidth, pageHeight, 'F');

          pdf.setFillColor(...themeColors.rgbUnitBg);
          pdf.roundedRect(20, 35, 45, 10, 2, 2, 'F');
          pdf.setTextColor(...themeColors.rgbUnitText);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(11);
          pdf.text(unit.unitName.toUpperCase(), 42.5, 41.5, { align: 'center' });

          pdf.setTextColor(...themeColors.rgbTextPrimary);
          pdf.setFontSize(22);
          pdf.text(topic.topicName, 20, 62, { maxWidth: 257 });

          pdf.setTextColor(...themeColors.rgbTextSecondary);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(12);
          pdf.text(`${topic.questions.length} Practice & University Exam Problems • ${unit.unitName}`, 20, 95);

          // 1-QUESTION-PER-PAGE SLIDES
          for (let qIdx = 0; qIdx < topic.questions.length; qIdx++) {
            const q = topic.questions[qIdx];
            pdf.addPage([297, 167.06], 'landscape');

            pdf.setFillColor(...themeColors.rgbBg);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');

            // Header Bar
            pdf.setFillColor(...themeColors.rgbUnitBg);
            pdf.roundedRect(18, 10, 28, 8, 2, 2, 'F');
            pdf.setTextColor(...themeColors.rgbUnitText);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(9);
            pdf.text(q.unitNumber.toUpperCase(), 32, 15.5, { align: 'center' });

            pdf.setTextColor(...themeColors.rgbTextSecondary);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(10);
            pdf.text(q.mappedTopic, 50, 15.5, { maxWidth: 120 });

            if (q.yearExam) {
              pdf.setFillColor(...themeColors.rgbExamBg);
              pdf.setDrawColor(...themeColors.rgbBorder);
              pdf.roundedRect(185, 10, 94, 8, 2, 2, 'FD');
              pdf.setTextColor(...themeColors.rgbExamText);
              pdf.setFont('helvetica', 'bold');
              pdf.setFontSize(8.5);
              pdf.text(`[Exam] ${q.yearExam}`, 232, 15.5, { align: 'center', maxWidth: 90 });
            }

            // Main Hero Card
            const cardX = 18;
            const cardY = 24;
            const cardW = 261;
            const cardH = 125;

            pdf.setFillColor(...themeColors.rgbCard);
            pdf.setDrawColor(...themeColors.rgbBorder);
            pdf.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'FD');

            pdf.setFillColor(...themeColors.rgbAccent);
            pdf.roundedRect(cardX, cardY, 3, cardH, 1, 1, 'F');

            pdf.setTextColor(...themeColors.rgbAccent);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(11);
            pdf.text(`QUESTION ${qIdx + 1}`, cardX + 12, cardY + 14);

            const qLength = q.fullQuestionText.length;
            const pdfFontSize = qLength > 300 ? 11 : qLength > 180 ? 13 : qLength > 80 ? 15 : 17;
            pdf.setTextColor(...themeColors.rgbTextPrimary);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(pdfFontSize);

            const splitLines = pdf.splitTextToSize(q.fullQuestionText, cardW - 24);
            pdf.text(splitLines, cardX + 12, cardY + 28, { lineHeightFactor: 1.35 });

            // Footer
            pdf.setTextColor(...themeColors.rgbTextMuted);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8.5);
            pdf.text(`Apna Engineering Wallah • ${subjectName}`, 18, 158);
            pdf.text(`Question ${qIdx + 1} of ${topic.questions.length} (Overall Q${globalIdx}) • ${unit.unitName}`, 279, 158, { align: 'right' });

            globalIdx++;
          }
        }
      }

      const filename = `${subjectName.replace(/[^a-zA-Z0-9]/g, '_')}_UnitWise_Deck.pdf`;
      pdf.save(filename);

      setSuccessToast(`Unit-Wise PDF generated: ${filename}`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      alert('Failed to generate PDF: ' + (err as Error).message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const currentPreviewQuestion = filteredQuestions[activeSlideIndex];

  // Helper renderer for Slide Content (shared between inline and fullscreen)
  const renderSlideCanvasContent = (isFullscreen: boolean) => {
    if (!currentPreviewQuestion) return null;
    return (
      <div
        className={`w-full h-full flex flex-col justify-between box-border select-none ${
          isFullscreen ? 'p-8 sm:p-12' : 'p-4 sm:p-6'
        }`}
      >
        {/* 1. TOP HEADER BAR: UNIT + TOPIC (Left) & YEAR & EXAM BADGE (Right) */}
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-white/10 w-full min-w-0 shrink-0">
          {/* Left: Unit Pill & Topic */}
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            <span
              className={`shrink-0 px-2.5 py-0.5 rounded-md font-black font-mono tracking-wider uppercase bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 ${
                isFullscreen ? 'text-sm' : 'text-[10px] sm:text-xs'
              }`}
            >
              {currentPreviewQuestion.unitNumber}
            </span>
            <span
              className={`text-slate-200 font-bold truncate ${
                isFullscreen ? 'text-base sm:text-lg' : 'text-xs sm:text-sm'
              }`}
            >
              {currentPreviewQuestion.mappedTopic}
            </span>
          </div>

          {/* Right: Year & Exam Badge */}
          {currentPreviewQuestion.yearExam && (
            <div className="shrink-0 max-w-[42%] text-right overflow-hidden">
              <span
                className={`inline-block px-2.5 py-0.5 rounded-md font-bold font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 truncate max-w-full shadow-sm ${
                  isFullscreen ? 'text-xs sm:text-sm' : 'text-[10px] sm:text-xs'
                }`}
                title={currentPreviewQuestion.yearExam}
              >
                🏷️ {currentPreviewQuestion.yearExam}
              </span>
            </div>
          )}
        </div>

        {/* 2. GRAND HERO QUESTION CARD */}
        <div className="flex-1 my-2.5 sm:my-3 rounded-xl bg-slate-950/80 border border-slate-800/80 p-4 sm:p-6 flex flex-col justify-start relative overflow-hidden shadow-inner min-h-0">
          {/* Left Accent Glow Stripe */}
          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-indigo-500 via-purple-500 to-indigo-600" />

          <div className="pl-3 sm:pl-4 space-y-1.5 min-w-0 overflow-hidden">
            <div
              className={`text-indigo-400 font-black font-mono tracking-widest uppercase ${
                isFullscreen ? 'text-sm mb-2' : 'text-xs mb-1'
              }`}
            >
              QUESTION {activeSlideIndex + 1}
            </div>
            <div
              className={`font-bold leading-relaxed text-slate-100 break-words ${
                isFullscreen
                  ? 'text-lg sm:text-2xl md:text-3xl'
                  : 'text-xs sm:text-sm md:text-base lg:text-lg'
              }`}
              style={{
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                display: '-webkit-box',
                WebkitLineClamp: isFullscreen ? 8 : 5,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {currentPreviewQuestion.fullQuestionText}
            </div>
          </div>
        </div>

        {/* 3. SLIDE FOOTER */}
        <div
          className={`flex items-center justify-between pt-2 border-t border-white/10 text-slate-400 w-full min-w-0 shrink-0 ${
            isFullscreen ? 'text-xs sm:text-sm' : 'text-[10px] sm:text-xs'
          }`}
        >
          <span className="truncate mr-2">Apna Engineering Wallah • {subjectName}</span>
          <span className="font-mono shrink-0">
            Question {activeSlideIndex + 1} of {filteredQuestions.length} • {currentPreviewQuestion.unitNumber}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-full px-3 sm:px-6 py-6 space-y-6 text-slate-200 overflow-hidden box-border">
      
      {/* FULLSCREEN PREVIEW MODAL */}
      {isFullscreenPreview && currentPreviewQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-150">
          <div className="relative w-full max-w-5xl flex flex-col items-center gap-4">
            <div className="flex items-center justify-between w-full text-slate-300">
              <span className="text-sm font-semibold flex items-center gap-2 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                16:9 Standard Presentation Canvas (1920 × 1080)
              </span>
              <button
                onClick={() => setIsFullscreenPreview(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              style={{ aspectRatio: '16/9' }}
              className={`w-full rounded-2xl border shadow-2xl overflow-hidden transition-all ${
                theme === 'dark_tech'
                  ? 'bg-gradient-to-br from-[#0c1220] via-[#080c18] to-[#04060d] border-[#1E293B]'
                  : theme === 'clean_minimal'
                  ? 'bg-gradient-to-br from-[#ffffff] via-[#f8fafc] to-[#f1f5f9] border-[#E2E8F0]'
                  : 'bg-gradient-to-br from-[#08182b] via-[#061426] to-[#030a14] border-[#1A3A60]'
              }`}
            >
              {renderSlideCanvasContent(true)}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveSlideIndex((i) => Math.max(0, i - 1))}
                disabled={activeSlideIndex === 0}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold disabled:opacity-40"
              >
                Previous Slide
              </button>
              <span className="text-xs font-mono text-slate-400">
                {activeSlideIndex + 1} / {filteredQuestions.length}
              </span>
              <button
                onClick={() => setActiveSlideIndex((i) => Math.min(filteredQuestions.length - 1, i + 1))}
                disabled={activeSlideIndex === filteredQuestions.length - 1}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold disabled:opacity-40"
              >
                Next Slide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST FEEDBACK */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {successToast}
        </div>
      )}

      {/* HEADER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5 w-full min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 font-bold shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-slate-100 tracking-tight truncate">
              Excel to PowerPoint & PDF Slide Studio
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 truncate">
            <strong>Unit-Wise & Topic-Wise</strong> Presentation Deck Generator • 1 Question Per Slide • 16:9 Canvas
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDownloadSampleExcel}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-medium text-xs rounded-xl transition-colors flex items-center gap-1.5"
            title="Download Excel template"
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
        <div className="p-8 sm:p-12 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-5 w-full">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto text-2xl">
            📊
          </div>
          
          <div className="space-y-1.5">
            <h3 className="font-bold text-base text-slate-100">Upload Your Questions Spreadsheet</h3>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">
              Upload your question bank. Questions will be organized <strong>Unit-Wise</strong> (Unit 1, Unit 2...) and categorized into broadcast-quality 16:9 slides.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
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
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Excel Template Columns:
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1">
                <div className="font-bold text-indigo-400 flex items-center gap-1">
                  <Layers className="w-3 h-3" /> Unit Number (Primary)
                </div>
                <div className="text-[11px] text-slate-400">e.g. <em>UNIT 1</em>, <em>UNIT 2</em>, <em>UNIT 3</em></div>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1">
                <div className="font-bold text-purple-300 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> Mapped Topic (Secondary)
                </div>
                <div className="text-[11px] text-slate-400">e.g. <em>Sparse Matrix Representation</em></div>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1">
                <div className="font-bold text-amber-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Year & Exam
                </div>
                <div className="text-[11px] text-slate-400">e.g. <em>End Term Feb 2023</em></div>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1">
                <div className="font-bold text-emerald-400 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" /> Full Question Text
                </div>
                <div className="text-[11px] text-slate-400">The complete question statement & problem</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full min-w-0">
          
          {/* LEFT COLUMN: PRESENTATION SETTINGS & UNIT-WISE NAVIGATION */}
          <div className="space-y-4 min-w-0">
            
            {/* DECK CONFIGURATION */}
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" /> Presentation Settings
                </span>
                <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  {uniqueUnits.length} Units • {questions.length} Qs
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

                {/* CANVAS SPECS DISPLAY */}
                <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] space-y-1 font-mono text-slate-400">
                  <div className="text-indigo-400 font-bold flex items-center gap-1">
                    <span>📐</span> Standard 16:9 Canvas (Unit-Wise)
                  </div>
                  <div>Dimensions: 13.333" × 7.500" (1920×1080)</div>
                </div>

                {/* TOGGLE SOLUTIONS */}
                <div className="pt-1 border-t border-slate-800/60">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={includeSolutions}
                      onChange={(e) => setIncludeSolutions(e.target.checked)}
                      className="rounded accent-indigo-600"
                    />
                    <span>Add Solution Slide if available</span>
                  </label>
                </div>
              </div>

              {/* EXPORT BUTTONS */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={handleExportPowerPoint}
                  disabled={isGeneratingPpt || isGeneratingPdf}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isGeneratingPpt ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating Unit-Wise Deck...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" /> Download Unit-Wise PowerPoint (.pptx)
                    </>
                  )}
                </button>

                <button
                  onClick={handleExportPDF}
                  disabled={isGeneratingPpt || isGeneratingPdf}
                  className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 border border-emerald-500/40 text-emerald-400 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isGeneratingPdf ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating PDF...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 text-emerald-400" /> Download Presentation PDF (.pdf)
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* UNIT-WISE EXPLORER & FILTER */}
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 space-y-3 text-xs min-w-0">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <FolderKanban className="w-3.5 h-3.5 text-indigo-400" /> Unit-Wise Organization
              </span>

              {/* Unit Selection Pills */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => { setSelectedUnit('all'); setSelectedTopic('all'); setActiveSlideIndex(0); }}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors ${
                    selectedUnit === 'all'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All Units ({questions.length})
                </button>

                {uniqueUnits.map((u) => {
                  const count = questions.filter((q) => (q.unitNumber.trim() || 'UNIT 1') === u).length;
                  return (
                    <button
                      key={u}
                      onClick={() => { setSelectedUnit(u); setSelectedTopic('all'); setActiveSlideIndex(0); }}
                      className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs transition-colors ${
                        selectedUnit === u
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {u} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Topics List within selected unit */}
              <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-amber-400" /> Topics in {selectedUnit === 'all' ? 'All Units' : selectedUnit}:
                </div>

                <div className="space-y-1 max-h-44 overflow-y-auto">
                  <button
                    onClick={() => { setSelectedTopic('all'); setActiveSlideIndex(0); }}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-left transition-colors flex items-center justify-between text-[11px] ${
                      selectedTopic === 'all'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/60'
                    }`}
                  >
                    <span className="truncate">All Topics</span>
                    <span className="font-mono text-[10px] text-slate-500 shrink-0 ml-1">
                      {filteredQuestions.length}
                    </span>
                  </button>

                  {availableTopics.map((top) => {
                    const topCount = filteredQuestions.filter(
                      (q) => (q.mappedTopic.trim() || 'General Topic') === top
                    ).length;
                    return (
                      <button
                        key={top}
                        onClick={() => { setSelectedTopic(top); setActiveSlideIndex(0); }}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-left transition-colors flex items-center justify-between text-[11px] ${
                          selectedTopic === top
                            ? 'bg-slate-800 text-indigo-300 font-bold'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/60'
                        }`}
                      >
                        <span className="truncate mr-2">{top}</span>
                        <span className="font-mono text-[10px] text-slate-500 shrink-0">
                          {topCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
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

          {/* RIGHT COLUMN: 100% CONTAINED BROADCAST SLIDE CANVAS PREVIEW */}
          <div className="lg:col-span-2 space-y-4 min-w-0 w-full overflow-hidden">
            
            {/* SLIDE NAVIGATION STRIP */}
            <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800/80 rounded-xl px-4 py-2 text-xs min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-slate-200 shrink-0">
                  Slide {activeSlideIndex + 1} of {filteredQuestions.length}
                </span>
                <span className="text-[11px] text-slate-400 truncate">
                  • {currentPreviewQuestion?.unitNumber} • 16:9 Canvas
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setIsFullscreenPreview(true)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                  title="Expand Fullscreen 1080p Preview"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> Fullscreen
                </button>

                <div className="flex items-center gap-1">
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
            </div>

            {/* LIVE 16:9 SLIDE CANVAS PREVIEW (STRICT RATIO CONTAINER) */}
            {currentPreviewQuestion ? (
              <div
                style={{
                  aspectRatio: '16/9',
                  boxSizing: 'border-box',
                  width: '100%',
                  maxWidth: '100%',
                }}
                className={`rounded-2xl border shadow-2xl relative overflow-hidden transition-all ${
                  theme === 'dark_tech'
                    ? 'bg-gradient-to-br from-[#0c1220] via-[#080c18] to-[#04060d] border-[#1E293B] text-slate-100'
                    : theme === 'clean_minimal'
                    ? 'bg-gradient-to-br from-[#ffffff] via-[#f8fafc] to-[#f1f5f9] border-[#E2E8F0] text-slate-900'
                    : 'bg-gradient-to-br from-[#08182b] via-[#061426] to-[#030a14] border-[#1A3A60] text-white'
                }`}
              >
                {renderSlideCanvasContent(false)}
              </div>
            ) : null}

            {/* QUICK QUESTION NAVIGATION CAROUSEL (GROUPED UNIT-WISE) */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3 space-y-2 min-w-0">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Question Quick Navigation</span>
                <span className="text-[10px] text-indigo-400 font-mono">Sorted Unit-Wise</span>
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
                    title={`${q.unitNumber} - ${q.mappedTopic}`}
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
