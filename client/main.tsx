import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './global.css' // This ensures your styles load

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)