import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';
import { 
  FileSpreadsheet, Download, 
  ChevronLeft, ChevronRight, CheckCircle2,
  Trash2, Sliders,
  HelpCircle, RefreshCw, Layers
} from 'lucide-react';

export interface ParsedQuestion {
  id: string;
  topic: string;
  questionNumber?: number;
  questionText: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctAnswer?: string;
  explanation?: string;
  difficulty?: string;
}

interface PptGeneratorProps {
  userSubject?: string;
  userName?: string;
}

type SlideTheme = 'dark_indigo' | 'clean_light' | 'academic_navy';

export const PptGenerator: React.FC<PptGeneratorProps> = ({
  userSubject = 'Engineering Curriculum',
  userName = 'Faculty',
}) => {
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [deckTitle, setDeckTitle] = useState<string>('Question Bank & Practice Deck');
  const [subjectName, setSubjectName] = useState<string>(userSubject);
  const [theme, setTheme] = useState<SlideTheme>('dark_indigo');
  const [includeAnswers, setIncludeAnswers] = useState<boolean>(true);
  const [includeAnswerKeySlide, setIncludeAnswerKeySlide] = useState<boolean>(true);
  const [isGeneratingPpt, setIsGeneratingPpt] = useState<boolean>(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Group questions topic-wise
  const topicGroups = React.useMemo(() => {
    const groups: { [key: string]: ParsedQuestion[] } = {};
    questions.forEach((q) => {
      const t = q.topic.trim() || 'General Questions';
      if (!groups[t]) groups[t] = [];
      groups[t].push(q);
    });
    return groups;
  }, [questions]);

  const uniqueTopics = Object.keys(topicGroups);

  const filteredQuestions = React.useMemo(() => {
    if (selectedTopic === 'all') return questions;
    return questions.filter((q) => (q.topic.trim() || 'General Questions') === selectedTopic);
  }, [questions, selectedTopic]);

  // Generate Sample Excel File
  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        Topic: 'Binary Trees & BST',
        Question: 'What is the worst-case time complexity of searching for an element in a standard Binary Search Tree of n nodes?',
        'Option A': 'O(1)',
        'Option B': 'O(log n)',
        'Option C': 'O(n)',
        'Option D': 'O(n log n)',
        'Correct Answer': 'Option C',
        Explanation: 'In a skewed binary search tree (like a linked list), searching takes O(n) comparisons in worst case.',
        Difficulty: 'Medium',
      },
      {
        Topic: 'Binary Trees & BST',
        Question: 'Which traversal of a Binary Search Tree produces elements in strictly ascending sorted order?',
        'Option A': 'Preorder Traversal',
        'Option B': 'Inorder Traversal',
        'Option C': 'Postorder Traversal',
        'Option D': 'Level Order Traversal',
        'Correct Answer': 'Option B',
        Explanation: 'Inorder traversal visits Left -> Root -> Right, generating keys in ascending sorted order.',
        Difficulty: 'Easy',
      },
      {
        Topic: 'Graph Algorithms',
        Question: 'Which algorithm is optimal for finding the shortest path from a single source vertex to all other vertices in a weighted graph with non-negative edge weights?',
        'Option A': 'Bellman-Ford Algorithm',
        'Option B': 'Floyd-Warshall Algorithm',
        'Option C': 'Dijkstra Algorithm',
        'Option D': 'Kruskal Algorithm',
        'Correct Answer': 'Option C',
        Explanation: 'Dijkstra runs in O((V + E) log V) with min-heap and is optimal for non-negative weights.',
        Difficulty: 'Medium',
      },
      {
        Topic: 'Graph Algorithms',
        Question: 'What is the maximum number of edges in an undirected simple graph with n vertices?',
        'Option A': 'n * (n - 1)',
        'Option B': 'n * (n - 1) / 2',
        'Option C': 'n * n',
        'Option D': '2^n',
        'Correct Answer': 'Option B',
        Explanation: 'Each pair of distinct vertices can have at most 1 edge, giving nC2 = n(n - 1)/2.',
        Difficulty: 'Easy',
      },
      {
        Topic: 'Dynamic Programming',
        Question: 'What are the two key properties required for a problem to be solved using Dynamic Programming?',
        'Option A': 'Divide and conquer & Recursion',
        'Option B': 'Overlapping subproblems & Optimal substructure',
        'Option C': 'Greedy choice & Topological ordering',
        'Option D': 'Memoization & Branch and bound',
        'Correct Answer': 'Option B',
        Explanation: 'Dynamic Programming requires overlapping subproblems and optimal substructure properties.',
        Difficulty: 'Hard',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    // Set auto column width
    ws['!cols'] = [
      { wch: 22 }, // Topic
      { wch: 60 }, // Question
      { wch: 25 }, // Option A
      { wch: 25 }, // Option B
      { wch: 25 }, // Option C
      { wch: 25 }, // Option D
      { wch: 15 }, // Correct Answer
      { wch: 45 }, // Explanation
      { wch: 12 }, // Difficulty
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');
    XLSX.writeFile(wb, 'AEW_Questions_Template.xlsx');

    setSuccessToast('Downloaded sample Excel template!');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Parse Uploaded Excel or CSV File
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

        // Map flexible headers
        const parsed: ParsedQuestion[] = rawData.map((row, idx) => {
          // Flexible key lookup
          const findKey = (...aliases: string[]) => {
            for (const key of Object.keys(row)) {
              const clean = key.toLowerCase().replace(/[^a-z0-9]/g, '');
              for (const alias of aliases) {
                if (clean.includes(alias.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
                  return row[key];
                }
              }
            }
            return undefined;
          };

          const topic = findKey('topic', 'chapter', 'unit', 'module', 'subject') || 'General Topic';
          const questionText = findKey('question', 'problem', 'statement', 'qtext', 'ques') || `Question ${idx + 1}`;
          const optionA = findKey('optiona', 'opt a', 'a', 'choice a');
          const optionB = findKey('optionb', 'opt b', 'b', 'choice b');
          const optionC = findKey('optionc', 'opt c', 'c', 'choice c');
          const optionD = findKey('optiond', 'opt d', 'd', 'choice d');
          const correctAnswer = findKey('correctanswer', 'answer', 'ans', 'correct');
          const explanation = findKey('explanation', 'solution', 'hint', 'explain');
          const difficulty = findKey('difficulty', 'level', 'marks');

          return {
            id: `q-${Date.now()}-${idx}`,
            questionNumber: idx + 1,
            topic: String(topic).trim(),
            questionText: String(questionText).trim(),
            optionA: optionA !== undefined ? String(optionA).trim() : undefined,
            optionB: optionB !== undefined ? String(optionB).trim() : undefined,
            optionC: optionC !== undefined ? String(optionC).trim() : undefined,
            optionD: optionD !== undefined ? String(optionD).trim() : undefined,
            correctAnswer: correctAnswer !== undefined ? String(correctAnswer).trim() : undefined,
            explanation: explanation !== undefined ? String(explanation).trim() : undefined,
            difficulty: difficulty !== undefined ? String(difficulty).trim() : undefined,
          };
        });

        const validQuestions = parsed.filter((q) => q.questionText.length > 3);

        if (validQuestions.length === 0) {
          setErrorMessage('Could not find question text in the uploaded file. Please use the standard template.');
          return;
        }

        setQuestions(validQuestions);
        setActiveSlideIndex(0);
        setSelectedTopic('all');
        setSuccessToast(`Successfully parsed ${validQuestions.length} questions across ${new Set(validQuestions.map((q) => q.topic)).size} topics!`);
        setTimeout(() => setSuccessToast(null), 3500);
      } catch (err) {
        setErrorMessage('Failed to parse Excel file. Please ensure valid .xlsx, .xls, or .csv format.');
      }
    };

    reader.readAsBinaryString(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Export PowerPoint (.pptx) Presentation
  const handleExportPowerPoint = async () => {
    if (questions.length === 0) {
      alert('Please upload an Excel file with questions first.');
      return;
    }

    setIsGeneratingPpt(true);
    try {
      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_16x9';

      // Define Color Palettes
      const colors = {
        dark_indigo: {
          bg: '0F172A',         // Slate 900
          cardBg: '1E293B',     // Slate 800
          border: '334155',     // Slate 700
          primaryText: 'F8FAFC',// Slate 50
          secondaryText: '94A3B8', // Slate 400
          accent: '6366F1',     // Indigo 500
          accentText: 'C7D2FE', // Indigo 200
          gold: 'FBBF24',       // Amber 400
          green: '34D399',      // Emerald 400
        },
        clean_light: {
          bg: 'FFFFFF',
          cardBg: 'F8FAFC',
          border: 'E2E8F0',
          primaryText: '0F172A',
          secondaryText: '64748B',
          accent: '4F46E5',
          accentText: '4338CA',
          gold: 'D97706',
          green: '059669',
        },
        academic_navy: {
          bg: '0B192C',
          cardBg: '1E3E62',
          border: '2E5A88',
          primaryText: 'FFFFFF',
          secondaryText: 'B4C5D9',
          accent: '00ADB5',
          accentText: 'EEEEEE',
          gold: 'FFD369',
          green: '4ECCA3',
        },
      }[theme];

      // ─── SLIDE 1: MAIN TITLE SLIDE ───
      const titleSlide = pptx.addSlide();
      titleSlide.background = { color: colors.bg };

      titleSlide.addText('APNA ENGINEERING WALLAH', {
        x: 0.8,
        y: 1.2,
        w: 8.5,
        h: 0.4,
        fontSize: 13,
        bold: true,
        color: colors.accentText,
        fontFace: 'Arial',
      });

      titleSlide.addText(deckTitle, {
        x: 0.8,
        y: 1.8,
        w: 11.5,
        h: 1.8,
        fontSize: 34,
        bold: true,
        color: colors.primaryText,
        fontFace: 'Arial',
      });

      titleSlide.addText(`${subjectName} • 1 Question Per Page Slide Deck`, {
        x: 0.8,
        y: 3.8,
        w: 10,
        h: 0.6,
        fontSize: 16,
        color: colors.secondaryText,
        fontFace: 'Arial',
      });

      titleSlide.addText(`Prepared by ${userName} • ${questions.length} Total Questions across ${uniqueTopics.length} Topics`, {
        x: 0.8,
        y: 5.8,
        w: 10,
        h: 0.5,
        fontSize: 12,
        color: colors.secondaryText,
        fontFace: 'Arial',
      });

      // ─── GENERATE TOPIC SECTIONS & 1 QUESTION PER SLIDE ───
      let globalQuestionCounter = 1;

      for (const topicName of uniqueTopics) {
        const topicQuestions = topicGroups[topicName];

        // 1. Topic Divider / Section Header Slide
        const sectionSlide = pptx.addSlide();
        sectionSlide.background = { color: colors.bg };

        // Subtle category pill
        sectionSlide.addShape(pptx.ShapeType.roundRect, {
          x: 1.0,
          y: 2.0,
          w: 2.2,
          h: 0.45,
          rectRadius: 0.1,
          fill: { color: colors.accent },
        });

        sectionSlide.addText('TOPIC MODULE', {
          x: 1.0,
          y: 2.0,
          w: 2.2,
          h: 0.45,
          fontSize: 11,
          bold: true,
          color: 'FFFFFF',
          align: 'center',
          fontFace: 'Arial',
        });

        sectionSlide.addText(topicName, {
          x: 1.0,
          y: 2.8,
          w: 11.0,
          h: 1.6,
          fontSize: 32,
          bold: true,
          color: colors.primaryText,
          fontFace: 'Arial',
        });

        sectionSlide.addText(`${topicQuestions.length} Practice Questions • 1 Question Per Slide`, {
          x: 1.0,
          y: 4.6,
          w: 10.0,
          h: 0.5,
          fontSize: 15,
          color: colors.secondaryText,
          fontFace: 'Arial',
        });

        // 2. Individual Question Slides (1 Question Per Page)
        for (let qIndex = 0; qIndex < topicQuestions.length; qIndex++) {
          const q = topicQuestions[qIndex];
          const slide = pptx.addSlide();
          slide.background = { color: colors.bg };

          // TOP HEADER STRIP: Topic Name & Question Badge
          slide.addText(`TOPIC: ${topicName.toUpperCase()}`, {
            x: 0.8,
            y: 0.4,
            w: 8.0,
            h: 0.35,
            fontSize: 11,
            bold: true,
            color: colors.accentText,
            fontFace: 'Arial',
          });

          slide.addText(`Question ${qIndex + 1} of ${topicQuestions.length} (Overall Q${globalQuestionCounter})`, {
            x: 8.0,
            y: 0.4,
            w: 4.5,
            h: 0.35,
            fontSize: 11,
            color: colors.secondaryText,
            align: 'right',
            fontFace: 'Arial',
          });

          // QUESTION STATEMENT CONTAINER
          slide.addShape(pptx.ShapeType.roundRect, {
            x: 0.8,
            y: 0.9,
            w: 11.7,
            h: 1.8,
            rectRadius: 0.1,
            fill: { color: colors.cardBg },
            line: { color: colors.border, width: 1 },
          });

          slide.addText(`Q${qIndex + 1}. ${q.questionText}`, {
            x: 1.0,
            y: 1.0,
            w: 11.3,
            h: 1.6,
            fontSize: 18,
            bold: true,
            color: colors.primaryText,
            fontFace: 'Arial',
            valign: 'middle',
          });

          // MCQ OPTIONS (A, B, C, D) - 2x2 Grid Layout
          const hasOptions = q.optionA || q.optionB || q.optionC || q.optionD;

          if (hasOptions) {
            const optionBoxW = 5.7;
            const optionBoxH = 1.35;
            const row1Y = 3.0;
            const row2Y = 4.6;
            const col1X = 0.8;
            const col2X = 6.8;

            const renderOptionBox = (optLabel: string, optText: string | undefined, x: number, y: number) => {
              if (!optText) return;

              slide.addShape(pptx.ShapeType.roundRect, {
                x,
                y,
                w: optionBoxW,
                h: optionBoxH,
                rectRadius: 0.1,
                fill: { color: colors.cardBg },
                line: { color: colors.border, width: 1 },
              });

              // Option Label Badge (A / B / C / D)
              slide.addShape(pptx.ShapeType.roundRect, {
                x: x + 0.2,
                y: y + 0.35,
                w: 0.65,
                h: 0.65,
                rectRadius: 0.08,
                fill: { color: colors.accent },
              });

              slide.addText(optLabel, {
                x: x + 0.2,
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

              slide.addText(optText, {
                x: x + 1.0,
                y: y + 0.15,
                w: optionBoxW - 1.2,
                h: optionBoxH - 0.3,
                fontSize: 14,
                color: colors.primaryText,
                fontFace: 'Arial',
                valign: 'middle',
              });
            };

            renderOptionBox('A', q.optionA, col1X, row1Y);
            renderOptionBox('B', q.optionB, col2X, row1Y);
            renderOptionBox('C', q.optionC, col1X, row2Y);
            renderOptionBox('D', q.optionD, col2X, row2Y);
          }

          // FOOTER: Difficulty & Watermark
          slide.addText(`Apna Engineering Wallah • ${subjectName}`, {
            x: 0.8,
            y: 6.8,
            w: 6.0,
            h: 0.3,
            fontSize: 9,
            color: colors.secondaryText,
            fontFace: 'Arial',
          });

          if (q.difficulty) {
            slide.addText(`Difficulty: ${q.difficulty}`, {
              x: 8.0,
              y: 6.8,
              w: 4.5,
              h: 0.3,
              fontSize: 9,
              color: colors.gold,
              align: 'right',
              fontFace: 'Arial',
            });
          }

          // OPTIONAL: Detailed Solution Slide right after question
          if (includeAnswers && (q.correctAnswer || q.explanation)) {
            const answerSlide = pptx.addSlide();
            answerSlide.background = { color: colors.bg };

            answerSlide.addText(`SOLUTION & EXPLANATION • Q${qIndex + 1}`, {
              x: 0.8,
              y: 0.6,
              w: 10.0,
              h: 0.4,
              fontSize: 12,
              bold: true,
              color: colors.green,
              fontFace: 'Arial',
            });

            answerSlide.addText(`Question: ${q.questionText}`, {
              x: 0.8,
              y: 1.2,
              w: 11.7,
              h: 1.0,
              fontSize: 15,
              bold: true,
              color: colors.secondaryText,
              fontFace: 'Arial',
            });

            // Correct Answer Box
            if (q.correctAnswer) {
              answerSlide.addShape(pptx.ShapeType.roundRect, {
                x: 0.8,
                y: 2.4,
                w: 11.7,
                h: 0.9,
                rectRadius: 0.1,
                fill: { color: colors.cardBg },
                line: { color: colors.green, width: 1.5 },
              });

              answerSlide.addText(`✓ Correct Answer: ${q.correctAnswer}`, {
                x: 1.1,
                y: 2.5,
                w: 11.0,
                h: 0.7,
                fontSize: 18,
                bold: true,
                color: colors.green,
                fontFace: 'Arial',
                valign: 'middle',
              });
            }

            // Explanation Box
            if (q.explanation) {
              answerSlide.addShape(pptx.ShapeType.roundRect, {
                x: 0.8,
                y: 3.6,
                w: 11.7,
                h: 2.6,
                rectRadius: 0.1,
                fill: { color: colors.cardBg },
                line: { color: colors.border, width: 1 },
              });

              answerSlide.addText(`Detailed Concept Explanation:\n\n${q.explanation}`, {
                x: 1.1,
                y: 3.8,
                w: 11.1,
                h: 2.2,
                fontSize: 14,
                color: colors.primaryText,
                fontFace: 'Arial',
              });
            }
          }

          globalQuestionCounter++;
        }
      }

      // ─── OPTIONAL: SUMMARY ANSWER KEY SLIDE AT END ───
      if (includeAnswerKeySlide) {
        const keySlide = pptx.addSlide();
        keySlide.background = { color: colors.bg };

        keySlide.addText('COMPLETE ANSWER KEY & SUMMARY', {
          x: 0.8,
          y: 0.6,
          w: 10.0,
          h: 0.5,
          fontSize: 22,
          bold: true,
          color: colors.primaryText,
          fontFace: 'Arial',
        });

        const keyLines = questions.map((q, idx) => `Q${idx + 1}: ${q.correctAnswer || 'N/A'} (${q.topic})`).join('   •   ');
        
        keySlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: 1.4,
          w: 11.7,
          h: 5.0,
          rectRadius: 0.1,
          fill: { color: colors.cardBg },
          line: { color: colors.border, width: 1 },
        });

        keySlide.addText(keyLines, {
          x: 1.1,
          y: 1.6,
          w: 11.1,
          h: 4.6,
          fontSize: 12,
          color: colors.primaryText,
          fontFace: 'Arial',
        });
      }

      // Save and trigger download
      const filename = `${subjectName.replace(/[^a-zA-Z0-9]/g, '_')}_Questions_Presentation.pptx`;
      await pptx.writeFile({ fileName: filename });

      setSuccessToast(`PowerPoint generated and downloaded: ${filename}`);
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
              Excel to PowerPoint Slide Generator
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Convert Excel question banks into presentation decks • Topic-wise grouping with <strong>1 question per slide</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadSampleExcel}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-medium text-xs rounded-xl transition-colors flex items-center gap-1.5"
            title="Download Excel template with sample questions"
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

      {/* MAIN STUDIO WORKSPACE */}
      {questions.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto text-2xl">
            📊
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-slate-100">Upload Your Questions Spreadsheet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Upload any Excel file (`.xlsx`) or CSV containing questions. Our system will automatically group them by topic and create a widescreen presentation with 1 question per slide.
            </p>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={handleDownloadSampleExcel}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Download Sample Template
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-md"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Select Excel File
            </button>
          </div>

          <div className="pt-6 border-t border-slate-800/60 max-w-lg mx-auto text-left text-xs text-slate-400 space-y-2">
            <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" /> Supported Columns:
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>• <strong>Topic</strong> (Unit / Module / Chapter)</div>
              <div>• <strong>Question</strong> (Problem text)</div>
              <div>• <strong>Option A, B, C, D</strong> (For MCQs)</div>
              <div>• <strong>Correct Answer</strong> (e.g. Option B)</div>
              <div>• <strong>Explanation</strong> (Solution steps)</div>
              <div>• <strong>Difficulty / Marks</strong> (Optional)</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN: PRESENTATION SETTINGS & TOPIC SELECTOR */}
          <div className="space-y-4">
            
            {/* DECK CONFIGURATION CARD */}
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" /> Deck Configuration
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
                      onClick={() => setTheme('dark_indigo')}
                      className={`p-2 rounded-lg border text-[11px] font-semibold text-center transition-all ${
                        theme === 'dark_indigo'
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Dark Indigo
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('clean_light')}
                      className={`p-2 rounded-lg border text-[11px] font-semibold text-center transition-all ${
                        theme === 'clean_light'
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Clean White
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('academic_navy')}
                      className={`p-2 rounded-lg border text-[11px] font-semibold text-center transition-all ${
                        theme === 'academic_navy'
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Navy Blue
                    </button>
                  </div>
                </div>

                {/* TOGGLES */}
                <div className="space-y-2 pt-2 border-t border-slate-800/60">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={includeAnswers}
                      onChange={(e) => setIncludeAnswers(e.target.checked)}
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

              {/* EXPORT ACTION BUTTON */}
              <button
                onClick={handleExportPowerPoint}
                disabled={isGeneratingPpt}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGeneratingPpt ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Building PowerPoint...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> Download PowerPoint (.pptx)
                  </>
                )}
              </button>
            </div>

            {/* TOPIC MODULE SELECTOR */}
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 space-y-2.5 text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" /> Topics Filter ({uniqueTopics.length})
              </span>

              <div className="space-y-1 max-h-56 overflow-y-auto">
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

          {/* RIGHT COLUMN: INTERACTIVE 1-QUESTION-PER-PAGE SLIDE VIEWER */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* SLIDE NAVIGATION STRIP */}
            <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800/80 rounded-xl px-4 py-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-200">
                  Slide {activeSlideIndex + 1} of {filteredQuestions.length}
                </span>
                <span className="text-[11px] text-slate-400">• 1 Question Per Slide Layout</span>
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
                theme === 'dark_indigo'
                  ? 'bg-slate-900 border-slate-800 text-slate-100'
                  : theme === 'clean_light'
                  ? 'bg-white border-slate-200 text-slate-900'
                  : 'bg-[#0B192C] border-[#1E3E62] text-white'
              }`}>
                
                {/* SLIDE TOP BAR */}
                <div className="flex items-center justify-between border-b pb-3 border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase tracking-wider">
                      {currentPreviewQuestion.topic}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">{subjectName}</span>
                  </div>

                  <span className="text-xs font-mono font-bold text-amber-400">
                    Q{activeSlideIndex + 1} of {filteredQuestions.length}
                  </span>
                </div>

                {/* QUESTION STATEMENT */}
                <div className="my-auto py-3">
                  <div className="text-base md:text-lg font-bold leading-relaxed">
                    Q{activeSlideIndex + 1}. {currentPreviewQuestion.questionText}
                  </div>
                </div>

                {/* MCQ OPTIONS (2x2 GRID) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {currentPreviewQuestion.optionA && (
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                        A
                      </span>
                      <span className="text-xs truncate">{currentPreviewQuestion.optionA}</span>
                    </div>
                  )}

                  {currentPreviewQuestion.optionB && (
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                        B
                      </span>
                      <span className="text-xs truncate">{currentPreviewQuestion.optionB}</span>
                    </div>
                  )}

                  {currentPreviewQuestion.optionC && (
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                        C
                      </span>
                      <span className="text-xs truncate">{currentPreviewQuestion.optionC}</span>
                    </div>
                  )}

                  {currentPreviewQuestion.optionD && (
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                        D
                      </span>
                      <span className="text-xs truncate">{currentPreviewQuestion.optionD}</span>
                    </div>
                  )}
                </div>

                {/* SLIDE FOOTER */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-[10px] text-slate-500">
                  <span>Apna Engineering Wallah • Faculty Lecture Deck</span>
                  {currentPreviewQuestion.correctAnswer && (
                    <span className="text-emerald-400 font-semibold">
                      Answer Key: {currentPreviewQuestion.correctAnswer}
                    </span>
                  )}
                </div>
              </div>
            ) : null}

            {/* QUICK QUESTION LIST CAROUSEL THUMBNAILS */}
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
