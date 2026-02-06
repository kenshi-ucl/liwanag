import { createFileRoute } from '@tanstack/react-router';
import { json } from '@tanstack/react-start';
import { db } from '../../../db';
import { eq } from 'drizzle-orm';
import { users } from '../../../db/schema';

export const Route = createFileRoute('/api/auth/signin')({
    server: {
        handlers: {
            POST: async ({ request }) => {
                try {
                    const body = await request.json();
                    const { email, password } = body;

                    if (!email || !password) {
                        return json(
                            { error: 'Email and password are required' },
                            { status: 400 }
                        );
                    }

                    // For demo purposes, we'll do simple validation
                    const existingUsers = await db
                        .select()
                        .from(users)
                        .where(eq(users.email, email.toLowerCase()));

                    if (existingUsers.length === 0) {
                        return json(
                            { error: 'Invalid email or password' },
                            { status: 401 }
                        );
                    }

                    const user = existingUsers[0];

                    // Simple password check (in production, use bcrypt)
                    if (user.passwordHash !== simpleHash(password)) {
                        return json(
                            { error: 'Invalid email or password' },
                            { status: 401 }
                        );
                    }

                    // Return user info (excluding password)
                    return json({
                        user: {
                            id: user.id,
                            email: user.email,
                            name: user.name,
                        },
                        message: 'Signed in successfully',
                    });
                } catch (error) {
                    console.error('Sign in error:', error);
                    return json(
                        { error: 'Sign in failed' },
                        { status: 500 }
                    );
                }
            },
        },
    },
});

// Simple hash function for demo purposes only
function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(16);
}
