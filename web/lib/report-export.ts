/**
 * Shared report export utilities for CSV/PDF downloads and date formatting.
 *
 * Used by manager reports, HR reports, and any page that needs export.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CSVColumn {
  key: string;
  label: string;
}

export interface PDFSection {
  title: string;
  columns: string[];
  rows: (string | number)[][];
}

// ─── CSV Export ──────────────────────────────────────────────────────────────

/**
 * Escape a single cell value for CSV.
 * Wraps in quotes if the value contains a comma, double-quote, or newline.
 * Internal double-quotes are doubled (RFC 4180).
 */
function escapeCSVCell(value: unknown): string {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Download data as a CSV file.
 * Properly escapes values containing commas, quotes, and newlines.
 *
 * @param data     Array of objects to export
 * @param filename Filename for the download (should end with .csv)
 * @param columns  Optional column definitions for header labels and key ordering.
 *                 If omitted, headers are derived from `Object.keys` of the first row.
 */
export function downloadCSV(
  data: Record<string, unknown>[],
  filename: string,
  columns?: CSVColumn[],
): void {
  if (data.length === 0) return;

  // Resolve column keys and header labels
  const resolvedColumns: CSVColumn[] = columns
    ? columns
    : Object.keys(data[0]).map((key) => ({ key, label: key }));

  const headerRow = resolvedColumns.map((c) => escapeCSVCell(c.label)).join(',');

  const bodyRows = data.map((row) =>
    resolvedColumns.map((c) => escapeCSVCell(row[c.key])).join(','),
  );

  // BOM (\uFEFF) for Excel UTF-8 compatibility
  const csvContent = '\uFEFF' + [headerRow, ...bodyRows].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Legacy overload: accepts headers + rows arrays (for backward compatibility
 * with the manager reports page pattern).
 */
export function downloadCSVLegacy(
  headers: string[],
  rows: (string | number)[][],
  filename: string,
): void {
  const headerRow = headers.map((h) => escapeCSVCell(h)).join(',');
  const bodyRows = rows.map((row) => row.map((cell) => escapeCSVCell(cell)).join(','));

  // BOM for Excel
  const csvContent = '\uFEFF' + [headerRow, ...bodyRows].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── PDF Export ──────────────────────────────────────────────────────────────

/**
 * Generate and download a PDF report using the browser's print functionality.
 * Creates a styled HTML document in a hidden iframe and triggers window.print().
 *
 * No external PDF library required — works in all modern browsers.
 *
 * @param title      Report title displayed at the top of the PDF
 * @param sections   Array of table sections to include
 * @param filename   Suggested filename (used in document title)
 * @param metadata   Optional metadata lines (e.g. date range, company name)
 */
export function downloadPDF(
  title: string,
  sections: PDFSection[],
  filename: string,
  metadata?: string[],
): void {
  const htmlSections = sections
    .map(
      (section) => `
    <div class="section">
      <h2>${escapeHtml(section.title)}</h2>
      <table>
        <thead>
          <tr>${section.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${section.rows
            .map(
              (row) => `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell ?? ''))}</td>`).join('')}</tr>`,
            )
            .join('')}
          ${section.rows.length === 0 ? `<tr><td colspan="${section.columns.length}" class="empty">No data</td></tr>` : ''}
        </tbody>
      </table>
    </div>`,
    )
    .join('');

  const metaHtml = metadata
    ? `<div class="meta">${metadata.map((m) => `<span>${escapeHtml(m)}</span>`).join(' &bull; ')}</div>`
    : '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${escapeHtml(filename)}</title>
  <style>
    @page { margin: 1.5cm; size: A4 landscape; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; padding: 20px; font-size: 11px; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    .meta { color: #666; font-size: 10px; margin-bottom: 20px; }
    .meta span { margin-right: 8px; }
    .section { margin-bottom: 24px; }
    .section h2 { font-size: 13px; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e5e5; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { text-align: left; padding: 6px 8px; background: #f5f5f5; border: 1px solid #e0e0e0; font-weight: 600; white-space: nowrap; }
    td { padding: 5px 8px; border: 1px solid #e0e0e0; }
    tr:nth-child(even) td { background: #fafafa; }
    .empty { text-align: center; color: #999; padding: 12px; }
    .footer { margin-top: 24px; text-align: center; color: #999; font-size: 9px; border-top: 1px solid #e5e5e5; padding-top: 8px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${metaHtml}
  ${htmlSections}
  <div class="footer">Generated on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} &bull; Continuum HR</div>
</body>
</html>`;

  // Use a hidden iframe to trigger print-to-PDF
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '-9999px';
  iframe.style.width = '0';
  iframe.style.height = '0';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    return;
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  // Wait for content to render then print
  setTimeout(() => {
    iframe.contentWindow?.print();
    // Clean up after a delay to allow print dialog to complete
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 250);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Date Formatting ─────────────────────────────────────────────────────────

/**
 * Format a date for report display.
 * Returns a human-readable string like "09 Mar 2026".
 */
export function formatReportDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '---';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
