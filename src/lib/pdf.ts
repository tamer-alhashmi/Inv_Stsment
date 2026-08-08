import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function downloadElementAsPdf(elementId: string, filename: string): Promise<void> {
  const el = document.getElementById(elementId);
  if (!el) throw new Error(`Element #${elementId} not found in DOM`);

  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    // Ignore external image errors gracefully
    onclone: (_doc, cloned) => {
      cloned.style.visibility = 'visible';
    },
  });

  const A4_WIDTH_MM = 210;
  const A4_HEIGHT_MM = 297;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const canvasWidthMm = A4_WIDTH_MM;
  const canvasHeightMm = (canvas.height / canvas.width) * canvasWidthMm;

  const imgData = canvas.toDataURL('image/jpeg', 0.97);

  let remainingHeight = canvasHeightMm;
  let offset = 0;
  let firstPage = true;

  while (remainingHeight > 0) {
    if (!firstPage) pdf.addPage();
    firstPage = false;

    pdf.addImage(imgData, 'JPEG', 0, -offset, canvasWidthMm, canvasHeightMm);
    offset += A4_HEIGHT_MM;
    remainingHeight -= A4_HEIGHT_MM;
  }

  pdf.save(filename);
}
