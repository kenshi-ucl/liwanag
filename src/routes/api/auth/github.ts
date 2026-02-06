import { createFileRoute } from '@tanstack/react-router';

/**
 * GitHub OAuth Initiation Endpoint
 * 
 * Redirects user to GitHub OAuth authorization page.
 * Required environment variables:
 * - GITHUB_CLIENT_ID: Your GitHub OAuth App Client ID
 * - GITHUB_REDIRECT_URI: Should be http://localhost:3000/api/auth/github/callback
 */
export const Route = createFileRoute('/api/auth/github')({
    server: {
        handlers: {
            GET: async ({ request }) => {
                const clientId = process.env.GITHUB_CLIENT_ID;

                if (!clientId) {
                    // For demo purposes, create a mock user and redirect
                    const mockUser = {
                        id: 'demo-github-user',
                        email: 'demo@github.com',
                        name: 'GitHub Demo User',
                    };

                    // Return HTML that sets localStorage and redirects
                    const html = `
            <!DOCTYPE html>
            <html>
              <head>
                <script>
                  localStorage.setItem('liwanag_user', JSON.stringify(${JSON.stringify(mockUser)}));
                  window.location.href = '/dashboard';
                </script>
              </head>
              <body>Redirecting...</body>
            </html>
          `;

                    return new Response(html, {
                        headers: { 'Content-Type': 'text/html' },
                    });
                }

                const redirectUri = process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/api/auth/github/callback';
                const scope = 'user:email';

                const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`;

                return new Response(null, {
                    status: 302,
                    headers: { Location: authUrl },
                });
            },
        },
    },
});
