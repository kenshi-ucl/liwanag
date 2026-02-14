import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, ArrowLeft, Loader2, UserPlus, FileUp } from 'lucide-react';
import { EnrichmentProgress } from '@/components/EnrichmentProgress';

export const Route = createFileRoute('/upload')({
  component: UploadPage,
});

interface UploadResult {
  totalRows: number;
  newSubscribers: number;
  duplicatesSkipped: number;
  errors: string[];
}

type TabType = 'file' | 'manual';

function UploadPage() {
  const [activeTab, setActiveTab] = useState<TabType>('file');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-slate-500 hover:text-slate-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <FileSpreadsheet className="w-8 h-8 text-cyan-600" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Add Subscribers</h1>
              <p className="text-sm text-slate-600">
                Import leads via file or add them manually
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('file')}
              className={`flex-1 px-6 py-4 flex items-center justify-center gap-2 font-medium transition-colors ${activeTab === 'file'
                  ? 'bg-cyan-50 text-cyan-700 border-b-2 border-cyan-600'
                  : 'text-slate-600 hover:bg-slate-50'
                }`}
            >
              <FileUp className="w-5 h-5" />
              Upload File
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 px-6 py-4 flex items-center justify-center gap-2 font-medium transition-colors ${activeTab === 'manual'
                  ? 'bg-cyan-50 text-cyan-700 border-b-2 border-cyan-600'
                  : 'text-slate-600 hover:bg-slate-50'
                }`}
            >
              <UserPlus className="w-5 h-5" />
              Add Manually
            </button>
          </div>

          <div className="p-8">
            {activeTab === 'file' ? <FileUploadTab /> : <ManualEntryTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

function ManualEntryTab() {
  const [email, setEmail] = useState('');
  const [source, setSource] = useState('Newsletter');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setShowProgress(true);

    try {
      // Create a simple CSV content and upload it
      const csvContent = `email,source\n${email},${source}`;
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], 'manual-entry.csv', { type: 'text/csv' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('encoding', 'utf-8');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setShowProgress(false);
        throw new Error(data.error || 'Failed to add subscriber');
      }

      if (data.duplicatesSkipped > 0) {
        setShowProgress(false);
        setError('This email already exists in the system');
      }
      // Keep showing progress animation - it will complete and show success
    } catch (err) {
      setShowProgress(false);
      setError(err instanceof Error ? err.message : 'Failed to add subscriber');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProgressComplete = () => {
    setShowProgress(false);
    setSuccess(true);
    setEmail('');
    setTimeout(() => setSuccess(false), 3000);
  };

  // Show enrichment progress animation
  if (showProgress) {
    return (
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Enriching Subscriber</h2>
          <p className="text-slate-600 mt-1">
            Processing {email} through the dark funnel intelligence engine
          </p>
        </div>
        <EnrichmentProgress onComplete={handleProgressComplete} />
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserPlus className="w-8 h-8 text-cyan-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Add Single Subscriber</h2>
        <p className="text-slate-600 mt-1">
          Quickly add a new lead to your dark funnel
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-6">
        {/* Email Field */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Email Address *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john.doe@gmail.com"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-shadow"
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-slate-500">
            Personal emails (Gmail, Yahoo, etc.) will be enriched via waterfall
          </p>
        </div>

        {/* Source Field */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Source
          </label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-shadow"
            disabled={isSubmitting}
          >
            <option value="Newsletter">Newsletter</option>
            <option value="Webinar">Webinar</option>
            <option value="Waitlist">Waitlist</option>
            <option value="Event">Event</option>
            <option value="Referral">Referral</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Success Display */}
        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-green-700 text-sm">Subscriber added successfully! Enrichment will begin shortly.</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !email.trim()}
          className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${email.trim() && !isSubmitting
              ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
              : 'bg-slate-200 text-slate-500 cursor-not-allowed'
            }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <UserPlus className="w-5 h-5" />
              Add Subscriber
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function FileUploadTab() {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [encoding, setEncoding] = useState<'utf-8' | 'utf-16' | 'iso-8859-1'>('utf-8');
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const validExtensions = ['.csv', '.xls', '.xlsx'];

    const hasValidExtension = validExtensions.some(ext =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!validTypes.includes(file.type) && !hasValidExtension) {
      setError('Please upload a CSV or Excel file (.csv, .xls, .xlsx)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('encoding', encoding);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Show loading state during upload
  if (isUploading) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Processing Upload</h2>
        <p className="text-slate-600">
          Importing subscribers and preparing enrichment...
        </p>
        <div className="mt-6 max-w-md mx-auto">
          <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className="bg-cyan-600 h-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    );
  }

  const resetUpload = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (result) {
    return (
      <div className="text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Upload Complete!</h2>
        <p className="text-slate-600 mb-6">Your subscribers have been imported successfully.</p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-3xl font-bold text-slate-900">{result.totalRows}</div>
            <div className="text-sm text-slate-600">Total Rows</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-600">{result.newSubscribers}</div>
            <div className="text-sm text-green-700">New Subscribers</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-4">
            <div className="text-3xl font-bold text-amber-600">{result.duplicatesSkipped}</div>
            <div className="text-sm text-amber-700">Duplicates Skipped</div>
          </div>
        </div>

        {result.errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-red-800 mb-2">Errors ({result.errors.length})</h3>
            <ul className="text-sm text-red-700 space-y-1">
              {result.errors.slice(0, 5).map((err, i) => (
                <li key={i}>• {err}</li>
              ))}
              {result.errors.length > 5 && (
                <li className="italic">...and {result.errors.length - 5} more</li>
              )}
            </ul>
          </div>
        )}

        <div className="flex justify-center gap-4">
          <button
            onClick={resetUpload}
            className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
          >
            Upload Another
          </button>
          <Link
            to="/dashboard"
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
          >
            View Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${isDragging
            ? 'border-cyan-500 bg-cyan-50'
            : selectedFile
              ? 'border-green-500 bg-green-50'
              : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
          }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xls,.xlsx"
          onChange={handleFileChange}
          className="hidden"
        />

        {selectedFile ? (
          <div>
            <FileSpreadsheet className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-medium text-slate-900">{selectedFile.name}</p>
            <p className="text-sm text-slate-500 mt-1">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                resetUpload();
              }}
              className="mt-3 text-sm text-red-600 hover:text-red-700"
            >
              Remove file
            </button>
          </div>
        ) : (
          <div>
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-lg font-medium text-slate-900">
              Drag & drop your file here
            </p>
            <p className="text-sm text-slate-500 mt-1">
              or click to browse (CSV, Excel)
            </p>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Options */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">Encoding:</label>
          <select
            value={encoding}
            onChange={(e) => setEncoding(e.target.value as typeof encoding)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
          >
            <option value="utf-8">UTF-8 (default)</option>
            <option value="utf-16">UTF-16</option>
            <option value="iso-8859-1">ISO-8859-1</option>
          </select>
        </div>

        <button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${selectedFile && !isUploading
              ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
              : 'bg-slate-200 text-slate-500 cursor-not-allowed'
            }`}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload
            </>
          )}
        </button>
      </div>

      {/* File Format Info */}
      <div className="mt-8 p-4 bg-slate-50 rounded-lg">
        <h3 className="font-medium text-slate-900 mb-2">Expected File Format</h3>
        <p className="text-sm text-slate-600 mb-3">
          Your file should contain an <code className="bg-white px-1 py-0.5 rounded border">email</code> column.
          Optional columns: <code className="bg-white px-1 py-0.5 rounded border">source</code>
        </p>
        <div className="bg-white rounded border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-slate-700">email</th>
                <th className="text-left px-4 py-2 font-medium text-slate-700">source</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-200">
                <td className="px-4 py-2 text-slate-600">sarah@gmail.com</td>
                <td className="px-4 py-2 text-slate-600">Newsletter</td>
              </tr>
              <tr className="border-t border-slate-200">
                <td className="px-4 py-2 text-slate-600">mike@yahoo.com</td>
                <td className="px-4 py-2 text-slate-600">Webinar</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
