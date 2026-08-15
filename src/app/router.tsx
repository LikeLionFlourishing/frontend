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

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },

  {
    element: <RequireAuth />,
    children: [
      { path: '/onboarding', element: <OnboardingPage /> },

      // 피부점호와 경과 확인은 몰입 흐름이라 하단 탭 밖에 둔다.
      { path: '/report', element: <ReportFlowPage /> },
      { path: '/follow-up/:reportId', element: <FollowUpPage /> },

      {
        element: <TabLayout />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/records', element: <RecordsPage /> },
          { path: '/records/:reportId', element: <RecordDetailPage /> },
          /*
           * 결과 화면은 탭 루트가 아니지만 시안(30:39213)에 하단 탭바가 있다.
           * 어느 탭에도 걸리지 않아 활성 표시 없이 원 세 개만 뜬다 — 시안과 같다.
           */
          { path: '/report/result/:reportId', element: <ReportResultPage /> },
          { path: '/my', element: <MyPage /> },
        ],
      },
    ],
  },

  { path: '*', element: <Navigate to="/" replace /> },
]);
