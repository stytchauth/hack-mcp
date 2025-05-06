import {BrowserRouter as Router, Route, Routes, Navigate} from 'react-router-dom';
import {StytchUIClient} from '@stytch/vanilla-js';
import {StytchProvider} from '@stytch/react';

import {Authenticate, Login, Logout} from "./components/Auth.tsx";
import {APIKeyProvider} from "./components/APIKeyContext.tsx";
import {APIKeyForm} from "./components/APIKeyForm.tsx";
import {OAuthAuthorize} from "./components/OAuthAuthorize.tsx";

const stytch = new StytchUIClient(import.meta.env.VITE_STYTCH_PUBLIC_TOKEN ?? '');

function App() {
    return (
        <StytchProvider stytch={stytch}>
            <APIKeyProvider>
                <main>
                    <h1>Stytch MCP Demo</h1>
                    <Router>
                        <Routes>
                            <Route path="/oauth/authorize" element={<OAuthAuthorize/>}/>
                            <Route path="/login" element={<Login/>}/>
                            <Route path="/authenticate" element={<Authenticate/>}/>
                            <Route path="/apikey" element={<APIKeyForm/>}/>
                            <Route path="*" element={<Navigate to="/apikey"/>}/>
                        </Routes>
                    </Router>
                </main>
                <footer>
                    <Logout/>
                </footer>
            </APIKeyProvider>
        </StytchProvider>
    )
}

export default App

