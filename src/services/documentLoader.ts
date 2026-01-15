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

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ExtractedDocument {
  filename: string;
  fileType: string;
  content: string;
  metadata: Record<string, string>;
  tables?: string[][];
  error?: string;
}

export interface ExtractionResult {
  documents: ExtractedDocument[];
  combinedContent: string;
  errors: string[];
}

/**
 * Extract text content from multiple files
 */
export async function extractFromFiles(files: File[]): Promise<ExtractionResult> {
  const documents: ExtractedDocument[] = [];
  const errors: string[] = [];

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

  return { documents, combinedContent, errors };
}

/**
 * Extract text from a single file
 */
async function extractFromFile(file: File): Promise<ExtractedDocument> {
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
function getFileType(filename: string): string {
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
 */
async function extractFromPDF(file: File): Promise<ExtractedDocument> {
  const metadata: Record<string, string> = {};

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    metadata.pageCount = String(pdf.numPages);

    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      // Reconstruct text with proper spacing
      let lastY: number | null = null;
      let pageText = '';

      for (const item of textContent.items as any[]) {
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
          pageText += '\n';
        } else if (pageText && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
          pageText += ' ';
        }
        pageText += item.str;
        lastY = item.transform[5];
      }

      pages.push(`--- Page ${i} ---\n${pageText}`);
    }

    return {
      filename: file.name,
      fileType: 'pdf',
      content: pages.join('\n\n'),
      metadata,
    };
  } catch (err) {
    return {
      filename: file.name,
      fileType: 'pdf',
      content: '',
      metadata,
      error: `PDF extraction failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

/**
 * Extract text and tables from Excel/CSV
 */
async function extractFromExcel(file: File): Promise<ExtractedDocument> {
  const metadata: Record<string, string> = {};
  const allTables: string[][] = [];

  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    metadata.sheetCount = String(workbook.SheetNames.length);
    metadata.sheets = workbook.SheetNames.join(', ');

    const sheets: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];

      // Get as array of arrays for table structure
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as string[][];
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
async function extractFromHTML(file: File): Promise<ExtractedDocument> {
  const metadata: Record<string, string> = {};

  try {
    const htmlContent = await file.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // Extract title
    const title = doc.querySelector('title')?.textContent;
    if (title) metadata.title = title;

    // Remove script and style elements
    doc.querySelectorAll('script, style').forEach(el => el.remove());

    const sections: string[] = [];

    // Extract structured data from tables (common in eCQM specs)
    const tables = doc.querySelectorAll('table');
    tables.forEach((table, idx) => {
      let tableText = `\n### Table ${idx + 1} ###\n`;
      const rows = table.querySelectorAll('tr');

      rows.forEach(row => {
        const cells: string[] = [];
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
async function extractFromZIP(file: File): Promise<ExtractedDocument> {
  const metadata: Record<string, string> = {};

  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    const fileList = Object.keys(zip.files);
    metadata.fileCount = String(fileList.length);
    metadata.files = fileList.slice(0, 10).join(', ') + (fileList.length > 10 ? '...' : '');

    const contents: string[] = [];

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
                const cells: string[] = [];
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
async function extractFromText(file: File): Promise<ExtractedDocument> {
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
