import {useAPIKey} from "./APIKeyContext.tsx";
import {APIKeyForm} from "./APIKeyForm.tsx";
import {IdentityProvider} from "@stytch/react";
import {withLoginRequired} from "./Auth.tsx";

/**
 * The OAuth Authorization page implementation. Wraps the Stytch IdentityProvider UI component.
 * View all configuration options at https://stytch.com/docs/sdks/idp-ui-configuration
 */
export const OAuthAuthorize = withLoginRequired(function () {
    const {state} = useAPIKey()

    if (state.status === "loading") {
        return <>Loading...</>
    }

    // If no API Key has been registered, make the user register one before permitting
    // the OAuth flow to continue
    if (!state.projectID || !state.secret) {
        return (
            <>
                <APIKeyForm/>
                <p>You must configure an API Key for the MCP Client to use on your behalf.</p>
            </>
        )
    }
    return (
        <>
            <p>You have an API Key registered.</p>
            <IdentityProvider/>
        </>
    )
})