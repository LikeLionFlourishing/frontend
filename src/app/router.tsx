import { createBrowserRouter, Navigate } from 'react-router-dom';
import { TabLayout } from './layouts/TabLayout';
import { RequireAuth } from './RequireAuth';

import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { HomePage } from '@/pages/HomePage';
import { ReportFlowPage } from '@/pages/ReportFlowPage';
import { ReportResultPage } from '@/pages/ReportResultPage';
import { FollowUpPage } from '@/pages/FollowUpPage';
import { RecordsPage } from '@/pages/RecordsPage';
import { RecordDetailPage } from '@/pages/RecordDetailPage';
import { MyPage } from '@/pages/MyPage';
import { ProfilePage } from '@/pages/my/ProfilePage';
import { AccountPage } from '@/pages/my/AccountPage';
import { NotificationsPage } from '@/pages/my/NotificationsPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },

  {
    element: <RequireAuth />,
    children: [
      { path: '/onboarding', element: <OnboardingPage /> },

      // 피부점호와 경과 확인은 몰입 흐름이라 하단 탭 밖에 둔다.
      { path: '/report', element: <ReportFlowPage /> },
      { path: '/report/result/:reportId', element: <ReportResultPage /> },
      { path: '/follow-up/:reportId', element: <FollowUpPage /> },

      {
        element: <TabLayout />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/records', element: <RecordsPage /> },
          { path: '/records/:reportId', element: <RecordDetailPage /> },
          { path: '/my', element: <MyPage /> },
          { path: '/my/profile', element: <ProfilePage /> },
          { path: '/my/account', element: <AccountPage /> },
          { path: '/my/notifications', element: <NotificationsPage /> },
        ],
      },
    ],
  },

  { path: '*', element: <Navigate to="/" replace /> },
]);
