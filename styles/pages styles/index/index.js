const progressBar = document.querySelector(".loader__progress");
const progressTrack = document.querySelector(".loader__track");
const loadingStatus = document.querySelector("#loading-status");

let progress = 0;
let assetsLoaded = document.readyState === "complete";
let copyLoaded = false;
const progressTimer = window.setInterval(() => {
    progress = Math.min(progress + Math.max(1, (90 - progress) * 0.08), 90);
    progressBar.style.width = `${progress}%`;
    progressTrack.setAttribute("aria-valuenow", String(Math.round(progress)));
}, 100);

function enterCampWhenReady() {
    if (!assetsLoaded || !copyLoaded) {
        return;
    }

    window.clearInterval(progressTimer);
    progressBar.style.width = "100%";
    progressTrack.setAttribute("aria-valuenow", "100");
    loadingStatus.textContent = window.siteCopyData.page.loading.readyStatus;

    window.setTimeout(() => {
        window.location.replace("view/ogc.html");
    }, 450);
}

window.addEventListener("load", () => {
    assetsLoaded = true;
    enterCampWhenReady();
}, { once: true });

window.siteCopyReady.then((ready) => {
    copyLoaded = ready;
    if (ready) {
        enterCampWhenReady();
    } else {
        window.clearInterval(progressTimer);
    }
});