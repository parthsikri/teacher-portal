import React, { useState, useMemo, useEffect } from 'react';
import type { User } from '../../types';
import { WebDevService } from '../../services/webDevService';
import {
  Trophy,
  Medal,
  Crown,
  Search,
  Users,
  Flame,
  Sparkles,
  BookOpen,
  Code2,
  TrendingUp,
  PhoneCall,
  Shield
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface OrganizationLeaderboardViewProps {
  currentUser: User;
  onPageChange?: (page: string) => void;
}

export const OrganizationLeaderboardView: React.FC<OrganizationLeaderboardViewProps> = ({
  currentUser,
}) => {
  const [period, setPeriod] = useState<'all_time' | 'monthly' | 'weekly'>('all_time');
  const [deptFilter, setDeptFilter] = useState<'all' | 'faculty' | 'engineering' | 'pr' | 'sales' | 'leadership'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);

  // Subscribe to local storage updates
  useEffect(() => {
    const handleUpdate = () => setRefreshTick((prev) => prev + 1);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('aew_webdev_tasks_synced', handleUpdate);
    window.addEventListener('portal_storage_update', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('aew_webdev_tasks_synced', handleUpdate);
      window.removeEventListener('portal_storage_update', handleUpdate);
    };
  }, []);

  // Compute leaderboard entries
  const leaderboardData = useMemo(() => {
    return WebDevService.getLeaderboard(period, deptFilter as any);
  }, [period, deptFilter, refreshTick]);

  // Filtered by search
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return leaderboardData;
    const q = searchQuery.toLowerCase().trim();
    return leaderboardData.filter(
      (entry) =>
        entry.userName.toLowerCase().includes(q) ||
        entry.userTitle.toLowerCase().includes(q) ||
        entry.department.toLowerCase().includes(q) ||
        entry.userId.toLowerCase().includes(q)
    );
  }, [leaderboardData, searchQuery]);

  // Find current user's standing
  const myStanding = useMemo(() => {
    const cleanId = (currentUser.teacherId || currentUser.id || '').toUpperCase();
    return leaderboardData.find(
      (entry) => entry.userId.toUpperCase() === cleanId
    );
  }, [leaderboardData, currentUser]);

  // Top 3 Podium Winners
  const podiumWinners = useMemo(() => {
    return leaderboardData.slice(0, 3);
  }, [leaderboardData]);

  // Department Stats
  const deptSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    const scores: Record<string, number> = {};
    leaderboardData.forEach((item) => {
      counts[item.department] = (counts[item.department] || 0) + 1;
      scores[item.department] = (scores[item.department] || 0) + item.totalXp;
    });

    let topDept = 'Academic Faculty';
    let maxScore = -1;
    Object.entries(scores).forEach(([d, s]) => {
      if (s > maxScore) {
        maxScore = s;
        topDept = d;
      }
    });

    return { counts, scores, topDept };
  }, [leaderboardData]);

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#6366f1', '#10b981', '#ec4899'],
      });
    } catch {}
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* ─── HERO HEADER ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/20 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono font-bold tracking-wide">
              <Trophy className="w-4 h-4 text-amber-400" /> APNA ENGINEERING WALLAH CHAMPIONSHIP
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              Organization Leaderboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Transparent, company-wide merit standings recognizing high-velocity lecture delivery, engineering solutions, corporate sponsorships, and operations excellence.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={triggerCelebration}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" /> Celebrate Leaders
            </button>
          </div>
        </div>

        {/* ─── QUICK STANDING TILES ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-slate-800/80">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" /> Total Active Staff
            </span>
            <div className="text-xl sm:text-2xl font-black text-white">
              {leaderboardData.length} Members
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-400" /> Current Rank #1
            </span>
            <div className="text-xl sm:text-2xl font-black text-amber-300 truncate" title={podiumWinners[0]?.userName}>
              {podiumWinners[0]?.userName || 'N/A'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-rose-400" /> Top Department
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-200 truncate" title={deptSummary.topDept}>
              {deptSummary.topDept}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-1">
            <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <Medal className="w-3.5 h-3.5 text-indigo-400" /> Your Standing
            </span>
            <div className="text-xl sm:text-2xl font-black text-white">
              {myStanding ? `#${myStanding.rank} (${myStanding.totalXp.toLocaleString()} pts)` : 'Unranked'}
            </div>
          </div>
        </div>
      </div>

      {/* ─── PODIUM: TOP 3 ACHIEVERS ─────────────────────────────────────── */}
      {podiumWinners.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" /> Company Podium Achievers
            </h2>
            <span className="text-xs text-slate-500">
              {period === 'all_time' ? 'All-Time Honor Roll' : period === 'monthly' ? 'Monthly Leaders' : 'Weekly Sprints'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {podiumWinners.map((winner, idx) => {
              const isFirst = idx === 0;
              const isSecond = idx === 1;

              const borderClass = isFirst
                ? 'border-amber-500/50 bg-gradient-to-b from-amber-500/10 via-slate-900 to-slate-950 shadow-xl shadow-amber-500/10 ring-1 ring-amber-500/30'
                : isSecond
                ? 'border-slate-500/40 bg-gradient-to-b from-slate-400/10 via-slate-900 to-slate-950 shadow-lg'
                : 'border-amber-700/40 bg-gradient-to-b from-amber-700/10 via-slate-900 to-slate-950 shadow-lg';

              const badgeColors = isFirst
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-amber-500/30 ring-1 ring-amber-300'
                : isSecond
                ? 'bg-gradient-to-r from-slate-200 to-slate-400 text-slate-950 font-black shadow-slate-400/30 ring-1 ring-slate-200'
                : 'bg-gradient-to-r from-amber-700 to-amber-900 text-amber-100 font-bold shadow-amber-900/30 ring-1 ring-amber-600';

              const rankLabel = isFirst ? '🥇 1st Place' : isSecond ? '🥈 2nd Place' : '🥉 3rd Place';

              return (
                <div
                  key={winner.userId}
                  className={`relative rounded-3xl border p-6 text-center space-y-4 transition-all hover:scale-[1.01] ${borderClass}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`inline-block px-3 py-1 rounded-full text-[11px] uppercase tracking-wider ${badgeColors}`}>
                      {rankLabel}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      Lvl {winner.userLevel}
                    </span>
                  </div>

                  <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-400 via-indigo-500 to-purple-500 p-0.5 shadow-xl">
                    <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center font-black text-2xl text-amber-300 overflow-hidden">
                      {winner.avatarUrl ? (
                        <img src={winner.avatarUrl} alt={winner.userName} className="w-full h-full object-cover" />
                      ) : (
                        winner.userName.charAt(0)
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-white flex items-center justify-center gap-1.5">
                      {winner.userName}
                      {winner.userId.toUpperCase() === (currentUser.teacherId || currentUser.id || '').toUpperCase() && (
                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold">
                          YOU
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-medium">{winner.userTitle}</p>
                    <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800/80 text-slate-300 border border-slate-700/80">
                      {winner.department}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80">
                    <div className="text-2xl font-black text-amber-400">
                      {winner.totalXp.toLocaleString()} <span className="text-xs font-semibold text-slate-400">Score</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 truncate px-2" title={winner.highlights}>
                      {winner.highlights || 'High-impact contribution'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── CONTROLS: PERIOD, DEPARTMENT TABS, SEARCH ───────────────────── */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 md:p-6 space-y-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Department Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'All Departments', icon: Users },
              { id: 'faculty', label: 'Academic Faculty', icon: BookOpen },
              { id: 'engineering', label: 'Engineering', icon: Code2 },
              { id: 'pr', label: 'Growth & PR', icon: TrendingUp },
              { id: 'sales', label: 'Business & Sales', icon: PhoneCall },
              { id: 'leadership', label: 'Leadership', icon: Shield },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = deptFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setDeptFilter(tab.id as any)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    active
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Time Window Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 shrink-0 self-start md:self-auto">
            {[
              { id: 'all_time', label: 'All-Time' },
              { id: 'monthly', label: 'This Month' },
              { id: 'weekly', label: 'This Week' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  period === p.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search team member by name, ID, or title..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* ─── FULL ROSTER TABLE ─────────────────────────────────────────── */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800/80">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 text-center w-16">Rank</th>
                <th className="py-3.5 px-4">Team Member</th>
                <th className="py-3.5 px-4">Department & Role</th>
                <th className="py-3.5 px-4">Performance Highlights</th>
                <th className="py-3.5 px-4 text-center">Level</th>
                <th className="py-3.5 px-4 text-right">Total Score / XP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No team members found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((row) => {
                  const isCurrentUser =
                    row.userId.toUpperCase() === (currentUser.teacherId || currentUser.id || '').toUpperCase();

                  const isTop1 = row.rank === 1;
                  const isTop2 = row.rank === 2;
                  const isTop3 = row.rank === 3;

                  return (
                    <tr
                      key={row.userId}
                      className={`transition-colors ${
                        isCurrentUser
                          ? 'bg-indigo-950/30 hover:bg-indigo-900/40 ring-1 ring-inset ring-indigo-500/30'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center font-mono font-bold">
                        {isTop1 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 font-black border border-amber-500/30">
                            1
                          </span>
                        ) : isTop2 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-400/20 text-slate-200 font-black border border-slate-400/30">
                            2
                          </span>
                        ) : isTop3 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/20 text-amber-400 font-black border border-amber-700/30">
                            3
                          </span>
                        ) : (
                          <span className="text-slate-400">#{row.rank}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-xs text-indigo-300 border border-slate-700 shrink-0 overflow-hidden">
                            {row.avatarUrl ? (
                              <img src={row.avatarUrl} alt={row.userName} className="w-full h-full object-cover" />
                            ) : (
                              row.userName.charAt(0)
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-100 flex items-center gap-1.5">
                              {row.userName}
                              {isCurrentUser && (
                                <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[9px] font-mono font-black border border-indigo-500/30">
                                  YOU
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">{row.userId}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          row.department === 'Engineering'
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                            : row.department === 'Academic Faculty'
                            ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                            : row.department === 'Growth & PR'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : row.department === 'Business & Sales'
                            ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        }`}>
                          {row.department}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-0.5">{row.userTitle}</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-300 font-medium">
                        {row.highlights || 'Active Contributor'}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700/60 font-mono">
                          Lvl {row.userLevel}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="font-black text-amber-400 font-mono text-sm">
                          {row.totalXp.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium ml-1">pts</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
