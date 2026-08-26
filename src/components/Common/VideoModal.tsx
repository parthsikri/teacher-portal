import React, { useState, useEffect } from 'react';
import { X, HardDrive, FileText, CheckCircle2, Clock, MessageSquare } from 'lucide-react';
import { YoutubeIcon as Youtube } from './YoutubeIcon';
import type { Lecture } from '../../types';
import { getYouTubeEmbedUrl, getDriveEmbedUrl } from '../../utils/urlHelper';

interface VideoModalProps {
  lecture: Lecture | null;
  onClose: () => void;
}

export const VideoModal: React.FC<VideoModalProps> = ({ lecture, onClose }) => {
  const ytEmbed = getYouTubeEmbedUrl(lecture?.youtubeUrl);
  const driveEmbed = getDriveEmbedUrl(lecture?.driveUrl);
  const notesEmbed = getDriveEmbedUrl(lecture?.notesUrl);
  const dppEmbed = getDriveEmbedUrl(lecture?.dppUrl);
  const localFileUrl = lecture?.localFileUrl;
  const isPdfFile = lecture?.fileName?.toLowerCase().endsWith('.pdf') || lecture?.notesUrl?.includes('.pdf');

  const availableTabs: ('local' | 'youtube' | 'drive' | 'notes' | 'dpp')[] = [];
  if (localFileUrl) availableTabs.push('local');
  if (ytEmbed) availableTabs.push('youtube');
  if (driveEmbed) availableTabs.push('drive');
  if (notesEmbed) availableTabs.push('notes');
  if (dppEmbed) availableTabs.push('dpp');

  const [activeTab, setActiveTab] = useState<'local' | 'youtube' | 'drive' | 'notes' | 'dpp'>(
    availableTabs[0] || 'local'
  );

  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [lecture?.id, availableTabs.join(',')]);

  if (!lecture) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {lecture.subject}
              </span>
              <span className="text-xs text-slate-400 font-medium">{lecture.department}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-100 line-clamp-1">{lecture.title}</h3>
            <p className="text-xs text-slate-400">By {lecture.teacherName}</p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="Close Preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        {availableTabs.length > 1 && (
          <div className="flex border-b border-slate-800 bg-slate-950 px-6 py-2 gap-2 overflow-x-auto">
            {availableTabs.includes('local') && (
              <button
                onClick={() => setActiveTab('local')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'local'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {isPdfFile ? '📄 Uploaded PDF Document' : '📁 Uploaded Video File'}
              </button>
            )}

            {availableTabs.includes('youtube') && (
              <button
                onClick={() => setActiveTab('youtube')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'youtube'
                    ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Youtube className="w-4 h-4 text-red-500" />
                YouTube Unlisted Video
              </button>
            )}

            {availableTabs.includes('drive') && (
              <button
                onClick={() => setActiveTab('drive')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'drive'
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <HardDrive className="w-4 h-4 text-blue-400" />
                Google Drive Video
              </button>
            )}

            {availableTabs.includes('notes') && (
              <button
                onClick={() => setActiveTab('notes')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'notes'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                Class Notes PDF
              </button>
            )}
          </div>
        )}

        {/* Media Frame Container */}
        <div className="relative flex-1 bg-black min-h-[440px] flex items-center justify-center">
          {activeTab === 'local' && localFileUrl ? (
            isPdfFile ? (
              <iframe
                src={localFileUrl}
                title="Uploaded PDF Notes"
                className="w-full h-full min-h-[480px] border-0"
              />
            ) : (
              <video
                src={localFileUrl}
                controls
                autoPlay
                className="w-full h-full max-h-[500px] object-contain"
              />
            )
          ) : activeTab === 'youtube' && ytEmbed ? (
            <iframe
              src={ytEmbed}
              title={lecture.title}
              className="w-full h-full min-h-[440px] border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : activeTab === 'drive' && driveEmbed ? (
            <iframe
              src={driveEmbed}
              title={`${lecture.title} (Drive)`}
              className="w-full h-full min-h-[440px] border-0"
              allow="autoplay"
              allowFullScreen
            />
          ) : activeTab === 'notes' && notesEmbed ? (
            <iframe
              src={notesEmbed}
              title="Class Notes PDF"
              className="w-full h-full min-h-[440px] border-0"
            />
          ) : (
            /* DEMO SAMPLE VIDEO PLAYER FALLBACK */
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-950">
              <video
                src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                controls
                className="w-full max-w-2xl max-h-[380px] rounded-xl border border-slate-800"
              />
              <p className="mt-3 text-xs text-slate-400">
                Playing sample video for attached link: <span className="font-mono text-indigo-400 underline">{lecture.driveUrl || lecture.youtubeUrl}</span>
              </p>
            </div>
          )}
        </div>

        {/* Footer Subtopics & Admin Directives */}
        <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-slate-200 mb-1">Subtopics Covered:</div>
              <div className="flex flex-wrap gap-1.5">
                {lecture.subtopics.map((st, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[11px]"
                  >
                    {st}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {lecture.adminRemarks && lecture.adminRemarks.length > 0 && (
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-purple-300">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                  Academic Directives Attached ({lecture.adminRemarks.length}):
                </span>
                {lecture.adminRemarks.some((r) => r.isAcknowledged) ? (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {lecture.adminRemarks.filter((r) => r.isAcknowledged).length} Acknowledged
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Pending Acknowledgment
                  </span>
                )}
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {lecture.adminRemarks.map((rem) => (
                  <div
                    key={rem.id}
                    className={`p-2.5 rounded-xl border text-[11px] space-y-1 ${
                      rem.isAcknowledged
                        ? 'bg-emerald-950/20 border-emerald-500/25 text-emerald-200'
                        : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                    }`}
                  >
                    <div className="italic text-slate-200">"{rem.remarkText}"</div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                      <span>Posted by {rem.adminName}</span>
                      {rem.isAcknowledged ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Acknowledged by {rem.acknowledgedByName || lecture.teacherName}
                        </span>
                      ) : (
                        <span className="text-amber-400 font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Pending Teacher Action
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
