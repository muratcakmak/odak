#!/usr/bin/env bun
import { spawn, spawnSync } from "bun";
import os from "node:os";

// ---- CONFIGURATION ----
const CMD = (process.env.CMD || "bunx expo run:ios").split(" ");

const CHECKPOINTS = [
    { label: "PRE-BUILD PHASE", matcher: /Run.*npx expo prebuild/i },
    { label: "POD INSTALL START", matcher: /Installing pods/i },
    { label: "POD INSTALL FINISH", matcher: /Pod installation complete/i },
    { label: "NATIVE BUILD START", matcher: /Building the app/i },
    { label: "NATIVE BUILD FINISH", matcher: /Build Succeeded/i },
    { label: "METRO READY", matcher: /Waiting on .*8081/i },
    { label: "JS BUNDLED", matcher: /Bundled .*ms/i },
];

// ---- SYSTEM INFO HELPERS ----
interface HardwareInfo {
    os: string;
    cpu: string;
    ram: string;
    power: string;
    thermal: string;
}

function getHardwareInfo(): HardwareInfo {
    const info: Partial<HardwareInfo> = {};

    // 1. macOS Version
    const swVers = spawnSync(["sw_vers", "-productVersion"]);
    info.os = `macOS ${swVers.stdout.toString().trim()}`;

    // 2. Chip / CPU
    // sysctl gives the clean marketing name (e.g. "Apple M1 Pro")
    const cpuBrand = spawnSync(["sysctl", "-n", "machdep.cpu.brand_string"]);
    info.cpu = cpuBrand.stdout.toString().trim() || os.cpus()[0].model;

    // 3. Memory (GB)
    const totalMem = os.totalmem() / (1024 ** 3);
    info.ram = `${Math.round(totalMem)} GB`;

    // 4. Battery / Power Status
    // pmset -g batt returns info like " -InternalBattery-0... 86%; discharging;"
    const pmset = spawnSync(["pmset", "-g", "batt"]);
    const powerOut = pmset.stdout.toString();

    const isCharging = powerOut.includes("AC Power");
    const levelMatch = powerOut.match(/(\d+)%/);
    const level = levelMatch ? `${levelMatch[1]}%` : "Unknown";

    // Detect thermal pressure (optional but cool for benchmarks)
    const thermal = spawnSync(["sysctl", "-n", "kern.thermal_level"]); // 0 = cool, >0 = throttling
    const thermalLevel = parseInt(thermal.stdout.toString().trim() || "0");

    info.power = `${level} (${isCharging ? "🔌 Plugged In" : "🔋 On Battery"})`;
    info.thermal = thermalLevel > 0 ? `⚠️ Throttling (Level ${thermalLevel})` : "Normal";

    return info as HardwareInfo;
}

// ---- MAIN ----
console.clear();
const sys = getHardwareInfo();

console.log(`\n💻 \x1b[1mBENCHMARK CONTEXT\x1b[0m`);
console.log("-".repeat(50));
console.log(`Device:  ${sys.cpu} / ${sys.ram}`);
console.log(`OS:      ${sys.os}`);
console.log(`Power:   ${sys.power}`);
console.log(`Thermal: ${sys.thermal}`);
console.log("-".repeat(50));
console.log(`\n🚀 CMD: \x1b[36m${CMD.join(" ")}\x1b[0m\n`);

// ---- BENCHMARK STATE ----
const globalStart = performance.now();
let lastCheckpointTime = globalStart;
let lastCheckpointName = "START";

const summary: { stage: string; duration: number }[] = [];

// ---- PROCESS EXECUTION ----
const proc = spawn(CMD, {
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, CI: "1" } // CI=1 often cleans up output
});

async function monitor(stream: ReadableStream) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
            if (!line.trim()) continue;

            // Check Checkpoints
            const hit = CHECKPOINTS.find(c => c.matcher.test(line));

            if (hit) {
                const now = performance.now();
                const duration = now - lastCheckpointTime;

                printCheckpoint(lastCheckpointName, hit.label, duration);

                summary.push({
                    stage: `${lastCheckpointName} -> ${hit.label}`,
                    duration
                });

                lastCheckpointTime = now;
                lastCheckpointName = hit.label;
            }
        }
    }
}

function printCheckpoint(from: string, to: string, ms: number) {
    const sec = (ms / 1000).toFixed(2);
    // Colorize: Green < 5s, Yellow < 20s, Red > 20s
    let color = "\x1b[32m";
    if (ms > 20000) color = "\x1b[31m";
    else if (ms > 5000) color = "\x1b[33m";

    console.log(
        `⏱  ${color}${sec}s\x1b[0m  ` +
        `\x1b[2m${from.padEnd(20)}\x1b[0m ` +
        `👉  ` +
        `\x1b[1m${to}\x1b[0m`
    );
}

// Run listeners
await Promise.all([monitor(proc.stdout), monitor(proc.stderr)]);

// ---- RESULTS ----
const totalTime = (performance.now() - globalStart) / 1000;
console.log("\n" + "=".repeat(50));
console.log(`🏁 TOTAL TIME: ${totalTime.toFixed(2)}s`);
console.log("=".repeat(50));

if (summary.length) {
    const slowest = summary.sort((a, b) => b.duration - a.duration)[0];
    console.log(`🐌 SLOWEST STEP: "${slowest.stage}" (${(slowest.duration / 1000).toFixed(2)}s)`);
} else {
    console.log("⚠️  No milestones found. (Did the build fail?)");
}