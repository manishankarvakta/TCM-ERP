import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Quotation } from '@/types/quotation';
import { formatDate } from './formatters';

// Helper function to get unit description
const getUnitDescription = (item: any): string => {
  // Use unit from item if available, otherwise default to PC
  return item.unit || 'PC';
};

// Helper function to format currency with TAKA symbol on the left
const formatCurrencyRight = (amount: number): string => {
  const formatted = new Intl.NumberFormat('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `৳ ${formatted}`;
};

// Helper function to combine all items from a section (groups + category groups + direct items)
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

  // Add items from category groups
  if (section.categoryGroups && section.categoryGroups.length > 0) {
    section.categoryGroups.forEach((categoryGroup: any) => {
      if (categoryGroup.items && categoryGroup.items.length > 0) {
        categoryGroup.items.forEach((item: any) => {
          allItems.push({
            ...item,
            box: categoryGroup.category?.name || item.code || '',
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
    // Handle both absolute URLs and relative paths
    const url = imagePath.startsWith('http') ? imagePath : imagePath;
    const response = await fetch(url);
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

// Helper function to get image dimensions and calculate width based on desired height
const getImageDimensions = (base64String: string, desiredHeight: number): Promise<{ width: number; height: number } | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      const calculatedWidth = desiredHeight * aspectRatio;
      resolve({ width: calculatedWidth, height: desiredHeight });
    };
    img.onerror = () => {
      console.warn('Error loading image to get dimensions');
      resolve(null);
    };
    img.src = base64String;
  });
};

// Draw page border
const drawPageBorder = (doc: jsPDF, margin: number) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin);
};

export async function generateQuotationPDF(quotation: any): Promise<jsPDF> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin + 10;

  // Ensure we never write text outside the bordered page area.
  // If there isn't enough vertical space for the next line, we add a new page
  // and re-draw the border/background.
  const ensurePageSpace = (neededHeight: number) => {
    const bottomLimit = pageHeight - margin - 5;
    if (yPos + neededHeight <= bottomLimit) return;

    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, "F");
    drawPageBorder(doc, margin);
    yPos = margin + 10;
  };

  // Set font to Roboto (fallback to helvetica if Roboto not available)
  // Note: To use Roboto, you need to add Roboto font files to jsPDF
  // For now, using helvetica as it's similar to Roboto
  // To add Roboto: doc.addFont('path/to/roboto.ttf', 'Roboto', 'normal');
  // Then use: doc.setFont('Roboto', 'normal');
  doc.setFont('helvetica', 'normal'); // Using helvetica as Roboto alternative

  // Get organization data from quotation
  const organization = quotation.organization || null;
  const orgName = organization?.name || 'Organization';
  const orgAddress = organization?.address || '';
  const orgPhone = organization?.phone || '';
  const orgEmail = organization?.email || '';
  const orgWebsite = organization?.website || '';
  const orgLogo = organization?.logo || null;
  const defaultLogoPath = '/logo.png'; // Default logo fallback

  // Get client data from quotation
  const client = quotation.client || null;
  const clientLogo = client?.image || null;

  // ============================================
  // PAGE 1: COVER PAGE
  // ============================================
  
  // White background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Draw border
  drawPageBorder(doc, margin);

  // ============================================
  // TOP SECTION: 2-COLUMN LAYOUT
  // ============================================
  
  const topSectionY = yPos;
  const columnGap = 10; // Gap between columns
  const columnWidth = (pageWidth - 2 * margin - columnGap) / 2; // Divide available width into 2 columns
  const leftColumnX = margin + 5;
  const rightColumnX = margin + 5 + columnWidth + columnGap;
  let leftColumnY = topSectionY;
  let rightColumnY = topSectionY;

  // LEFT COLUMN: Hi-Tech Logo and Company Details
  const hiTechLogoPath = '/hi-tech.png';
  const topLogoHeight = 80; // Fixed height in pixels (reduced from 100px)
  
  try {
    const hiTechLogoBase64 = await loadImageAsBase64(hiTechLogoPath);
    if (hiTechLogoBase64) {
      try {
        const dimensions = await getImageDimensions(hiTechLogoBase64, topLogoHeight);
        if (dimensions) {
          // Convert pixels to mm (1mm ≈ 3.779527559 pixels at 96 DPI)
          const logoHeightMM = topLogoHeight / 3.779527559;
          const logoWidthMM = dimensions.width / 3.779527559;
          doc.addImage(hiTechLogoBase64, 'PNG', leftColumnX, leftColumnY, logoWidthMM, logoHeightMM);
          leftColumnY += logoHeightMM + 5; // Add spacing after logo
        }
      } catch (imageError) {
        console.warn('Error adding hi-tech logo to PDF, continuing without logo:', imageError);
      }
    }
  } catch (error) {
    console.warn('Error loading hi-tech logo, continuing without logo:', error);
  }

  // Company details below hi-tech logo
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const companyDetails = [
    'Office: 28, Land View Commercial, Gulshan-2, Dhaka',
    'Factory: Plot-10202, Mogardia Bazar, Satarkul, Madani Avenue',
    'Phone: 01923 5980080, 01950 507407',
    'Email: info@espaciodb.com',
    'Web: https://espaciobd.com'
  ];
  
  companyDetails.forEach((detail) => {
    const lines = doc.splitTextToSize(detail, columnWidth - 5);
    lines.forEach((line: string) => {
      doc.text(line, leftColumnX, leftColumnY);
      leftColumnY += 4;
    });
  });

  // RIGHT COLUMN: Organization Logo and Info
  const rightMargin = 5; // Margin from the right edge of the page
  const rightColumnEndX = pageWidth - margin - rightMargin; // End position for right alignment with margin from page edge
  
  // Try to load organization logo, fallback to default logo if it fails
  let orgLogoBase64: string | null = null;
  if (orgLogo) {
    try {
      orgLogoBase64 = await loadImageAsBase64(orgLogo);
    } catch (error) {
      console.warn('Error loading organization logo, trying default logo:', error);
    }
  }
  
  // If organization logo failed or doesn't exist, try default logo
  if (!orgLogoBase64) {
    try {
      orgLogoBase64 = await loadImageAsBase64(defaultLogoPath);
    } catch (error) {
      console.warn('Error loading default logo:', error);
    }
  }
  
  if (orgLogoBase64) {
    try {
      const dimensions = await getImageDimensions(orgLogoBase64, topLogoHeight);
      if (dimensions) {
        // Convert pixels to mm (1mm ≈ 3.779527559 pixels at 96 DPI)
        const logoHeightMM = topLogoHeight / 3.779527559;
        const logoWidthMM = dimensions.width / 3.779527559;
        // Position logo at the right edge of the column (right-aligned)
        const logoX = rightColumnEndX - logoWidthMM;
        doc.addImage(orgLogoBase64, 'PNG', logoX, rightColumnY, logoWidthMM, logoHeightMM);
        rightColumnY += logoHeightMM + 5; // Add spacing after logo
      }
    } catch (imageError) {
      console.warn('Error adding organization logo to PDF, continuing without logo:', imageError);
    }
  }

  // Organization Name and Info below logo (right-aligned)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(orgName, rightColumnEndX, rightColumnY, { align: 'right' });
  rightColumnY += 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const orgInfo: string[] = [];
  
  if (orgAddress) {
    orgInfo.push(orgAddress);
  }
  if (orgPhone) {
    orgInfo.push(`Phone: ${orgPhone}`);
  }
  if (orgEmail) {
    orgInfo.push(`E-mail: ${orgEmail}`);
  }
  if (orgWebsite) {
    orgInfo.push(`Web: ${orgWebsite}`);
  }
  
  // If no organization info, add a placeholder
  if (orgInfo.length === 0) {
    orgInfo.push('Organization information not available');
  }
  
  orgInfo.forEach((info) => {
    const lines = doc.splitTextToSize(info, columnWidth - 5);
    lines.forEach((line: string) => {
      doc.text(line, rightColumnEndX, rightColumnY, { align: 'right' });
      rightColumnY += 4;
    });
  });

  // Update yPos to the bottom of the top section (use the maximum of both columns)
  yPos = Math.max(leftColumnY, rightColumnY) + 10;

  // Central Large Logo - Use client logo (or fallback to default)
  // Fixed height: 100px, width auto (maintain aspect ratio)
  const centerX = pageWidth / 2;
  const centerLogoHeight = 100; // Fixed height in pixels
  const clientLogoPath = clientLogo || '/clientLogo.png';
  let centerLogoHeightMM = 0;
  
  // Debug: Log client logo information
  if (clientLogo) {
    console.log('Client logo path:', clientLogo);
  } else {
    console.log('No client logo found, using fallback:', clientLogoPath);
  }
  
  try {
    const logoBase64 = await loadImageAsBase64(clientLogoPath);
    if (logoBase64) {
      try {
        const dimensions = await getImageDimensions(logoBase64, centerLogoHeight);
        if (dimensions) {
          // Convert pixels to mm (1mm ≈ 3.779527559 pixels at 96 DPI)
          centerLogoHeightMM = centerLogoHeight / 3.779527559;
          const centerLogoWidthMM = dimensions.width / 3.779527559;
          doc.addImage(logoBase64, 'PNG', centerX - centerLogoWidthMM / 2, yPos, centerLogoWidthMM, centerLogoHeightMM);
          console.log('Client logo added successfully, dimensions:', dimensions);
        } else {
          console.warn('Could not get dimensions for client logo');
        }
      } catch (imageError) {
        console.warn('Error adding client logo to PDF, continuing without logo:', imageError);
        // Continue without logo
      }
    } else {
      console.warn('Client logo not loaded, path:', clientLogoPath, 'clientLogo value:', clientLogo);
    }
  } catch (error) {
    // If logo fails, continue without it
    console.warn('Error loading client logo, continuing without logo:', error);
  }
  // Use the actual logo height or default if logo wasn't loaded
  if (centerLogoHeightMM === 0) {
    centerLogoHeightMM = centerLogoHeight / 3.779527559;
  }
  yPos += centerLogoHeightMM + 20;

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
  if (orgPhone) {
    doc.text(`Hot Line: ${orgPhone}`, margin + 5, footerY);
  }
  if (orgEmail) {
    doc.text(`E-mail: ${orgEmail}`, pageWidth - margin - 5, footerY, { align: 'right' });
  }
  doc.setTextColor(0, 0, 0); // Reset to black

  // Organization Logo at Bottom Right Corner
  // Fixed height: 50px, width auto (maintain aspect ratio)
  const bottomLogoHeight = 50; // Fixed height in pixels
  
  // Try to load organization logo, fallback to default logo if it fails
  let bottomLogoBase64: string | null = null;
  if (orgLogo) {
    try {
      bottomLogoBase64 = await loadImageAsBase64(orgLogo);
    } catch (error) {
      console.warn('Error loading organization logo for bottom, trying default logo:', error);
    }
  }
  
  // If organization logo failed or doesn't exist, try default logo
  if (!bottomLogoBase64) {
    try {
      bottomLogoBase64 = await loadImageAsBase64(defaultLogoPath);
    } catch (error) {
      console.warn('Error loading default logo for bottom:', error);
    }
  }
  
  if (bottomLogoBase64) {
    try {
      const dimensions = await getImageDimensions(bottomLogoBase64, bottomLogoHeight);
      if (dimensions) {
        // Convert pixels to mm (1mm ≈ 3.779527559 pixels at 96 DPI)
        const bottomLogoHeightMM = bottomLogoHeight / 3.779527559;
        const bottomLogoWidthMM = dimensions.width / 3.779527559;
        const logoXBottom = pageWidth - margin - bottomLogoWidthMM - 5;
        const logoYBottom = pageHeight - margin - bottomLogoHeightMM - 5;
        doc.addImage(bottomLogoBase64, 'PNG', logoXBottom, logoYBottom, bottomLogoWidthMM, bottomLogoHeightMM);
      }
    } catch (imageError) {
      console.warn('Error adding bottom organization logo to PDF, continuing without logo:', imageError);
      // Continue without logo
    }
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
      ensurePageSpace(4);
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
  // doc.text('Dear Sir,', margin + 10, yPos);
  yPos += 5;
  
  if (quotation.coverLetter) {
    const coverLetterLines = doc.splitTextToSize(quotation.coverLetter, pageWidth - 2 * margin - 20);
    coverLetterLines.forEach((line: string) => {
      ensurePageSpace(4);
      doc.text(line, margin + 10, yPos);
      yPos += 4;
    });
  } else {
    ensurePageSpace(5);
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
        formatCurrencyRight(sectionTotal),
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
      content: formatCurrencyRight(grandTotal || Number(quotation.total || 0)),
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
      1: { cellWidth: 60, halign: 'right', font: 'helvetica' }, // Amount Tk - explicitly use helvetica (not roboto)
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
        // Split description text to prevent overflow
        const groupDescription = String(group.description || '');
        const descriptionLines = doc.splitTextToSize(groupDescription, 50); // Max width in mm
        
        tableData.push([
          '',
          '',
          {
            content: String(group.code || ''),
            styles: { fontStyle: 'bold', fontSize: 8 },
          },
          {
            content: descriptionLines,
            colSpan: 9, // Spans from Description through Amount Tk (updated for Discount column)
            styles: { fontStyle: 'bold', fontSize: 8 },
          },
        ]);

        // Group items - Create a copy of the array before sorting to avoid read-only issues
        const sortedGroupItems = [...(group.items || [])].sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
        
        sortedGroupItems.forEach((item: any) => {
          try {
            const hasDimensions = !!(item.height || item.width || item.depth);
            
            // Split text to prevent overflow
            const itemCode = String(item.code || '');
            const itemDescription = String(item.description || '');
            const codeLines = doc.splitTextToSize(itemCode, 18); // Max width for Code column
            const descriptionLines = doc.splitTextToSize(itemDescription, 50); // Max width for Description column
            
            // Create new array for each row to avoid read-only issues
            let row: any[];
            
            if (hasDimensions) {
              // Item with dimensions - Description in its own cell, then H, W, D in separate cells
              // Box cell should have the no value, fallback to box or group.code for group items
              row = [
                slCounter++,
                String(item.no || item.box || group.code || ''), // Use no value, fallback to box or group.code
                codeLines,
                descriptionLines,
                item.height ? String(Number(item.height).toFixed(0)) : '-',
                item.width ? String(Number(item.width).toFixed(0)) : '-',
                item.depth ? String(Number(item.depth).toFixed(0)) : '-',
                formatCurrencyRight(Number(item.unitPrice || 0)),
                Number(item.quantity || 0),
                getUnitDescription(item),
                formatCurrencyRight(Number(item.discount || 0)),
                formatCurrencyRight(Number(item.amount || 0)),
              ];
            } else {
              // Item without dimensions - Description in its own cell, dimension cells empty
              // Box cell should have the no value, fallback to box or group.code for group items
              row = [
                slCounter++,
                String(item.no || item.box || group.code || ''), // Use no value, fallback to box or group.code
                codeLines,
                descriptionLines,
                '', // Empty for H
                '', // Empty for W
                '', // Empty for D
                formatCurrencyRight(Number(item.unitPrice || 0)),
                Number(item.quantity || 0),
                getUnitDescription(item),
                formatCurrencyRight(Number(item.discount || 0)),
                formatCurrencyRight(Number(item.amount || 0)),
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

      // 3. Process category groups (after regular groups, before direct items)
      const sortedCategoryGroups = [...(section.categoryGroups || [])].sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
      
      sortedCategoryGroups.forEach((categoryGroup: any) => {
        // Category group header row - spans Code and Description columns
        const categoryName = categoryGroup.category?.name || 'Uncategorized';
        const categoryNameLines = doc.splitTextToSize(categoryName, 50); // Max width in mm
        
        tableData.push([
          '',
          '',
          {
            content: categoryName,
            styles: { fontStyle: 'bold', fontSize: 8, fillColor: [240, 240, 250] },
          },
          {
            content: categoryNameLines,
            colSpan: 9, // Spans from Description through Amount Tk (updated for Discount column)
            styles: { fontStyle: 'bold', fontSize: 8, fillColor: [240, 240, 250] },
          },
        ]);

        // Category group items - Create a copy of the array before sorting to avoid read-only issues
        const sortedCategoryGroupItems = [...(categoryGroup.items || [])].sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
        
        sortedCategoryGroupItems.forEach((item: any) => {
          try {
            const hasDimensions = !!(item.height || item.width || item.depth);
            
            // Split text to prevent overflow
            const itemCode = String(item.code || '');
            const itemDescription = String(item.description || '');
            const codeLines = doc.splitTextToSize(itemCode, 18); // Max width for Code column
            const descriptionLines = doc.splitTextToSize(itemDescription, 50); // Max width for Description column
            
            // Create new array for each row to avoid read-only issues
            let row: any[];
            
            if (hasDimensions) {
              // Item with dimensions
              row = [
                slCounter++,
                String(item.no || categoryName || ''), // Use no value, fallback to categoryName for category group items
                codeLines,
                descriptionLines,
                item.height ? String(Number(item.height).toFixed(0)) : '-',
                item.width ? String(Number(item.width).toFixed(0)) : '-',
                item.depth ? String(Number(item.depth).toFixed(0)) : '-',
                formatCurrencyRight(Number(item.unitPrice || 0)),
                Number(item.quantity || 0),
                getUnitDescription(item),
                formatCurrencyRight(Number(item.discount || 0)),
                formatCurrencyRight(Number(item.amount || 0)),
              ];
            } else {
              // Item without dimensions
              row = [
                slCounter++,
                String(item.no || categoryName || ''), // Use no value, fallback to categoryName for category group items
                codeLines,
                descriptionLines,
                '', // Empty for H
                '', // Empty for W
                '', // Empty for D
                formatCurrencyRight(Number(item.unitPrice || 0)),
                Number(item.quantity || 0),
                getUnitDescription(item),
                formatCurrencyRight(Number(item.discount || 0)),
                formatCurrencyRight(Number(item.amount || 0)),
              ];
            }
            
            tableData.push(row);
            sectionTotal += Number(item.amount || 0);
          } catch (itemError) {
            console.error('Error processing category group item:', itemError, item);
            // Continue with next item
          }
        });
      });

      // 4. Direct section items (not in groups) - Create a copy of the array before sorting to avoid read-only issues
      const sortedDirectItems = [...(section.items || [])].sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
      
      sortedDirectItems.forEach((item: any) => {
        try {
          const hasDimensions = !!(item.height || item.width || item.depth);
          
          // Split text to prevent overflow
          const itemCode = String(item.code || '');
          const itemDescription = String(item.description || '');
          const codeLines = doc.splitTextToSize(itemCode, 18); // Max width for Code column
          const descriptionLines = doc.splitTextToSize(itemDescription, 50); // Max width for Description column
          
          // Create new array for each row to avoid read-only issues
          let row: any[];
          
          if (hasDimensions) {
            // Item with dimensions - Description in its own cell, then H, W, D in separate cells
            // Box cell should be empty for direct items (not in groups)
            row = [
              slCounter++,
              String(item.no || ''), // Use no value for direct items
              codeLines,
              descriptionLines,
              item.height ? String(Number(item.height).toFixed(0)) : '-',
              item.width ? String(Number(item.width).toFixed(0)) : '-',
              item.depth ? String(Number(item.depth).toFixed(0)) : '-',
              formatCurrencyRight(Number(item.unitPrice || 0)),
              Number(item.quantity || 0),
              getUnitDescription(item),
              formatCurrencyRight(Number(item.discount || 0)),
              formatCurrencyRight(Number(item.amount || 0)),
            ];
          } else {
            // Item without dimensions - Description in its own cell, dimension cells empty
            // Box cell should use no value for direct items
            row = [
              slCounter++,
              String(item.no || ''), // Use no value for direct items
              codeLines,
              descriptionLines,
              '', // Empty for H
              '', // Empty for W
              '', // Empty for D
              formatCurrencyRight(Number(item.unitPrice || 0)),
              Number(item.quantity || 0),
              getUnitDescription(item),
              formatCurrencyRight(Number(item.discount || 0)),
              formatCurrencyRight(Number(item.amount || 0)),
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
          styles: { halign: 'right', fontStyle: 'bold', fontSize: 9, font: 'helvetica' },
        },
        {
          content: formatCurrencyRight(finalTotal),
          styles: { halign: 'right', fontStyle: 'bold', fontSize: 9, font: 'helvetica' }, // Explicitly use helvetica (not roboto)
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
              colSpan: 10,
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
              'Discount',
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
            overflow: 'linebreak', // Enable line breaks for text overflow
            cellWidth: 'wrap', // Wrap content to prevent overflow
          },
          columnStyles: {
            0: { cellWidth: 8, halign: 'center' }, // SL
            1: { cellWidth: 10, halign: 'center' }, // Box
            2: { cellWidth: 18, halign: 'left' }, // Code
            3: { cellWidth: 50, halign: 'left' }, // Description
            4: { cellWidth: 10, halign: 'center' }, // H
            5: { cellWidth: 10, halign: 'center' }, // W
            6: { cellWidth: 10, halign: 'center' }, // D
            7: { cellWidth: 20, halign: 'right', font: 'helvetica' }, // Unit price - explicitly use helvetica (not roboto)
            8: { cellWidth: 10, halign: 'right' }, // Qty
            9: { cellWidth: 12, halign: 'center' }, // Description of
            10: { cellWidth: 20, halign: 'right', font: 'helvetica' }, // Discount - explicitly use helvetica (not roboto)
            11: { cellWidth: 20, halign: 'right', font: 'helvetica' }, // Amount Tk - explicitly use helvetica (not roboto)
          },
          // Calculate table width and center it
          tableWidth: 8 + 10 + 18 + 50 + 10 + 10 + 10 + 20 + 10 + 12 + 20 + 20, // Total of all column widths = 198mm
          margin: { 
            left: (pageWidth - 198) / 2, // Center the table horizontally
            right: (pageWidth - 198) / 2 
          },
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
      formatCurrencyRight(Number(grandTotal)),
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
                formatCurrencyRight(Number(item.selectedRate || item.rateDhakaMym || 0)),
                formatCurrencyRight(Number(item.amount || 0)),
              ]);
            });
          }

          if (tableData.length > 0) {
            tableData.push([
              {
                content: `Section Total: ${formatCurrencyRight(Number(section.sectionTotal || 0))}`,
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

export async function downloadQuotationPDF(quotation: any, filename?: string) {
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
    console.error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}. Please check the console for details.`);
    throw error; // Re-throw to allow caller to handle if needed
  }
}
