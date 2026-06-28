import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import fs from 'fs';
import { db } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const job = await db.job.findUnique({
      where: { id: params.jobId }
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.status !== 'COMPLETED' || !job.outputPath) {
      return NextResponse.json({ error: 'File not ready for download' }, { status: 400 });
    }

    const filePath = join(process.cwd(), job.outputPath);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Output file not found' }, { status: 404 });
    }

    const fileStats = fs.statSync(filePath);
    const fileContent = fs.readFileSync(filePath);

    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${job.originalName.replace(/\.[^/.]+$/, '')}_converted.docx"`,
        'Content-Length': fileStats.size.toString(),
      },
    });

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}