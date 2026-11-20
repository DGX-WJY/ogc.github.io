const body = document.body;
const pageCopyPath = body.dataset.pageCopy;
const siteCopyPath = body.dataset.siteCopy;
const prefetchCopyPath = body.dataset.prefetchCopy;

async function fetchCopy(path) {
    const response = await fetch(new URL(path, document.baseURI));
    if (!response.ok) {
        throw new Error(`Could not load ${path}: HTTP ${response.status}`);
    }

    return response.json();
}

function findCopyValue(data, key) {
    return key.split(".").reduce((value, part) => value?.[part], data);
}

async function loadPageCopy() {
    try {
        if (!pageCopyPath || !siteCopyPath) {
            throw new Error("Page copy file paths are not configured.");
        }

        const [siteData, pageData, prefetchedPageData] = await Promise.all([
            fetchCopy(siteCopyPath),
            fetchCopy(pageCopyPath),
            prefetchCopyPath ? fetchCopy(prefetchCopyPath) : Promise.resolve(null)
        ]);
        if (prefetchedPageData && typeof prefetchedPageData.meta?.title !== "string") {
            throw new Error(`Missing page title in ${prefetchCopyPath}.`);
        }

        const copy = { common: siteData.common, ...pageData };
        const updates = Array.from(document.querySelectorAll("[data-copy]"), (element) => {
            const key = element.dataset.copy;
            const value = findCopyValue(copy, key);
            if (typeof value !== "string") {
                throw new Error(`Missing text value for "${key}" in ${pageCopyPath}.`);
            }

            return { element, key, value };
        });

        const currentYear = String(new Date().getFullYear());
        updates.forEach(({ element, key, value }) => {
            const attribute = element.dataset.copyAttribute;
            const resolvedValue = value.replaceAll("{year}", currentYear);
            if (attribute) {
                element.setAttribute(attribute, resolvedValue);
            } else {
                element.textContent = resolvedValue;
            }
        });

        const title = findCopyValue(copy, "meta.title");
        if (typeof title !== "string") {
            throw new Error(`Missing page title in ${pageCopyPath}.`);
        }

        document.title = title.replaceAll("{year}", currentYear);
        window.siteCopyData = { common: siteData.common, page: pageData, prefetchedPage: prefetchedPageData };
        body.dataset.copyState = "ready";
        document.querySelector(".copy-loading")?.setAttribute("hidden", "");
        return true;
    } catch (error) {
        console.error("Unable to load page text from Resources/txt.", error);
        body.dataset.copyState = "error";
        document.querySelector(".copy-loading")?.setAttribute("hidden", "");
        const errorMessage = document.querySelector("[data-copy-error]");
        if (errorMessage) {
            errorMessage.hidden = false;
        }
        return false;
    }
}

window.siteCopyReady = loadPageCopy();