import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Setup from "./components/Setup.tsx";

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <Setup>
            <App/>
        </Setup>
    </StrictMode>,
)
