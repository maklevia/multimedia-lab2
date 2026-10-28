import NoticeToast from "./components/feedback/NoticeToast";
import WarningStrip from "./components/feedback/WarningStrip";
import Transport from "./components/controls/Transport";
import MappingInfo from "./components/controls/MappingInfo";
import Header from "./components/layout/Header";
import DataPanel from "./components/panels/DataPanel";
import MappingPanel from "./components/panels/MappingPanel";
import DataChart from "./components/visualizations/DataChart";
import DataTable from "./components/visualizations/DataTable";
import PianoRoll from "./components/visualizations/PianoRoll";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useSonification } from "./hooks/useSonification";

export default function App() {
  const sonification = useSonification();
  const { dataset, config, result, playback } = sonification;

  useKeyboardShortcuts({
    isPlaying: playback.isPlaying,
    onPlay: sonification.play,
    onStop: playback.stop,
    onExport: sonification.exportMidi,
  });

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <Header
        datasetName={dataset.name}
        canExport={sonification.canUseMidi}
        onExportMidi={sonification.exportMidi}
      />

      <main className="app-main">
        <aside className="sidebar" aria-label="Configuration">
          <DataPanel
            dataset={dataset}
            activeSampleId={sonification.activeSampleId}
            onLoadSample={sonification.loadSample}
            onFile={sonification.importFile}
            onDownloadSample={sonification.downloadSample}
          />
          <MappingPanel
            dataset={dataset}
            config={config}
            preset={sonification.preset}
            onAssign={sonification.assignIndicator}
            onApplyPreset={sonification.applyPreset}
            onSelectCustom={sonification.selectCustomPreset}
          />
        </aside>

        <section className="workspace" aria-label="Sonification workspace">
          <WarningStrip warnings={result.warnings} />

          <DataChart
            dataset={dataset}
            result={result}
            config={config}
            activeRow={sonification.activeRow}
            onActiveRow={sonification.setActiveRow}
            progress={playback.progress}
          />

          <Transport
            isPlaying={playback.isPlaying}
            progress={playback.progress}
            duration={sonification.duration}
            volume={playback.volume}
            bpm={config.bpm}
            canPlay={sonification.canUseMidi}
            onPlay={() => {
              void sonification.play();
            }}
            onStop={playback.stop}
            onVolume={playback.setVolume}
          />

          <PianoRoll
            notes={result.notes}
            totalTicks={result.totalTicks}
            ppq={config.ppq}
            activeRow={sonification.activeRow}
            onActiveRow={sonification.setActiveRow}
            progress={playback.progress}
          />

          <DataTable
            dataset={dataset}
            result={result}
            ppq={config.ppq}
            activeRow={sonification.activeRow}
            onActiveRow={sonification.setActiveRow}
          />

          <MappingInfo dataset={dataset} config={config} result={result} />
        </section>
      </main>

      <NoticeToast
        notice={sonification.notice}
        onDismiss={sonification.dismissNotice}
      />
    </div>
  );
}
