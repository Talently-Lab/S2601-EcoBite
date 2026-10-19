import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router';
import './styles/global.css'
import App from './App.jsx'
import { UserProvider } from './context/UserProvider';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <BrowserRouter>
            <UserProvider><App /></UserProvider>
        </BrowserRouter>
    </StrictMode>,
)
