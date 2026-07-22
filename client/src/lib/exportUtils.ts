import { toJpeg } from 'html-to-image';

export const exportToJpeg = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }
  
  try {
    const filter = (node: HTMLElement) => {
      // Exclude elements with the 'export-ignore' class
      if (node.classList && node.classList.contains('export-ignore')) {
        return false;
      }
      return true;
    };

    const dataUrl = await toJpeg(element, { 
      quality: 0.95,
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      filter
    });
    const link = document.createElement('a');
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.jpeg`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Error exporting to JPEG:', error);
  }
};

export interface CsvMetadata {
  reportTitle: string;
  client?: string;
  brand?: string;
  properties?: string;
  timeRange?: string;
  summaryStats?: Record<string, string | number>;
}

export const exportToCsv = (data: Record<string, any>[], filename: string, metadata: CsvMetadata) => {
  if (!data || !data.length) return;

  // Filter out internal fields like color, fill, icon
  const filterKeys = (key: string) => !['color', 'fill', 'icon', 'id'].includes(key);
  const headers = Object.keys(data[0]).filter(filterKeys);
  
  const csvRows = [];

  // Add Metadata Header Block
  if (metadata.reportTitle) csvRows.push(`Report:, "${metadata.reportTitle}"`);
  if (metadata.client) csvRows.push(`Client:, "${metadata.client}"`);
  if (metadata.brand) csvRows.push(`Brand:, "${metadata.brand}"`);
  if (metadata.properties) csvRows.push(`Properties:, "${metadata.properties}"`);
  if (metadata.timeRange) csvRows.push(`Time Range:, "${metadata.timeRange}"`);
  
  // Add Summary Stats if present
  if (metadata.summaryStats) {
    csvRows.push('');
    csvRows.push(Object.keys(metadata.summaryStats).map(k => `"${k}"`).join(','));
    csvRows.push(Object.values(metadata.summaryStats).map(v => `"${v}"`).join(','));
  }

  // Blank line to separate metadata from data
  csvRows.push('');
  
  // Add data headers
  csvRows.push(headers.join(','));
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header] !== null && row[header] !== undefined ? row[header] : '';
      const escaped = String(val).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  
  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
