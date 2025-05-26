import './App.css';
import CodeBlock from './CodeBlock'; // Import the new component

const regularConnection = `npx mcp-remote ${window.origin}/mcp --host 127.0.0.1`
const claudeDesktop = `"stytch-mcp": {
    "command": "npx",
    "args": [
        "mcp-remote",
        "${window.origin}/mcp",
        "--host",
        "127.0.0.1"
    ]
}
`;

function App() {
    return (
        <>
            <nav>
                <h2>Stytch MCP</h2>
                <img src={"/Wordmark.svg"} alt="Wordmark"/>
            </nav>
            <main>

                <h1>Stytch MCP</h1>
                <p>
                    Welcome! This is the MCP server for interacting with the Stytch Management API.
                    The Stytch Management API can be used to programmatically interact with Stytch assets like
                    Projects, Redirect URLs, Email Templates, and more.
                    Full documentation available{' '}
                    <a href="https://stytch.com/docs/workspace-management/pwa/overview">here</a>.
                </p>
                <section>
                    <p>
                        Connect your MCP client to <code>{window.origin}/sse</code> to interact with the
                        service. Clients that do not support remote OAuth can use the following command:
                    </p>
                    <CodeBlock text={regularConnection}/>
                </section>
                <section>
                    <p>
                        Claude Desktop configuration:
                    </p>
                    <CodeBlock text={claudeDesktop}/>
                </section>

            </main>

        </>
    );
}

export default App;
