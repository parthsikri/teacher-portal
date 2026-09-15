import jsPDF from 'jspdf';
import type { OfferLetter, OfferLetterRoleType } from '../types';

export interface SubjectOption {
  id: string;
  name: string;
  department: string;
}

export const AVAILABLE_SME_SUBJECTS: SubjectOption[] = [
  { id: 'math', name: 'Engineering Mathematics', department: 'Applied Sciences & Mathematics' },
  { id: 'dsa', name: 'Data Structures & Algorithms', department: 'Computer Science & Engineering' },
  { id: 'os', name: 'Operating Systems', department: 'Computer Science & Engineering' },
  { id: 'dbms', name: 'Database Management Systems', department: 'Computer Science & Engineering' },
  { id: 'cn', name: 'Computer Networks', department: 'Computer Science & Engineering' },
  { id: 'aiml', name: 'Artificial Intelligence & Machine Learning', department: 'Computer Science & Data Science' },
  { id: 'toc', name: 'Theory of Computation & Automata', department: 'Computer Science & Engineering' },
  { id: 'compiler', name: 'Compiler Design', department: 'Computer Science & Engineering' },
  { id: 'se', name: 'Software Engineering & System Design', department: 'Computer Science & Engineering' },
  { id: 'fm', name: 'Fluid Mechanics', department: 'Mechanical & Civil Engineering' },
  { id: 'thermo', name: 'Thermodynamics & Heat Transfer', department: 'Mechanical Engineering' },
  { id: 'som', name: 'Strength of Materials & Solid Mechanics', department: 'Mechanical & Civil Engineering' },
  { id: 'signals', name: 'Signals & Systems', department: 'Electronics & Communication Engineering' },
  { id: 'digital_electronics', name: 'Digital Electronics & Microprocessors', department: 'Electronics & Electrical Engineering' },
  { id: 'electrical_machines', name: 'Electrical Machines & Power Systems', department: 'Electrical Engineering' },
  { id: 'engineering_physics', name: 'Engineering Physics & Electromagnetics', department: 'Applied Sciences & Physics' },
  { id: 'engineering_chemistry', name: 'Engineering Chemistry & Materials', department: 'Applied Sciences & Chemistry' },
];

export const STANDARD_PERKS = [
  'Official Certificate of Internship / Completion issued by Apna Engineering Wallah upon successful tenure.',
  'Formal Letter of Recommendation (LOR) & LinkedIn endorsement based on exemplary performance.',
  'Direct 1-on-1 mentorship sessions with senior engineering leaders and academic directors.',
  'Flexible working hours with a supportive, growth-oriented remote/hybrid culture.',
  'Complimentary access to AEW premium courses, lecture masterclasses, and PYQ formula repositories.',
  'Fast-track consideration for Pre-Placement Offers (PPO) or permanent contract extensions based on appraisal.',
];

export const STANDARD_TERMS = [
  'Confidentiality & Non-Disclosure: The appointee agrees to protect all proprietary course curricula, software code, student databases, financial agreements, and internal documents from unauthorized disclosure during and after employment.',
  'Intellectual Property: All software code, slide decks, video recordings, question solutions, designs, and materials created during this tenure shall be the exclusive intellectual property of Apna Engineering Wallah (AEW).',
  'Code of Conduct & Academic Integrity: The appointee is expected to uphold the highest standards of professional conduct, academic rigor, and punctuality in all assigned duties.',
  'Termination & Notice: Either party may terminate this appointment by providing a written notice of 7 (seven) days. In instances of breach of confidentiality or gross misconduct, AEW reserves the right to terminate engagement immediately without notice.',
  'Acceptance of Offer: This appointment offer is contingent upon your formal acceptance by signing and returning the duplicate copy on or before the acceptance deadline.',
];

export interface RolePresetData {
  roleType: OfferLetterRoleType;
  label: string;
  defaultTitle: string;
  department: string;
  duration: string;
  stipendAmount: string;
  incentiveDetails: string;
  workingHours: string;
  reportingManager: string;
  employmentType: 'Internship' | 'Full-time' | 'Part-time' | 'Contract';
  workMode: 'Remote (Work From Home)' | 'Hybrid' | 'In-Office (New Delhi)';
  responsibilities: string[];
}

export const ROLE_PRESETS: Record<OfferLetterRoleType, RolePresetData> = {
  sme: {
    roleType: 'sme',
    label: 'Subject Matter Expert (SME)',
    defaultTitle: 'Subject Matter Expert - Engineering Mathematics',
    department: 'Academic Operations & Curriculum Development',
    duration: '6 Months',
    stipendAmount: '₹25,000 / Month',
    incentiveDetails: 'Performance honorarium of up to ₹5,000 based on timely unit completions and student ratings.',
    workingHours: '20-25 Hours/Week (Flexible)',
    reportingManager: 'Director of Academic Operations & Curriculum Dean',
    employmentType: 'Contract',
    workMode: 'Remote (Work From Home)',
    responsibilities: [
      'Formulate and structure comprehensive curriculum outlines, subtopic milestones, and chapter-wise lesson roadmaps.',
      'Develop high-yield Previous Year Question (PYQ) slide decks with rigorous step-by-step analytical solutions.',
      'Deliver recorded and interactive masterclasses focusing on core conceptual clarity and university examination patterns.',
      'Author comprehensive academic revision formula sheets, cheat-sheets, and quick reference summaries.',
      'Review student doubt submissions and provide accurate, pedagogically sound clarifications within stipulated turnaround times.',
      'Collaborate with the academic audit team to maintain top-tier content quality benchmarks across all lecture deliverables.',
    ],
  },
  hr_intern: {
    roleType: 'hr_intern',
    label: 'HR Intern',
    defaultTitle: 'Human Resources (HR) Intern',
    department: 'People Operations & Human Resources',
    duration: '3 Months',
    stipendAmount: '₹10,000 / Month',
    incentiveDetails: 'Quarterly hiring milestone bonus of ₹2,500 upon achieving recruitment targets.',
    workingHours: '25-30 Hours/Week (Flexible)',
    reportingManager: 'Lead - People Operations & Human Resources',
    employmentType: 'Internship',
    workMode: 'Remote (Work From Home)',
    responsibilities: [
      'Spearhead talent sourcing across university campuses and technical portals for Subject Matter Experts and technical interns.',
      'Conduct initial candidate screening, profile evaluation, and coordinate interview rounds with department leads.',
      'Facilitate smooth onboarding procedures, credential provisioning, and documentation audits for all newly onboarded faculty.',
      'Track daily attendance logs, commitment check-ins, leave requests, and assist in monthly stipend reconciliation.',
      'Drive intern community engagement, organize weekly check-in standups, and assist in coordinating company town-hall events.',
      'Uphold organizational policies, maintain strict confidentiality of personnel records, and draft formal internal notices.',
    ],
  },
  pr_intern: {
    roleType: 'pr_intern',
    label: 'PR Intern',
    defaultTitle: 'Public Relations (PR) & Outreach Intern',
    department: 'Corporate Partnerships & Campus Outreach',
    duration: '3 Months',
    stipendAmount: '₹12,000 / Month',
    incentiveDetails: 'Performance-based incentive of up to 10% on closed fest sponsorship tie-ups and student partner MoUs.',
    workingHours: '20-25 Hours/Week (Flexible)',
    reportingManager: 'Head of Public Relations & Strategic Partnerships',
    employmentType: 'Internship',
    workMode: 'Remote (Work From Home)',
    responsibilities: [
      'Identify, research, and establish strategic partnerships with engineering colleges, student clubs, and annual technical fests.',
      'Draft, negotiate, and execute formal Memorandums of Understanding (MoUs) for campus collaborations and knowledge partnerships.',
      'Lead and nurture the AEW Campus Ambassador network across designated university and engineering college clusters.',
      'Craft compelling outreach emails, newsletter articles, and institutional pitch decks for college Deans, TPOs, and HODs.',
      'Ensure execution of all agreed sponsorship deliverables during college events and compile comprehensive post-event impact reports.',
      'Represent Apna Engineering Wallah professionally at student summits, academic webinars, and campus outreach initiatives.',
    ],
  },
  web_dev_intern: {
    roleType: 'web_dev_intern',
    label: 'Web Dev Intern',
    defaultTitle: 'Web Development Intern',
    department: 'Engineering & Digital Product Development',
    duration: '3 Months',
    stipendAmount: '₹15,000 / Month',
    incentiveDetails: 'Bounty rewards up to ₹5,000 for critical bug-squashing and high-impact feature deployments.',
    workingHours: '25-30 Hours/Week (Flexible)',
    reportingManager: 'Lead Software Architect & Engineering Manager',
    employmentType: 'Internship',
    workMode: 'Remote (Work From Home)',
    responsibilities: [
      'Develop, enhance, and optimize modern responsive web interfaces using React, TypeScript, and modern styling architectures.',
      'Integrate cloud backend services, RESTful APIs, and Google Drive endpoints with resilient error boundaries and fast load times.',
      'Collaborate with academic leads and UI/UX designers to translate complex workflow requirements into intuitive user experiences.',
      'Diagnose and resolve frontend performance bottlenecks, cross-browser rendering quirks, and state synchronization bugs.',
      'Follow clean code principles, participate in agile pull-request reviews, write documentation, and adhere to git workflows.',
      'Implement robust client-side validation, responsive desktop/mobile layouts, and accessibility standards.',
    ],
  },
  graphic_designer: {
    roleType: 'graphic_designer',
    label: 'Graphic Design & Media Intern',
    defaultTitle: 'Graphic Design & Multimedia Intern',
    department: 'Creative Design & Brand Media',
    duration: '3 Months',
    stipendAmount: '₹12,000 / Month',
    incentiveDetails: 'Milestone bonus up to ₹3,000 based on high click-through rates (CTR) on published YouTube thumbnails.',
    workingHours: '20-25 Hours/Week (Flexible)',
    reportingManager: 'Creative Director & Brand Media Lead',
    employmentType: 'Internship',
    workMode: 'Remote (Work From Home)',
    responsibilities: [
      'Design high-converting 16:9 YouTube video thumbnails, course feature banners, and promotional social media assets.',
      'Create clean, accurate educational diagrams, architectural charts, and infographic visual slides for engineering lecture modules.',
      'Edit short-form teaser reels, highlights, and promotional video clips tailored for YouTube Shorts, LinkedIn, and Instagram.',
      'Maintain strong visual brand consistency, color palette integrity, and typographic harmony across all digital touchpoints.',
      'Collaborate closely with Subject Matter Experts to transform complex technical concepts into clear, engaging visual schematics.',
    ],
  },
  sales_intern: {
    roleType: 'sales_intern',
    label: 'Sales & BD Intern',
    defaultTitle: 'Sales & Business Development Intern',
    department: 'Admissions, Growth & Student Counseling',
    duration: '3 Months',
    stipendAmount: '₹12,000 / Month',
    incentiveDetails: 'Lucrative uncapped commission structure of ₹500 to ₹1,500 per successful course enrollment.',
    workingHours: '30 Hours/Week (Flexible)',
    reportingManager: 'Head of Growth & Admissions Desk',
    employmentType: 'Internship',
    workMode: 'Remote (Work From Home)',
    responsibilities: [
      'Conduct inbound counseling calls with prospective engineering students, understanding their learning needs and guiding enrollment.',
      'Maintain diligent call logs, disposition statuses, and timely follow-up schedules inside the AEW Sales CRM Desk.',
      'Engage with university fest inquiries, webinar participants, and referral leads to maximize orientation attendance.',
      'Achieve weekly and monthly course registration targets while delivering transparent, empathetic student counseling.',
      'Gather student feedback on course pricing, curriculum requirements, and collaborate with academic teams to enhance offerings.',
    ],
  },
  custom: {
    roleType: 'custom',
    label: 'Custom Role',
    defaultTitle: 'Academic Operations & Project Intern',
    department: 'Operations & Academic Management',
    duration: '3 Months',
    stipendAmount: '₹12,000 / Month',
    incentiveDetails: 'Milestone-linked incentive based on quarterly project deliverables.',
    workingHours: '20-25 Hours/Week (Flexible)',
    reportingManager: 'Senior Operations Manager',
    employmentType: 'Internship',
    workMode: 'Remote (Work From Home)',
    responsibilities: [
      'Coordinate day-to-day operational deliverables and assist cross-functional teams in executing project sprints.',
      'Maintain structured logs, process records, and milestone tracking dashboards.',
      'Assist in preparing executive reports, status presentations, and operational metrics.',
      'Communicate proactively with internal stakeholders and ensure timely completion of assigned deliverables.',
    ],
  },
};

export class OfferLetterService {
  /**
   * Helper to format candidate full name or generate a reference ID
   */
  static generateReferenceNumber(prefix: string = 'AEW/OL'): string {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(100 + Math.random() * 900);
    return `${prefix}/${year}/${randomNum}`;
  }

  /**
   * Helper to compute a date N days from today in YYYY-MM-DD format
   */
  static getFutureDateString(daysFromNow: number = 7): string {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString().split('T')[0];
  }

  /**
   * Helper to get today's date in YYYY-MM-DD
   */
  static getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Create an initial blank / preloaded offer letter for a given role
   */
  static createDefaultOfferLetter(
    roleType: OfferLetterRoleType = 'sme',
    subjectName: string = 'Engineering Mathematics'
  ): OfferLetter {
    const preset = ROLE_PRESETS[roleType] || ROLE_PRESETS.sme;
    const isSme = roleType === 'sme';
    const finalTitle = isSme 
      ? `Subject Matter Expert - ${subjectName}`
      : preset.defaultTitle;

    return {
      id: `ol_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      referenceNumber: this.generateReferenceNumber(),
      candidateName: 'Rohan Sharma',
      candidateEmail: 'rohan.sharma@example.com',
      candidatePhone: '+91 98765 43210',
      candidateCollege: 'Delhi Technological University (DTU), New Delhi',
      candidateAddress: 'Rohini Sector 16, New Delhi - 110089',
      roleType,
      roleTitle: finalTitle,
      subject: isSme ? subjectName : undefined,
      department: preset.department,
      employmentType: preset.employmentType,
      workMode: preset.workMode,
      duration: preset.duration,
      joiningDate: this.getFutureDateString(3),
      validUntil: this.getFutureDateString(10),
      stipendAmount: preset.stipendAmount,
      incentiveDetails: preset.incentiveDetails,
      workingHours: preset.workingHours,
      reportingManager: preset.reportingManager,
      responsibilities: isSme 
        ? preset.responsibilities.map(r => r.replace(/\[Subject\]/g, subjectName))
        : [...preset.responsibilities],
      perks: [...STANDARD_PERKS],
      terms: [...STANDARD_TERMS],
      signatoryName: 'Dr. Aarav Sharma',
      signatoryTitle: 'Director of Academic Operations & Dean',
      includeDigitalSeal: true,
      status: 'draft',
      templateTheme: 'executive_navy',
      notes: 'Initial formal offer generated by Academic Admin Desk.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Apply role preset to an existing offer letter
   */
  static applyRolePreset(
    letter: OfferLetter,
    newRoleType: OfferLetterRoleType,
    subjectName: string = 'Engineering Mathematics'
  ): OfferLetter {
    const preset = ROLE_PRESETS[newRoleType] || ROLE_PRESETS.sme;
    const isSme = newRoleType === 'sme';
    const finalTitle = isSme 
      ? `Subject Matter Expert - ${subjectName}`
      : preset.defaultTitle;

    return {
      ...letter,
      roleType: newRoleType,
      roleTitle: finalTitle,
      subject: isSme ? subjectName : undefined,
      department: preset.department,
      duration: preset.duration,
      employmentType: preset.employmentType,
      workMode: preset.workMode,
      stipendAmount: preset.stipendAmount,
      incentiveDetails: preset.incentiveDetails,
      workingHours: preset.workingHours,
      reportingManager: preset.reportingManager,
      responsibilities: isSme
        ? preset.responsibilities.map(r => r.replace(/\[Subject\]/g, subjectName))
        : [...preset.responsibilities],
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generates a ready-to-send formatted email body for the offer letter
   */
  static formatOfferLetterEmail(offer: OfferLetter): string {
    return `Subject: Offer of Appointment: ${offer.roleTitle} at Apna Engineering Wallah (Ref: ${offer.referenceNumber})

Dear ${offer.candidateName},

We are pleased to extend an offer of appointment for the position of "${offer.roleTitle}" with Apna Engineering Wallah (AEW).

Here is a summary of your appointment details:
--------------------------------------------------
• Reference Number: ${offer.referenceNumber}
• Department: ${offer.department}
• Role & Title: ${offer.roleTitle}
• Employment Category: ${offer.employmentType}
• Work Model: ${offer.workMode}
• Scheduled Joining Date: ${offer.joiningDate}
• Duration / Tenure: ${offer.duration}
• Working Hours: ${offer.workingHours}
• Remuneration / Stipend: ${offer.stipendAmount}
${offer.incentiveDetails ? `• Additional Incentives: ${offer.incentiveDetails}\n` : ''}• Reporting Manager: ${offer.reportingManager}
--------------------------------------------------

Key Responsibilities:
${offer.responsibilities.map((r, i) => `  ${i + 1}. ${r}`).join('\n')}

Perks & Learning Benefits:
${offer.perks.map((p) => `  • ${p}`).join('\n')}

Next Steps:
Please review the attached formal Offer Letter document. To confirm your acceptance, kindly sign and return a duplicate copy to us on or before ${offer.validUntil}.

We look forward to welcoming you to the Apna Engineering Wallah team and creating a transformative impact on engineering education together!

Warm regards,

${offer.signatoryName}
${offer.signatoryTitle}
Apna Engineering Wallah (AEW)
New Delhi, India`;
  }

  /**
   * Generates an official, beautifully styled PDF offer letter using jsPDF
   */
  static generatePdf(offer: OfferLetter): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 18;
    const contentWidth = pageWidth - margin * 2; // 174mm
    let currentY = 0;

    // Determine theme palette
    let primaryColor = { r: 15, g: 23, b: 42 };     // Slate 900
    let accentColor = { r: 79, g: 70, b: 229 };     // Indigo 600
    let goldColor = { r: 217, g: 119, b: 6 };       // Amber 600

    if (offer.templateTheme === 'executive_navy') {
      primaryColor = { r: 10, g: 25, b: 47 };       // Deep Navy
      accentColor = { r: 30, g: 58, b: 138 };       // Classic Blue
      goldColor = { r: 180, g: 130, b: 50 };        // Classic Gold
    } else if (offer.templateTheme === 'classic_academic') {
      primaryColor = { r: 24, g: 24, b: 27 };       // Zinc 900
      accentColor = { r: 82, g: 82, b: 91 };        // Zinc 600
      goldColor = { r: 140, g: 80, b: 20 };
    }

    // Helper to draw Header on Page
    const drawHeader = (pageNumber: number) => {
      // Top Decorative Accent Bar
      doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
      doc.rect(0, 0, pageWidth, 7, 'F');

      doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
      doc.rect(0, 7, pageWidth, 2.5, 'F');

      doc.setFillColor(goldColor.r, goldColor.g, goldColor.b);
      doc.rect(0, 9.5, pageWidth, 1, 'F');

      if (pageNumber === 1) {
        // Logo / Organization Crest Emblem Box
        doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
        doc.roundedRect(margin, 16, 18, 18, 3, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('AEW', margin + 9, 27, { align: 'center' });

        // Header Title
        doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('APNA ENGINEERING WALLAH', margin + 22, 22);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('Center for Technical Excellence, Academic Curriculum & Innovation', margin + 22, 27);
        doc.text('Regd. Office: New Delhi, India • Contact: academic-ops@aew.com • Web: apnaengineeringwallah.com', margin + 22, 31);

        // Horizontal divider line
        doc.setDrawColor(226, 232, 240); // Slate 200
        doc.setLineWidth(0.6);
        doc.line(margin, 38, pageWidth - margin, 38);
      }
    };

    // Helper to draw Footer on each page
    const drawFooter = (pageNumber: number, totalPages: number) => {
      const footerY = pageHeight - 12;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Apna Engineering Wallah (AEW) • Official Appointment Letter • Strictly Confidential', margin, footerY + 2);
      doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin, footerY + 2, { align: 'right' });
    };

    // Page 1: Start
    drawHeader(1);
    currentY = 44;

    // Document Metadata Bar (Ref No, Date, Deadline)
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.roundedRect(margin, currentY, contentWidth, 14, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
    doc.text(`REF NO: ${offer.referenceNumber}`, margin + 4, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Date of Issue: ${offer.createdAt ? offer.createdAt.split('T')[0] : OfferLetterService.getTodayDateString()}`, margin + 4, currentY + 11);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(217, 119, 6);
    doc.text(`Acceptance Deadline: ${offer.validUntil}`, pageWidth - margin - 4, currentY + 6, { align: 'right' });
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Status: Official Offer Letter`, pageWidth - margin - 4, currentY + 11, { align: 'right' });

    currentY += 19;

    // Candidate Salutation Box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text('To,', margin, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(offer.candidateName, margin, currentY);
    currentY += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    if (offer.candidateCollege) {
      doc.text(offer.candidateCollege, margin, currentY);
      currentY += 4;
    }
    if (offer.candidateAddress) {
      doc.text(offer.candidateAddress, margin, currentY);
      currentY += 4;
    }
    doc.text(`Email: ${offer.candidateEmail} | Phone: ${offer.candidatePhone || 'On Record'}`, margin, currentY);
    currentY += 7;

    // Subject Line
    doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
    doc.rect(margin, currentY, 2.5, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text(`SUBJECT: APPOINTMENT OFFER FOR THE ROLE OF "${offer.roleTitle.toUpperCase()}"`, margin + 6, currentY + 5);
    currentY += 11;

    // Formal Opening Paragraph
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const openingText = `Dear ${offer.candidateName},\n\nOn behalf of Apna Engineering Wallah (AEW), we are delighted to offer you the position of "${offer.roleTitle}" in our ${offer.department}. We were exceptionally impressed by your academic credentials, technical passion, and problem-solving mindset during the evaluation process. We are confident you will make valuable contributions to our community.`;
    const splitOpening = doc.splitTextToSize(openingText, contentWidth);
    doc.text(splitOpening, margin, currentY);
    currentY += splitOpening.length * 4.2 + 4;

    // Appointment Key Terms Matrix / Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text('APPOINTMENT SUMMARY & EMPLOYMENT SCHEDULE', margin, currentY);
    currentY += 4;

    const termsData = [
      ['Designation / Role', offer.roleTitle],
      ['Department', offer.department],
      ['Employment Category', `${offer.employmentType} (${offer.workMode})`],
      ['Scheduled Joining Date', offer.joiningDate],
      ['Tenure / Duration', offer.duration],
      ['Working Commitment', offer.workingHours],
      ['Fixed Stipend / Honorarium', offer.stipendAmount],
      ['Reporting Manager', offer.reportingManager],
    ];

    if (offer.incentiveDetails) {
      termsData.push(['Performance Incentive', offer.incentiveDetails]);
    }

    // Draw Terms Grid
    const rowHeight = 6.2;
    const col1Width = 55;
    const col2Width = contentWidth - col1Width;

    termsData.forEach((row, idx) => {
      const isEven = idx % 2 === 0;
      doc.setFillColor(isEven ? 248 : 255, isEven ? 250 : 255, isEven ? 252 : 255);
      doc.rect(margin, currentY, contentWidth, rowHeight, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, currentY, contentWidth, rowHeight, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(row[0], margin + 4, currentY + 4.2);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      const valText = doc.splitTextToSize(row[1], col2Width - 6);
      doc.text(valText, margin + col1Width + 4, currentY + 4.2);

      currentY += rowHeight;
    });

    currentY += 6;

    // Section 1: Key Responsibilities
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text('1. SCOPE OF WORK & KEY RESPONSIBILITIES', margin, currentY);
    currentY += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);

    offer.responsibilities.forEach((resp) => {
      // Check page overflow
      if (currentY > pageHeight - 35) {
        doc.addPage();
        drawHeader(doc.getNumberOfPages());
        currentY = 44;
      }
      doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
      doc.circle(margin + 2.5, currentY - 1, 1, 'F');
      const lines = doc.splitTextToSize(resp, contentWidth - 8);
      doc.text(lines, margin + 6, currentY);
      currentY += lines.length * 3.8 + 1.8;
    });

    currentY += 4;

    // Section 2: Perks and Learning Benefits
    if (currentY > pageHeight - 45) {
      doc.addPage();
      drawHeader(doc.getNumberOfPages());
      currentY = 44;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text('2. BENEFITS, PERKS & PROFESSIONAL DEVELOPMENT', margin, currentY);
    currentY += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);

    offer.perks.forEach((perk) => {
      if (currentY > pageHeight - 35) {
        doc.addPage();
        drawHeader(doc.getNumberOfPages());
        currentY = 44;
      }
      doc.setFillColor(goldColor.r, goldColor.g, goldColor.b);
      doc.circle(margin + 2.5, currentY - 1, 1, 'F');
      const lines = doc.splitTextToSize(perk, contentWidth - 8);
      doc.text(lines, margin + 6, currentY);
      currentY += lines.length * 3.8 + 1.8;
    });

    currentY += 4;

    // Section 3: Institutional Terms & Confidentiality
    if (currentY > pageHeight - 45) {
      doc.addPage();
      drawHeader(doc.getNumberOfPages());
      currentY = 44;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text('3. CODE OF CONDUCT, IP & CONFIDENTIALITY CLAUSES', margin, currentY);
    currentY += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);

    offer.terms.forEach((term) => {
      if (currentY > pageHeight - 35) {
        doc.addPage();
        drawHeader(doc.getNumberOfPages());
        currentY = 44;
      }
      const lines = doc.splitTextToSize(term, contentWidth);
      doc.text(lines, margin, currentY);
      currentY += lines.length * 3.5 + 2;
    });

    // Check if we have room for Signatures; if not, add final page
    if (currentY > pageHeight - 55) {
      doc.addPage();
      drawHeader(doc.getNumberOfPages());
      currentY = 48;
    } else {
      currentY += 8;
    }

    // DUAL SIGNATORY & ACCEPTANCE BLOCK
    const sigBoxWidth = (contentWidth - 10) / 2;
    const sigBoxHeight = 38;

    // Left: AEW Signatory Block
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, sigBoxWidth, sigBoxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text('For Apna Engineering Wallah (AEW)', margin + 4, currentY + 6);

    // Digital seal badge
    if (offer.includeDigitalSeal) {
      doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
      doc.roundedRect(margin + 4, currentY + 9, 36, 6, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.text('✓ DIGITALLY VERIFIED', margin + 6, currentY + 13.5);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(offer.signatoryName, margin + 4, currentY + 23);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(offer.signatoryTitle, margin + 4, currentY + 27.5);
    doc.text('Authorized Signatory & Academic Dean', margin + 4, currentY + 31.5);

    // Right: Candidate Acceptance Block
    const rightBoxX = margin + sigBoxWidth + 10;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(rightBoxX, currentY, sigBoxWidth, sigBoxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text('Candidate Acceptance & Acknowledgment', rightBoxX + 4, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('I accept the terms and conditions outlined in this offer.', rightBoxX + 4, currentY + 11);

    // Signature line
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.5);
    doc.line(rightBoxX + 4, currentY + 23, rightBoxX + sigBoxWidth - 4, currentY + 23);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(`Signature: ${offer.candidateName}`, rightBoxX + 4, currentY + 28);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Date: _________________  Place: _________________`, rightBoxX + 4, currentY + 33);

    // Add footers on all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      drawFooter(i, totalPages);
    }

    // Download PDF
    const cleanFileName = `AEW_Offer_Letter_${offer.candidateName.replace(/[^a-zA-Z0-9]/g, '_')}_${offer.roleType}.pdf`;
    doc.save(cleanFileName);
  }
}
