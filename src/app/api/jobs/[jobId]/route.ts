import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import fs from 'fs';
import { db } from '@/lib/db';
import { JobStatus } from '@prisma/client';

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const job = await db.job.findUnique({
      where: { id: params.jobId }
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: job.id,
      filename: job.filename,
      originalName: job.originalName,
      fileSize: job.fileSize,
      fileType: job.fileType,
      status: job.status,
      progress: job.progress,
      outputPath: job.outputPath,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      completedAt: job.completedAt
    });

  } catch (error) {
    console.error('Error fetching job:', error);
    return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const job = await db.job.findUnique({
      where: { id: params.jobId }
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Delete job from database
    await db.job.delete({
      where: { id: params.jobId }
    });

    // Clean up uploaded files
    const uploadDir = join(process.cwd(), 'uploads', params.jobId);
    if (fs.existsSync(uploadDir)) {
      fs.rmSync(uploadDir, { recursive: true, force: true });
    }

    return NextResponse.json({ message: 'Job deleted successfully' });

  } catch (error) {
    console.error('Error deleting job:', error);
    return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 });
  }
}