import { createFileRoute } from '@tanstack/react-router';
import { json } from '@tanstack/react-start';

export const Route = createFileRoute('/api/outreach')({
    server: {
        handlers: {
            POST: async ({ request }) => {
                try {
                    const body = await request.json();
                    const { jobTitle, companyName, industry, headcount } = body;

                    if (!jobTitle || !companyName) {
                        return json(
                            { error: 'Missing required fields: jobTitle and companyName' },
                            { status: 400 }
                        );
                    }

                    // Generate personalized outreach using AI-style templates
                    const outreach = generatePersonalizedOutreach({
                        jobTitle,
                        companyName,
                        industry: industry || 'technology',
                        headcount: headcount || 0,
                    });

                    return json(outreach, { status: 200 });
                } catch (error) {
                    console.error('Outreach generation error:', error);
                    return json(
                        { error: 'Failed to generate outreach' },
                        { status: 500 }
                    );
                }
            },
        },
    },
});

interface OutreachInput {
    jobTitle: string;
    companyName: string;
    industry: string;
    headcount: number;
}

interface GeneratedOutreach {
    subject: string;
    opener: string;
    fullEmail: string;
}

/**
 * Generate personalized outreach email based on lead data
 * Uses smart templates that feel AI-generated without requiring OpenAI API
 */
function generatePersonalizedOutreach(input: OutreachInput): GeneratedOutreach {
    const { jobTitle, companyName, industry, headcount } = input;

    // Determine seniority level for tone adjustment
    const isExecutive = /^(CTO|CEO|VP|Chief|Director|Head of|President)/i.test(jobTitle);
    const isManager = /Manager|Lead|Principal/i.test(jobTitle);

    // Get company size context
    const companySizeContext = getCompanySizeContext(headcount);

    // Generate contextual subject lines based on role
    const subjects = generateSubjectOptions(jobTitle, companyName, industry);
    const subject = subjects[Math.floor(Math.random() * subjects.length)];

    // Generate personalized opener
    const opener = generateOpener(jobTitle, companyName, industry, isExecutive);

    // Generate full email body
    const fullEmail = generateFullEmail({
        jobTitle,
        companyName,
        industry,
        companySizeContext,
        isExecutive,
        isManager,
        opener,
    });

    return {
        subject,
        opener,
        fullEmail,
    };
}

function getCompanySizeContext(headcount: number): string {
    if (headcount >= 1000) return 'enterprise-scale organization';
    if (headcount >= 500) return 'rapidly growing company';
    if (headcount >= 100) return 'scaling team';
    if (headcount >= 50) return 'agile organization';
    return 'dynamic company';
}

function generateSubjectOptions(jobTitle: string, companyName: string, industry: string): string[] {
    const firstName = companyName.split(' ')[0];

    return [
        `Quick thought for ${firstName}'s GTM strategy`,
        `${jobTitle} → hidden pipeline opportunity`,
        `Re: ${industry} newsletter subscribers`,
        `Idea for ${companyName}'s dark funnel`,
        `Found this relevant for ${jobTitle}s in ${industry}`,
    ];
}

function generateOpener(
    jobTitle: string,
    companyName: string,
    industry: string,
    isExecutive: boolean
): string {
    if (isExecutive) {
        return `Hi! I noticed you're leading ${companyName}'s efforts in ${industry.toLowerCase()}. ` +
            `I've been thinking about how companies in your space handle the "dark funnel" problem ` +
            `(when high-value prospects subscribe to newsletters with personal emails like Gmail).`;
    }

    return `Hi! I came across ${companyName} and was impressed by what you're building in ${industry.toLowerCase()}. ` +
        `As a ${jobTitle}, you're probably familiar with the challenge of identifying high-intent leads ` +
        `who use personal emails to subscribe to newsletters and webinars.`;
}

interface EmailContext {
    jobTitle: string;
    companyName: string;
    industry: string;
    companySizeContext: string;
    isExecutive: boolean;
    isManager: boolean;
    opener: string;
}

function generateFullEmail(ctx: EmailContext): string {
    const valueProps = ctx.isExecutive
        ? [
            `We've helped similar ${ctx.companySizeContext}s in ${ctx.industry.toLowerCase()} uncover 50%+ more qualified leads by revealing the enterprise buyers hiding behind @gmail.com addresses.`,
            `One ${ctx.industry} company found $245k in hidden pipeline from their existing newsletter list in the first week.`,
        ]
        : [
            `Imagine identifying that a VP of Engineering at a Fortune 500 just subscribed to your newsletter — but they used their personal Gmail. Traditional tools miss this entirely.`,
            `We've built technology that resolves personal emails to professional identities with 80%+ accuracy, using a 15-provider waterfall enrichment approach.`,
        ];

    const cta = ctx.isExecutive
        ? `Would it make sense to explore how this could work for ${ctx.companyName}? I can share a quick demo tailored to ${ctx.industry.toLowerCase()} use cases.`
        : `If this resonates, I'd love to show you how it works. Would a brief 15-minute call make sense this week?`;

    return `${ctx.opener}

${valueProps[0]}

${valueProps[1]}

${cta}

Best,
[Your Name]

P.S. No pressure at all — happy to share some resources on dark funnel intelligence if you're just exploring the space.`;
}
