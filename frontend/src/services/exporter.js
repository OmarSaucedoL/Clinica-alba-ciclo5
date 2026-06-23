/**
 * Client-side premium HTML table exporter for Word (DOCX) and Excel (XLSX) compatibility.
 */

export const exportToExcel = (tableId, filename, reportTitle = "Reporte") => {
  const table = document.getElementById(tableId);
  if (!table) return;
  
  const html = table.outerHTML;
  const excelTemplate = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <style>
        table { border-collapse: collapse; width: 100%; font-family: sans-serif; }
        th { background-color: #148F77; color: white; font-weight: bold; border: 1px solid #ddd; padding: 10px; text-align: left; }
        td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .title-row { font-size: 16px; font-weight: bold; color: #2A5C4D; padding: 15px 0; }
        .meta-row { font-size: 11px; color: #666; padding-bottom: 15px; }
      </style>
    </head>
    <body>
      <table>
        <tr><td colspan="10" class="title-row">${reportTitle.toUpperCase()}</td></tr>
        <tr><td colspan="10" class="meta-row">Fecha de emisión: ${new Date().toLocaleDateString('es-BO')} | Generado por el Sistema Clínico Alba</td></tr>
      </table>
      ${html}
    </body>
    </html>
  `;
  
  const blob = new Blob(['\ufeff' + excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export const exportToWord = (tableId, filename, reportTitle = "Reporte") => {
  const table = document.getElementById(tableId);
  if (!table) return;
  
  const html = table.outerHTML;
  const wordTemplate = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: 'Arial', sans-serif; margin: 30px; line-height: 1.5; }
        h1 { color: #2A5C4D; text-align: center; font-size: 20px; text-transform: uppercase; margin-bottom: 5px; }
        .subtitle { text-align: center; color: #148F77; font-size: 12px; font-weight: bold; margin-bottom: 25px; }
        .meta-info { font-size: 10px; color: #666; text-align: right; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th { background-color: #148F77; color: white; font-weight: bold; border: 1px solid #ccc; padding: 10px; text-align: left; font-size: 11px; }
        td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 10px; color: #333; }
      </style>
    </head>
    <body>
      <h1>Clínica Odontológica Alba</h1>
      <div class="subtitle">${reportTitle}</div>
      <div class="meta-info">
        Generado el: ${new Date().toLocaleString('es-BO')}<br/>
        Reporte Oficial de Auditoría
      </div>
      ${html}
    </body>
    </html>
  `;
  
  const blob = new Blob(['\ufeff' + wordTemplate], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
