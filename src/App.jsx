import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { FacilityProvider } from './contexts/FacilityContext'
import router from './router/AppRouter'

const App = () => (
  <AuthProvider>
    <FacilityProvider>
      <RouterProvider router={router} />
      <Toaster
        position="top-center"
        toastOptions={{
          style: { fontFamily: 'Tajawal, sans-serif', direction: 'rtl' },
          duration: 3000,
        }}
      />
    </FacilityProvider>
  </AuthProvider>
)

export default App
