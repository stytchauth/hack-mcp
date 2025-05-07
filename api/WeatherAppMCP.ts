import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from "agents/mcp";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { getStytchOAuthEndpointUrl } from "./lib/auth.ts";
import { decryptSecret } from "./lib/keys.ts";

type AuthenticationContext = {
    subject: string,
    accessToken: string,
}

const emailTemplateOptions = {
    name: z.string(),
    buttonColor: z.string().optional().default('#106ee9'),
    buttonTextColor: z.string().optional(),
    fontFamily: z.string().optional(),
    textAlignment: z.union([z.literal('left'), z.literal('center')]).optional(),
    logoSrc: z.string().optional(),
    buttonBorderRadius: z.number().max(18.5).min(0).multipleOf(0.1).optional().default(0),
    fromDomain: z.string().optional(),
    fromLocalPart: z.string().optional(),
    fromName: z.string().optional(),
    replyToLocalPart: z.string().optional(),
    replyToName: z.string().optional(),
    htmlContent: z.string().optional(),
    subject: z.string().optional(),
    plaintextContent: z.string().optional(),
  };

  export const SendTestEmailTemplateBody = {
    ...emailTemplateOptions,
    testProjectId: z.string(),
    method: z.string().optional(),
    locale: z.string().optional(),
    toName: z.string(),
    toAddress: z.string(),
    templateType: z.string().default('login'),
    useSecondarySubject: z.boolean().optional(),
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

        server.tool('sendTestEmail', 'Sends a test email to the email address specified in the email template.', { ...SendTestEmailTemplateBody }, async ({...sendTestEmailTemplateBody}) => {
            const response = await fetch(`https://stytch.com/web/projects/${sendTestEmailTemplateBody.testProjectId}/send_test_email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // 'Cookie': 'stytch_b2b_session=TKTK; stytch_b2b_session_jwt=TKTK'
                },
                body: JSON.stringify({
                    ...sendTestEmailTemplateBody,
                })
            })
            if (!response.ok) {
                throw new HTTPException(400, {message: `Error sending test email: ${response.statusText} - ${await response.text()}`})
            }
            const emailTemplateResp = await response.json() as { email_template_id: string }
            return this.formatResponse(`Email template created for ${sendTestEmailTemplateBody.testProjectId}. Email template id: ${emailTemplateResp.email_template_id}`)
        })

        server.tool('createEmailTemplate', 'Creates an customer email template for the project.', {
            liveProjectId: z.string(),
            ...emailTemplateOptions
        }, async ({liveProjectId, ...emailTemplateOptions}) => {
            const response = await fetch(`https://management.stytch.com/v1/projects/${liveProjectId}/email_templates`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': btoa(`TKTK:TKTK`),
                },
                body: JSON.stringify({
                    email_template: {
                        ...emailTemplateOptions,
                    }
                })
            })
            if (!response.ok) {
                throw new HTTPException(400, {message: `Error creating email template: ${response.statusText} - ${await response.text()}`})
            }
            const emailTemplate = await response.json() as { email_template_id: string }
            return this.formatResponse(`Email template created for ${liveProjectId}. Email template id: ${emailTemplate.email_template_id}`)
        })

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