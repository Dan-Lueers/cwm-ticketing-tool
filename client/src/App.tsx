import { Navigate, Route, Routes } from 'react-router'
import { RequireAdmin } from './components/RequireAdmin.tsx'
import { RequireAuth } from './components/RequireAuth.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { LoginPage } from './pages/LoginPage.tsx'
import { UsersPage } from './pages/UsersPage.tsx'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* Everything inside needs a session; RequireAuth renders the nav bar around it. */}
      <Route element={<RequireAuth />}>
        <Route path="/" element={<HomePage />} />
        <Route element={<RequireAdmin />}>
          <Route path="/users" element={<UsersPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
