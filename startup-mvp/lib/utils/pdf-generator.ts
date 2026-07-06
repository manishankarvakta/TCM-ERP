import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Quotation } from '@/types/quotation';
import { formatDate } from './formatters';

// Helper function to get unit description
const getUnitDescription = (item: any): string => {
  // Use unit from item if available, otherwise default to PC
  return item.unit || 'PC';
};

// Helper function to format currency with Tk prefix
const formatCurrencyTk = (amount: number): string => {
  const formatted = new Intl.NumberFormat('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `Tk ${formatted}`;
};

// Helper function to combine all items from a section (direct items)
const getAllSectionItems = (section: any): any[] => {
  const allItems: any[] = [];
  let slCounter = 1;

  // Add items
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
  if (!imagePath) return null;
  try {
    // Handle relative paths by prepending origin
    let url = imagePath;
    if (!imagePath.startsWith('http') && !imagePath.startsWith('data:')) {
      const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
      if (typeof window !== 'undefined') {
        url = `${window.location.origin}${normalizedPath}`;
      }
    }
    
    console.log(`PDF Generation: Fetching image from URL: ${url}`);
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

// Helper to "white-out" an image (like brightness(0) invert(1))
const makeImageWhite = async (base64String: string): Promise<string | null> => {
  if (!base64String || base64String.startsWith('data:image/svg+xml')) return base64String;
  
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64String);
          return;
        }
        
        // Draw original
        ctx.drawImage(img, 0, 0);
        
        // Fill with white pixels where image exists
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        console.warn('Error whiting out image:', e);
        resolve(base64String);
      }
    };
    img.onerror = () => resolve(base64String);
    img.src = base64String;
  });
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

export async function generateQuotationPDF(quotation: Quotation | any): Promise<jsPDF> {
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
    yPos = margin + 10;
  };

  // Set font to Roboto (fallback to helvetica if Roboto not available)
  // Note: To use Roboto, you need to add Roboto font files to jsPDF
  // For now, using helvetica as it's similar to Roboto
  // To add Roboto: doc.addFont('path/to/roboto.ttf', 'Roboto', 'normal');
  // Then use: doc.setFont('Roboto', 'normal');
  doc.setFont('helvetica', 'normal'); // Using helvetica as Roboto alternative

  // Get organization data from quotation
  console.log('PDF Generation: Starting for Quotation:', quotation?.quotationNumber);
  console.log('PDF Generation: Organization data:', quotation?.organization ? 'Present' : 'Missing');
  console.log('PDF Generation: Org Logo path:', quotation?.organization?.logo);
  console.log('PDF Generation: Client data:', quotation?.client ? 'Present' : 'Missing');
  console.log('PDF Generation: Client Logo path:', quotation?.client?.image);

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


  // Determine if this is a V4 Proposal using structured Sections
  const hasSections = (quotation.section || quotation.sections) && Array.isArray(quotation.section || quotation.sections) && (quotation.section || quotation.sections).length > 0;
  const sections = (quotation.section || quotation.sections || []).filter((s: any) => s.isEnabled !== false);
  const hasCoverSection = sections.some((s: any) => s.sectionType === 'COVER');
  const hasAdvancedSections = sections.some((s: any) => s.sectionType && s.sectionType !== 'PRICING' && s.sectionType !== 'SUMMARY' && s.sectionType !== 'CUSTOM');
  const isV4Proposal = hasCoverSection || hasAdvancedSections;

  // Define Cover Page Generator
  const generateCoverPageLayout = async () => {
    // 1. Sleek Navy Background
    doc.setFillColor(10, 37, 64); // #0A2540
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    yPos = 15; // Move higher for "top left" feel

    // 2. Side-by-Side Logos (Top Left)
    const renderLogos = async () => {
      let xPos = margin + 5;
      const logoH = 15; // Point height
      // No padding needed since background box is removed

      const logos = [
        { path: orgLogo || '/logo.png', label: 'Organization' },
        { path: clientLogo, label: 'Client' }
      ].filter(l => Boolean(l.path));
      
      console.log('PDF Generation: Initialized logos array (White-mode). Total:', logos.length);
      
      for (const logo of logos) {
        try {
          console.log(`PDF Generation: Processing ${logo.label} logo. Path:`, logo.path);
          let base64 = await loadImageAsBase64(logo.path as string);
          if (base64) {
            // Apply white filter to match Web UI "brightness-0 invert"
            base64 = await makeImageWhite(base64);
            
            if (base64) {
              const dims = await getImageDimensions(base64, logoH);
              if (dims) {
                const mmW = dims.width / 3.78;
                const mmH = dims.height / 3.78;
                
                // Add logo directly without background box
                const format = base64.includes('image/png') ? 'PNG' : 'JPEG';
                doc.addImage(base64, format, xPos, yPos, mmW, mmH);
                console.log(`PDF Generation: Successfully added ${logo.label} logo (White) to PDF`);
                xPos += mmW + 15;
              }
            }
          }
        } catch (e) {
          console.error(`PDF Generation: Error processing ${logo.label} logo`, e);
        }
      }
    };
    await renderLogos();

    // 3. Top Right REF / DATE
    doc.setTextColor(255, 255, 255);
    doc.setGState(new (doc as any).GState({opacity: 0.5}));
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const refText = `REF / ${quotation.quotationNumber || 'N/A'}`;
    const dateText = formatDate(quotation.date);
    doc.text(refText, pageWidth - margin - 5, yPos + 2, { align: 'right' });
    yPos += 8;
    doc.setGState(new (doc as any).GState({opacity: 1.0}));
    doc.setFontSize(22);
    doc.text(dateText, pageWidth - margin - 5, yPos + 5, { align: 'right' });

    yPos += 70;

    // 4. Accent Bar (Blue)
    doc.setFillColor(0, 122, 255); // Vibrant Blue
    doc.rect(margin + 5, yPos, 15, 2, 'F');
    yPos += 15;

    // 5. Main Document Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(54);
    doc.setFont('helvetica', 'bold');
    
    const titleLines = doc.splitTextToSize('Software Development Proposal', 150);
    titleLines.forEach((line: string) => {
      doc.text(line, margin + 5, yPos);
      yPos += 18;
    });

    yPos += 5;
    doc.setFontSize(18);
    doc.setTextColor(170, 190, 210); // Light blue-gray
    doc.setFont('helvetica', 'normal');
    const subjectText = quotation.subject || 'Project Quotation';
    const subLines = doc.splitTextToSize(subjectText, 160);
    subLines.forEach((line: string) => {
      doc.text(line, margin + 5, yPos);
      yPos += 8;
    });

    // 6. Footer Prepared Info
    yPos = pageHeight - 65;
    doc.setDrawColor(255, 255, 255);
    doc.setGState(new (doc as any).GState({opacity: 0.1}));
    doc.line(margin + 5, yPos, pageWidth - margin - 5, yPos);
    doc.setGState(new (doc as any).GState({opacity: 1.0}));
    yPos += 15;

    // Side by side Prepared info
    const leftX = margin + 5;
    const rightX = pageWidth * 0.55;
    const maxLeftWidth = rightX - leftX - 10;
    const maxRightWidth = pageWidth - rightX - margin;

    // Left: Prepared For
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.setGState(new (doc as any).GState({opacity: 0.4}));
    doc.text('PREPARED FOR', leftX, yPos);
    
    // Right: Prepared By
    doc.text('PREPARED BY', rightX, yPos);
    doc.setGState(new (doc as any).GState({opacity: 1.0}));
    yPos += 7;

    // Names
    doc.setFontSize(14);
    const clientNameStr = quotation.client?.name || quotation.client?.company || 'N/A';
    const repNameStr = quotation.submittedBy?.name || 'Authorized Representative';
    
    const clientNameLines = doc.splitTextToSize(clientNameStr, maxLeftWidth);
    const repNameLines = doc.splitTextToSize(repNameStr, maxRightWidth);
    
    doc.text(clientNameLines, leftX, yPos);
    doc.text(repNameLines, rightX, yPos);
    
    yPos += Math.max(clientNameLines.length, repNameLines.length) * 6;

    // Companies
    doc.setFontSize(9);
    doc.setGState(new (doc as any).GState({opacity: 0.6}));
    const clientCompanyStr = quotation.client?.company || '';
    const orgNameStr = orgName || '';
    
    const clientCompanyLines = doc.splitTextToSize(clientCompanyStr, maxLeftWidth);
    const orgNameLines = doc.splitTextToSize(orgNameStr, maxRightWidth);
    
    if (clientCompanyStr && clientCompanyStr !== clientNameStr) {
      doc.text(clientCompanyLines, leftX, yPos);
    }
    doc.text(orgNameLines, rightX, yPos);
    doc.setGState(new (doc as any).GState({opacity: 1.0}));
  };

  const generateCoverLetter = () => {
    // PAGE 2: COVER LETTER
    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    // Using a clean layout without border for documents
    yPos = 40;

    doc.setFontSize(22);
    doc.setTextColor(10, 37, 64);
    doc.setFont('helvetica', 'bold');
    doc.text('Introduction', margin + 10, yPos);
    yPos += 15;

    // Side-by-side Prepared info (Mini version)
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const maxLeftWidth2 = (pageWidth * 0.55) - (margin + 10) - 10;
    const maxRightWidth2 = pageWidth - (pageWidth * 0.55) - margin - 10;
    
    doc.text('PREPARED FOR', margin + 10, yPos);
    doc.text('PREPARED BY', pageWidth * 0.55, yPos);
    yPos += 5;
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const clientNameStr2 = quotation.client?.name || quotation.client?.company || 'N/A';
    const repNameStr2 = quotation.submittedBy?.name || 'Authorized Representative';
    const cLines2 = doc.splitTextToSize(clientNameStr2, maxLeftWidth2);
    const rLines2 = doc.splitTextToSize(repNameStr2, maxRightWidth2);
    
    doc.text(cLines2, margin + 10, yPos);
    doc.text(rLines2, pageWidth * 0.55, yPos);
    yPos += Math.max(cLines2.length, rLines2.length) * 5;
    
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    const clientCompStr2 = quotation.client?.company || '';
    const orgNameStr2 = orgName || '';
    const ccLines2 = doc.splitTextToSize(clientCompStr2, maxLeftWidth2);
    const orgLines2 = doc.splitTextToSize(orgNameStr2, maxRightWidth2);
    
    if (clientCompStr2 && clientCompStr2 !== clientNameStr2) {
      doc.text(ccLines2, margin + 10, yPos);
    }
    doc.text(orgLines2, pageWidth * 0.55, yPos);
    yPos += Math.max(ccLines2.length, orgLines2.length) * 4 + 10;

    // Cover Letter Content
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    
    if (quotation.coverLetter) {
        // Clean HTML if present (very basic)
        const cleanContent = quotation.coverLetter.replace(/<[^>]*>?/gm, '');
        const coverLetterLines = doc.splitTextToSize(cleanContent, pageWidth - 2 * margin - 20);
        coverLetterLines.forEach((line: string) => {
            ensurePageSpace(6);
            doc.text(line, margin + 10, yPos);
            yPos += 6;
        });
    } else {
        ensurePageSpace(10);
        const defaultText = 'We are pleased to present this proposal for your consideration. Our team has carefully reviewed your requirements and prepared this comprehensive offer to address your needs.';
        const defaultLines = doc.splitTextToSize(defaultText, pageWidth - 2 * margin - 20);
        defaultLines.forEach((line: string) => {
            ensurePageSpace(6);
            doc.text(line, margin + 10, yPos);
            yPos += 6;
        });
    }
    yPos += 15;

    // Financial Summary (If exists or matches web UI)
    const financialStatement = (quotation as any).financialStatement;
    if (financialStatement) {
        doc.setFillColor(248, 250, 252);
        const boxY = yPos;
        doc.rect(margin + 5, boxY, pageWidth - 2 * margin - 10, 40, 'F');
        yPos += 10;
        doc.setFontSize(12);
        doc.setTextColor(10, 37, 64);
        doc.setFont('helvetica', 'bold');
        doc.text('Financial Investment Summary', margin + 15, yPos);
        yPos += 8;
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        const fsLines = doc.splitTextToSize(financialStatement.replace(/<[^>]*>?/gm, ''), pageWidth - 2 * margin - 30);
        fsLines.forEach((line: string) => {
            doc.text(line, margin + 15, yPos);
            yPos += 4.5;
        });
        yPos = boxY + 50;
    }

    // Terms & Conditions (Embedded in cover letter for short ones, or dynamic)
    if (quotation.tos) {
        doc.setFontSize(12);
        doc.setTextColor(10, 37, 64);
        doc.setFont('helvetica', 'bold');
        doc.text('Terms & Conditions', margin + 10, yPos);
        yPos += 10;
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        const termsLines = doc.splitTextToSize(quotation.tos.replace(/<[^>]*>?/gm, ''), pageWidth - 2 * margin - 20);
        termsLines.slice(0, 15).forEach((line: string) => { // Show preview in cover letter if short
            ensurePageSpace(5);
            doc.text(line, margin + 10, yPos);
            yPos += 4.5;
        });
    }
  };

  // NEW SEQUENCE: 2 FRONT PAGES ALWAYS
  await generateCoverPageLayout();
  generateCoverLetter();



  // ============================================
  // PAGES 3+: QUOTATION TABLES & DYNAMIC SECTIONS
  // ============================================
  const hasPhases = quotation.phases && Array.isArray(quotation.phases) && quotation.phases.length > 0;
  const hasItems = quotation.items && Array.isArray(quotation.items) && quotation.items.length > 0;

      if (hasSections) {
    // Loop through V4/V3 sections sequentially using for...of to support async rendering
    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
      const section = sections[sectionIndex];
      const sType = section.sectionType || 'PRICING';
      
      // Skip COVER sections since they are rendered at the start globally now
      if (sType === 'COVER') {
        continue; 
      }

      // Check remaining space before starting a new section
      if (yPos > pageHeight - margin - 60) {
        doc.addPage();
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        yPos = margin + 5;
      } else {
        if (yPos > margin + 10) {
            yPos += 15;
            doc.setDrawColor(241, 245, 249);
            doc.setLineWidth(0.5);
            doc.line(margin + 20, yPos, pageWidth - margin - 20, yPos);
            yPos += 15;
        }
      }

      const isPricing = sType === 'PRICING' || sType === 'SUMMARY' || sType === 'CUSTOM';

      // Section Prefix (e.g., Section 1)
      doc.setFontSize(8);
      doc.setTextColor(37, 99, 235); // Blue-600
      doc.setFont('helvetica', 'bold');
      doc.text(`SECTION ${sectionIndex + 1}`, margin + 5, yPos);
      yPos += 8;

      // Section title
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(10, 37, 64); // Navy
      doc.text(section.title || `Section ${sectionIndex + 1}`, margin + 5, yPos);
      doc.setTextColor(0, 0, 0); // Reset to black
      yPos += 12;
      
      // Elegant thin divider
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.5);
      doc.line(margin + 5, yPos - 5, pageWidth - margin - 5, yPos - 5);

      if (!isPricing) {
        // --- Metadata-driven rendering for non-pricing sections ---
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        // Always render the note if it exists (top-level description)
        if (section.note) {
          const textLines = doc.splitTextToSize(String(section.note), pageWidth - 2 * margin - 10);
          textLines.forEach((line: string) => {
            ensurePageSpace(6);
            doc.text(line, margin + 5, yPos);
            yPos += 5;
          });
          yPos += 5;
        }

        const metadata = section.metadata || {};

        // 1. Technical Approach Rendering
        if (sType === 'TECHNICAL_APPROACH') {
          const tech = (metadata.technicalApproach || metadata) as any;
          const categories = [
            { label: 'Languages', items: tech.languages },
            { label: 'Frontend',  items: tech.frontend },
            { label: 'Backend',   items: tech.backend },
            { label: 'Database',  items: tech.database },
            { label: 'Cloud/Server', items: tech.server }
          ];

          categories.forEach(cat => {
            if (cat.items && Array.isArray(cat.items) && cat.items.length > 0) {
              ensurePageSpace(10);
              doc.setFont('helvetica', 'bold');
              doc.text(`${cat.label}:`, margin + 10, yPos);
              doc.setFont('helvetica', 'normal');
              doc.text(cat.items.join(', '), margin + 45, yPos);
              yPos += 7;
            }
          });
        }

        // 2. Timeline / Milestones Rendering
        if (sType === 'TIMELINE') {
          const milestones = (metadata.milestones || section.milestones) as any[];
          if (milestones && Array.isArray(milestones) && milestones.length > 0) {
            yPos += 5;
            milestones.forEach((m, idx) => {
              ensurePageSpace(20);
              doc.setFillColor(245, 247, 250);
              doc.rect(margin + 5, yPos, pageWidth - 2 * margin - 10, 15, 'F');
              doc.setFont('helvetica', 'bold');
              doc.text(`M${idx + 1}: ${m.title || 'Milestone'}`, margin + 10, yPos + 6);
              doc.setFontSize(8);
              doc.setTextColor(100, 100, 100);
              doc.text(`Duration: ${m.duration || 'N/A'}`, margin + 10, yPos + 11);
              
              doc.setFontSize(9);
              doc.setTextColor(0, 0, 0);
              const deliv = doc.splitTextToSize(`Deliverables: ${m.deliverables || 'None'}`, pageWidth - 2 * margin - 80);
              doc.text(deliv, margin + 70, yPos + 6);
              
              yPos += 20;
            });
          }
        }

        // 3. Team Structure Rendering
        if (sType === 'TEAM_STRUCTURE') {
          const members = (metadata.teamStructure?.members || metadata.members) as any[];
          if (members && Array.isArray(members) && members.length > 0) {
            members.forEach(m => {
              ensurePageSpace(10);
              doc.setFont('helvetica', 'bold');
              doc.text(m.role || 'Member', margin + 10, yPos);
              doc.setFont('helvetica', 'normal');
              doc.text(`: ${m.count || 1} Person(s) - ${m.responsibilities || ''}`, margin + 45, yPos);
              yPos += 7;
            });
          }
        }

        // 5. Scope Rendering
        if (sType === 'SCOPE') {
            const scope = (metadata.scope || metadata) as any;
            if (scope.overview) {
                ensurePageSpace(15);
                doc.setFont('helvetica', 'bold');
                doc.text('Scope Overview:', margin + 10, yPos);
                yPos += 6;
                doc.setFont('helvetica', 'normal');
                const overLines = doc.splitTextToSize(scope.overview, pageWidth - 2 * margin - 20);
                overLines.forEach((line: string) => {
                    ensurePageSpace(6);
                    doc.text(line, margin + 15, yPos);
                    yPos += 5;
                });
                yPos += 5;
            }

            if (scope.deliverables && Array.isArray(scope.deliverables) && scope.deliverables.length > 0) {
                ensurePageSpace(15);
                doc.setFont('helvetica', 'bold');
                doc.text('Key Deliverables:', margin + 10, yPos);
                yPos += 7;
                scope.deliverables.forEach((d: any) => {
                    ensurePageSpace(20);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`• ${d.name || 'Deliverable'}`, margin + 15, yPos);
                    doc.setFont('helvetica', 'normal');
                    yPos += 5;
                    if (d.description) {
                        const dl = doc.splitTextToSize(d.description, pageWidth - 2 * margin - 30);
                        dl.forEach((l: string) => { ensurePageSpace(5); doc.text(l, margin + 20, yPos); yPos += 4.5; });
                    }
                    yPos += 3;
                });
            }

            // Inclusions / Exclusions
            const inc = scope.inclusions || [];
            const exc = scope.exclusions || [];
            if (inc.length > 0 || exc.length > 0) {
                yPos += 5;
                ensurePageSpace(30);
                const startY = yPos;
                if (inc.length > 0) {
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(16, 185, 129); // Emerald-500
                    doc.text('Inclusions:', margin + 10, yPos);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(0, 0, 0);
                    yPos += 6;
                    inc.forEach((item: string) => {
                        ensurePageSpace(6);
                        doc.text(`+ ${item}`, margin + 15, yPos);
                        yPos += 5;
                    });
                }
                
                if (exc.length > 0) {
                    const excY = inc.length > 0 ? yPos + 5 : startY;
                    yPos = excY;
                    ensurePageSpace(15);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(239, 68, 68); // Red-500
                    doc.text('Exclusions:', margin + 10, yPos);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(0, 0, 0);
                    yPos += 6;
                    exc.forEach((item: string) => {
                        ensurePageSpace(6);
                        doc.text(`- ${item}`, margin + 15, yPos);
                        yPos += 5;
                    });
                }
            }
        }

        // 6. Risk Assessment Rendering
        if (sType === 'RISK_ASSESSMENT') {
          const risks = (metadata.risks || metadata.riskAssessment?.risks) as any[];
          if (risks && Array.isArray(risks) && risks.length > 0) {
            yPos += 5;
            risks.forEach((r, idx) => {
              ensurePageSpace(25);
              doc.setFont('helvetica', 'bold');
              doc.text(`${idx + 1}. ${r.risk || 'Risk'}`, margin + 10, yPos);
              yPos += 5;
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(8);
              doc.text(`Prob/Impact: ${r.probability}/${r.impact}`, margin + 15, yPos);
              yPos += 4;
              const mit = doc.splitTextToSize(`Mitigation: ${r.mitigation || 'N/A'}`, pageWidth - 2 * margin - 20);
              doc.text(mit, margin + 15, yPos);
              yPos += (mit.length * 4.5) + 3;
              doc.setFontSize(10);
            });
          }
        }

        // 7. Appendix / Custom Rendering
        if (sType === 'APPENDIX') {
          const content = metadata.appendix || metadata.content || '';
          if (content) {
            ensurePageSpace(10);
            const lines = doc.splitTextToSize(String(content).replace(/<[^>]*>?/gm, ''), pageWidth - 2 * margin - 10);
            lines.forEach((line: string) => { ensurePageSpace(5); doc.text(line, margin + 10, yPos); yPos += 5; });
          }
        }

        // 8. Consolidated Legal Terms Rendering
        if (sType === 'LEGAL_TERMS') {
          const terms = [
            { label: 'Terms & Conditions', value: metadata.tos },
            { label: 'Payment Schedule',   value: metadata.paymentTerms },
            { label: 'Refund Policy',     value: metadata.refundPolicy },
            { label: 'Termination Policy', value: metadata.terminationPolicy }
          ];

          terms.forEach(term => {
            if (term.value) {
              ensurePageSpace(15);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(10, 37, 64);
              doc.text(`${term.label}:`, margin + 10, yPos);
              yPos += 7;
              
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(60, 60, 60);
              const cleanContent = String(term.value).replace(/<[^>]*>?/gm, '');
              const lines = doc.splitTextToSize(cleanContent, pageWidth - 2 * margin - 20);
              lines.forEach((line: string) => {
                ensurePageSpace(5);
                doc.text(line, margin + 15, yPos);
                yPos += 5;
              });
              yPos += 5;
            }
          });
        }

        // 4. Acceptance Signatures (Matching existing logic but ensuring yPos)
        if (sType === 'ACCEPTANCE') {
          yPos += 15;
          ensurePageSpace(40);
          doc.setFont('helvetica', 'bold');
          doc.line(margin + 5, yPos + 25, margin + 75, yPos + 25);
          doc.text('Authorized Signature (Provider)', margin + 5, yPos + 32);
          
          doc.line(pageWidth - margin - 75, yPos + 25, pageWidth - margin - 5, yPos + 25);
          doc.text('Authorized Signature (Client)', pageWidth - margin - 75, yPos + 32);
          yPos += 45;
        }

        // 9. Cover Letter (Dynamic Section)
        if (sType === 'COVER_LETTER') {
          const content = section.content || section.note || '';
          if (content) {
            ensurePageSpace(10);
            const cleanContent = String(content).replace(/<[^>]*>?/gm, ''); // basic HTML strip
            const lines = doc.splitTextToSize(cleanContent, pageWidth - 2 * margin - 10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(60, 60, 60);
            lines.forEach((line: string) => {
              ensurePageSpace(6);
              doc.text(line, margin + 10, yPos);
              yPos += 5.5;
            });
            yPos += 10;
          }
        }
      } else {
        // Render as standard Pricing Table
        const tableData: any[] = [];
        let sectionTotal = 0;
        let slCounter = 1;

        const processItems = (items: any[], prefix = '') => {
          if (!items) return;
          const sortedItems = [...items].sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
          sortedItems.forEach((item: any) => {
            try {
              const itemCode = item.code ? `[${String(item.code)}] ` : '';
              const itemDescription = prefix + itemCode + String(item.description || '');
              
              const row = [
                slCounter++,
                itemDescription,
                Number(item.quantity || 0),
                formatCurrencyTk(Number(item.unitPrice || 0)),
                formatCurrencyTk(Number(item.amount || 0)),
              ];
              
              tableData.push(row);
              sectionTotal += Number(item.amount || 0);
            } catch (itemError) {
              console.error('Error processing item:', itemError, item);
            }
          });
        };

        if (section.groups && section.groups.length > 0) {
          section.groups.forEach((group: any) => {
             tableData.push([{ content: group.description || 'Group', colSpan: 5, styles: { fontStyle: 'bold', fillColor: [249, 250, 251], textColor: [10, 37, 64] } }]);
             processItems(group.items, '  ');
          });
        }
        
        if (section.categoryGroups && section.categoryGroups.length > 0) {
          section.categoryGroups.forEach((catGroup: any) => {
             const catName = catGroup.category?.name || 'Category';
             tableData.push([{ content: catName, colSpan: 5, styles: { fontStyle: 'bold', fillColor: [249, 250, 251], textColor: [10, 37, 64] } }]);
             processItems(catGroup.items, '  ');
          });
        }

        processItems(section.items, '');

        if (section.discount) {
          sectionTotal = Math.max(0, sectionTotal - Number(section.discount));
        }

        const finalTotal = section.grandTotal != null ? Number(section.grandTotal || 0) : sectionTotal;

        tableData.push([
          { content: 'Total:', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fontSize: 9, font: 'helvetica' } },
          { content: formatCurrencyTk(finalTotal), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9, font: 'helvetica' } },
        ]);

        if (section.note) {
          tableData.push([
            { content: `Note: ${String(section.note)}`, colSpan: 5, styles: { fontStyle: 'italic', fontSize: 8, halign: 'left', textColor: [80, 80, 80] } },
          ]);
        }

        const preparedByName = section.preparedBy?.name || quotation.submittedBy?.name || quotation.submittedBy || 'N/A';
        const preparedByRole = section.preparedBy?.role || '';
        const preparedByText = preparedByRole 
          ? `Prepared By: ${String(preparedByName)}, ${String(preparedByRole)}`
          : `Prepared By: ${String(preparedByName)}`;
        
        tableData.push([
          { content: preparedByText, colSpan: 5, styles: { fontSize: 8, halign: 'left' } },
        ]);

        try {
          if (tableData.length === 0) {
            tableData.push([{ content: 'No items in this section', colSpan: 5, styles: { halign: 'center', fontStyle: 'italic', fontSize: 8 } }]);
          }

          autoTable(doc, {
            startY: yPos,
            pageBreak: 'auto',
            head: [['SL', 'Description', 'Qty', 'Unit Price', 'Amount']],
            body: tableData,
            theme: 'grid',
            headStyles: {
              fillColor: [255, 255, 255],
              textColor: [156, 163, 175], // Gray-400
              fontStyle: 'bold',
              fontSize: 7,
              lineWidth: 0,
              lineColor: [255, 255, 255],
            },
            styles: {
              fontSize: 9,
              cellPadding: 4,
              lineWidth: 0,
              textColor: [75, 85, 99], // Gray-600
              overflow: 'linebreak',
            },
            columnStyles: {
              0: { cellWidth: 10, halign: 'left' },
              1: { cellWidth: 100, halign: 'left', fontStyle: 'bold' },
              2: { cellWidth: 20, halign: 'right' },
              3: { cellWidth: 30, halign: 'right' },
              4: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: [10, 37, 64] },
            },
            tableWidth: pageWidth - 2 * margin - 10,
            margin: { left: margin + 5, right: margin + 5 },
            didDrawPage: (data: any) => {
              yPos = data.cursor.y;
            },
            didParseCell: (data) => {
               if (data.section === 'head') {
                 data.cell.styles.cellPadding = { top: 10, bottom: 5, left: 2, right: 2 };
               }
            },
            willDrawCell: (data) => {
              if (data.section === 'body') {
                doc.setDrawColor(249, 250, 251); // Gray-50
                doc.setLineWidth(0.1);
                doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
              }
            }
          });
        } catch (tableError) {
          doc.setFontSize(10);
          doc.text(`Error generating table for ${section.title || 'section'}.`, margin + 5, yPos);
          yPos += 10;
        }

        if ((doc as any).lastAutoTable && (doc as any).lastAutoTable.finalY) {
          yPos = (doc as any).lastAutoTable.finalY + 10;
        }

        // Section Investment Subtotal (Only for logic matching UI)
        if (sType === 'PRICING') {
            ensurePageSpace(25);
            doc.setFillColor(249, 250, 251); // Gray-50
            const blockW = 80;
            const blockX = pageWidth - margin - blockW - 5;
            doc.roundedRect(blockX, yPos, blockW, 25, 4, 4, 'F');
            
            doc.setFontSize(7);
            doc.setTextColor(156, 163, 175); // Gray-400
            doc.setFont('helvetica', 'bold');
            doc.text('SECTION INVESTMENT', blockX + 8, yPos + 8);
            
            doc.setFontSize(16);
            doc.setTextColor(10, 37, 64);
            doc.text(formatCurrencyTk(finalTotal), blockX + 8, yPos + 18);
            yPos += 30;
        }
      }
    }


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
                formatCurrencyTk(Number(item.selectedRate || item.rateDhakaMym || 0)),
                formatCurrencyTk(Number(item.amount || 0)),
              ]);
            });
          }

          if (tableData.length > 0) {
            tableData.push([
              {
                content: `Section Total: ${formatCurrencyTk(Number(section.sectionTotal || 0))}`,
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
              styles: { fontSize: 8, lineWidth: 0.1, lineColor: [200, 200, 200] },
              margin: { left: margin + 5, right: margin + 5 },
            });

            yPos = (doc as any).lastAutoTable.finalY + 5;
          }
        });
      }
    });
  }

  // ============================================
  // FINAL GRAND TOTAL BLOCK (Navy) - MATCH WEB UI
  // ============================================
  doc.addPage();
  doc.setFillColor(10, 37, 64);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  yPos = pageHeight / 2 - 60;
  
  // Left side: Text
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('Final Project Investment', margin + 10, yPos);
  yPos += 12;
  
  doc.setFontSize(10);
  doc.setTextColor(200, 200, 200);
  doc.setFont('helvetica', 'normal');
  doc.text('This includes all specified phases and deliverables mentioned above.', margin + 10, yPos);
  
  yPos += 30;

  // Right side (Box): Grand Total
  const boxW = 100;
  const boxH = 50;
  const boxX = pageWidth - margin - boxW - 5;
  const boxY = yPos - 10;
  
  doc.setGState(new (doc as any).GState({opacity: 0.1}));
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(boxX, boxY, boxW, boxH, 8, 8, 'F');
  doc.setGState(new (doc as any).GState({opacity: 1.0}));
  
  doc.setFontSize(10);
  doc.setTextColor(147, 197, 253); // blue-300
  doc.setFont('helvetica', 'bold');
  doc.text('GRAND TOTAL', boxX + 15, boxY + 15);
  
  doc.setFontSize(32);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  const totalAmountStr = formatCurrencyTk(Number(quotation.total || 0));
  doc.text(totalAmountStr, boxX + 15, boxY + 32);
  
  doc.setFontSize(8);
  doc.setTextColor(191, 219, 254); // blue-200
  doc.setFont('helvetica', 'normal');
  doc.text('Inclusive of all taxes as per agreement', boxX + 15, boxY + 42);

  // Bottom text
  yPos = pageHeight - 40;
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for choosing Techsoul.', pageWidth / 2, yPos, { align: 'center' });

  return doc;
}

export async function downloadQuotationPDF(quotation: Quotation | any, filename?: string) {
  try {
    if (!quotation) {
      throw new Error('Quotation data is required');
    }
    const doc = await generateQuotationPDF(quotation);
    
    let clientName = 'client';
    if (quotation.client) {
        clientName = quotation.client.name || quotation.client.company || 'client';
    }
    // Sanitize client name for filesystem
    clientName = clientName.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();

    const name = filename || `quotation-${clientName}-${quotation.quotationNumber || 'export'}.pdf`;
    doc.save(name);
  } catch (error) {
    console.error('Error generating PDF:', error);
    console.error('Error details:', error instanceof Error ? error.stack : String(error));
    alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}. Please check the console for details.`);
    throw error; // Re-throw to allow caller to handle if needed
  }
}
