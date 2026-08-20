import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';
import { 
  FileSpreadsheet, Download, 
  ChevronLeft, ChevronRight, CheckCircle2,
  Trash2, Sliders,
  HelpCircle, RefreshCw, Layers,
  Calendar, BookOpen, Sparkles, Maximize2, X
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
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [deckTitle, setDeckTitle] = useState<string>('University Question Bank & PYQs');
  const [subjectName, setSubjectName] = useState<string>(userSubject);
  const [theme, setTheme] = useState<SlideTheme>('dark_tech');
  const [includeSolutions, setIncludeSolutions] = useState<boolean>(false);
  const [isGeneratingPpt, setIsGeneratingPpt] = useState<boolean>(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState<boolean>(false);

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
      const u = q.unitNumber.trim() || 'UNIT 1';
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
      const matchUnit = selectedUnit === 'all' || (q.unitNumber.trim() || 'UNIT 1') === selectedUnit;
      return matchTopic && matchUnit;
    });
  }, [questions, selectedTopic, selectedUnit]);

  // ─── DOWNLOAD SAMPLE EXCEL TEMPLATE ──────────────────────────────────────────
  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        'Year & Exam': 'End Term Feb 2023',
        'Unit Number': 'UNIT 2',
        'Mapped Topic': 'Sparse Matrix Representation (Array and Link List representation)',
        'Full Question Text': 'What is sparse matrix? Explain different types of sparse matrix with suitable examples. State different storage formats of sparse matrix.',
        'Solution / Key Points': '1. A sparse matrix is a matrix in which most of the elements are zero.\n2. Formats: 3-Tuple (Row, Column, Value), Linked List node representation.\n3. Benefits: Reduces memory consumption from O(N*M) to O(non-zero elements).',
      },
      {
        'Year & Exam': 'Mid Term October 2024',
        'Unit Number': 'UNIT 2',
        'Mapped Topic': 'Stack Applications & Infix to Postfix',
        'Full Question Text': 'What are polish notations in stack? Explain the complete conversion algorithm from Infix expression to Postfix notation with a trace table.',
        'Solution / Key Points': 'Polish notations include Prefix, Infix, and Postfix. Postfix eliminates ambiguity of operator precedence without needing parentheses.',
      },
      {
        'Year & Exam': 'March 2020 First-Term Examination (ETCS-304)',
        'Unit Number': 'UNIT 1',
        'Mapped Topic': 'Multiprogrammed Batches Systems',
        'Full Question Text': 'Differentiate between multiprogramming and multi tasking. Explain how CPU scheduling facilitates context switching in modern operating systems.',
        'Solution / Key Points': '1. Multiprogramming keeps multiple jobs in memory to maximize CPU utilization.\n2. Multitasking switches CPU rapidly between user tasks for interactive execution.',
      },
      {
        'Year & Exam': 'December 2022 End-Sem Examination (ETCS-304)',
        'Unit Number': 'UNIT 1',
        'Mapped Topic': 'Operating System Structures & System Calls',
        'Full Question Text': 'What are System Calls? Explain the step-by-step mechanism of handling a system call with the help of a dual-mode (User Mode vs Kernel Mode) transition diagram.',
        'Solution / Key Points': 'System calls provide an interface between a user program and OS kernel. Transition happens via software trap instruction setting mode bit to 0 (Kernel Mode).',
      },
      {
        'Year & Exam': 'December 2023 End-Sem (ETCS-304)',
        'Unit Number': 'UNIT 3',
        'Mapped Topic': 'Deadlocks & Resource Allocation Graph',
        'Full Question Text': 'State the four necessary and sufficient conditions for Deadlock occurrence. How does Banker’s Algorithm ensure Deadlock Avoidance in a multi-resource system?',
        'Solution / Key Points': 'Four Conditions: Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait. Banker algorithm simulates resource safety sequence.',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws['!cols'] = [
      { wch: 40 }, // Year & Exam
      { wch: 15 }, // Unit Number
      { wch: 45 }, // Mapped Topic
      { wch: 80 }, // Full Question Text
      { wch: 60 }, // Solution / Key Points
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

  // ─── EXPORT BROADCAST-READY POWERPOINT (.PPTX) ────────────────────────────────
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

      // Theme Color Palettes
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
        },
      }[theme];

      // ─── 1. COVER / TITLE SLIDE ───
      const titleSlide = pptx.addSlide();
      titleSlide.background = { color: themeColors.bg };

      titleSlide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8,
        y: 1.0,
        w: 3.5,
        h: 0.45,
        rectRadius: 0.08,
        fill: { color: themeColors.unitTagBg },
      });

      titleSlide.addText('APNA ENGINEERING WALLAH', {
        x: 0.8,
        y: 1.0,
        w: 3.5,
        h: 0.45,
        fontSize: 11,
        bold: true,
        color: themeColors.unitTagText,
        align: 'center',
        valign: 'middle',
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
        fontFace: 'Arial',
      });

      titleSlide.addText(`${subjectName} • 1 Question Per Slide Presentation Deck`, {
        x: 0.8,
        y: 3.7,
        w: 11.5,
        h: 0.5,
        fontSize: 16,
        color: themeColors.textSecondary,
        fontFace: 'Calibri',
      });

      const stats = [
        `📚 ${questions.length} Exam Questions`,
        `📑 ${uniqueTopics.length} Mapped Topics`,
        `🏛️ ${uniqueUnits.length} Units Covered`,
      ];

      stats.forEach((st, i) => {
        titleSlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8 + (i * 3.6),
          y: 4.6,
          w: 3.3,
          h: 0.7,
          rectRadius: 0.1,
          fill: { color: themeColors.cardBg },
          line: { color: themeColors.cardBorder, width: 1 },
        });

        titleSlide.addText(st, {
          x: 0.8 + (i * 3.6),
          y: 4.6,
          w: 3.3,
          h: 0.7,
          fontSize: 13,
          bold: true,
          color: themeColors.textPrimary,
          align: 'center',
          valign: 'middle',
          fontFace: 'Arial',
        });
      });

      titleSlide.addText(`Faculty: ${userName} • Prepared for Video Recording & Classroom Delivery`, {
        x: 0.8,
        y: 6.7,
        w: 10.0,
        h: 0.4,
        fontSize: 11,
        color: themeColors.textMuted,
        fontFace: 'Calibri',
      });

      // ─── 2. TOPIC DIVIDERS & 1-QUESTION-PER-PAGE SLIDES ───
      let globalCounter = 1;

      for (const topicName of uniqueTopics) {
        const topicQuestions = topicGroups[topicName];
        const unitName = topicQuestions[0]?.unitNumber || 'UNIT 1';

        // SECTION DIVIDER SLIDE
        const sectionSlide = pptx.addSlide();
        sectionSlide.background = { color: themeColors.bg };

        sectionSlide.addShape(pptx.ShapeType.roundRect, {
          x: 1.0,
          y: 1.8,
          w: 2.2,
          h: 0.45,
          rectRadius: 0.08,
          fill: { color: themeColors.accentGradient },
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
          fontFace: 'Arial',
        });

        sectionSlide.addText(topicName, {
          x: 1.0,
          y: 2.5,
          w: 11.2,
          h: 2.0,
          fontSize: 32,
          bold: true,
          color: themeColors.textPrimary,
          fontFace: 'Arial',
        });

        sectionSlide.addText(`${topicQuestions.length} Practice & University Exam Problems • 1 Question Per Slide`, {
          x: 1.0,
          y: 4.8,
          w: 11.0,
          h: 0.6,
          fontSize: 16,
          color: themeColors.textSecondary,
          fontFace: 'Calibri',
        });

        // 1-QUESTION-PER-PAGE SLIDES (HERO GRAND CARD LAYOUT)
        for (let qIdx = 0; qIdx < topicQuestions.length; qIdx++) {
          const q = topicQuestions[qIdx];
          const slide = pptx.addSlide();
          slide.background = { color: themeColors.bg };

          // 1. TOP HEADER BAR: UNIT + MAPPED TOPIC (Left) & YEAR & EXAM BADGE (Right)
          // Unit Tag Pill
          slide.addShape(pptx.ShapeType.roundRect, {
            x: 0.8,
            y: 0.45,
            w: 1.4,
            h: 0.42,
            rectRadius: 0.08,
            fill: { color: themeColors.unitTagBg },
          });

          slide.addText(q.unitNumber.toUpperCase(), {
            x: 0.8,
            y: 0.45,
            w: 1.4,
            h: 0.42,
            fontSize: 11,
            bold: true,
            color: themeColors.unitTagText,
            align: 'center',
            valign: 'middle',
            fontFace: 'Arial',
          });

          // Mapped Topic Name
          slide.addText(q.mappedTopic, {
            x: 2.35,
            y: 0.45,
            w: 5.5,
            h: 0.42,
            fontSize: 12,
            bold: true,
            color: themeColors.textSecondary,
            valign: 'middle',
            fontFace: 'Calibri',
          });

          // Year & Exam Highlight Tag (Top Right)
          if (q.yearExam) {
            slide.addShape(pptx.ShapeType.roundRect, {
              x: 8.0,
              y: 0.42,
              w: 4.533,
              h: 0.48,
              rectRadius: 0.08,
              fill: { color: themeColors.examBadgeBg },
              line: { color: themeColors.examBadgeBorder, width: 1 },
            });

            slide.addText(`🏷️ ${q.yearExam}`, {
              x: 8.0,
              y: 0.42,
              w: 4.533,
              h: 0.48,
              fontSize: 11,
              bold: true,
              color: themeColors.examBadgeText,
              align: 'center',
              valign: 'middle',
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

          // Question Label
          slide.addText(`QUESTION ${qIdx + 1}`, {
            x: 1.25,
            y: 1.45,
            w: 3.5,
            h: 0.40,
            fontSize: 14,
            bold: true,
            color: themeColors.accentGradient,
            fontFace: 'Arial',
          });

          // Adaptive Font Sizing for Question Text (Strict Canvas Bounds)
          const qLen = q.fullQuestionText.length;
          const pptFontSize = qLen > 320 ? 13 : qLen > 180 ? 15 : qLen > 80 ? 17 : 19;

          // Full Question Text
          slide.addText(q.fullQuestionText, {
            x: 1.25,
            y: 1.95,
            w: 10.9,
            h: 4.10,
            fontSize: pptFontSize,
            bold: true,
            color: themeColors.textPrimary,
            fontFace: 'Calibri',
            valign: 'top',
            lineSpacingMultiple: 1.2,
          });

          // 3. FOOTER (Y: 6.75", Height: 0.35")
          slide.addText(`Apna Engineering Wallah • ${subjectName}`, {
            x: 0.8,
            y: 6.75,
            w: 6.0,
            h: 0.35,
            fontSize: 10,
            color: themeColors.textMuted,
            fontFace: 'Calibri',
          });

          slide.addText(`Question ${qIdx + 1} of ${topicQuestions.length} (Overall Q${globalCounter}) • ${q.unitNumber}`, {
            x: 7.0,
            y: 6.75,
            w: 5.533,
            h: 0.35,
            fontSize: 10,
            color: themeColors.textMuted,
            align: 'right',
            fontFace: 'Calibri',
          });

          // Optional Solution Slide
          if (includeSolutions && q.solution) {
            const solSlide = pptx.addSlide();
            solSlide.background = { color: themeColors.bg };

            solSlide.addText(`SOLUTION & KEY CONCEPTS • Q.${qIdx + 1}`, {
              x: 0.8,
              y: 0.45,
              w: 7.0,
              h: 0.4,
              fontSize: 13,
              bold: true,
              color: '34D399',
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
              fontFace: 'Calibri',
              lineSpacingMultiple: 1.2,
            });
          }

          globalCounter++;
        }
      }

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
              Excel to PowerPoint Slide Deck Studio
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 truncate">
            Topic-Wise Presentation Generator • <strong>1 Question Per Slide</strong> • 16:9 Standard Canvas
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
              Upload your question bank. Each question will be formatted into a widescreen 16:9 broadcast-quality PowerPoint slide with topic categorization.
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
                <div className="font-bold text-amber-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Year & Exam
                </div>
                <div className="text-[11px] text-slate-400">e.g. <em>End Term Feb 2023</em></div>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1">
                <div className="font-bold text-indigo-400 flex items-center gap-1">
                  <Layers className="w-3 h-3" /> Unit Number
                </div>
                <div className="text-[11px] text-slate-400">e.g. <em>UNIT 2</em>, <em>Module 3</em></div>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1">
                <div className="font-bold text-purple-300 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> Mapped Topic
                </div>
                <div className="text-[11px] text-slate-400">e.g. <em>Sparse Matrix Representation</em></div>
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
          
          {/* LEFT COLUMN: PRESENTATION SETTINGS & FILTER */}
          <div className="space-y-4 min-w-0">
            
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

                {/* CANVAS SPECS DISPLAY */}
                <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] space-y-1 font-mono text-slate-400">
                  <div className="text-indigo-400 font-bold flex items-center gap-1">
                    <span>📐</span> Standard 16:9 Canvas
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

              {/* EXPORT BUTTON */}
              <button
                onClick={handleExportPowerPoint}
                disabled={isGeneratingPpt}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGeneratingPpt ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating Deck...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> Download PowerPoint (.pptx)
                  </>
                )}
              </button>
            </div>

            {/* TOPIC FILTER */}
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 space-y-3 text-xs min-w-0">
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
                  <span className="truncate">All Topics</span>
                  <span className="font-mono text-[10px] text-slate-500 shrink-0 ml-1">{questions.length}</span>
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

          {/* RIGHT COLUMN: 100% CONTAINED BROADCAST SLIDE CANVAS PREVIEW */}
          <div className="lg:col-span-2 space-y-4 min-w-0 w-full overflow-hidden">
            
            {/* SLIDE NAVIGATION STRIP */}
            <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800/80 rounded-xl px-4 py-2 text-xs min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-slate-200 shrink-0">
                  Slide {activeSlideIndex + 1} of {filteredQuestions.length}
                </span>
                <span className="text-[11px] text-slate-400 truncate">• 16:9 Canvas</span>
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

            {/* QUICK QUESTION NAVIGATION CAROUSEL */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3 space-y-2 min-w-0">
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
