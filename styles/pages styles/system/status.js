const liveStatusPanel = document.querySelector("[data-live-panel]");

async function initializeLiveStatus() {
    if (!liveStatusPanel) {
        return;
    }

    const copyReady = await window.siteCopyReady;
    if (!copyReady) {
        return;
    }

    const pageCopy = window.siteCopyData?.page?.page?.live;
    const monitorCopy = window.siteCopyData?.common?.statusMonitor;
    if (
        liveStatusPanel.dataset.livePanel !== "availability"
        || !pageCopy
        || !monitorCopy
        || !Array.isArray(monitorCopy.checks)
        || monitorCopy.checks.length === 0
        || !Number.isInteger(monitorCopy.intervalSeconds)
        || monitorCopy.intervalSeconds < 1
        || !Number.isInteger(monitorCopy.timeoutMs)
        || monitorCopy.timeoutMs < 1
        || !monitorCopy.states
    ) {
        throw new Error("Live status configuration is missing from the page text files.");
    }

    const labels = monitorCopy.states;
    const summary = liveStatusPanel.querySelector('[data-live-value="summary"]');
    const summaryBadge = liveStatusPanel.querySelector('[data-live-value="summary-badge"]');
    const checkList = liveStatusPanel.querySelector('[data-live-value="checks"]');
    const updated = liveStatusPanel.querySelector('[data-live-value="updated"]');
    if (!summary || !summaryBadge || !checkList || !updated) {
        throw new Error("Live availability status elements are missing.");
    }

    const formatClock = new Intl.DateTimeFormat("zh-CN", {
        dateStyle: "medium",
        timeStyle: "medium"
    });
    const rows = monitorCopy.checks.map((check) => {
        if (typeof check.name !== "string" || typeof check.path !== "string") {
            throw new Error("Each status check requires a name and a path.");
        }

        const url = new URL(check.path, window.location.origin);
        if (url.origin !== window.location.origin) {
            throw new Error(`Status check must use the current site origin: ${check.path}`);
        }

        const item = document.createElement("li");
        item.className = "live-status__check";

        const name = document.createElement("span");
        name.className = "live-status__check-name";
        name.textContent = check.name;

        const status = document.createElement("span");
        status.className = "live-status__check-state";
        status.textContent = labels.checking;

        item.append(name, status);
        checkList.append(item);
        return { url, item, status };
    });

    const responseStatus = liveStatusPanel.querySelector('[data-live-value="response-status"]');
    if (responseStatus) {
        const path = liveStatusPanel.querySelector('[data-live-value="path"]');
        if (!path) {
            throw new Error("The current request path element is missing.");
        }

        path.textContent = window.location.pathname || "/";
        path.title = path.textContent;

        const entry = performance.getEntriesByType("navigation")[0];
        const code = entry?.responseStatus;
        if (Number.isInteger(code) && code > 0) {
            const responseLabel = code === 404
                ? labels.responseNotFound
                : code >= 200 && code < 400
                    ? labels.responseOk
                    : labels.responseOther;
            responseStatus.textContent = `${labels.responseCode.replace("{code}", String(code))} · ${responseLabel}`;
            responseStatus.dataset.state = code >= 400 ? "offline" : "online";
        } else {
            responseStatus.textContent = labels.responseUnavailable;
            responseStatus.dataset.state = "unknown";
        }

        const clock = liveStatusPanel.querySelector('[data-live-value="clock"]');
        if (!clock) {
            throw new Error("The current local time element is missing.");
        }
        const renderClock = () => {
            const now = new Date();
            clock.textContent = formatClock.format(now);
            clock.dateTime = now.toISOString();
        };

        renderClock();
        window.setInterval(renderClock, 1000);
    }

    const requestCheck = async ({ url }) => {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), monitorCopy.timeoutMs);
        try {
            const response = await fetch(url, {
                cache: "no-store",
                signal: controller.signal
            });
            return { ok: response.ok, status: response.status };
        } catch {
            return { ok: false, status: 0 };
        } finally {
            window.clearTimeout(timeout);
        }
    };

    const renderChecks = async () => {
        summary.textContent = labels.checking;
        summaryBadge.dataset.state = "checking";

        const results = await Promise.all(rows.map(async (row) => {
            const result = await requestCheck(row);
            const detail = result.status
                ? labels.responseCode.replace("{code}", String(result.status))
                : labels.responseUnavailable;
            row.status.textContent = `${result.ok ? labels.available : labels.unavailable} · ${detail}`;
            row.item.dataset.state = result.ok ? "online" : "offline";
            return result;
        }));

        const reachable = results.filter((result) => result.ok).length;
        summary.textContent = reachable === results.length
            ? labels.online
            : reachable === 0
                ? labels.offline
                : labels.partial;
        summaryBadge.dataset.state = reachable === results.length
            ? "online"
            : reachable === 0
                ? "offline"
                : "partial";

        const checkedAt = new Date();
        updated.textContent = formatClock.format(checkedAt);
        updated.dateTime = checkedAt.toISOString();
        window.setTimeout(renderChecks, monitorCopy.intervalSeconds * 1000);
    };

    await renderChecks();
}

initializeLiveStatus().catch((error) => {
    console.error("Unable to initialize the live status panel.", error);
    const summary = liveStatusPanel?.querySelector('[data-live-value="summary"]');
    const summaryBadge = liveStatusPanel?.querySelector('[data-live-value="summary-badge"]');
    const errorCopy = window.siteCopyData?.page?.page?.live?.error;
    if (summary && typeof errorCopy === "string") {
        summary.textContent = errorCopy;
        if (summaryBadge) {
            summaryBadge.dataset.state = "offline";
        }
    }
});
