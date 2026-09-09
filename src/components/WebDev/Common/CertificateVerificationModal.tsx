import React, { useState } from 'react';
import { ShieldCheck, Search, X, CheckCircle2, AlertCircle, Award, Calendar, User } from 'lucide-react';
import { WebDevService } from '../../../services/webDevService';
import type { WebDevRewardFulfillment, WebDevReward } from '../../../types';

interface CertificateVerificationModalProps {
  onClose: () => void;
  initialCode?: string;
}

export const CertificateVerificationModal: React.FC<CertificateVerificationModalProps> = ({
  onClose,
  initialCode = '',
}) => {
  const [code, setCode] = useState(initialCode);
  const [hasSearched, setHasSearched] = useState(Boolean(initialCode));
  const [result, setResult] = useState<{
    valid: boolean;
    fulfillment?: WebDevRewardFulfillment;
    reward?: WebDevReward;
    recipientName?: string;
    issueDate?: string;
  } | null>(initialCode ? WebDevService.verifyCertificate(initialCode) : null);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    const res = WebDevService.verifyCertificate(code.trim());
    setResult(res);
    setHasSearched(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 md:p-8 animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Credential Verification</h2>
            <p className="text-xs text-slate-400">Verify official AEW Web Development Certificates</p>
          </div>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Certificate ID / Verification Code
            </label>
            <div className="relative">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. WD-2026-99431 or CERT-WD-2026-002"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                Verify
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Sample valid IDs to test: <code className="text-amber-400 font-mono">WD-2026-99431</code>, <code className="text-amber-400 font-mono">WD-2026-88192</code>
            </p>
          </div>
        </form>

        {hasSearched && (
          <div className="mt-6 pt-6 border-t border-slate-800">
            {result?.valid ? (
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Officially Verified Credential</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-emerald-900/40 pb-2">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-400" />
                      Award Title
                    </span>
                    <span className="text-white font-medium">{result.reward?.title}</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-emerald-900/40 pb-2">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-blue-400" />
                      Recipient
                    </span>
                    <span className="text-white font-semibold">{result.recipientName}</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-emerald-900/40 pb-2">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-purple-400" />
                      Issue Date
                    </span>
                    <span className="text-slate-200">{result.issueDate}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400">Status</span>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-semibold rounded text-[10px] uppercase tracking-wider">
                      Active & Valid
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-5 flex items-center gap-3 text-red-400 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <div className="font-semibold">Verification Record Not Found</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    No active credential matches "{code}". Please check for typos and re-enter.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
