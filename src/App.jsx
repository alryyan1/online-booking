import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { FacilityProvider } from './contexts/FacilityContext'
import Navbar from './components/common/Navbar'
import Footer from './components/common/Footer'
import AppRouter from './router/AppRouter'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <FacilityProvider>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            <AppRouter />
          </main>
          <Footer />
        </div>
        <Toaster
          position="top-center"
          toastOptions={{
            style: { fontFamily: 'Cairo, sans-serif', direction: 'rtl' },
            duration: 3000,
          }}
        />
      </FacilityProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
