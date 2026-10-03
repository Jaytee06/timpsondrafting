import { useEffect, useRef, useState } from 'react';

type DropboxFile = { name: string; link: string; bytes: number; isDir: boolean };
type DropboxChooser = {
  isBrowserSupported: () => boolean;
  choose: (options: {
    linkType: 'direct'; multiselect: false; extensions: string[];
    success: (files: DropboxFile[]) => void; cancel: () => void;
  }) => void;
};

declare global {
  interface Window { Dropbox?: DropboxChooser }
}

let scriptPromise: Promise<DropboxChooser> | undefined;
function loadDropbox(key: string): Promise<DropboxChooser> {
  if (window.Dropbox) return Promise.resolve(window.Dropbox);
  if (!scriptPromise) {
    scriptPromise = new Promise<DropboxChooser>((resolve, reject) => {
      const script = document.createElement('script');
      script.id = 'dropboxjs';
      script.src = 'https://www.dropbox.com/static/api/2/dropins.js';
      script.dataset.appKey = key;
      script.onload = () => {
        if (window.Dropbox) resolve(window.Dropbox);
        else { script.remove(); reject(new Error('Dropbox did not initialize. Please retry.')); }
      };
      script.onerror = () => { script.remove(); reject(new Error('Dropbox could not load. Check your connection and retry.')); };
      document.head.appendChild(script);
    }).catch((error: unknown) => { scriptPromise = undefined; throw error; });
  }
  return scriptPromise;
}

export default function DropboxModelButton({ onFile, disabled = false }: {
  onFile: (file: File) => void | Promise<void>; disabled?: boolean;
}) {
  const key = import.meta.env.VITE_DROPBOX_APP_KEY?.trim();
  const [chooser, setChooser] = useState<DropboxChooser>();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const controller = useRef<AbortController>();

  useEffect(() => {
    let active = true;
    if (key) {
      setError('');
      void loadDropbox(key).then((api) => {
        if (active) {
          if (api.isBrowserSupported()) setChooser(api);
          else setError('This browser does not support Dropbox. Use Open from device.');
        }
      }).catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Dropbox could not load.');
      });
    }
    return () => { active = false; };
  }, [key, attempt]);

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => { if (disabled) controller.current?.abort(); }, [disabled]);

  const choose = () => {
    if (!chooser) return;
    setError('');
    setBusy(true);
    setStatus('Choose a GLB in Dropbox…');
    try {
      // Keep this synchronous with the click so browsers permit the popup.
      chooser.choose({
        linkType: 'direct', multiselect: false, extensions: ['.glb'],
        cancel: () => { setBusy(false); setStatus(''); },
        success: (files) => {
          void (async () => {
            try {
              const selected = files[0];
              if (!selected || selected.isDir || !selected.name.toLowerCase().endsWith('.glb')) {
                throw new Error('Choose a file ending in .glb.');
              }
              controller.current = new AbortController();
              const timeout = window.setTimeout(() => controller.current?.abort(), 120_000);
              try {
                setStatus(`Downloading ${selected.name}…`);
                const response = await fetch(selected.link, { signal: controller.current.signal, credentials: 'omit' });
                if (!response.ok) throw new Error('Dropbox could not download this file. Please select it again.');
                const blob = await response.blob();
                const header = new DataView(await blob.slice(0, 12).arrayBuffer());
                if (header.byteLength < 12 || header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2 || header.getUint32(8, true) !== blob.size) {
                  throw new Error('This file is not a valid GLB 2.0 model.');
                }
                setStatus(`Opening ${selected.name}…`);
                await onFile(new File([blob], selected.name, { type: 'model/gltf-binary' }));
              } finally { window.clearTimeout(timeout); }
            } catch (caught) {
              setError(caught instanceof Error && caught.name === 'AbortError'
                ? 'Download cancelled or timed out. Please try again.'
                : caught instanceof Error ? caught.message : 'The Dropbox model could not be opened.');
            } finally { setBusy(false); setStatus(''); }
          })();
        },
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Dropbox could not open. Allow popups and retry.');
      setBusy(false);
      setStatus('');
    }
  };

  return <div className="flex max-w-xs flex-col items-end gap-1">
    <button type="button" onClick={choose} disabled={disabled || busy || !chooser}
      className="rounded border border-white/20 px-4 py-3 font-semibold text-slate-200 hover:border-orange hover:text-white disabled:cursor-not-allowed disabled:opacity-50">
      {busy ? 'Loading from Dropbox…' : key && !chooser && !error ? 'Connecting to Dropbox…' : 'Open from Dropbox'}
    </button>
    {!key && <span className="text-right text-xs text-amber-300">Dropbox setup required: add VITE_DROPBOX_APP_KEY.</span>}
    {status && <span role="status" className="text-right text-xs text-slate-300">{status}</span>}
    {error && <div role="alert" className="text-right text-xs text-red-300">{error}
      {!chooser && key && <button type="button" className="ml-2 underline" onClick={() => setAttempt((value) => value + 1)}>Retry</button>}
    </div>}
  </div>;
}
