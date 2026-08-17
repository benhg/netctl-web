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
      className="h-screen bg-slate-900 text-white flex flex-col overflow-hidden"
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
        <div className="flex min-h-0 flex-1 flex-col gap-[var(--panel-gap)] overflow-hidden p-[var(--panel-gap)]">
          {/* Toolbar: one thin strip, aligned with the panels below it. */}
          <div className="flex shrink-0 items-center justify-between gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`rounded px-2.5 py-1 text-xs transition-colors ${
                  showPreview
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-white hover:bg-slate-600'
                }`}
              >
                {showPreview ? 'Hide Preview' : 'ICS 309 Preview'}
              </button>
              <ExportButtons />
            </div>
            {session.status === 'closed' && (
              <button
                onClick={reset}
                className="rounded bg-slate-700 px-2.5 py-1 text-xs text-white transition-colors hover:bg-slate-600"
              >
                New Session
              </button>
            )}
          </div>

          {showPreview ? (
            <ICS309Preview />
          ) : (
            /*
             * Narrow or split-screen windows stack the columns; from lg up they
             * sit side by side. The left column is capped in rem from xl up so an
             * ultrawide gives its extra pixels to the log table instead of
             * stretching the check-in fields to absurd widths.
             */
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-[var(--panel-gap)] overflow-y-auto lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:overflow-hidden xl:grid-cols-[26rem_minmax(0,1fr)] 2xl:grid-cols-[30rem_minmax(0,1fr)]">
              {/*
               * Stacked below lg, each section keeps a usable minimum height and
               * the page scrolls, rather than splitting a short window into two
               * lists too small to read.
               */}
              {/* Left column - check-in and roster */}
              <div className="flex min-h-0 flex-col gap-[var(--panel-gap)] max-lg:min-h-[20rem]">
                <CheckInForm />
                <ParticipantList onSelectParticipant={setSelectedParticipant} />
              </div>

              {/* Right column - Log */}
              <div className="flex min-h-0 flex-col gap-[var(--panel-gap)] max-lg:min-h-[20rem]">
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
