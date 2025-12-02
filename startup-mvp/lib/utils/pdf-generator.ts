import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Quotation, QuotationWithAll } from '@/types/quotation';
import { formatDate, formatCurrency } from './formatters';

// Helper function to get unit description
const getUnitDescription = (item: any): string => {
  // Use unit from item if available, otherwise default to PC
  return item.unit || 'PC';
};

// Helper function to combine all items from a section (groups + direct items)
const getAllSectionItems = (section: any): any[] => {
  const allItems: any[] = [];
  let slCounter = 1;

  // Add items from groups first
  if (section.groups && section.groups.length > 0) {
    section.groups.forEach((group: any) => {
      if (group.items && group.items.length > 0) {
        group.items.forEach((item: any) => {
          allItems.push({
            ...item,
            box: group.code || item.code || '',
            sl: slCounter++,
          });
        });
      }
    });
  }

  // Add direct items
  if (section.items && section.items.length > 0) {
    section.items.forEach((item: any) => {
      allItems.push({
        ...item,
        box: item.code || '',
        sl: slCounter++,
      });
    });
  }

  return allItems;
};

// Helper function to load image as base64
const loadImageAsBase64 = async (imagePath: string): Promise<string | null> => {
  try {
    const response = await fetch(imagePath);
    if (!response.ok) {
      console.warn(`Image not found at ${imagePath}, skipping logo`);
      return null;
    }
    
    const blob = await response.blob();
    
    // Check if the blob is actually an image
    if (!blob.type.startsWith('image/')) {
      console.warn(`File at ${imagePath} is not an image, skipping logo`);
      return null;
    }
    
    // Check if blob has content
    if (blob.size === 0) {
      console.warn(`Image at ${imagePath} is empty, skipping logo`);
      return null;
    }
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const base64String = reader.result as string;
          // Validate base64 string
          if (!base64String || !base64String.startsWith('data:image/')) {
            console.warn(`Invalid image data from ${imagePath}, skipping logo`);
            resolve(null);
            return;
          }
          resolve(base64String);
        } catch (error) {
          console.warn(`Error processing image data from ${imagePath}:`, error);
          resolve(null);
        }
      };
      reader.onerror = () => {
        console.warn(`Error reading image file from ${imagePath}, skipping logo`);
        resolve(null); // Resolve with null instead of rejecting
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn(`Error loading image from ${imagePath}, skipping logo:`, error);
    return null;
  }
};

// Draw page border
const drawPageBorder = (doc: jsPDF, margin: number) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin);
};

export async function generateQuotationPDF(quotation: Quotation | QuotationWithAll | any): Promise<jsPDF> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin + 10;

  // ============================================
  // PAGE 1: COVER PAGE
  // ============================================
  
  // White background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Draw border
  drawPageBorder(doc, margin);

  // Load and add client logo
  try {
    const logoBase64 = await loadImageAsBase64('/clientLogo.png');
    if (logoBase64) {
      try {
        const logoWidth = 40;
        const logoHeight = 40;
        const logoX = margin + 5;
        const logoY = yPos;
        doc.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);
      } catch (imageError) {
        console.warn('Error adding logo image to PDF, continuing without logo:', imageError);
        // Continue without logo - PDF generation should not fail
      }
    }
  } catch (error) {
    console.warn('Error loading logo, continuing without logo:', error);
    // Continue without logo - PDF generation should not fail
  }

  // Company Name (Right side of header)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const companyName = 'Tilottoma Eco Kitchen & Furniture Industry Ltd';
  doc.text(companyName, pageWidth - margin - 5, yPos + 5, { align: 'right' });
  yPos += 25;

  // Company Address and Contact Information (Right aligned)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const companyInfo = [
    'Vill: Baupara, Ward No:21, P.O:Bhawal Mirzapur Sadar, Gazipur, Bangladesh.',
    'Phone: 8652259, 9668808',
    'Fax: +88-2-9663184',
    'E-mail: info@mykitchen-bd.com',
    'Web: www.mykitchen-bd.com',
  ];
  
  companyInfo.forEach((info) => {
    doc.text(info, pageWidth - margin - 5, yPos, { align: 'right' });
    yPos += 4;
  });

  // Central Large Logo (if available)
  const centerX = pageWidth / 2;
  const largeLogoSize = 50;
  try {
    const logoBase64 = await loadImageAsBase64('/clientLogo.png');
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', centerX - largeLogoSize / 2, yPos, largeLogoSize, largeLogoSize);
      } catch (imageError) {
        console.warn('Error adding large logo to PDF, continuing without logo:', imageError);
        // Continue without logo
      }
    }
  } catch (error) {
    // If logo fails, continue without it
    console.warn('Error loading large logo, continuing without logo:', error);
  }
  yPos += largeLogoSize + 20;

  // Document Title: FINANCIAL PROPOSAL (Blue, Bold, Centered)
  doc.setTextColor(0, 0, 255); // Blue color
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('FINANCIAL PROPOSAL', centerX, yPos, { align: 'center' });
  yPos += 12;

  // Subject Line
  doc.setTextColor(0, 0, 0); // Black
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Subject : ${quotation.subject || 'Quotation'}`, centerX, yPos, { align: 'center' });
  yPos += 20;

  // Submitted To Section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  // Underline
  const submittedToWidth = doc.getTextWidth('Submitted To');
  doc.line(centerX - submittedToWidth / 2, yPos + 2, centerX + submittedToWidth / 2, yPos + 2);
  doc.text('Submitted To', centerX, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const clientName = quotation.client?.name || quotation.clientName || 'N/A';
  doc.text(clientName, centerX, yPos, { align: 'center' });
  yPos += 6;
  
  const clientAddress = quotation.client?.address || quotation.clientAddress || '';
  if (clientAddress) {
    const addressLines = doc.splitTextToSize(clientAddress, pageWidth - 2 * margin - 40);
    addressLines.forEach((line: string) => {
      doc.text(line, centerX, yPos, { align: 'center' });
      yPos += 5;
    });
  }
  
  const clientContact = quotation.client?.phone || quotation.client?.email || quotation.clientContact || '';
  if (clientContact) {
    doc.text(`Contact No: ${clientContact}`, centerX, yPos, { align: 'center' });
    yPos += 8;
  }

  // Submitted By Section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const submittedByWidth = doc.getTextWidth('Submitted By');
  doc.line(centerX - submittedByWidth / 2, yPos + 2, centerX + submittedByWidth / 2, yPos + 2);
  doc.text('Submitted By', centerX, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const submittedByName = quotation.submittedBy?.name || quotation.submittedBy || 'N/A';
  doc.text(submittedByName, centerX, yPos, { align: 'center' });
  yPos += 6;
  
  const submittedByContact = quotation.submittedBy?.email || quotation.submittedByContact || '';
  if (submittedByContact) {
    doc.text(`Contact No: ${submittedByContact}`, centerX, yPos, { align: 'center' });
    yPos += 6;
  }

  // Reference (if available)
  if (quotation.reference) {
    doc.text(`Ref: ${quotation.reference}`, centerX, yPos, { align: 'center' });
    yPos += 8;
  }

  // Date
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Date: ${formatDate(quotation.date)}`, centerX, yPos, { align: 'center' });
  yPos += 20;

  // Footer Section
  const footerY = pageHeight - margin - 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 255); // Blue
  doc.text('Hot Line: 01642912617-8', margin + 5, footerY);
  doc.text('E-mail: Sales@mykitchen-bd.com', pageWidth - margin - 5, footerY, { align: 'right' });
  doc.setTextColor(0, 0, 0); // Reset to black

  // Company Logo at Bottom Right Corner
  try {
    const logoBase64 = await loadImageAsBase64('/clientLogo.png');
    if (logoBase64) {
      try {
        const logoSize = 30;
        const logoXBottom = pageWidth - margin - logoSize - 5;
        const logoYBottom = pageHeight - margin - logoSize - 5;
        doc.addImage(logoBase64, 'PNG', logoXBottom, logoYBottom, logoSize, logoSize);
      } catch (imageError) {
        console.warn('Error adding bottom logo to PDF, continuing without logo:', imageError);
        // Continue without logo
      }
    }
  } catch (error) {
    // Continue without logo
    console.warn('Error loading bottom logo, continuing without logo:', error);
  }

  // ============================================
  // PAGE 2: COVER LETTER
  // ============================================
  doc.addPage();
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  drawPageBorder(doc, margin);
  yPos = margin + 10;

  // To: Section
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('To:', margin + 10, yPos);
  yPos += 5;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const toClientName = quotation.client?.name || quotation.clientName || 'N/A';
  doc.text(toClientName, margin + 10, yPos);
  yPos += 4;
  
  const toClientAddress = quotation.client?.address || quotation.clientAddress || '';
  if (toClientAddress) {
    const addressLines = doc.splitTextToSize(toClientAddress, pageWidth - 2 * margin - 30);
    addressLines.forEach((line: string) => {
      doc.text(line, margin + 10, yPos);
      yPos += 4;
    });
  }
  yPos += 3;

  // Subject
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Subject: ${quotation.subject || 'Quotation'}`, margin + 10, yPos);
  yPos += 6;

  // Cover Letter Content
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Dear Sir,', margin + 10, yPos);
  yPos += 5;
  
  if (quotation.coverLetter) {
    const coverLetterLines = doc.splitTextToSize(quotation.coverLetter, pageWidth - 2 * margin - 20);
    coverLetterLines.forEach((line: string) => {
      doc.text(line, margin + 10, yPos);
      yPos += 4;
    });
  } else {
    doc.text('We are happily presenting this financial offer to respond your essential requirements based on the following terms and conditions.', margin + 10, yPos);
    yPos += 5;
  }
  yPos += 3;

  // Financial Statement Section
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Financial Statement:', margin + 10, yPos);
  yPos += 5;

  // Calculate section totals for financial statement
  const hasSections = (quotation.section || quotation.sections) && Array.isArray(quotation.section || quotation.sections) && (quotation.section || quotation.sections).length > 0;
  const sections = quotation.section || quotation.sections || [];
  const financialStatementData: any[] = [];
  let grandTotal = 0;

  if (hasSections) {
    sections.forEach((section: any, index: number) => {
      // Use grandTotal if available (already calculated with discount), otherwise calculate
      let sectionTotal = 0;
      if (section.grandTotal != null) {
        sectionTotal = Number(section.grandTotal || 0);
      } else {
        // Calculate from items
        const allItems = getAllSectionItems(section);
        allItems.forEach((item: any) => {
          sectionTotal += Number(item.amount || 0);
        });
        // Apply discount (amount-based, not percentage)
        if (section.discount) {
          sectionTotal = Math.max(0, sectionTotal - Number(section.discount));
        }
      }
      grandTotal += sectionTotal;
      
      // Combine SL number and section name in first column, Amount in second
      const sectionName = section.title || `Section ${index + 1}`;
      financialStatementData.push([
        `${index + 1}: ${sectionName}`,
        formatCurrency(sectionTotal),
      ]);
    });
  }

  // Add grand total row with orange-brown background
  financialStatementData.push([
    {
      content: 'Grand Total (BDT)',
      styles: { fontStyle: 'bold', halign: 'right' },
    },
    {
      content: formatCurrency(grandTotal || Number(quotation.total || 0)),
      styles: { fontStyle: 'bold', fillColor: [255, 165, 0], textColor: [0, 0, 0] }, // Orange-brown color
    },
  ]);

  // Generate Financial Statement Table
  autoTable(doc, {
    startY: yPos,
    head: [['SL', 'Amount Tk']],
    body: financialStatementData,
    theme: 'grid',
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 9,
      lineWidth: 0.5,
      lineColor: [0, 0, 0],
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
      lineWidth: 0.5,
      lineColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: 'auto', halign: 'left' }, // SL with section name
      1: { cellWidth: 60, halign: 'right' }, // Amount Tk
    },
    margin: { left: margin + 10, right: margin + 10 },
    didDrawPage: (data: any) => {
      yPos = data.cursor.y;
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 4;

  // Terms & Conditions Section
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  yPos += 15;
  doc.text('Terms & Conditions:', margin + 10, yPos);
  yPos += 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  // Use tos field if available, otherwise use default terms
  let termsText = quotation.tos || '';
  if (!termsText) {
    termsText = `1. Payment Terms: (a) To Pay 50% of the contract value as advance along with approved drawing offer/ Work Order. (b) To pay remaining 50% of the contact value before delivery.
2. Additional Work: Bill will be added on any additional works (if any).
3. Delivery: Free of cost at the project within Dhaka and additional charges will be applicable at actual basis on delivery requirements outside Dhaka City.
5. Period of Supply: Within 45 working days from the date of site clearance to start production, Supply may be delayed due to natural disaster and political unrest in the country.
6. Schedule Inspection: 4 free inspection, every six months from handover date.
7. Warranty: Six months warranty for any kind of manufacturing fault.
8. Compensation: For any massive change in design during implementation compensation will be applicable.
9. Only PU (Poly Urethane) color will be alteration 1% from actual sample.
10. Bill of Quantity (BOQ): Quoted quantity and items may vary after final work.
11. Validity of Offer: 30 days from the date of offer.
12. Validity of Price: The price offered may change if Govt. Duty /Tax policy, foreign exchange rate changes.
13. Accommodations of our labors will have to be carried by buyer if their site is out of Dhaka.`;
  }

  // Split terms into lines with tighter spacing
  const termsLines = doc.splitTextToSize(termsText, pageWidth - 2 * margin - 20);
  termsLines.forEach((line: string) => {
    // Use compact spacing to fit on one page
    doc.text(line, margin + 10, yPos);
    yPos += 3;
  });
  yPos += 2;

  // Closing Text
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Waiting for a positive reply from your side. Thanking You', margin + 10, yPos);
  yPos += 6;

  // Signature and Attachments Section (side by side at bottom)
  // Position at bottom of page with some margin
  const bottomY = pageHeight - margin - 25;
  const signatureY = bottomY;
  const attachmentsY = bottomY;

  // Signature section (left side)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Signature of the Manager', margin + 10, signatureY);

  // Attachments section (right side)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Attachments', pageWidth - margin - 60, attachmentsY);
  
  const attachmentItems = ['3D', '2D', 'Plan', 'Elevation'];
  attachmentItems.forEach((item, index) => {
    const itemY = attachmentsY + 5 + (index * 4.5);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`${index + 1}. ${item}- Yes/No`, pageWidth - margin - 60, itemY);
  });

  // ============================================
  // PAGES 3+: QUOTATION TABLES (One section per page)
  // ============================================
  // hasSections already declared above
  const hasPhases = quotation.phases && Array.isArray(quotation.phases) && quotation.phases.length > 0;
  const hasItems = quotation.items && Array.isArray(quotation.items) && quotation.items.length > 0;

  if (hasSections) {
    // New section-based structure - Each section on a new page
    sections.forEach((section: any, sectionIndex: number) => {
      // New page for each section
      doc.addPage();
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      // No border on quotation pages - just the table
      yPos = margin + 5;

      // Section title outside the table, above it
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(section.title || `Section ${sectionIndex + 1}`, margin + 5, yPos);
      yPos += 10;

      // Prepare table data with groups, items, and notes
      const tableData: any[] = [];

      // Calculate section total
      let sectionTotal = 0;
      let slCounter = 1;

      // 2. Process groups first (groups appear before direct items)
      // Create a copy of the array before sorting to avoid read-only issues
      const sortedGroups = [...(section.groups || [])].sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
      
      sortedGroups.forEach((group: any) => {
        // Group header row - spans Code and Description columns
        // Create new objects to avoid read-only issues
        tableData.push([
          '',
          '',
          {
            content: String(group.code || ''),
            styles: { fontStyle: 'bold', fontSize: 8 },
          },
          {
            content: String(group.description || ''),
            colSpan: 8, // Spans from Description through Amount Tk
            styles: { fontStyle: 'bold', fontSize: 8 },
          },
        ]);

        // Group items - Create a copy of the array before sorting to avoid read-only issues
        const sortedGroupItems = [...(group.items || [])].sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
        
        sortedGroupItems.forEach((item: any) => {
          try {
            const hasDimensions = !!(item.height || item.width || item.depth);
            
            // Create new array for each row to avoid read-only issues
            let row: any[];
            
            if (hasDimensions) {
              // Item with dimensions - Description in its own cell, then H, W, D in separate cells
              // Box cell should have the box value for group items
              row = [
                slCounter++,
                String(item.box || group.code || ''), // Box value for group items
                String(item.code || ''),
                String(item.description || ''),
                item.height ? String(Number(item.height).toFixed(0)) : '-',
                item.width ? String(Number(item.width).toFixed(0)) : '-',
                item.depth ? String(Number(item.depth).toFixed(0)) : '-',
                formatCurrency(Number(item.unitPrice || 0)),
                Number(item.quantity || 0),
                getUnitDescription(item),
                formatCurrency(Number(item.amount || 0)),
              ];
            } else {
              // Item without dimensions - Description in its own cell, dimension cells empty
              // Box cell should have the box value for group items
              row = [
                slCounter++,
                String(item.box || group.code || ''), // Box value for group items
                String(item.code || ''),
                String(item.description || ''),
                '', // Empty for H
                '', // Empty for W
                '', // Empty for D
                formatCurrency(Number(item.unitPrice || 0)),
                Number(item.quantity || 0),
                getUnitDescription(item),
                formatCurrency(Number(item.amount || 0)),
              ];
            }
            
            tableData.push(row);
            sectionTotal += Number(item.amount || 0);
          } catch (itemError) {
            console.error('Error processing group item:', itemError, item);
            // Continue with next item
          }
        });

        // 6. Extra row after group items with only "qty" cell (group quantity summary)
        if (group.quantity) {
          // Create new object to avoid read-only issues
          tableData.push([
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            {
              content: `Qty: ${Number(group.quantity)}`,
              colSpan: 2,
              styles: { fontStyle: 'italic', fontSize: 7 },
            },
            '',
          ]);
        }
      });

      // 7. Direct section items (not in groups) - Create a copy of the array before sorting to avoid read-only issues
      const sortedDirectItems = [...(section.items || [])].sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
      
      sortedDirectItems.forEach((item: any) => {
        try {
          const hasDimensions = !!(item.height || item.width || item.depth);
          
          // Create new array for each row to avoid read-only issues
          let row: any[];
          
          if (hasDimensions) {
            // Item with dimensions - Description in its own cell, then H, W, D in separate cells
            // Box cell should be empty for direct items (not in groups)
            row = [
              slCounter++,
              '', // Empty box cell for direct items
              String(item.code || ''),
              String(item.description || ''),
              item.height ? String(Number(item.height).toFixed(0)) : '-',
              item.width ? String(Number(item.width).toFixed(0)) : '-',
              item.depth ? String(Number(item.depth).toFixed(0)) : '-',
              formatCurrency(Number(item.unitPrice || 0)),
              Number(item.quantity || 0),
              getUnitDescription(item),
              formatCurrency(Number(item.amount || 0)),
            ];
          } else {
            // Item without dimensions - Description in its own cell, dimension cells empty
            // Box cell should be empty for direct items (not in groups)
            row = [
              slCounter++,
              '', // Empty box cell for direct items
              String(item.code || ''),
              String(item.description || ''),
              '', // Empty for H
              '', // Empty for W
              '', // Empty for D
              formatCurrency(Number(item.unitPrice || 0)),
              Number(item.quantity || 0),
              getUnitDescription(item),
              formatCurrency(Number(item.amount || 0)),
            ];
          }
          
          tableData.push(row);
          sectionTotal += Number(item.amount || 0);
        } catch (itemError) {
          console.error('Error processing direct item:', itemError, item);
          // Continue with next item
        }
      });

      // Apply discount if any (amount-based, not percentage)
      if (section.discount) {
        sectionTotal = Math.max(0, sectionTotal - Number(section.discount));
      }

      // Use grandTotal if available, otherwise use calculated total
      const finalTotal = section.grandTotal != null ? Number(section.grandTotal || 0) : sectionTotal;

      // 8. Total row - Create new objects to avoid read-only issues
      tableData.push([
        {
          content: 'Total:',
          colSpan: 10,
          styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 },
        },
        {
          content: formatCurrency(finalTotal),
          styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 },
        },
      ]);

      // 9. Section Note row - Create new object to avoid read-only issues
      if (section.note) {
        tableData.push([
          {
            content: `Note: ${String(section.note)}`,
            colSpan: 11,
            styles: { fontStyle: 'italic', fontSize: 7, halign: 'left' },
          },
        ]);
      }

      // 10. Prepared By row - Create new object to avoid read-only issues
      const preparedByName = section.preparedBy?.name || quotation.submittedBy?.name || quotation.submittedBy || 'N/A';
      const preparedByRole = section.preparedBy?.role || '';
      const preparedByText = preparedByRole 
        ? `Prepared By: ${String(preparedByName)}, ${String(preparedByRole)}`
        : `Prepared By: ${String(preparedByName)}`;
      
      tableData.push([
        {
          content: preparedByText,
          colSpan: 11,
          styles: { fontSize: 8, halign: 'left' },
        },
      ]);

      // Generate table with exact design matching screenshot
      try {
        // Ensure we have at least one row if section is empty
        if (tableData.length === 0) {
          tableData.push([
            {
              content: 'No items in this section',
              colSpan: 11,
              styles: { halign: 'center', fontStyle: 'italic', fontSize: 8 },
            },
          ]);
        }

        autoTable(doc, {
          startY: yPos,
          head: [
            [
              'SL',
              'Box',
              'Code',
              'Description',
              { content: 'Dimension, mm', colSpan: 3, styles: { halign: 'center' } },
              'Unit price',
              'Qty',
              'Description of',
              'Amount Tk',
            ],
            [
              '',
              '',
              '',
              '',
              'H',
              'W',
              'D',
              '',
              '',
              '',
              '',
            ],
          ],
          body: tableData,
          theme: 'grid',
          headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            fontSize: 8,
            lineWidth: 0.25,
            lineColor: [0, 0, 0],
          },
          styles: {
            fontSize: 7,
            cellPadding: 1,
            lineWidth: 0.25,
            lineColor: [0, 0, 0],
          },
          columnStyles: {
            0: { cellWidth: 8, halign: 'center' }, // SL
            1: { cellWidth: 10, halign: 'center' }, // Box
            2: { cellWidth: 18, halign: 'left' }, // Code
            3: { cellWidth: 50, halign: 'left' }, // Description
            4: { cellWidth: 10, halign: 'center' }, // H
            5: { cellWidth: 10, halign: 'center' }, // W
            6: { cellWidth: 10, halign: 'center' }, // D
            7: { cellWidth: 20, halign: 'right' }, // Unit price
            8: { cellWidth: 10, halign: 'right' }, // Qty
            9: { cellWidth: 12, halign: 'center' }, // Description of
            10: { cellWidth: 20, halign: 'right' }, // Amount Tk
          },
          margin: { left: margin + 5, right: margin + 5 },
          tableWidth: 'auto', // Use 100% width
          didDrawPage: (data: any) => {
            yPos = data.cursor.y;
          },
        });
      } catch (tableError) {
        console.error('Error generating table for section:', tableError, section);
        // Add a simple text fallback
        doc.setFontSize(10);
        doc.text(`Error generating table for ${section.title || 'section'}. Please check the console.`, margin + 5, yPos);
        yPos += 10;
      }

      // Only update yPos if table was successfully generated
      if ((doc as any).lastAutoTable && (doc as any).lastAutoTable.finalY) {
        yPos = (doc as any).lastAutoTable.finalY + 5;
      }
    });

    // Grand Total Page
    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    drawPageBorder(doc, margin);
    yPos = pageHeight / 2 - 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('GRAND TOTAL', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    const grandTotal = quotation.total || quotation.grandTotal || 0;
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(
      formatCurrency(Number(grandTotal)),
      pageWidth / 2,
      yPos,
      { align: 'center' }
    );
  } else if (hasPhases) {
    // Old multi-phase structure (backward compatibility)
    quotation.phases.forEach((phase: any) => {
      doc.addPage();
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      drawPageBorder(doc, margin);
      yPos = margin + 15;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`Phase ${phase.phaseNumber}: ${phase.phaseName}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      if (phase.sections && Array.isArray(phase.sections)) {
        phase.sections.forEach((section: any) => {
          if (yPos > 250) {
            doc.addPage();
            doc.setFillColor(255, 255, 255);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            drawPageBorder(doc, margin);
            yPos = margin + 15;
          }

          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(`${section.slNo}. ${section.sectionName}`, margin + 10, yPos);
          yPos += 10;

          const tableData: any[] = [];

          if (section.pwdItems && Array.isArray(section.pwdItems) && section.pwdItems.length > 0) {
            section.pwdItems.forEach((item: any) => {
              tableData.push([
                item.itemNumber || '-',
                item.description || '-',
                item.unit || '-',
                item.quantity || 0,
                formatCurrency(Number(item.selectedRate || item.rateDhakaMym || 0)),
                formatCurrency(Number(item.amount || 0)),
              ]);
            });
          }

          if (tableData.length > 0) {
            tableData.push([
              {
                content: `Section Total: ${formatCurrency(Number(section.sectionTotal || 0))}`,
                colSpan: 6,
                styles: { fontStyle: 'bold', halign: 'right', fillColor: [245, 245, 245] },
              },
            ]);

            autoTable(doc, {
              startY: yPos,
              head: [['Item', 'Description', 'Unit', 'Quantity', 'Rate', 'Amount']],
              body: tableData,
              theme: 'grid',
              headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
              styles: { fontSize: 8, lineWidth: 0.25, lineColor: [0, 0, 0] },
              margin: { left: margin + 5, right: margin + 5 },
            });

            yPos = (doc as any).lastAutoTable.finalY + 5;
          }
        });
      }
    });
  }

  return doc;
}

export async function downloadQuotationPDF(quotation: Quotation | QuotationWithAll | any, filename?: string) {
  try {
    if (!quotation) {
      throw new Error('Quotation data is required');
    }
    const doc = await generateQuotationPDF(quotation);
    const name = filename || `quotation-${quotation.quotationNumber || 'quotation'}.pdf`;
    doc.save(name);
  } catch (error) {
    console.error('Error generating PDF:', error);
    console.error('Error details:', error instanceof Error ? error.stack : String(error));
    alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}. Please check the console for details.`);
    throw error; // Re-throw to allow caller to handle if needed
  }
}
