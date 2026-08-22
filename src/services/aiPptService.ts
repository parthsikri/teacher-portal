import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';
import { jsPDF } from 'jspdf';

export interface PyqItem {
  yearExam?: string;
  unitNumber?: string;
  mappedTopic?: string;
  questionText: string;
  marks?: string;
  solution?: string;
}

export interface AiSlide {
  slideNumber: number;
  type: 'title' | 'first_principles' | 'concept_card' | 'two_column' | 'step_by_step' | 'pyq_solution' | 'common_mistakes' | 'summary' | string;
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
    stepByStepSolution: string[];
    keyTakeaway?: string;
  };
  calloutTip?: string;
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
   * Parses Excel / CSV file containing PYQs into structured list
   */
  async parsePyqsFromExcel(file: File): Promise<PyqItem[]> {
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

          const parsedList: PyqItem[] = [];

          jsonData.forEach((row) => {
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

            const questionText = findVal(['question', 'fullquestion', 'problem', 'q_text', 'ques', 'problemstatement']);
            const yearExam = findVal(['year', 'exam', 'yearexam', 'session', 'term', 'gate']);
            const unitNumber = findVal(['unit', 'module', 'unitnumber', 'mod']);
            const mappedTopic = findVal(['topic', 'mappedtopic', 'concept', 'subtopic', 'chapter']);
            const marks = findVal(['marks', 'weightage', 'score', 'pts']);
            const solution = findVal(['solution', 'ans', 'answer', 'key', 'explanation']);

            if (questionText && questionText.length > 3) {
              parsedList.push({
                questionText,
                yearExam: yearExam || undefined,
                unitNumber: unitNumber || undefined,
                mappedTopic: mappedTopic || undefined,
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
   * Calls the DeepSeek presentation generator API
   */
  async generateDeck(params: {
    subject: string;
    unit: string;
    topicTitle: string;
    pyqList?: PyqItem[];
    customInstructions?: string;
    targetAudience?: string;
    slideCount?: number;
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

      // Top Bar: Badge & Subject Context
      if (slide.badge || deck.subject) {
        pptSlide.addText(
          `${(slide.badge || 'CONCEPT').toUpperCase()}  •  ${deck.subject} (${deck.unit})`,
          {
            x: 0.8,
            y: 0.4,
            w: 8.4,
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

      // ── TYPE: FIRST PRINCIPLES / ANALOGY ──────────────────────────────
      if (slide.type === 'first_principles' && slide.analogy) {
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

      // ── TYPE: TWO COLUMN COMPARISON ──────────────────────────────────
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

      // ── TYPE: PYQ SOLUTION ──────────────────────────────────────────
      else if (slide.type === 'pyq_solution' && slide.pyqDetails) {
        // Question Box
        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: contentStartY,
          w: 8.4,
          h: 1.1,
          fill: { color: themeColors.cardBg },
          line: { color: themeColors.accentSecondary, width: 1.5 },
          rectRadius: 0.1,
        });

        pptSlide.addText(
          `📝 ${slide.pyqDetails.examYear || 'Exam PYQ'}${slide.pyqDetails.marks ? ` [${slide.pyqDetails.marks}]` : ''}:\n${slide.pyqDetails.question}`,
          {
            x: 1.0,
            y: contentStartY + 0.1,
            w: 8.0,
            h: 0.9,
            fontSize: 11,
            bold: true,
            color: themeColors.textPrimary,
            fontFace: 'Arial',
          }
        );

        // Step-by-Step Solution
        if (slide.pyqDetails.stepByStepSolution) {
          const solutionText = slide.pyqDetails.stepByStepSolution
            .map((s, idx) => `Step ${idx + 1}: ${s.replace(/\*\*/g, '')}`)
            .join('\n\n');

          pptSlide.addText(solutionText, {
            x: 0.8,
            y: contentStartY + 1.25,
            w: 8.4,
            h: 2.0,
            fontSize: 11,
            color: themeColors.textSecondary,
            fontFace: 'Arial',
            lineSpacing: 16,
          });
        }
      }

      // ── DEFAULT / CONCEPT / STEP-BY-STEP ─────────────────────────────
      else {
        // Main content card
        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: contentStartY,
          w: 8.4,
          h: slide.formulaOrCode ? 2.0 : 3.2,
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
            h: slide.formulaOrCode ? 1.7 : 2.9,
            fontSize: 12,
            color: themeColors.textPrimary,
            fontFace: 'Arial',
            lineSpacing: 18,
          });
        }

        // Formula / Code box if present
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

      // Header Badge
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

      // Analogy
      if (slide.analogy) {
        doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('💡 Real-World Analogy (Intuition):', 26, currentY);
        currentY += 6;

        doc.setTextColor(textPrimaryRGB[0], textPrimaryRGB[1], textPrimaryRGB[2]);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const splitAnalogy = doc.splitTextToSize(slide.analogy, 245);
        doc.text(splitAnalogy, 26, currentY);
        currentY += splitAnalogy.length * 6 + 6;
      }

      // PYQ Question
      if (slide.pyqDetails) {
        doc.setTextColor(16, 185, 129); // Emerald
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`📝 ${slide.pyqDetails.examYear || 'Exam PYQ'}:`, 26, currentY);
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

      // Bullets
      if (slide.bullets && !slide.pyqDetails) {
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

      // Formula or Code
      if (slide.formulaOrCode) {
        currentY += 4;
        doc.setFillColor(bgRGB[0], bgRGB[1], bgRGB[2]);
        doc.roundedRect(26, currentY, 245, 18, 2, 2, 'F');

        doc.setTextColor(16, 185, 129);
        doc.setFont('courier', 'bold');
        doc.setFontSize(10);
        doc.text(slide.formulaOrCode, 30, currentY + 11);
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
};
