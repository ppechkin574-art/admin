import LoadingSpinner from '@/components/common/LoadingSpinner'
import ProtectedRoute from '@/components/common/ProtectedRoute'
import ErrorState from '@/components/common/ErrorState'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import QuestionList from '@/pages/questions/list'
import QuestionDetail from '@/pages/questions/details'
import LoginForm from '@/pages/LoginForm'
import SubjectDetail from '@/pages/subjects/details'
import SubjectForm from '@/pages/subjects/form'
import SubjectList from '@/pages/subjects/list'
import EntList from '@/pages/ents/list'
import TrainerDetail from '@/pages/trainers/details'
import TrainerForm from '@/pages/trainers/form'
import TrainerList from '@/pages/trainers/list'
import TopicList from '@/pages/topics/list'
import TopicForm from '@/pages/topics/form'
import TopicDetail from '@/pages/topics/details'
import EntForm from '@/pages/ents/form'
import EntDetail from '@/pages/ents/details'
import { SubjectCombinationsList } from './pages/subjectCombinations/list/SubjectCombinationsList'
import { SubjectCombinationForm } from './pages/subjectCombinations/form/SubjectCombinationForm'
import { SubjectCombinationDetail } from './pages/subjectCombinations/details/SubjectCombinationDetail'
import { PromocodeList } from './pages/promocodes/list'
import { PromocodeForm } from './pages/promocodes/form'
import { PromocodeHistory } from './pages/promocodes/history'
import { SubscriptionBenefitList } from './pages/content/subscription-benefits/list'
import { SubscriptionBenefitForm } from './pages/content/subscription-benefits/form'
import { AppSettingsList } from './pages/admin/app-settings'
import { ReferralPolicyForm } from './pages/referrals'
import { LeaderboardPrizesList } from './pages/leaderboardPrizes'
import { StreakRewardsList } from './pages/streakRewards'
import { StreakPushTemplatePage } from './pages/streakPushTemplate'
import { AppScreensPage } from './pages/appScreens/AppScreensPage'
import Layout from './components/layout/Layout'
import { ModuleList } from './pages/modules/ModuleList'
import ModuleDetail from './pages/modules/ModuleDetail'
import ModuleForm from './pages/modules/ModuleForm'
import LessonForm from './pages/modules/LessonForm'
import useAuthKeycloak from '@/hooks/useKeycloakAuth'
import { SubjectList as EntSubjectList } from '@/pages/subjects/list/NewSubjectList'
import { EntList as EntOptionList } from '@/pages/ents/list/NewEntList'
import { SubjectList as TrainerSubjectList } from '@/pages/subjects/list/NewSubjectList'
import { SubjectModuleList } from './pages/modules/SubjectModuleList'
import { UserList } from './pages/users/UserList'
import { UserForm } from './pages/users/UserForm'
import { UserDetail } from './pages/users/UserDetail'
import { MarketingDashboard } from './pages/marketing/MarketingDashboard'
import { PushNotifications } from './pages/marketing/PushNotifications'
import { PerformanceDashboard } from './pages/performance/PerformanceDashboard'

function App()
{
  const { isInitialized, isAuthenticated, error } = useAuthKeycloak()
  if (!isInitialized)
  {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner message="Инициализация системы..." />
      </div>
    )
  }

  if (error && !isAuthenticated)
  {
    return (
      <div className="flex items-center justify-center h-screen">
        <ErrorState
          variant="auth"
          title="Ошибка аутентификации"
          message={error}
          actionText="Попробовать снова"
          onRetry={() => window.location.reload()}
          size="large"
        />
      </div>
    )
  }

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginForm />} />

        <Route element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/modules" replace />} />

          <Route path="/ent-practice">
            <Route path="subjects" element={<EntSubjectList context="ent" />} />
            <Route path="options" element={<EntOptionList />} />
            <Route path="options/:id" element={<EntDetailWrapper />} />
          </Route>

          <Route path="/trainer-v2">
            <Route path="subjects" element={<TrainerSubjectList context="trainer" />} />
            <Route path="topics" element={<TopicList context="trainer" />} />
            <Route path="topics/:id" element={<TopicDetailWrapper />} />
          </Route>

          <Route path="/questions">
            <Route index element={<QuestionList />} />
            <Route path=":id" element={<QuestionDetailWrapper />} />
          </Route>

          <Route path="/subjects">
            <Route index element={<SubjectList />} />
            <Route path=":id" element={<SubjectDetailWrapper />} />
            <Route path=":id/edit" element={<SubjectForm />} />
            <Route path="create" element={<SubjectForm />} />
          </Route>

          <Route path="/topics">
            <Route index element={<TopicList />} />
            <Route path=":id" element={<TopicDetailWrapper />} />
            <Route path=":id/edit" element={<TopicForm />} />
            <Route path="create" element={<TopicForm />} />
          </Route>

          <Route path="/trainers">
            <Route index element={<TrainerList />} />
            <Route path=":id" element={<TrainerDetailWrapper />} />
            <Route path=":id/edit" element={<TrainerForm />} />
            <Route path="create" element={<TrainerForm />} />
          </Route>

          <Route path="/ents">
            <Route index element={<EntList />} />
            <Route path=":id" element={<EntDetailWrapper />} />
            <Route path=":id/edit" element={<EntForm />} />
            <Route path="create" element={<EntForm />} />
          </Route>

          <Route path="/subject-combinations">
            <Route index element={<SubjectCombinationsList />} />
            <Route path=":id" element={<SubjectCombinationDetailWrapper />} />
            <Route path=":id/edit" element={<SubjectCombinationForm />} />
            <Route path="create" element={<SubjectCombinationForm />} />
          </Route>

          <Route path="/promocodes">
            <Route index element={<PromocodeList />} />
            <Route path="create" element={<PromocodeForm />} />
            <Route path=":id/history" element={<PromocodeHistoryWrapper />} />
          </Route>

          <Route path="/content/subscription-benefits">
            <Route index element={<SubscriptionBenefitList />} />
            <Route path="create" element={<SubscriptionBenefitForm />} />
            <Route path=":id/edit" element={<SubscriptionBenefitForm />} />
          </Route>

          <Route path="/admin/app-settings" element={<AppSettingsList />} />

          <Route path="/referrals/policy" element={<ReferralPolicyForm />} />

          <Route path="/leaderboard-prizes" element={<LeaderboardPrizesList />} />

          <Route path="/streak-rewards" element={<StreakRewardsList />} />

          <Route path="/streak-push" element={<StreakPushTemplatePage />} />

          <Route path="/modules">
            <Route index element={<SubjectModuleList />} />
            <Route path="subject/:subjectId" element={<ModuleList />} />
            <Route path=":id" element={<ModuleDetailWrapper />} />
            <Route path=":id/edit" element={<ModuleForm />} />
            <Route path="create" element={<ModuleForm />} />
            <Route path=":moduleId/lessons/create" element={<LessonForm />} />
            <Route path=":moduleId/lessons/:lessonId/edit" element={<LessonForm />} />
          </Route>

          <Route path="/users">
            <Route index element={<UserList />} />
            <Route path="create" element={<UserForm />} />
            <Route path=":id" element={<UserDetail />} />
            <Route path=":id/edit" element={<UserForm />} />
          </Route>

          <Route path="/marketing" element={<MarketingDashboard />} />
          <Route path="/push" element={<PushNotifications />} />
          <Route path="/performance" element={<PerformanceDashboard />} />
          <Route path="/app-screens" element={<AppScreensPage />} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes >
    </>
  )
}

const NotFoundPage = () => (
  <div className="flex items-center justify-center h-screen">
    <ErrorState
      variant="404"
      title="Страница не найдена"
      message="Извините, мы не можем найти запрашиваемую страницу."
      actionText="Вернуться на главную"
      onRetry={() => window.location.href = '/'}
      size="large"
    />
  </div>
)

const QuestionDetailWrapper = () =>
{
  const { id } = useParams()
  const isValidId = id && /^\d+$/.test(id)
  if (!isValidId) return <NotFoundPage />
  return <QuestionDetail />
}

const SubjectDetailWrapper = () =>
{
  const { id } = useParams()
  const isValidId = id && /^\d+$/.test(id)
  if (!isValidId) return <NotFoundPage />
  return <SubjectDetail />
}

const TopicDetailWrapper = () =>
{
  const { id } = useParams()
  const isValidId = id && /^\d+$/.test(id)
  if (!isValidId) return <NotFoundPage />
  return <TopicDetail />
}

const TrainerDetailWrapper = () =>
{
  const { id } = useParams()
  const isValidId = id && /^\d+$/.test(id)
  if (!isValidId) return <NotFoundPage />
  return <TrainerDetail />
}

const EntDetailWrapper = () =>
{
  const { id } = useParams()
  const isValidId = id && /^\d+$/.test(id)
  if (!isValidId) return <NotFoundPage />
  return <EntDetail />
}

const SubjectCombinationDetailWrapper = () =>
{
  const { id } = useParams()
  const isValidId = id && /^\d+$/.test(id)
  if (!isValidId) return <NotFoundPage />
  return <SubjectCombinationDetail />
}

const PromocodeHistoryWrapper = () =>
{
  const { id } = useParams()
  const isValidId = id && /^\d+$/.test(id)
  if (!isValidId) return <NotFoundPage />
  return <PromocodeHistory />
}

const ModuleDetailWrapper = () =>
{
  const { id } = useParams()
  const isValidId = id && /^\d+$/.test(id)
  if (!isValidId) return <NotFoundPage />
  return <ModuleDetail />
}

export default App