import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  AiPptService, 
  type AiGeneratedDeck, 
  type AiSlide, 
  type PyqItem,
  type DirectPyqRow,
  type AnswerPointersData
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
  Search,
  BookOpen,
  Layers,
  Edit3
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

  // Syllabus Topics & Unit-Wise Syllabus State
  const [syllabusMode, setSyllabusMode] = useState<'unit_wise' | 'global'>('unit_wise');
  const [unitWiseSyllabus, setUnitWiseSyllabus] = useState<Record<string, string[]>>({
    'UNIT 1': [
      'Asymptotic Notations & Complexity Analysis',
      'Recurrence Relations & Master Theorem',
      'Divide and Conquer Algorithmic Paradigm'
    ],
    'UNIT 2': [
      'Array Operations & Searching',
      'Singly and Doubly Linked Lists',
      'Stack Applications & Infix/Postfix',
      'Queue Operations & Circular Buffer'
    ],
    'UNIT 3': [
      'Binary Trees & Hierarchical Traversals',
      'Binary Search Trees (BST) & Invariants',
      'AVL Trees & Self-Balancing Rotations',
      'Heaps & Priority Queues'
    ],
    'UNIT 4': [
      'Graph Representations & Traversals (BFS/DFS)',
      'Minimum Spanning Trees (Kruskal & Prim)',
      'Single-Source Shortest Paths (Dijkstra)'
    ],
    'UNIT 5': [
      'Dynamic Programming & Optimal Substructure',
      'Greedy Strategy & Approximations',
      'NP-Completeness & Reductions'
    ]
  });
  const [activeUnitTab, setActiveUnitTab] = useState<string>('UNIT 1');
  const [newUnitTopicInput, setNewUnitTopicInput] = useState<string>('');
  const [showAddUnitModal, setShowAddUnitModal] = useState<boolean>(false);
  const [newUnitNameInput, setNewUnitNameInput] = useState<string>('');
  const [showBulkUnitModal, setShowBulkUnitModal] = useState<boolean>(false);
  const [bulkUnitText, setBulkUnitText] = useState<string>('');
  const [showBulkFullSyllabusModal, setShowBulkFullSyllabusModal] = useState<boolean>(false);
  const [bulkFullSyllabusText, setBulkFullSyllabusText] = useState<string>('');

  // Global Syllabus Topics Ordering State (Pulled from Dashboard / Custom)
  const [syllabusTopicsList, setSyllabusTopicsList] = useState<string[]>([]);
  const [newTopicInput, setNewTopicInput] = useState<string>('');
  const [showBulkTopicModal, setShowBulkTopicModal] = useState<boolean>(false);
  const [bulkTopicText, setBulkTopicText] = useState<string>('');

  // Blank Working Sheets & Separate Answer Pointers State
  const [addBlankPages, setAddBlankPages] = useState<boolean>(true);
  const [blankPagesCount, setBlankPagesCount] = useState<number>(2);
  const [generateAnswerPointers, setGenerateAnswerPointers] = useState<boolean>(true);
  const [answersPlacement, setAnswersPlacement] = useState<'after_question' | 'end_of_deck' | 'none'>('after_question');
  const [deepSeekPointersMap, setDeepSeekPointersMap] = useState<Record<string | number, AnswerPointersData>>({});
  const [targetUnitForAnswers, setTargetUnitForAnswers] = useState<string>('all');
  const [isGeneratingDeepSeekPointers, setIsGeneratingDeepSeekPointers] = useState<boolean>(false);
  const [isExportingAnswersOnly, setIsExportingAnswersOnly] = useState<boolean>(false);
  const [isExportingQuestionsOnly, setIsExportingQuestionsOnly] = useState<boolean>(false);

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
      const unitMap: Record<string, string[]> = {};

      matching.forEach((t) => {
        const uKey = AiPptService.normalizeUnitNumber(t.unitNumber || 'UNIT 1');
        if (!unitMap[uKey]) unitMap[uKey] = [];

        if (t.topicTitle) {
          const trimmed = t.topicTitle.trim();
          topicSet.add(trimmed);
          if (!unitMap[uKey].includes(trimmed)) unitMap[uKey].push(trimmed);
        }
        if (t.subtopics && t.subtopics.length > 0) {
          t.subtopics.forEach((st) => {
            const stTrim = st.trim();
            if (stTrim) {
              topicSet.add(stTrim);
              if (!unitMap[uKey].includes(stTrim)) unitMap[uKey].push(stTrim);
            }
          });
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

      if (Object.keys(unitMap).length > 0) {
        setUnitWiseSyllabus(unitMap);
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

  // Union of units configured in syllabus, detected in PYQs, and standard defaults
  const availableUnitTabs = useMemo(() => {
    const unitSet = new Set<string>();
    Object.keys(unitWiseSyllabus).forEach((u) => unitSet.add(u));
    directPyqRows.forEach((r) => {
      if (r.unitNumber) unitSet.add(AiPptService.normalizeUnitNumber(r.unitNumber));
    });
    ['UNIT 1', 'UNIT 2', 'UNIT 3', 'UNIT 4', 'UNIT 5'].forEach((u) => unitSet.add(u));
    return Array.from(unitSet).sort((a, b) => AiPptService.extractUnitNumber(a) - AiPptService.extractUnitNumber(b));
  }, [unitWiseSyllabus, directPyqRows]);

  // Ensure activeUnitTab is always in availableUnitTabs
  useEffect(() => {
    if (availableUnitTabs.length > 0 && !availableUnitTabs.includes(activeUnitTab)) {
      setActiveUnitTab(availableUnitTabs[0]);
    }
  }, [availableUnitTabs, activeUnitTab]);

  // Synchronize units discovered from parsed PYQ Excel sheet
  useEffect(() => {
    if (directPyqRows.length > 0) {
      setUnitWiseSyllabus((prev) => {
        const next = { ...prev };
        let changed = false;
        directPyqRows.forEach((r) => {
          const uKey = AiPptService.normalizeUnitNumber(r.unitNumber || 'UNIT 1');
          if (!next[uKey]) {
            next[uKey] = [];
            changed = true;
          }
          if (r.mappedTopic && r.mappedTopic !== 'General Concept' && !next[uKey].includes(r.mappedTopic)) {
            next[uKey] = [...next[uKey], r.mappedTopic];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [directPyqRows]);

  // Available subjects from faculty and dashboard
  const availableSubjects = useMemo(() => {
    const fromTeachers = StorageService.getTeachers().map((t) => t.subject).filter(Boolean);
    const fromTopics = StorageService.getAssignedTopics().map((t) => t.subject).filter(Boolean);
    const unique = Array.from(new Set([...fromTeachers, ...fromTopics]));
    return unique.length > 0 ? unique : ['Data Structures & Algorithms', 'Operating Systems', 'Database Management'];
  }, []);

  // Sorted PYQs based on Unit Number & Syllabus Topics order
  const sortedDirectPyqs = useMemo(() => {
    return AiPptService.sortDirectPyqs(
      directPyqRows,
      syllabusTopicsList,
      syllabusMode === 'unit_wise' ? unitWiseSyllabus : undefined
    );
  }, [directPyqRows, syllabusTopicsList, syllabusMode, unitWiseSyllabus]);

  // Grouped by Unit -> Topics -> Questions
  const unitQuestionGroups = useMemo(() => {
    return AiPptService.groupAndSortPyqsByUnitAndTopic(
      directPyqRows,
      syllabusTopicsList,
      syllabusMode === 'unit_wise' ? unitWiseSyllabus : undefined
    );
  }, [directPyqRows, syllabusTopicsList, syllabusMode, unitWiseSyllabus]);

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
      setDeepSeekPointersMap({});
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
    setDeepSeekPointersMap({});
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

  // ── Unit-Wise Syllabus Handlers ──
  const handleAddUnitTopic = () => {
    const trimmed = newUnitTopicInput.trim();
    if (!trimmed || !activeUnitTab) return;
    setUnitWiseSyllabus((prev) => {
      const currentList = prev[activeUnitTab] || [];
      if (currentList.some((t) => t.toLowerCase() === trimmed.toLowerCase())) return prev;
      return {
        ...prev,
        [activeUnitTab]: [...currentList, trimmed],
      };
    });
    setNewUnitTopicInput('');
  };

  const handleRemoveUnitTopic = (topicIndex: number) => {
    if (!activeUnitTab) return;
    setUnitWiseSyllabus((prev) => {
      const currentList = prev[activeUnitTab] || [];
      return {
        ...prev,
        [activeUnitTab]: currentList.filter((_, i) => i !== topicIndex),
      };
    });
  };

  const handleMoveUnitTopic = (index: number, direction: 'up' | 'down') => {
    if (!activeUnitTab) return;
    setUnitWiseSyllabus((prev) => {
      const currentList = [...(prev[activeUnitTab] || [])];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= currentList.length) return prev;
      const temp = currentList[index];
      currentList[index] = currentList[targetIndex];
      currentList[targetIndex] = temp;
      return {
        ...prev,
        [activeUnitTab]: currentList,
      };
    });
  };

  const handleOpenBulkUnitModal = () => {
    const currentList = unitWiseSyllabus[activeUnitTab] || [];
    setBulkUnitText(currentList.join('\n'));
    setShowBulkUnitModal(true);
  };

  const handleBulkUnitSave = () => {
    if (!activeUnitTab) return;
    const items = bulkUnitText
      .split(/,|\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const unique = Array.from(new Set(items));
    setUnitWiseSyllabus((prev) => ({
      ...prev,
      [activeUnitTab]: unique,
    }));
    setShowBulkUnitModal(false);
    setBulkUnitText('');
    setSuccessToast(`✓ Updated ${activeUnitTab} topics (${unique.length} topics)`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleBulkFullSyllabusSave = () => {
    if (!bulkFullSyllabusText.trim()) return;
    const parsed = AiPptService.parseMultiUnitSyllabus(bulkFullSyllabusText);
    const unitKeys = Object.keys(parsed);
    if (unitKeys.length === 0) {
      setErrorMessage('Could not detect distinct units. Please use headers like "Unit 1: ...", "Unit 2: ...", or "Module 1".');
      return;
    }
    setUnitWiseSyllabus((prev) => ({
      ...prev,
      ...parsed,
    }));
    setShowBulkFullSyllabusModal(false);
    setBulkFullSyllabusText('');
    setSuccessToast(`✓ Imported syllabus for ${unitKeys.length} units (${unitKeys.join(', ')})`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleAddCustomUnit = () => {
    const trimmed = newUnitNameInput.trim();
    if (!trimmed) return;
    const normalized = AiPptService.normalizeUnitNumber(trimmed);
    setUnitWiseSyllabus((prev) => {
      if (prev[normalized]) return prev;
      return {
        ...prev,
        [normalized]: [],
      };
    });
    setActiveUnitTab(normalized);
    setNewUnitNameInput('');
    setShowAddUnitModal(false);
    setSuccessToast(`✓ Created unit tab: ${normalized}`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleGenerateDirectDeck = (overrideOptions?: {
    addBlankPages?: boolean;
    blankPagesCount?: number;
    generateAnswerPointers?: boolean;
    answersPlacement?: 'integrated_same_slide' | 'after_question' | 'end_of_deck' | 'none';
    deepSeekPointersMap?: Record<string | number, AnswerPointersData>;
  }) => {
    if (directPyqRows.length === 0) {
      setErrorMessage('Please upload an Excel file containing PYQs first.');
      return;
    }

    setErrorMessage(null);
    setIsGenerating(true);

    const useBlankPages = overrideOptions?.addBlankPages !== undefined ? overrideOptions.addBlankPages : addBlankPages;
    const useBlankCount = overrideOptions?.blankPagesCount !== undefined ? overrideOptions.blankPagesCount : blankPagesCount;
    const useAnswerPointers = overrideOptions?.generateAnswerPointers !== undefined ? overrideOptions.generateAnswerPointers : generateAnswerPointers;
    const usePlacement = overrideOptions?.answersPlacement !== undefined ? overrideOptions.answersPlacement : answersPlacement;
    const usePointersMap = overrideOptions?.deepSeekPointersMap !== undefined ? overrideOptions.deepSeekPointersMap : deepSeekPointersMap;

    try {
      const deck = AiPptService.generateDirectPyqDeck({
        subject: directSubject.trim() || 'Engineering Course',
        deckTitle: directDeckTitle.trim() || `${directSubject} - PYQs Bank`,
        pyqs: directPyqRows,
        syllabusTopicsOrder: syllabusTopicsList,
        unitWiseSyllabusOrder: syllabusMode === 'unit_wise' ? unitWiseSyllabus : undefined,
        includeUnitDividers,
        includeTopicDividers,
        addBlankPagesPerQuestion: useBlankPages,
        blankPagesCount: useBlankCount,
        generateAnswerPointers: useAnswerPointers,
        answersPlacement: usePlacement,
        deepSeekPointersMap: usePointersMap,
      });

      setGeneratedDeck(deck);
      setActiveSlideIndex(0);
      setIsGenerating(false);

      const blankCount = useBlankPages ? useBlankCount * directPyqRows.length : 0;
      const pointersCount = useAnswerPointers ? directPyqRows.length : 0;
      setSuccessToast(`✨ Generated ${deck.slides.length} slides (${directPyqRows.length} Questions, ${blankCount} Blank Sheets, ${pointersCount} Answer Pointers)`);
      setTimeout(() => setSuccessToast(null), 4000);

      if (onDeckGenerated) {
        onDeckGenerated(deck);
      }
    } catch (err: any) {
      setErrorMessage(`Error building deck: ${err?.message || 'Unknown error'}`);
      setIsGenerating(false);
    }
  };

  /**
   * Generates authentic, professor-grade answer pointers for all PYQs or a specific Unit via DeepSeek API
   */
  const handleGenerateAnswerPointersWithDeepSeek = async (scopedUnit?: string) => {
    if (directPyqRows.length === 0) {
      setErrorMessage('Please upload PYQs Excel file first.');
      return;
    }

    const unitToUse = scopedUnit !== undefined ? scopedUnit : targetUnitForAnswers;
    const isSingleUnit = unitToUse && unitToUse !== 'all';

    const targetRows = isSingleUnit
      ? directPyqRows.filter((r) => AiPptService.normalizeUnitNumber(r.unitNumber || 'UNIT 1') === AiPptService.normalizeUnitNumber(unitToUse))
      : directPyqRows;

    if (targetRows.length === 0) {
      setErrorMessage(`No questions found in uploaded file for ${unitToUse}.`);
      return;
    }

    setIsGeneratingDeepSeekPointers(true);
    setErrorMessage(null);
    setGenerationStep(
      isSingleUnit
        ? `Analyzing ${targetRows.length} questions for ${unitToUse} with DeepSeek in safe batches...`
        : `Analyzing ${directPyqRows.length} questions with DeepSeek in safe batches...`
    );

    const questionsInput = targetRows.map((r, idx) => ({
      id: r.id || `${r.unitNumber || 'UNIT'}-${idx}`,
      questionText: r.questionText,
      examYear: r.yearExam,
      marks: r.marks,
      topic: r.mappedTopic,
      solution: r.solution,
    }));

    try {
      const result = await AiPptService.fetchDeepSeekAnswerPointers({
        subject: directSubject,
        questions: questionsInput,
        apiKey: apiKey || undefined,
        onProgress: (completed, total) => {
          setGenerationStep(`Analyzing ${isSingleUnit ? unitToUse : 'all'} questions with DeepSeek (${completed}/${total})...`);
        },
      });

      if (!result.success) {
        if (result.needsApiKey) {
          setShowApiKeyModal(true);
          setErrorMessage('DeepSeek API Key is needed to generate AI answer pointers. Enter your API key below.');
        } else {
          setErrorMessage(result.error || 'Failed to generate answer pointers via DeepSeek.');
        }
        setIsGeneratingDeepSeekPointers(false);
        return;
      }

      if (result.pointersMap) {
        const mergedMap = { ...deepSeekPointersMap, ...result.pointersMap };
        setDeepSeekPointersMap(mergedMap);
        setGenerateAnswerPointers(true);
        // Instantly re-generate deck with merged DeepSeek pointers
        handleGenerateDirectDeck({
          generateAnswerPointers: true,
          deepSeekPointersMap: mergedMap,
        });

        const qCount = targetRows.length;
        setSuccessToast(`✨ Generated concise solution pointers for ${isSingleUnit ? unitToUse : 'all units'} (${qCount} questions)!`);
        setTimeout(() => setSuccessToast(null), 4000);
      }
    } catch (err: any) {
      console.warn('DeepSeek error caught, falling back to local professor notes:', err);
      // Graceful fallback to deterministic professor lecture notes for targetRows
      const fallbackMap: Record<string | number, AnswerPointersData> = { ...deepSeekPointersMap };
      targetRows.forEach((r, idx) => {
        const qKey = AiPptService.getQuestionKey(r.questionText);
        const ptrs = AiPptService.formatSolutionIntoPointers(r.solution, r.questionText, r.mappedTopic);
        ptrs.examYear = r.yearExam;
        ptrs.marks = r.marks;
        if (r.id) fallbackMap[r.id] = ptrs;
        if (qKey) fallbackMap[qKey] = ptrs;
        fallbackMap[idx] = ptrs;
      });
      setDeepSeekPointersMap(fallbackMap);
      setGenerateAnswerPointers(true);
      handleGenerateDirectDeck({
        generateAnswerPointers: true,
        deepSeekPointersMap: fallbackMap,
      });
      setSuccessToast(`✓ Formatted professor solution pointers for ${targetRows.length} questions (offline mode).`);
      setTimeout(() => setSuccessToast(null), 4000);
    } finally {
      setIsGeneratingDeepSeekPointers(false);
      setGenerationStep('');
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
      unitWiseSyllabusOrder: syllabusMode === 'unit_wise' ? unitWiseSyllabus : undefined,
      includeUnitDividers,
      includeTopicDividers,
      addBlankPagesPerQuestion: addBlankPages,
      blankPagesCount,
      generateAnswerPointers,
      answersPlacement,
      deepSeekPointersMap,
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
      unitWiseSyllabusOrder: syllabusMode === 'unit_wise' ? unitWiseSyllabus : undefined,
      includeUnitDividers,
      includeTopicDividers,
      addBlankPagesPerQuestion: addBlankPages,
      blankPagesCount,
      generateAnswerPointers,
      answersPlacement,
      deepSeekPointersMap,
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

  const handleExportAnswerPointersOnlyPptx = async () => {
    if (!generatedDeck) return;
    setIsExportingAnswersOnly(true);
    try {
      await AiPptService.exportAnswerPointersOnlyPptx(generatedDeck, theme);
      setSuccessToast('✓ Separate Answer Pointers guide (.pptx) downloaded!');
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err: any) {
      setErrorMessage(`Failed to export Answer Pointers: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsExportingAnswersOnly(false);
    }
  };

  const handleExportQuestionsOnlyPptx = async () => {
    if (!generatedDeck) return;
    setIsExportingQuestionsOnly(true);
    try {
      await AiPptService.exportQuestionsAndBlanksOnlyPptx(generatedDeck, theme);
      setSuccessToast('✓ Questions & Blank Whiteboard presentation (.pptx) downloaded!');
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err: any) {
      setErrorMessage(`Failed to export Questions: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsExportingQuestionsOnly(false);
    }
  };

  const activeSlide: AiSlide | null = generatedDeck?.slides[activeSlideIndex] || null;
  const render16x9SlideViewer = () => {
    if (!generatedDeck || !activeSlide) return null;

    return (
      <div className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl p-6 flex flex-col justify-center max-w-6xl mx-auto' : ''}`}>
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
                  {/* SLIDE TOP HEADER — hidden for blank_workspace (pure canvas) */}
                  {activeSlide?.type !== 'blank_workspace' && (
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/40">
                    {/* Top Left: Unit Number */}
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[11px] font-mono font-bold tracking-wider uppercase">
                        {activeSlide?.unitBadge || (activeSlide?.badge?.includes('•') ? activeSlide.badge.split('•')[0].trim() : activeSlide?.badge) || generatedDeck.unit || 'UNIT 1'}
                      </span>
                      {generatedDeck.subject && (
                        <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                          {generatedDeck.subject}
                        </span>
                      )}
                    </div>

                    {/* Top Right: Topic Name & Slide Counter */}
                    <div className="flex items-center gap-3">
                      {(activeSlide?.topicBadge || (activeSlide?.badge?.includes('•') ? activeSlide.badge.split('•')[1].trim() : null)) && (
                        <span className="text-[11px] font-semibold text-emerald-400 tracking-wide uppercase truncate max-w-[280px] md:max-w-md">
                          {activeSlide?.topicBadge || (activeSlide?.badge?.includes('•') ? activeSlide.badge.split('•')[1].trim() : '')}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-slate-500 border-l border-slate-800 pl-2.5">
                        {activeSlideIndex + 1}/{generatedDeck.slides.length}
                      </span>
                    </div>
                  </div>
                  )}

                  {/* SLIDE BODY */}
                  <div className="my-auto space-y-4">
                    
                    {/* 1. COVER / TITLE SLIDE (Executive Academic Style) */}
                    {activeSlide?.type === 'title' && (
                      <div className="text-center py-4 space-y-3.5">
                        <div className="inline-block px-4 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[11px] font-mono font-bold tracking-wide">
                          {activeSlide.badge || 'UNIVERSITY & COMPETITIVE EXAMINATION SERIES'}
                        </div>
                        
                        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white uppercase max-w-xl mx-auto">
                          {generatedDeck.subject || activeSlide.title}
                        </h2>

                        <div className="w-24 h-0.5 bg-indigo-500 mx-auto rounded-full" />

                        <p className="text-xs text-slate-300 max-w-lg mx-auto font-medium">
                          {activeSlide.subtitle || 'Topic-Mapped Previous Year Examination Questions (PYQ Bank)'}
                        </p>

                        {/* 3 Executive Metadata Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 max-w-xl mx-auto">
                          <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-0.5">
                            <span className="text-[9px] font-bold text-indigo-400 font-mono tracking-wider block uppercase">
                              Curriculum Scope
                            </span>
                            <span className="text-[11px] font-bold text-slate-100 block truncate">
                              {generatedDeck.unit || 'All Units'}
                            </span>
                          </div>

                          <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-0.5">
                            <span className="text-[9px] font-bold text-emerald-400 font-mono tracking-wider block uppercase">
                              Problem Set Size
                            </span>
                            <span className="text-[11px] font-bold text-slate-100 block">
                              {generatedDeck.relevantPyqCount || 0} Examination PYQs
                            </span>
                          </div>

                          <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-0.5">
                            <span className="text-[9px] font-bold text-amber-400 font-mono tracking-wider block uppercase">
                              Organization
                            </span>
                            <span className="text-[11px] font-bold text-slate-100 block">
                              Topic-Wise Sequence
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2. UNIT DIVIDER SLIDE */}
                    {activeSlide?.type === 'unit_divider' && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-mono font-bold uppercase tracking-wider">
                            {activeSlide.badge}
                          </span>
                        </div>

                        <div>
                          <h2 className="text-xl md:text-2xl font-black text-white">
                            {activeSlide.title}
                          </h2>
                          {activeSlide.subtitle && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              {activeSlide.subtitle}
                            </p>
                          )}
                        </div>

                        {/* Topics Index Box */}
                        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                            Syllabus Topics & Examination Questions in this Unit:
                          </span>
                          {activeSlide.bullets && activeSlide.bullets.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                              {activeSlide.bullets.map((t, idx) => (
                                <div key={idx} className="p-1.5 bg-slate-950/80 border border-slate-800/80 rounded-lg text-[11px] text-slate-200 font-medium">
                                  {t}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 2b. TOPIC SECTION DIVIDER SLIDE */}
                    {activeSlide?.type === 'topic_divider' && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-mono font-bold uppercase tracking-wider">
                            {activeSlide.badge || 'TOPIC SECTION'}
                          </span>
                        </div>

                        <div>
                          <h2 className="text-xl md:text-2xl font-black text-white">
                            {activeSlide.title}
                          </h2>
                          {activeSlide.subtitle && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              {activeSlide.subtitle}
                            </p>
                          )}
                        </div>

                        {/* Problem Set Index */}
                        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                            Problem Sets Included in this Topic Series:
                          </span>
                          {activeSlide.bullets && activeSlide.bullets.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                              {activeSlide.bullets.map((t, idx) => (
                                <div key={idx} className="p-1.5 bg-slate-950/80 border border-slate-800/80 rounded-lg text-[11px] text-amber-300 font-medium">
                                  {t}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 3. DIRECT PYQ QUESTION CARD (Integrated or Separate) */}
                    {activeSlide?.type === 'direct_pyq' && activeSlide.pyqDetails && (
                      <div className="space-y-3 py-2">
                        <div className="p-5 max-w-4xl mx-auto rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-xl">
                          <div className="flex items-center justify-between text-xs">
                            <span className="px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 font-mono">
                              <span>📝</span>
                              <span>Year of Question: {AiPptService.formatExamYearAndMonth(activeSlide.pyqDetails.examYear) || activeSlide.pyqDetails.examYear || 'Exam Question'}</span>
                            </span>
                            {activeSlide.pyqDetails.marks && (
                              <span className="font-mono text-amber-400 font-bold text-xs bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/30">
                                Weightage: {activeSlide.pyqDetails.marks}
                              </span>
                            )}
                          </div>
                          
                          <p className="font-bold text-base md:text-lg text-slate-100 leading-relaxed pt-1">
                            {activeSlide.pyqDetails.question}
                          </p>
                        </div>

                        {!activeSlide.answerPointers && (
                          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 font-mono pt-1">
                            <span>✍️</span>
                            <span>Detailed solution & pointers start on following slide</span>
                          </div>
                        )}

                        {/* Integrated Answer Section: Only rendered if explicitly integrated onto same slide */}
                        {activeSlide.answerPointers && (answersPlacement as any) === 'integrated_same_slide' ? (() => {
                          const ap = activeSlide.answerPointers;
                          return (
                            <div className="space-y-2.5 pt-1">
                              {/* Identified Solution Hero Card */}
                              {ap.identifiedSolution && (
                                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-emerald-950/40 border border-indigo-500/30 space-y-1.5 shadow-md">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold text-[9px] uppercase tracking-wider">
                                      🎯 Identified Solution & Approach
                                    </span>
                                    {ap.isTheory && (
                                      <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono text-[9px]">
                                        Theory / Invariant
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs font-semibold text-slate-100 leading-relaxed pt-0.5">
                                    {ap.identifiedSolution}
                                  </p>
                                  {ap.definition && (
                                    <p className="text-[11px] text-slate-300 italic pt-1 border-t border-slate-800/80">
                                      <span className="text-indigo-400 font-bold not-italic font-mono text-[9px] uppercase mr-1.5">Def:</span>
                                      {ap.definition}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Pointers Grid / List */}
                              {ap.pointers && ap.pointers.length > 0 && (
                                <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 shadow-inner">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                                    Key Analytical Steps & Derivation Invariants
                                  </span>
                                  <div className="space-y-1.5">
                                    {ap.pointers.map((pointer, pIdx) => {
                                      const boldMatch = pointer.match(/^\*\*([^*]+)\*\*[:\s]*(.*)/s);
                                      return (
                                        <div key={pIdx} className="flex items-start gap-2 text-[11px] leading-relaxed">
                                          <span className="text-indigo-400 font-bold shrink-0 mt-0.5">•</span>
                                          <span className="text-slate-200">
                                            {boldMatch ? (
                                              <>
                                                <span className="font-bold text-slate-100">{boldMatch[1]}:</span>{' '}
                                                <span>{boldMatch[2]}</span>
                                              </>
                                            ) : pointer.replace(/\*\*/g, '')}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Formula & Professor Note in Sober Columns */}
                              {(ap.formulaOrResult || ap.professorNote) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                  {ap.formulaOrResult && (
                                    <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-1">
                                      <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider font-mono block">
                                        Governing Formula / Bound
                                      </span>
                                      <div className="font-mono text-emerald-300 text-xs font-bold leading-relaxed">
                                        {ap.formulaOrResult}
                                      </div>
                                    </div>
                                  )}
                                  {ap.professorNote && (
                                    <div className="p-3 rounded-xl bg-amber-950/25 border border-amber-500/30 space-y-1">
                                      <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider font-mono block">
                                        💡 Professor's Exam Note
                                      </span>
                                      <p className="text-[11px] text-slate-300 leading-relaxed">
                                        {ap.professorNote}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })() : (answersPlacement as any) === 'integrated_same_slide' && activeSlide.pyqDetails.stepByStepSolution && activeSlide.pyqDetails.stepByStepSolution.length > 0 ? (
                          <div className="p-3.5 rounded-2xl bg-slate-950 border border-indigo-500/30 text-xs space-y-2">
                            <div className="text-indigo-400 font-bold text-[11px] flex items-center gap-1.5">
                              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                              Faculty Solution & Derivation Notes:
                            </div>
                            <div className="text-[11px] text-slate-300 space-y-1 pl-1 leading-relaxed">
                              {activeSlide.pyqDetails.stepByStepSolution.map((s, idx) => (
                                <p key={idx} className="text-slate-300">• {s}</p>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* 3b. BLANK WORKSPACE — 100% PURE CANVAS (No text, no UI, just background) */}
                    {activeSlide?.type === 'blank_workspace' && (
                      <div className="absolute inset-0" />
                    )}

                    {/* 3c. ANSWER & EXPLANATION — Pure High-Yield Bullet Pointers Only (No Template Badges) */}
                    {activeSlide?.type === 'answer_pointers' && (activeSlide.answerPointers || activeSlide.bullets) && (() => {
                      const ap = activeSlide.answerPointers;
                      const pointersList: string[] = ap?.pointers && ap.pointers.length > 0
                        ? ap.pointers
                        : (activeSlide.bullets || []);
                      const slideIdx = activeSlide.answerSlideIndex ?? 0;
                      const slideTotalCount = activeSlide.answerSlideTotalCount ?? 1;
                      const rawYear = activeSlide.pyqDetails?.examYear || ap?.examYear;
                      const examYearText = AiPptService.formatExamYearAndMonth(rawYear) || rawYear;
                      const marksText = activeSlide.pyqDetails?.marks || ap?.marks;
                      const qRefText = activeSlide.questionReference || activeSlide.pyqDetails?.question;

                      return (
                        <div className="space-y-3.5">
                          {/* Top Question Reference & Year of Question Banner */}
                          {(examYearText || qRefText) && (
                            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold text-xs shrink-0 font-mono">
                                  📝 {examYearText || 'Exam PYQ'}{marksText ? ` [${marksText}]` : ''}
                                </span>
                                {qRefText && (
                                  <span className="text-xs text-slate-300 truncate font-semibold">
                                    Problem #{activeSlide.questionNumber || 1}: {qRefText}
                                  </span>
                                )}
                              </div>
                              {slideTotalCount > 1 && (
                                <span className="text-[11px] font-mono text-indigo-300 bg-indigo-950/80 px-2.5 py-0.5 rounded-lg border border-indigo-500/30 font-bold shrink-0 self-end sm:self-auto">
                                  Part {slideIdx + 1} of {slideTotalCount}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Pure, Sober Bullet Pointers Presentation (Natural, High-Yield Lecture Notes) */}
                          <div className="p-6 md:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
                            <div className="space-y-3.5">
                              {pointersList.map((pointer, pIdx) => {
                                const cleanText = pointer.replace(/^(?:Milestone\s*\d+[:.-]?|Step\s*\d+[:.-]?)\s*/i, '').trim();
                                const boldMatch = cleanText.match(/^\*\*([^*]+)\*\*[:\s]*(.*)/s);
                                return (
                                  <div key={pIdx} className="flex items-start gap-3 text-sm md:text-base leading-relaxed">
                                    <span className="text-indigo-400 font-bold text-base md:text-lg select-none shrink-0 mt-0.5">•</span>
                                    <div className="text-slate-100 flex-1">
                                      {boldMatch ? (
                                        <>
                                          <span className="font-bold text-indigo-200 tracking-wide">{boldMatch[1]}:</span>{' '}
                                          <span className="text-slate-200 font-normal">{boldMatch[2]}</span>
                                        </>
                                      ) : (
                                        <span className="text-slate-200">{cleanText.replace(/\*\*/g, '')}</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })()}



                    {/* 4. FIRST PRINCIPLES / ANALOGY SLIDE */}
                    {activeSlide?.type === 'first_principles' && (
                      <div className="space-y-3.5">
                        {activeSlide.analogy && (
                          <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-start gap-3 shadow-inner">
                            <span className="text-lg shrink-0">💡</span>
                            <div>
                              <span className="text-[10px] font-bold text-indigo-400 font-mono tracking-wider uppercase block">
                                Real-World Engineering Analogy (Intuition)
                              </span>
                              <p className="text-xs md:text-sm text-slate-200 font-medium leading-relaxed mt-0.5">
                                {activeSlide.analogy}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/30 space-y-2.5 shadow-inner">
                            <div className="flex items-center gap-2 border-b border-red-500/20 pb-2">
                              <span className="text-sm">⚠️</span>
                              <span className="text-xs font-bold text-red-400 uppercase tracking-wide">
                                Why Naive Approaches Fail (Motivation)
                              </span>
                            </div>
                            <div className="space-y-2">
                              {activeSlide.bullets?.slice(0, Math.ceil((activeSlide.bullets?.length || 0) / 2)).map((b, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                                  <span className="text-red-400 font-bold shrink-0">•</span>
                                  <span>{b.replace(/\*\*/g, '')}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2.5 shadow-inner">
                            <div className="flex items-center gap-2 border-b border-emerald-500/20 pb-2">
                              <span className="text-sm">⚡</span>
                              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                                First-Principles Breakthrough & Invariant
                              </span>
                            </div>
                            <div className="space-y-2">
                              {activeSlide.bullets?.slice(Math.ceil((activeSlide.bullets?.length || 0) / 2)).map((b, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-xs text-slate-100">
                                  <span className="text-emerald-400 font-bold shrink-0">•</span>
                                  <span>{b.replace(/\*\*/g, '')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 5. CONCEPT CARD WITH CODE / FORMULA */}
                    {activeSlide?.type === 'concept_card' && (
                      <div className="space-y-3.5">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                          <div className={`${activeSlide.formulaOrCode ? 'md:col-span-7' : 'md:col-span-12'} p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5 shadow-inner`}>
                            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wide font-mono">
                                Core Formulation & Invariant Principles
                              </span>
                            </div>
                            <div className="space-y-2 pt-1">
                              {activeSlide.bullets?.map((b, idx) => (
                                <div key={idx} className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-200 leading-relaxed">
                                  <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                    •
                                  </span>
                                  <span>{b.replace(/\*\*/g, '')}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {activeSlide.formulaOrCode && (
                            <div className="md:col-span-5 p-4 rounded-2xl bg-slate-950 border border-indigo-500/30 space-y-2 shadow-inner">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono">
                                  Formal Definition / Code
                                </span>
                                <span className="text-[9px] text-slate-500 font-mono">C99 / Unicode</span>
                              </div>
                              <pre className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-emerald-300 font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap">
                                {activeSlide.formulaOrCode}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 6. TWO COLUMN COMPARISON */}
                    {activeSlide?.type === 'two_column' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div className="p-4 rounded-2xl bg-slate-900 border border-indigo-500/30 space-y-2.5 shadow-inner">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wide">
                              {activeSlide.leftColumnTitle || 'Approach A'}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {activeSlide.leftColumnBullets?.map((b, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                                <span className="text-indigo-400 font-bold shrink-0">•</span>
                                <span>{b.replace(/\*\*/g, '')}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/30 space-y-2.5 shadow-inner">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                              {activeSlide.rightColumnTitle || 'Approach B'}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {activeSlide.rightColumnBullets?.map((b, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                                <span className="text-emerald-400 font-bold shrink-0">•</span>
                                <span>{b.replace(/\*\*/g, '')}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 7. STEP BY STEP PROCEDURE */}
                    {activeSlide?.type === 'step_by_step' && (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                        <div className={`${activeSlide.formulaOrCode ? 'md:col-span-7' : 'md:col-span-12'} p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5 shadow-inner`}>
                          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block border-b border-slate-800 pb-1.5 font-mono">
                            Algorithmic State Transition & Procedure Milestones
                          </span>
                          <div className="space-y-2 pt-0.5">
                            {activeSlide.bullets?.map((b, idx) => {
                              const clean = b.replace(/\*\*/g, '');
                              const label = clean.startsWith('Step') || clean.startsWith('Milestone') ? clean : `Step ${idx + 1}: ${clean}`;
                              return (
                                <div key={idx} className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-200 leading-relaxed">
                                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                    {idx + 1}
                                  </span>
                                  <span>{label}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {activeSlide.formulaOrCode && (
                          <div className="md:col-span-5 p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-2 shadow-inner">
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono block border-b border-slate-800 pb-1.5">
                              State Machine / Trace Table
                            </span>
                            <pre className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-emerald-300 font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap">
                              {activeSlide.formulaOrCode}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 8. SOLVED EXAMINATION PYQ */}
                    {activeSlide?.type === 'pyq_solution' && (
                      <div className="space-y-3.5">
                        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold text-[11px]">
                              📝 {activeSlide.pyqDetails?.examYear || 'Official Examination PYQ'}
                            </span>
                            {activeSlide.pyqDetails?.marks && (
                              <span className="font-mono text-amber-400 font-bold text-xs bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
                                {activeSlide.pyqDetails.marks}
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-sm md:text-base text-slate-100 leading-relaxed">
                            {activeSlide.pyqDetails?.question || activeSlide.title}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                          <div className="md:col-span-7 p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 shadow-inner">
                            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block border-b border-slate-800 pb-1.5 font-mono">
                              Step-by-Step Worked Solution & Trace
                            </span>
                            <div className="space-y-1.5 pt-0.5">
                              {(activeSlide.pyqDetails?.stepByStepSolution || activeSlide.bullets || []).map((step, sIdx) => (
                                <div key={sIdx} className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200">
                                  <span className="font-bold text-indigo-300 mr-1.5">Step {sIdx + 1}:</span>
                                  <span>{step.replace(/\*\*/g, '')}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="md:col-span-5 space-y-2.5">
                            <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-1.5 shadow-inner">
                              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block font-mono">
                                Boxed Final Result & Invariants
                              </span>
                              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-300 font-mono text-[11px] font-bold">
                                {activeSlide.pyqDetails?.keyTakeaway || activeSlide.formulaOrCode || 'Asymptotic Bound Verified'}
                              </div>
                            </div>

                            <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-1">
                              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block font-mono">
                                Chief Examiner Scoring Breakdown
                              </span>
                              <p className="text-[10.5px] text-indigo-200 font-mono font-bold leading-relaxed">
                                [20% Setup & Initial State | 60% Trace & Proof | 20% Boxed Answer]
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 9. COMMON MISTAKES / PITFALLS VS CORRECTIONS */}
                    {activeSlide?.type === 'common_mistakes' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/40 space-y-2.5 shadow-inner">
                          <span className="text-xs font-bold text-red-400 uppercase tracking-wider block border-b border-red-500/20 pb-1.5 flex items-center gap-1.5">
                            ❌ Common Student Traps & Misconceptions
                          </span>
                          <div className="space-y-2 pt-0.5">
                            {activeSlide.bullets?.slice(0, Math.ceil((activeSlide.bullets?.length || 0) / 2)).map((b, idx) => (
                              <div key={idx} className="p-2 rounded-xl bg-slate-950/70 border border-red-500/20 text-xs text-red-200/90 leading-relaxed">
                                {b.replace(/\*\*/g, '')}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 space-y-2.5 shadow-inner">
                          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block border-b border-emerald-500/20 pb-1.5 flex items-center gap-1.5">
                            ✅ Chief Examiner Corrections & Invariants
                          </span>
                          <div className="space-y-2 pt-0.5">
                            {activeSlide.bullets?.slice(Math.ceil((activeSlide.bullets?.length || 0) / 2)).map((b, idx) => (
                              <div key={idx} className="p-2 rounded-xl bg-slate-950/70 border border-emerald-500/20 text-xs text-emerald-200/90 leading-relaxed">
                                {b.replace(/\*\*/g, '')}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 10. SUMMARY / 3-PILLAR CHECKLIST */}
                    {activeSlide?.type === 'summary' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3.5 rounded-2xl bg-slate-900 border border-indigo-500/30 space-y-2 shadow-inner">
                          <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block border-b border-slate-800 pb-1 font-mono">
                            1. Governing Theory
                          </span>
                          <div className="space-y-1.5 pt-0.5">
                            {activeSlide.bullets?.slice(0, 2).map((b, idx) => (
                              <p key={idx} className="text-xs text-slate-200 leading-relaxed">
                                • {b.replace(/\*\*/g, '')}
                              </p>
                            ))}
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-900 border border-emerald-500/30 space-y-2 shadow-inner">
                          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block border-b border-slate-800 pb-1 font-mono">
                            2. Complexity Bounds
                          </span>
                          <div className="space-y-1.5 pt-0.5">
                            {activeSlide.bullets?.slice(2, 4).map((b, idx) => (
                              <p key={idx} className="text-xs text-slate-200 leading-relaxed">
                                • {b.replace(/\*\*/g, '')}
                              </p>
                            ))}
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-900 border border-amber-500/30 space-y-2 shadow-inner">
                          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block border-b border-slate-800 pb-1 font-mono">
                            3. Exam Checklist
                          </span>
                          <div className="space-y-1.5 pt-0.5">
                            {activeSlide.bullets?.slice(4).map((b, idx) => (
                              <p key={idx} className="text-xs text-slate-200 leading-relaxed">
                                • {b.replace(/\*\*/g, '')}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 11. DEFAULT FALLBACK SLIDE */}
                    {!['title', 'unit_divider', 'topic_divider', 'direct_pyq', 'blank_workspace', 'answer_pointers', 'first_principles', 'concept_card', 'two_column', 'step_by_step', 'pyq_solution', 'common_mistakes', 'summary'].includes(activeSlide?.type || '') && (
                      <div className="space-y-3">
                        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 shadow-inner">
                          <h3 className="text-base font-bold text-white">{activeSlide?.title}</h3>
                          {activeSlide?.subtitle && <p className="text-xs text-slate-400">{activeSlide.subtitle}</p>}
                          {activeSlide?.bullets && activeSlide.bullets.length > 0 && (
                            <div className="space-y-1.5 pt-2">
                              {activeSlide.bullets.map((b, idx) => (
                                <div key={idx} className="text-xs text-slate-200 flex items-start gap-2">
                                  <span className="text-indigo-400 font-bold">•</span>
                                  <span>{b.replace(/\*\*/g, '')}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {activeSlide?.formulaOrCode && (
                          <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-emerald-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                            {activeSlide.formulaOrCode}
                          </pre>
                        )}
                      </div>
                    )}

                  </div>

                  {/* SLIDE FOOTER — hidden for blank_workspace (pure canvas) */}
                  {activeSlide?.type !== 'blank_workspace' && (
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                    <div className="text-[10px] text-slate-400">
                      Apna Engineering Wallah • Faculty Lecture & Problem Repository
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
                  )}
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
    );
  };


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

                {/* Include Unit & Topic Transition Slides */}
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

                {/* Blank Working Sheets & Separate Answer Pointers Structure */}
                <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                  <span className="text-[10px] font-bold text-slate-300 block uppercase tracking-wider">
                    Lecture Solving & Answer Structure:
                  </span>

                  <label className="flex items-start gap-2 text-slate-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={addBlankPages}
                      onChange={(e) => setAddBlankPages(e.target.checked)}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-0 w-4 h-4 mt-0.5"
                    />
                    <div>
                      <span className="font-bold text-xs text-emerald-400">Add Blank Working Pages per Question</span>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                        Inserts digital whiteboard sheets after each question for live tablet/stylus derivation during lecture recording.
                      </p>
                    </div>
                  </label>

                  {addBlankPages && (
                    <div className="pl-6 pt-0.5 flex items-center justify-between gap-2">
                      <label className="text-[10px] text-slate-400 font-semibold">
                        Blank Sheets per Question:
                      </label>
                      <select
                        value={blankPagesCount}
                        onChange={(e) => setBlankPagesCount(Number(e.target.value))}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                      >
                        <option value={1}>1 Blank Sheet</option>
                        <option value={2}>2 Blank Sheets (Recommended)</option>
                        <option value={3}>3 Blank Sheets</option>
                      </select>
                    </div>
                  )}

                  <label className="flex items-start gap-2 text-slate-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={generateAnswerPointers}
                      onChange={(e) => setGenerateAnswerPointers(e.target.checked)}
                      className="rounded border-slate-700 text-indigo-500 focus:ring-0 w-4 h-4 mt-0.5"
                    />
                    <div>
                      <span className="font-bold text-xs text-indigo-300">Keep Answer Pages Separate (Pointers Only)</span>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                        Removes answers from question slides. Generates structured key pointers, formula checks & exam traps on separate pages.
                      </p>
                    </div>
                  </label>

                  {generateAnswerPointers && (
                    <div className="pl-6 pt-0.5 space-y-1">
                      <label className="block text-[10px] text-slate-400 font-semibold">
                        Answer Pointers Placement:
                      </label>
                      <select
                        value={answersPlacement}
                        onChange={(e) => setAnswersPlacement(e.target.value as 'after_question' | 'end_of_deck')}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-medium"
                      >
                        <option value="after_question">Consecutive: [Question ➔ 2 Blank Pages ➔ Answer Pointers]</option>
                        <option value="end_of_deck">Separate Appendix: [All Questions First ➔ End-of-Deck Pointers]</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. SYLLABUS TOPICS ORDERING CARD (DUAL MODE: UNIT-WISE vs GLOBAL) */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
              {/* Header with Mode Toggle */}
              <div className="space-y-3 pb-3 border-b border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <ListOrdered className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                        2. Syllabus Sequence & Architecture
                      </h2>
                    </div>
                  </div>

                  {/* Reset button */}
                  <button
                    type="button"
                    onClick={() => loadDashboardSyllabusTopics(directSubject)}
                    className="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 text-[10px] flex items-center gap-1 font-medium transition-colors"
                    title="Reload topics from Dashboard"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Sync Dashboard</span>
                  </button>
                </div>

                {/* Switcher: Unit-Wise Syllabus vs Global Topics Order */}
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSyllabusMode('unit_wise')}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      syllabusMode === 'unit_wise'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Unit-Wise Syllabus</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSyllabusMode('global')}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      syllabusMode === 'global'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                    <span>Global Topics Order</span>
                  </button>
                </div>
              </div>

              {/* MODE A: UNIT-WISE SYLLABUS */}
              {syllabusMode === 'unit_wise' ? (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Manage syllabus topics per unit. Questions in <span className="text-indigo-300 font-semibold">{activeUnitTab}</span> will be ordered by its syllabus sequence.
                    </p>

                    {/* Bulk Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowBulkFullSyllabusModal(true)}
                        className="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-indigo-400 hover:text-indigo-300 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-colors"
                        title="Paste full multi-unit syllabus at once"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>Import All Units</span>
                      </button>
                    </div>
                  </div>

                  {/* Unit Pill Tabs Bar */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                    {availableUnitTabs.map((uKey) => {
                      const topicCount = unitWiseSyllabus[uKey]?.length || 0;
                      const isActive = activeUnitTab === uKey;
                      return (
                        <button
                          key={uKey}
                          type="button"
                          onClick={() => setActiveUnitTab(uKey)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border ${
                            isActive
                              ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm'
                              : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          <span>{uKey}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                              isActive ? 'bg-indigo-500 text-white font-black' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {topicCount}
                          </span>
                        </button>
                      );
                    })}

                    {/* Add Custom Unit Tab Button */}
                    <button
                      type="button"
                      onClick={() => setShowAddUnitModal(true)}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-950 border border-dashed border-slate-700 text-slate-400 hover:text-indigo-300 hover:border-indigo-500/50 transition-colors shrink-0 flex items-center gap-1"
                      title="Add a custom unit (e.g. UNIT 6)"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Unit</span>
                    </button>
                  </div>

                  {/* Active Unit Bar with Bulk Edit */}
                  <div className="flex items-center justify-between px-1 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-200 font-mono">{activeUnitTab}</span>
                      <span className="text-[10px] text-slate-400">
                        ({(unitWiseSyllabus[activeUnitTab] || []).length} syllabus topics)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTargetUnitForAnswers(activeUnitTab);
                          handleGenerateAnswerPointersWithDeepSeek(activeUnitTab);
                        }}
                        disabled={isGeneratingDeepSeekPointers || directPyqRows.length === 0}
                        className="px-2 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-[10px] text-purple-300 font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                        title={`Generate DeepSeek answer pointers specifically for ${activeUnitTab}`}
                      >
                        <Lightbulb className="w-3 h-3 text-amber-300" />
                        <span>Answers for {activeUnitTab}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenBulkUnitModal}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                        title={`Bulk edit topics for ${activeUnitTab}`}
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Bulk Edit {activeUnitTab}</span>
                      </button>
                    </div>
                  </div>

                  {/* Add Topic Input for Active Unit */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newUnitTopicInput}
                      onChange={(e) => setNewUnitTopicInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddUnitTopic();
                        }
                      }}
                      placeholder={`Add topic to ${activeUnitTab}...`}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddUnitTopic}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>

                  {/* Topics List for Active Unit */}
                  <div className="max-h-52 overflow-y-auto space-y-1.5 p-2 bg-slate-950 rounded-2xl border border-slate-800/80">
                    {(unitWiseSyllabus[activeUnitTab] || []).length === 0 ? (
                      <div className="p-4 text-center space-y-1 text-slate-500">
                        <p className="text-xs italic">No syllabus topics listed for {activeUnitTab}.</p>
                        <p className="text-[10px] text-slate-600">
                          Add topics above or click "Bulk Edit {activeUnitTab}" to paste a list.
                        </p>
                      </div>
                    ) : (
                      (unitWiseSyllabus[activeUnitTab] || []).map((topic, idx, arr) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 p-1.5 px-2.5 bg-slate-900/90 border border-slate-800/90 rounded-xl text-xs group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-[10px] font-bold text-amber-400 shrink-0 w-4">
                              #{idx + 1}
                            </span>
                            <span className="text-slate-200 truncate text-[11px] font-medium">{topic}</span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveUnitTopic(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 hover:bg-slate-800 disabled:opacity-20 text-slate-400 hover:text-slate-100 rounded transition-colors"
                              title="Move up"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveUnitTopic(idx, 'down')}
                              disabled={idx === arr.length - 1}
                              className="p-1 hover:bg-slate-800 disabled:opacity-20 text-slate-400 hover:text-slate-100 rounded transition-colors"
                              title="Move down"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveUnitTopic(idx)}
                              className="p-1 hover:bg-slate-800 text-slate-500 hover:text-red-400 rounded transition-colors"
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
              ) : (
                /* MODE B: GLOBAL SYLLABUS TOPICS ORDER */
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Global topic sequence applied across all units. Questions matching earlier topics appear first.
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        setBulkTopicText(syllabusTopicsList.join('\n'));
                        setShowBulkTopicModal(true);
                      }}
                      className="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] text-slate-300 font-semibold flex items-center gap-1 shrink-0"
                      title="Paste / Edit topics in bulk"
                    >
                      <ArrowUpDown className="w-3 h-3" /> Reorder Bulk
                    </button>
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
                      placeholder="Add global syllabus topic to sequence..."
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddSyllabusTopic}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>

                  {/* Topics List with Up/Down Arrows */}
                  <div className="max-h-52 overflow-y-auto space-y-1.5 p-2 bg-slate-950 rounded-2xl border border-slate-800/80">
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
                            <span className="text-slate-200 truncate text-[11px] font-medium">{topic}</span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveTopic(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 hover:bg-slate-800 disabled:opacity-20 text-slate-400 hover:text-slate-100 rounded transition-colors"
                              title="Move up"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveTopic(idx, 'down')}
                              disabled={idx === syllabusTopicsList.length - 1}
                              className="p-1 hover:bg-slate-800 disabled:opacity-20 text-slate-400 hover:text-slate-100 rounded transition-colors"
                              title="Move down"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveSyllabusTopic(idx)}
                              className="p-1 hover:bg-slate-800 text-slate-500 hover:text-red-400 rounded transition-colors"
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
              )}
            </div>

            {/* GENERATE ACTION BUTTON */}
            <button
              type="button"
              onClick={() => handleGenerateDirectDeck()}
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
              <div className="space-y-4">
                
                {/* POST-GENERATION CONTROL BAR: ANSWER POINTERS & BLANK PAGES OPTIONS */}
                <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-purple-950/70 border border-indigo-500/30 rounded-3xl p-4 shadow-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800/80">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-xl bg-indigo-600 text-white font-mono font-bold text-xs shadow-md shadow-indigo-600/30">
                        ✨ Deck Ready • {generatedDeck.slides.length} Slides
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-medium border border-slate-700">
                        📝 {directPyqRows.length || generatedDeck.relevantPyqCount || 0} Questions
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium">
                        ✍️ {generatedDeck.slides.filter((s) => s.type === 'blank_workspace').length} Blank Workspaces
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-medium">
                        🎯 {generatedDeck.slides.filter((s) => s.type === 'answer_pointers').length} Answer Pointers
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-400 font-medium">
                      Configure Post-Generation Lecture Structure:
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {/* 2 Blank Pages per Question Toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !addBlankPages;
                          setAddBlankPages(nextVal);
                          handleGenerateDirectDeck({ addBlankPages: nextVal });
                        }}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          addBlankPages
                            ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300 shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                        title="Toggle 2 Blank Whiteboard Working Pages per question for live tablet/stylus derivation"
                      >
                        <span>✍️ 2 Blank Pages / Q</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                          addBlankPages ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {addBlankPages ? 'ON' : 'OFF'}
                        </span>
                      </button>

                      {/* Separate Answer Pointers Toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !generateAnswerPointers;
                          setGenerateAnswerPointers(nextVal);
                          handleGenerateDirectDeck({ generateAnswerPointers: nextVal });
                        }}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          generateAnswerPointers
                            ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                        title="Toggle Answer Pointers pages kept separate from questions"
                      >
                        <span>🎯 Separate Answer Pointers</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                          generateAnswerPointers ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {generateAnswerPointers ? 'ON' : 'OFF'}
                        </span>
                      </button>

                      {/* Placement / Layout Selector */}
                      {generateAnswerPointers && (
                        <select
                          value={answersPlacement}
                          onChange={(e) => {
                            const val = e.target.value as 'after_question' | 'end_of_deck';
                            setAnswersPlacement(val);
                            handleGenerateDirectDeck({ answersPlacement: val });
                          }}
                          className="bg-slate-950 border border-indigo-500/30 text-indigo-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                        >
                          <option value="after_question">Separate Slides (Q ➔ Blanks ➔ Answer Slides)</option>
                          <option value="end_of_deck">Appendix Mode (Questions First ➔ Answers at End)</option>
                        </select>
                      )}

                      {/* Unit Scope Selector for Answer Generation */}
                      <select
                        value={targetUnitForAnswers}
                        onChange={(e) => setTargetUnitForAnswers(e.target.value)}
                        className="bg-slate-950 border border-purple-500/40 text-purple-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-purple-400 font-semibold cursor-pointer shadow-sm"
                        title="Select whether to generate answers for a single unit or all units"
                      >
                        <option value="all">🌐 All Units ({directPyqRows.length} Qs)</option>
                        {availableUnitTabs.map((u) => {
                          const qCount = directPyqRows.filter(
                            (r) => AiPptService.normalizeUnitNumber(r.unitNumber || 'UNIT 1') === u
                          ).length;
                          return (
                            <option key={u} value={u}>
                              ⚡ {u} ({qCount} Qs)
                            </option>
                          );
                        })}
                      </select>

                      {/* DeepSeek Answer Pointers Generator Button */}
                      <button
                        type="button"
                        onClick={() => handleGenerateAnswerPointersWithDeepSeek()}
                        disabled={isGeneratingDeepSeekPointers}
                        className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
                          Object.keys(deepSeekPointersMap).length > 0
                            ? 'bg-purple-600/20 border-purple-500/50 text-purple-200 hover:bg-purple-600/30'
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-purple-500/50'
                        }`}
                        title="Generate authentic, professor-style board solution pointers via DeepSeek API"
                      >
                        {isGeneratingDeepSeekPointers ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-300" />
                            <span>DeepSeek is generating pointers...</span>
                          </>
                        ) : Object.keys(deepSeekPointersMap).length > 0 ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                            <span>
                              {targetUnitForAnswers === 'all'
                                ? `DeepSeek Pointers Active (${Object.keys(deepSeekPointersMap).length} Qs)`
                                : `Re-Generate ${targetUnitForAnswers} Answers`}
                            </span>
                          </>
                        ) : (
                          <>
                            <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
                            <span>
                              {targetUnitForAnswers === 'all'
                                ? 'Generate All Answer Pointers (DeepSeek)'
                                : `Generate ${targetUnitForAnswers} Answers (DeepSeek)`}
                            </span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Specialized Separate Deck Exports */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleExportAnswerPointersOnlyPptx}
                        disabled={isExportingAnswersOnly || generatedDeck.slides.filter((s) => s.type === 'answer_pointers').length === 0}
                        className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-40"
                        title="Download separate presentation containing ONLY Answer Pointers"
                      >
                        <Download className="w-3.5 h-3.5 text-purple-400" />
                        <span>{isExportingAnswersOnly ? 'Exporting...' : 'Answer Pointers Only (.pptx)'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportQuestionsOnlyPptx}
                        disabled={isExportingQuestionsOnly}
                        className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-40"
                        title="Download presentation with Questions and 2 Blank Pages only (without answers)"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-400" />
                        <span>{isExportingQuestionsOnly ? 'Exporting...' : 'Questions + Blanks (.pptx)'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 16:9 SLIDE VIEWER & CAROUSEL */}
                {render16x9SlideViewer()}

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
                  <button
                    type="button"
                    onClick={() => setTheme('clean_minimal')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-medium ${
                      theme === 'clean_minimal' ? 'bg-white text-slate-900 font-bold' : 'text-slate-400'
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
                  disabled={isExportingPdf || !generatedDeck}
                  className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  PDF
                </button>
                <button
                  type="button"
                  onClick={handleExportPptx}
                  disabled={isExportingPptx || !generatedDeck}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isExportingPptx ? 'Exporting PPTX...' : 'Export .PPTX'}
                </button>
              </div>
            </div>

            {/* 16:9 SLIDE CANVAS PREVIEW */}
            {!generatedDeck ? (
              <div className="aspect-[16/9] w-full bg-slate-900/60 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center p-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Presentation className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">No AI Deck Generated Yet</h3>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    Enter your topic, choose pedagogy depth (Zero-Knowledge, PYQ Intensive, or Deep Theory), and click <strong>Generate AI Concept Deck</strong>.
                  </p>
                </div>
              </div>
            ) : (
              render16x9SlideViewer()
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

      {/* BULK UNIT TOPICS MODAL */}
      {showBulkUnitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Bulk Edit Topics: {activeUnitTab}</h3>
                  <span className="text-[10px] text-slate-400">Order topics for this specific unit</span>
                </div>
              </div>
              <button onClick={() => setShowBulkUnitModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-400">
              Paste or rearrange topic titles for <span className="text-indigo-300 font-semibold">{activeUnitTab}</span> (one topic per line or comma-separated). Questions in {activeUnitTab} will follow this exact order.
            </p>

            <textarea
              rows={8}
              value={bulkUnitText}
              onChange={(e) => setBulkUnitText(e.target.value)}
              placeholder="Topic 1&#10;Topic 2&#10;Topic 3"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkUnitModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkUnitSave}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
              >
                Save {activeUnitTab} Topics
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT MULTI-UNIT SYLLABUS MODAL */}
      {showBulkFullSyllabusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Import Full Multi-Unit Syllabus</h3>
                  <span className="text-[10px] text-slate-400">Auto-detects UNIT 1, UNIT 2, UNIT 3...</span>
                </div>
              </div>
              <button onClick={() => setShowBulkFullSyllabusModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Paste your university course syllabus. Units (e.g. <span className="text-indigo-300 font-mono">Unit 1:</span>, <span className="text-indigo-300 font-mono">Unit 2:</span>, or <span className="text-indigo-300 font-mono">Module 1</span>) and bulleted topics will be automatically organized into unit tabs.
            </p>

            <textarea
              rows={10}
              value={bulkFullSyllabusText}
              onChange={(e) => setBulkFullSyllabusText(e.target.value)}
              placeholder={`Unit 1: Asymptotic Analysis & Arrays\n- Asymptotic Notations & Complexity\n- Array Operations\n- Recurrence Relations\n\nUnit 2: Linear Data Structures\n- Singly Linked Lists\n- Doubly Linked Lists\n- Stacks & Queues\n\nUnit 3: Trees & Graphs\n- Binary Search Trees\n- Graph Traversals`}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
            />

            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] text-slate-500 italic">
                Accepts "Unit X", "Module X", or "Chapter X" prefixes
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkFullSyllabusModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkFullSyllabusSave}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
                >
                  Import & Parse Syllabus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD CUSTOM UNIT MODAL */}
      {showAddUnitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-100">Add New Unit</h3>
              </div>
              <button onClick={() => setShowAddUnitModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-400">
              Enter unit identifier (e.g. "UNIT 6", "Unit 7", "Elective Unit").
            </p>

            <div>
              <input
                type="text"
                value={newUnitNameInput}
                onChange={(e) => setNewUnitNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomUnit();
                  }
                }}
                placeholder="e.g. UNIT 6"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 font-medium text-xs"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddUnitModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomUnit}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
              >
                Add Unit Tab
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
