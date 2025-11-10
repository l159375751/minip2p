import { subscribeDiagnostics } from '@/state/diagnostics';

const LOG_LIMIT = 5;

const LEVEL_LABELS = {
  info: 'info',
  warn: 'warn',
  error: 'error',
};

function formatTimestamp(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function renderLog(entry) {
  const level = LEVEL_LABELS[entry.level] || LEVEL_LABELS.info;
  return `
    <li class="diagnostics-log__entry diagnostics-log__entry--${level}">
      <span class="diagnostics-log__meta">
        <strong>${entry.source}</strong>
        <span>${formatTimestamp(entry.timestamp)}</span>
      </span>
      <p>${entry.message}</p>
    </li>
  `;
}

export function mountDiagnosticsPanel(container) {
  if (!container) return () => {};

  const unsubscribe = subscribeDiagnostics((snapshot) => {
    const { responder, relay, logs } = snapshot;
    const logEntries = logs.slice(0, LOG_LIMIT);
    container.innerHTML = `
      <div class="diagnostics-status">
        <div>
          <strong>Relay</strong>
          <span>${relay.status}${relay.url ? ` · ${relay.url}` : ''}</span>
        </div>
        <div>
          <strong>Responder</strong>
          <span>${responder.enabled ? 'Answering' : 'Paused'} · ${responder.served} sent</span>
        </div>
      </div>
      <ul class="diagnostics-log">
        ${logEntries.length ? logEntries.map(renderLog).join('') : '<li class="diagnostics-log__empty">No diagnostic events yet.</li>'}
      </ul>
    `;
  });

  return () => {
    unsubscribe();
    container.innerHTML = '';
  };
}
