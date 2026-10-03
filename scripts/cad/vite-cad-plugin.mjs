import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
export function localCadPlugin() {
  let active = false;
  return { name: 'local-cad-development', configureServer(server) {
    server.middlewares.use('/api/local-cad/decode', async (req, res) => {
      const reply = (status, value) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(value)); };
      const remote = req.socket.remoteAddress;
      if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote)) return reply(403, { error: 'DWG decoding is available on this computer only' });
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) return reply(403, { error: 'Cross-origin requests are not accepted' });
      if (req.method !== 'POST') return reply(405, { error: 'POST a local DWG file' });
      if (active) return reply(429, { error: 'Another drawing is decoding; retry when it completes' });
      const chunks = []; let size = 0;
      try {
        for await (const chunk of req) { size += chunk.length; if (size > 20 * 1024 * 1024) return reply(413, { error: 'Maximum DWG size is 20 MiB' }); chunks.push(chunk); }
        const bytes = Buffer.concat(chunks);
        if (!/^AC\d{4}$/.test(bytes.subarray(0, 6).toString('ascii'))) return reply(400, { error: 'File has no recognized DWG signature' });
        if (active) return reply(429, { error: 'Another drawing is decoding' });
        active = true;
        const child = spawn(process.execPath, [fileURLToPath(new URL('./decode-dwg.mjs', import.meta.url))], { stdio: ['pipe', 'pipe', 'pipe'] });
        let result = '', diagnostics = '', finished = false;
        const finish = (status, value) => { if (finished) return; finished = true; clearTimeout(timeout); active = false; reply(status, value); };
        const timeout = setTimeout(() => { child.kill(); finish(504, { error: 'DWG decode exceeded 60 seconds' }); }, 60000);
        child.stdout.on('data', chunk => { result += chunk; if (result.length > 100 * 1024 * 1024) { child.kill(); finish(413, { error: 'Decoded drawing exceeds the supported size' }); } });
        child.stderr.on('data', chunk => { if (diagnostics.length < 4000) diagnostics += chunk; });
        child.stdin.on('error', () => {});
        child.on('error', () => finish(500, { error: 'Could not start local decoder' }));
        child.on('close', code => {
          if (code !== 0) return finish(422, { error: 'DWG decoder failed; try a compatible DWG revision', diagnostics });
          try { finish(200, JSON.parse(result)); } catch { finish(422, { error: 'Decoder produced an invalid response' }); }
        });
        res.on('close', () => { if (!finished) { child.kill(); finished = true; clearTimeout(timeout); active = false; } });
        child.stdin.end(bytes);
      } catch { active = false; reply(400, { error: 'Could not read drawing bytes' }); }
    });
  } };
}
