import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { toast } from 'sonner'
import App from './App.tsx'
import './index.css'

const updateSW = registerSW({
  onNeedRefresh() {
    toast('New content available', {
      action: {
        label: 'Reload',
        onClick: () => updateSW(true),
      },
      duration: Infinity,
    })
  },
  onOfflineReady() {
    toast('App ready to work offline')
  },
})

createRoot(document.getElementById("root")!).render(<App />);
