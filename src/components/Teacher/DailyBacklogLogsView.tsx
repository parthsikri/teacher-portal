import React, { useState, useMemo } from 'react';
import type { TeacherDailyLogsInfo, Lecture } from '../../types';
import { StorageService } from '../../services/storage';
import { 
  Clock, CheckCircle2, AlertTriangle, 
  ChevronDown, ChevronRight, Search, Wallet, 
  Plus, Video, ExternalLink, Play, Sparkles, 
  ArrowUpDown, ShieldCheck, Info
} from 'lucide-react';

interface DailyBacklogLogsViewProps {
  teacherId: string;
  onOpenUpload?: (prefillTopic?: any) => void;
  onOpenWalletModal?: () => void;
  onPreviewLecture?: (lecture: Lecture) => void;
  isCompactModalView?: boolean;
}

export const DailyBacklogLogsView: React.FC<DailyBacklogLogsViewProps> = ({
  teacherId,
  onOpenUpload,
  onOpenWalletModal,
  onPreviewLecture,
  isCompactModalView = false,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'shortfall' | 'surplus' | 'completed' | 'leave'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const dailyLogsInfo: TeacherDailyLogsInfo = useMemo(() => {
    return StorageService.getTeacherDailyLogs(teacherId);
  }, [teacherId]);

  const walletInfo = useMemo(() => {
    return StorageService.getTimeWalletInfo(teacherId);
  }, [teacherId]);

  // Toggle expansion for a specific date
  const toggleDate = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedDates(new Set(dailyLogsInfo.logs.map((l) => l.date)));
  };

  const collapseAll = () => {
    setExpandedDates(new Set());
  };

  // Filter and sort logs
  const filteredLogs = useMemo(() => {
    let list = dailyLogsInfo.logs.slice();

    // Status filter
    if (filterStatus === 'shortfall') {
      list = list.filter((l) => l.status === 'shortfall' || (!l.isToday && l.shortfall > 0));
    } else if (filterStatus === 'surplus') {
      list = list.filter((l) => l.status === 'surplus' || l.surplus > 0);
    } else if (filterStatus === 'completed') {
      list = list.filter((l) => l.status === 'completed');
    } else if (filterStatus === 'leave') {
      list = list.filter((l) => l.isDayOff);
    }

    // Search query filter (matches date, day name, lecture title, subject, reason)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((l) => {
        if (l.date.toLowerCase().includes(q)) return true;
        if (l.dayOfWeek.toLowerCase().includes(q)) return true;
        if (l.formattedDate.toLowerCase().includes(q)) return true;
        if (l.dayOffReason && l.dayOffReason.toLowerCase().includes(q)) return true;
        if (l.lectures.some((lec) => 
          lec.title.toLowerCase().includes(q) || 
          lec.subject.toLowerCase().includes(q) || 
          (lec.unitNumber && lec.unitNumber.toLowerCase().includes(q)) ||
          lec.primaryTopic.toLowerCase().includes(q)
        )) return true;
        return false;
      });
    }

    // Sort order
    list.sort((a, b) => {
      return sortOrder === 'desc' 
        ? b.date.localeCompare(a.date)
        : a.date.localeCompare(b.date);
    });

    return list;
  }, [dailyLogsInfo, filterStatus, searchQuery, sortOrder]);

  return (
    <div className="space-y-5">
      {/* 1. HEADER & KPI CARDS (Only in Full View) */}
      {!isCompactModalView && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 font-black text-lg">
                  📅
                </span>
                <div>
                  <h2 className="text-xl font-bold text-slate-100 tracking-tight flex flex-wrap items-center gap-2">
                    Daily Recording & Backlog Logs
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-normal">
                      Faculty Audit Trail
                    </span>
                    {dailyLogsInfo.joiningDate && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-mono font-bold flex items-center gap-1">
                        🚀 Tracking Since: {dailyLogsInfo.joiningDate}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Day-by-day audit starting from your official joining date ({dailyLogsInfo.joiningDate || 'onboarding'}). Dates prior to joining are excluded, and approved leaves are excused with zero backlog debt.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenWalletModal && (
                <button
                  type="button"
                  onClick={onOpenWalletModal}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Wallet className="w-3.5 h-3.5" /> Time Wallet ({walletInfo.balance}m)
                </button>
              )}
              {onOpenUpload && (
                <button
                  type="button"
                  onClick={() => onOpenUpload()}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Upload Lecture
                </button>
              )}
            </div>
          </div>

          {/* 4 STAT SUMMARY CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Outstanding Backlog */}
            <div className={`p-4 rounded-2xl border transition-all ${
              dailyLogsInfo.remainingBacklogMinutes > 0
                ? 'bg-gradient-to-br from-rose-950/40 via-slate-900/80 to-slate-900/60 border-rose-900/50 shadow-lg shadow-rose-950/20'
                : 'bg-slate-900/50 border-slate-800'
            }`}>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center justify-between">
                <span>Net Late Backlog</span>
                {dailyLogsInfo.remainingBacklogMinutes > 0 ? (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold">Unrecorded</span>
                ) : (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">Cleared ✓</span>
                )}
              </div>
              <div className={`mt-1.5 text-2xl font-black font-mono ${
                dailyLogsInfo.remainingBacklogMinutes > 0 ? 'text-rose-300' : 'text-emerald-400'
              }`}>
                {dailyLogsInfo.remainingBacklogMinutes > 0 ? `${dailyLogsInfo.remainingBacklogMinutes} min` : '0 min'}
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                {dailyLogsInfo.remainingBacklogMinutes > 0 
                  ? `Across ${dailyLogsInfo.shortfallDaysCount} shortfall session${dailyLogsInfo.shortfallDaysCount === 1 ? '' : 's'}`
                  : 'All historical obligations fulfilled'}
              </p>
            </div>

            {/* Raw Historical Shortfall */}
            <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/50">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Raw Shortfall</div>
              <div className="mt-1.5 text-2xl font-black font-mono text-amber-300">
                {dailyLogsInfo.totalHistoricalShortfall} min
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                Gross unrecorded minutes before wallet offsets.
              </p>
            </div>

            {/* Wallet Offsets Applied */}
            <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/50">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Transferred Offsets</div>
              <div className="mt-1.5 text-2xl font-black font-mono text-purple-300">
                -{dailyLogsInfo.walletMinutesApplied} min
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                Surplus minutes applied to clear late debt.
              </p>
            </div>

            {/* Available Wallet Reserve */}
            <div className="p-4 rounded-2xl border border-indigo-900/40 bg-gradient-to-br from-indigo-950/40 via-slate-900/80 to-slate-900/60">
              <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 flex items-center justify-between">
                <span>Time Wallet Reserve</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold">Banked</span>
              </div>
              <div className="mt-1.5 text-2xl font-black font-mono text-indigo-200">
                +{walletInfo.balance} min
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                Surplus available to offset backlog anytime.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. FILTER TABS, SEARCH, AND EXPAND CONTROLS */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-3.5 space-y-3 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              All Days ({dailyLogsInfo.totalDaysLogged})
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus('shortfall')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                filterStatus === 'shortfall'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-950/40 text-rose-300 border border-rose-800/40 hover:bg-rose-900/60'
              }`}
            >
              <span>⚠️ Shortfalls</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px] font-mono">
                {dailyLogsInfo.shortfallDaysCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus('surplus')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                filterStatus === 'surplus'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 hover:bg-emerald-900/60'
              }`}
            >
              <span>🌟 Surplus</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px] font-mono">
                {dailyLogsInfo.surplusDaysCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus('completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                filterStatus === 'completed'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span>✓ Target Met</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px] font-mono">
                {dailyLogsInfo.completedDaysCount}
              </span>
            </button>

            {dailyLogsInfo.leaveDaysCount > 0 && (
              <button
                type="button"
                onClick={() => setFilterStatus('leave')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  filterStatus === 'leave'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-teal-950/40 text-teal-300 border border-teal-800/40 hover:bg-teal-900/60'
                }`}
              >
                <span>🏖️ Leaves</span>
                <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px] font-mono">
                  {dailyLogsInfo.leaveDaysCount}
                </span>
              </button>
            )}
          </div>

          {/* Search, Sort, and Accordion Controls */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search date, topic, lecture..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort Toggle */}
            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              title={sortOrder === 'desc' ? 'Showing Newest First' : 'Showing Oldest First'}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 px-2.5 border border-slate-700/60 cursor-pointer"
            >
              <ArrowUpDown className="w-3 h-3 text-indigo-400" />
              <span className="text-[10px] font-mono font-bold hidden sm:inline">
                {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
              </span>
            </button>

            {/* Expand / Collapse All */}
            <button
              type="button"
              onClick={expandedDates.size === filteredLogs.length ? collapseAll : expandAll}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold border border-slate-700/60 cursor-pointer shrink-0"
            >
              {expandedDates.size === filteredLogs.length ? 'Collapse All' : 'Expand All'}
            </button>
          </div>
        </div>
      </div>

      {/* 3. DAILY LOGS ACCORDION LIST */}
      <div className="space-y-2.5">
        {filteredLogs.length === 0 ? (
          <div className="p-8 bg-slate-900/60 border border-slate-800/80 rounded-2xl text-center space-y-2">
            <div className="text-3xl">🔍</div>
            <div className="text-sm font-bold text-slate-300">No Daily Logs Found</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No daily recording entries match your current filter ({filterStatus}) or search query ("{searchQuery}").
            </p>
            <button
              type="button"
              onClick={() => {
                setFilterStatus('all');
                setSearchQuery('');
              }}
              className="mt-2 px-3.5 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs font-semibold rounded-xl border border-indigo-500/30"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = expandedDates.has(log.date);

            return (
              <div
                key={log.date}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  log.isToday
                    ? 'bg-slate-900/90 border-indigo-500/50 shadow-md shadow-indigo-950/30'
                    : log.isDayOff
                    ? 'bg-slate-900/70 border-teal-900/40'
                    : log.status === 'shortfall' || (!log.isToday && log.shortfall > 0)
                    ? 'bg-slate-900/80 border-rose-900/40 hover:border-rose-800/60'
                    : log.status === 'surplus'
                    ? 'bg-slate-900/70 border-emerald-900/40 hover:border-emerald-800/60'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Accordion Row Header */}
                <div
                  onClick={() => toggleDate(log.date)}
                  className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-800/30 transition-colors"
                >
                  {/* Left: Date, Day, Badges */}
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-200 shrink-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      )}
                    </button>

                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-slate-100 text-sm">
                          {log.formattedDate}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          ({log.dayOfWeek})
                        </span>

                        {log.isToday && (
                          <span className="px-2 py-0.2 rounded-md text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 animate-pulse">
                            TODAY
                          </span>
                        )}

                        {log.isYesterday && (
                          <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300">
                            Yesterday
                          </span>
                        )}

                        {log.isDayOff && (
                          <span className="px-2 py-0.2 rounded-md text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1">
                            <span>🏖️ Excused Leave</span>
                          </span>
                        )}
                      </div>

                      {/* Sub-label */}
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                        <span>
                          Target: <strong className="text-slate-300 font-mono">{log.dailyTarget}m</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Delivered:{' '}
                          <strong className={`font-mono ${
                            log.recordedMinutes > 0 ? 'text-slate-200 font-bold' : 'text-slate-500'
                          }`}>
                            {log.recordedMinutes}m
                          </strong>{' '}
                          ({log.lectureCount} session{log.lectureCount === 1 ? '' : 's'})
                        </span>
                        {log.dayOffReason && (
                          <>
                            <span>•</span>
                            <span className="text-teal-300 italic text-[10px]">
                              "{log.dayOffReason}"
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Outcome Status Pill & Action */}
                  <div className="flex items-center gap-3 shrink-0 self-start md:self-center pl-7 md:pl-0">
                    {/* Status Pill */}
                    {log.isToday ? (
                      <span className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border flex items-center gap-1.5 ${
                        log.recordedMinutes >= log.dailyTarget && log.dailyTarget > 0
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                      }`}>
                        <Clock className="w-3.5 h-3.5" />
                        {log.recordedMinutes >= log.dailyTarget
                          ? `Target Met (${log.recordedMinutes}m)`
                          : `In Progress (${log.recordedMinutes}m / ${log.dailyTarget}m)`}
                      </span>
                    ) : log.isDayOff ? (
                      <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-teal-500/10 text-teal-300 border border-teal-500/30 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" /> 0m Target • No Backlog
                      </span>
                    ) : log.shortfall > 0 ? (
                      <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 shadow-sm">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        ⚠️ {log.shortfall}m Backlog Shortfall
                      </span>
                    ) : log.surplus > 0 ? (
                      <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        +{log.surplus}m Surplus Banked
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Target Met ({log.dailyTarget}m)
                      </span>
                    )}

                    <span className="text-[10px] text-slate-500 font-semibold underline hidden sm:inline">
                      {isExpanded ? 'Hide Details' : 'Crosscheck ➔'}
                    </span>
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 bg-slate-950/50 space-y-3">
                    {/* Day Crosscheck Summary Info */}
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-200 flex items-center gap-2">
                          <span>Audit Calculation Breakdown:</span>
                          <span className="font-mono text-[11px] text-slate-400">
                            {log.recordedMinutes}m recorded - {log.dailyTarget}m target ={' '}
                            <strong className={
                              log.surplus > 0
                                ? 'text-emerald-400 font-bold'
                                : log.shortfall > 0
                                ? 'text-rose-400 font-bold'
                                : 'text-slate-200 font-bold'
                            }>
                              {log.surplus > 0 ? `+${log.surplus}m surplus` : log.shortfall > 0 ? `-${log.shortfall}m shortfall` : '0m diff'}
                            </strong>
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {log.isDayOff
                            ? 'Approved Faculty Leave: quota was excused by Academic Operations with zero shortfall penalty.'
                            : log.shortfall > 0
                            ? `This date contributed ${log.shortfall} minutes to historical late backlog because daily recording was below target.`
                            : log.surplus > 0
                            ? `This date earned +${log.surplus} extra minutes that were deposited into your Time Wallet.`
                            : 'Daily quota target was exactly met.'}
                        </p>
                      </div>

                      {/* Quick Resolution Actions */}
                      {log.shortfall > 0 && !log.isToday && (
                        <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                          {onOpenWalletModal && walletInfo.balance > 0 && (
                            <button
                              type="button"
                              onClick={onOpenWalletModal}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-sm"
                            >
                              <Wallet className="w-3 h-3" /> Offset with Wallet
                            </button>
                          )}
                          {onOpenUpload && (
                            <button
                              type="button"
                              onClick={() => onOpenUpload()}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[10px] flex items-center gap-1 border border-slate-700"
                            >
                              <Plus className="w-3 h-3" /> Record Catch-up
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Delivered Lectures List */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Delivered Lecture Sessions ({log.lectures.length})</span>
                        <span className="font-mono text-[10px] text-slate-500">
                          Sum: {log.recordedMinutes} min
                        </span>
                      </div>

                      {log.lectures.length === 0 ? (
                        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-400 italic text-center space-y-1">
                          <p className="font-medium text-slate-300">
                            {log.isDayOff 
                              ? '🏖️ Excused Day Off - No lectures were scheduled or required.'
                              : '⚠️ No lecture recordings were submitted on this date.'}
                          </p>
                          {!log.isDayOff && log.dailyTarget > 0 && (
                            <p className="text-[11px] text-slate-500">
                              (Target was {log.dailyTarget}m, resulting in -{log.shortfall}m shortfall to backlog).
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2">
                          {log.lectures.map((lecture, idx) => {
                            const submitTime = new Date(lecture.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            });

                            return (
                              <div
                                key={lecture.id || idx}
                                className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-slate-700 transition-colors"
                              >
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="w-5 h-5 rounded-lg bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-black flex items-center justify-center shrink-0">
                                      #{idx + 1}
                                    </span>
                                    <span className="font-bold text-slate-100 truncate">
                                      {lecture.title}
                                    </span>
                                    {lecture.unitNumber && (
                                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] font-mono text-indigo-300 border border-slate-700">
                                        {lecture.unitNumber}
                                      </span>
                                    )}
                                    <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold ${
                                      lecture.status === 'on_time'
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : lecture.status === 'late'
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                        : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    }`}>
                                      {lecture.status === 'on_time' ? 'On Time' : lecture.status === 'late' ? 'Late' : 'Extended'}
                                    </span>
                                  </div>

                                  <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                                    <span>Subject: <strong className="text-slate-300">{lecture.subject}</strong></span>
                                    {lecture.primaryTopic && (
                                      <>
                                        <span>•</span>
                                        <span>Topic: <strong className="text-slate-300">{lecture.primaryTopic}</strong></span>
                                      </>
                                    )}
                                    <span>•</span>
                                    <span className="text-slate-500 font-mono">Submitted at {submitTime}</span>
                                  </div>
                                </div>

                                {/* Right: Duration & Actions */}
                                <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
                                  <div className="px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-800/60 text-indigo-200 font-mono font-bold text-xs">
                                    ⏱️ {lecture.durationMinutes || 45} min
                                  </div>

                                  {onPreviewLecture && (
                                    <button
                                      type="button"
                                      onClick={() => onPreviewLecture(lecture)}
                                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer"
                                      title="Preview Lecture Details"
                                    >
                                      <Play className="w-3.5 h-3.5 text-indigo-400" />
                                    </button>
                                  )}

                                  {lecture.youtubeUrl && (
                                    <a
                                      href={lecture.youtubeUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 transition-colors"
                                      title="Open Video URL"
                                    >
                                      <Video className="w-3.5 h-3.5" />
                                    </a>
                                  )}

                                  {lecture.driveUrl && (
                                    <a
                                      href={lecture.driveUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 transition-colors"
                                      title="Open Drive Folder"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 4. AUDIT TRANSPARENCY EXPLANATION FOOTER */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-400 flex items-start gap-3">
        <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-slate-200">How Daily Backlog is Audited:</div>
          <p className="text-[11px] leading-relaxed text-slate-400">
            For every working date, your delivered lecture recording minutes are compared against your required daily quota target (e.g. 120m). 
            Any shortfall on a past date is tracked as late backlog debt. Recording beyond your daily target generates positive surplus in your 
            <strong> Time Wallet</strong>, which can be applied to offset historical shortfalls at any time. 
            Approved Faculty Leaves grant an excused 0 min target with zero debt penalty.
          </p>
        </div>
      </div>
    </div>
  );
};
