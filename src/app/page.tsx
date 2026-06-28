'use client'

import { DocumentConverter } from '@/components/document-converter'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <DocumentConverter />
      </div>
    </div>
  )
}