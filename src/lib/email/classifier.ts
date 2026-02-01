/**
 * Email type classification
 */
export type EmailType = 'personal' | 'corporate';

/**
 * Common consumer email domains
 */
const CONSUMER_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'aol.com',
  'protonmail.com',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'gmx.com',
  'live.com',
  'msn.com',
  'me.com',
  'mac.com',
]);

/**
 * Classifies an email address as personal or corporate based on domain
 * 
 * @param email - The email address to classify
 * @returns 'personal' for consumer domains, 'corporate' for all others
 */
export function classifyEmail(email: string): EmailType {
  // Extract domain from email
  const domain = email.split('@')[1]?.toLowerCase();
  
  if (!domain) {
    // If no domain found, default to corporate
    return 'corporate';
  }
  
  // Check if domain is in consumer list
  return CONSUMER_DOMAINS.has(domain) ? 'personal' : 'corporate';
}
