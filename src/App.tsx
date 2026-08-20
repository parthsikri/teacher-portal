import React, { useState, useEffect } from 'react';
import type { User, AssignedTopic } from './types';
import { StorageService } from './services/storage';
import { Sidebar } from './components/Sidebar';
import { LoginModal } from './components/Auth/LoginModal';
import { TeacherView } from './components/Teacher/TeacherView';
import { AdminView } from './components/Admin/AdminView';
import { UploadLectureModal } from './components/Teacher/UploadLectureModal';
import { DailyCommitmentModal } from './components/Teacher/DailyCommitmentModal';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showCommitmentModal, setShowCommitmentModal] = useState<boolean>(false);
  const [activePrefillTopic, setActivePrefillTopic] = useState<AssignedTopic | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  useEffect(() => {
    const user = StorageService.getCurrentUser();
    setCurrentUser(user);
    if (user) {
      setCurrentPage(user.role === 'admin' ? 'admin_dashboard' : 'dashboard');
      // If teacher logged in and hasn't set today's upload commitment, prompt them
      if (user.role === 'teacher') {
        const commitment = StorageService.getDailyCommitment(user.teacherId);
        if (!commitment) {
          setShowCommitmentModal(true);
        }
      }
    }
  }, []);

  const handleLoginSuccess = (user: User) => {
    StorageService.setCurrentUser(user);
    setCurrentUser(user);
    setCurrentPage(user.role === 'admin' ? 'admin_dashboard' : 'dashboard');
    
    // Check if teacher needs to set today's upload time commitment
    if (user.role === 'teacher') {
      const commitment = StorageService.getDailyCommitment(user.teacherId);
      if (!commitment) {
        setShowCommitmentModal(true);
      }
    }
  };

  const handleLogout = () => {
    StorageService.setCurrentUser(null);
    setCurrentUser(null);
    setCurrentPage('dashboard');
    setShowCommitmentModal(false);
  };

  const handleRefreshData = () => {
    setRefreshKey((prev) => prev + 1);
    setCurrentUser(StorageService.getCurrentUser());
  };

  const handleOpenUpload = (topic?: AssignedTopic) => {
    setActivePrefillTopic(topic || null);
    setShowUploadModal(true);
  };

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white font-sans antialiased flex">
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
            onOpenCommitmentModal={() => setShowCommitmentModal(true)}
          />

          {/* MAIN APPLICATION VIEW (OFFSET BY LEFT SIDEBAR) */}
          <div className="flex-1 md:pl-64 lg:pl-72 flex flex-col min-h-screen">
            <main key={refreshKey} className="flex-1 pt-16 md:pt-4 pb-16">
              {currentUser.role === 'admin' ? (
                <AdminView
                  currentPage={currentPage}
                  onPageChange={handlePageChange}
                  onRefreshData={handleRefreshData}
                />
              ) : (
                <TeacherView
                  teacher={currentUser}
                  currentPage={currentPage}
                  onPageChange={handlePageChange}
                  onOpenUpload={handleOpenUpload}
                  onOpenCommitmentModal={() => setShowCommitmentModal(true)}
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
              isMandatoryLoginPrompt={!StorageService.getDailyCommitment(currentUser.teacherId)}
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
