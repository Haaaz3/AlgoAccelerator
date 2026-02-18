/**
 * Document Loader Service
 *
 * Extracts text content from various document formats:
 * - PDF (using pdf.js)
 * - Excel/CSV (using xlsx)
 * - HTML (using DOMParser)
 * - ZIP packages (using JSZip)
 * - Plain text
 */

import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

// Configure PDF.js worker - use the public folder copy for reliable loading
// This avoids CORS issues with CDN fallback
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
console.log('PDF.js worker configured with local worker from /public');

;                                   
                   
                   
                  
                                   
                      
                                                                                                  
                 
 

;                                  
                                 
                          
                   
                                                                                            
 

/**
 * Extract text content from multiple files
 */
export async function extractFromFiles(files        )                            {
  const documents                      = [];
  const errors           = [];

  for (const file of files) {
    try {
      const doc = await extractFromFile(file);
      documents.push(doc);
      if (doc.error) {
        errors.push(`${file.name}: ${doc.error}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`${file.name}: ${errorMsg}`);
      documents.push({
        filename: file.name,
        fileType: getFileType(file.name),
        content: '',
        metadata: {},
        error: errorMsg,
      });
    }
  }

  // Combine all document content with clear separators
  const combinedContent = documents
    .filter(d => d.content)
    .map(d => `\n=== FILE: ${d.filename} (${d.fileType}) ===\n${d.content}`)
    .join('\n\n');

  // Combine all page images from PDFs
  const pageImages = documents
    .filter(d => d.pageImages && d.pageImages.length > 0)
    .flatMap(d => d.pageImages );

  return { documents, combinedContent, errors, pageImages: pageImages.length > 0 ? pageImages : undefined };
}

/**
 * Extract text from a single file
 */
async function extractFromFile(file      )                             {
  const fileType = getFileType(file.name);

  switch (fileType) {
    case 'pdf':
      return extractFromPDF(file);
    case 'excel':
      return extractFromExcel(file);
    case 'html':
      return extractFromHTML(file);
    case 'zip':
      return extractFromZIP(file);
    case 'text':
    case 'cql':
    case 'json':
    case 'xml':
      return extractFromText(file);
    default:
      return {
        filename: file.name,
        fileType,
        content: '',
        metadata: {},
        error: `Unsupported file type: ${fileType}`,
      };
  }
}

/**
 * Get file type from filename
 */
function getFileType(filename        )         {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  if (ext === 'pdf') return 'pdf';
  if (['xlsx', 'xls', 'csv'].includes(ext)) return 'excel';
  if (['html', 'htm'].includes(ext)) return 'html';
  if (ext === 'zip') return 'zip';
  if (ext === 'cql') return 'cql';
  if (ext === 'json') return 'json';
  if (ext === 'xml') return 'xml';
  if (['txt', 'md'].includes(ext)) return 'text';

  return 'unknown';
}

/**
 * Extract text from PDF using pdf.js
 * Falls back to rendering pages as images if text extraction yields insufficient content
 */
async function extractFromPDF(file      )                             {
  const metadata                         = {};

  console.log(`[PDF Extraction] Starting extraction for: ${file.name} (${file.size} bytes)`);

  try {
    const arrayBuffer = await file.arrayBuffer();
    console.log(`[PDF Extraction] ArrayBuffer loaded: ${arrayBuffer.byteLength} bytes`);

    // Create loading task with options for better compatibility
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useSystemFonts: true,
      disableFontFace: false,
      verbosity: 0, // Reduce console noise
    });

    const pdf = await loadingTask.promise;
    console.log(`[PDF Extraction] PDF loaded successfully: ${pdf.numPages} pages`);

    metadata.pageCount = String(pdf.numPages);

    const pages           = [];
    let totalTextItems = 0;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      console.log(`[PDF Extraction] Page ${i}: ${textContent.items.length} text items`);
      totalTextItems += textContent.items.length;

      // Reconstruct text with proper spacing
      let lastY                = null;
      let pageText = '';

      for (const item of textContent.items         ) {
        // Skip items without str property
        if (!item.str) continue;

        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
          pageText += '\n';
        } else if (pageText && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
          pageText += ' ';
        }
        pageText += item.str;
        lastY = item.transform[5];
      }

      // Clean up extra whitespace
      pageText = pageText.replace(/\s+/g, ' ').trim();

      if (pageText) {
        pages.push(`--- Page ${i} ---\n${pageText}`);
      }
      console.log(`[PDF Extraction] Page ${i} extracted text length: ${pageText.length} chars`);
    }

    const content = pages.join('\n\n');
    console.log(`[PDF Extraction] Total extraction complete: ${content.length} chars from ${totalTextItems} text items`);
    console.log(`[PDF Extraction] First 500 chars: ${content.substring(0, 500)}`);

    // Check if extraction yielded meaningful content - if not, fall back to image rendering
    if (content.length < 100) {
      console.log(`[PDF Extraction] Insufficient text (${content.length} chars). Falling back to image rendering...`);
      metadata.extractionMethod = 'image';

      const pageImages = await renderPdfPagesToImages(pdf);

      if (pageImages.length > 0) {
        console.log(`[PDF Extraction] Successfully rendered ${pageImages.length} page images`);
        metadata.warning = 'Text extraction failed - using image-based extraction';

        return {
          filename: file.name,
          fileType: 'pdf',
          content: `[PDF contains ${pdf.numPages} page(s) rendered as images for vision-based extraction]`,
          metadata,
          pageImages,
        };
      }
    }

    metadata.extractionMethod = 'text';

    return {
      filename: file.name,
      fileType: 'pdf',
      content,
      metadata,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[PDF Extraction] Failed for ${file.name}:`, err);

    return {
      filename: file.name,
      fileType: 'pdf',
      content: '',
      metadata,
      error: `PDF extraction failed: ${errorMessage}`,
    };
  }
}

/**
 * Render PDF pages to base64 PNG images using canvas
 */
async function renderPdfPagesToImages(pdf                           )                    {
  const images           = [];
  const scale = 2.0; // Higher scale for better readability

  for (let i = 1; i <= pdf.numPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });

      // Create canvas element
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        console.warn(`[PDF Rendering] Could not get canvas context for page ${i}`);
        continue;
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Render page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      // Convert canvas to base64 PNG (without the data:image/png;base64, prefix)
      const dataUrl = canvas.toDataURL('image/png');
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');

      images.push(base64Data);
      console.log(`[PDF Rendering] Page ${i} rendered: ${Math.round(base64Data.length / 1024)}KB`);

    } catch (err) {
      console.error(`[PDF Rendering] Failed to render page ${i}:`, err);
    }
  }

  return images;
}

/**
 * Extract text and tables from Excel/CSV
 */
async function extractFromExcel(file      )                             {
  const metadata                         = {};
  const allTables             = [];

  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    metadata.sheetCount = String(workbook.SheetNames.length);
    metadata.sheets = workbook.SheetNames.join(', ');

    const sheets           = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];

      // Get as array of arrays for table structure
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })              ;
      allTables.push(...data.filter(row => row.some(cell => cell !== '')));

      // Convert to readable text
      let sheetText = `### Sheet: ${sheetName} ###\n`;

      for (const row of data) {
        const nonEmptyCells = row.filter(cell => cell !== '');
        if (nonEmptyCells.length > 0) {
          sheetText += row.map(cell => String(cell).trim()).join(' | ') + '\n';
        }
      }

      sheets.push(sheetText);
    }

    return {
      filename: file.name,
      fileType: 'excel',
      content: sheets.join('\n\n'),
      metadata,
      tables: allTables,
    };
  } catch (err) {
    return {
      filename: file.name,
      fileType: 'excel',
      content: '',
      metadata,
      error: `Excel extraction failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

/**
 * Extract text from HTML with structure preservation
 */
async function extractFromHTML(file      )                             {
  const metadata                         = {};

  try {
    const htmlContent = await file.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // Extract title
    const title = doc.querySelector('title')?.textContent;
    if (title) metadata.title = title;

    // Remove script and style elements
    doc.querySelectorAll('script, style').forEach(el => el.remove());

    const sections           = [];

    // Extract structured data from tables (common in eCQM specs)
    const tables = doc.querySelectorAll('table');
    tables.forEach((table, idx) => {
      let tableText = `\n### Table ${idx + 1} ###\n`;
      const rows = table.querySelectorAll('tr');

      rows.forEach(row => {
        const cells           = [];
        row.querySelectorAll('th, td').forEach(cell => {
          const text = cell.textContent?.trim().replace(/\s+/g, ' ') || '';
          if (text) cells.push(text);
        });
        if (cells.length > 0) {
          tableText += cells.join(' | ') + '\n';
        }
      });

      sections.push(tableText);
    });

    // Extract headings and their content
    const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(heading => {
      const text = heading.textContent?.trim();
      if (text) {
        sections.push(`\n## ${text} ##`);
      }
    });

    // Extract pre-formatted content (often contains CQL or specifications)
    const preElements = doc.querySelectorAll('pre');
    preElements.forEach(pre => {
      const text = pre.textContent?.trim();
      if (text && text.length > 20) {
        sections.push(`\n\`\`\`\n${text}\n\`\`\``);
      }
    });

    // Get remaining body text
    const bodyText = doc.body?.textContent?.replace(/\s+/g, ' ').trim() || '';

    return {
      filename: file.name,
      fileType: 'html',
      content: sections.join('\n') + '\n\n### Full Text ###\n' + bodyText,
      metadata,
    };
  } catch (err) {
    return {
      filename: file.name,
      fileType: 'html',
      content: '',
      metadata,
      error: `HTML extraction failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

/**
 * Extract content from ZIP packages
 */
async function extractFromZIP(file      )                             {
  const metadata                         = {};

  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    const fileList = Object.keys(zip.files);
    metadata.fileCount = String(fileList.length);
    metadata.files = fileList.slice(0, 10).join(', ') + (fileList.length > 10 ? '...' : '');

    const contents           = [];

    // Process each file in the ZIP
    for (const filename of fileList) {
      const zipFile = zip.files[filename];
      if (zipFile.dir) continue;

      const ext = filename.split('.').pop()?.toLowerCase();

      // Only process text-based files
      if (['html', 'htm', 'xml', 'json', 'cql', 'txt', 'csv'].includes(ext || '')) {
        try {
          const content = await zipFile.async('string');

          if (ext === 'html' || ext === 'htm') {
            // Parse HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'text/html');
            doc.querySelectorAll('script, style').forEach(el => el.remove());

            // Extract tables for structured data
            const tables = doc.querySelectorAll('table');
            let htmlText = '';
            tables.forEach(table => {
              const rows = table.querySelectorAll('tr');
              rows.forEach(row => {
                const cells           = [];
                row.querySelectorAll('th, td').forEach(cell => {
                  const text = cell.textContent?.trim().replace(/\s+/g, ' ') || '';
                  if (text) cells.push(text);
                });
                if (cells.length > 0) {
                  htmlText += cells.join(' | ') + '\n';
                }
              });
            });

            // Also get pre elements (CQL code)
            doc.querySelectorAll('pre').forEach(pre => {
              const text = pre.textContent?.trim();
              if (text) htmlText += '\n```\n' + text + '\n```\n';
            });

            contents.push(`\n=== ${filename} ===\n${htmlText}`);
          } else {
            contents.push(`\n=== ${filename} ===\n${content.substring(0, 50000)}`);
          }
        } catch {
          // Skip files that can't be read as text
        }
      }
    }

    return {
      filename: file.name,
      fileType: 'zip',
      content: contents.join('\n\n'),
      metadata,
    };
  } catch (err) {
    return {
      filename: file.name,
      fileType: 'zip',
      content: '',
      metadata,
      error: `ZIP extraction failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

/**
 * Extract text from plain text files
 */
async function extractFromText(file      )                             {
  try {
    const content = await file.text();
    return {
      filename: file.name,
      fileType: getFileType(file.name),
      content,
      metadata: { size: String(content.length) },
    };
  } catch (err) {
    return {
      filename: file.name,
      fileType: getFileType(file.name),
      content: '',
      metadata: {},
      error: `Text extraction failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}
