let wpRequire = webpackChunkdiscord_app.push([[Symbol()], {}, r => r]);
webpackChunkdiscord_app.pop();

let ApplicationStreamingStore = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.getStreamerActiveStreamMetadata)?.exports.Z;
let RunningGameStore = Object.values(wpRequire.c).find(x => x?.exports?.ZP?.getRunningGames)?.exports.ZP;
let QuestsStore = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.getQuest)?.exports.Z;
let ChannelStore = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.getAllThreadsForParent)?.exports.Z;
let GuildChannelStore = Object.values(wpRequire.c).find(x => x?.exports?.ZP?.getSFWDefaultChannel)?.exports.ZP;
let FluxDispatcher = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.flushWaitQueue)?.exports.Z;
let api = Object.values(wpRequire.c).find(x => x?.exports?.tn?.get)?.exports.tn;

if (!QuestsStore || !api) {
    console.error("QuestsStore or API not found!");
    throw new Error("Missing required dependencies");
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function getAvailableQuests() {
    return [...QuestsStore.quests.values()]
        .filter(q =>
            q.id !== "1248385850622869556" &&
            q.config &&
            q.config.expiresAt &&
            new Date(q.config.expiresAt).getTime() > Date.now() &&
            (!q.userStatus || !q.userStatus.completedAt)
        )
        .sort((a, b) => {
            const aTime = a.userStatus?.enrolledAt ? new Date(a.userStatus.enrolledAt).getTime() : 0;
            const bTime = b.userStatus?.enrolledAt ? new Date(b.userStatus.enrolledAt).getTime() : 0;
            return bTime - aTime;
        });
}

let quests = getAvailableQuests();
let isApp = typeof DiscordNative !== "undefined";

// --- UI Setup ---
const existing = document.getElementById('quest-overlay');
if (existing) existing.remove();

const appearBtn = document.createElement('button');
appearBtn.id = 'quest-appear-btn';
Object.assign(appearBtn.style, {
    position: 'fixed',
    right: '20px',
    bottom: '20px',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: '#5865F2',
    color: '#ffffff',
    border: 'none',
    cursor: 'pointer',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
    fontSize: '24px',
    zIndex: 999998,
    pointerEvents: 'auto'
});
appearBtn.innerHTML = '↖';
document.body.appendChild(appearBtn);

const overlay = document.createElement('div');
overlay.id = 'quest-overlay';
overlay.innerHTML = `
    <style>
        #quest-overlay {
            --bg-start: #202225;
            --bg-end: #181A1D;
            --text-color: #dcddde;
            --accent-color: #5865F2;
            position: fixed;
            right: 20px;
            bottom: 20px;
            width: 360px;
            min-width: 240px;
            min-height: 160px;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 999999;
            background: linear-gradient(180deg, var(--bg-start), var(--bg-end));
            color: var(--text-color);
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            padding: 12px;
            font-family: 'Whitney', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 13px;
            line-height: 1.4;
            resize: both;
            overflow: auto;
        }
        #quest-overlay-header {
            cursor: move;
            user-select: none;
            font-weight: 600;
            font-size: 15px;
            margin-bottom: 10px;
            color: #FFD700;
        }
        #quest-overlay select, #quest-overlay button, #quest-overlay input[type="color"] {
            background: #2F3136;
            color: var(--text-color);
            border: 1px solid #202225;
            border-radius: 6px;
            font-family: 'Whitney', sans-serif;
            font-size: 13px;
            padding: 8px;
        }
        #quest-overlay select { width: 100%; cursor: pointer; }
        #quest-overlay button { background: var(--accent-color); border: none; cursor: pointer; transition: background 0.2s; }
        #quest-overlay button:hover { background: #4752C4; }
        #quest-overlay button.secondary { background: #2F3136; }
        #quest-overlay button.secondary:hover { background: #3F4147; }
        #quest-progress-bar { height: 100%; width: 0%; transition: width 0.5s ease-in-out; background: linear-gradient(90deg, #5865F2, #7289DA); border-radius: 4px; }
        #quest-finish { color: #00FF00; font-weight: 600; }
        #quest-error, #quest-no-quests { color: #FF5555; font-size: 12px; }
        .muted { color:#9aa0a6; font-size:12px; }
    </style>
`;
overlay.appendChild(document.createElement('div'));

// Header
const header = document.createElement('div');
header.id = 'quest-overlay-header';
header.textContent = 'Aurox Assets 👑 Quest Spoofer';
overlay.appendChild(header);

const questSelectWrap = document.createElement('div');
questSelectWrap.style.marginBottom = '10px';
const questLabel = document.createElement('label');
questLabel.textContent = 'Select Quest:';
questLabel.style.display = 'block';
questLabel.style.marginBottom = '6px';
questLabel.style.fontWeight = '600';
questSelectWrap.appendChild(questLabel);

const questSelect = document.createElement('select');
questSelect.id = 'quest-select';
questSelectWrap.appendChild(questSelect);
overlay.appendChild(questSelectWrap);

// Color Customization
const colorWrap = document.createElement('div');
colorWrap.style.marginBottom = '10px';
colorWrap.innerHTML = `
    <label style="display:block;margin-bottom:6px;font-weight:500">Background Colors:</label>
    <div style="display:flex;gap:8px">
        <input type="color" id="bg-start" value="#202225" title="Start Gradient">
        <input type="color" id="bg-end" value="#181A1D" title="End Gradient">
    </div>
`;
overlay.appendChild(colorWrap);

// Details
const details = document.createElement('div');
details.innerHTML = `
    <div style="margin-bottom:6px"><strong>App:</strong> <span id="quest-appname">Select a quest</span></div>
    <div style="margin-bottom:6px"><strong>Task:</strong> <span id="quest-task">N/A</span></div>
    <div style="margin-bottom:8px" class="muted"><strong>Expires:</strong> <span id="quest-exp">N/A</span></div>
    <div id="quest-status" style="margin-bottom:8px" class="muted">Status: -</div>
    <div style="font-size:12px;display:none" id="quest-error"></div>
`;
overlay.appendChild(details);

// Progress
const progWrap = document.createElement('div');
progWrap.style.marginBottom = '10px';
const progressText = document.createElement('div');
progressText.id = 'quest-progress-text';
progressText.textContent = '0s / 0s (0%)';
progressText.style.fontSize = '13px';
progressText.style.marginBottom = '6px';
progWrap.appendChild(progressText);

const barBg = document.createElement('div');
barBg.style.height = '12px';
barBg.style.width = '100%';
barBg.style.background = '#202225';
barBg.style.borderRadius = '6px';
barBg.style.overflow = 'hidden';
const bar = document.createElement('div');
bar.id = 'quest-progress-bar';
barBg.appendChild(bar);
progWrap.appendChild(barBg);
overlay.appendChild(progWrap);

// Controls
const controls = document.createElement('div');
controls.style.display = 'flex';
controls.style.gap = '8px';
controls.style.marginBottom = '10px';

const enrollBtn = document.createElement('button');
enrollBtn.textContent = 'Enroll';
enrollBtn.className = 'secondary';
enrollBtn.style.flex = '1';
enrollBtn.disabled = true;

const startBtn = document.createElement('button');
startBtn.textContent = 'Start';
startBtn.style.flex = '1';
startBtn.disabled = true;

const hideBtn = document.createElement('button');
hideBtn.textContent = 'Hide';
hideBtn.className = 'secondary';
hideBtn.style.flex = '1';

const closeBtn = document.createElement('button');
closeBtn.textContent = 'Close';
closeBtn.className = 'secondary';
closeBtn.style.flex = '1';

controls.appendChild(enrollBtn);
controls.appendChild(startBtn);
controls.appendChild(hideBtn);
controls.appendChild(closeBtn);
overlay.appendChild(controls);

// Footer link
const discordLink = document.createElement('div');
discordLink.style.textAlign = 'center';
discordLink.style.fontSize = '12px';
discordLink.style.color = '#9aa0a6';
discordLink.innerHTML = `Join our server for updates: <a href="https://discord.gg/7zhG8UMhK6" target="_blank" style="color:#5865F2;text-decoration:none;font-weight:500">discord.gg/7zhG8UMhK6</a>`;
overlay.appendChild(discordLink);

document.body.appendChild(overlay);

// Dragging header
let isDragging = false;
let initialX = 0, initialY = 0, currentX = window.innerWidth - 360 - 20, currentY = 20;
header.addEventListener('mousedown', (e) => {
    isDragging = true;
    initialX = e.clientX - currentX;
    initialY = e.clientY - currentY;
    header.style.cursor = 'grabbing';
});
document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    currentX = e.clientX - initialX;
    currentY = e.clientY - initialY;
    overlay.style.right = 'auto';
    overlay.style.bottom = 'auto';
    overlay.style.left = `${Math.max(0, currentX)}px`;
    overlay.style.top = `${Math.max(0, currentY)}px`;
});
document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    header.style.cursor = 'move';
});

document.getElementById('bg-start').addEventListener('input', (e) => {
    overlay.style.setProperty('--bg-start', e.target.value);
});
document.getElementById('bg-end').addEventListener('input', (e) => {
    overlay.style.setProperty('--bg-end', e.target.value);
});

hideBtn.onclick = () => {
    overlay.style.display = 'none';
    appearBtn.style.display = 'flex';
    resetState();
    console.log('UI hidden');
};
appearBtn.onclick = () => {
    overlay.style.display = 'block';
    appearBtn.style.display = 'none';
    console.log('UI shown');
};

// --- UI State ---
let currentQuest = null;
let secondsDone = 0;
let secondsNeeded = 0;
let taskName = '';
let isRunning = false;
let timer = null;
let unsubscribe = null;
let pid = null;
let localTimer = null;

function updateUI() {
    const questData = currentQuest ? QuestsStore.getQuest(currentQuest.id) : null;
    const isCompleted = questData?.userStatus?.completedAt;
    const pct = secondsNeeded ? Math.min(100, Math.round((secondsDone / secondsNeeded) * 100)) : 0;
    bar.style.width = `${pct}%`;
    progressText.textContent = `${secondsDone}s / ${secondsNeeded}s (${pct}%)`;
    document.getElementById('quest-task').textContent = taskName ? taskName.replace('_', ' ') : 'N/A';
    document.getElementById('quest-appname').textContent = currentQuest ? (currentQuest.config.application?.name || 'Quest') : 'Select a quest';
    document.getElementById('quest-exp').textContent = currentQuest ? new Date(currentQuest.config.expiresAt).toLocaleString() : 'N/A';
    document.getElementById('quest-status').textContent = currentQuest ? (currentQuest.userStatus ? `Enrolled` : `Not enrolled`) : '-';
    const questFinish = document.getElementById('quest-finish');
    if (questFinish) questFinish.style.display = isCompleted ? 'block' : 'none';
}

function showError(msg) {
    const el = document.getElementById('quest-error');
    el.textContent = msg;
    el.style.display = 'block';
    startBtn.disabled = true;
    enrollBtn.disabled = true;
}

function syncProgress() {
    if (!currentQuest || !taskName) return;
    const q = QuestsStore.getQuest(currentQuest.id);
    if (!q || !q.userStatus) return;
    if (q.userStatus.progress?.[taskName]) {
        secondsDone = Math.floor(q.userStatus.progress[taskName].value || 0);
    } else if (q.userStatus.streamProgressSeconds && currentQuest.config.configVersion === 1) {
        secondsDone = Math.floor(q.userStatus.streamProgressSeconds || 0);
    }
    secondsNeeded = (currentQuest.config?.taskConfig?.tasks?.[taskName]?.target)
        || (currentQuest.config?.taskConfigV2?.tasks?.[taskName]?.target) || secondsNeeded || 0;
    updateUI();
}

function startLocalTimer() {
    if (localTimer) clearInterval(localTimer);
    localTimer = setInterval(() => {
        if (isRunning && secondsDone < secondsNeeded) {
            secondsDone++;
            updateUI();
        }
        if (secondsDone >= secondsNeeded) {
            clearInterval(localTimer);
            localTimer = null;
            startBtn.textContent = 'Completed ✅';
            startBtn.disabled = true;
            isRunning = false;
            syncProgress();
        }
    }, 1000);
}

function resetState() {
    if (timer) { clearInterval(timer); timer = null; }
    if (localTimer) { clearInterval(localTimer); localTimer = null; }
    if (unsubscribe) { 
        FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", unsubscribe); 
        unsubscribe = null; 
    }
    if (taskName === "PLAY_ON_DESKTOP" && pid) {
        try { 
            FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [], added: [], games: [] }); 
        } catch (e) {
            console.error('Error resetting game state:', e);
        }
    }
    if (taskName === "STREAM_ON_DESKTOP" && pid) {
        try { 
            ApplicationStreamingStore.getStreamerActiveStreamMetadata = realFunc; 
        } catch (e) {
            console.error('Error resetting stream state:', e);
        }
    }
    isRunning = false;
    startBtn.textContent = 'Start';
    startBtn.disabled = !(currentQuest && currentQuest.userStatus && taskName);
    enrollBtn.disabled = !!currentQuest?.userStatus;
    updateUI();
}

async function performEnroll(q) {
    if (!q) return false;
    try {
        const res = await api.post({ url: `/quests/${q.id}/enroll`, body: {} });
        console.log(`Enrolled in quest ${q.id}`);
        await sleep(800);
        quests = getAvailableQuests();
        return true;
    } catch (err) {
        console.error('Enroll failed', err);
        return false;
    }
}

async function startQuest() {
    if (!currentQuest) { showError("Please select a quest"); return; }
    if (!currentQuest.userStatus) { showError("Quest not enrolled. Press Enroll first."); return; }
    if (isRunning) return;
    isRunning = true;
    startBtn.textContent = 'Pause';
    pid = Math.floor(Math.random() * 30000) + 1000;
    startLocalTimer();

    const applicationId = currentQuest.config.application.id;
    const applicationName = currentQuest.config.application.name;

    if (taskName === "WATCH_VIDEO") {
        const maxFuture = 10, speed = 7, interval = 1;
        const enrolledAt = new Date(currentQuest.userStatus.enrolledAt).getTime();
        timer = setInterval(async () => {
            if (!isRunning) return;
            const maxAllowed = Math.floor((Date.now() - enrolledAt) / 1000) + maxFuture;
            const timestamp = secondsDone + speed;
            if (maxAllowed - secondsDone >= speed) {
                try {
                    const res = await api.post({ url: `/quests/${currentQuest.id}/video-progress`, body: { timestamp: Math.min(secondsNeeded, timestamp + Math.random()) } });
                    if (res?.body?.progress?.WATCH_VIDEO) {
                        secondsDone = Math.min(secondsNeeded, Math.max(secondsDone, Math.floor(res.body.progress.WATCH_VIDEO.value)));
                        updateUI();
                    }
                } catch (err) {
                    console.error(`Error updating video progress: ${err}`);
                    showError('Error updating video progress. See console.');
                    clearInterval(timer);
                }
            }
            if (secondsDone >= secondsNeeded) {
                clearInterval(timer);
                isRunning = false;
                startBtn.textContent = 'Completed ✅';
                startBtn.disabled = true;
                console.log("Quest completed!");
            }
        }, interval * 1000);
        console.log(`Spoofing video for ${applicationName}.`);
        return;
    }

    if (taskName === "PLAY_ON_DESKTOP") {
        if (!isApp) { showError("PLAY_ON_DESKTOP requires the Discord desktop app."); resetState(); return; }
        try {
            const res = await api.get({ url: `/applications/public?application_ids=${applicationId}` });
            const appData = res.body?.[0];
            if (!appData || !appData.executables) {
                showError("Failed to fetch application data or executables");
                resetState();
                return;
            }
            const exeName = appData.executables.find(x => x.os === "win32")?.name?.replace(">", "") || appData.name;
            const fakeGame = {
                cmdLine: `C:\\Program Files\\${appData.name}\\${exeName}`,
                exeName,
                exePath: `c:/program files/${appData.name.toLowerCase()}/${exeName}`,
                hidden: false,
                isLauncher: false,
                id: applicationId,
                name: appData.name,
                pid,
                pidPath: [pid],
                processName: appData.name,
                start: Date.now()
            };
            const realGames = RunningGameStore.getRunningGames();
            const realGetRunningGames = RunningGameStore.getRunningGames;
            const realGetGameForPID = RunningGameStore.getGameForPID;
            RunningGameStore.getRunningGames = () => [fakeGame];
            RunningGameStore.getGameForPID = (p) => p === pid ? fakeGame : null;
            FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: realGames, added: [fakeGame], games: [fakeGame] });

            unsubscribe = (data) => {
                if (!isRunning) return;
                const progress = currentQuest.config.configVersion === 1 ? data.userStatus?.streamProgressSeconds : Math.floor(data.userStatus?.progress?.PLAY_ON_DESKTOP?.value || 0);
                secondsDone = Math.min(secondsNeeded, Math.max(secondsDone, progress));
                console.log(`Quest progress: ${secondsDone}/${secondsNeeded}`);
                updateUI();
                if (progress >= secondsNeeded || QuestsStore.getQuest(currentQuest.id)?.userStatus?.completedAt) {
                    console.log("Quest completed!");
                    RunningGameStore.getRunningGames = realGetRunningGames;
                    RunningGameStore.getGameForPID = realGetGameForPID;
                    FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: [], games: [] });
                    FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", unsubscribe);
                    unsubscribe = null;
                    isRunning = false;
                    startBtn.textContent = 'Completed ✅';
                    startBtn.disabled = true;
                }
            };
            FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", unsubscribe);
            console.log(`Spoofed your game to ${applicationName}. Wait for ${Math.ceil((secondsNeeded - secondsDone) / 60)} more minutes.`);
        } catch (err) {
            console.error(`Error in PLAY_ON_DESKTOP: ${err}`);
            showError('PLAY_ON_DESKTOP setup failed. See console.');
            resetState();
        }
        return;
    }

    if (taskName === "STREAM_ON_DESKTOP") {
        if (!isApp) { showError("STREAM_ON_DESKTOP requires the Discord desktop app."); resetState(); return; }
        try {
            const realFunc = ApplicationStreamingStore.getStreamerActiveStreamMetadata;
            ApplicationStreamingStore.getStreamerActiveStreamMetadata = () => ({ id: applicationId, pid, sourceName: null });

            unsubscribe = (data) => {
                if (!isRunning) return;
                const progress = currentQuest.config.configVersion === 1 ? data.userStatus?.streamProgressSeconds : Math.floor(data.userStatus?.progress?.STREAM_ON_DESKTOP?.value || 0);
                secondsDone = Math.min(secondsNeeded, Math.max(secondsDone, progress));
                console.log(`Quest progress: ${secondsDone}/${secondsNeeded}`);
                updateUI();
                if (progress >= secondsNeeded || QuestsStore.getQuest(currentQuest.id)?.userStatus?.completedAt) {
                    console.log("Quest completed!");
                    ApplicationStreamingStore.getStreamerActiveStreamMetadata = realFunc;
                    FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", unsubscribe);
                    unsubscribe = null;
                    isRunning = false;
                    startBtn.textContent = 'Completed ✅';
                    startBtn.disabled = true;
                }
            };
            FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", unsubscribe);
            console.log(`Spoofed your stream to ${applicationName}. Stream any window in vc for ${Math.ceil((secondsNeeded - secondsDone) / 60)} more minutes.`);
            console.log("Remember that you need at least 1 other person to be in the vc!");
        } catch (err) {
            console.error(`Error in STREAM_ON_DESKTOP: ${err}`);
            showError('STREAM_ON_DESKTOP setup failed. See console.');
            resetState();
        }
        return;
    }

    if (taskName === "PLAY_ACTIVITY") {
        try {
            const channelId = ChannelStore.getSortedPrivateChannels()?.[0]?.id ?? Object.values(GuildChannelStore.getAllGuilds()).find(x => x && x.VOCAL?.length)?.VOCAL?.[0]?.channel?.id;
            if (!channelId) { showError("No suitable channel found for PLAY_ACTIVITY"); resetState(); return; }
            const streamKey = `call:${channelId}:1`;
            timer = setInterval(async () => {
                if (!isRunning) return;
                try {
                    const res = await api.post({ url: `/quests/${currentQuest.id}/heartbeat`, body: { stream_key: streamKey, terminal: false } });
                    if (res.body?.progress?.PLAY_ACTIVITY) {
                        secondsDone = Math.min(secondsNeeded, Math.max(secondsDone, Math.floor(res.body.progress.PLAY_ACTIVITY.value)));
                        console.log(`Quest progress: ${secondsDone}/${secondsNeeded}`);
                        updateUI();
                    }
                    if (secondsDone >= secondsNeeded || QuestsStore.getQuest(currentQuest.id)?.userStatus?.completedAt) {
                        await api.post({ url: `/quests/${currentQuest.id}/heartbeat`, body: { stream_key: streamKey, terminal: true } });
                        console.log("Quest completed!");
                        clearInterval(timer);
                        timer = null;
                        isRunning = false;
                        startBtn.textContent = 'Completed ✅';
                        startBtn.disabled = true;
                    }
                } catch (err) {
                    console.error(`Error in PLAY_ACTIVITY: ${err}`);
                    showError('Error during PLAY_ACTIVITY heartbeat. See console.');
                    resetState();
                }
            }, 20 * 1000);
            console.log(`Completing quest ${applicationName} - ${currentQuest.config.messages?.questName}`);
        } catch (err) {
            console.error(`Error in PLAY_ACTIVITY setup: ${err}`);
            showError('PLAY_ACTIVITY setup failed. See console.');
            resetState();
        }
        return;
    }
}

function rebuildQuestSelect() {
    quests = getAvailableQuests();
    questSelect.innerHTML = '';
    if (quests.length === 0) {
        const opt = document.createElement('option');
        opt.textContent = 'No available quests';
        opt.disabled = true;
        questSelect.appendChild(opt);
        startBtn.disabled = true;
        enrollBtn.disabled = true;
        currentQuest = null;
        updateUI();
        return;
    }
    quests.forEach((q, i) => {
        const opt = document.createElement('option');
        const enrolled = q.userStatus ? ' (Enrolled)' : ' (Not enrolled)';
        opt.value = i;
        opt.textContent = `${q.config.application?.name || q.id} - ${q.config.messages?.questName || 'Quest'}${enrolled}`;
        questSelect.appendChild(opt);
    });
    questSelect.selectedIndex = 0;
    handleQuestSelection();
}

async function handleQuestSelection() {
    resetState();
    const idx = questSelect.value;
    currentQuest = quests[idx];
    if (!currentQuest) { 
        startBtn.disabled = true; 
        enrollBtn.disabled = true; 
        updateUI(); 
        return; 
    }

    let taskConfig = currentQuest.config.taskConfig || currentQuest.config.taskConfigV2 || {};
    taskName = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY"].find(x => taskConfig.tasks?.[x] != null);
    secondsNeeded = taskConfig.tasks?.[taskName]?.target ?? 0;
    secondsDone = currentQuest.userStatus?.progress?.[taskName]?.value ?? 0;

    if (!taskConfig.tasks || !taskName) {
        showError("No valid task found for this quest.");
        startBtn.disabled = true;
        enrollBtn.disabled = true;
        return;
    }

    if (!currentQuest.userStatus) {
        enrollBtn.disabled = false;
        startBtn.disabled = true;
        document.getElementById('quest-status').textContent = 'Status: Not enrolled';
    } else {
        enrollBtn.disabled = true;
        startBtn.disabled = !taskName;
        document.getElementById('quest-status').textContent = 'Status: Enrolled';
        syncProgress();
    }

    updateUI();
}

questSelect.addEventListener('change', handleQuestSelection);

enrollBtn.onclick = async () => {
    if (!currentQuest) return;
    enrollBtn.disabled = true;
    document.getElementById('quest-status').textContent = 'Status: Enrolling...';
    const ok = await performEnroll(currentQuest);
    rebuildQuestSelect();
    const newIndex = quests.findIndex(q => q.id === currentQuest.id);
    if (newIndex >= 0) {
        questSelect.value = newIndex;
        await sleep(300);
        handleQuestSelection();
        startBtn.disabled = !(currentQuest.userStatus && taskName);
    } else {
        showError('Enrollment succeeded but quest not found in store.');
    }
};

startBtn.onclick = () => {
    if (isRunning) {
        resetState();
        console.log('Paused quest execution');
    } else {
        startQuest();
    }
};

hideBtn.onclick = () => { 
    overlay.style.display = 'none'; 
    appearBtn.style.display = 'flex'; 
    resetState(); 
};
closeBtn.onclick = () => { 
    resetState(); 
    overlay.remove(); 
    appearBtn.remove(); 
};

rebuildQuestSelect();
overlay.style.left = `${currentX}px`;
overlay.style.top = `${currentY}px`;
updateUI();

console.log('Quest helper ready. Select a quest, enroll if needed, then press Start.');
