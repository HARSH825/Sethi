// src/App.tsx (COMPLETE AFTER PHASE 1)
import React from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import WelcomePage from '@/components/Pages/WelcomePage';
import RecommendationsPage from '@/components/Pages/RecommendationsPage';
import SchemeDetailsPage from '@/components/Pages/SchemeDetailsPage';
import { UserProfile } from '@/types';

interface AppPageProps {
  currentPage: string;
  pageData: any;
  onPageChange: (page: string, data?: any) => void;
  userProfile: UserProfile | null;
}

const AppRouter: React.FC<AppPageProps> = ({ currentPage, pageData, onPageChange, userProfile }) => {
  
  const renderPage = () => {
    switch (currentPage) {
      case 'welcome':
        return <WelcomePage onPageChange={onPageChange} />;
        
      case 'recommendations':
        return (
          <RecommendationsPage 
            pageData={pageData}
            userProfile={userProfile}
            onPageChange={onPageChange}
          />
        );
        
      case 'scheme-details':
        return (
          <SchemeDetailsPage 
            pageData={pageData}
            userProfile={userProfile}
            onPageChange={onPageChange}
          />
        );
        
      default:
        return <WelcomePage onPageChange={onPageChange} />;
    }
  };

  return renderPage();
};

function App() {
  return (
    <MainLayout>
      <AppRouter />
    </MainLayout>
  );
}

export default App;
