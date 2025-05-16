import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from "agents/mcp";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { getStytchOAuthEndpointUrl } from "./lib/auth.ts";

const createPublicTokenParams = {
    project_id: z.string(),
};

const createRedirectURLParams = {
    project_id: z.string(),
    url: z.string(),
    valid_types: z.array(z.object({ type: z.string(), is_default: z.boolean() }))
};

const getAllRedirectURLsParams = {
    project_id: z.string(),
};

const getOrDeleteRedirectURLParams = {
    project_id: z.string(),
    url: z.string(),
};

const updateRedirectURLParams = {
    project_id: z.string(),
    url: z.string(),
    valid_types: z.array(z.object({ type: z.string(), is_default: z.boolean() }))
};

// Define input parameters for new tools
const getAllPublicTokensParams = {
    project_id: z.string(),
};

const deletePublicTokenParams = {
    project_id: z.string(),
    public_token: z.string(),
};

// Define input parameters for secrets
const getSecretParams = {
    project_id: z.string(),
    secret_id: z.string(),
};

const getAllSecretsParams = {
    project_id: z.string(),
};

const createSecretParams = {
    project_id: z.string(),
};

const deleteSecretParams = {
    project_id: z.string(),
    secret_id: z.string(),
};

const getEmailTemplateParams = {
    project_id: z.string(),
    template_id: z.string(),
};

const getAllEmailTemplatesParams = {
    project_id: z.string(),
};

const deleteEmailTemplateParams = {
    project_id: z.string(),
    template_id: z.string(),
};

const updateEmailTemplateParams = {
    project_id: z.string(),
    template_id: z.string(),
    name: z.string().optional(),
    subject: z.string().optional(),
    body: z.string().optional(),
};

const createEmailTemplateParams = {
    project_id: z.string(),
    template_id: z.string(),
    name: z.string(),
    button_border_radius: z.number().optional(),
    button_color: z.string().optional().default('#106ee9'),
    button_text_color: z.string().optional(),
    font_family: z.string().optional(),
    text_alignment: z.string().optional(),
};

const getPasswordStrengthConfigParams = {
    project_id: z.string(),
};

const setPasswordStrengthConfigParams = {
    project_id: z.string(),
    password_strength_config: z.object({
        check_breach_on_creation: z.boolean(),
        check_breach_on_authentication: z.boolean(),
        validate_on_authentication: z.boolean(),
        validation_policy: z.enum(['LUDS', 'ZXCVBN']),
        luds_min_password_length: z.number().int().min(8).max(32).optional(),
        luds_min_password_complexity: z.number().int().min(1).max(4).optional(),
    })
};

type AuthenticationContext = {
    subject: string,
    accessToken: string,
}

export class WeatherAppMCP extends McpAgent<Env, unknown, AuthenticationContext> {
    async init() {
    }

    private async fetchWithErrorHandling<T>(url: string, options: RequestInit): Promise<T> {
        const enhancedOptions = {
            ...options,
            headers: {
                'Authorization': `Bearer ${this.props.accessToken}`,
                ...(options.headers || {})
            }
        };
        const response = await fetch(url, enhancedOptions);
        if (!response.ok) {
            const errorText = await response.text();
            throw new HTTPException(400, {message: `Error: ${response.statusText} - ${errorText}`});
        }
        return response.json();
    }

    async createEmailTemplate(project_id: string, template_id: string, name: string, prebuiltCustomization: unknown): Promise<string> {
        const url = `https://management.stytch.com/v1/projects/${project_id}/email_templates`;
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email_template: {
                    template_id: template_id,
                    name: name,
                    prebuilt_customization: prebuiltCustomization
                }
            })
        };
        const result = await this.fetchWithErrorHandling(url, options);
        return `Email template created: ${JSON.stringify(result)}`;
    }

    async createPublicToken(project_id: string): Promise<string> {
        const url = `https://api.stytch.com/v1/projects/${project_id}/public_tokens`;
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ project_id })
        };
        const result = await this.fetchWithErrorHandling(url, options);
        return `Public token created: ${JSON.stringify(result)}`;
    }

    async getAllPublicTokens(project_id: string): Promise<string> {
        const url = `https://api.stytch.com/v1/projects/${project_id}/public_tokens`;
        const options = {
            method: 'GET',
        };
        const tokens = await this.fetchWithErrorHandling(url, options);
        return `Public tokens: ${JSON.stringify(tokens)}`;
    }

    async deletePublicToken(project_id: string, public_token: string): Promise<string> {
        const url = `https://api.stytch.com/v1/projects/${project_id}/public_tokens/${public_token}`;
        const options = {
            method: 'DELETE',
        };
        await this.fetchWithErrorHandling<void>(url, options);
        return `Public token ${public_token} deleted successfully.`;
    }

    async createRedirectURL(project_id: string, url: string, valid_types: Array<{type: string, is_default: boolean}>): Promise<string> {
        const apiUrl = `https://api.stytch.com/v1/projects/${project_id}/redirect_urls`;
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ redirect_url: { url, valid_types } })
        };
        const result = await this.fetchWithErrorHandling(apiUrl, options);
        return `Redirect URL created: ${JSON.stringify(result)}`;
    }

    async getAllRedirectURLs(project_id: string): Promise<string> {
        const apiUrl = `https://api.stytch.com/v1/projects/${project_id}/redirect_urls/all`;
        const options = {
            method: 'GET',
        };
        const result = await this.fetchWithErrorHandling(apiUrl, options);
        return `All Redirect URLs: ${JSON.stringify(result)}`;
    }

    async getRedirectURL(project_id: string, url: string): Promise<string> {
        const apiUrl = `https://api.stytch.com/v1/projects/${project_id}/redirect_urls?url=${encodeURIComponent(url)}`;
        const options = {
            method: 'GET',
        };
        const result = await this.fetchWithErrorHandling(apiUrl, options);
        return `Redirect URL Details: ${JSON.stringify(result)}`;
    }

    async updateRedirectURL(project_id: string, url: string, valid_types: Array<{type: string, is_default: boolean}>): Promise<string> {
        const apiUrl = `https://api.stytch.com/v1/projects/${project_id}/redirect_urls?url=${encodeURIComponent(url)}`;
        const options = {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ redirect_url: { url, valid_types } })
        };
        const result = await this.fetchWithErrorHandling(apiUrl, options);
        return `Redirect URL updated: ${JSON.stringify(result)}`;
    }

    async deleteRedirectURL(project_id: string, url: string): Promise<string> {
        const apiUrl = `https://api.stytch.com/v1/projects/${project_id}/redirect_urls?url=${encodeURIComponent(url)}`;
        const options = {
            method: 'DELETE',
        };
        await this.fetchWithErrorHandling<void>(apiUrl, options);
        return `Redirect URL deleted successfully.`;
    }

    async getSecret(project_id: string, secret_id: string): Promise<string> {
        const apiUrl = `https://api.stytch.com/v1/projects/${project_id}/secrets/${secret_id}`;
        const options = {
            method: 'GET',
        };
        const secret = await this.fetchWithErrorHandling(apiUrl, options);
        return `Secret Details: ${JSON.stringify(secret)}`;
    }

    async getAllSecrets(project_id: string): Promise<string> {
        const apiUrl = `https://api.stytch.com/v1/projects/${project_id}/secrets`;
        const options = {
            method: 'GET',
        };
        const secrets = await this.fetchWithErrorHandling(apiUrl, options);
        return `All Secrets: ${JSON.stringify(secrets)}`;
    }

    async createSecret(project_id: string): Promise<string> {
        const apiUrl = `https://api.stytch.com/v1/projects/${project_id}/secrets`;
        const options = {
            method: 'POST',
        };
        const secret = await this.fetchWithErrorHandling(apiUrl, options);
        return `Secret created: ${JSON.stringify(secret)}`;
    }

    async deleteSecret(project_id: string, secret_id: string): Promise<string> {
        const apiUrl = `https://api.stytch.com/v1/projects/${project_id}/secrets/${secret_id}`;
        const options = {
            method: 'DELETE',
        };
        await this.fetchWithErrorHandling<void>(apiUrl, options);
        return `Secret ID ${secret_id} deleted successfully.`;
    }

    async getEmailTemplate(project_id: string, template_id: string): Promise<string> {
        const apiUrl = `https://api.stytch.com/v1/projects/${project_id}/email_templates/${template_id}`;
        const options = {
            method: 'GET',
        };
        const template = await this.fetchWithErrorHandling(apiUrl, options);
        return `Email Template Details: ${JSON.stringify(template)}`;
    }

    async getAllEmailTemplates(project_id: string): Promise<string> {
        const apiUrl = `https://api.stytch.com/v1/projects/${project_id}/email_templates`;
        const options = {
            method: 'GET',
        };
        const templates = await this.fetchWithErrorHandling(apiUrl, options);
        return `All Email Templates: ${JSON.stringify(templates)}`;
    }

    async deleteEmailTemplate(project_id: string, template_id: string): Promise<string> {
        const apiUrl = `https://api.stytch.com/v1/projects/${project_id}/email_templates/${template_id}`;
        const options = {
            method: 'DELETE',
        };
        await this.fetchWithErrorHandling<void>(apiUrl, options);
        return `Email Template ID ${template_id} deleted successfully.`;
    }

    async updateEmailTemplate(project_id: string, template_id: string, name?: string, subject?: string, body?: string): Promise<string> {
        const apiUrl = `https://api.stytch.com/v1/projects/${project_id}/email_templates/${template_id}`;
        const options = {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email_template: { template_id, name, subject, body } })
        };
        const template = await this.fetchWithErrorHandling(apiUrl, options);
        return `Email Template updated: ${JSON.stringify(template)}`;
    }

    async getPasswordStrengthConfig(project_id: string): Promise<string> {
        const apiUrl = `https://api.stytch.com/v1/projects/${project_id}/password_strength`;
        const options = {
            method: 'GET',
        };
        const config = await this.fetchWithErrorHandling(apiUrl, options);
        return `Password Strength Config: ${JSON.stringify(config)}`;
    }

    async setPasswordStrengthConfig(project_id: string, password_strength_config: object): Promise<string> {
        const apiUrl = `https://api.stytch.com/v1/projects/${project_id}/password_strength`;
        const options = {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password_strength_config })
        };
        const result = await this.fetchWithErrorHandling(apiUrl, options);
        return `Password Strength Config updated: ${JSON.stringify(result)}`;
    }

    formatResponse = (description: string): {
        content: Array<{ type: 'text', text: string }>
    } => {
        return {
            content: [{
                type: "text",
                text: description
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
                            isError: true,
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

        server.tool('createRedirectURL', 'Create a redirect URL for your project', createRedirectURLParams, async ({ project_id, url, valid_types }) => {
            const result = await this.createRedirectURL(project_id, url, valid_types);
            return this.formatResponse(result);
        });

        server.tool('getAllRedirectURLs', 'Retrieve all redirect URLs for a project', getAllRedirectURLsParams, async ({ project_id }) => {
            const result = await this.getAllRedirectURLs(project_id);
            return this.formatResponse(result);
        });

        server.tool('getRedirectURL', 'Retrieve a specific redirect URL for a project', getOrDeleteRedirectURLParams, async ({ project_id, url }) => {
            const result = await this.getRedirectURL(project_id, url);
            return this.formatResponse(result);
        });

        server.tool('updateRedirectURL', 'Update valid types for a redirect URL for a project', updateRedirectURLParams, async ({ project_id, url, valid_types }) => {
            const result = await this.updateRedirectURL(project_id, url, valid_types);
            return this.formatResponse(result);
        });

        server.tool('deleteRedirectURL', 'Delete a redirect URL for a project', getOrDeleteRedirectURLParams, async ({ project_id, url }) => {
            const result = await this.deleteRedirectURL(project_id, url);
            return this.formatResponse(result);
        });

        // Removed redundant or unnecessary tools

        // Add the createPublicToken tool
        server.tool('createPublicToken', 'Creates a public token for a project', createPublicTokenParams, async ({ project_id }) => {
            const tokenDescription = await this.createPublicToken(project_id);
            return this.formatResponse(tokenDescription);
        });

        // Add the getAllPublicTokens tool
        server.tool('getAllPublicTokens', 'Retrieve all active public tokens for a project', getAllPublicTokensParams, async ({ project_id }) => {
            const tokensDescription = await this.getAllPublicTokens(project_id);
            return this.formatResponse(tokensDescription);
        });

        // Add the deletePublicToken tool
        server.tool('deletePublicToken', 'Delete a specific public token for a project', deletePublicTokenParams, async ({ project_id, public_token }) => {
            const result = await this.deletePublicToken(project_id, public_token);
            return this.formatResponse(result);
        });

        // Add the getSecret tool
        server.tool('getSecret', 'Retrieve a specific secret for a project', getSecretParams, async ({ project_id, secret_id }) => {
            const result = await this.getSecret(project_id, secret_id);
            return this.formatResponse(result);
        });

        // Add the getAllSecrets tool
        server.tool('getAllSecrets', 'Retrieve all secrets for a project', getAllSecretsParams, async ({ project_id }) => {
            const result = await this.getAllSecrets(project_id);
            return this.formatResponse(result);
        });

        // Add the createSecret tool
        server.tool('createSecret', 'Create a new secret for a project', createSecretParams, async ({ project_id }) => {
            const result = await this.createSecret(project_id);
            return this.formatResponse(result);
        });

        // Add the deleteSecret tool
        server.tool('deleteSecret', 'Delete a specific secret for a project', deleteSecretParams, async ({ project_id, secret_id }) => {
            const result = await this.deleteSecret(project_id, secret_id);
            return this.formatResponse(result);
        });

        server.tool('createEmailTemplate', 'Creates an custom email template for the project.', createEmailTemplateParams, async ({ project_id, template_id, name, ...prebuiltCustomizationOptions}) => {
            const result = await this.createEmailTemplate(project_id, template_id, name, prebuiltCustomizationOptions);
            return this.formatResponse(result);
        });

        // Add the getEmailTemplate tool
        server.tool('getEmailTemplate', 'Retrieve a specific email template for a project', getEmailTemplateParams, async ({ project_id, template_id }) => {
            const result = await this.getEmailTemplate(project_id, template_id);
            return this.formatResponse(result);
        });

        // Add the getAllEmailTemplates tool
        server.tool('getAllEmailTemplates', 'Retrieve all email templates for a project', getAllEmailTemplatesParams, async ({ project_id }) => {
            const result = await this.getAllEmailTemplates(project_id);
            return this.formatResponse(result);
        });

        // Add the deleteEmailTemplate tool
        server.tool('deleteEmailTemplate', 'Delete a specific email template for a project', deleteEmailTemplateParams, async ({ project_id, template_id }) => {
            const result = await this.deleteEmailTemplate(project_id, template_id);
            return this.formatResponse(result);
        });

        // Add the updateEmailTemplate tool
        server.tool('updateEmailTemplate', 'Update an email template for a project', updateEmailTemplateParams, async ({ project_id, template_id, name, subject, body }) => {
            const result = await this.updateEmailTemplate(project_id, template_id, name, subject, body);
            return this.formatResponse(result);
        });

        // Add the getPasswordStrengthConfig tool
        server.tool('getPasswordStrengthConfig', 'Retrieve the password strength configuration for a project', getPasswordStrengthConfigParams, async ({ project_id }) => {
            const result = await this.getPasswordStrengthConfig(project_id);
            return this.formatResponse(result);
        });

        // Add the setPasswordStrengthConfig tool
        server.tool('setPasswordStrengthConfig', 'Set the password strength configuration for a project', setPasswordStrengthConfigParams, async ({ project_id, password_strength_config }) => {
            const result = await this.setPasswordStrengthConfig(project_id, password_strength_config);
            return this.formatResponse(result);
        });

        return server
    }
}