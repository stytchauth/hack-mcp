import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js'
import {McpAgent} from "agents/mcp";
import {getStytchOAuthEndpointUrl} from "./lib/auth.ts";
import {z} from "zod";
import {HTTPException} from "hono/http-exception";
import {decryptSecret} from "./lib/keys.ts";

type AuthenticationContext = {
    subject: string,
    accessToken: string,
}

/**
 * The `WeatherAppMCP` class exposes the https://www.weatherapi.com/ API
 * for consumption by AI Agents via the MCP Protocol
 */
export class WeatherAppMCP extends McpAgent<Env, unknown, AuthenticationContext> {
    async init() {
    }


    formatResponse = (description: string): {
        content: Array<{ type: 'text', text: string }>
    } => {
        return {
            content: [{
                type: "text",
                text: `Success! ${description}`
            }]
        };
    }

    get server() {
        const server = new McpServer({
            name: 'Weather Service',
            version: '1.0.0',
        })

        server.tool('whoami', 'Check who the logged-in user is', async () => {
            const response = await fetch(getStytchOAuthEndpointUrl(this.env, 'oauth2/userinfo'), {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${this.props.accessToken}`,
                },
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error fetching user information: ${response.statusText}`,
                        },
                    ],
                };
            }

            // Parse response JSON for user details
            const userInfo = await response.json();

            // Return user info as a response
            return {
                content: [
                    {
                        type: 'text',
                        text: `Logged-in user details:\n${JSON.stringify(userInfo, null, 2)}`,
                    },
                ],
            };
        });

        server.tool('getCurrentWeather', 'Gets the current weather conditions at the requested location', {locationName: z.string()}, async ({locationName}) => {
            const key = await this.env.API_KEYS.get(this.props.subject);
            if(!key) {
                // TODO: MCP Server catches this and wraps it to a tool call result
                // So 401 does not trigger re-authentication
                // Need to teach MCP Server Core how to return a real 401 from a tool response
                throw new HTTPException(401, {message: 'Unauthenticated'})
            }

            const url = new URL('https://api.weatherapi.com/v1/current.json')
            url.searchParams.append('key', await decryptSecret(this.env, key))
            url.searchParams.append('q', locationName)

            const weatherRes = await fetch(url)
            if (weatherRes.status !== 200) {
                throw Error(`Error fetching weather: ${weatherRes.statusText} - ${await weatherRes.text()}`)
            }

            const weatherJSON = await weatherRes.json() as { current: { temp_f: string } }

            return this.formatResponse(`Current temperature in ${locationName} is: ${weatherJSON.current.temp_f} degrees Fahrenheit`)
        })

        return server
    }
}