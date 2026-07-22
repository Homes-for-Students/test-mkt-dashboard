interface ExportButtonGroupProps {
  onExportJpeg: () => void;
  onExportCsv: () => void;
  csvOnly?: boolean;
}

export default function ExportButtonGroup({ onExportJpeg, onExportCsv, csvOnly = false }: ExportButtonGroupProps) {
  return (
    <div className="flex items-center gap-1.5 export-ignore">
      <button
        onClick={onExportCsv}
        className="text-[10px] font-bold text-slate-500 hover:text-slate-700 uppercase px-2 py-1 bg-white hover:bg-slate-50 rounded border border-slate-200 transition-colors shadow-sm"
      >
        CSV
      </button>
      {!csvOnly && (
        <button
          onClick={onExportJpeg}
          className="text-[10px] font-bold text-slate-500 hover:text-slate-700 uppercase px-2 py-1 bg-white hover:bg-slate-50 rounded border border-slate-200 transition-colors shadow-sm"
        >
          JPG
        </button>
      )}
    </div>
  );
}
