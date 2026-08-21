import React, { useState, useRef, useEffect } from 'react';
import { 
  AiPptService, 
  type AiGeneratedDeck, 
  type AiSlide, 
  type PyqItem 
} from '../../services/aiPptService';
import { 
  Sparkles, FileSpreadsheet, Download, 
  ChevronLeft, ChevronRight, CheckCircle2,
  Trash2, RefreshCw, Layers,
  Maximize2,
  FileText, Key,
  Lightbulb,
  AlertCircle
} from 'lucide-react';

interface PptGeneratorProps {
  userSubject?: string;
  userName?: string;
  prefillTopic?: string;
  prefillUnit?: string;
  onDeckGenerated?: (deck: AiGeneratedDeck) => void;
}

type SlideTheme = 'dark_tech' | 'deep_navy' | 'clean_minimal';

export const PptGenerator: React.FC<PptGeneratorProps> = ({
  userSubject = 'Data Structures & Algorithms',
  prefillTopic = '',
  prefillUnit = 'UNIT 1',
  onDeckGenerated,
}) => {
  // Input states
  const [subject, setSubject] = useState<string>(userSubject);
  const [unit, setUnit] = useState<string>(prefillUnit || 'UNIT 1');
  const [topicTitle, setTopicTitle] = useState<string>(prefillTopic || '');
  const [pedagogyMode, setPedagogyMode] = useState<string>('zero_knowledge');
  const [slideCount, setSlideCount] = useState<number>(10);
  const [customInstructions, setCustomInstructions] = useState<string>('');

  // PYQ inputs
  const [pyqList, setPyqList] = useState<PyqItem[]>([]);
  const [pastedPyqText, setPastedPyqText] = useState<string>('');
  const [showPastePyq, setShowPastePyq] = useState<boolean>(false);
  const [excelFileName, setExcelFileName] = useState<string>('');

  // API Key modal
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);

  // Deck states
  const [generatedDeck, setGeneratedDeck] = useState<AiGeneratedDeck | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [theme, setTheme] = useState<SlideTheme>('dark_tech');

  // Generation status
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [isExportingPptx, setIsExportingPptx] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedKey = AiPptService.getStoredApiKey();
    if (savedKey) setApiKey(savedKey);
  }, []);

  const handleSaveApiKey = () => {
    AiPptService.saveStoredApiKey(apiKey);
    setShowApiKeyModal(false);
    setSuccessToast('DeepSeek API Key saved successfully.');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErrorMessage(null);
      const parsed = await AiPptService.parsePyqsFromExcel(file);
      if (parsed.length === 0) {
        setErrorMessage('No valid questions found in this Excel sheet. Please ensure column headers like "Question" or "Problem" exist.');
        return;
      }

      setPyqList(parsed);
      setExcelFileName(file.name);
      setSuccessToast(`Successfully loaded ${parsed.length} PYQs from ${file.name}`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      setErrorMessage(`Failed to parse Excel file: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleAddPastedPyqs = () => {
    if (!pastedPyqText.trim()) return;
    const parsed = AiPptService.parsePyqsFromText(pastedPyqText);
    if (parsed.length === 0) {
      setErrorMessage('Could not detect distinct questions. Please format each question with numbers (e.g. 1., Q1:) or linebreaks.');
      return;
    }

    setPyqList([...pyqList, ...parsed]);
    setPastedPyqText('');
    setShowPastePyq(false);
    setSuccessToast(`Added ${parsed.length} questions to generation list.`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleClearPyqs = () => {
    setPyqList([]);
    setExcelFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerateDeck = async () => {
    if (!topicTitle.trim()) {
      setErrorMessage('Please enter a Topic Title to generate slides for.');
      return;
    }

    setErrorMessage(null);
    setIsGenerating(true);
    setGenerationStep('1/4: Analyzing syllabus and topic concepts...');

    const timer1 = setTimeout(() => {
      setGenerationStep('2/4: Deconstructing first principles & real-world analogies...');
    }, 2000);

    const timer2 = setTimeout(() => {
      setGenerationStep('3/4: Mapping Previous Year Questions & step-by-step solutions...');
    }, 4500);

    const timer3 = setTimeout(() => {
      setGenerationStep('4/4: Formatting high-impact 16:9 visual slides...');
    }, 7500);

    try {
      const result = await AiPptService.generateDeck({
        subject: subject.trim() || 'Engineering',
        unit,
        topicTitle: topicTitle.trim(),
        pyqList: pyqList.length > 0 ? pyqList : undefined,
        customInstructions: customInstructions.trim() || undefined,
        targetAudience: pedagogyMode,
        slideCount,
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

  const handleExportPptx = async () => {
    if (!generatedDeck) return;
    setIsExportingPptx(true);
    try {
      await AiPptService.exportToPptx(generatedDeck, theme);
      setSuccessToast('✓ PowerPoint presentation (.pptx) downloaded successfully!');
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      setErrorMessage(`Failed to export PPTX: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsExportingPptx(false);
    }
  };

  const handleExportPdf = async () => {
    if (!generatedDeck) return;
    setIsExportingPdf(true);
    try {
      await AiPptService.exportToPdf(generatedDeck, theme);
      setSuccessToast('✓ PDF slide deck downloaded successfully!');
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      setErrorMessage(`Failed to export PDF: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const activeSlide: AiSlide | null = generatedDeck?.slides[activeSlideIndex] || null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl backdrop-blur shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-100 tracking-tight">
                AI Presentation Studio
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold">
                DeepSeek Powered
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Break down syllabus topics from first principles & solve previous year examination questions for zero-knowledge learners.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setShowApiKeyModal(true)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
              apiKey
                ? 'bg-slate-950 border-emerald-500/40 text-emerald-300 hover:bg-slate-800'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            {apiKey ? 'DeepSeek Key Configured ✓' : 'Set DeepSeek API Key'}
          </button>
        </div>
      </div>

      {/* TOASTS & ALERTS */}
      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {successToast && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: TOPIC, SYLLABUS & PYQ CONFIGURATION (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Syllabus & Topic Inputs
            </h2>
            <span className="text-[10px] text-slate-500 font-mono">Step 1 of 2</span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Subject and Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block text-slate-400 font-medium mb-1">Subject Name *</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Data Structures & Algorithms"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Curriculum Unit</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
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
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                placeholder="e.g. Dijkstra Shortest Path Algorithm & Fibonacci Heaps"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 font-medium"
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
                  onClick={() => setPedagogyMode('zero_knowledge')}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    pedagogyMode === 'zero_knowledge'
                      ? 'bg-indigo-950/50 border-indigo-500 text-indigo-200 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-[11px]">Zero-Knowledge</div>
                  <div className="text-[9px] text-slate-500">Intuition first</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPedagogyMode('pyq_intensive')}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    pedagogyMode === 'pyq_intensive'
                      ? 'bg-indigo-950/50 border-indigo-500 text-indigo-200 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-[11px]">PYQ Intensive</div>
                  <div className="text-[9px] text-slate-500">Exam high-yield</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPedagogyMode('deep_theory')}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    pedagogyMode === 'deep_theory'
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
                <span className="text-indigo-400 font-bold font-mono">{slideCount} Slides</span>
              </div>
              <input
                type="range"
                min="6"
                max="15"
                step="1"
                value={slideCount}
                onChange={(e) => setSlideCount(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-500 bg-slate-950 rounded-lg cursor-pointer"
              />
            </div>

            {/* Excel PYQ Attachment / Question Feed */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="block text-slate-300 font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  Excel PYQs & Examination Question Sheet
                </span>
                {pyqList.length > 0 && (
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">
                    ✓ {pyqList.length} PYQs Ready
                  </span>
                )}
              </label>

              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx, .xls, .csv"
                onChange={handleExcelUpload}
                className="hidden"
                id="excel-pyq-input"
              />

              <div className="flex gap-2">
                <label
                  htmlFor="excel-pyq-input"
                  className="flex-1 py-2 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-slate-300 font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  {excelFileName ? excelFileName : 'Upload Excel / CSV Sheet'}
                </label>

                <button
                  type="button"
                  onClick={() => setShowPastePyq(!showPastePyq)}
                  className="px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 font-medium"
                  title="Paste raw questions text"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>

                {pyqList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearPyqs}
                    className="p-2 text-slate-500 hover:text-red-400 rounded-lg"
                    title="Clear PYQs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {showPastePyq && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <label className="block text-[11px] text-slate-400 font-medium">
                    Paste raw question statements:
                  </label>
                  <textarea
                    rows={3}
                    value={pastedPyqText}
                    onChange={(e) => setPastedPyqText(e.target.value)}
                    placeholder="Q1: Explain Dijkstra Algorithm with step by step matrix representation.&#10;Q2: State Dirichlet conditions for Fourier transform."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-100 text-[11px] focus:outline-none focus:border-indigo-500"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddPastedPyqs}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-semibold"
                    >
                      + Add to PYQ List
                    </button>
                  </div>
                </div>
              )}

              {pyqList.length > 0 && (
                <div className="max-h-28 overflow-y-auto space-y-1 p-2 bg-slate-950 rounded-lg border border-slate-800/80">
                  {pyqList.slice(0, 5).map((q, idx) => (
                    <div key={idx} className="text-[10px] text-slate-300 truncate flex items-center gap-1.5">
                      <span className="text-emerald-400 font-mono font-bold">#{idx + 1}</span>
                      <span className="truncate">{q.questionText}</span>
                    </div>
                  ))}
                  {pyqList.length > 5 && (
                    <div className="text-[9px] text-slate-500 font-mono pt-1 text-center">
                      + {pyqList.length - 5} more questions incorporated in deck
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Custom Notes */}
            <div>
              <label className="block text-slate-400 font-medium mb-1">Additional Instructor Directives (Optional)</label>
              <textarea
                rows={2}
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="e.g. Include GATE 2022 numerical problem, step-by-step trace tables, and focus on time complexity."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs"
              />
            </div>
          </div>

          {/* GENERATE ACTION BUTTON */}
          <button
            type="button"
            onClick={handleGenerateDeck}
            disabled={isGenerating || !topicTitle.trim()}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 font-bold text-white shadow-lg shadow-indigo-600/30 transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-purple-200" />
                <span>{generationStep || 'Generating slides with DeepSeek AI...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Generate High-Impact Slide Deck</span>
              </>
            )}
          </button>
        </div>

        {/* RIGHT COLUMN: 16:9 SLIDE CANVAS & EXPORT CONTROLS (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* TOOLBAR */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300">Theme:</span>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setTheme('dark_tech')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    theme === 'dark_tech' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Dark Tech
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('deep_navy')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    theme === 'deep_navy' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Deep Navy
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('clean_minimal')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    theme === 'clean_minimal' ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Clean Minimal
                </button>
              </div>
            </div>

            {generatedDeck && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1"
                  title="Fullscreen presentation mode"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={isExportingPdf}
                  className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  {isExportingPdf ? 'Exporting...' : 'PDF'}
                </button>

                <button
                  type="button"
                  onClick={handleExportPptx}
                  disabled={isExportingPptx}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isExportingPptx ? 'Exporting PPTX...' : 'Export .PPTX'}
                </button>
              </div>
            )}
          </div>

          {/* 16:9 SLIDE CANVAS */}
          {!generatedDeck ? (
            <div className="aspect-[16/9] w-full bg-slate-900/60 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">No Presentation Generated Yet</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Enter your topic on the left, attach an Excel PYQ sheet, and click <strong>Generate High-Impact Slide Deck</strong> to create a ready-to-present lecture presentation.
                </p>
              </div>
            </div>
          ) : (
            <div className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-6 flex flex-col justify-center' : ''}`}>
              
              {/* SLIDE FRAME (16:9) */}
              <div
                className={`aspect-[16/9] w-full rounded-2xl border shadow-2xl overflow-hidden flex flex-col justify-between p-6 md:p-8 transition-all ${
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
                      {activeSlide?.badge || 'CORE CONCEPT'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {generatedDeck.subject} • {generatedDeck.unit}
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-slate-400">
                    Slide {activeSlideIndex + 1} of {generatedDeck.slides.length}
                  </div>
                </div>

                {/* SLIDE BODY */}
                <div className="my-auto space-y-4">
                  <div>
                    <h2 className={`text-xl md:text-2xl font-black tracking-tight ${
                      theme === 'clean_minimal' ? 'text-slate-900' : 'text-white'
                    }`}>
                      {activeSlide?.title}
                    </h2>
                    {activeSlide?.subtitle && (
                      <p className="text-xs text-slate-400 italic mt-0.5">
                        {activeSlide.subtitle}
                      </p>
                    )}
                  </div>

                  {/* 1. ANALOGY / FIRST PRINCIPLES */}
                  {activeSlide?.analogy && (
                    <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs space-y-1">
                      <div className="text-indigo-300 font-bold flex items-center gap-1.5 text-[11px]">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                        Real-World Analogy (Intuition):
                      </div>
                      <p className="text-slate-200 leading-relaxed">
                        {activeSlide.analogy}
                      </p>
                    </div>
                  )}

                  {/* 2. SOLVED PYQ CARD */}
                  {activeSlide?.pyqDetails && (
                    <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/40 text-xs space-y-3 shadow-inner">
                      <div className="flex items-center justify-between text-emerald-400 font-bold text-[11px]">
                        <span>📝 {activeSlide.pyqDetails.examYear || 'Examination PYQ'}</span>
                        {activeSlide.pyqDetails.marks && (
                          <span className="font-mono text-amber-400">[{activeSlide.pyqDetails.marks}]</span>
                        )}
                      </div>
                      <p className="font-semibold text-slate-100">
                        {activeSlide.pyqDetails.question}
                      </p>
                      
                      {activeSlide.pyqDetails.stepByStepSolution && (
                        <div className="space-y-1.5 pt-2 border-t border-slate-800 text-[11px] text-slate-300">
                          {activeSlide.pyqDetails.stepByStepSolution.map((step, sIdx) => (
                            <div key={sIdx} className="flex items-start gap-2">
                              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">
                                {sIdx + 1}
                              </span>
                              <span>{step.replace(/\*\*/g, '')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. TWO COLUMN COMPARISON */}
                  {activeSlide?.type === 'two_column' && (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
                        <div className="font-bold text-indigo-400 text-[11px]">
                          {activeSlide.leftColumnTitle || 'Approach A'}
                        </div>
                        {activeSlide.leftColumnBullets?.map((b, i) => (
                          <div key={i} className="text-slate-300 text-[11px]">• {b.replace(/\*\*/g, '')}</div>
                        ))}
                      </div>
                      <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
                        <div className="font-bold text-emerald-400 text-[11px]">
                          {activeSlide.rightColumnTitle || 'Approach B'}
                        </div>
                        {activeSlide.rightColumnBullets?.map((b, i) => (
                          <div key={i} className="text-slate-300 text-[11px]">• {b.replace(/\*\*/g, '')}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. BULLETS & CODE/FORMULA */}
                  {activeSlide?.bullets && !activeSlide.pyqDetails && (
                    <div className="space-y-1.5 text-xs text-slate-200">
                      {activeSlide.bullets.map((b, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-indigo-400 font-bold">•</span>
                          <span className="leading-relaxed">{b.replace(/\*\*/g, '')}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeSlide?.formulaOrCode && (
                    <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto">
                      {activeSlide.formulaOrCode}
                    </div>
                  )}
                </div>

                {/* SLIDE FOOTER */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                  {activeSlide?.calloutTip ? (
                    <div className="text-[11px] text-amber-300 font-medium flex items-center gap-1.5">
                      <span>⚡</span>
                      <span>{activeSlide.calloutTip}</span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-500">Apna Engineering Wallah Studio Deck</div>
                  )}

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
                  <ChevronLeft className="w-4 h-4" /> Previous Slide
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
                  Next Slide <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* API KEY CONFIGURATION MODAL */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
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
              Enter your DeepSeek API key (starts with <code className="text-indigo-300">sk-...</code>) to generate first-principles slide presentations. The key is securely preserved in your browser.
            </p>

            <div>
              <label className="block text-slate-300 font-semibold mb-1 text-xs">DeepSeek API Key</label>
              <input
                type="password"
                placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold"
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
