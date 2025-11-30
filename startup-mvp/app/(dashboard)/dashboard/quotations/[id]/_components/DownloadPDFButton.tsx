'use client';

import { Button } from '@/components/ui/button';
import { FiDownload } from 'react-icons/fi';
import { downloadQuotationPDF } from '@/lib/utils/pdf-generator';

interface DownloadPDFButtonProps {
  quotation: Record<string, unknown>;
}

export default function DownloadPDFButton({ quotation }: DownloadPDFButtonProps) {
  const handleDownloadPDF = async () => {
    await downloadQuotationPDF(quotation);
  };

  return (
    <Button onClick={handleDownloadPDF}>
      <FiDownload className="w-4 h-4 mr-2" />
      Download PDF
    </Button>
  );
}

