import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

/**
 * Export chart as PNG image
 */
export const exportChartAsImage = async (chartElement: HTMLElement, filename: string) => {
  try {
    const canvas = await html2canvas(chartElement, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
    });
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${filename}.png`;
    link.click();
  } catch (error) {
    console.error('Error exporting chart as image:', error);
    throw error;
  }
};

/**
 * Export chart as PDF
 */
export const exportChartAsPDF = async (
  chartElement: HTMLElement,
  filename: string,
  title: string = ''
) => {
  try {
    const canvas = await html2canvas(chartElement, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
    });

    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const availWidth = pdfWidth - 2 * margin;
    const availHeight = pdfHeight - 2 * margin;

    let height = (canvas.height * availWidth) / canvas.width;

    if (title) {
      pdf.setFontSize(16);
      pdf.text(title, margin, margin + 5);
      height = Math.min(height, availHeight - 15);
      pdf.addImage(imgData, 'PNG', margin, margin + 15, availWidth, height);
    } else {
      height = Math.min(height, availHeight);
      pdf.addImage(imgData, 'PNG', margin, margin, availWidth, height);
    }

    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Error exporting chart as PDF:', error);
    throw error;
  }
};

/**
 * Export data as CSV
 */
export const exportDataAsCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma or newline
          if (typeof value === 'string' && (value.includes(',') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};

/**
 * Export data as Excel
 */
export const exportDataAsExcel = (data: any[], filename: string, sheetName: string = 'Data') => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Auto-size columns
  const colWidths = Object.keys(data[0]).map((key) => {
    const maxLength = Math.max(
      key.length,
      ...data.map((row) => String(row[key] || '').length)
    );
    return { wch: Math.min(maxLength + 2, 50) };
  });
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

/**
 * Export data as JSON
 */
export const exportDataAsJSON = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
};

/**
 * Export multiple datasets in comparison format
 */
export const exportComparisonAsExcel = (
  datasets: { name: string; data: any[] }[],
  filename: string
) => {
  const workbook = XLSX.utils.book_new();

  datasets.forEach(({ name, data }) => {
    if (data && data.length > 0) {
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, name);
    }
  });

  XLSX.writeFile(workbook, `${filename}.xlsx`);
};
