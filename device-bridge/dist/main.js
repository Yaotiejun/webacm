import { WebSocketServer } from 'ws';
import net from 'node:net';
const PORT = Number(process.env.PORT ?? 9999);
function logError(err) {
    const e = err;
    if (e && e.code === 'EADDRINUSE') {
        console.error(`[device-bridge] 端口 ${PORT} 已被占用，请检查是否有旧的 device-bridge 或其他进程在监听该端口。`);
    }
    console.error('[device-bridge] server error', e);
}
const carveraWss = new WebSocketServer({ port: PORT, path: '/carvera' });
const gridbotWss = new WebSocketServer({ port: PORT, path: '/gridbot' });
carveraWss.on('error', logError);
gridbotWss.on('error', logError);
console.log(`[device-bridge] ws://localhost:${PORT}/carvera`);
console.log(`[device-bridge] ws://localhost:${PORT}/gridbot`);
process.on('uncaughtException', (err) => {
    console.error('[device-bridge] uncaughtException', err);
});
process.on('unhandledRejection', (err) => {
    console.error('[device-bridge] unhandledRejection', err);
});
async function shutdown(signal) {
    console.log(`[device-bridge] shutting down (${signal})...`);
    await Promise.all([
        new Promise((resolve) => carveraWss.close(() => resolve())),
        new Promise((resolve) => gridbotWss.close(() => resolve())),
    ]);
    console.log('[device-bridge] shutdown complete');
    process.exit(0);
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
let nextCarveraId = 1;
let nextGridbotId = 1;
function parseTcpTarget(envVar) {
    if (!envVar)
        return null;
    const [host, portStr] = envVar.split(':');
    const port = Number(portStr);
    if (!host || !Number.isFinite(port))
        return null;
    return { host, port };
}
function createTcpLineBackend(prefix, target, send, onState) {
    const socket = net.createConnection(target.port, target.host);
    socket.setEncoding('utf8');
    socket.on('connect', () => {
        console.log(`${prefix} tcp connected`, target);
        onState?.(true);
        send(`[bridge] tcp connected ${target.host}:${target.port}`);
    });
    socket.on('data', (chunk) => {
        const text = chunk;
        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        for (const line of lines) {
            send(line);
        }
    });
    socket.on('error', (err) => {
        console.error(`${prefix} tcp error`, err);
        send(`[bridge] tcp error: ${String(err)}`);
    });
    socket.on('close', () => {
        console.log(`${prefix} tcp closed`);
        onState?.(false);
        send('[bridge] tcp closed');
    });
    return {
        onClientLine(line) {
            if (!line)
                return;
            try {
                socket.write(`${line}\n`);
            }
            catch (e) {
                console.error(`${prefix} tcp write error`, e);
            }
        },
        dispose() {
            try {
                socket.end();
            }
            catch {
                // ignore
            }
        },
    };
}
const carveraConns = new Map();
const gridbotConns = new Map();
function logStats() {
    const carveraSummary = Array.from(carveraConns.values()).map((s) => `${s.prefix} backend=${s.backend} tcp=${s.tcpConnected} q=${s.maxQueueLen} enq=${s.enqueued} ack=${s.acked} drop=${s.dropped}`);
    const gridbotSummary = Array.from(gridbotConns.values()).map((s) => `${s.prefix} backend=${s.backend} tcp=${s.tcpConnected} cmds=${s.commands} m114=${s.m114} tempSets=${s.tempSets}`);
    console.log('[device-bridge] stats', {
        carvera: carveraSummary,
        gridbot: gridbotSummary,
    });
}
setInterval(logStats, 10000);
function createCarveraMockBackend(prefix, stats, send) {
    const pending = [];
    let t = 0;
    let alarmed = false;
    try {
        send("Grbl 1.1h ['$' for help]");
    }
    catch {
        // ignore
    }
    const posTimer = setInterval(() => {
        t += 1;
        const x = (Math.sin(t / 10) * 10).toFixed(3);
        const y = (Math.cos(t / 10) * 10).toFixed(3);
        const z = (Math.sin(t / 25) * 2).toFixed(3);
        try {
            send(`X${x} Y${y} Z${z}`);
        }
        catch {
            // ignore
        }
    }, 200);
    const ackTimer = setInterval(() => {
        if (!pending.length)
            return;
        const now = Date.now();
        const item = pending.shift();
        const waited = now - item.enqAt;
        if (waited > 2000) {
            console.warn(`${prefix} WARN: command waited ${waited}ms in queue`, item.cmd);
        }
        const cmd = item.cmd.trim();
        try {
            if (/^(\$|\?)\S+/i.test(cmd)) {
                send('error:2');
            }
            else if (!alarmed && /\$H\b/i.test(cmd)) {
                alarmed = true;
                send('ALARM:9');
            }
            else if (cmd === '?' || cmd.toLowerCase() === 'status') {
                send('<Idle|MPos:0.000,0.000,0.000|FS:0,0>');
                send('ok');
            }
            else if (cmd === '$$') {
                send('$0=10');
                send('$1=25');
                send('ok');
            }
            else {
                send('ok');
            }
            stats.acked += 1;
            console.log(`${prefix} ack`, item.cmd);
        }
        catch {
            // ignore
        }
    }, 50);
    return {
        onClientLine(line) {
            console.log(`${prefix} in`, line);
            if (!line)
                return;
            if (pending.length > 200) {
                stats.dropped += 1;
                console.log(`${prefix} queue full, dropping`, line);
                return;
            }
            pending.push({ cmd: line, enqAt: Date.now() });
            stats.enqueued += 1;
            if (pending.length > stats.maxQueueLen)
                stats.maxQueueLen = pending.length;
        },
        dispose() {
            clearInterval(posTimer);
            clearInterval(ackTimer);
        },
    };
}
function createGridbotMockBackend(prefix, stats, send) {
    let t = 0;
    let nozzleTarget = 210;
    let bedTarget = 60;
    const timer = setInterval(() => {
        t += 1;
        const nozzle = 200 + Math.sin(t / 20) * 5;
        const bed = 60;
        try {
            send(`ok T:${nozzle.toFixed(1)} /${nozzleTarget.toFixed(1)} B:${bed.toFixed(1)} /${bedTarget.toFixed(1)}`);
            send('X:0.00 Y:0.00 Z:0.00 E:0.00');
        }
        catch {
            // ignore
        }
    }, 1500);
    return {
        onClientLine(line) {
            if (!line)
                return;
            stats.commands += 1;
            console.log(`${prefix} in`, line);
            const m104 = line.match(/M104\s+S(\d+(?:\.\d+)?)/i);
            if (m104) {
                nozzleTarget = Number(m104[1]);
                stats.tempSets += 1;
            }
            const m140 = line.match(/M140\s+S(\d+(?:\.\d+)?)/i);
            if (m140) {
                bedTarget = Number(m140[1]);
                stats.tempSets += 1;
            }
            try {
                if (/^M114\b/i.test(line)) {
                    stats.m114 += 1;
                    send('X:0.00 Y:0.00 Z:0.00 E:0.00');
                    send('ok');
                    return;
                }
                if (/^M105\b/i.test(line)) {
                    send(`ok T:${nozzleTarget.toFixed(1)} /${nozzleTarget.toFixed(1)} B:${bedTarget.toFixed(1)} /${bedTarget.toFixed(1)}`);
                    return;
                }
                send('ok');
            }
            catch {
                // ignore
            }
        },
        dispose() {
            clearInterval(timer);
        },
    };
}
carveraWss.on('connection', (ws, req) => {
    const id = nextCarveraId++;
    const prefix = `[carvera#${id}]`;
    console.log(`${prefix} connected`, { url: req.url });
    const stats = {
        id,
        prefix,
        enqueued: 0,
        acked: 0,
        dropped: 0,
        maxQueueLen: 0,
        backend: 'mock',
        tcpConnected: false,
    };
    carveraConns.set(id, stats);
    const carveraBackendKind = process.env.CARVERA_BACKEND ?? 'mock';
    const carveraTcpTarget = parseTcpTarget(process.env.CARVERA_TCP);
    const backend = carveraBackendKind === 'tcp' && carveraTcpTarget
        ? (() => {
            stats.backend = 'tcp';
            return createTcpLineBackend(prefix, carveraTcpTarget, (line) => {
                ws.send(`${line}\n`);
            }, (connected) => {
                stats.tcpConnected = connected;
            });
        })()
        : (() => {
            stats.backend = 'mock';
            return createCarveraMockBackend(prefix, stats, (line) => {
                ws.send(`${line}\n`);
            });
        })();
    ws.on('message', (data) => {
        const text = typeof data === 'string' ? data : data.toString('utf8');
        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        for (const line of lines) {
            backend.onClientLine(line);
        }
    });
    ws.on('close', () => {
        backend.dispose();
        carveraConns.delete(id);
        console.log(`${prefix} disconnected`);
    });
});
gridbotWss.on('connection', (ws, req) => {
    const id = nextGridbotId++;
    const prefix = `[gridbot#${id}]`;
    console.log(`${prefix} connected`, { url: req.url });
    const stats = {
        id,
        prefix,
        commands: 0,
        m114: 0,
        tempSets: 0,
        backend: 'mock',
        tcpConnected: false,
    };
    gridbotConns.set(id, stats);
    const gridbotBackendKind = process.env.GRIDBOT_BACKEND ?? 'mock';
    const gridbotTcpTarget = parseTcpTarget(process.env.GRIDBOT_TCP);
    const backend = gridbotBackendKind === 'tcp' && gridbotTcpTarget
        ? (() => {
            stats.backend = 'tcp';
            return createTcpLineBackend(prefix, gridbotTcpTarget, (line) => {
                ws.send(`${line}\n`);
            }, (connected) => {
                stats.tcpConnected = connected;
            });
        })()
        : (() => {
            stats.backend = 'mock';
            return createGridbotMockBackend(prefix, stats, (line) => {
                ws.send(`${line}\n`);
            });
        })();
    ws.on('message', (data) => {
        const text = typeof data === 'string' ? data : data.toString('utf8');
        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        for (const line of lines) {
            backend.onClientLine(line);
        }
    });
    ws.on('close', () => {
        backend.dispose();
        gridbotConns.delete(id);
        console.log(`${prefix} disconnected`);
    });
});
