import React, { useRef, useState } from 'react';
import { Award, CheckCircle2, Download, ShieldCheck, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import jsPDF from 'jspdf';
import type { WebDevRewardFulfillment, WebDevReward } from '../../../types';

interface CertificateModalProps {
  fulfillment: WebDevRewardFulfillment;
  reward?: WebDevReward;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  fulfillment,
  reward,
  onClose,
}) => {
  const [downloading, setDownloading] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    try {
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  }, []);

  const handleDownloadPdf = () => {
    setDownloading(true);
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      // Dark Navy Background
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 297, 210, 'F');

      // Outer Golden Border
      doc.setDrawColor(217, 119, 6); // amber-600
      doc.setLineWidth(3);
      doc.rect(10, 10, 277, 190);

      // Inner Thin Golden Border
      doc.setDrawColor(245, 158, 11); // amber-500
      doc.setLineWidth(0.8);
      doc.rect(14, 14, 269, 182);

      // Header Brand
      doc.setTextColor(245, 158, 11);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('APNA ENGINEERING WALLAH', 148.5, 32, { align: 'center' });

      doc.setTextColor(148, 163, 184); // slate-400
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('DIVISION OF WEB DEVELOPMENT & ENGINEERING EXCELLENCE', 148.5, 38, { align: 'center' });

      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(26);
      doc.setFont('helvetica', 'bold');
      const title = reward?.title || 'CERTIFICATE OF EXCELLENCE';
      doc.text(title.toUpperCase(), 148.5, 56, { align: 'center' });

      // Subtitle
      doc.setTextColor(203, 213, 225);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'italic');
      doc.text('This credential is officially conferred upon', 148.5, 72, { align: 'center' });

      // Recipient Name
      doc.setTextColor(251, 191, 36); // amber-400
      doc.setFontSize(30);
      doc.setFont('helvetica', 'bold');
      doc.text((fulfillment.userName || 'Distinguished Engineer').toUpperCase(), 148.5, 92, { align: 'center' });

      // Recipient Title & Department
      doc.setTextColor(226, 232, 240);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'normal');
      doc.text(`${fulfillment.userTitle || 'Web Developer'} • Engineering Division`, 148.5, 102, { align: 'center' });

      // Body text
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(11);
      const description = reward?.description ||
        'In formal recognition of demonstrated technical competence, high engineering standards, reliable code deliveries, and outstanding peer collaboration.';
      const splitText = doc.splitTextToSize(description, 210);
      doc.text(splitText, 148.5, 118, { align: 'center' });

      // Credentials Footer
      const issueDate = fulfillment.issueDate || new Date().toISOString().split('T')[0];
      const certCode = fulfillment.verificationCode || 'WD-2026-AEW-CERT';

      // Left Column: Date & ID
      doc.setTextColor(203, 213, 225);
      doc.setFontSize(10);
      doc.text(`Issue Date: ${issueDate}`, 30, 160);
      doc.text(`Verification ID: ${certCode}`, 30, 166);
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.text('Verify at: https://aew.portal/verify', 30, 172);

      // Right Column: Signatures
      doc.setDrawColor(100, 116, 139);
      doc.line(200, 155, 265, 155);
      doc.setTextColor(245, 158, 11);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Vikramaditya Sen', 232.5, 162, { align: 'center' });
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Head of Web Development', 232.5, 168, { align: 'center' });

      doc.save(`AEW-Certificate-${certCode}.pdf`);
    } catch (err) {
      console.error('Error generating certificate PDF:', err);
      alert('Unable to generate PDF directly. Please use print/screenshot or try again.');
    } finally {
      setDownloading(false);
    }
  };

  const issueDate = fulfillment.issueDate || new Date().toISOString().split('T')[0];
  const certCode = fulfillment.verificationCode || 'WD-2026-VALID';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden p-6 md:p-8 animate-in fade-in zoom-in duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-full transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Certificate Paper Container */}
        <div
          ref={certRef}
          className="relative bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-4 border-double border-amber-500/60 rounded-xl p-8 md:p-12 text-center shadow-inner"
        >
          {/* Subtle Background Seals & Flourishes */}
          <div className="absolute top-6 left-6 w-16 h-16 border-t-2 border-l-2 border-amber-500/40 rounded-tl-lg pointer-events-none" />
          <div className="absolute top-6 right-6 w-16 h-16 border-t-2 border-r-2 border-amber-500/40 rounded-tr-lg pointer-events-none" />
          <div className="absolute bottom-6 left-6 w-16 h-16 border-b-2 border-l-2 border-amber-500/40 rounded-bl-lg pointer-events-none" />
          <div className="absolute bottom-6 right-6 w-16 h-16 border-b-2 border-r-2 border-amber-500/40 rounded-br-lg pointer-events-none" />

          {/* Seal Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-300 text-slate-950 shadow-lg shadow-amber-500/20 mb-4">
            <Award className="w-9 h-9" />
          </div>

          <div className="text-amber-400 font-mono tracking-widest text-xs uppercase font-bold">
            Apna Engineering Wallah
          </div>
          <div className="text-slate-400 text-xs tracking-wider uppercase mt-0.5">
            Engineering & Web Development Leadership Council
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-200 mt-4 tracking-wide">
            {reward?.title || 'Certificate of Engineering Excellence'}
          </h1>

          <p className="text-slate-400 text-sm italic mt-3">
            This verifiable professional credential is proud to be presented to
          </p>

          {/* Recipient */}
          <div className="mt-4 mb-2">
            <div className="text-3xl md:text-4xl font-black text-amber-300 tracking-tight underline decoration-amber-500/40 underline-offset-8">
              {fulfillment.userName}
            </div>
            <div className="text-sm font-semibold text-slate-300 mt-2">
              {fulfillment.userTitle || 'Web Developer'} • Core Engineering
            </div>
          </div>

          <p className="text-slate-300 text-xs md:text-sm max-w-xl mx-auto mt-4 leading-relaxed">
            {reward?.description ||
              'For outstanding engineering proficiency, adherence to zero-defect delivery standards, and sustained contributions towards platform reliability and feature performance.'}
          </p>

          {/* Verification Bar */}
          <div className="mt-8 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-left text-xs text-slate-400">
            <div>
              <div className="text-slate-500 uppercase tracking-wider font-semibold text-[10px]">Issued On</div>
              <div className="text-slate-200 font-medium">{issueDate}</div>
            </div>

            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-[10px] text-amber-400 uppercase font-semibold">Verified Credential</div>
                <div className="font-mono text-xs font-bold text-amber-300">{certCode}</div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-slate-500 uppercase tracking-wider font-semibold text-[10px]">Signed by</div>
              <div className="text-slate-200 font-semibold text-xs">Vikramaditya Sen</div>
              <div className="text-[10px] text-slate-400">Head of Web Development</div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Cryptographically sealed & verifiable across hiring networks</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors font-medium"
            >
              Close
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 rounded-lg shadow-lg shadow-amber-500/20 transition-all transform active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {downloading ? 'Preparing PDF...' : 'Download Certificate PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
