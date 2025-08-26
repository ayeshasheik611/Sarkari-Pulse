// Chart export utilities for PNG and SVG formats
import html2canvas from 'html2canvas';

export interface ExportOptions {
  filename?: string;
  format?: 'png' | 'svg' | 'pdf';
  quality?: number;
  width?: number;
  height?: number;
}

export class ChartExporter {
  static async exportChart(
    elementId: string, 
    options: ExportOptions = {}
  ): Promise<void> {
    const {
      filename = `chart-${Date.now()}`,
      format = 'png',
      quality = 2.0, // Higher quality by default
      width,
      height
    } = options;

    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    // Prepare element for export
    this.prepareChartForExport(elementId);

    try {
      // Add timestamp to filename
      const timestamp = new Date().toISOString().split('T')[0];
      const finalFilename = `${filename}-${timestamp}`;

      switch (format) {
        case 'png':
          await this.exportAsPNG(element, finalFilename, quality, width, height);
          break;
        case 'svg':
          await this.exportAsSVG(element, finalFilename);
          break;
        case 'pdf':
          await this.exportAsPDF(element, finalFilename);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      console.error('Error exporting chart:', error);
      throw error;
    } finally {
      // Always restore the element
      this.restoreChartAfterExport(elementId);
    }
  }

  // Export multiple charts at once
  static async exportMultipleCharts(
    elementIds: string[], 
    options: ExportOptions & { combinedFilename?: string } = {}
  ): Promise<void> {
    const { combinedFilename = 'dashboard-charts', ...exportOptions } = options;

    try {
      for (let i = 0; i < elementIds.length; i++) {
        const id = elementIds[i];
        await this.exportChart(id, {
          ...exportOptions,
          filename: `${combinedFilename}-${i + 1}`
        });
        
        // Small delay between exports to prevent conflicts
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      console.log(`Successfully exported ${elementIds.length} charts`);
    } catch (error) {
      console.error('Error exporting multiple charts:', error);
      throw error;
    }
  }

  private static async exportAsPNG(
    element: HTMLElement,
    filename: string,
    quality: number,
    width?: number,
    height?: number
  ): Promise<void> {
    // Wait for any animations to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: quality,
      width: width || element.offsetWidth,
      height: height || element.offsetHeight,
      useCORS: true,
      allowTaint: true,
      logging: false,
      onclone: (clonedDoc: Document) => {
        // Ensure styles are applied in cloned document
        const clonedElement = clonedDoc.querySelector(`#${element.id}`) as HTMLElement;
        if (clonedElement) {
          clonedElement.style.backgroundColor = '#ffffff';
          clonedElement.style.padding = '20px';
          clonedElement.style.borderRadius = '8px';
          clonedElement.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
        }
      }
    });

    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private static async exportAsSVG(
    element: HTMLElement,
    filename: string
  ): Promise<void> {
    // Find SVG elements within the chart container
    const svgElements = element.querySelectorAll('svg');
    if (svgElements.length === 0) {
      throw new Error('No SVG elements found in the chart');
    }

    // Export the first SVG (main chart)
    const svg = svgElements[0];
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.download = `${filename}.svg`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  private static async exportAsPDF(
    element: HTMLElement,
    filename: string
  ): Promise<void> {
    // This would require a PDF library like jsPDF
    // For now, we'll export as PNG and let the user convert if needed
    console.warn('PDF export not implemented, exporting as PNG instead');
    await this.exportAsPNG(element, filename, 1.0);
  }

  // Utility method to prepare chart for export (add white background, etc.)
  static prepareChartForExport(elementId: string): void {
    const element = document.getElementById(elementId);
    if (element) {
      // Store original styles
      const originalStyles = {
        backgroundColor: element.style.backgroundColor,
        padding: element.style.padding,
        borderRadius: element.style.borderRadius,
        boxShadow: element.style.boxShadow,
        border: element.style.border
      };
      
      // Store for restoration
      (element as any)._originalStyles = originalStyles;
      
      // Apply export styling
      element.style.backgroundColor = '#ffffff';
      element.style.padding = '20px';
      element.style.borderRadius = '8px';
      element.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
      element.style.border = '1px solid #e5e7eb';
    }
  }

  // Utility method to restore chart after export
  static restoreChartAfterExport(elementId: string): void {
    const element = document.getElementById(elementId);
    if (element && (element as any)._originalStyles) {
      const originalStyles = (element as any)._originalStyles;
      
      // Restore original styles
      element.style.backgroundColor = originalStyles.backgroundColor;
      element.style.padding = originalStyles.padding;
      element.style.borderRadius = originalStyles.borderRadius;
      element.style.boxShadow = originalStyles.boxShadow;
      element.style.border = originalStyles.border;
      
      // Clean up stored styles
      delete (element as any)._originalStyles;
    }
  }

  // Export all visible charts on the page
  static async exportAllVisibleCharts(options: ExportOptions = {}): Promise<void> {
    const chartElements = document.querySelectorAll('[id*="chart"]');
    const chartIds = Array.from(chartElements)
      .map(el => el.id)
      .filter(id => id && id.includes('chart'));

    if (chartIds.length === 0) {
      console.warn('No charts found to export');
      return;
    }

    await this.exportMultipleCharts(chartIds, {
      ...options,
      combinedFilename: 'global-insights-charts'
    });
  }
}

// Data export utilities
export class DataExporter {
  static exportToCSV(data: any[], filename: string): void {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle values that might contain commas or quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.download = `${filename}.csv`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  static exportToJSON(data: any[], filename: string): void {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.download = `${filename}.json`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  static exportToExcel(data: any[], filename: string): void {
    // This would require a library like xlsx
    console.warn('Excel export not implemented, exporting as CSV instead');
    this.exportToCSV(data, filename);
  }
}

// Chart configuration utilities
export const chartThemes = {
  default: {
    backgroundColor: '#ffffff',
    textColor: '#374151',
    gridColor: '#e5e7eb',
    colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
  },
  dark: {
    backgroundColor: '#1f2937',
    textColor: '#f9fafb',
    gridColor: '#374151',
    colors: ['#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA']
  },
  print: {
    backgroundColor: '#ffffff',
    textColor: '#000000',
    gridColor: '#cccccc',
    colors: ['#000000', '#666666', '#999999', '#cccccc', '#333333']
  }
};

export const getResponsiveChartConfig = (containerWidth: number) => {
  if (containerWidth < 640) {
    return {
      fontSize: 10,
      margin: { top: 10, right: 10, bottom: 20, left: 20 },
      legendPosition: 'bottom'
    };
  } else if (containerWidth < 1024) {
    return {
      fontSize: 12,
      margin: { top: 20, right: 20, bottom: 30, left: 30 },
      legendPosition: 'right'
    };
  } else {
    return {
      fontSize: 14,
      margin: { top: 20, right: 30, bottom: 40, left: 40 },
      legendPosition: 'right'
    };
  }
};