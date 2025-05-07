import { Hono } from "hono";
import { cors } from "hono/cors";
import { WeatherAppMCP } from "./WeatherAppMCP.ts";
import {
    getStytchOAuthEndpointUrl,
    stytchBearerTokenAuthMiddleware,
    stytchSessionAuthMiddleware
} from "./lib/auth";
import { decryptSecret, encryptSecret } from "./lib/keys.ts";

// Export the WeatherAppMCP class so the Worker runtime can find it
export { WeatherAppMCP };

const SecretManagementAPI = new Hono<{ Bindings: Env }>()
    .get('/apikey', stytchSessionAuthMiddleware, async (c) => {
        const encryptedProjectID = await c.env.API_KEYS.get(c.get('userID')+"projectID");
        const encryptedSecret = await c.env.API_KEYS.get(c.get('userID')+"secret");
        if (!encryptedProjectID || !encryptedSecret) return c.json({projectID: null, secret: null});

        const decryptedProjectID = await decryptSecret(c.env, encryptedProjectID);
        const decryptedSecret = await decryptSecret(c.env, encryptedSecret);
        return c.json({projectID: decryptedProjectID, secret: decryptedSecret});
    })

    .post('/apikey', stytchSessionAuthMiddleware, async (c) => {
        const {projectID, secret} = await c.req.json();
        if (projectID === null || secret === "" || projectID === "" || secret === null) {
            await c.env.API_KEYS.delete(c.get('userID')+"projectID");
            await c.env.API_KEYS.delete(c.get('userID')+"secret");
        } else {
            const encryptedProjectID = await encryptSecret(c.env, projectID);
            const encryptedSecret = await encryptSecret(c.env, secret);
            await c.env.API_KEYS.put(c.get('userID')+"projectID", encryptedProjectID);
            await c.env.API_KEYS.put(c.get('userID')+"secret", encryptedSecret);
        }
        return c.json({success: true});
    })

export type App = typeof SecretManagementAPI;

export default new Hono<{ Bindings: Env }>()
    .use(cors())

    // Mount the Secret Management API underneath us
    .route('/api', SecretManagementAPI)

    // Serve the OAuth Authorization Server response for Dynamic Client Registration
    .get('/.well-known/oauth-authorization-server', async (c) => {
        return c.json({
            issuer: c.env.STYTCH_PROJECT_ID,
            // Link to the OAuth Authorization screen implemented within the React UI
            authorization_endpoint: `https://stytch.com/oauth/authorize`,
            token_endpoint: getStytchOAuthEndpointUrl(c.env, 'oauth2/token'),
            registration_endpoint: getStytchOAuthEndpointUrl(c.env, 'oauth2/register'),
            scopes_supported: ['openid', 'profile', 'email', 'offline_access'],
            response_types_supported: ['code'],
            response_modes_supported: ['query'],
            grant_types_supported: ['authorization_code', 'refresh_token'],
            token_endpoint_auth_methods_supported: ['none'],
            code_challenge_methods_supported: ['S256'],
        })
    })

    // Let the MCP Server have a go at handling the request
    .use('/sse/*', stytchBearerTokenAuthMiddleware)
    .route('/sse', new Hono().mount('/', WeatherAppMCP.mount('/sse').fetch))

    // Finally - serve static assets from Vite
    .mount('/', (req, env) => env.ASSETS.fetch(req))