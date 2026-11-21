import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import Splash from './components/Splash'
import { CartProvider } from './hooks/CartContext'
import { CatalogProvider } from './hooks/CatalogContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Splash />
    <BrowserRouter>
      <CatalogProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </CatalogProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
