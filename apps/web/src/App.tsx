import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginPage } from './pages/LoginPage';
import { EmailsPage } from './pages/EmailsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ComposeModal } from './components/ComposeModal';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [counts, setCounts] = useState({ inbox: 12, scheduled: 3, sent: 365 });

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00A36C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-white font-sans text-[#111827]">
      {/* Figma Matching Sidebar */}
      <Sidebar
        onOpenCompose={() => setIsComposeOpen(true)}
        counts={counts}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <main className="flex-1 overflow-y-auto">
          {React.cloneElement(children as React.ReactElement, {
            searchQuery,
            isComposeOpen,
            onCloseCompose: () => setIsComposeOpen(false),
            onOpenCompose: () => setIsComposeOpen(true),
            onCountsUpdate: setCounts
          })}
        </main>
      </div>

      {/* Global Compose Modal matching Figma Frame */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/emails"
            element={
              <AppLayout>
                <EmailsPage />
              </AppLayout>
            }
          />
          <Route
            path="/settings"
            element={
              <AppLayout>
                <SettingsPage />
              </AppLayout>
            }
          />
          <Route path="*" element={<Navigate to="/emails" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
