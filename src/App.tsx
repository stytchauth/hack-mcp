import './App.css'

function App() {
    return (
        <main>
            <h1>Stytch MPC</h1>
            <p>
                Welcome! This is the MPC server for interacting with the Stytch Management API.
                The Stytch Management API can be used to programmatically interact with Stytch assets like
                Projects, Redirect URLs, Email Templates, and more.
                Full documentation available{' '}
                <a href="https://stytch.com/docs/workspace-management/pwa/overview">here</a>.
            </p>
            <p>
                Connect your MCP client to <code>{window.origin}/sse</code> to interact with the
                service. Clients that do not support remote OAuth can use the following command:
            </p>
            <div className="code-block">npx mcp-remote@0.1.2 {window.origin}/sse</div>
        </main>
    )
}

export default App;
