import { StytchB2BProvider } from '@stytch/react/b2b';
import { StytchB2BUIClient } from '@stytch/vanilla-js/b2b';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';

import { APIKeyProvider } from "./components/APIKeyContext.tsx";
import { APIKeyForm } from "./components/APIKeyForm.tsx";
import { Discovery, Logout } from "./components/Auth.tsx";
import { OAuthAuthorize } from "./components/OAuthAuthorize.tsx";

const stytch = new StytchB2BUIClient(import.meta.env.VITE_STYTCH_PUBLIC_TOKEN ?? '');

function App() {
    return (
        <StytchB2BProvider stytch={stytch}>
            <APIKeyProvider>
                <main>
                    <h1>Stytch MCP Demo</h1>
                    <Router>
                        <Routes>
                            <Route path="/oauth/authorize" element={<OAuthAuthorize/>}/>
                            <Route path="/login" element={<Discovery/>}/>
                            <Route path="/authenticate" element={<Discovery/>}/>
                            <Route path="/apikey" element={<APIKeyForm/>}/>
                            <Route path="*" element={<Navigate to="/apikey"/>}/>
                        </Routes>
                    </Router>
                </main>
                <footer>
                    <Logout/>
                </footer>
            </APIKeyProvider>
        </StytchB2BProvider>
    )
}

export default App

