import { createFileRoute } from '@tanstack/react-router';
import { json } from '@tanstack/react-start';
import { processFileUpload } from '@/lib/upload/handler';
import type { FileEncoding } from '@/lib/upload/file-parser';

export const Route = createFileRoute('/api/upload')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Parse multipart form data
          const formData = await request.formData();

          // Get file from form data
          const file = formData.get('file');

          if (!file || !(file instanceof File)) {
            return json(
              {
                error: 'No file provided or invalid file format',
                code: 'MISSING_FILE',
                timestamp: new Date().toISOString(),
              },
              { status: 400 }
            );
          }

          // Get optional encoding parameter
          const encodingParam = formData.get('encoding') as string | null;
          const encoding: FileEncoding =
            (encodingParam as FileEncoding) || 'utf-8';

          // Validate encoding
          const validEncodings: FileEncoding[] = ['utf-8', 'utf-16', 'iso-8859-1'];
          if (!validEncodings.includes(encoding)) {
            return json(
              {
                error: `Invalid encoding. Must be one of: ${validEncodings.join(', ')}`,
                code: 'INVALID_ENCODING',
                timestamp: new Date().toISOString(),
              },
              { status: 400 }
            );
          }

          // Demo organization ID (for hackathon - in production, this would come from auth)
          const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001';

          // Process file upload
          const result = await processFileUpload(file, DEMO_ORG_ID, encoding);

          if (!result.success) {
            return json(
              {
                error: result.error || 'File upload failed',
                code: 'UPLOAD_FAILED',
                timestamp: new Date().toISOString(),
              },
              { status: 400 }
            );
          }

          // Return upload summary
          return json(
            {
              totalRows: result.summary!.totalRows,
              newSubscribers: result.summary!.newSubscribers,
              duplicatesSkipped: result.summary!.duplicatesSkipped,
              errors: result.summary!.errors,
            },
            { status: 200 }
          );
        } catch (error) {
          console.error('Upload processing error:', error);

          return json(
            {
              error: error instanceof Error ? error.message : 'Internal server error',
              code: 'PROCESSING_ERROR',
              timestamp: new Date().toISOString(),
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
