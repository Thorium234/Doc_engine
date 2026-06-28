import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { db } from '@/lib/db';
import { JobStatus } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only PDF and DOCX files are allowed.' }, { status: 400 });
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 50MB limit' }, { status: 400 });
    }

    // Generate unique filename and create upload directory
    const uploadDir = join(process.cwd(), 'uploads', uuidv4());
    const filename = `${Date.now()}-${file.name}`;
    const filepath = join(uploadDir, filename);
    
    // Create upload directory
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Create job record in database
    const job = await db.job.create({
      data: {
        userId: 'temp-user-id', // In real app, get from authentication
        filename: filename,
        originalName: file.name,
        fileSize: file.size,
        fileType: file.type,
        status: JobStatus.PENDING,
      },
    });

    return NextResponse.json({ 
      jobId: job.id,
      message: 'File uploaded successfully. Processing will begin shortly.' 
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}