import ReactDOM from 'react-dom/client'
import App from './App'
import './global.css'
import './i18n'
import { ThemeProvider } from './contexts/ThemeContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
)