import { createFileRoute } from '@tanstack/react-router';
import { db } from '../../../../db';
import { users } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

/**
 * GitHub OAuth Callback Endpoint
 * 
 * Handles the callback from GitHub OAuth, exchanges code for access token,
 * fetches user info, creates/updates user in database, and redirects to dashboard.
 */
export const Route = createFileRoute('/api/auth/github/callback')({
    server: {
        handlers: {
            GET: async ({ request }) => {
                const url = new URL(request.url);
                const code = url.searchParams.get('code');
                const error = url.searchParams.get('error');

                if (error) {
                    return new Response(null, {
                        status: 302,
                        headers: { Location: '/signin?error=github_denied' },
                    });
                }

                if (!code) {
                    return new Response(null, {
                        status: 302,
                        headers: { Location: '/signin?error=no_code' },
                    });
                }

                const clientId = process.env.GITHUB_CLIENT_ID;
                const clientSecret = process.env.GITHUB_CLIENT_SECRET;

                if (!clientId || !clientSecret) {
                    return new Response(null, {
                        status: 302,
                        headers: { Location: '/signin?error=config_missing' },
                    });
                }

                try {
                    // Exchange code for access token
                    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        },
                        body: JSON.stringify({
                            client_id: clientId,
                            client_secret: clientSecret,
                            code,
                        }),
                    });

                    const tokenData = await tokenResponse.json();
                    const accessToken = tokenData.access_token;

                    if (!accessToken) {
                        return new Response(null, {
                            status: 302,
                            headers: { Location: '/signin?error=token_failed' },
                        });
                    }

                    // Fetch user info from GitHub
                    const userResponse = await fetch('https://api.github.com/user', {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Accept': 'application/vnd.github.v3+json',
                        },
                    });

                    const githubUser = await userResponse.json();

                    // Fetch user's email (might be private)
                    const emailResponse = await fetch('https://api.github.com/user/emails', {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Accept': 'application/vnd.github.v3+json',
                        },
                    });

                    const emails = await emailResponse.json();
                    const primaryEmail = emails.find((e: any) => e.primary)?.email || emails[0]?.email || `${githubUser.login}@github.local`;

                    // Check if user exists
                    let user = await db.select().from(users).where(eq(users.email, primaryEmail)).limit(1);

                    if (user.length === 0) {
                        // Create new user
                        const newUser = await db.insert(users).values({
                            email: primaryEmail,
                            name: githubUser.name || githubUser.login,
                            passwordHash: `github:${githubUser.id}`, // Mark as GitHub auth
                        }).returning();
                        user = newUser;
                    }

                    const userData = {
                        id: user[0].id,
                        email: user[0].email,
                        name: user[0].name,
                    };

                    // Return HTML that sets localStorage and redirects
                    const html = `
            <!DOCTYPE html>
            <html>
              <head>
                <script>
                  localStorage.setItem('liwanag_user', JSON.stringify(${JSON.stringify(userData)}));
                  window.location.href = '/dashboard';
                </script>
              </head>
              <body>Signing you in...</body>
            </html>
          `;

                    return new Response(html, {
                        headers: { 'Content-Type': 'text/html' },
                    });

                } catch (error) {
                    console.error('GitHub OAuth error:', error);
                    return new Response(null, {
                        status: 302,
                        headers: { Location: '/signin?error=oauth_failed' },
                    });
                }
            },
        },
    },
});
