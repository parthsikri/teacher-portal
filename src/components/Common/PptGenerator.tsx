import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  AiPptService, 
  type AiGeneratedDeck, 
  type AiSlide, 
  type PyqItem,
  type DirectPyqRow
} from '../../services/aiPptService';
import { StorageService } from '../../services/storage';
import { 
  Sparkles, FileSpreadsheet, Download, 
  ChevronLeft, ChevronRight, CheckCircle2,
  Trash2, RefreshCw,
  Maximize2,
  FileText, Key,
  Lightbulb,
  AlertCircle,
  ArrowUpDown,
  Plus,
  ArrowUp,
  ArrowDown,
  ListOrdered,
  Presentation,
  FileDown,
  Search
} from 'lucide-react';

interface PptGeneratorProps {
  userSubject?: string;
  userName?: string;
  prefillTopic?: string;
  prefillUnit?: string;
  onDeckGenerated?: (deck: AiGeneratedDeck) => void;
}

type SlideTheme = 'dark_tech' | 'deep_navy' | 'clean_minimal';
type GeneratorMode = 'direct_excel' | 'ai_deepseek';

export const PptGenerator: React.FC<PptGeneratorProps> = ({
  userSubject = 'Data Structures & Algorithms',
  prefillTopic = '',
  prefillUnit = 'UNIT 1',
  onDeckGenerated,
}) => {
  // Mode selection: default to direct_excel (no DeepSeek required)
  const [mode, setMode] = useState<GeneratorMode>('direct_excel');

  // ════════════════════════════════════════════════════════════════════════════
  // DIRECT PYQ EXCEL STATE (NO DEEPSEEK REQUIRED)
  // ════════════════════════════════════════════════════════════════════════════
  const [directSubject, setDirectSubject] = useState<string>(userSubject);
  const [directDeckTitle, setDirectDeckTitle] = useState<string>(
    `${userSubject} - Previous Year Questions (PYQs) Bank`
  );
  const [includeUnitDividers, setIncludeUnitDividers] = useState<boolean>(true);
  const [includeTopicDividers, setIncludeTopicDividers] = useState<boolean>(true);
  const [directPyqRows, setDirectPyqRows] = useState<DirectPyqRow[]>([]);
  const [directFileName, setDirectFileName] = useState<string>('');
  const [directSearchQuery, setDirectSearchQuery] = useState<string>('');
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('all');

  // Syllabus Topics Ordering State (Pulled from Dashboard / Custom)
  const [syllabusTopicsList, setSyllabusTopicsList] = useState<string[]>([]);
  const [newTopicInput, setNewTopicInput] = useState<string>('');
  const [showBulkTopicModal, setShowBulkTopicModal] = useState<boolean>(false);
  const [bulkTopicText, setBulkTopicText] = useState<string>('');

  const directFileInputRef = useRef<HTMLInputElement>(null);

  // ════════════════════════════════════════════════════════════════════════════
  // AI DEEPSEEK GENERATOR STATE (PRESERVED)
  // ════════════════════════════════════════════════════════════════════════════
  const [aiSubject, setAiSubject] = useState<string>(userSubject);
  const [aiUnit, setAiUnit] = useState<string>(prefillUnit || 'UNIT 1');
  const [aiTopicTitle, setAiTopicTitle] = useState<string>(prefillTopic || '');
  const [aiPedagogyMode, setAiPedagogyMode] = useState<string>('zero_knowledge');
  const [aiSlideCount, setAiSlideCount] = useState<number>(10);
  const [aiCustomInstructions, setAiCustomInstructions] = useState<string>('');
  const [aiPyqList, setAiPyqList] = useState<PyqItem[]>([]);
  const [aiPastedPyqText, setAiPastedPyqText] = useState<string>('');
  const [aiShowPastePyq, setAiShowPastePyq] = useState<boolean>(false);
  const [aiExcelFileName, setAiExcelFileName] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);

  // ════════════════════════════════════════════════════════════════════════════
  // SHARED DECK & PREVIEW STATE
  // ════════════════════════════════════════════════════════════════════════════
  const [generatedDeck, setGeneratedDeck] = useState<AiGeneratedDeck | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [theme, setTheme] = useState<SlideTheme>('dark_tech');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [isExportingPptx, setIsExportingPptx] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const aiFileInputRef = useRef<HTMLInputElement>(null);

  // Updates syllabus topics from dashboard assignedTopics
  const loadDashboardSyllabusTopics = React.useCallback((subjectToLoad: string) => {
    try {
      const allAssigned = StorageService.getAssignedTopics();
      const matching = allAssigned.filter(
        (t) => !subjectToLoad || t.subject.toLowerCase() === subjectToLoad.toLowerCase()
      );

      const topicSet = new Set<string>();
      matching.forEach((t) => {
        if (t.topicTitle) topicSet.add(t.topicTitle.trim());
        if (t.subtopics && t.subtopics.length > 0) {
          t.subtopics.forEach((st) => topicSet.add(st.trim()));
        }
      });

      const list = Array.from(topicSet).filter(Boolean);
      if (list.length > 0) {
        setSyllabusTopicsList(list);
      } else {
        // Fallback default syllabus order if dashboard is empty
        setSyllabusTopicsList([
          'Asymptotic Notations & Complexity',
          'Array Operations & Searching',
          'Singly Linked Lists',
          'Doubly Linked Lists',
          'Stack Applications & Infix to Postfix',
          'Queue Operations & Circular Queue',
          'Binary Search Trees & Traversals',
          'Graph Algorithms & Dijkstra',
        ]);
      }
    } catch {
      // Fallback
    }
  }, []);

  // Load DeepSeek API key and Dashboard syllabus topics on mount
  useEffect(() => {
    const savedKey = AiPptService.getStoredApiKey();
    if (savedKey) setApiKey(savedKey);

    loadDashboardSyllabusTopics(directSubject);
  }, [directSubject, loadDashboardSyllabusTopics]);

  // Available subjects from faculty and dashboard
  const availableSubjects = useMemo(() => {
    const fromTeachers = StorageService.getTeachers().map((t) => t.subject).filter(Boolean);
    const fromTopics = StorageService.getAssignedTopics().map((t) => t.subject).filter(Boolean);
    const unique = Array.from(new Set([...fromTeachers, ...fromTopics]));
    return unique.length > 0 ? unique : ['Data Structures & Algorithms', 'Operating Systems', 'Database Management'];
  }, []);

  // Sorted PYQs based on Unit Number & Syllabus Topics order
  const sortedDirectPyqs = useMemo(() => {
    return AiPptService.sortDirectPyqs(directPyqRows, syllabusTopicsList);
  }, [directPyqRows, syllabusTopicsList]);

  // Grouped by Unit -> Topics -> Questions
  const unitQuestionGroups = useMemo(() => {
    return AiPptService.groupAndSortPyqsByUnitAndTopic(directPyqRows, syllabusTopicsList);
  }, [directPyqRows, syllabusTopicsList]);

  // Unique units from parsed PYQs
  const detectedUnits = useMemo(() => {
    const set = new Set<string>();
    directPyqRows.forEach((r) => {
      if (r.unitNumber) set.add(r.unitNumber);
    });
    return Array.from(set).sort((a, b) => AiPptService.extractUnitNumber(a) - AiPptService.extractUnitNumber(b));
  }, [directPyqRows]);

  // Filtered unit groups based on unit selector and search query
  const filteredUnitGroups = useMemo(() => {
    return unitQuestionGroups
      .filter((uGroup) => selectedUnitFilter === 'all' || uGroup.unitNumber === selectedUnitFilter)
      .map((uGroup) => {
        if (!directSearchQuery.trim()) return uGroup;
        const q = directSearchQuery.toLowerCase();
        const filteredTopics = uGroup.topicGroups
          .map((tGroup) => {
            const matchingQuestions = tGroup.questions.filter(
              (r) =>
                r.questionText.toLowerCase().includes(q) ||
                r.mappedTopic.toLowerCase().includes(q) ||
                r.yearExam.toLowerCase().includes(q)
            );
            return {
              ...tGroup,
              questions: matchingQuestions,
            };
          })
          .filter((tGroup) => tGroup.questions.length > 0);

        return {
          ...uGroup,
          totalQuestions: filteredTopics.reduce((acc, t) => acc + t.questions.length, 0),
          topicGroups: filteredTopics,
        };
      })
      .filter((uGroup) => uGroup.topicGroups.length > 0);
  }, [unitQuestionGroups, selectedUnitFilter, directSearchQuery]);

  // ════════════════════════════════════════════════════════════════════════════
  // DIRECT PYQ HANDLERS (NO DEEPSEEK)
  // ════════════════════════════════════════════════════════════════════════════
  const handleDirectExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErrorMessage(null);
      const parsed = await AiPptService.parseDirectPyqsFromExcel(file);
      if (parsed.length === 0) {
        setErrorMessage(
          'No valid questions found in this sheet. Please ensure headers: "Year & Exam", "Unit Number", "Mapped Topic", "Full Question Text".'
        );
        return;
      }

      setDirectPyqRows(parsed);
      setDirectFileName(file.name);
      setSuccessToast(`✓ Successfully parsed ${parsed.length} PYQs from ${file.name}`);
      setTimeout(() => setSuccessToast(null), 4000);

      // Auto-populate topics not already in syllabus list
      const parsedTopics = Array.from(new Set(parsed.map((p) => p.mappedTopic.trim()).filter(Boolean)));
      setSyllabusTopicsList((prev) => {
        const existing = new Set(prev.map((t) => t.toLowerCase()));
        const toAdd = parsedTopics.filter((t) => !existing.has(t.toLowerCase()));
        return [...prev, ...toAdd];
      });
    } catch (err: any) {
      setErrorMessage(`Failed to read Excel file: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleDownloadSampleExcel = () => {
    AiPptService.downloadSamplePyqExcel(directSubject);
    setSuccessToast('✓ Sample Excel Template downloaded! Fill rows and upload.');
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleClearDirectPyqs = () => {
    setDirectPyqRows([]);
    setDirectFileName('');
    if (directFileInputRef.current) directFileInputRef.current.value = '';
  };

  const handleMoveTopic = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= syllabusTopicsList.length) return;

    const updated = [...syllabusTopicsList];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setSyllabusTopicsList(updated);
  };

  const handleAddSyllabusTopic = () => {
    const trimmed = newTopicInput.trim();
    if (!trimmed) return;
    if (!syllabusTopicsList.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setSyllabusTopicsList([...syllabusTopicsList, trimmed]);
    }
    setNewTopicInput('');
  };

  const handleRemoveSyllabusTopic = (index: number) => {
    setSyllabusTopicsList(syllabusTopicsList.filter((_, i) => i !== index));
  };

  const handleBulkTopicsSave = () => {
    if (!bulkTopicText.trim()) return;
    const items = bulkTopicText
      .split(/,|\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    setSyllabusTopicsList(Array.from(new Set(items)));
    setShowBulkTopicModal(false);
    setBulkTopicText('');
    setSuccessToast(`✓ Updated syllabus topic order (${items.length} topics)`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleGenerateDirectDeck = () => {
    if (directPyqRows.length === 0) {
      setErrorMessage('Please upload an Excel file containing PYQs first.');
      return;
    }

    setErrorMessage(null);
    setIsGenerating(true);

    try {
      const deck = AiPptService.generateDirectPyqDeck({
        subject: directSubject.trim() || 'Engineering Course',
        deckTitle: directDeckTitle.trim() || `${directSubject} - PYQs Bank`,
        pyqs: directPyqRows,
        syllabusTopicsOrder: syllabusTopicsList,
        includeUnitDividers,
        includeTopicDividers,
      });

      setGeneratedDeck(deck);
      setActiveSlideIndex(0);
      setIsGenerating(false);
      setSuccessToast(`✨ Generated ${deck.slides.length} slides successfully in exact syllabus order!`);
      setTimeout(() => setSuccessToast(null), 4000);

      if (onDeckGenerated) {
        onDeckGenerated(deck);
      }
    } catch (err: any) {
      setErrorMessage(`Error building deck: ${err?.message || 'Unknown error'}`);
      setIsGenerating(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // AI DEEPSEEK HANDLERS (PRESERVED)
  // ════════════════════════════════════════════════════════════════════════════
  const handleSaveApiKey = () => {
    AiPptService.saveStoredApiKey(apiKey);
    setShowApiKeyModal(false);
    setSuccessToast('DeepSeek API Key saved successfully.');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleAiExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErrorMessage(null);
      const parsed = await AiPptService.parsePyqsFromExcel(file);
      if (parsed.length === 0) {
        setErrorMessage('No valid questions found in this Excel sheet.');
        return;
      }

      setAiPyqList(parsed);
      setAiExcelFileName(file.name);
      setSuccessToast(`Successfully loaded ${parsed.length} PYQs from ${file.name}`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      setErrorMessage(`Failed to parse Excel file: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleAddAiPastedPyqs = () => {
    if (!aiPastedPyqText.trim()) return;
    const parsed = AiPptService.parsePyqsFromText(aiPastedPyqText);
    if (parsed.length === 0) {
      setErrorMessage('Could not detect distinct questions. Please format each question with numbers or linebreaks.');
      return;
    }

    setAiPyqList([...aiPyqList, ...parsed]);
    setAiPastedPyqText('');
    setAiShowPastePyq(false);
    setSuccessToast(`Added ${parsed.length} questions to list.`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleAiGenerateDeck = async () => {
    if (!aiTopicTitle.trim()) {
      setErrorMessage('Please enter a Topic Title to generate slides for.');
      return;
    }

    setErrorMessage(null);
    setIsGenerating(true);
    setGenerationStep('1/4: Analyzing syllabus and topic concepts...');

    const timer1 = setTimeout(() => {
      setGenerationStep('2/4: Deconstructing first principles & analogies...');
    }, 2000);

    const timer2 = setTimeout(() => {
      setGenerationStep('3/4: Mapping Previous Year Questions & step solutions...');
    }, 4500);

    const timer3 = setTimeout(() => {
      setGenerationStep('4/4: Formatting high-impact visual slides...');
    }, 7500);

    try {
      const result = await AiPptService.generateDeck({
        subject: aiSubject.trim() || 'Engineering',
        unit: aiUnit,
        topicTitle: aiTopicTitle.trim(),
        pyqList: aiPyqList.length > 0 ? aiPyqList : undefined,
        customInstructions: aiCustomInstructions.trim() || undefined,
        targetAudience: aiPedagogyMode,
        slideCount: aiSlideCount,
        apiKey: apiKey.trim() || undefined,
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      if (!result.success || !result.deck) {
        if (result.needsApiKey) {
          setShowApiKeyModal(true);
        }
        setErrorMessage(result.error || 'Failed to generate presentation deck.');
        setIsGenerating(false);
        return;
      }

      setGeneratedDeck(result.deck);
      setActiveSlideIndex(0);
      setIsGenerating(false);
      setSuccessToast(`✨ Generated ${result.deck.slides.length} slides successfully!`);
      setTimeout(() => setSuccessToast(null), 4000);

      if (onDeckGenerated) {
        onDeckGenerated(result.deck);
      }
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setErrorMessage(err?.message || 'Error generating deck.');
      setIsGenerating(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // EXPORT HANDLERS (PPTX / PDF)
  // ════════════════════════════════════════════════════════════════════════════
  const handleExportPptx = async () => {
    if (!generatedDeck) {
      if (directPyqRows.length > 0) {
        handleGenerateDirectDeck();
      } else {
        setErrorMessage('No presentation generated to export. Please upload PYQs first.');
        return;
      }
    }

    const deckToExport = generatedDeck || AiPptService.generateDirectPyqDeck({
      subject: directSubject,
      deckTitle: directDeckTitle,
      pyqs: directPyqRows,
      syllabusTopicsOrder: syllabusTopicsList,
      includeUnitDividers,
    });

    setIsExportingPptx(true);
    try {
      await AiPptService.exportToPptx(deckToExport, theme);
      setSuccessToast('✓ PowerPoint presentation (.pptx) downloaded successfully!');
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err: any) {
      setErrorMessage(`Failed to export PPTX: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsExportingPptx(false);
    }
  };

  const handleExportPdf = async () => {
    if (!generatedDeck) {
      if (directPyqRows.length > 0) {
        handleGenerateDirectDeck();
      } else {
        setErrorMessage('No presentation generated to export. Please upload PYQs first.');
        return;
      }
    }

    const deckToExport = generatedDeck || AiPptService.generateDirectPyqDeck({
      subject: directSubject,
      deckTitle: directDeckTitle,
      pyqs: directPyqRows,
      syllabusTopicsOrder: syllabusTopicsList,
      includeUnitDividers,
    });

    setIsExportingPdf(true);
    try {
      await AiPptService.exportToPdf(deckToExport, theme);
      setSuccessToast('✓ PDF slide deck downloaded successfully!');
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err: any) {
      setErrorMessage(`Failed to export PDF: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const activeSlide: AiSlide | null = generatedDeck?.slides[activeSlideIndex] || null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
      
      {/* HEADER BANNER & MODE SELECTOR */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-5 rounded-3xl backdrop-blur shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
            <Presentation className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-black text-slate-100 tracking-tight">
                Presentation Studio & PYQ Generator
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                16:9 Broadcast Format
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Generate PowerPoint (.pptx) decks directly from Excel PYQs sorted unit-wise and by dashboard syllabus topics.
            </p>
          </div>
        </div>

        {/* TAB TOGGLE: Direct PYQ (No DeepSeek) vs AI DeepSeek */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setMode('direct_excel')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              mode === 'direct_excel'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-300" />
            <span>Direct PYQ to PPT</span>
            <span className="px-1.5 py-0.2 bg-white/20 rounded text-[9px] font-mono">No AI Req</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('ai_deepseek')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              mode === 'ai_deepseek'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-300" />
            <span>AI First-Principles Studio</span>
          </button>
        </div>
      </div>

      {/* TOASTS & ALERTS */}
      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-2xl flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {successToast && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-2xl flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODE 1: DIRECT PYQ TO PPT GENERATOR (NO DEEPSEEK REQUIRED) */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {mode === 'direct_excel' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: EXCEL UPLOAD & SYLLABUS TOPIC ORDERING (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* 1. EXCEL UPLOAD CARD */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h2 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  1. Upload PYQ Excel Sheet
                </h2>
                <button
                  type="button"
                  onClick={handleDownloadSampleExcel}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition-colors"
                  title="Download pre-formatted Excel template"
                >
                  <FileDown className="w-3.5 h-3.5" /> Sample Template (.xlsx)
                </button>
              </div>

              {/* Subject & Deck Title */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Subject Name</label>
                  <div className="flex gap-2">
                    <select
                      value={directSubject}
                      onChange={(e) => {
                        setDirectSubject(e.target.value);
                        setDirectDeckTitle(`${e.target.value} - Previous Year Questions (PYQs) Bank`);
                        loadDashboardSyllabusTopics(e.target.value);
                      }}
                      className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-medium"
                    >
                      {availableSubjects.map((sub, idx) => (
                        <option key={idx} value={sub}>{sub}</option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={directSubject}
                      onChange={(e) => {
                        setDirectSubject(e.target.value);
                        setDirectDeckTitle(`${e.target.value} - Previous Year Questions (PYQs) Bank`);
                      }}
                      placeholder="Or custom subject..."
                      className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Slide Deck Title</label>
                  <input
                    type="text"
                    value={directDeckTitle}
                    onChange={(e) => setDirectDeckTitle(e.target.value)}
                    placeholder="e.g. Data Structures - Unitwise PYQ Bank"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                {/* Upload Zone */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
                    <span>Excel / CSV File (.xlsx, .xls, .csv)</span>
                    {directPyqRows.length > 0 && (
                      <span className="text-emerald-400 font-mono font-bold text-[11px]">
                        ✓ {directPyqRows.length} PYQs Parsed
                      </span>
                    )}
                  </label>

                  <input
                    type="file"
                    ref={directFileInputRef}
                    accept=".xlsx, .xls, .csv"
                    onChange={handleDirectExcelUpload}
                    className="hidden"
                    id="direct-pyq-excel-file"
                  />

                  <div className="flex gap-2">
                    <label
                      htmlFor="direct-pyq-excel-file"
                      className="flex-1 py-3 px-4 bg-slate-950 hover:bg-slate-800/80 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl text-slate-300 font-medium flex items-center justify-center gap-2 cursor-pointer transition-all text-xs group"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                      <span className="truncate">
                        {directFileName ? directFileName : 'Click to Upload Excel Sheet'}
                      </span>
                    </label>

                    {directPyqRows.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearDirectPyqs}
                        className="p-3 text-slate-500 hover:text-red-400 bg-slate-950 border border-slate-800 rounded-2xl transition-colors"
                        title="Clear uploaded PYQs"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Header requirements badge */}
                  <div className="p-2.5 bg-slate-950/80 border border-slate-800/80 rounded-xl mt-2 space-y-1 text-[10px] text-slate-400">
                    <span className="font-semibold text-slate-300">Expected Excel Column Headers:</span>
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      <span className="px-1.5 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-500/30 rounded font-mono">
                        Year & Exam
                      </span>
                      <span className="px-1.5 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-500/30 rounded font-mono">
                        Unit Number
                      </span>
                      <span className="px-1.5 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-500/30 rounded font-mono">
                        Mapped Topic
                      </span>
                      <span className="px-1.5 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-500/30 rounded font-mono">
                        Full Question Text
                      </span>
                    </div>
                  </div>
                </div>

                {/* Include Unit Transition Slides */}
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeUnitDividers}
                      onChange={(e) => setIncludeUnitDividers(e.target.checked)}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-0 w-4 h-4"
                    />
                    <span>Include Unit Divider Slides (UNIT 1, UNIT 2...)</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeTopicDividers}
                      onChange={(e) => setIncludeTopicDividers(e.target.checked)}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-0 w-4 h-4"
                    />
                    <span>Include Topic Section Slides (combining topic questions)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* 2. SYLLABUS TOPICS ORDERING CARD */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-xl">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                <div>
                  <h2 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                    <ListOrdered className="w-4 h-4 text-amber-400" />
                    2. Syllabus Topics Order
                  </h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Questions within each unit will be ordered according to this sequence.
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkTopicText(syllabusTopicsList.join('\n'));
                      setShowBulkTopicModal(true);
                    }}
                    className="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] text-slate-300 font-semibold flex items-center gap-1"
                    title="Paste / Edit topics in bulk"
                  >
                    <ArrowUpDown className="w-3 h-3" /> Reorder
                  </button>
                  <button
                    type="button"
                    onClick={() => loadDashboardSyllabusTopics(directSubject)}
                    className="p-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200"
                    title="Reset to Dashboard Syllabus Topics"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Add Single Topic Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTopicInput}
                  onChange={(e) => setNewTopicInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSyllabusTopic();
                    }
                  }}
                  placeholder="Add a syllabus topic to order..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddSyllabusTopic}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              {/* Topics List with Up/Down Arrows */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-950 rounded-2xl border border-slate-800/80">
                {syllabusTopicsList.length === 0 ? (
                  <div className="p-3 text-center text-[11px] text-slate-500 italic">
                    No syllabus topics defined. Questions will be sorted alphabetically.
                  </div>
                ) : (
                  syllabusTopicsList.map((topic, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-1.5 px-2.5 bg-slate-900/90 border border-slate-800/90 rounded-xl text-xs group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[10px] font-bold text-amber-400 shrink-0 w-4">
                          #{idx + 1}
                        </span>
                        <span className="text-slate-200 truncate text-[11px]">{topic}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveTopic(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 hover:bg-slate-800 disabled:opacity-20 text-slate-400 hover:text-slate-100 rounded"
                          title="Move up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveTopic(idx, 'down')}
                          disabled={idx === syllabusTopicsList.length - 1}
                          className="p-1 hover:bg-slate-800 disabled:opacity-20 text-slate-400 hover:text-slate-100 rounded"
                          title="Move down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSyllabusTopic(idx)}
                          className="p-1 hover:bg-slate-800 text-slate-500 hover:text-red-400 rounded"
                          title="Remove topic"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* GENERATE ACTION BUTTON */}
            <button
              type="button"
              onClick={handleGenerateDirectDeck}
              disabled={isGenerating || directPyqRows.length === 0}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 font-extrabold text-white shadow-xl shadow-indigo-600/30 transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-purple-200" />
                  <span>Building Sorted 16:9 Presentation...</span>
                </>
              ) : (
                <>
                  <Presentation className="w-4 h-4 text-amber-300" />
                  <span>Generate PowerPoint Presentation Deck</span>
                </>
              )}
            </button>

          </div>

          {/* RIGHT COLUMN: 16:9 SLIDE CANVAS & PARSED PYQS OVERVIEW (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* TOOLBAR */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-3xl shadow-lg">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300">Theme:</span>
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setTheme('dark_tech')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                      theme === 'dark_tech' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Dark Tech
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('deep_navy')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                      theme === 'deep_navy' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Deep Navy
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('clean_minimal')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                      theme === 'clean_minimal' ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Clean Minimal
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {generatedDeck && (
                  <button
                    type="button"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1"
                    title="Fullscreen presentation mode"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={isExportingPdf || directPyqRows.length === 0}
                  className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  {isExportingPdf ? 'Exporting...' : 'PDF'}
                </button>

                <button
                  type="button"
                  onClick={handleExportPptx}
                  disabled={isExportingPptx || directPyqRows.length === 0}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isExportingPptx ? 'Exporting PPTX...' : 'Export .PPTX'}
                </button>
              </div>
            </div>

            {/* 16:9 SLIDE CANVAS PREVIEW */}
            {!generatedDeck ? (
              <div className="aspect-[16/9] w-full bg-slate-900/60 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center p-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Presentation className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">No Presentation Generated Yet</h3>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    Upload an Excel file with your Previous Year Questions (PYQs), adjust syllabus order on the left, and click <strong>Generate PowerPoint Presentation Deck</strong>.
                  </p>
                </div>
              </div>
            ) : (
              <div className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-6 flex flex-col justify-center' : ''}`}>
                
                {/* SLIDE FRAME (16:9) */}
                <div
                  className={`aspect-[16/9] w-full rounded-3xl border shadow-2xl overflow-hidden flex flex-col justify-between p-6 md:p-8 transition-all ${
                    theme === 'dark_tech'
                      ? 'bg-slate-950 border-slate-800 text-slate-100'
                      : theme === 'deep_navy'
                      ? 'bg-slate-900 border-slate-800 text-white'
                      : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  {/* SLIDE TOP HEADER */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[10px] font-mono font-bold tracking-wider uppercase">
                        {activeSlide?.badge || 'QUESTION'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {generatedDeck.subject}
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400">
                      Slide {activeSlideIndex + 1} of {generatedDeck.slides.length}
                    </div>
                  </div>

                  {/* SLIDE BODY */}
                  <div className="my-auto space-y-3.5">
                    
                    {/* 1. COVER / TITLE SLIDE */}
                    {activeSlide?.type === 'title' && (
                      <div className="text-center py-6 space-y-3">
                        <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-mono font-bold">
                          {activeSlide.badge || 'PYQ MASTER DECK'}
                        </span>
                        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                          {activeSlide.title}
                        </h2>
                        {activeSlide.subtitle && (
                          <p className="text-xs text-slate-400 max-w-md mx-auto">
                            {activeSlide.subtitle}
                          </p>
                        )}
                        {activeSlide.bullets && (
                          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                            {activeSlide.bullets.map((b, i) => (
                              <span key={i} className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[11px] text-slate-300">
                                {b}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2. UNIT DIVIDER SLIDE */}
                    {activeSlide?.type === 'unit_divider' && (
                      <div className="p-6 rounded-2xl bg-indigo-950/30 border-2 border-indigo-500/40 text-center space-y-3 my-auto">
                        <span className="px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-mono font-bold uppercase tracking-wider">
                          {activeSlide.badge}
                        </span>
                        <h2 className="text-2xl font-black text-white">
                          {activeSlide.title}
                        </h2>
                        {activeSlide.subtitle && (
                          <p className="text-xs text-slate-400">
                            {activeSlide.subtitle}
                          </p>
                        )}
                        {activeSlide.bullets && activeSlide.bullets.length > 0 && (
                          <div className="flex flex-wrap justify-center gap-1.5 pt-2 max-w-lg mx-auto">
                            {activeSlide.bullets.map((t, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-[10px] text-emerald-300">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2b. TOPIC SECTION DIVIDER SLIDE */}
                    {activeSlide?.type === 'topic_divider' && (
                      <div className="p-6 rounded-2xl bg-slate-900/95 border-2 border-emerald-500/40 text-center space-y-3 my-auto shadow-xl">
                        <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-mono font-bold uppercase tracking-wider">
                          {activeSlide.badge || 'TOPIC SECTION'}
                        </span>
                        <h2 className="text-xl md:text-2xl font-black text-white">
                          {activeSlide.title}
                        </h2>
                        {activeSlide.subtitle && (
                          <p className="text-xs text-slate-400">
                            {activeSlide.subtitle}
                          </p>
                        )}
                        {activeSlide.bullets && activeSlide.bullets.length > 0 && (
                          <div className="flex flex-wrap justify-center gap-1.5 pt-2 max-w-lg mx-auto">
                            {activeSlide.bullets.map((t, idx) => (
                              <span key={idx} className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[10px] text-amber-300 font-medium">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 3. DIRECT PYQ QUESTION CARD */}
                    {(activeSlide?.type === 'direct_pyq' || activeSlide?.pyqDetails) && (
                      <div className="space-y-3">
                        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 shadow-inner">
                          <div className="flex items-center justify-between text-xs">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold text-[11px]">
                              📝 {activeSlide.pyqDetails?.examYear || 'Exam Question'}
                            </span>
                            {activeSlide.pyqDetails?.marks && (
                              <span className="font-mono text-amber-400 font-bold text-xs">
                                [{activeSlide.pyqDetails.marks}]
                              </span>
                            )}
                          </div>
                          
                          <p className="font-bold text-sm md:text-base text-slate-100 leading-relaxed pt-1">
                            {activeSlide.pyqDetails?.question}
                          </p>
                        </div>

                        {/* Solution / Notes working box */}
                        <div className="p-3 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs space-y-1">
                          <div className="text-indigo-400 font-bold text-[11px] flex items-center gap-1.5">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                            Faculty Solution & Derivation Notes:
                          </div>
                          <p className="text-[11px] text-slate-400 italic leading-relaxed">
                            {activeSlide.pyqDetails?.stepByStepSolution?.[0] || 'Detailed working steps, formula derivation, and step-by-step trace tables.'}
                          </p>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* SLIDE FOOTER */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                    <div className="text-[10px] text-slate-400">
                      Apna Engineering Wallah • PYQ Master Presentation
                    </div>

                    {isFullscreen && (
                      <button
                        onClick={() => setIsFullscreen(false)}
                        className="px-3 py-1 bg-slate-800 text-slate-300 rounded text-xs"
                      >
                        Exit Fullscreen ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* SLIDE CAROUSEL & CONTROLS */}
                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setActiveSlideIndex((prev) => Math.max(0, prev - 1))}
                    disabled={activeSlideIndex === 0}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-800 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>

                  {/* THUMBNAILS LIST */}
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-md">
                    {generatedDeck.slides.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveSlideIndex(idx)}
                        className={`w-7 h-7 rounded-lg text-[10px] font-mono font-bold transition-all flex items-center justify-center shrink-0 ${
                          activeSlideIndex === idx
                            ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 scale-105'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveSlideIndex((prev) => Math.min(generatedDeck.slides.length - 1, prev + 1))}
                    disabled={activeSlideIndex === generatedDeck.slides.length - 1}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-800 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            )}

            {/* PARSED PYQS BREAKDOWN TABLE / SUMMARY */}
            {directPyqRows.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      Parsed PYQ Bank ({sortedDirectPyqs.length} Questions Sorted)
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Arranged unit-wise and sorted by syllabus topic priority.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Search Input */}
                    <div className="relative">
                      <Search className="w-3 h-3 absolute left-2.5 top-2 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search PYQs..."
                        value={directSearchQuery}
                        onChange={(e) => setDirectSearchQuery(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-2 py-1 text-[11px] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-32 sm:w-40"
                      />
                    </div>

                    {/* Unit Filters */}
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedUnitFilter('all')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                          selectedUnitFilter === 'all'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        All ({sortedDirectPyqs.length})
                      </button>
                      {detectedUnits.map((u, idx) => {
                        const count = directPyqRows.filter((r) => r.unitNumber === u).length;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedUnitFilter(u)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                              selectedUnitFilter === u
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {u} ({count})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Unit -> Topic Grouped Breakdown */}
                <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
                  {filteredUnitGroups.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500 italic">
                      No questions match the current filter or search criteria.
                    </div>
                  ) : (
                    filteredUnitGroups.map((uGroup) => (
                      <div
                        key={uGroup.unitNumber}
                        className="p-3 bg-slate-950/90 rounded-2xl border border-indigo-500/20 space-y-2.5"
                      >
                        {/* Unit Header */}
                        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-lg bg-indigo-600 text-white text-xs font-mono font-bold">
                              {uGroup.unitNumber}
                            </span>
                            <span className="text-xs text-slate-200 font-bold">
                              {uGroup.totalQuestions} {uGroup.totalQuestions === 1 ? 'Question' : 'Questions'} • {uGroup.topicGroups.length} {uGroup.topicGroups.length === 1 ? 'Topic' : 'Topics'}
                            </span>
                          </div>
                        </div>

                        {/* Topic Groups inside this Unit */}
                        <div className="space-y-2">
                          {uGroup.topicGroups.map((tGroup, tIdx) => (
                            <div
                              key={tIdx}
                              className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold shrink-0">
                                    Topic #{tIdx + 1}
                                  </span>
                                  <span className="text-xs font-bold text-slate-100 truncate">
                                    {tGroup.topicName}
                                  </span>
                                </div>
                                <span className="text-[10px] text-amber-400 font-mono font-bold shrink-0">
                                  {tGroup.questions.length} {tGroup.questions.length === 1 ? 'PYQ' : 'PYQs Combined'}
                                </span>
                              </div>

                              {/* Questions belonging to this topic */}
                              <div className="space-y-1 pl-2 border-l-2 border-slate-800">
                                {tGroup.questions.map((q, qIdx) => (
                                  <div
                                    key={q.id || qIdx}
                                    className="p-2 bg-slate-950/80 rounded-lg text-xs space-y-0.5"
                                  >
                                    <div className="flex items-center justify-between text-[10px]">
                                      <span className="text-slate-400 font-medium font-mono">
                                        Q{qIdx + 1} of {tGroup.questions.length}
                                      </span>
                                      <span className="text-emerald-400 font-mono">
                                        {q.yearExam} {q.marks ? `[${q.marks}]` : ''}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-300 leading-relaxed">
                                      {q.questionText}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODE 2: AI FIRST-PRINCIPLES STUDIO (DEEPSEEK - PRESERVED) */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {mode === 'ai_deepseek' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: TOPIC, SYLLABUS & PYQ CONFIGURATION (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-purple-400" />
                DeepSeek AI Slide Generator
              </h2>
              <button
                type="button"
                onClick={() => setShowApiKeyModal(true)}
                className="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] text-slate-300 font-semibold flex items-center gap-1"
              >
                <Key className="w-3 h-3 text-purple-400" /> {apiKey ? 'Key Configured ✓' : 'Set API Key'}
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Subject and Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="block text-slate-400 font-medium mb-1">Subject Name *</label>
                  <input
                    type="text"
                    value={aiSubject}
                    onChange={(e) => setAiSubject(e.target.value)}
                    placeholder="e.g. Data Structures & Algorithms"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Curriculum Unit</label>
                  <select
                    value={aiUnit}
                    onChange={(e) => setAiUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  >
                    <option value="UNIT 1">UNIT 1</option>
                    <option value="UNIT 2">UNIT 2</option>
                    <option value="UNIT 3">UNIT 3</option>
                    <option value="UNIT 4">UNIT 4</option>
                    <option value="UNIT 5">UNIT 5</option>
                    <option value="UNIT 6">UNIT 6</option>
                  </select>
                </div>
              </div>

              {/* Topic Title */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Topic Title to Teach *</label>
                <input
                  type="text"
                  value={aiTopicTitle}
                  onChange={(e) => setAiTopicTitle(e.target.value)}
                  placeholder="e.g. Dijkstra Shortest Path Algorithm"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              {/* Pedagogy Philosophy */}
              <div>
                <label className="block text-slate-400 font-medium mb-1 flex items-center justify-between">
                  <span>Teaching Depth & Pedagogy</span>
                  <span className="text-[10px] text-indigo-400 font-medium flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" /> First Principles Active
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAiPedagogyMode('zero_knowledge')}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      aiPedagogyMode === 'zero_knowledge'
                        ? 'bg-indigo-950/50 border-indigo-500 text-indigo-200 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-[11px]">Zero-Knowledge</div>
                    <div className="text-[9px] text-slate-500">Intuition first</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAiPedagogyMode('pyq_intensive')}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      aiPedagogyMode === 'pyq_intensive'
                        ? 'bg-indigo-950/50 border-indigo-500 text-indigo-200 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-[11px]">PYQ Intensive</div>
                    <div className="text-[9px] text-slate-500">Exam yield</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAiPedagogyMode('deep_theory')}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      aiPedagogyMode === 'deep_theory'
                        ? 'bg-indigo-950/50 border-indigo-500 text-indigo-200 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-[11px]">Deep Theory</div>
                    <div className="text-[9px] text-slate-500">Comprehensive</div>
                  </button>
                </div>
              </div>

              {/* Slide Count Slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-medium">Estimated Slides to Generate</label>
                  <span className="text-indigo-400 font-bold font-mono">{aiSlideCount} Slides</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="15"
                  step="1"
                  value={aiSlideCount}
                  onChange={(e) => setAiSlideCount(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-500 bg-slate-950 rounded-lg cursor-pointer"
                />
              </div>

              {/* Excel PYQ Attachment */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <label className="block text-slate-300 font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    Optional PYQ Sheet
                  </span>
                  {aiPyqList.length > 0 && (
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">
                      ✓ {aiPyqList.length} PYQs
                    </span>
                  )}
                </label>

                <input
                  type="file"
                  ref={aiFileInputRef}
                  accept=".xlsx, .xls, .csv"
                  onChange={handleAiExcelUpload}
                  className="hidden"
                  id="ai-excel-pyq-input"
                />

                <div className="flex gap-2">
                  <label
                    htmlFor="ai-excel-pyq-input"
                    className="flex-1 py-2 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-300 font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    {aiExcelFileName ? aiExcelFileName : 'Upload Sheet'}
                  </label>

                  <button
                    type="button"
                    onClick={() => setAiShowPastePyq(!aiShowPastePyq)}
                    className="px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 font-medium"
                    title="Paste raw questions text"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>

                  {aiPyqList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setAiPyqList([]);
                        setAiExcelFileName('');
                      }}
                      className="p-2 text-slate-500 hover:text-red-400 rounded-xl"
                      title="Clear PYQs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {aiShowPastePyq && (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <textarea
                      rows={3}
                      value={aiPastedPyqText}
                      onChange={(e) => setAiPastedPyqText(e.target.value)}
                      placeholder="Q1: Explain Dijkstra Algorithm with step by step matrix."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-100 text-[11px] focus:outline-none focus:border-indigo-500"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleAddAiPastedPyqs}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-semibold"
                      >
                        + Add Questions
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Custom Notes */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Additional Directives (Optional)</label>
                <textarea
                  rows={2}
                  value={aiCustomInstructions}
                  onChange={(e) => setAiCustomInstructions(e.target.value)}
                  placeholder="e.g. Include GATE trace tables, focus on time complexity."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>
            </div>

            {/* AI GENERATE BUTTON */}
            <button
              type="button"
              onClick={handleAiGenerateDeck}
              disabled={isGenerating || !aiTopicTitle.trim()}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 font-bold text-white shadow-lg shadow-purple-600/30 transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-purple-200" />
                  <span>{generationStep || 'Generating slides with DeepSeek...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Generate AI Concept Deck</span>
                </>
              )}
            </button>
          </div>

          {/* RIGHT COLUMN: PREVIEW CANVAS */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-3xl shadow-lg">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300">Theme:</span>
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setTheme('dark_tech')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-medium ${
                      theme === 'dark_tech' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400'
                    }`}
                  >
                    Dark Tech
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('deep_navy')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-medium ${
                      theme === 'deep_navy' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400'
                    }`}
                  >
                    Deep Navy
                  </button>
                </div>
              </div>

              {generatedDeck && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    disabled={isExportingPdf}
                    className="px-3.5 py-1.5 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl text-xs font-semibold"
                  >
                    PDF
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPptx}
                    disabled={isExportingPptx}
                    className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                  >
                    Export .PPTX
                  </button>
                </div>
              )}
            </div>

            {/* AI Roadmap Preview */}
            {generatedDeck?.subtopicRoadmap && generatedDeck.subtopicRoadmap.length > 0 && (
              <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-4 space-y-2 shadow-lg">
                <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                  🧠 First-Principles Roadmap & PYQ Coverage
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {generatedDeck.subtopicRoadmap.map((item, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1 text-xs">
                      <div className="font-semibold text-slate-200 truncate">{item.subtopicName}</div>
                      <p className="text-[10px] text-slate-400 line-clamp-2">{item.pedagogicalGoal}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* BULK TOPICS REORDER / PASTE MODAL */}
      {showBulkTopicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <ListOrdered className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-100">Syllabus Topic Sequence Editor</h3>
              </div>
              <button onClick={() => setShowBulkTopicModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-400">
              Paste or rearrange your syllabus topic titles in exact order (one per line or separated by commas). Questions in each unit will be ordered matching these titles.
            </p>

            <textarea
              rows={8}
              value={bulkTopicText}
              onChange={(e) => setBulkTopicText(e.target.value)}
              placeholder="Asymptotic Notations&#10;Array Operations&#10;Singly Linked Lists&#10;Binary Search Trees"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkTopicModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkTopicsSave}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
              >
                Apply Topic Sequence
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API KEY CONFIGURATION MODAL */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Key className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-100">DeepSeek API Key Settings</h3>
              </div>
              <button onClick={() => setShowApiKeyModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-400">
              Enter your DeepSeek API key (starts with <code className="text-indigo-300">sk-...</code>) to generate AI concept explanations. (Note: Direct Excel PYQ generator does not require an API key).
            </p>

            <div>
              <label className="block text-slate-300 font-semibold mb-1 text-xs">DeepSeek API Key</label>
              <input
                type="password"
                placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
