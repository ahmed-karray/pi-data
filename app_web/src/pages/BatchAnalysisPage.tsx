import { useMemo, useState, useEffect } from 'react';
import { detectionService } from '../services/api/detectionService';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../components/Toaster';
import LoadingSpinner from '../components/LoadingSpinner';
import { RecentDetection } from '../types';
import { Download, Upload } from 'lucide-react';

const expectedFeatures = ['Dur', 'TotPkts', 'TotBytes', 'Rate', 'Load', 'Loss', 'pLoss', 'TcpRtt'];

export default function BatchAnalysisPage() {
  const user = useAuthStore((state) => state.user);
  const [dataset, setDataset] = useState('eMBB');
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<RecentDetection[]>([]);
  const [loading, setLoading] = useState(false);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<any>(null);
  const [showDatasetList, setShowDatasetList] = useState(true);
  const toast = useToast();

  const canUpload = user?.role !== 'data_scientist';

  // Load available datasets on mount
  useEffect(() => {
    const loadDatasets = async () => {
      setLoading(true);
      try {
        const ds = await detectionService.listDatasets();
        setDatasets(ds);
      } catch (error) {
        toast('Error', 'Failed to load datasets', 'danger');
      } finally {
        setLoading(false);
      }
    };
    loadDatasets();
  }, []);

  // Load selected dataset details
  const handleSelectDataset = async (datasetName: string) => {
    setLoading(true);
    try {
      const data = await detectionService.getDatasetPreview(datasetName, 20);
      if (data) {
        setSelectedDataset(data);
        setShowDatasetList(false);
        toast('Success', `Loaded ${datasetName} dataset`, 'success');
      } else {
        toast('Error', `Failed to load ${datasetName}`, 'danger');
      }
    } catch (error) {
      toast('Error', 'Failed to load dataset', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    setLoading(true);
    try {
      const job = await detectionService.startBatchAnalysis(dataset);
      setJobId(job.job_id);
      setStatus('running');
      setProgress(20);
      const batch = await detectionService.getBatchStatus(job.job_id);
      setResults(batch.results);
      setStatus(batch.status);
      setProgress(batch.progress);
      toast('Batch upload complete', 'Results are ready for download.', 'success');
    } catch (error) {
      toast('Batch failed', 'Please retry the upload.', 'danger');
      setStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!jobId) return;
    const blob = await detectionService.exportBatch(jobId);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${jobId}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const resultsSummary = useMemo(() => `${results.length} result${results.length === 1 ? '' : 's'}`, [results]);

  if (showDatasetList) {
    return (
      <div className="space-y-8">
        <div className="rounded-3xl border border-slate-800 bg-white/5 p-6 shadow-soft">
          <h2 className="mb-6 text-2xl font-semibold text-[#13739f]">Available Datasets</h2>
          {loading ? (
            <LoadingSpinner />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(Array.isArray(datasets) ? datasets : Object.values(datasets)).map((ds: any) => (
                <button
                  key={ds.name}
                  onClick={() => handleSelectDataset(ds.name)}
                  className="rounded-3xl border border-slate-700 bg-slate-900/50 p-6 text-left transition hover:border-brand-500 hover:bg-slate-900/80"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{ds.name}</h3>
                      <p className="text-sm text-slate-400">{ds.filePath}</p>
                    </div>
                    <Download className="size-5 text-slate-500" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <button
          onClick={() => { setShowDatasetList(true); setSelectedDataset(null); }}
          className="mb-6 text-sm text-brand-500 hover:text-brand-400 transition"
        >
          ← Back to datasets
        </button>
      </div>

      {selectedDataset && (
        <div className="space-y-8">
          <div className="rounded-3xl border border-slate-800 bg-white/5 p-6 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-[#13739f]">{selectedDataset.name}</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {selectedDataset.rowCount} rows × {selectedDataset.columnCount} columns
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleUpload()}
                  className="flex items-center gap-2 rounded-3xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-400"
                >
                  <Upload className="size-4" /> Upload for Analysis
                </button>
              </div>
            </div>

            <div className="rounded-3xl bg-slate-950/80 p-5">
              <p className="mb-3 text-sm text-slate-400 font-semibold">Columns</p>
              <div className="flex flex-wrap gap-2">
                {selectedDataset.headers.map((header: string) => (
                  <span key={header} className="rounded-2xl bg-slate-900 px-3 py-1 text-xs uppercase tracking-[0.1em] text-slate-300">
                    {header}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-white/5 p-6 shadow-soft">
            <h3 className="mb-4 text-lg font-semibold text-[#13739f]">Preview (First 20 rows)</h3>
            <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/70">
              <table className="min-w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    {selectedDataset.headers.map((header: string) => (
                      <th key={header} className="px-4 py-3 font-semibold text-xs uppercase tracking-[0.1em]">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedDataset.rows.map((row: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-800 last:border-b-0 hover:bg-slate-950/60">
                      {selectedDataset.headers.map((header: string) => (
                        <td key={`${idx}-${header}`} className="px-4 py-3 text-xs">
                          {String(row[header]).substring(0, 30)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="rounded-3xl border border-slate-800 bg-white/5 p-6 shadow-soft">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[#13739f]">Batch Analysis</h2>
              <p className="mt-1 text-sm text-slate-400">Upload a CSV batch for bulk detection.</p>
            </div>
            <span className="rounded-2xl bg-slate-900 px-3 py-1 text-sm text-slate-300">{user?.role === 'data_scientist' ? 'Download only' : 'Upload allowed'}</span>
          </div>
          <select
            aria-label="Sélectionner un dataset"
            title="Sélectionner un dataset pour l'analyse batch"
            value={dataset}
            onChange={(event) => setDataset(event.target.value)}
            className="w-full rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-brand-400"
          >
            <option value="TON_IoT">TON_IoT</option>
            <option value="eMBB">eMBB</option>
            <option value="mMTC">mMTC</option>
            <option value="URLLC">URLLC</option>
          </select>
          {canUpload ? (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-700 bg-slate-950/80 p-8 text-center text-slate-400">
              <p className="mb-4 text-sm">Drag and drop your batch file here, or click to choose a file.</p>
              <button
                type="button"
                onClick={handleUpload}
                className="rounded-3xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-400"
              >
                Upload batch file
              </button>
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/80 p-8 text-center text-slate-400">
              <p>Batch upload is restricted. Request batch processing from an Analyst.</p>
            </div>
          )}
          <div className="mt-6 rounded-3xl bg-slate-950/80 p-5 text-sm text-slate-300">
            <p className="font-semibold text-white">Expected features</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {expectedFeatures.map((feature) => (
                <span key={feature} className="rounded-2xl bg-slate-900/80 px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-white/5 p-6 shadow-soft">
          <h3 className="text-lg font-semibold text-[#13739f]">Batch status</h3>
          <div className="mt-6 space-y-4">
            <div className="overflow-hidden rounded-3xl bg-slate-950/80 p-5">
              <p className="text-sm text-slate-400">Current job</p>
              <p className="mt-2 text-2xl font-semibold text-white">{jobId || 'No job yet'}</p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-900 progress-bar" style={{ '--progress': `${progress}%` } as React.CSSProperties}>
                <div className="h-full rounded-full bg-brand-500 transition-all duration-300 progress-bar-fill"></div>
              </div>
              <p className="mt-2 text-sm text-slate-400">Status: {status}</p>
            </div>
            <button
              type="button"
              onClick={handleExport}
              disabled={!results.length}
              className="inline-flex w-full items-center justify-center rounded-3xl bg-[#1565C0] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#125a9a] disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-white/5 p-6 shadow-soft">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#13739f]">Results</h3>
            <p className="text-sm text-slate-400">{resultsSummary}</p>
          </div>
          {loading ? <span className="text-sm text-slate-400">Loading...</span> : null}
        </div>
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/70">
            <table className="min-w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Flow ID</th>
                  <th className="px-4 py-3">Dataset</th>
                  <th className="px-4 py-3">Prediction</th>
                  <th className="px-4 py-3">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No results yet.</td>
                  </tr>
                ) : (
                  results.map((row) => (
                    <tr key={row.flowId} className="border-b border-slate-800 last:border-b-0 hover:bg-slate-950/60">
                      <td className="px-4 py-3">{row.timestamp}</td>
                      <td className="px-4 py-3">{row.flowId}</td>
                      <td className="px-4 py-3">{row.dataset}</td>
                      <td className="px-4 py-3">{row.prediction}</td>
                      <td className="px-4 py-3">{Math.round(row.confidence * 100)}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
