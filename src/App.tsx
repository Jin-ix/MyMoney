import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { CardSkeleton, TransactionSkeleton, ChartSkeleton } from '@/components/ui/Skeleton';
import { useStore } from '@/store/useStore';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Transactions = lazy(() => import('@/pages/Transactions'));
const Budgets = lazy(() => import('@/pages/Budgets'));
const Reports = lazy(() => import('@/pages/Reports'));
const More = lazy(() => import('@/pages/More'));
const SavingsGoals = lazy(() => import('@/pages/SavingsGoals'));
const RecurringPayments = lazy(() => import('@/pages/RecurringPayments'));
const Accounts = lazy(() => import('@/pages/Accounts'));
const Settings = lazy(() => import('@/pages/Settings'));

function PageFallback() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <ChartSkeleton />
      <div className="space-y-2">
        <TransactionSkeleton />
        <TransactionSkeleton />
        <TransactionSkeleton />
      </div>
    </div>
  );
}

export default function App() {
  const initialize = useStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route
            path="/"
            element={
              <Suspense fallback={<PageFallback />}>
                <Dashboard />
              </Suspense>
            }
          />
          <Route
            path="/transactions"
            element={
              <Suspense fallback={<PageFallback />}>
                <Transactions />
              </Suspense>
            }
          />
          <Route
            path="/budgets"
            element={
              <Suspense fallback={<PageFallback />}>
                <Budgets />
              </Suspense>
            }
          />
          <Route
            path="/reports"
            element={
              <Suspense fallback={<PageFallback />}>
                <Reports />
              </Suspense>
            }
          />
          <Route
            path="/more"
            element={
              <Suspense fallback={<PageFallback />}>
                <More />
              </Suspense>
            }
          />
          <Route
            path="/savings-goals"
            element={
              <Suspense fallback={<PageFallback />}>
                <SavingsGoals />
              </Suspense>
            }
          />
          <Route
            path="/recurring-payments"
            element={
              <Suspense fallback={<PageFallback />}>
                <RecurringPayments />
              </Suspense>
            }
          />
          <Route
            path="/accounts"
            element={
              <Suspense fallback={<PageFallback />}>
                <Accounts />
              </Suspense>
            }
          />
          <Route
            path="/settings"
            element={
              <Suspense fallback={<PageFallback />}>
                <Settings />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
