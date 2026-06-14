'use client';

import { useState, useRef, useCallback, useEffect, type DragEvent, type ChangeEvent } from 'react';
import { useAuth } from '@/context/auth-context';
import { api, ApiError } from '@/lib/api';

type UploadStep = 'select' | 'uploading' | 'processing' | 'completed' | 'error';

interface UploadProgress {
  status: string;
  step: string;
  progress: number;
  recordsProcessed?: number;
  customersCreated?: number;
  customersUpdated?: number;
  duplicatesMerged?: number;
  ordersCreated?: number;
  schemaMap?: Record<string, string>;
  error?: string;
}

const STEP_LABELS: Record<string, string> = {
  parsing: 'Parsing file...',
  schema_detection: 'Detecting schema with AI...',
  normalizing: 'Normalizing data...',
  deduplicating: 'Finding duplicates...',
  importing: 'Importing records...',
  importing_orders: 'Importing orders...',
  done: 'Complete!',
};

export default function UploadPage() {
  const { user } = useAuth();
  const [step, setStep] = useState<UploadStep>('select');
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<'customers' | 'orders'>('customers');
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetFile(file);
  }, []);

  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  }, []);

  const validateAndSetFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['csv', 'xlsx', 'xls'].includes(ext)) {
      setError('Invalid file type. Only CSV and Excel (.xlsx, .xls) files are allowed.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('File too large. Maximum size is 50MB.');
      return;
    }
    setError('');
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setStep('uploading');
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch(`/api/upload?type=${uploadType}`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || `Upload failed with status ${res.status}`);
      }

      const data = await res.json();
      setJobId(data.id);
      setStep('processing');

      // Connect to SSE for progress updates
      connectSSE(data.id);
    } catch (err) {
      setError((err as Error).message || 'Upload failed');
      setStep('error');
    }
  };

  const connectSSE = (id: string) => {
    const evtSource = new EventSource(`/api/upload/${id}/status`);

    evtSource.onmessage = (event) => {
      try {
        const data: UploadProgress = JSON.parse(event.data);
        setProgress(data);

        if (data.status === 'completed') {
          setStep('completed');
          evtSource.close();
        } else if (data.status === 'failed') {
          setError(data.error || 'Processing failed');
          setStep('error');
          evtSource.close();
        }
      } catch {
        // Ignore parse errors
      }
    };

    evtSource.onerror = () => {
      evtSource.close();
      // Poll the job status as fallback
      pollJobStatus(id);
    };
  };

  const pollJobStatus = async (id: string) => {
    try {
      const job = await api.get<any>(`/upload/${id}`);
      if (job.status === 'completed') {
        setProgress({
          status: 'completed',
          step: 'done',
          progress: 100,
          recordsProcessed: job.recordsProcessed,
          duplicatesMerged: job.duplicatesMerged,
        });
        setStep('completed');
      } else if (job.status === 'failed') {
        setError(job.errorMessage || 'Processing failed');
        setStep('error');
      } else {
        // Still processing, poll again
        setTimeout(() => pollJobStatus(id), 2000);
      }
    } catch {
      // Retry
      setTimeout(() => pollJobStatus(id), 3000);
    }
  };

  const handleReset = () => {
    setStep('select');
    setSelectedFile(null);
    setProgress(null);
    setJobId(null);
    setError('');
  };

  if (!user) return null;

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Upload Data
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Import customer or order data from CSV and Excel files
        </p>
      </div>

      {/* Step 1: File selection */}
      {step === 'select' && (
        <div className="animate-fade-in space-y-6">
          {/* Upload type selector */}
          <div className="glass rounded-xl p-5">
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
              Data Type
            </label>
            <div className="flex gap-3">
              {(['customers', 'orders'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setUploadType(type)}
                  className="flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all capitalize"
                  style={{
                    background: uploadType === type ? 'var(--accent-glow)' : 'var(--bg-input)',
                    color: uploadType === type ? 'var(--accent-primary-hover)' : 'var(--text-secondary)',
                    border: `1px solid ${uploadType === type ? 'rgba(99, 102, 241, 0.3)' : 'var(--border-subtle)'}`,
                  }}
                >
                  {type === 'customers' ? '👥 Customers' : '📦 Orders'}
                </button>
              ))}
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="glass rounded-xl p-12 text-center cursor-pointer transition-all"
            style={{
              borderWidth: '2px',
              borderStyle: 'dashed',
              borderColor: dragOver
                ? 'var(--accent-primary)'
                : selectedFile
                ? 'var(--success)'
                : 'var(--border-subtle)',
              background: dragOver ? 'var(--accent-glow)' : undefined,
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />

            {selectedFile ? (
              <div className="animate-fade-in">
                <div
                  className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(34, 197, 94, 0.1)' }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="1.5">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-lg font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  {selectedFile.name}
                </p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {(selectedFile.size / 1024).toFixed(1)} KB • Click to change
                </p>
              </div>
            ) : (
              <div>
                <div
                  className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                  style={{ background: 'var(--accent-glow)' }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="1.5">
                    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-lg font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  Drag & drop your file here
                </p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  or click to browse • CSV, XLSX up to 50MB
                </p>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div
              className="p-4 rounded-xl text-sm animate-fade-in flex items-center gap-3"
              style={{
                background: 'var(--danger-muted)',
                color: 'var(--danger)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M10 6V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="10" cy="14" r="0.75" fill="currentColor"/>
              </svg>
              {error}
            </div>
          )}

          {/* Upload button */}
          {selectedFile && (
            <button onClick={handleUpload} className="btn-primary flex items-center justify-center gap-2 animate-fade-in">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Upload & Process
            </button>
          )}
        </div>
      )}

      {/* Step 2: Uploading */}
      {step === 'uploading' && (
        <div className="glass rounded-xl p-8 text-center animate-fade-in">
          <div className="spinner mx-auto mb-4" style={{ width: '32px', height: '32px', borderWidth: '3px' }} />
          <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
            Uploading {selectedFile?.name}...
          </p>
        </div>
      )}

      {/* Step 3: Processing */}
      {step === 'processing' && progress && (
        <div className="glass rounded-xl p-8 animate-fade-in space-y-6">
          <div className="text-center">
            <div className="spinner mx-auto mb-4" style={{ width: '32px', height: '32px', borderWidth: '3px' }} />
            <p className="text-lg font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              {STEP_LABELS[progress.step] || 'Processing...'}
            </p>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span style={{ color: 'var(--text-secondary)' }}>Progress</span>
              <span style={{ color: 'var(--accent-primary-hover)' }}>{progress.progress}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-input)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress.progress}%`,
                  background: 'var(--accent-gradient)',
                }}
              />
            </div>
          </div>

          {/* Schema map preview */}
          {progress.schemaMap && (
            <div className="animate-fade-in">
              <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                Detected Column Mapping
              </p>
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
                {Object.entries(progress.schemaMap).map(([source, target], idx) => (
                  <div
                    key={source}
                    className="flex items-center justify-between px-4 py-2.5 text-sm"
                    style={{
                      background: idx % 2 === 0 ? 'var(--bg-input)' : 'transparent',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <span style={{ color: 'var(--text-secondary)' }}>{source}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                      <path d="M5 12h14m-7-7l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="font-medium" style={{ color: 'var(--accent-primary-hover)' }}>{target}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Completed */}
      {step === 'completed' && progress && (
        <div className="glass rounded-xl p-8 animate-fade-in space-y-6">
          <div className="text-center">
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(34, 197, 94, 0.1)' }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              Import Complete!
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              {selectedFile?.name} has been processed successfully
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Records Processed', value: progress.recordsProcessed ?? 0, icon: '📄' },
              { label: 'Duplicates Merged', value: progress.duplicatesMerged ?? 0, icon: '🔗' },
              { label: 'Customers Created', value: progress.customersCreated ?? 0, icon: '👤' },
              { label: 'Customers Updated', value: progress.customersUpdated ?? 0, icon: '✏️' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl p-4 text-center"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}
              >
                <span className="text-2xl mb-1 block">{stat.icon}</span>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
              </div>
            ))}
          </div>

          <button onClick={handleReset} className="btn-primary">
            Upload Another File
          </button>
        </div>
      )}

      {/* Error state */}
      {step === 'error' && (
        <div className="glass rounded-xl p-8 animate-fade-in space-y-6">
          <div className="text-center">
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--danger-muted)' }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Upload Failed
            </h2>
            <p className="text-sm" style={{ color: 'var(--danger)' }}>
              {error}
            </p>
          </div>
          <button onClick={handleReset} className="btn-primary">
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
