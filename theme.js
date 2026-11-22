
// ==========================================
// COLLEGEHUB - THEME SYSTEM
// ==========================================

const themes = {
    default: {
        pageBg: "#101722",
        sidebarBg: "#172333",
        surface: "#1a2738",
        surfaceRaised: "#223750",
        surfaceHover: "#263c55",
        textPrimary: "#ffffff",
        textSecondary: "#aab8c9",
        textMuted: "#8191a5",
        border: "#29394d",
        borderStrong: "#35465b",
        accent: "#3988ff",
        accentHover: "#2f75df",
        accentSoft: "rgba(57, 136, 255, 0.15)",
        inputBg: "#101722",
        overlay: "rgba(0, 0, 0, 0.65)",
        shadow: "rgba(0, 0, 0, 0.25)"
    },

    ocean: {
        pageBg: "#101e26",
        sidebarBg: "#142b35",
        surface: "#1b3540",
        surfaceRaised: "#254957",
        surfaceHover: "#2c5968",
        textPrimary: "#f0fbff",
        textSecondary: "#b5d2dc",
        textMuted: "#83aab8",
        border: "#31515e",
        borderStrong: "#416b79",
        accent: "#24b8c7",
        accentHover: "#159aaa",
        accentSoft: "rgba(36, 184, 199, 0.15)",
        inputBg: "#101e26",
        overlay: "rgba(0, 0, 0, 0.65)",
        shadow: "rgba(0, 0, 0, 0.25)"
    },

    purple: {
        pageBg: "#191525",
        sidebarBg: "#211b32",
        surface: "#2a2340",
        surfaceRaised: "#382d52",
        surfaceHover: "#44365f",
        textPrimary: "#ffffff",
        textSecondary: "#c7bddc",
        textMuted: "#a094b9",
        border: "#413654",
        borderStrong: "#55466e",
        accent: "#a77bfa",
        accentHover: "#9060ed",
        accentSoft: "rgba(167, 123, 250, 0.15)",
        inputBg: "#191525",
        overlay: "rgba(0, 0, 0, 0.65)",
        shadow: "rgba(0, 0, 0, 0.25)"
    },

    forest: {
        pageBg: "#111d19",
        sidebarBg: "#192921",
        surface: "#20372b",
        surfaceRaised: "#2b4837",
        surfaceHover: "#355641",
        textPrimary: "#f4fff6",
        textSecondary: "#c0d8c5",
        textMuted: "#91b29a",
        border: "#34503c",
        borderStrong: "#45664e",
        accent: "#55c878",
        accentHover: "#3eae61",
        accentSoft: "rgba(85, 200, 120, 0.15)",
        inputBg: "#111d19",
        overlay: "rgba(0, 0, 0, 0.65)",
        shadow: "rgba(0, 0, 0, 0.25)"
    },

    light: {
        pageBg: "#f3f6fa",
        sidebarBg: "#ffffff",
        surface: "#ffffff",
        surfaceRaised: "#e9eef5",
        surfaceHover: "#e1e8f1",
        textPrimary: "#172333",
        textSecondary: "#526174",
        textMuted: "#758397",
        border: "#dce3ec",
        borderStrong: "#c5d0dd",
        accent: "#2878e5",
        accentHover: "#1d64c5",
        accentSoft: "rgba(40, 120, 229, 0.12)",
        inputBg: "#ffffff",
        overlay: "rgba(20, 30, 45, 0.5)",
        shadow: "rgba(20, 30, 45, 0.08)"
    }
};


// Apply a selected theme
function applyTheme(themeName) {

    const selectedTheme = themes[themeName] || themes.default;
    const root = document.documentElement;

    root.dataset.theme = themeName;

    Object.entries(selectedTheme).forEach(([key, value]) => {

        const variableName = "--" + key.replace(/[A-Z]/g, letter =>
            "-" + letter.toLowerCase()
        );

        root.style.setProperty(variableName, value);

    });

}


// Load saved theme
function loadTheme() {

    let savedTheme = "default";

    try {
        savedTheme = localStorage.getItem("collegehub-theme") || "default";
    } catch (error) {
        console.warn("Could not load saved theme:", error);
    }

    if (!themes[savedTheme]) {
        savedTheme = "default";
    }

    applyTheme(savedTheme);

    const themeSelect = document.getElementById("themeSelect");

    if (themeSelect) {
        themeSelect.value = savedTheme;

        themeSelect.addEventListener("change", function () {

            const selectedTheme = this.value;

            applyTheme(selectedTheme);

            try {
                localStorage.setItem("collegehub-theme", selectedTheme);
            } catch (error) {
                console.warn("Could not save theme:", error);
            }

        });
    }

}


// Initialise theme
loadTheme();
