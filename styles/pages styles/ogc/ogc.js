const sectionLinks = document.querySelectorAll('.site-nav__link[href^="#"]');
const sections = Array.from(sectionLinks, (link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);

if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) {
                return;
            }

            sectionLinks.forEach((link) => {
                const isCurrent = link.hash === `#${entry.target.id}`;
                link.classList.toggle("site-nav__link--active", isCurrent);
                if (isCurrent) {
                    link.setAttribute("aria-current", "location");
                } else {
                    link.removeAttribute("aria-current");
                }
            });
        });
    }, { rootMargin: "-20% 0px -65% 0px" });

    sections.forEach((section) => sectionObserver.observe(section));
}