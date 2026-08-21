import React, { useState, useMemo } from 'react';
import type { User, PptRequest, AssignedTopic } from '../../types';
import { StorageService } from '../../services/storage';
import { 
  FileSpreadsheet, Plus, Download, Clock, CheckCircle2, 
  ExternalLink, Calendar, Search, X, Info
} from 'lucide-react';

interface PptRequestPortalProps {
  teacher: User;
  onRefreshData?: () => void;
}

export const PptRequestPortal: React.FC<PptRequestPortalProps> = ({
  teacher,
  onRefreshData,
}) => {
  const [requests, setRequests] = useState<PptRequest[]>(() =>
    StorageService.getTeacherPptRequests(teacher.teacherId)
  );
  const [assignedTopics] = useState<AssignedTopic[]>(() =>
    StorageService.getAssignedTopics().filter(
      (t) => t.teacherId.toUpperCase() === teacher.teacherId.toUpperCase()
    )
  );

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Default scheduled date is today + 2 days
  const defaultDate = useMemo(() => {
    const d = new Date(Date.now() + 86400000 * 2);
    return d.toISOString().split('T')[0];
  }, []);

  const minDate = defaultDate;

  // Form State
  const [unitNumber, setUnitNumber] = useState('UNIT 1');
  const [topicTitle, setTopicTitle] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [targetExam, setTargetExam] = useState('University End-Term (All PYQs)');
  const [yearRange, setYearRange] = useState('Last 5 Years (2019–2024)');
  const [lectureDate, setLectureDate] = useState(defaultDate);
  const [estimatedQuestions, setEstimatedQuestions] = useState(8);
  const [referenceUrl, setReferenceUrl] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  const refreshRequests = () => {
    const list = StorageService.getTeacherPptRequests(teacher.teacherId);
    setRequests(list);
    onRefreshData?.();
  };

  const handleTopicSelect = (topicId: string) => {
    setSelectedTopicId(topicId);
    const found = assignedTopics.find((t) => t.id === topicId);
    if (found) {
      setTopicTitle(found.topicTitle);
      if (found.deadlineDate && found.deadlineDate >= minDate) {
        setLectureDate(found.deadlineDate);
      }
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicTitle.trim()) {
      alert('Please enter or select a topic title.');
      return;
    }

    if (lectureDate < minDate) {
      const confirmEarly = window.confirm(
        'Notice: Presentations should ideally be requested at least 2 days in advance. Would you like to submit this urgent request anyway?'
      );
      if (!confirmEarly) return;
    }

    StorageService.addPptRequest({
      teacherId: teacher.teacherId,
      teacherName: teacher.name,
      subject: teacher.subject || teacher.department,
      unitNumber: unitNumber.trim() || 'UNIT 1',
      topicTitle: topicTitle.trim(),
      targetExam: targetExam.trim(),
      yearRange: yearRange.trim(),
      lectureDate,
      estimatedQuestions: Number(estimatedQuestions) || 8,
      referenceUrl: referenceUrl.trim() || undefined,
      specialInstructions: specialInstructions.trim() || undefined,
    });

    setShowCreateModal(false);
    setTopicTitle('');
    setSelectedTopicId('');
    setSpecialInstructions('');
    setReferenceUrl('');
    setEstimatedQuestions(8);
    refreshRequests();

    setToastMessage('PYQ Deck Request submitted to the slide design team.');
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleDownloadClick = (req: PptRequest) => {
    if (req.isNewForTeacher) {
      StorageService.markPptRequestSeen(req.id);
      refreshRequests();
    }
  };

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchesSearch =
        !searchQuery ||
        r.topicTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.unitNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.targetExam && r.targetExam.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (selectedFilter === 'pending') return r.status === 'pending';
      if (selectedFilter === 'in_progress') return r.status === 'in_progress';
      if (selectedFilter === 'completed') return r.status === 'completed';
      return true;
    });
  }, [requests, searchQuery, selectedFilter]);

  const completedCount = requests.filter((r) => r.status === 'completed').length;
  const inProgressCount = requests.filter((r) => r.status === 'in_progress' || r.status === 'pending').length;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-6 text-slate-200">
      
      {/* TOAST FEEDBACK */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-700 text-slate-100 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {toastMessage}
        </div>
      )}

      {/* HEADER WITH ACTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">
            Topic-wise PYQ Slide Decks
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Request topic-specific Previous Year Questions (PYQs) compiled and formatted by the academic design team.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow transition-colors flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Request PYQ Deck
        </button>
      </div>

      {/* 2-DAY ADVANCE NOTICE POLICY */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3.5">
        <div className="p-2 rounded-lg bg-slate-800 text-slate-300 shrink-0 mt-0.5">
          <Clock className="w-4 h-4 text-amber-400" />
        </div>
        <div className="space-y-1 text-xs">
          <div className="font-semibold text-slate-200">
            2-Day Advance Turnaround Policy
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            The design team collects all previous year university and competitive exam questions for your selected topic, verifies solutions, and formats them into clean 16:9 slides. Please submit your topic request at least <strong>2 days prior</strong> to your scheduled recording date.
          </p>
        </div>
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
          <div className="text-xs text-slate-400">Total Topic Requests</div>
          <div className="text-xl font-bold text-slate-100">{requests.length}</div>
          <div className="text-[11px] text-slate-500">Submitted for {teacher.subject}</div>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
          <div className="text-xs text-slate-400">In Preparation</div>
          <div className="text-xl font-bold text-amber-400">{inProgressCount}</div>
          <div className="text-[11px] text-slate-500">Design team currently compiling</div>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
          <div className="text-xs text-slate-400">Ready for Download</div>
          <div className="text-xl font-bold text-emerald-400">{completedCount}</div>
          <div className="text-[11px] text-slate-500">Delivered & verified decks</div>
        </div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              selectedFilter === 'all'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({requests.length})
          </button>
          <button
            onClick={() => setSelectedFilter('in_progress')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              selectedFilter === 'in_progress'
                ? 'bg-slate-800 text-indigo-300 border border-indigo-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            In Progress ({inProgressCount})
          </button>
          <button
            onClick={() => setSelectedFilter('completed')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              selectedFilter === 'completed'
                ? 'bg-slate-800 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ready ({completedCount})
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search topic, unit, or exam..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-700 w-full sm:w-60"
          />
        </div>
      </div>

      {/* REQUESTS LIST */}
      {filteredRequests.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/30 border border-slate-800 rounded-xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto text-lg">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm text-slate-200">No PYQ Deck Requests Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Submit your topic 2 days prior to lecture recording and our team will assemble all relevant PYQ slides.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-lg transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Request First PYQ Deck
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => {
            const isCompleted = req.status === 'completed';
            const isInProgress = req.status === 'in_progress';
            const isPending = req.status === 'pending';

            return (
              <div
                key={req.id}
                className={`p-4 sm:p-5 rounded-xl border transition-all ${
                  isCompleted
                    ? 'bg-slate-900/70 border-emerald-500/30'
                    : isInProgress
                    ? 'bg-slate-900/50 border-slate-700'
                    : 'bg-slate-900/40 border-slate-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                        {req.unitNumber}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {req.subject}
                      </span>

                      {/* STATUS BADGES */}
                      {isCompleted && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Ready to Present
                        </span>
                      )}
                      {isInProgress && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-indigo-400" /> Compiling PYQs
                        </span>
                      )}
                      {isPending && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" /> In Queue
                        </span>
                      )}

                      {req.isNewForTeacher && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500 text-white">
                          NEW
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-sm text-slate-100 truncate">
                      {req.topicTitle}
                    </h4>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
                      {req.targetExam && (
                        <span className="text-slate-300">
                          <strong>Target:</strong> {req.targetExam} {req.yearRange ? `(${req.yearRange})` : ''}
                        </span>
                      )}
                      <span className="flex items-center gap-1 font-mono text-slate-400">
                        <Calendar className="w-3 h-3 text-slate-400" /> Recording Date: {req.lectureDate}
                      </span>
                      {req.estimatedQuestions && (
                        <span>
                          ~{req.estimatedQuestions} PYQs
                        </span>
                      )}
                    </div>

                    {req.specialInstructions && (
                      <p className="text-[11px] text-slate-400 bg-slate-950 p-2 rounded-lg border border-slate-800">
                        <strong className="text-slate-300">Notes:</strong> {req.specialInstructions}
                      </p>
                    )}

                    {req.adminRemarks && (
                      <div className="text-[11px] text-emerald-300 bg-emerald-950/20 p-2 rounded-lg border border-emerald-500/20">
                        <strong className="text-emerald-200">Design Team:</strong> {req.adminRemarks}
                      </div>
                    )}
                  </div>

                  {/* DOWNLOAD ACTIONS FOR COMPLETED DECKS */}
                  {isCompleted && (
                    <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-2 sm:pt-0">
                      {req.completedPptUrl && (
                        <a
                          href={req.completedPptUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => handleDownloadClick(req)}
                          className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" /> Download PPTX
                        </a>
                      )}
                      {req.completedPdfUrl && (
                        <a
                          href={req.completedPdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => handleDownloadClick(req)}
                          className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs transition-colors flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> View PDF
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REQUEST MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-100">Request PYQ Presentation Deck</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs">
              
              {/* Notice */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 flex items-start gap-2 text-[11px]">
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  Our content team gathers and formats all relevant PYQs for this topic into ready-to-use lecture slides. Minimum 2 days advance notice.
                </span>
              </div>

              {/* Subject & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Subject</label>
                  <input
                    type="text"
                    disabled
                    value={teacher.subject || teacher.department}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 font-medium cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Unit Number *</label>
                  <select
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-slate-700"
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

              {/* Select From Assigned Topic */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Select from Syllabus (Optional)
                </label>
                <select
                  value={selectedTopicId}
                  onChange={(e) => handleTopicSelect(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-slate-700"
                >
                  <option value="">-- Choose Syllabus Topic or Type Below --</option>
                  {assignedTopics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.topicTitle} (Due: {t.deadlineDate})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Topic Title / Concept *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dynamic Programming on Trees & Rerooting"
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-slate-700 font-medium"
                />
              </div>

              {/* Target Exam & Years */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Target Exam</label>
                  <select
                    value={targetExam}
                    onChange={(e) => setTargetExam(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-slate-700"
                  >
                    <option value="University End-Term (All PYQs)">University End-Term (All PYQs)</option>
                    <option value="GATE / Competitive Exam PYQs">GATE / Competitive Exam PYQs</option>
                    <option value="Semester Mid-Term PYQs">Semester Mid-Term PYQs</option>
                    <option value="Standard Curriculum & University PYQs">Standard Curriculum & University PYQs</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">PYQ Year Range</label>
                  <select
                    value={yearRange}
                    onChange={(e) => setYearRange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-slate-700"
                  >
                    <option value="Last 5 Years (2019–2024)">Last 5 Years (2019–2024)</option>
                    <option value="Last 10 Years (2014–2024)">Last 10 Years (2014–2024)</option>
                    <option value="Recent 2023–2024 Only">Recent 2023–2024 Only</option>
                    <option value="All Available PYQs">All Available PYQs</option>
                  </select>
                </div>
              </div>

              {/* Scheduled Date & Questions Count */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Scheduled Lecture Date *
                  </label>
                  <input
                    type="date"
                    required
                    min={minDate}
                    value={lectureDate}
                    onChange={(e) => setLectureDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-slate-700 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Min 2 days advance (≥ {minDate})
                  </span>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Estimated PYQ Count
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={estimatedQuestions}
                    onChange={(e) => setEstimatedQuestions(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-slate-700 font-mono"
                  />
                </div>
              </div>

              {/* Reference Material URL */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Specific Question Sheet / Reference Link (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={referenceUrl}
                  onChange={(e) => setReferenceUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-slate-700"
                />
              </div>

              {/* Special Instructions */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Notes / Specific Questions for Slide Team
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Include 2023 End-Term 10-marker questions, step-by-step trace tables."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-slate-700 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors"
                >
                  Submit Request →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
