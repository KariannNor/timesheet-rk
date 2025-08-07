import { BrowserRouter as Router, Routes, Route, useSearchParams } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import AuthWrapper from './components/AuthWrapper'

// Wrapper component to handle URL params
const TimesheetPage = () => {
  const [searchParams] = useSearchParams()
  const organizationId = searchParams.get('org')
  
  if (!organizationId) {
    // Redirect to landing page if no org specified
    window.location.href = '/'
    return null
  }
  
  return <AuthWrapper organizationId={organizationId} />
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/timesheet" element={<TimesheetPage />} />
        {/* Keep existing routes for backward compatibility */}
        <Route path="/redcross" element={<AuthWrapper organizationId="redcross" />} />
        <Route path="/advokatforeningen" element={<AuthWrapper organizationId="advokatforeningen" />} />
        <Route path="/infunnel" element={<AuthWrapper organizationId="infunnel" />} />
      </Routes>
    </Router>
  )
}

export default App