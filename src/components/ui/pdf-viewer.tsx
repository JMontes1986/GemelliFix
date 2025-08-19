
'use client';

import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import Link from 'next/link';

interface PdfViewerProps {
  fileUrl: string;
  fileName: string;
}

export default function PdfViewer({ fileUrl, fileName }: PdfViewerProps) {
  return (
    <div className="flex flex-col h-full">
      <DialogHeader>
        <DialogTitle className="font-headline">{fileName}</DialogTitle>
        <DialogDescription>
          Visualizador de documento PDF.
        </DialogDescription>
      </DialogHeader>
      <div className="flex-1 my-4">
        <embed
          src={fileUrl}
          type="application/pdf"
          width="100%"
          height="100%"
          className="rounded-md border"
        />
      </div>
      <DialogFooter className="sm:justify-between">
        <DialogClose asChild>
            <Button type="button" variant="secondary">Cerrar</Button>
        </DialogClose>
        <a href={fileUrl} target="_blank" rel="noopener noreferrer" download>
            <Button>
                <Download className="mr-2 h-4 w-4" />
                Descargar
            </Button>
        </a>
      </DialogFooter>
    </div>
  );
}
