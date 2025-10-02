(async () => {
    // --- Script Logic ---
    let wpRequire = webpackChunkdiscord_app.push([[Symbol()], {}, r => r]);
    webpackChunkdiscord_app.pop();

    let ApplicationStreamingStore = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.getStreamerActiveStreamMetadata).exports.Z;
    let RunningGameStore = Object.values(wpRequire.c).find(x => x?.exports?.ZP?.getRunningGames).exports.ZP;
    let QuestsStore = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.getQuest).exports.Z;
    let ChannelStore = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.getAllThreadsForParent).exports.Z;
    let GuildChannelStore = Object.values(wpRequire.c).find(x => x?.exports?.ZP?.getSFWDefaultChannel).exports.ZP;
    let FluxDispatcher = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.flushWaitQueue).exports.Z;
    let api = Object.values(wpRequire.c).find(x => x?.exports?.tn?.get).exports.tn;

    let quests = [...QuestsStore.quests.values()]
        .filter(q => q.userStatus && !q.userStatus.completedAt && q.id !== "1248385850622869556" && new Date(q.config.expiresAt).getTime() > Date.now())
        .sort((a, b) => new Date(b.userStatus.enrolledAt).getTime() - new Date(a.userStatus.enrolledAt).getTime());
    let isApp = typeof DiscordNative !== "undefined";

    if (quests.length === 0) {
        const allQuests = [...QuestsStore.quests.values()].filter(x => x.id !== "1248385850622869556" && new Date(x.config.expiresAt).getTime() > Date.now());
        const videoQuest = allQuests.find(q => {
            const taskConfig = q.config.taskConfig || q.config.taskConfigV2;
            return taskConfig?.tasks?.WATCH_VIDEO;
        });
        if (videoQuest) {
            try {
                await api.post({ url: `/quests/${videoQuest.id}/enroll`, body: {} });
                quests = [...QuestsStore.quests.values()]
                    .filter(q => q.userStatus && !q.userStatus.completedAt && q.id !== "1248385850622869556" && new Date(q.config.expiresAt).getTime() > Date.now())
                    .sort((a, b) => new Date(b.userStatus.enrolledAt).getTime() - new Date(a.userStatus.enrolledAt).getTime());
                console.log(`Enrolled in video quest: ${videoQuest.config.application.name}`);
            } catch (error) {
                console.error(`Failed to enroll in video quest: ${error}`);
            }
        }
    }

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
        zIndex: 999998
    });
    appearBtn.innerHTML = '↗';
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
                width: 340px;
                min-width: 200px;
                min-height: 150px;
                max-height: 80vh;
                overflow-y: auto;
                z-index: 999999;
                background: linear-gradient(180deg, var(--bg-start), var(--bg-end));
                color: var(--text-color);
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                padding: 16px;
                font-family: 'Whitney', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                line-height: 1.5;
                resize: both;
                overflow: auto;
            }
            #quest-overlay-header {
                cursor: move;
                user-select: none;
                font-weight: 600;
                font-size: 16px;
                margin-bottom: 12px;
                color: #FFD700;
            }
            #quest-overlay select, #quest-overlay button, #quest-overlay input[type="color"] {
                background: #2F3136;
                color: var(--text-color);
                border: 1px solid #202225;
                border-radius: 4px;
                font-family: 'Whitney', sans-serif;
                font-size: 14px;
                padding: 8px;
            }
            #quest-overlay select {
                width: 100%;
                cursor: pointer;
            }
            #quest-overlay button {
                background: var(--accent-color);
                border: none;
                cursor: pointer;
                transition: background 0.2s;
            }
            #quest-overlay button:hover {
                background: #4752C4;
            }
            #quest-overlay button.secondary {
                background: #2F3136;
            }
            #quest-overlay button.secondary:hover {
                background: #3F4147;
            }
            #quest-progress-bar {
                height: 100%;
                width: 0%;
                transition: width 0.5s ease-in-out;
                background: linear-gradient(90deg, #5865F2, #7289DA);
            }
            #quest-finish {
                color: #00FF00;
                font-weight: 600;
            }
            #quest-error, #quest-no-quests {
                color: #FF5555;
                font-size: 12px;
            }
        </style>
    `;
    overlay.appendChild(document.createElement('div'));

    const header = document.createElement('div');
    header.id = 'quest-overlay-header';
    header.textContent = 'Aurox Assets 👑 Quest Spoofer';
    overlay.appendChild(header);

    const questSelectWrap = document.createElement('div');
    questSelectWrap.style.marginBottom = '12px';
    const questLabel = document.createElement('label');
    questLabel.textContent = 'Select Quest:';
    questLabel.style.display = 'block';
    questLabel.style.marginBottom = '6px';
    questLabel.style.fontWeight = '500';
    questSelectWrap.appendChild(questLabel);

    const questSelect = document.createElement('select');
    if (quests.length === 0) {
        const option = document.createElement('option');
        option.textContent = 'No uncompleted quests';
        option.disabled = true;
        questSelect.appendChild(option);
    } else {
        quests.forEach((q, i) => {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${q.config.application.name} - ${q.config.messages?.questName || 'Quest'}`;
            questSelect.appendChild(option);
        });
    }
    questSelectWrap.appendChild(questSelect);
    overlay.appendChild(questSelectWrap);

    const colorWrap = document.createElement('div');
    colorWrap.style.marginBottom = '12px';
    colorWrap.innerHTML = `
        <label style="display:block;margin-bottom:6px;font-weight:500">Background Colors:</label>
        <div style="display:flex;gap:8px">
            <input type="color" id="bg-start" value="#202225" title="Start Gradient">
            <input type="color" id="bg-end" value="#181A1D" title="End Gradient">
        </div>
    `;
    overlay.appendChild(colorWrap);

    const details = document.createElement('div');
    details.innerHTML = `
        <div style="margin-bottom:8px"><strong>App:</strong> <span id="quest-appname">Select a quest</span></div>
        <div style="margin-bottom:8px"><strong>Task:</strong> <span id="quest-task">N/A</span></div>
        <div style="margin-bottom:12px;color:#72767d"><strong>Expires:</strong> <span id="quest-exp">N/A</span></div>
        <div style="font-size:14px;display:none" id="quest-finish">Quest Finish!</div>
        <div style="font-size:12px;display:${quests.length === 0 ? 'block' : 'none'}" id="quest-no-quests">Accept Quests first/You don't have uncompleted quests</div>
        <div style="font-size:12px;display:none" id="quest-error"></div>
    `;
    overlay.appendChild(details);

    // Progress Container
    const progWrap = document.createElement('div');
    progWrap.style.marginBottom = '12px';
    const progressText = document.createElement('div');
    progressText.id = 'quest-progress-text';
    progressText.textContent = '0s / 0s (0%)';
    progressText.style.fontSize = '13px';
    progressText.style.marginBottom = '8px';
    progWrap.appendChild(progressText);

    const barBg = document.createElement('div');
    barBg.style.height = '12px';
    barBg.style.width = '100%';
    barBg.style.background = '#202225';
    barBg.style.borderRadius = '4px';
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
    controls.style.marginBottom = '12px';

    const startBtn = document.createElement('button');
    startBtn.textContent = 'Start';
    startBtn.disabled = quests.length === 0;
    startBtn.style.flex = '1';
    startBtn.style.padding = '8px';
    startBtn.style.fontWeight = '500';

    const hideBtn = document.createElement('button');
    hideBtn.textContent = 'Hide';
    hideBtn.className = 'secondary';
    hideBtn.style.flex = '1';
    hideBtn.style.padding = '8px';
    hideBtn.style.fontWeight = '500';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.className = 'secondary';
    closeBtn.style.flex = '1';
    closeBtn.style.padding = '8px';
    closeBtn.style.fontWeight = '500';

    controls.appendChild(startBtn);
    controls.appendChild(hideBtn);
    controls.appendChild(closeBtn);
    overlay.appendChild(controls);

    const discordLink = document.createElement('div');
    discordLink.style.textAlign = 'center';
    discordLink.style.fontSize = '12px';
    discordLink.style.color = '#72767d';
    discordLink.innerHTML = `Join our server for Scripts Update! <a href="https://discord.gg/7zhG8UMhK6" target="_blank" style="color:#5865F2;text-decoration:none;font-weight:500">https://discord.gg/7zhG8UMhK6</a>`;
    overlay.appendChild(discordLink);

    document.body.appendChild(overlay);

    // --- UI Interactivity ---
    let isDragging = false;
    let currentX, currentY, initialX, initialY;
    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        initialX = e.clientX - currentX;
        initialY = e.clientY - currentY;
        header.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            overlay.style.right = 'auto';
            overlay.style.bottom = 'auto';
            overlay.style.left = `${currentX}px`;
            overlay.style.top = `${currentY}px`;
        }
    });
    document.addEventListener('mouseup', () => {
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

    // --- UI State and Functions ---
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
        document.getElementById('quest-progress-bar').style.width = pct + '%';
        document.getElementById('quest-progress-text').textContent = `${secondsDone}s / ${secondsNeeded}s (${pct}%)`;
        document.getElementById('quest-task').textContent = taskName ? taskName.replace('_', ' ') : 'N/A';
        document.getElementById('quest-appname').textContent = currentQuest ? currentQuest.config.application.name : 'Select a quest';
        document.getElementById('quest-exp').textContent = currentQuest ? new Date(currentQuest.config.expiresAt).toLocaleDateString() : 'N/A';
        document.getElementById('quest-finish').style.display = isCompleted ? 'block' : 'none';
        document.getElementById('quest-no-quests').style.display = !currentQuest && quests.length === 0 ? 'block' : 'none';
    }

    function showError(message) {
        const errorDiv = document.getElementById('quest-error');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        startBtn.disabled = true;
        resetState();
    }

    function syncProgress() {
        if (currentQuest && taskName) {
            const questData = QuestsStore.getQuest(currentQuest.id);
            if (questData?.userStatus?.progress?.[taskName]) {
                secondsDone = Math.min(secondsNeeded, Math.max(secondsDone, Math.floor(questData.userStatus.progress[taskName].value)));
                updateUI();
                console.log(`Synced progress for ${taskName}: ${secondsDone}/${secondsNeeded}`);
            } else if (questData?.userStatus?.streamProgressSeconds && currentQuest.config.configVersion === 1) {
                secondsDone = Math.min(secondsNeeded, Math.max(secondsDone, questData.userStatus.streamProgressSeconds));
                updateUI();
                console.log(`Synced progress for ${taskName} (v1): ${secondsDone}/${secondsNeeded}`);
            }
        }
    }

    function startLocalTimer() {
        if (localTimer) clearInterval(localTimer);
        localTimer = setInterval(() => {
            if (isRunning && secondsDone < secondsNeeded) {
                secondsDone++;
                updateUI();
                console.log(`Local timer progress for ${taskName}: ${secondsDone}/${secondsNeeded}`);
            }
            if (secondsDone >= secondsNeeded) {
                clearInterval(localTimer);
                localTimer = null;
                startBtn.textContent = 'Completed ✅';
                startBtn.disabled = true;
                isRunning = false;
                syncProgress();
                updateUI();
                console.log(`${taskName} quest completed locally`);
            }
        }, 1000);
    }

    function resetState() {
        if (timer) {
            clearInterval(timer);
            timer = null;
            console.log('Timer cleared');
        }
        if (localTimer) {
            clearInterval(localTimer);
            localTimer = null;
            console.log('Local timer cleared');
        }
        if (unsubscribe) {
            FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", unsubscribe);
            unsubscribe = null;
            console.log('Unsubscribed from QUESTS_SEND_HEARTBEAT_SUCCESS');
        }
        if (taskName === "PLAY_ON_DESKTOP" && pid) {
            const realGetRunningGames = RunningGameStore.getRunningGames || (() => []);
            const realGetGameForPID = RunningGameStore.getGameForPID || (() => null);
            RunningGameStore.getRunningGames = realGetRunningGames;
            RunningGameStore.getGameForPID = realGetGameForPID;
            FluxDispatcher.dispatch({type: "RUNNING_GAMES_CHANGE", removed: [{pid}], added: [], games: []});
            console.log('Reset RunningGameStore and dispatched game removal');
        }
        if (taskName === "STREAM_ON_DESKTOP") {
            ApplicationStreamingStore.getStreamerActiveStreamMetadata = ApplicationStreamingStore.getStreamerActiveStreamMetadata || (() => ({}));
            console.log('Reset ApplicationStreamingStore');
        }
        timer = null;
        unsubscribe = null;
        localTimer = null;
        syncProgress();
        isRunning = false;
        startBtn.textContent = 'Start';
        startBtn.disabled = !currentQuest;
        document.getElementById('quest-error').style.display = 'none';
        updateUI();
    }

    // Quest Selection Handler
    questSelect.onchange = () => {
        resetState();
        currentQuest = quests[questSelect.value];
        if (!currentQuest) {
            startBtn.disabled = true;
            return;
        }

        let taskConfig = currentQuest.config.taskConfig || currentQuest.config.taskConfigV2;
        if (!taskConfig || !taskConfig.tasks) {
            showError("No valid task config found!");
            return;
        }

        taskName = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY"].find(x => taskConfig.tasks[x] != null);
        secondsNeeded = taskConfig.tasks[taskName]?.target ?? 0;
        syncProgress();

        if (!taskName) {
            showError("THIS QUEST IS NOT SUPPORTED");
            return;
        }

        startBtn.disabled = false;
        updateUI();
    };

    // Start/Pause Button Logic
    startBtn.onclick = async () => {
        if (!currentQuest) {
            showError("Please select a quest!");
            return;
        }

        if (isRunning) {
            resetState();
            console.log('Paused quest execution');
        } else {
            startBtn.textContent = 'Pause';
            isRunning = true;
            pid = Math.floor(Math.random() * 30000) + 1000;
            const applicationId = currentQuest.config.application.id;
            startLocalTimer();

            if (taskName === "WATCH_VIDEO") {
                const maxFuture = 10, speed = 7, interval = 1;
                const enrolledAt = new Date(currentQuest.userStatus.enrolledAt).getTime();
                timer = setInterval(async () => {
                    if (!isRunning) {
                        console.log('Stopped WATCH_VIDEO timer due to pause');
                        return;
                    }
                    const maxAllowed = Math.floor((Date.now() - enrolledAt) / 1000) + maxFuture;
                    const diff = maxAllowed - secondsDone;
                    const timestamp = secondsDone + speed;
                    if (diff >= speed) {
                        try {
                            const res = await api.post({url: `/quests/${currentQuest.id}/video-progress`, body: {timestamp: Math.min(secondsNeeded, timestamp + Math.random())}});
                            if (isRunning && res.body?.progress?.WATCH_VIDEO) {
                                secondsDone = Math.min(secondsNeeded, Math.max(secondsDone, Math.floor(res.body.progress.WATCH_VIDEO.value)));
                                updateUI();
                                console.log(`WATCH_VIDEO server progress: ${secondsDone}/${secondsNeeded}`);
                            }
                        } catch (error) {
                            showError(`Error updating video progress: ${error}`);
                        }
                    }
                }, interval * 1000);
            } else if (taskName === "PLAY_ON_DESKTOP") {
                if (!isApp) {
                    showError("Use the desktop app for this quest!");
                    startBtn.textContent = 'Start';
                    isRunning = false;
                    clearInterval(localTimer);
                    localTimer = null;
                    return;
                }
                try {
                    const res = await api.get({url: `/applications/public?application_ids=${applicationId}`});
                    const appData = res.body[0];
                    if (!appData || !appData.executables) {
                        showError("Failed to fetch application data!");
                        startBtn.textContent = 'Start';
                        isRunning = false;
                        clearInterval(localTimer);
                        localTimer = null;
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
                        pid: pid,
                        pidPath: [pid],
                        processName: appData.name,
                        start: Date.now(),
                    };
                    const realGames = RunningGameStore.getRunningGames();
                    const fakeGames = [fakeGame];
                    const realGetRunningGames = RunningGameStore.getRunningGames;
                    const realGetGameForPID = RunningGameStore.getGameForPID;
                    RunningGameStore.getRunningGames = () => fakeGames;
                    RunningGameStore.getGameForPID = (pid) => fakeGames.find(x => x.pid === pid);
                    FluxDispatcher.dispatch({type: "RUNNING_GAMES_CHANGE", removed: realGames, added: [fakeGame], games: fakeGames});

                    timer = setInterval(() => {
                        if (!isRunning) {
                            console.log('Stopped PLAY_ON_DESKTOP sync timer due to pause');
                            return;
                        }
                        syncProgress();
                    }, 5000);

                    unsubscribe = (data) => {
                        if (!isRunning) {
                            console.log('Ignored PLAY_ON_DESKTOP update due to pause');
                            return;
                        }
                        let progress = currentQuest.config.configVersion === 1 ? data.userStatus.streamProgressSeconds : Math.floor(data.userStatus.progress.PLAY_ON_DESKTOP.value);
                        secondsDone = Math.min(secondsNeeded, Math.max(secondsDone, progress));
                        updateUI();
                        console.log(`PLAY_ON_DESKTOP event progress: ${secondsDone}/${secondsNeeded}`);
                        if (QuestsStore.getQuest(currentQuest.id).userStatus.completedAt) {
                            clearInterval(localTimer);
                            clearInterval(timer);
                            localTimer = null;
                            timer = null;
                            startBtn.textContent = 'Completed ✅';
                            startBtn.disabled = true;
                            RunningGameStore.getRunningGames = realGetRunningGames;
                            RunningGameStore.getGameForPID = realGetGameForPID;
                            FluxDispatcher.dispatch({type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: [], games: []});
                            FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", unsubscribe);
                            unsubscribe = null;
                            isRunning = false;
                            console.log('PLAY_ON_DESKTOP quest completed');
                        }
                    };
                    FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", unsubscribe);
                } catch (error) {
                    showError(`Error: ${error}`);
                    startBtn.textContent = 'Start';
                    isRunning = false;
                    clearInterval(localTimer);
                    localTimer = null;
                }
            } else if (taskName === "STREAM_ON_DESKTOP") {
                if (!isApp) {
                    showError("Use the desktop app for this quest!");
                    startBtn.textContent = 'Start';
                    isRunning = false;
                    clearInterval(localTimer);
                    localTimer = null;
                    return;
                }
                let realFunc = ApplicationStreamingStore.getStreamerActiveStreamMetadata;
                ApplicationStreamingStore.getStreamerActiveStreamMetadata = () => ({
                    id: applicationId,
                    pid,
                    sourceName: null
                });

                timer = setInterval(() => {
                    if (!isRunning) {
                        console.log('Stopped STREAM_ON_DESKTOP sync timer due to pause');
                        return;
                    }
                    syncProgress();
                }, 5000);

                unsubscribe = (data) => {
                    if (!isRunning) {
                        console.log('Ignored STREAM_ON_DESKTOP update due to pause');
                        return;
                    }
                    let progress = currentQuest.config.configVersion === 1 ? data.userStatus.streamProgressSeconds : Math.floor(data.userStatus.progress.STREAM_ON_DESKTOP.value);
                    secondsDone = Math.min(secondsNeeded, Math.max(secondsDone, progress));
                    updateUI();
                    console.log(`STREAM_ON_DESKTOP event progress: ${secondsDone}/${secondsNeeded}`);
                    if (QuestsStore.getQuest(currentQuest.id).userStatus.completedAt) {
                        clearInterval(localTimer);
                        clearInterval(timer);
                        localTimer = null;
                        timer = null;
                        startBtn.textContent = 'Completed ✅';
                        startBtn.disabled = true;
                        ApplicationStreamingStore.getStreamerActiveStreamMetadata = realFunc;
                        FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", unsubscribe);
                        unsubscribe = null;
                        isRunning = false;
                        console.log('STREAM_ON_DESKTOP quest completed');
                    }
                };
                FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", unsubscribe);
            } else if (taskName === "PLAY_ACTIVITY") {
                const channelId = ChannelStore.getSortedPrivateChannels()[0]?.id ?? Object.values(GuildChannelStore.getAllGuilds()).find(x => x != null && x.VOCAL.length > 0)?.VOCAL[0]?.channel.id;
                if (!channelId) {
                    showError("No suitable channel found!");
                    startBtn.textContent = 'Start';
                    isRunning = false;
                    clearInterval(localTimer);
                    localTimer = null;
                    return;
                }
                const streamKey = `call:${channelId}:1`;
                timer = setInterval(async () => {
                    if (!isRunning) {
                        console.log('Stopped PLAY_ACTIVITY timer due to pause');
                        return;
                    }
                    try {
                        const res = await api.post({url: `/quests/${currentQuest.id}/heartbeat`, body: {stream_key: streamKey, terminal: false}});
                        if (isRunning && res.body?.progress?.PLAY_ACTIVITY) {
                            secondsDone = Math.min(secondsNeeded, Math.max(secondsDone, Math.floor(res.body.progress.PLAY_ACTIVITY.value)));
                            updateUI();
                            console.log(`PLAY_ACTIVITY server progress: ${secondsDone}/${secondsNeeded}`);
                        }
                        if (QuestsStore.getQuest(currentQuest.id).userStatus.completedAt) {
                            await api.post({url: `/quests/${currentQuest.id}/heartbeat`, body: {stream_key: streamKey, terminal: true}});
                            clearInterval(timer);
                            clearInterval(localTimer);
                            timer = null;
                            localTimer = null;
                            startBtn.textContent = 'Completed ✅';
                            startBtn.disabled = true;
                            isRunning = false;
                            updateUI();
                            console.log('PLAY_ACTIVITY quest completed');
                        }
                    } catch (error) {
                        showError(`Error: ${error}`);
                        startBtn.textContent = 'Start';
                        isRunning = false;
                        clearInterval(localTimer);
                        localTimer = null;
                    }
                }, 20 * 1000);
            }
        }
    };

    closeBtn.onclick = () => {
        resetState();
        overlay.remove();
        appearBtn.remove();
        console.log('UI closed');
    };

    // Initialize UI
    currentX = window.innerWidth - 340 - 20;
    currentY = 20;
    overlay.style.left = `${currentX}px`;
    overlay.style.top = `${currentY}px`;
    if (quests.length > 0) {
        currentQuest = quests[0]; // Select recent quest
        let taskConfig = currentQuest.config.taskConfig || currentQuest.config.taskConfigV2;
        taskName = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY"].find(x => taskConfig.tasks[x] != null);
        secondsNeeded = taskConfig.tasks[taskName]?.target ?? 0;
        questSelect.value = 0;
        syncProgress();
        startBtn.disabled = !taskName;
        if (!taskName) showError("THIS QUEST IS NOT SUPPORTED");
    }
    updateUI();
})();
