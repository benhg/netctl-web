import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { NewSessionForm } from './components/NewSessionForm';
import { CheckInForm } from './components/CheckInForm';
import { ParticipantList } from './components/ParticipantList';
import { LogEntryForm } from './components/LogEntryForm';
import { CommunicationLog } from './components/CommunicationLog';
import { ICS309Preview } from './components/ICS309Preview';
import { ExportButtons } from './components/ExportButtons';
import { useNetStore } from './stores/netStore';
import type { Participant } from './types';

function App() {
  const { session, reset } = useNetStore();
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isAccel = e.metaKey || e.ctrlKey;
      if (!isAccel) return;

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom((current) => Math.min(1.5, Math.round((current + 0.1) * 10) / 10));
      } else if (e.key === '-') {
        e.preventDefault();
        setZoom((current) => Math.max(0.8, Math.round((current - 0.1) * 10) / 10));
      } else if (e.key === '0') {
        e.preventDefault();
        setZoom(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const supportsZoom = typeof CSS !== 'undefined' && CSS.supports?.('zoom', '1');

  return (
    <div
      className="min-h-screen bg-slate-900 text-white"
      style={
        supportsZoom
          ? { zoom }
          : {
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: `${100 / zoom}%`,
              height: `${100 / zoom}%`,
            }
      }
    >
      <Header />

      {!session ? (
        <NewSessionForm />
      ) : (
        <div className="p-4">
          {/* Top toolbar */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  showPreview
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-white'
                }`}
              >
                {showPreview ? 'Hide Preview' : 'Show ICS 309 Preview'}
              </button>
              <ExportButtons />
            </div>
            {session.status === 'closed' && (
              <button
                onClick={reset}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
              >
                New Session
              </button>
            )}
          </div>

          {showPreview ? (
            <ICS309Preview />
          ) : (
            <div className="grid grid-cols-12 gap-4">
              {/* Left column - Forms */}
              <div className="col-span-4 space-y-4">
                <CheckInForm />
                <ParticipantList onSelectParticipant={setSelectedParticipant} />
              </div>

              {/* Right column - Log */}
              <div className="col-span-8 flex flex-col gap-4">
                <LogEntryForm
                  selectedParticipant={selectedParticipant}
                  onClear={() => setSelectedParticipant(null)}
                />
                <CommunicationLog />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
