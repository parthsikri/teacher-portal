import React, { useState, useEffect } from 'react';
import type { User, AssignedTopic } from './types';
import { StorageService } from './services/storage';
import { Sidebar } from './components/Sidebar';
import { LoginModal } from './components/Auth/LoginModal';
import { TeacherView } from './components/Teacher/TeacherView';
import { AdminView } from './components/Admin/AdminView';
import { UploadLectureModal } from './components/Teacher/UploadLectureModal';
import { DailyCommitmentModal } from './components/Teacher/DailyCommitmentModal';

import { PptGenerator } from './components/Common/PptGenerator';
import { ThumbnailStudio } from './components/Common/ThumbnailStudio';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showCommitmentModal, setShowCommitmentModal] = useState<boolean>(false);
  const [activePrefillTopic, setActivePrefillTopic] = useState<AssignedTopic | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  useEffect(() => {
    // Validate session token with server on initial application boot
    const validateActiveSession = async () => {
      const token = StorageService.getSessionToken();
      if (!token) {
        StorageService.setCurrentUser(null);
        setCurrentUser(null);
        return;
      }

      try {
        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ action: 'me' }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            StorageService.setCurrentUser(data.user);
            setCurrentUser(data.user);
            setCurrentPage(data.user.role === 'admin' ? 'admin_dashboard' : 'dashboard');
            return;
          }
        }

        // Invalid or expired token: clear session
        StorageService.clearSessionToken();
        StorageService.setCurrentUser(null);
        setCurrentUser(null);
      } catch {
        // In offline/network failure, keep existing cached user
      }
    };

    validateActiveSession();

    // Initialize real-time cross-device cloud sync
    const cleanup = StorageService.initCloudSync(() => {
      const user = StorageService.getCurrentUser();
      if (user) {
        setCurrentUser((prevUser) => {
          if (prevUser && prevUser.role !== user.role) {
            setCurrentPage(user.role === 'admin' ? 'admin_dashboard' : 'dashboard');
          }
          return user;
        });
      } else {
        setCurrentUser(null);
        setCurrentPage('dashboard');
      }
      setRefreshKey((prev) => prev + 1);
    });

    const user = StorageService.getCurrentUser();
    setCurrentUser(user);
    if (user) {
      setCurrentPage(user.role === 'admin' ? 'admin_dashboard' : 'dashboard');
      // Prompt ONLY if teacher is logging in for the first time without a set cutoff time
      if (user.role === 'teacher') {
        const needsFirstTimeSetup = !user.hasSetInitialCommitment && !user.dailyUploadCutoffTime;
        if (needsFirstTimeSetup) {
          setShowCommitmentModal(true);
        }
      }
    }

    return () => {
      cleanup();
    };
  }, []);

  const handleLoginSuccess = (user: User) => {
    StorageService.setCurrentUser(user);
    setCurrentUser(user);
    setCurrentPage(user.role === 'admin' ? 'admin_dashboard' : 'dashboard');
    
    // Prompt ONLY on first-time login
    if (user.role === 'teacher') {
      const needsFirstTimeSetup = !user.hasSetInitialCommitment && !user.dailyUploadCutoffTime;
      if (needsFirstTimeSetup) {
        setShowCommitmentModal(true);
      }
    }
  };

  const handleLogout = () => {
    // Notify server of logout (fire-and-forget)
    const token = StorageService.getSessionToken();
    if (token) {
      fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'logout' }),
      }).catch(() => {});
    }

    StorageService.clearSessionToken();
    StorageService.setCurrentUser(null);
    setCurrentUser(null);
    setCurrentPage('dashboard');
    setShowCommitmentModal(false);
  };

  const handleRefreshData = () => {
    setRefreshKey((prev) => prev + 1);
    const user = StorageService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
  };

  const handleOpenUpload = (topic?: AssignedTopic) => {
    setActivePrefillTopic(topic || null);
    setShowUploadModal(true);
  };

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white font-sans antialiased">
      {!currentUser ? (
        <LoginModal onLoginSuccess={handleLoginSuccess} />
      ) : (
        <>
          {/* FULL LEFT-SIDE NAVIGATION SIDEBAR */}
          <Sidebar
            currentUser={currentUser}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            onLogout={handleLogout}
            onRefreshData={handleRefreshData}
          />

          {/* MAIN APPLICATION VIEW — sidebar is fixed, so we just pad-left to offset */}
          <div className="min-h-screen md:pl-64 lg:pl-72" style={{ overflowX: 'hidden' }}>
            <main className="pt-16 md:pt-4 pb-16">
              {currentPage === 'ppt_generator' ? (
                <PptGenerator
                  userSubject={currentUser.subject || currentUser.department || 'General'}
                  userName={currentUser.name}
                />
              ) : currentPage === 'thumbnail_generator' && currentUser.role === 'admin' ? (
                <ThumbnailStudio
                  initialSubject={currentUser.subject || currentUser.department || 'General'}
                  initialTeacherName={undefined}
                  initialTeacherId={undefined}
                />
              ) : currentUser.role === 'admin' ? (
                <AdminView
                  currentPage={currentPage}
                  onPageChange={handlePageChange}
                  onRefreshData={handleRefreshData}
                  refreshTrigger={refreshKey}
                />
              ) : (
                <TeacherView
                  teacher={currentUser}
                  currentPage={currentPage}
                  onPageChange={handlePageChange}
                  onOpenUpload={handleOpenUpload}
                  refreshTrigger={refreshKey}
                />
              )}
            </main>
          </div>

          {/* DAILY UPLOAD COMMITMENT MODAL */}
          {showCommitmentModal && currentUser.role === 'teacher' && (
            <DailyCommitmentModal
              teacher={currentUser}
              onClose={() => setShowCommitmentModal(false)}
              onSuccess={() => {
                setShowCommitmentModal(false);
                handleRefreshData();
              }}
              isMandatoryLoginPrompt={!currentUser.hasSetInitialCommitment && !currentUser.dailyUploadCutoffTime}
            />
          )}

          {/* UPLOAD LECTURE MODAL */}
          {showUploadModal && currentUser.role === 'teacher' && (
            <UploadLectureModal
              teacher={currentUser}
              prefillTopic={activePrefillTopic}
              onClose={() => {
                setShowUploadModal(false);
                setActivePrefillTopic(null);
              }}
              onSuccess={() => {
                setShowUploadModal(false);
                setActivePrefillTopic(null);
                handleRefreshData();
              }}
            />
          )}
        </>
      )}
    </div>
  );
};

export default App;
