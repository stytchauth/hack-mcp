import {createMiddleware} from "hono/factory";
import {HTTPException} from "hono/http-exception";
import {getCookie} from "hono/cookie";
import {Client} from "stytch";

/**
 * stytchAuthMiddleware is a Hono middleware that validates that the user is logged in
 * It checks for the stytch_session_jwt cookie set by the Stytch FE SDK
 */
export const stytchSessionAuthMiddleware = createMiddleware<{
    Variables: {
        userID: string
    },
    Bindings: Env,
}>(async (c, next) => {
    const sessionCookie = getCookie(c, 'stytch_session_jwt');

    try {
        const authRes = await getClient(c.env).sessions.authenticateJwt({
            session_jwt: sessionCookie ?? '',
        })
        c.set('userID', authRes.session.user_id);
    } catch (error) {
        console.error(error);
        throw new HTTPException(401, {message: 'Unauthenticated'})
    }

    await next()
})

/**
 * stytchBearerTokenAuthMiddleware is a Hono middleware that validates that the request has a Stytch-issued bearer token
 * Tokens are issued to clients at the end of a successful OAuth flow
 */
export const stytchBearerTokenAuthMiddleware = createMiddleware<{
    Bindings: Env,
}>(async (c, next) => {
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new HTTPException(401, {message: 'Missing or invalid access token'})
    }
    const accessToken = authHeader.substring(7);

    try {
        const tokenRes = await getClient(c.env).idp.introspectTokenLocal(accessToken);
        // @ts-expect-error executionCtx is untyped
        c.executionCtx.props = {subject: tokenRes.subject, accessToken,}
    } catch (error) {
        console.error(error);
        throw new HTTPException(401, {message: 'Unauthenticated'})
    }

    await next()
})

let client: Client | null = null;

function getClient(env: Env): Client {
    if (!client) {
        client = new Client({
            project_id: env.STYTCH_PROJECT_ID,
            secret: env.STYTCH_PROJECT_SECRET,
        })
    }
    return client
}

export function getStytchOAuthEndpointUrl(env: Env, endpoint: string): string {
    const baseURL = env.STYTCH_PROJECT_ID.includes('test') ?
        'https://test.stytch.com/v1/public' :
        'https://api.stytch.com/v1/public';

    return `${baseURL}/${env.STYTCH_PROJECT_ID}/${endpoint}`
}