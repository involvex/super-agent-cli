/**
 * Super Agent CLI Documentation
 * Main JavaScript file for theme toggle, navigation, and interactions
 */

(function () {
  "use strict";

  // ========================================
  // Theme Management
  // ========================================
  const ThemeManager = {
    STORAGE_KEY: "super-agent-cli-theme",

    init() {
      const savedTheme = localStorage.getItem(this.STORAGE_KEY);
      const systemPrefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;

      if (savedTheme) {
        document.documentElement.setAttribute("data-theme", savedTheme);
      } else if (systemPrefersDark) {
        document.documentElement.setAttribute("data-theme", "dark");
      }

      this.bindEvents();
    },

    toggle() {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      const newTheme = currentTheme === "dark" ? "light" : "dark";

      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem(this.STORAGE_KEY, newTheme);

      // Dispatch custom event for other scripts
      window.dispatchEvent(
        new CustomEvent("themechange", { detail: { theme: newTheme } }),
      );
    },

    bindEvents() {
      const toggleBtn = document.querySelector(".theme-toggle");
      if (toggleBtn) {
        toggleBtn.addEventListener("click", () => this.toggle());
      }

      // Listen for system preference changes
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", e => {
          if (!localStorage.getItem(this.STORAGE_KEY)) {
            document.documentElement.setAttribute(
              "data-theme",
              e.matches ? "dark" : "light",
            );
          }
        });
    },
  };

  // ========================================
  // Mobile Navigation
  // ========================================
  const MobileNav = {
    init() {
      this.menuBtn = document.querySelector(".mobile-menu-btn");
      this.navLinks = document.querySelector(".nav-links");

      if (this.menuBtn && this.navLinks) {
        this.menuBtn.addEventListener("click", () => this.toggle());

        // Close menu when clicking on a link
        this.navLinks.querySelectorAll(".nav-link").forEach(link => {
          link.addEventListener("click", () => this.close());
        });

        // Close menu when clicking outside
        document.addEventListener("click", e => {
          if (
            !this.menuBtn.contains(e.target) &&
            !this.navLinks.contains(e.target)
          ) {
            this.close();
          }
        });
      }
    },

    toggle() {
      const isExpanded = this.menuBtn.getAttribute("aria-expanded") === "true";
      this.menuBtn.setAttribute("aria-expanded", !isExpanded);
      this.navLinks.classList.toggle("active");
      this.menuBtn.classList.toggle("active");
    },

    close() {
      this.menuBtn.setAttribute("aria-expanded", "false");
      this.navLinks.classList.remove("active");
      this.menuBtn.classList.remove("active");
    },
  };

  // ========================================
  // Tab Navigation
  // ========================================
  const TabNavigation = {
    init() {
      const tabBtns = document.querySelectorAll(".tab-btn");

      tabBtns.forEach(btn => {
        btn.addEventListener("click", () => this.switchTab(btn));
      });
    },

    switchTab(btn) {
      const tabId = btn.getAttribute("data-tab");

      // Update button states
      document.querySelectorAll(".tab-btn").forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");

      // Update panel visibility
      document.querySelectorAll(".tab-panel").forEach(panel => {
        panel.classList.remove("active");
      });

      const activePanel = document.getElementById(`${tabId}-panel`);
      if (activePanel) {
        activePanel.classList.add("active");
      }
    },
  };

  // ========================================
  // Copy Code Functionality
  // ========================================
  const CopyButton = {
    init() {
      const copyBtns = document.querySelectorAll(".copy-btn");

      copyBtns.forEach(btn => {
        btn.addEventListener("click", () => this.copy(btn));
      });
    },

    copy(btn) {
      const command = btn.getAttribute("data-copy");
      const icon = btn.querySelector("svg");

      navigator.clipboard
        .writeText(command)
        .then(() => {
          // Show success feedback
          const originalHTML = btn.innerHTML;
          btn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        `;
          btn.style.color = "var(--color-success)";

          setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.color = "";
          }, 2000);
        })
        .catch(err => {
          console.error("Failed to copy:", err);

          // Fallback for older browsers
          const textarea = document.createElement("textarea");
          textarea.value = command;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.select();

          try {
            document.execCommand("copy");
            btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          `;
            btn.style.color = "var(--color-success)";

            setTimeout(() => {
              btn.innerHTML = `
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <rect x="9" y="9" width="13" height="13" rx="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            `;
              btn.style.color = "";
            }, 2000);
          } catch (e) {
            console.error("Fallback copy failed:", e);
          }

          document.body.removeChild(textarea);
        });
    },
  };

  // ========================================
  // Smooth Scroll
  // ========================================
  const SmoothScroll = {
    init() {
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener("click", e => {
          const targetId = anchor.getAttribute("href");

          if (targetId === "#") {
            return;
          }

          const target = document.querySelector(targetId);

          if (target) {
            e.preventDefault();

            const navHeight = document.querySelector(".navbar").offsetHeight;
            const targetPosition =
              target.getBoundingClientRect().top +
              window.pageYOffset -
              navHeight;

            window.scrollTo({
              top: targetPosition,
              behavior: "smooth",
            });

            // Update URL without jumping
            history.pushState(null, null, targetId);

            // Update focus for accessibility
            target.setAttribute("tabindex", "-1");
            target.focus({ preventScroll: true });
          }
        });
      });
    },
  };

  // ========================================
  // Active Navigation Highlight
  // ========================================
  const ActiveNavHighlight = {
    init() {
      const sections = document.querySelectorAll("section[id]");
      const navLinks = document.querySelectorAll(".nav-link");

      this.highlight(sections, navLinks);

      window.addEventListener("scroll", () => {
        this.highlight(sections, navLinks);
      });
    },

    highlight(sections, navLinks) {
      const scrollPosition = window.scrollY + 200;

      sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute("id");

        if (
          scrollPosition >= sectionTop &&
          scrollPosition < sectionTop + sectionHeight
        ) {
          navLinks.forEach(link => {
            link.classList.remove("active");
            if (link.getAttribute("href") === `#${sectionId}`) {
              link.classList.add("active");
            }
          });
        }
      });
    },
  };

  // ========================================
  // Scroll Reveal Animation
  // ========================================
  const ScrollReveal = {
    init() {
      const elements = document.querySelectorAll(
        ".feature-card, .usage-card, .config-card, .provider-card, " +
          ".transport-card, .arch-card, .contributing-card",
      );

      // Add initial styles
      elements.forEach(el => {
        el.style.opacity = "0";
        el.style.transform = "translateY(20px)";
        el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
      });

      // Observe for visibility
      if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(
          entries => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                entry.target.style.opacity = "1";
                entry.target.style.transform = "translateY(0)";
                observer.unobserve(entry.target);
              }
            });
          },
          {
            threshold: 0.1,
            rootMargin: "0px 0px -50px 0px",
          },
        );

        elements.forEach(el => observer.observe(el));
      } else {
        // Fallback for older browsers
        elements.forEach(el => {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
        });
      }
    },
  };

  // ========================================
  // Keyboard Navigation
  // ========================================
  const KeyboardNav = {
    init() {
      document.addEventListener("keydown", e => {
        // Close mobile menu on Escape
        if (e.key === "Escape") {
          MobileNav.close();
        }
      });
    },
  };

  // ========================================
  // Performance: Lazy Loading
  // ========================================
  const LazyLoad = {
    init() {
      if ("IntersectionObserver" in window) {
        const imageObserver = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target;
              if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute("data-src");
              }
              imageObserver.unobserve(img);
            }
          });
        });

        document.querySelectorAll("img[data-src]").forEach(img => {
          imageObserver.observe(img);
        });
      }
    },
  };

  // ========================================
  // Error Handling
  // ========================================
  const ErrorHandler = {
    init() {
      window.addEventListener("error", e => {
        console.error("Global error:", e.error);
      });

      window.addEventListener("unhandledrejection", e => {
        console.error("Unhandled promise rejection:", e.reason);
      });
    },
  };

  // ========================================
  // Initialize Everything
  // ========================================
  function init() {
    ThemeManager.init();
    MobileNav.init();
    TabNavigation.init();
    CopyButton.init();
    SmoothScroll.init();
    ActiveNavHighlight.init();
    ScrollReveal.init();
    KeyboardNav.init();
    LazyLoad.init();
    ErrorHandler.init();

    // Log initialization for debugging
    if (window.location.search.includes("debug=true")) {
      console.log("Super Agent CLI Documentation initialized");
    }
  }

  // Run when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
