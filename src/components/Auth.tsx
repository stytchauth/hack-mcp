import { StytchB2B, useStytchB2BClient, useStytchMember } from "@stytch/react/b2b";
import { AuthFlowType, B2BOAuthProviders, B2BProducts, StytchB2BUIConfig, StytchEvent } from "@stytch/vanilla-js";
import { useEffect, useMemo } from "react";

/**
 * A higher-order component that enforces a login requirement for the wrapped component.
 * If the user is not logged in, the user is redirected to the login page and the
 * current URL is stored in localStorage to enable return after authentication.
 */
export const withLoginRequired = (Component: React.FC) => () => {
    const {member, fromCache} = useStytchMember()

    useEffect(() => {
        if (!member && !fromCache) {
            localStorage.setItem('returnTo', window.location.href);
            console.log('loginRequred', {returnTo: window.location.href});
            window.location.href = '/login';
        }
    }, [member, fromCache])

    if (!member) {
        return null
    }
    return <Component/>
}

/**
 * The other half of the withLoginRequired flow
 * Redirects the user to a specified URL stored in local storage or a default location.
 * Behavior:
 * - Checks for a `returnTo` entry in local storage to determine the redirection target.
 * - If `returnTo` exists, clears its value from local storage and navigates to the specified URL.
 * - If `returnTo` does not exist, redirects the user to the default '/apikey' location.
 */
const onLoginComplete = () => {
    const returnTo = localStorage.getItem('returnTo')
    console.log('onLoginComplete', {returnTo});
    if (returnTo) {
        window.location.href = returnTo;
    } else {
        window.location.href = '/apikey';
    }
}

/**
 * The Discovery/Login page implementation. Wraps the StytchLogin UI component.
 * View all configuration options at https://stytch.com/docs/sdks/ui-configuration
 */
export function Discovery() {
    const config = useMemo<StytchB2BUIConfig>(() => ({
        products: [B2BProducts.emailMagicLinks, B2BProducts.oauth],
        sessionOptions: { sessionDurationMinutes: 60 },
        oauthOptions: {
          providers: [{ type: B2BOAuthProviders.Google }],
        },
        authFlowType: AuthFlowType.Discovery,
    }), [])

    const handleOnLoginComplete = (evt: StytchEvent) => {
        if (evt.type !== "AUTHENTICATE_FLOW_COMPLETE") return;
        onLoginComplete();
    }

    return (
        <StytchB2B config={config} callbacks={{onEvent: handleOnLoginComplete}}/>
    )
}

/**
 * The Authentication callback page implementation. Handles completing the login flow after OAuth
 */
export function Authenticate() {
    const client = useStytchB2BClient();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('stytch_token_type');
        if (!token) return; 

        client.magicLinks.discovery.authenticate({
            discovery_magic_links_token: token,
        }).then(onLoginComplete)
    }, [client]);

    return (
        <>
            Loading...
        </>
    )
}

export const Logout = function () {
    const stytch = useStytchB2BClient()
    const {member} = useStytchMember()

    if (!member) return null;

    return (
        <button onClick={() => stytch.session.revoke()}> Log Out </button>
    )
}