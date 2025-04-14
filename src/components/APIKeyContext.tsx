import {hc} from "hono/client";
import type {App} from "../../api";
import {createContext, ReactNode, useContext, useEffect, useReducer} from "react";
import {useStytchUser} from "@stytch/react";

const client = hc<App>(`${window.location.origin}/api`);

type State = {
    apiKey: string | null;
    status: 'idle' | 'loading' | 'success' | 'error';
    error?: string;
};

type Action =
    | { type: 'SET_API_KEY'; payload: string | null }
    | { type: 'LOADING' }
    | { type: 'SUCCESS' }
    | { type: 'ERROR'; payload: string };

type APIKeyContextType = {
    state: State;
    setAPIKey: (apiKey: string) => Promise<void>;
};

const APIKeyContext = createContext<APIKeyContextType | null>(null);

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case 'SET_API_KEY':
            return {...state, status: 'idle', apiKey: action.payload};
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
    const {user} = useStytchUser();
    const [state, dispatch] = useReducer(reducer, {
        apiKey: null,
        status: 'idle'
    });

    const getAPIKey = async () => {
        dispatch({type: 'LOADING'});
        try {
            const response = await client.apikey.$get();
            const data = await response.json();
            dispatch({type: 'SET_API_KEY', payload: data.apiKey});
        } catch (error) {
            dispatch({type: 'ERROR', payload: error instanceof Error ? error.message : 'Failed to fetch API key'});
        }
    };

    const setAPIKey = async (apiKey: string) => {
        dispatch({type: 'LOADING'});
        try {
            await client.apikey.$post({json: {apiKey}});
            dispatch({type: 'SET_API_KEY', payload: apiKey});
            dispatch({type: 'SUCCESS'});
        } catch (error) {
            dispatch({type: 'ERROR', payload: error instanceof Error ? error.message : 'Failed to save API key'});
        }
    };

    // Load the user's current configured API Key
    useEffect(() => {
        if (user?.user_id) {
            getAPIKey()
        }
    }, [user?.user_id]);

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