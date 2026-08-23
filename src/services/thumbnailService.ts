import JSZip from 'jszip';

export type ThumbnailTheme = 
  | 'obsidian_gold'
  | 'cyber_indigo'
  | 'emerald_matrix'
  | 'crimson_flame'
  | 'royal_amethyst';

export interface ThumbnailConfig {
  subject: string;
  unitNumber: string;
  title: string;
  subtopics: string[];
  teacherName: string;
  teacherRole?: string;
  targetTag?: string; // e.g. "B.Tech Semester | GATE 2026 | Placements"
  batchName?: string; // e.g. "Apna Engineering Wallah"
  theme: ThumbnailTheme;
  facultyPhotoUrl?: string;
  photoPosition?: 'right' | 'left';
  showBrandingBadge?: boolean;
}

export interface ThemeColors {
  bgStart: string;
  bgMid: string;
  bgEnd: string;
  accentPrimary: string;
  accentSecondary: string;
  accentGlow: string;
  badgeBg: string;
  badgeText: string;
  unitPillBg: string;
  unitPillText: string;
  titlePrimary: string;
  titleSecondary: string;
  subtopicBg: string;
  subtopicText: string;
  subtopicBorder: string;
  gridColor: string;
}

export const THUMBNAIL_THEMES: Record<ThumbnailTheme, { name: string; description: string; colors: ThemeColors }> = {
  obsidian_gold: {
    name: 'Obsidian & Gold (AEW Flagship)',
    description: 'Deep obsidian backdrop with brilliant golden amber typography & glowing neon accents.',
    colors: {
      bgStart: '#090a0f',
      bgMid: '#12131c',
      bgEnd: '#1e1b18',
      accentPrimary: '#f59e0b',
      accentSecondary: '#fbbf24',
      accentGlow: 'rgba(245, 158, 11, 0.35)',
      badgeBg: '#f59e0b',
      badgeText: '#090a0f',
      unitPillBg: 'rgba(245, 158, 11, 0.18)',
      unitPillText: '#fde68a',
      titlePrimary: '#ffffff',
      titleSecondary: '#fbbf24',
      subtopicBg: 'rgba(255, 255, 255, 0.07)',
      subtopicText: '#fef08a',
      subtopicBorder: 'rgba(245, 158, 11, 0.35)',
      gridColor: 'rgba(245, 158, 11, 0.05)',
    },
  },
  cyber_indigo: {
    name: 'Cyber Indigo & Neon Cyan',
    description: 'High-tech navy & electric cyan styling designed for computer science and tech lectures.',
    colors: {
      bgStart: '#050b14',
      bgMid: '#0a1628',
      bgEnd: '#0f172a',
      accentPrimary: '#06b6d4',
      accentSecondary: '#3b82f6',
      accentGlow: 'rgba(6, 182, 212, 0.35)',
      badgeBg: '#06b6d4',
      badgeText: '#050b14',
      unitPillBg: 'rgba(6, 182, 212, 0.18)',
      unitPillText: '#a5f3fc',
      titlePrimary: '#ffffff',
      titleSecondary: '#38bdf8',
      subtopicBg: 'rgba(255, 255, 255, 0.07)',
      subtopicText: '#bae6fd',
      subtopicBorder: 'rgba(6, 182, 212, 0.35)',
      gridColor: 'rgba(6, 182, 212, 0.05)',
    },
  },
  emerald_matrix: {
    name: 'Emerald Matrix & Lime',
    description: 'Deep mathematical green with vibrant lime highlights and modern clean aesthetics.',
    colors: {
      bgStart: '#021810',
      bgMid: '#06281c',
      bgEnd: '#0a1f18',
      accentPrimary: '#10b981',
      accentSecondary: '#84cc16',
      accentGlow: 'rgba(16, 185, 129, 0.35)',
      badgeBg: '#10b981',
      badgeText: '#021810',
      unitPillBg: 'rgba(16, 185, 129, 0.18)',
      unitPillText: '#a7f3d0',
      titlePrimary: '#ffffff',
      titleSecondary: '#a3e635',
      subtopicBg: 'rgba(255, 255, 255, 0.07)',
      subtopicText: '#d9f99d',
      subtopicBorder: 'rgba(16, 185, 129, 0.35)',
      gridColor: 'rgba(16, 185, 129, 0.05)',
    },
  },
  crimson_flame: {
    name: 'Crimson Power & Sunset Gold',
    description: 'Fiery high-energy red & orange gradient that grabs attention on YouTube feeds.',
    colors: {
      bgStart: '#180407',
      bgMid: '#2d080e',
      bgEnd: '#1e0508',
      accentPrimary: '#ef4444',
      accentSecondary: '#f97316',
      accentGlow: 'rgba(239, 68, 68, 0.4)',
      badgeBg: '#ef4444',
      badgeText: '#ffffff',
      unitPillBg: 'rgba(239, 68, 68, 0.2)',
      unitPillText: '#fecaca',
      titlePrimary: '#ffffff',
      titleSecondary: '#fdba74',
      subtopicBg: 'rgba(255, 255, 255, 0.07)',
      subtopicText: '#fed7aa',
      subtopicBorder: 'rgba(249, 115, 22, 0.4)',
      gridColor: 'rgba(239, 68, 68, 0.06)',
    },
  },
  royal_amethyst: {
    name: 'Royal Amethyst & Neon Violet',
    description: 'Luxurious violet & magenta aesthetic with cosmic glow accents.',
    colors: {
      bgStart: '#0e0618',
      bgMid: '#1b0d2e',
      bgEnd: '#150a24',
      accentPrimary: '#a855f7',
      accentSecondary: '#ec4899',
      accentGlow: 'rgba(168, 85, 247, 0.35)',
      badgeBg: '#a855f7',
      badgeText: '#ffffff',
      unitPillBg: 'rgba(168, 85, 247, 0.2)',
      unitPillText: '#e9d5ff',
      titlePrimary: '#ffffff',
      titleSecondary: '#f472b6',
      subtopicBg: 'rgba(255, 255, 255, 0.07)',
      subtopicText: '#fbcfe8',
      subtopicBorder: 'rgba(168, 85, 247, 0.35)',
      gridColor: 'rgba(168, 85, 247, 0.05)',
    },
  },
};

export const ThumbnailService = {
  /**
   * Loads an image from a URL or Base64 data string
   */
  loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = src;
    });
  },

  /**
   * Word wrap helper for canvas text rendering
   */
  wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines;
  },

  /**
   * Draws a rounded rectangle path
   */
  drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  },

  /**
   * Renders high-resolution 1920x1080 (16:9) broadcast thumbnail to a canvas element
   */
  async renderThumbnail(canvas: HTMLCanvasElement, config: ThumbnailConfig): Promise<void> {
    const width = 1920;
    const height = 1080;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    const theme = THUMBNAIL_THEMES[config.theme] || THUMBNAIL_THEMES.obsidian_gold;
    const c = theme.colors;

    // 1. BASE BACKGROUND GRADIENT
    const bgGradient = ctx.createRadialGradient(
      width * 0.75, height * 0.35, 100,
      width * 0.5, height * 0.5, width * 0.9
    );
    bgGradient.addColorStop(0, c.bgEnd);
    bgGradient.addColorStop(0.5, c.bgMid);
    bgGradient.addColorStop(1, c.bgStart);

    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // 2. AMBIENT GLOW ORBS
    // Top right glow
    const orb1 = ctx.createRadialGradient(width * 0.85, height * 0.25, 20, width * 0.85, height * 0.25, 450);
    orb1.addColorStop(0, c.accentGlow);
    orb1.addColorStop(1, 'transparent');
    ctx.fillStyle = orb1;
    ctx.fillRect(0, 0, width, height);

    // Bottom left subtle glow
    const orb2 = ctx.createRadialGradient(width * 0.15, height * 0.85, 30, width * 0.15, height * 0.85, 550);
    orb2.addColorStop(0, c.accentGlow);
    orb2.addColorStop(1, 'transparent');
    ctx.fillStyle = orb2;
    ctx.fillRect(0, 0, width, height);

    // 3. BACKGROUND GEOMETRIC GRID & ACCENT LINES
    ctx.save();
    ctx.strokeStyle = c.gridColor;
    ctx.lineWidth = 1.5;
    const gridSize = 64;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();

    // 4. TOP BRANDING BAR & BADGES
    const paddingX = 90;
    const startY = 85;

    // Top Left: Channel / Platform Name
    ctx.save();
    const batchName = config.batchName || 'APNA ENGINEERING WALLAH';
    ctx.font = '900 24px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.letterSpacing = '3px';
    ctx.fillText('🎓 ' + batchName.toUpperCase(), paddingX, startY);

    // Verified badge
    const badgeTextWidth = ctx.measureText('🎓 ' + batchName.toUpperCase()).width;
    ctx.fillStyle = c.accentPrimary;
    ctx.font = 'bold 18px "Inter", sans-serif';
    ctx.fillText('✓ VERIFIED BROADCAST', paddingX + badgeTextWidth + 24, startY - 2);
    ctx.restore();

    // Top Right: Target Exam / Batch Tag
    if (config.targetTag) {
      ctx.save();
      const tagText = config.targetTag.toUpperCase();
      ctx.font = 'bold 20px "Inter", sans-serif';
      const tagWidth = ctx.measureText(tagText).width + 36;
      const tagX = width - paddingX - tagWidth;
      const tagY = startY - 28;

      this.drawRoundedRect(ctx, tagX, tagY, tagWidth, 42, 12);
      ctx.fillStyle = c.unitPillBg;
      ctx.fill();
      ctx.strokeStyle = c.accentPrimary;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = c.unitPillText;
      ctx.fillText(tagText, tagX + 18, tagY + 28);
      ctx.restore();
    }

    // 5. UNIT RIBBON & SUBJECT PILL
    const contentY = 180;

    // Unit Pill Badge
    ctx.save();
    const unitText = (config.unitNumber || 'UNIT 1').toUpperCase();
    ctx.font = '900 28px "Inter", "Segoe UI", sans-serif';
    const unitWidth = ctx.measureText(unitText).width + 44;

    this.drawRoundedRect(ctx, paddingX, contentY, unitWidth, 54, 16);
    ctx.fillStyle = c.badgeBg;
    ctx.fill();

    // Drop shadow glow under badge
    ctx.shadowColor = c.accentPrimary;
    ctx.shadowBlur = 20;
    ctx.fillStyle = c.badgeText;
    ctx.fillText(unitText, paddingX + 22, contentY + 38);
    ctx.restore();

    // Subject Pill Badge
    ctx.save();
    const subjectText = (config.subject || 'ENGINEERING').toUpperCase();
    ctx.font = '800 24px "Inter", sans-serif';
    const subjWidth = ctx.measureText(subjectText).width + 36;
    const subjX = paddingX + unitWidth + 18;

    this.drawRoundedRect(ctx, subjX, contentY, subjWidth, 54, 16);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(subjectText, subjX + 18, contentY + 36);
    ctx.restore();

    // 6. MAIN LECTURE / TOPIC TITLE
    const titleY = contentY + 115;
    const isPhotoOnRight = config.photoPosition !== 'left';
    const titleMaxWidth = isPhotoOnRight ? 1120 : 1120;
    const titleX = isPhotoOnRight ? paddingX : (width - paddingX - titleMaxWidth);

    ctx.save();
    ctx.font = '900 68px "Inter", "Segoe UI", sans-serif';
    const titleLines = this.wrapText(ctx, config.title || 'Complete Session', titleMaxWidth);

    let currentTitleY = titleY;
    titleLines.slice(0, 3).forEach((line, idx) => {
      // Glow effect on main title
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;

      if (idx === 0) {
        ctx.fillStyle = c.titlePrimary;
      } else {
        // Multi-color punch for subsequent title lines
        ctx.fillStyle = c.titleSecondary;
      }
      ctx.fillText(line, titleX, currentTitleY);
      currentTitleY += 82;
    });
    ctx.restore();

    // 7. SUBTOPICS & KEY HIGHLIGHTS LIST
    const subtopics = config.subtopics && config.subtopics.length > 0 
      ? config.subtopics.slice(0, 4) 
      : ['Comprehensive Theory', 'Step-by-Step Numericals', 'PYQ Solving'];

    let subtopicStartY = currentTitleY + 25;
    const subtopicMaxWidth = 1080;

    ctx.save();
    ctx.font = 'bold 24px "Inter", sans-serif';

    // Container card for subtopics
    const totalSubtopicHeight = Math.min(subtopics.length, 4) * 56 + 30;
    this.drawRoundedRect(ctx, titleX, subtopicStartY, subtopicMaxWidth, totalSubtopicHeight, 20);
    ctx.fillStyle = 'rgba(10, 15, 28, 0.65)';
    ctx.fill();
    ctx.strokeStyle = c.subtopicBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Subtopics List items
    subtopics.slice(0, 4).forEach((st, idx) => {
      const itemY = subtopicStartY + 38 + (idx * 54);

      // Number badge pill
      ctx.fillStyle = c.accentPrimary;
      this.drawRoundedRect(ctx, titleX + 24, itemY - 24, 34, 34, 8);
      ctx.fill();

      ctx.fillStyle = c.badgeText;
      ctx.font = '900 18px "Inter", sans-serif';
      ctx.fillText(`0${idx + 1}`, titleX + 30, itemY - 1);

      // Subtopic text
      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 24px "Inter", sans-serif';
      
      // Trim subtopic if too long
      let displaySt = st.startsWith('#') ? st.substring(1) : st;
      if (ctx.measureText(displaySt).width > subtopicMaxWidth - 100) {
        displaySt = displaySt.substring(0, 52) + '...';
      }
      ctx.fillText(displaySt, titleX + 74, itemY);
    });
    ctx.restore();

    // 8. FACULTY / INSTRUCTOR CARD & PHOTO (RIGHT OR LEFT)
    const photoBoxWidth = 520;
    const photoBoxHeight = 620;
    const photoBoxX = isPhotoOnRight ? (width - paddingX - photoBoxWidth) : paddingX;
    const photoBoxY = 240;

    // Faculty Card Glow Backdrop
    ctx.save();
    const photoGlow = ctx.createRadialGradient(
      photoBoxX + photoBoxWidth / 2, photoBoxY + photoBoxHeight / 2, 80,
      photoBoxX + photoBoxWidth / 2, photoBoxY + photoBoxHeight / 2, 340
    );
    photoGlow.addColorStop(0, c.accentGlow);
    photoGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = photoGlow;
    ctx.fillRect(photoBoxX - 60, photoBoxY - 60, photoBoxWidth + 120, photoBoxHeight + 120);
    ctx.restore();

    // Render Custom Uploaded Photo or Premium Geometric Frame
    if (config.facultyPhotoUrl) {
      try {
        const photoImg = await this.loadImage(config.facultyPhotoUrl);
        ctx.save();

        // Rounded portrait clipping mask
        this.drawRoundedRect(ctx, photoBoxX, photoBoxY, photoBoxWidth, photoBoxHeight - 110, 28);
        ctx.clip();

        // Draw image covering the box keeping aspect ratio
        const imgAspect = photoImg.width / photoImg.height;
        const boxAspect = photoBoxWidth / (photoBoxHeight - 110);
        let renderW = photoBoxWidth;
        let renderH = photoBoxHeight - 110;
        let renderX = photoBoxX;
        let renderY = photoBoxY;

        if (imgAspect > boxAspect) {
          renderW = renderH * imgAspect;
          renderX = photoBoxX - (renderW - photoBoxWidth) / 2;
        } else {
          renderH = renderW / imgAspect;
          renderY = photoBoxY - (renderH - (photoBoxHeight - 110)) / 2;
        }

        ctx.drawImage(photoImg, renderX, renderY, renderW, renderH);
        ctx.restore();

        // Photo border ring
        ctx.save();
        this.drawRoundedRect(ctx, photoBoxX, photoBoxY, photoBoxWidth, photoBoxHeight - 110, 28);
        ctx.strokeStyle = c.accentPrimary;
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();
      } catch (err) {
        console.warn('Failed to load faculty photo, using graphic avatar', err);
        this.renderFallbackFacultyAvatar(ctx, photoBoxX, photoBoxY, photoBoxWidth, photoBoxHeight - 110, config, c);
      }
    } else {
      this.renderFallbackFacultyAvatar(ctx, photoBoxX, photoBoxY, photoBoxWidth, photoBoxHeight - 110, config, c);
    }

    // Faculty Name & Title Card at Bottom of Photo
    const facultyCardY = photoBoxY + photoBoxHeight - 95;
    ctx.save();
    this.drawRoundedRect(ctx, photoBoxX - 15, facultyCardY, photoBoxWidth + 30, 95, 20);
    ctx.fillStyle = 'rgba(9, 11, 20, 0.95)';
    ctx.fill();
    ctx.strokeStyle = c.accentPrimary;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Faculty Name
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 28px "Inter", sans-serif';
    const teacherName = config.teacherName || 'Master Faculty';
    ctx.fillText(teacherName, photoBoxX + 12, facultyCardY + 42);

    // Faculty Role / Subject Tag
    ctx.fillStyle = c.accentSecondary;
    ctx.font = '700 18px "Inter", sans-serif';
    const teacherRole = config.teacherRole || 'HOD & Expert Educator';
    ctx.fillText(teacherRole, photoBoxX + 12, facultyCardY + 74);
    ctx.restore();

    // 9. BOTTOM STREAM / RESOLUTION BAR
    const bottomBarY = height - 55;
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = '600 16px "Inter", sans-serif';
    ctx.fillText('BROADCAST 16:9 • ULTRA HD 1080P • APNA ENGINEERING WALLAH', paddingX, bottomBarY);

    const liveBadgeX = width - paddingX - 160;
    this.drawRoundedRect(ctx, liveBadgeX, bottomBarY - 26, 160, 36, 10);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#f87171';
    ctx.font = '900 15px "Inter", sans-serif';
    ctx.fillText('🔴 ONE-SHOT', liveBadgeX + 24, bottomBarY - 2);
    ctx.restore();
  },

  /**
   * Helper to draw a modern stylized faculty avatar when no image is uploaded
   */
  renderFallbackFacultyAvatar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    config: ThumbnailConfig,
    c: ThemeColors
  ) {
    ctx.save();
    this.drawRoundedRect(ctx, x, y, w, h, 28);
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, 'rgba(30, 41, 59, 0.8)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0.95)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = c.accentPrimary;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Big Faculty Icon
    ctx.font = '96px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('👨‍🏫', x + w / 2, y + h / 2 - 20);

    // Initial Badge
    ctx.font = 'bold 26px "Inter", sans-serif';
    ctx.fillStyle = c.accentSecondary;
    ctx.fillText(config.teacherName || 'Faculty Member', x + w / 2, y + h / 2 + 65);

    ctx.font = '600 18px "Inter", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(config.subject || 'Department Lead', x + w / 2, y + h / 2 + 100);
    ctx.restore();
  },

  /**
   * Exports the rendered canvas as a downloadable PNG Blob
   */
  async exportThumbnailBlob(config: ThumbnailConfig): Promise<Blob> {
    const canvas = document.createElement('canvas');
    await this.renderThumbnail(canvas, config);
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to generate thumbnail Blob'));
      }, 'image/png', 0.95);
    });
  },

  /**
   * Triggers a direct browser download of a single thumbnail
   */
  async downloadThumbnail(config: ThumbnailConfig, filename?: string): Promise<void> {
    const blob = await this.exportThumbnailBlob(config);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanName = filename || `${config.unitNumber || 'UNIT'}_${config.title.replace(/[^a-zA-Z0-9]/g, '_')}_Thumbnail.png`;
    a.download = cleanName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  },

  /**
   * Bulk packages all unit thumbnails into a high-res .ZIP archive
   */
  async downloadUnitThumbnailsZip(
    items: { filename: string; config: ThumbnailConfig }[],
    zipName: string = 'Unit_Thumbnails.zip',
    onProgress?: (current: number, total: number) => void
  ): Promise<void> {
    const zip = new JSZip();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (onProgress) onProgress(i + 1, items.length);
      const blob = await this.exportThumbnailBlob(item.config);
      zip.file(item.filename, blob);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = zipName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },

  /**
   * Intelligently auto-detects and extracts high-impact thumbnail subtopics
   * from video metadata, syllabus connections, or lecture titles.
   */
  autoDetectSubtopics(params: {
    title?: string;
    primaryTopic?: string;
    videoUrl?: string;
    notesUrl?: string;
    existingSubtopics?: string[];
    assignedTopicId?: string;
    allTopics?: Array<{
      id: string;
      topicTitle: string;
      subtopics?: string[];
      proposedSubtopics?: string[];
      unitNumber?: string;
    }>;
  }): string[] {
    const { 
      title = '', 
      primaryTopic = '', 
      videoUrl = '', 
      existingSubtopics = [], 
      assignedTopicId, 
      allTopics = [] 
    } = params;

    const clean = (str: string): string => {
      return str
        .replace(/^[0-9]+[.\-)\s]+/, '')
        .replace(/^#+/, '')
        .replace(/\b(Lecture|Lec|Part|Session|Chapter|Unit|Module)\s*#?[0-9]+/gi, '')
        .replace(/\b(Full\s*Course|One\s*Shot|Complete\s*Tutorial|Masterclass|GATE\s*[0-9]{4}|B\.Tech)\b/gi, '')
        .trim();
    };

    // 1. Direct syllabus topic connection (Approved or proposed curriculum subtopics)
    if (assignedTopicId && allTopics.length > 0) {
      const matched = allTopics.find((t) => t.id === assignedTopicId);
      if (matched) {
        const source = (matched.subtopics && matched.subtopics.length > 0)
          ? matched.subtopics
          : (matched.proposedSubtopics || []);
        if (source.length > 0) {
          return source.slice(0, 4).map(clean).filter((s) => s.length > 0);
        }
      }
    }

    // 2. Syllabus fuzzy match by title/topic
    if (allTopics.length > 0 && (primaryTopic || title)) {
      const target = (primaryTopic || title).toLowerCase().trim();
      const matched = allTopics.find(
        (t) => t.topicTitle.toLowerCase().trim() === target ||
               target.includes(t.topicTitle.toLowerCase().trim()) ||
               t.topicTitle.toLowerCase().trim().includes(target)
      );
      if (matched) {
        const source = (matched.subtopics && matched.subtopics.length > 0)
          ? matched.subtopics
          : (matched.proposedSubtopics || []);
        if (source.length > 0) {
          return source.slice(0, 4).map(clean).filter((s) => s.length > 0);
        }
      }
    }

    // 3. Existing subtopics validation
    if (existingSubtopics && existingSubtopics.length > 1) {
      const cleanedList = existingSubtopics.map(clean).filter((s) => s.length > 1);
      if (cleanedList.length >= 2) {
        return cleanedList.slice(0, 4);
      }
    }

    // 4. Engineering Domain Semantic Knowledge Base
    const textToMatch = `${title} ${primaryTopic} ${videoUrl}`.toLowerCase();

    // Data Structures & Algorithms
    if (textToMatch.includes('complexity') || textToMatch.includes('big o') || textToMatch.includes('asymptotic') || textToMatch.includes('recurrence')) {
      return ['Big-O, Omega & Theta Notations', 'Master Theorem & Recurrence Relations', 'Best, Average & Worst Case Analysis', 'Space Complexity & Recursion Tree'];
    }
    if (textToMatch.includes('binary search tree') || textToMatch.includes('bst') || textToMatch.includes('avl') || textToMatch.includes('tree traversal')) {
      return ['Inorder, Preorder & Postorder Traversals', 'BST Insertion, Deletion & Search', 'AVL Tree Rotations & Balance Factor', 'Lowest Common Ancestor (LCA)'];
    }
    if (textToMatch.includes('graph') || textToMatch.includes('dijkstra') || textToMatch.includes('bfs') || textToMatch.includes('dfs') || textToMatch.includes('mst')) {
      return ['BFS & DFS Traversal Algorithms', 'Dijkstra Shortest Path Algorithm', 'Prim & Kruskal MST Algorithms', 'Cycle Detection & Topological Sorting'];
    }
    if (textToMatch.includes('dynamic programming') || textToMatch.includes('dp ') || textToMatch.includes('knapsack') || textToMatch.includes('lcs')) {
      return ['Memoization vs Tabulation Approach', '0/1 Knapsack & Fractional Variations', 'Longest Common Subsequence (LCS)', 'State Transitions & Optimal Substructure'];
    }
    if (textToMatch.includes('sorting') || textToMatch.includes('quicksort') || textToMatch.includes('mergesort') || textToMatch.includes('heapsort')) {
      return ['Merge Sort & Divide-and-Conquer', 'Quick Sort & Partitioning Logic', 'Heap Sort & Priority Queues', 'Time & Space Complexity Proofs'];
    }
    if (textToMatch.includes('linked list') || textToMatch.includes('singly') || textToMatch.includes('doubly')) {
      return ['Singly, Doubly & Circular Linked Lists', 'Reversal & Cycle Detection (Floyd)', 'Insertion & Deletion at K-th Position', 'Pointer Manipulation & Memory Layout'];
    }
    if (textToMatch.includes('stack') || textToMatch.includes('queue') || textToMatch.includes('infix')) {
      return ['Stack & Queue Implementations', 'Infix to Postfix & Prefix Evaluation', 'Monotonic Stack Applications', 'Circular Queue & Deque Operations'];
    }

    // Operating Systems
    if (textToMatch.includes('cpu scheduling') || textToMatch.includes('scheduling algorithm') || textToMatch.includes('fcfs') || textToMatch.includes('round robin')) {
      return ['FCFS, SJF & SRTF Algorithms', 'Round Robin & Priority Scheduling', 'Gantt Chart & Turnaround Time', 'Convoy Effect & Starvation Resolution'];
    }
    if (textToMatch.includes('deadlock') || textToMatch.includes('banker') || textToMatch.includes('synchronization') || textToMatch.includes('semaphore')) {
      return ['4 Necessary Deadlock Conditions', 'Banker Algorithm & Safety State', 'Mutex & Counting Semaphores', 'Producer-Consumer & Dining Philosophers'];
    }
    if (textToMatch.includes('paging') || textToMatch.includes('virtual memory') || textToMatch.includes('page replacement') || textToMatch.includes('tlb')) {
      return ['Paging & Translation Lookaside Buffer (TLB)', 'FIFO, LRU & Optimal Page Replacement', 'Segmentation & Virtual Memory Architecture', 'Thrashing & Belady Anomaly'];
    }

    // DBMS
    if (textToMatch.includes('normalization') || textToMatch.includes('normal form') || textToMatch.includes('bcnf') || textToMatch.includes('functional dependency')) {
      return ['1NF, 2NF & 3NF Decompositions', 'Boyce-Codd Normal Form (BCNF)', 'Functional Dependencies & Attribute Closure', 'Lossless Join & Dependency Preservation'];
    }
    if (textToMatch.includes('sql') || textToMatch.includes('query') || textToMatch.includes('relational algebra') || textToMatch.includes('joins')) {
      return ['Inner, Left, Right & Full Outer Joins', 'Nested Subqueries & Aggregations (GROUP BY)', 'Relational Algebra Operations', 'Views, Triggers & Integrity Constraints'];
    }
    if (textToMatch.includes('transaction') || textToMatch.includes('acid') || textToMatch.includes('concurrency') || textToMatch.includes('2pl')) {
      return ['ACID Properties & Serializability', 'Conflict vs View Serializability', 'Two-Phase Locking Protocol (2PL)', 'Timestamp Ordering & Recovery Logs'];
    }

    // Computer Networks
    if (textToMatch.includes('osi') || textToMatch.includes('tcp/ip') || textToMatch.includes('protocol') || textToMatch.includes('layer')) {
      return ['7 Layers of OSI vs TCP/IP Model', 'Encapsulation & Packet Headers Flow', 'TCP vs UDP Protocols Deep Dive', 'Flow Control & Error Detection (CRC)'];
    }
    if (textToMatch.includes('subnet') || textToMatch.includes('ip address') || textToMatch.includes('routing') || textToMatch.includes('cidr')) {
      return ['IPv4 & IPv6 Subnetting (CIDR)', 'Routing Algorithms (OSPF, BGP, RIP)', 'NAT, DHCP & ARP Protocols', 'Network Mask & Broadcast Calculations'];
    }

    // Theory of Computation
    if (textToMatch.includes('dfa') || textToMatch.includes('nfa') || textToMatch.includes('finite automata') || textToMatch.includes('turing')) {
      return ['DFA & NFA State Transition Diagrams', 'Regular Expressions & Pumping Lemma', 'Context-Free Grammars & PDA', 'Turing Machines & Decidability'];
    }

    // 5. Intelligent Multi-Clause Splitter
    const clauses = (title || primaryTopic)
      .replace(/\b(Lecture|Lec|Part|Session|Chapter|Unit|Module|Class)\s*#?[0-9]+/gi, '')
      .replace(/\b(Full\s*Course|One\s*Shot|Complete\s*Tutorial|Masterclass|GATE\s*[0-9]{4}|B\.Tech|In\s*Depth)\b/gi, '')
      .split(/[,|/&+;•]|(\band\b)|(\bwith\b)|(\bvs\b)|(\bto\b)/i)
      .map((s) => (s ? clean(s) : ''))
      .filter((s) => s.length > 2 && !['and', 'with', 'vs', 'to', 'for', 'the'].includes(s.toLowerCase()));

    if (clauses.length >= 2) {
      return clauses.slice(0, 4);
    }

    // 6. Generic High-Yield Academic Formulation
    const subjectLead = clean(primaryTopic || title || 'Topic Masterclass');
    return [
      `${subjectLead} • Fundamental Concepts`,
      'Mathematical Formulation & Theorems',
      'Step-by-Step Solved Problem Sets',
      'GATE & University Exam PYQ Strategy',
    ];
  },
};
