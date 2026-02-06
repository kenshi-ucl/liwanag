import { createFileRoute } from '@tanstack/react-router';
import { json } from '@tanstack/react-start';
import { db } from '../../../db';
import { eq } from 'drizzle-orm';
import { users } from '../../../db/schema';

export const Route = createFileRoute('/api/auth/signup')({
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

                    if (password.length < 6) {
                        return json(
                            { error: 'Password must be at least 6 characters' },
                            { status: 400 }
                        );
                    }

                    // Check if user already exists
                    const existingUsers = await db
                        .select()
                        .from(users)
                        .where(eq(users.email, email.toLowerCase()));

                    if (existingUsers.length > 0) {
                        return json(
                            { error: 'An account with this email already exists' },
                            { status: 409 }
                        );
                    }

                    // Create new user
                    const newUser = await db
                        .insert(users)
                        .values({
                            email: email.toLowerCase(),
                            passwordHash: simpleHash(password),
                            name: email.split('@')[0],
                        })
                        .returning();

                    if (newUser.length === 0) {
                        throw new Error('Failed to create user');
                    }

                    // Return user info (excluding password)
                    return json({
                        user: {
                            id: newUser[0].id,
                            email: newUser[0].email,
                            name: newUser[0].name,
                        },
                        message: 'Account created successfully',
                    });
                } catch (error) {
                    console.error('Sign up error:', error);
                    return json(
                        { error: 'Sign up failed' },
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
