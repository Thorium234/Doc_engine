'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, Download, X, CheckCircle, AlertCircle } from 'lucide-react';
import { DocumentProcessor } from '@/lib/document-service';

interface Job {
  id: string;
  filename: string;
  originalName: string;
  fileSize: number;
  fileType: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  outputPath?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export const DocumentConverter: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileSelect = (selectedFile: File) => {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(selectedFile.type)) {
      alert('Please select a PDF or DOCX file');
      return;
    }

    // Validate file size (50MB)
    const maxSize = 50 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      alert('File size must be less than 50MB');
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok) {
        // Add job to list
        setJobs(prev => [{
          id: data.jobId,
          filename: file.name,
          originalName: file.name,
          fileSize: file.size,
          fileType: file.type,
          status: 'PENDING',
          progress: 0,
          createdAt: new Date().toISOString()
        }, ...prev]);
        
        setFile(null);
        
        // Start processing
        await startProcessing(data.jobId);
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const startProcessing = async (jobId: string) => {
    setProcessing(true);
    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId }),
      });

      if (response.ok) {
        // Poll for job status updates
        pollJobStatus(jobId);
      } else {
        const data = await response.json();
        alert(data.error || 'Processing failed');
      }
    } catch (error) {
      console.error('Processing error:', error);
      alert('Processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        const job = await response.json();
        
        setJobs(prev => prev.map(j => j.id === jobId ? job : j));
        
        if (job.status === 'COMPLETED' || job.status === 'FAILED') {
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Error polling job status:', error);
        clearInterval(interval);
      }
    }, 2000);
  };

  const handleDownload = async (jobId: string, filename: string) => {
    try {
      const response = await fetch(`/api/download/${jobId}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        alert(data.error || 'Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Download failed');
    }
  };

  const handleDelete = async (jobId: string) => {
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
      });
      
      setJobs(prev => prev.filter(job => job.id !== jobId));
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete job');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: Job['status']) => {
    switch (status) {
      case 'PENDING':
        return <FileText className="w-4 h-4 text-yellow-500" />;
      case 'PROCESSING':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'FAILED':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusText = (status: Job['status']) => {
    switch (status) {
      case 'PENDING': return 'Pending';
      case 'PROCESSING': return 'Processing';
      case 'COMPLETED': return 'Completed';
      case 'FAILED': return 'Failed';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Document Converter</h1>
        <p className="text-gray-600">Convert PDF and DOCX files with high-quality processing</p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
          <CardDescription>
            Upload PDF or DOCX files (max 50MB) for conversion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="mb-4">
              Drag and drop your file here, or click to browse
            </p>
            <input
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileInputChange}
              className="hidden"
              id="file-input"
            />
            <Button
              onClick={() => document.getElementById('file-input')?.click()}
              variant="outline"
              className="mb-4"
            >
              Browse Files
            </Button>
            
            {file && (
              <div className="bg-gray-50 rounded-lg p-4 text-left">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">{file.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  {formatFileSize(file.size)}
                </p>
              </div>
            )}
            
            <Button
              onClick={handleUpload}
              disabled={!file || uploading || processing}
              className="w-full"
            >
              {uploading ? 'Uploading...' : processing ? 'Processing...' : 'Convert to Word'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      {jobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Conversions</CardTitle>
            <CardDescription>
              Track the status of your document conversions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {jobs.map((job) => (
                <div key={job.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(job.status)}
                      <div>
                        <h3 className="font-medium">{job.originalName}</h3>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(job.fileSize)} • {getStatusText(job.status)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {job.status === 'COMPLETED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(job.id, `converted_${job.originalName}`)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(job.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {job.status === 'PROCESSING' && (
                    <div className="space-y-2">
                      <Progress value={job.progress} className="w-full" />
                      <p className="text-sm text-gray-500">Processing... {job.progress}%</p>
                    </div>
                  )}
                  
                  {job.status === 'FAILED' && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Conversion failed: {job.errorMessage || 'Unknown error'}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {job.status === 'COMPLETED' && (
                    <p className="text-sm text-green-600">
                      Conversion completed in {Math.round((new Date(job.completedAt!).getTime() - new Date(job.createdAt).getTime()) / 1000)} seconds
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};