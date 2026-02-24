'use client';

import { useState } from 'react';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuotationBasicInfoCard } from '@/components/quotation/QuotationBasicInfoCard';

// Re-export exact same props shape as QuotationBasicInfoCard so this wrapper
// is transparently swappable — just forwarding everything through.
export type QuoteMetaPanelProps = React.ComponentProps<typeof QuotationBasicInfoCard>;

/**
 * Sidebar panel wrapping QuotationBasicInfoCard with a collapse toggle.
 * QuotationBasicInfoCard is unchanged — this is purely a layout shell.
 */
export function QuoteMetaPanel(props: any) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`transition-all duration-300 flex-shrink-0 ${
        collapsed ? 'w-10' : 'w-72 xl:w-80'
      }`}
    >
      {/* Toggle button */}
      {/* <div className="flex justify-end mb-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expand panel' : 'Collapse panel'}
        >
          {collapsed ? (
            <PanelRightOpen className="h-4 w-4" />
          ) : (
            <PanelRightClose className="h-4 w-4" />
          )}
        </Button>
      </div> */}

      {/* Content */}
      {!collapsed && (
        <div className="sticky top-4">
          <QuotationBasicInfoCard {...props} />
        </div>
      )}
    </aside>
  );
}
