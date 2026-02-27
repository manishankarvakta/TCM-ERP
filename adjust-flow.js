const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'startup-mvp/lib/utils/pdf-generator.ts');
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Move Cover Letter block into a reusable function, just like generateCoverPageLayout
// The cover letter block starts at `doc.addPage();` inside `if (!isV4Proposal) {` and ends at `}); }` before `// PAGES 3+: QUOTATION TABLES`.
// Actually, let's extract it.
const coverLetterStartStr = `    // PAGE 2: COVER LETTER
    doc.addPage();
  doc.setFillColor(255, 255, 255);`;
  
const financialStatementEndStr = `);
  }

  // ============================================
  // PAGES 3+: QUOTATION TABLES & DYNAMIC SECTIONS
  // ============================================`;

const startIdx = content.indexOf(coverLetterStartStr);
const endIdx = content.indexOf(financialStatementEndStr);

if (startIdx !== -1 && endIdx !== -1) {
  const coverLetterSrc = content.substring(startIdx + 29, endIdx + 3).trim();
  
  // Create generateCoverLetter()
  const generateCoverLetterFn = 
`  const generateCoverLetter = () => {
    doc.addPage();
    doc.setFillColor(255, 255, 255);
    ${coverLetterSrc.replace(/\\n/g, '\n    ')}
  };\n\n`;

  // Insert before `if (!isV4Proposal)`
  content = content.replace('  if (!isV4Proposal) {', generateCoverLetterFn + '  if (!isV4Proposal) {');
  
  // Replace the original with a call
  const oldIfBody = `    // PAGE 2: COVER LETTER
    doc.addPage();
  doc.setFillColor(255, 255, 255);` + content.substring(startIdx + 72, endIdx + 3);
  
  content = content.replace(oldIfBody, `    generateCoverLetter();`);
} else {
  console.log("Could not find Cover Letter Boundaries.");
}

// 2. Modify the main flow: ALWAYS show Cover Page and Cover Letter for V4 unless skipped?
// The user said: "you create 2 cover page, first one cover page and second one will be the coverletter, then the rest"
// This implies we should ALWAYS have Cover Page and Cover Letter at the front.
// Let's replace the if (!isV4Proposal) logic.
const proposalConditionRegex = /  if \(!isV4Proposal\) \{\n    \/\/ Legacy \/ Standard fallback\n    await generateCoverPageLayout\(\);\n    \n    generateCoverLetter\(\);\n  \}/;

content = content.replace(proposalConditionRegex, `  // ALWAYS generate Cover Page and Cover Letter as the first two pages
  await generateCoverPageLayout();
  generateCoverLetter();`);

// 3. Remove the forced page break in the sections loop and ensure titles stay with tables.
const sectionLoopStartRegex = /      if \(isV4Proposal && sType === 'COVER'\) \{\n        await generateCoverPageLayout\(\);\n        continue; \/\/ Skip the standard rendering for COVER\n      \}\n\n      \/\/ New page for each section\n      doc\.addPage\(\);\n      doc\.setFillColor\(255, 255, 255\);\n      doc\.rect\(0, 0, pageWidth, pageHeight, 'F'\);\n      yPos = margin \+ 5;/;

const smoothSectionLoop = `      // Skip COVER sections since they are rendered at the start globally now
      if (sType === 'COVER' || sType === 'COVER_LETTER') {
        continue; 
      }

      // Check remaining space before starting a new section
      // If less than 60 units of space, force a new page so the title doesn't orphan
      if (yPos > pageHeight - margin - 60) {
        doc.addPage();
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        yPos = margin + 5;
      } else {
        // Add some breathing room between continuous sections on the same page
        // But only if it's not the very top of the page
        if (yPos > margin + 10) {
            yPos += 15;
            // Draw a subtle section divider
            doc.setDrawColor(230, 230, 230);
            doc.setLineWidth(1);
            doc.line(margin + 20, yPos, pageWidth - margin - 20, yPos);
            yPos += 15;
        }
      }`;

content = content.replace(sectionLoopStartRegex, smoothSectionLoop);

// 4. Update the autoTable properties to prevent price tables from breaking.
// We add \`pageBreak: 'avoid',\` to the autoTable configuration.
const autoTableRegex = /autoTable\(doc, \{\n            startY: yPos,\n            head/;

content = content.replace(autoTableRegex, `autoTable(doc, {
            startY: yPos,
            pageBreak: 'avoid',
            head`);

fs.writeFileSync(targetPath, content);
console.log('Flow Adjustments Applied!');
