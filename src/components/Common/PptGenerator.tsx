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
  yearExam: string;       // "Year & Exam" e.g. "Mid Term October 2024"
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
        'Year & Exam': 'Mid Term October 2024',
        'Unit Number': 'UNIT 2',
        'Mapped Topic': 'Sparse Matrix Representation (Array and Link List representation)',
        'Full Question Text': 'Explain different types of sparse matrix with suitable examples. Discuss the memory advantage of 3-tuple (triplet) representation over standard 2D array representation.',
        'Solution / Key Points': '1. Lower/Upper Triangular Matrix, Tridiagonal Matrix, Diagonal Matrix.\n2. Triplet Representation: Row, Column, Value (3 * non-zero elements + 1 header). Saves significant space when density < 1/3.',
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
        'Year & Exam': 'May 2023 End-Term (ETCS-304)',
        'Unit Number': 'UNIT 2',
        'Mapped Topic': 'Process Synchronization & Semaphores',
        'Full Question Text': 'Define Critical Section Problem. State the three mandatory requirements that any valid synchronization solution must satisfy (Mutual Exclusion, Progress, Bounded Waiting).',
        'Solution / Key Points': '1. Mutual Exclusion: Only one process inside critical section.\n2. Progress: Next process selection cannot be delayed indefinitely.\n3. Bounded Waiting: Bound on entry attempts.',
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

          const yearExam = findVal('yearexam', 'year', 'exam', 'session', 'pyq', 'source') || 'Practice Question';
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
  const handleExportPowerPoint = async () => {
    if (questions.length === 0) {
      alert('Please upload an Excel file with questions first.');
      return;
    }

    setIsGeneratingPpt(true);
    try {
      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_16x9'; // 13.33 x 7.5 inches

      // Theme Colors
      const themeColors = {
        dark_tech: {
          bg: '090D16',          // Dark luxury matte slate
          cardBorder: '1E293B',  // Hairline border
          accentGradient: '6366F1', // Indigo accent
          textPrimary: 'FFFFFF',
          textSecondary: '94A3B8',
          textMuted: '64748B',
          unitTagBg: '272757',
          unitTagText: 'A5B4FC',
          examBadgeBg: '451A03',
          examBadgeBorder: '78350F',
          examBadgeText: 'FDE68A',
        },
        clean_minimal: {
          bg: 'F8FAFC',
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

      // ─── 1. TITLE / COVER SLIDE ───
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
        w: 11.73,
        h: 1.8,
        fontSize: 36,
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
          fill: { color: themeColors.bg },
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
          fontSize: 34,
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

        // 1-QUESTION-PER-PAGE SLIDES (CLEAN, PROPORTIONAL & UNIFIED)
        for (let qIdx = 0; qIdx < topicQuestions.length; qIdx++) {
          const q = topicQuestions[qIdx];
          const slide = pptx.addSlide();
          slide.background = { color: themeColors.bg };

          // 1. TOP HEADER BAR: UNIT + MAPPED TOPIC (Left) & YEAR & EXAM BADGE (Right)
          // Unit Tag
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
            w: 5.2,
            h: 0.42,
            fontSize: 13,
            bold: true,
            color: themeColors.textSecondary,
            valign: 'middle',
            fontFace: 'Calibri',
          });

          // Year & Exam Highlight Tag (Right aligned with strict 11.73 total width limit)
          if (q.yearExam) {
            slide.addShape(pptx.ShapeType.roundRect, {
              x: 7.7,
              y: 0.42,
              w: 4.83,
              h: 0.48,
              rectRadius: 0.08,
              fill: { color: themeColors.examBadgeBg },
              line: { color: themeColors.examBadgeBorder, width: 1 },
            });

            slide.addText(`🏷️ ${q.yearExam}`, {
              x: 7.7,
              y: 0.42,
              w: 4.83,
              h: 0.48,
              fontSize: 11,
              bold: true,
              color: themeColors.examBadgeText,
              align: 'center',
              valign: 'middle',
              fontFace: 'Calibri',
            });
          }

          // Top Header Divider Line
          slide.addShape(pptx.ShapeType.rect, {
            x: 0.8,
            y: 1.1,
            w: 11.73,
            h: 0.015,
            fill: { color: themeColors.cardBorder },
          });

          // 2. HERO QUESTION CONTENT (Directly on slide canvas)
          // Question Header Label
          slide.addText(`QUESTION ${qIdx + 1}`, {
            x: 0.8,
            y: 1.6,
            w: 4.0,
            h: 0.45,
            fontSize: 18,
            bold: true,
            color: themeColors.accentGradient,
            fontFace: 'Arial',
          });

          // Full Question Text
          slide.addText(q.fullQuestionText, {
            x: 0.8,
            y: 2.2,
            w: 11.73,
            h: 4.0,
            fontSize: 24,
            bold: true,
            color: themeColors.textPrimary,
            fontFace: 'Calibri',
            valign: 'middle',
            lineSpacingMultiple: 1.25,
          });

          // Bottom Divider Line
          slide.addShape(pptx.ShapeType.rect, {
            x: 0.8,
            y: 6.55,
            w: 11.73,
            h: 0.015,
            fill: { color: themeColors.cardBorder },
          });

          // 3. FOOTER
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
            w: 5.53,
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
                w: 4.53,
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
              w: 11.73,
              h: 1.3,
              rectRadius: 0.1,
              fill: { color: themeColors.bg },
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
              w: 11.73,
              h: 3.9,
              rectRadius: 0.1,
              fill: { color: themeColors.bg },
              line: { color: '34D399', width: 1.2 },
            });

            solSlide.addText(`Step-by-Step Solution & Key Points:\n\n${q.solution}`, {
              x: 1.2,
              y: 2.75,
              w: 10.9,
              h: 3.4,
              fontSize: 15,
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

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-6 text-slate-200" style={{ overflowX: 'hidden', boxSizing: 'border-box' }}>
      
      {/* TOAST FEEDBACK */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {successToast}
        </div>
      )}

      {/* HEADER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5 min-w-0">
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
            Topic-Wise Presentation Generator • <strong>1 Question Per Slide</strong> • Widescreen 16:9
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
        <div className="p-8 sm:p-12 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-5 min-w-0">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto text-2xl">
            📊
          </div>
          
          <div className="space-y-1.5">
            <h3 className="font-bold text-base text-slate-100">Upload Your Questions Spreadsheet</h3>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">
              Upload your question bank. Each question will be formatted into a widescreen, broadcast-quality PowerPoint slide with topic categorization.
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
                <div className="text-[11px] text-slate-400">e.g. <em>Mid Term October 2024</em></div>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1">
                <div className="font-bold text-indigo-400 flex items-center gap-1">
                  <Layers className="w-3 h-3" /> Unit Number
                </div>
                <div className="text-[11px] text-slate-400">e.g. <em>UNIT 1</em>, <em>UNIT 2</em>, <em>Module 3</em></div>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ minWidth: 0, width: '100%' }}>
          
          {/* LEFT COLUMN */}
          <div className="space-y-4" style={{ minWidth: 0, overflow: 'hidden' }}>
            
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

                {/* TOGGLE SOLUTIONS */}
                <div className="pt-2 border-t border-slate-800/60">
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
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating Slides...
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

          {/* RIGHT COLUMN: SLIDE PREVIEW */}
          <div className="lg:col-span-2 space-y-4" style={{ minWidth: 0, overflow: 'hidden' }}>
            
            {/* SLIDE NAVIGATION STRIP */}
            <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800/80 rounded-xl px-4 py-2 text-xs min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-slate-200 shrink-0">
                  Slide {activeSlideIndex + 1} of {filteredQuestions.length}
                </span>
                <span className="text-[11px] text-slate-400 truncate">• 1 Question Per Slide View</span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
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

            {/* SLIDE CANVAS PREVIEW — STACKED HEADER, NO OVERFLOW */}
            {currentPreviewQuestion ? (
              <div
                style={{ aspectRatio: '16/9', boxSizing: 'border-box', overflow: 'hidden' }}
                className={`w-full rounded-2xl border flex flex-col shadow-2xl transition-all ${
                  theme === 'dark_tech'
                    ? 'bg-[#090D16] border-[#1E293B]'
                    : theme === 'clean_minimal'
                    ? 'bg-[#F8FAFC] border-[#E2E8F0]'
                    : 'bg-[#061426] border-[#1A3A60]'
                }`}
              >
                {/* HEADER SECTION — stacked into 2 rows so nothing overflows */}
                <div className="px-5 pt-3 pb-2 border-b border-white/10" style={{ flexShrink: 0 }}>
                  {/* Row 1: Unit pill + Mapped Topic */}
                  <div className="flex items-center gap-2 mb-1.5" style={{ overflow: 'hidden' }}>
                    <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-black font-mono tracking-widest uppercase bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      {currentPreviewQuestion.unitNumber}
                    </span>
                    <span className="text-slate-300 font-semibold truncate" style={{ fontSize: '11px' }}>
                      {currentPreviewQuestion.mappedTopic}
                    </span>
                  </div>
                  {/* Row 2: Year & Exam — full width, no overflow possible */}
                  {currentPreviewQuestion.yearExam && (
                    <div style={{ overflow: 'hidden' }}>
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-900/40 text-amber-300 border border-amber-700/50 truncate max-w-full">
                        🏷️ {currentPreviewQuestion.yearExam}
                      </span>
                    </div>
                  )}
                </div>

                {/* BODY: Question text */}
                <div className="flex-1 flex flex-col justify-center px-5 py-3" style={{ minHeight: 0, overflow: 'hidden' }}>
                  <div className="font-black font-mono tracking-widest uppercase mb-2 text-indigo-400" style={{ fontSize: '10px' }}>
                    QUESTION {activeSlideIndex + 1}
                  </div>
                  <div
                    className="font-bold leading-snug text-slate-100"
                    style={{
                      fontSize: 'clamp(0.75rem, 1.8vw, 1.25rem)',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 5,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {currentPreviewQuestion.fullQuestionText}
                  </div>
                </div>

                {/* FOOTER */}
                <div
                  className="flex items-center justify-between px-5 py-2 border-t border-white/10 text-slate-500"
                  style={{ flexShrink: 0, fontSize: '10px', overflow: 'hidden' }}
                >
                  <span className="truncate mr-2">Apna Engineering Wallah • {subjectName}</span>
                  <span className="font-mono shrink-0">
                    Q{activeSlideIndex + 1} / {filteredQuestions.length}
                  </span>
                </div>
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
