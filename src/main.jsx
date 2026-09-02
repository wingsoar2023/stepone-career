import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initAppLifecycle } from './utils/lifecycle'

// Initialize Android Vitals & performance background listener
initAppLifecycle()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

