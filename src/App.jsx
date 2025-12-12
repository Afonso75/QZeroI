import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "sonner"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UserProvider } from '@/contexts/UserContext'
import { CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <Pages />
        <Toaster 
          position="bottom-center"
          gap={8}
          visibleToasts={3}
          duration={2000}
          toastOptions={{
            unstyled: true,
            classNames: {
              toast: 'whatsapp-toast',
              title: 'whatsapp-toast-title',
              description: 'whatsapp-toast-description',
              success: 'whatsapp-toast-success',
              error: 'whatsapp-toast-error',
              warning: 'whatsapp-toast-warning',
              info: 'whatsapp-toast-info',
            },
          }}
          icons={{
            success: <CheckCircle2 className="w-5 h-5" />,
            error: <XCircle className="w-5 h-5" />,
            warning: <AlertCircle className="w-5 h-5" />,
            info: <Info className="w-5 h-5" />,
          }}
        />
      </UserProvider>
    </QueryClientProvider>
  )
}

export default App 