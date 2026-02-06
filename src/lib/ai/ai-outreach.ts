/**
 * AI Outreach Generator
 * 
 * Implements the "One-Click Context" feature from plan section 6.3.
 * Generates personalized cold email openers based on lead data.
 * 
 * For hackathon demo: Uses template-based generation.
 * Production version would integrate with OpenAI GPT-4o.
 */

export interface LeadContext {
    jobTitle: string;
    companyName: string;
    industry?: string;
    headcount?: number;
}

export interface GeneratedOutreach {
    subject: string;
    opener: string;
    fullEmail: string;
}

// Cold email opener templates based on job title patterns
const OPENER_TEMPLATES = {
    cto: [
        "I noticed you're leading the technical vision at {company}. With {headcount}+ engineers relying on your architecture decisions, you're probably always looking for ways to improve team velocity.",
        "As CTO at {company}, you likely see firsthand how much time your team spends on manual data tasks. I've been researching how {industry} leaders are automating their GTM workflows.",
        "Building tech at {company} must mean you're constantly balancing innovation with operational efficiency. That's exactly the challenge we help CTOs solve.",
    ],
    vp_engineering: [
        "Running engineering at {company} means you're managing both the technical roadmap and team productivity. I wanted to share something that's helping VPs ship faster.",
        "With {headcount}+ in your org at {company}, you've probably seen how scattered data can slow down even the best teams. That's a pattern we've helped other VPs solve.",
        "Scaling engineering at {company} while maintaining quality is no small feat. I'd love to show you how other VPs in {industry} are automating their operations.",
    ],
    director: [
        "Directors at {company} are often the ones who actually make things happen. I noticed your work in {industry} and thought you might find this relevant.",
        "Leading a team at a {headcount}-person company like {company} means wearing multiple hats. Here's something that's helped other directors streamline their workflow.",
        "I've been following {company}'s growth in {industry}. As a Director there, you probably have unique insights into the challenges of scaling operations.",
    ],
    vp_sales: [
        "Hitting quota at {company} with a {headcount}-person org means every lead counts. I noticed you're exploring new GTM approaches and thought this might help.",
        "VPs of Sales in {industry} are telling us the biggest challenge isn't finding leads—it's finding the RIGHT leads. Sound familiar?",
        "Growing revenue at {company} probably means you're always looking for qualified pipeline. Here's how other VPs are finding hidden opportunities.",
    ],
    head_of_growth: [
        "Growth at {company} must be an exciting challenge in {industry}. I noticed you're focused on scalable acquisition and thought you'd find this interesting.",
        "As Head of Growth at a {headcount}-person company, you're probably laser-focused on efficient CAC. Here's something that's changing the game for growth leaders.",
        "I've been researching growth strategies in {industry} and {company} keeps coming up. Would love to share how other growth leaders are unlocking hidden pipeline.",
    ],
    default: [
        "I came across {company}'s work in {industry} and was impressed by what you're building. As {title}, you probably have unique visibility into the challenges your team faces.",
        "Working at a {headcount}-person company like {company} means you're in that exciting growth phase where the right tools make all the difference.",
        "I noticed you're part of the team at {company}. Given your role as {title}, I thought you might be interested in how similar companies are approaching this.",
    ],
};

// Subject line templates
const SUBJECT_TEMPLATES = [
    "Quick thought on {company}'s GTM approach",
    "Idea for {company} re: hidden pipeline",
    "{firstName}, a 2-min opportunity for {company}",
    "Noticed something about {company}'s growth",
    "For {title}s who care about qualified pipeline",
];

// Call-to-action templates
const CTA_TEMPLATES = [
    "Would a 15-minute call this week make sense to explore?",
    "Open to a quick chat to see if this is relevant?",
    "Worth a quick demo? I can show you in 10 minutes.",
    "Happy to share more if this resonates with your current priorities.",
    "If this sounds interesting, I'd love to show you what I mean.",
];

/**
 * Determine which template category to use based on job title
 */
function getTemplateCategory(jobTitle: string): keyof typeof OPENER_TEMPLATES {
    const title = jobTitle.toLowerCase();

    if (title.includes('cto') || title.includes('chief technology')) {
        return 'cto';
    }
    if (title.includes('vp') && title.includes('engineering')) {
        return 'vp_engineering';
    }
    if (title.includes('vp') && title.includes('sales')) {
        return 'vp_sales';
    }
    if (title.includes('director')) {
        return 'director';
    }
    if (title.includes('head of growth') || title.includes('growth')) {
        return 'head_of_growth';
    }

    return 'default';
}

/**
 * Get a random element from an array
 */
function randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Fill template placeholders with actual values
 */
function fillTemplate(template: string, context: LeadContext): string {
    return template
        .replace(/{company}/g, context.companyName)
        .replace(/{title}/g, context.jobTitle)
        .replace(/{industry}/g, context.industry || 'your industry')
        .replace(/{headcount}/g, String(context.headcount || 50))
        .replace(/{firstName}/g, 'there'); // Would extract from name in production
}

/**
 * Generate a personalized cold email for a lead
 * 
 * This is the "One-Click Context" feature from the hackathon plan.
 * Currently uses template-based generation for demo purposes.
 * 
 * @param context - Lead information to personalize the email
 * @returns Generated email with subject, opener, and full text
 */
export function generateOutreach(context: LeadContext): GeneratedOutreach {
    const category = getTemplateCategory(context.jobTitle);
    const templates = OPENER_TEMPLATES[category];

    const openerTemplate = randomChoice(templates);
    const subjectTemplate = randomChoice(SUBJECT_TEMPLATES);
    const ctaTemplate = randomChoice(CTA_TEMPLATES);

    const opener = fillTemplate(openerTemplate, context);
    const subject = fillTemplate(subjectTemplate, context);
    const cta = fillTemplate(ctaTemplate, context);

    const fullEmail = `${opener}

I've been helping companies like yours uncover hidden revenue in their newsletter subscribers. Using our "waterfall" enrichment approach, we're achieving 80%+ match rates on personal emails—turning anonymous @gmail.com subscribers into qualified enterprise opportunities.

${cta}

Best,
[Your Name]`;

    return {
        subject,
        opener,
        fullEmail,
    };
}

/**
 * Async version for potential future API integration
 */
export async function generateOutreachAsync(context: LeadContext): Promise<GeneratedOutreach> {
    // Simulate API call latency for demo effect
    await new Promise(resolve => setTimeout(resolve, 500));
    return generateOutreach(context);
}
