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
            throw new HTTPException(400, {message: `Project response was null`})
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
        let secretExists = !!encryptedSecret
        if (!encryptedSecret) {
            decryptedSecret  = await this.createSecret(projectID);
            encryptedSecret = await encryptSecret(this.env, decryptedSecret);
            apiKeys[projectID] = encryptedSecret
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
            const { projectID, secret } = await this.getOrSetProjectID(projectIDInput);
            return this.formatResponse(`Successfully set ${projectID} with secret ${secret}`)
        })

        server.tool('listProjects', 'List all of your projects', async () => {
            const memberAPIKeys = await this.env.API_KEYS.get(this.props.subject);
            if (!memberAPIKeys) {
                return this.formatResponse("You don't have any projects configured. Use the inputProjectID tool to create one.");
            }
            return this.formatResponse(memberAPIKeys);
        })

        server.tool('createEmailTemplate', 'Creates an customer email template for the project.', {
            liveProjectId: z.string(),
            ...emailTemplateOptions
        }, async ({ ...emailTemplateOptions}) => {
            const { projectId, } = await this.fetchProjectCredentials();
            const response = await fetch(`https://management.stytch.com/v1/projects/${projectId}/email_templates`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.props.accessToken,
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
            return this.formatResponse(`Email template created for ${projectId}. Email template id: ${emailTemplate.email_template_id}`)
        })

        server.tool('sendMagicLink', 'Sends a magic link to a user\'s email address', {
            ...sendMagicLinkParams
        }, async (params) => {
            const { projectId, secret, apiBaseURL } = await this.fetchProjectCredentials();

            const response = await fetch(apiBaseURL + 'magic_links/email/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${btoa(`${projectId}:${secret}`)}`,
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

        server.tool('LoginOrCreateEmailOTP', 'Sends an email one time passcode to the specified email', {...LoginOrCreateEmailOTPBody}, async ({...loginOrCreateEmailOTPBody}) => {
            const { projectId, secret, apiBaseURL } = await this.fetchProjectCredentials();
            const response = await fetch(apiBaseURL + `otps/email/login_or_create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${btoa(`${projectId}:${secret}`)}`
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