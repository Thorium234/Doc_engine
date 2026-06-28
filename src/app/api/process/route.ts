import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { writeFile } from 'fs/promises';
import fs from 'fs';
import { db } from '@/lib/db';
import { JobStatus } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json();
    
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    // Get job from database
    const job = await db.job.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Update job status to processing
    await db.job.update({
      where: { id: jobId },
      data: { 
        status: JobStatus.PROCESSING,
        progress: 10
      }
    });

    // Simulate processing (in real app, this would call C++ binary)
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate work
    
    // Update progress
    await db.job.update({
      where: { id: jobId },
      data: { 
        progress: 50,
        status: JobStatus.PROCESSING
      }
    });

    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate more work
    
    // Complete processing
    const outputFilename = `converted_${job.filename}`;
    const outputDir = join(process.cwd(), 'uploads', job.id, 'output');
    
    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // In a real implementation, this would be the actual converted file
    // For now, we'll create a placeholder file
    const outputPath = join(outputDir, outputFilename);
    await writeFile(outputPath, `Converted content from ${job.originalName}`);

    // Update job with completion
    await db.job.update({
      where: { id: jobId },
      data: { 
        status: JobStatus.COMPLETED,
        progress: 100,
        outputPath: outputPath,
        completedAt: new Date()
      }
    });

    return NextResponse.json({ 
      jobId,
      message: 'Processing completed successfully',
      outputPath: outputFilename
    });

  } catch (error) {
    console.error('Processing error:', error);
    
    // Update job status to failed
    if (jobId) {
      await db.job.update({
        where: { id: jobId },
        data: { 
          status: JobStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }

    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}