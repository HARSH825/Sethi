// src/components/Layout/MainLayout.tsx
import React, { useState, useEffect } from 'react';
import SaarthiSidebar from '@/components/Saarthi/SaarthiSidebar';
import { UserProfile } from '@/types';
import profileManager from '@/services/profileManager';

interface MainLayoutProps {
  children: React.ReactNode;
}

export interface PageData {
  userId?: string;
  schemeId?: string;
  recommendations?: any[];
  [key: string]: any;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<string>('welcome');
  const [pageData, setPageData] = useState<PageData>({});
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Initialize user profile
    const initProfile = async () => {
      const profile = await profileManager.initializeProfile();
      setUserProfile(profile);
      
      if (profile) {
        setCurrentPage('recommendations');
      } else {
        setCurrentPage('welcome');
      }
    };

    initProfile();
  }, []);

  const handlePageChange = (page: string, data?: PageData) => {
    console.log('📄 Page change:', page, data);
    setCurrentPage(page);
    setPageData(data || {});
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative">
      
      {/* Main Content Area */}
      <div className={`transition-all duration-300 ${isSidebarOpen ? 'mr-96' : 'mr-0'}`}>
        <main className="min-h-screen">
          {React.cloneElement(children as React.ReactElement<{currentPage: string; pageData: PageData; onPageChange: (page: string, data?: PageData) => void; userProfile: UserProfile | null;}>, {
            currentPage,
            pageData,
            onPageChange: handlePageChange,
            userProfile
          })}
        </main>
      </div>

      {/* Saarthi Sidebar */}
      <SaarthiSidebar
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
        currentPage={currentPage}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default MainLayout;
