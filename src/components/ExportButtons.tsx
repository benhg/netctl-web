import { useNetStore } from '../stores/netStore';
import { generateICS309PDF } from '../lib/pdfExport';

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export function ExportButtons() {
  const { session, participants, logEntries, exportToCsv } = useNetStore();

  const handleExportCsv = async () => {
    if (!session) return;

    const csv = exportToCsv();
    const filename = `${session.name.replace(/\s+/g, '_')}_${new Date()
      .toISOString()
      .split('T')[0]}.csv`;

    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename);
  };

  const handleExportPdf = async () => {
    if (!session) return;

    try {
      const pdfBytes = await generateICS309PDF(session, participants, logEntries);
      const filename = `ICS309_${session.name.replace(/\s+/g, '_')}_${new Date()
        .toISOString()
        .split('T')[0]}.pdf`;
      downloadBlob(new Blob([pdfBytes], { type: 'application/pdf' }), filename);
    } catch (err) {
      console.error('PDF export failed:', err);
    }
  };

  if (!session) return null;

  return (
    <div className="flex gap-2">
      <button
        onClick={handleExportCsv}
        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
      >
        Export CSV
      </button>
      <button
        onClick={handleExportPdf}
        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
      >
        Export PDF
      </button>
    </div>
  );
}
