import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from "agents/mcp";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { getStytchOAuthEndpointUrl } from "./lib/auth.ts";
import { decryptSecret, encryptSecret } from "./lib/keys.ts";

type AuthenticationContext = {
    subject: string,
    accessToken: string,
}

const sendMagicLinkParams = {
    email: z.string().email(),
    login_magic_link_url: z.string().url().optional(),
    signup_magic_link_url: z.string().url().optional(),
    login_expiration_minutes: z.number().min(1).max(60).optional(),
    signup_expiration_minutes: z.number().min(1).max(60).optional(),
    login_template_id: z.string().optional(),
    signup_template_id: z.string().optional(),
    locale: z.string().optional(),
    attributes: z.record(z.unknown()).optional(),
    code_challenge: z.string().optional(),
    user_id: z.string().optional(),
    session_token: z.string().optional(),
    session_jwt: z.string().optional(),
}

const prebuiltCustomizationOptions = {
    button_border_radius: z.number().optional(),
    button_color: z.string().optional().default('#106ee9'),
    button_text_color: z.string().optional(),
    font_family: z.string().optional(),
    text_alignment: z.string().optional(),
}

const URLTypeSchema = z.object({
    type: z.string(),
    is_default: z.boolean(),
})

const createRedirectURLOptions = {
    url: z.string(),
    valid_types: z.array(URLTypeSchema),
};

export const LoginOrCreateEmailOTPBody = {
    email: z.string(),
    expiration_minutes: z.number().min(1).max(60).optional(),
    login_template_id: z.string().optional(),
    signup_template_id: z.string().optional(),
    locale: z.string().optional(),
    create_user_as_pending: z.boolean().optional(),
    attributes: z.record(z.unknown()).optional(),
}

export class WeatherAppMCP extends McpAgent<Env, unknown, AuthenticationContext> {
    async init() {
    }

    async createSecret(projectID: string): Promise<string> {
        const response = await fetch(`https://management.stytch.com/v1/projects/${projectID}/secrets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + this.props.accessToken,
            },
        })
        if (!response.ok) {
            throw new HTTPException(400, {message: `Error creating secret: ${response.statusText} - ${await response.text()}`})
        }
        const createProjectResp = await response.json() as { created_secret: { secret: string } }
        if (!createProjectResp.created_secret) {
            throw new HTTPException(400, {message: `Secret response was null`})
        }
        return createProjectResp.created_secret.secret;
    }

    async createProject(): Promise<string> {
        const response = await fetch(`https://management.stytch.com/v1/projects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.props.accessToken,
            },
            body: JSON.stringify({
                project_name: 'My Test Project',
                vertical: 'CONSUMER',
            })
        })
        if (!response.ok) {
            throw new HTTPException(400, {message: `Error creating project: ${response.statusText} - ${await response.text()}`})
        }
        const createProjectResp = await response.json() as { project: { live_project_id: string } }
        if (!createProjectResp.project) {
            throw new HTTPException(400, {message: `Project response was null`});
        }
        return createProjectResp.project.live_project_id;
    }

    async getOrSetProjectID(projectID: string | null): Promise<{ projectID: string; secret: string; apiBaseURL: string }> {
        if (!projectID) {
            projectID = await this.createProject();
        }
        const memberAPIKeys = await this.env.MEMBER_API_KEYS.get(this.props.subject);
        // map of project ID to secret
        let apiKeys: Record<string , string> = {};
        if (memberAPIKeys) {
            apiKeys = JSON.parse(memberAPIKeys);
        }
        let encryptedSecret = apiKeys[projectID];
        let decryptedSecret = '';
        let secretExists = !!encryptedSecret;
        if (!encryptedSecret) {
            decryptedSecret  = await this.createSecret(projectID);
            encryptedSecret = await encryptSecret(this.env, decryptedSecret);
            apiKeys[projectID] = encryptedSecret;
        } else {
            decryptedSecret = await decryptSecret(this.env, encryptedSecret);
        }
        if (!secretExists) {
            await this.env.MEMBER_API_KEYS.put(this.props.subject, JSON.stringify(apiKeys));
        }
        let apiBaseURL = 'https://test.stytch.com/v1/';
        if (projectID.includes('live')) {
            apiBaseURL = 'https://api.stytch.com/v1/';
        }
        return {
            projectID: projectID,
            secret: decryptedSecret,
            apiBaseURL: apiBaseURL,
        }
    }

    async fetchProjectCredentials(): Promise<{ projectId: string; secret: string; apiBaseURL: string }> {
        const project_id = await this.env.API_KEYS.get(this.props.subject + 'projectID');
        const secret = await this.env.API_KEYS.get(this.props.subject + 'secret');

        if (!project_id || !secret) {
            throw new HTTPException(401, { message: 'Unauthenticated' });
        }

        const decryptedSecret = await decryptSecret(this.env, secret);
        const decryptedProjectId = await decryptSecret(this.env, project_id);
        let apiBaseURL = 'https://test.stytch.com/v1/';
        if (decryptedProjectId.includes('live')) {
            apiBaseURL = 'https://api.stytch.com/v1/';
        }
        return {
            projectId: decryptedProjectId,
            secret: decryptedSecret,
            apiBaseURL: apiBaseURL
        }
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

        server.tool('inputProjectID', 'Specify your project', {projectIDInput: z.string()},  async ({projectIDInput}) => {
            const { projectID } = await this.getOrSetProjectID(projectIDInput);
            return this.formatResponse(`Successfully set ${projectID}`)
        })

        server.tool('listProjects', 'List all of your projects', async () => {
            const memberAPIKeys = await this.env.MEMBER_API_KEYS.get(this.props.subject);
            if (!memberAPIKeys) {
                return this.formatResponse("You don't have any projects configured. Use the inputProjectID tool to create one.");
            }
            const apiKeys = JSON.parse(memberAPIKeys);
            const projectIDs = Object.keys(apiKeys).filter(projectID => projectID.startsWith("project"));
            return this.formatResponse(projectIDs.toString());
        })

        server.tool('createEmailTemplate', 'Creates an custom email template for the project.', {
            liveProjectId: z.string(),
            template_id: z.string(),
            name: z.string(),
            ...prebuiltCustomizationOptions,
        }, async ({ liveProjectId, template_id, name, ...prebuiltCustomizationOptions}) => {
            const response = await fetch(`https://management.stytch.com/v1/projects/${liveProjectId}/email_templates`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this.props.accessToken,
                },
                body: JSON.stringify({
                    email_template: {
                        template_id: template_id,
                        name: name,
                        prebuilt_customization: {
                            ...prebuiltCustomizationOptions,
                        }
                    }
                })
            })
            if (!response.ok) {
                throw new HTTPException(400, {message: `Error creating email template: ${response.statusText} - ${await response.text()}`})
            }
            const emailTemplate = await response.json() as { email_template: { template_id: string } }
            return this.formatResponse(`Email template created for ${liveProjectId}. Email template id: ${emailTemplate.email_template.template_id}`)
        })

        server.tool('createRedirectURL', 'Create a redirect URL for your project', {
            liveProjectId: z.string(),
            ...createRedirectURLOptions
        }, async ({ liveProjectId, ...createRedirectURLOptions}) => {
            const response = await fetch(`https://management.stytch.com/v1/projects/${liveProjectId}/redirect_urls`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this.props.accessToken,
                },
                body: JSON.stringify({
                    redirect_url: {
                        ...createRedirectURLOptions,
                    }
                })
            })
            if (!response.ok) {
                throw new HTTPException(400, {message: `Error creating redirect URL: ${response.statusText} - ${await response.text()}`})
            }
            const redirectURLResp = await response.json() as { redirect_url: { url: string } }
            return this.formatResponse(`Redirect URL created for ${liveProjectId}. Redirect URL: ${redirectURLResp.redirect_url.url}`)
        })

        server.tool('sendMagicLink', 'Sends a magic link to a user\'s email address', {
            projectID: z.string(),
            ...sendMagicLinkParams,
        }, async ({projectID, ...params}) => {
            const { secret, apiBaseURL } = await this.getOrSetProjectID(projectID);
            const response = await fetch(apiBaseURL + 'magic_links/email/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${btoa(`${projectID}:${secret}`)}`,
                },
                body: JSON.stringify(params)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new HTTPException(400, {
                    message: `Error sending magic link: ${response.statusText} - ${errorText}`
                });
            }

            const result = await response.json() as { request_id: string };
            return this.formatResponse(`Magic link sent successfully to ${params.email}. Request ID: ${result.request_id}`);
        })

        server.tool('LoginOrCreateEmailOTP', 'Sends an email one time passcode to the specified email', {
            projectID: z.string(),
            ...LoginOrCreateEmailOTPBody,
        }, async ({projectID, ...loginOrCreateEmailOTPBody}) => {
            const { secret, apiBaseURL } = await this.getOrSetProjectID(projectID);
            const response = await fetch(apiBaseURL + `otps/email/login_or_create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${btoa(`${projectID}:${secret}`)}`
                },
                body: JSON.stringify({
                    ...loginOrCreateEmailOTPBody,
                })
            })
            if (!response.ok) {
                throw new HTTPException(400, {message: `Error sending email OTP: ${response.statusText} - ${await response.text()}`})
            }
            const loginOrCreateEmailOTPResp = await response.json() as { user_id: string, email_id: string }
            return this.formatResponse(`Email OTP sent. Email id: ${loginOrCreateEmailOTPResp.email_id}`)
        })

        return server
    }
}