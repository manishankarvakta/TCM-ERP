import { getQuotations, deleteQuotation } from '@/app/actions/quotations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FiPlus, FiEye, FiEdit, FiTrash2 } from 'react-icons/fi';
import { formatDate, formatCurrency } from '@/lib/utils/formatters';
import DeleteQuotationButton from './_components/DeleteQuotationButton';

export default async function QuotationsPage() {
  const result = await getQuotations();

  if (!result.success) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-red-500">
            {result.error || 'Error loading quotations'}
          </div>
        </div>
      </div>
    );
  }

  const quotations = result.data || [];

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Quotations</h1>
          <Link href="/dashboard/quotations/new">
            <Button>
              <FiPlus className="w-4 h-4 mr-2" />
              New Quotation
            </Button>
          </Link>
        </div>

        {quotations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">No quotations found</p>
              <Link href="/dashboard/quotations/new">
                <Button>Create Your First Quotation</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {quotations.map((quotation) => (
              <Card key={quotation.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{quotation.quotationNumber}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        {quotation.subject}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/dashboard/quotations/${quotation.id}`}>
                        <Button variant="outline" size="sm">
                          <FiEye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link href={`/dashboard/quotations/${quotation.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <FiEdit className="w-4 h-4" />
                        </Button>
                      </Link>
                      <DeleteQuotationButton quotationId={quotation.id} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Client</p>
                      <p className="font-medium">{quotation.client?.name || quotation.client?.company || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Date</p>
                      <p className="font-medium">{formatDate(quotation.date)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Status</p>
                      <p className="font-medium capitalize">{quotation.status}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total</p>
                      <p className="font-medium text-lg">
                        {formatCurrency(Number(quotation.total))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
