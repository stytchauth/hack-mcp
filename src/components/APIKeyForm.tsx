import {withLoginRequired} from "./Auth.tsx";
import {useAPIKey} from "./APIKeyContext.tsx";
import {Modal} from "./modal.tsx";
import {NavLink} from "react-router-dom";
import {useState} from "react";
import './APIKeyForm.css'

export const APIKeyForm = withLoginRequired(() => {
    const {state, setAPIKey} = useAPIKey();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        void setAPIKey(formData.get('project-id') as string, formData.get('secret') as string);
    };

    const [infoModalOpen, setInfoModalOpen] = useState(() => {
        const storedValue = sessionStorage.getItem("showInfoModal");
        return storedValue ? JSON.parse(storedValue) : true;
    });
    const onInfoModalClose = () => {
        sessionStorage.setItem("showInfoModal", JSON.stringify(false));
        setInfoModalOpen(false);
    }

    return (
        <>
            <h2>
                Save your Stytch Project ID and Secret{' '}
                <button className="text" onClick={() => setInfoModalOpen(true)}>ℹ️</button>
            </h2>
            <form onSubmit={handleSubmit}>
                <p>
                    Find your credentials in the{' '}
                    <NavLink to="https://stytch.com/dashboard" target="_blank">Stytch Dashboard</NavLink>.
                </p>
                <input
                    className="api-key-input"
                    name="project-id"
                    type="text"
                    defaultValue={state.projectID ?? ''}
                    placeholder="Enter your project ID here"
                    disabled={state.status === 'loading'}
                />
                <input
                    className="api-key-input"
                    name="secret"
                    type="text"
                    defaultValue={state.secret ?? ''}
                    placeholder="Enter your secret here"
                    disabled={state.status === 'loading'}
                />
                <div className="submit-container">
                    <button
                        className="primary"
                        type="submit"
                        disabled={state.status === 'loading'}
                    >
                        {state.status === 'loading' ? 'Saving...' : 'Save Stytch Credentials'}
                    </button>
                </div>
            </form>
            {state.status === 'error' && (
                <p>{state.error}</p>
            )}
            {state.status === 'success' && (
                state.projectID ?
                    <p>Project ID & secret saved successfully</p> :
                    <p>Empty API Key saved successfully.</p>
            )}
            <Modal isOpen={infoModalOpen} onClose={onInfoModalClose}>
                <h3>About the Weather Service Demo</h3>
                <p>
                    This demo provides access to current weather data powered by{' '}
                    <NavLink to="https://www.weatherapi.com" target="_blank">WeatherAPI</NavLink> via a{' '}
                    <NavLink to="https://modelcontextprotocol.io/introduction" target="_blank">Model Context Protocol
                        (MCP)</NavLink>{' '}
                    server running on{' '}
                    <NavLink to="https://workers.cloudflare.com" target="_blank">Cloudflare Workers</NavLink>.
                </p>
                <p>
                    To use the weather service, you'll need to provide a WeatherAPI key for the MCP Server to use.
                    Once configured, you can fetch current weather data for any city worldwide.
                    Your API Key will be bound to your user session and can only be used by MCP Clients you authorize.
                </p>
                <p>
                    To interact with the MCP server, connect your MCP client to:{' '}
                    <b>{window.location.origin}/sse</b>
                </p>
                <p>
                    User and MCP Client Authentication is handled through{' '}
                    <NavLink to="https://stytch.com/blog/remote-mcp-stytch-cloudflare/" target="_blank">Stytch</NavLink>.
                </p>
            </Modal>
        </>
    );
});