import './App.css';
import CodeBlock from './CodeBlock'; // Import the new component

const regularConnection = `npx mcp-remote ${window.origin}/mcp`
const claudeDesktop = `"stytch-mcp": {
    "command": "npx",
    "args": [
        "mcp-remote",
        "${window.origin}/mcp"
    ]
}
`;

function App() {
    return (
        <main>
            <h1>Stytch MCP</h1>
            <p>
                Welcome! This is the MCP server for interacting with the Stytch Management API.
                The Stytch Management API can be used to programmatically interact with Stytch assets like
                Projects, Redirect URLs, Email Templates, and more.
                Full documentation available{' '}
                <a href="https://stytch.com/docs/workspace-management/pwa/overview">here</a>.
            </p>
            <p>
                Connect your MCP client to <code>{window.origin}/sse</code> to interact with the
                service. Clients that do not support remote OAuth can use the following command:
            </p>
            <CodeBlock text={regularConnection} />
            <p>
                Claude Desktop configuration:
            </p>
            <CodeBlock text={claudeDesktop} />
        </main>
    );
}

export default App;
