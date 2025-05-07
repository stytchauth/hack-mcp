import { useStytchMember } from "@stytch/react/b2b";
import { hc } from "hono/client";
import { createContext, ReactNode, useContext, useEffect, useReducer } from "react";
import type { App } from "../../api";

const client = hc<App>(`${window.location.origin}/api`);

type State = {
    projectID: string | null;
    secret: string | null;
    status: 'idle' | 'loading' | 'success' | 'error';
    error?: string;
};

type Action =
    | { type: 'SET_API_KEY'; projectID: string | null, secret: string | null }
    | { type: 'LOADING' }
    | { type: 'SUCCESS' }
    | { type: 'ERROR'; payload: string };

type APIKeyContextType = {
    state: State;
    setAPIKey: (projectID: string, secret: string) => Promise<void>;
};

const APIKeyContext = createContext<APIKeyContextType | null>(null);

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case 'SET_API_KEY':
            return {...state, status: 'idle', projectID: action.projectID, secret: action.secret};
        case 'LOADING':
            return {...state, status: 'loading'};
        case 'SUCCESS':
            return {...state, status: 'success', error: undefined};
        case 'ERROR':
            return {...state, status: 'error', error: action.payload};
        default:
            return state;
    }
}

export function APIKeyProvider({children}: { children: ReactNode }) {
    const {member} = useStytchMember();
    const [state, dispatch] = useReducer(reducer, {
        projectID: null,
        secret: null,
        status: 'idle'
    });

    const getAPIKey = async () => {
        dispatch({type: 'LOADING'});
        try {
            const response = await client.apikey.$get();
            const data = await response.json();
            dispatch({type: 'SET_API_KEY', projectID: data.projectID, secret: data.secret});
        } catch (error) {
            dispatch({type: 'ERROR', payload: error instanceof Error ? error.message : 'Failed to fetch API key'});
        }
    };

    const setAPIKey = async (projectID: string, secret: string) => {
        dispatch({type: 'LOADING'});
        try {
            await client.apikey.$post({json: {projectID, secret}});
            dispatch({type: 'SET_API_KEY', projectID: projectID, secret: secret});
            dispatch({type: 'SUCCESS'});
        } catch (error) {
            dispatch({type: 'ERROR', payload: error instanceof Error ? error.message : 'Failed to save API key'});
        }
    };

    // Load the user's current configured API Key
    useEffect(() => {
        if (member?.member_id) {
            getAPIKey()
        }
    }, [member?.member_id]);

    return (
        <APIKeyContext.Provider value={{state, setAPIKey}}>
            {children}
        </APIKeyContext.Provider>
    );
}

export function useAPIKey() {
    const context = useContext(APIKeyContext);
    if (!context) {
        throw new Error('useAPIKey must be used within an APIKeyProvider');
    }
    return context;
}