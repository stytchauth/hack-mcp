import { Hono } from "hono";
import { cors } from "hono/cors";
import { WeatherAppMCP } from "./WeatherAppMCP.ts";
import {
    getStytchOAuthEndpointUrl,
    stytchBearerTokenAuthMiddleware,
} from "./lib/auth";

// Export the WeatherAppMCP class so the Worker runtime can find it
export { WeatherAppMCP };

export default new Hono<{ Bindings: Env }>()
    .use(cors())

    // Serve the OAuth Authorization Server response for Dynamic Client Registration
    .get('/.well-known/oauth-authorization-server', async (c) => {
      const u = new URL('https://stytch.com/oauth/authorize');
      u.searchParams.set('scope', 'openid email profile admin:projects manage:api_keys manage:api_keys:test manage:project_settings manage:project_data')
        return c.json({
            issuer: c.env.STYTCH_PROJECT_ID,
            // Link to the OAuth Authorization screen implemented within the React UI
            authorization_endpoint: u.toString(),
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
    .route('/sse', new Hono().mount('/', WeatherAppMCP.serveSSE('/sse').fetch))

    .use('/mcp', stytchBearerTokenAuthMiddleware)
    .route('/mcp', new Hono().mount('/', WeatherAppMCP.serve('/mcp').fetch))

    // Finally - serve static assets from Vite
    .mount('/', (req, env) => env.ASSETS.fetch(req))