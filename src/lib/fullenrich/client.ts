import { env } from '../../config/env';
import {
  bulkEnrichmentRequestSchema,
  bulkEnrichmentResponseSchema,
  type BulkEnrichmentRequest,
  type BulkEnrichmentResponse,
} from './schemas';

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  multiplier: number;
  retryableStatusCodes: number[];
}

export const defaultRetryConfig: RetryConfig = {
  maxAttempts: 5,
  initialDelay: 1000,
  maxDelay: 60000,
  multiplier: 2,
  retryableStatusCodes: [429, 500, 502, 503, 504],
};

export class FullEnrichAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public retryAfter?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'FullEnrichAPIError';
  }
}

export class FullEnrichClient {
  private apiKey: string;
  private baseUrl: string;
  private retryConfig: RetryConfig;

  constructor(
    apiKey?: string,
    baseUrl: string = 'https://app.fullenrich.com/api',
    retryConfig: RetryConfig = defaultRetryConfig
  ) {
    this.apiKey = apiKey || env.FULLENRICH_API_KEY;
    this.baseUrl = baseUrl;
    this.retryConfig = retryConfig;
  }

  /**
   * Submit bulk enrichment request to FullEnrich API
   * Uses Reverse Email Lookup endpoint since we only have email addresses
   */
  async bulkEnrich(request: BulkEnrichmentRequest): Promise<BulkEnrichmentResponse> {
    try {
      // Log the request for debugging
      console.log('FullEnrich API Request:', JSON.stringify(request, null, 2));
      
      // Validate request
      const validatedRequest = bulkEnrichmentRequestSchema.parse(request);
      
      console.log('FullEnrich API Validated Request:', JSON.stringify(validatedRequest, null, 2));

      // Make API call with retry logic - use Reverse Email Lookup endpoint
      const response = await this.makeRequest('/v2/contact/reverse/email/bulk', {
        method: 'POST',
        body: JSON.stringify(validatedRequest),
      });

      console.log('FullEnrich API Response:', JSON.stringify(response, null, 2));

      // Validate response
      const validatedResponse = bulkEnrichmentResponseSchema.parse(response);
      return validatedResponse;
    } catch (error) {
      console.error('FullEnrich API Error:', error);
      throw error;
    }
  }

  /**
   * Make HTTP request with retry logic and error handling
   */
  private async makeRequest(
    endpoint: string,
    options: RequestInit,
    attempt: number = 1
  ): Promise<unknown> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...options.headers,
        },
      });

      // Handle rate limiting (429)
      if (response.status === 429) {
        const retryAfter = this.getRetryAfter(response);
        
        if (attempt < this.retryConfig.maxAttempts) {
          await this.sleep(retryAfter);
          return this.makeRequest(endpoint, options, attempt + 1);
        }
        
        throw new FullEnrichAPIError(
          'Rate limit exceeded and max retries reached',
          429,
          retryAfter
        );
      }

      // Handle credit exhaustion (402)
      if (response.status === 402) {
        throw new FullEnrichAPIError(
          'Insufficient credits',
          402
        );
      }

      // Handle other error status codes
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        
        // Retry on retryable status codes
        if (
          this.retryConfig.retryableStatusCodes.includes(response.status) &&
          attempt < this.retryConfig.maxAttempts
        ) {
          const delay = this.calculateBackoff(attempt);
          await this.sleep(delay);
          return this.makeRequest(endpoint, options, attempt + 1);
        }
        
        throw new FullEnrichAPIError(
          `API request failed: ${response.statusText}`,
          response.status,
          undefined,
          errorBody
        );
      }

      // Parse and return response
      return await response.json();
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && attempt < 3) {
        const delay = this.calculateBackoff(attempt);
        await this.sleep(delay);
        return this.makeRequest(endpoint, options, attempt + 1);
      }
      
      // Re-throw FullEnrichAPIError
      if (error instanceof FullEnrichAPIError) {
        throw error;
      }
      
      // Wrap other errors
      throw new FullEnrichAPIError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        undefined,
        error
      );
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempt: number): number {
    const delay = this.retryConfig.initialDelay * Math.pow(this.retryConfig.multiplier, attempt - 1);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  /**
   * Get retry-after value from response headers
   */
  private getRetryAfter(response: Response): number {
    const retryAfterHeader = response.headers.get('Retry-After');
    
    if (retryAfterHeader) {
      const retryAfterSeconds = parseInt(retryAfterHeader, 10);
      if (!isNaN(retryAfterSeconds)) {
        return retryAfterSeconds * 1000; // Convert to milliseconds
      }
    }
    
    // Default to exponential backoff if no Retry-After header
    return this.calculateBackoff(1);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
