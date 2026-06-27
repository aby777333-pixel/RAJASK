import type { Config } from "tailwindcss";

/**
 * RAJASK regal design tokens.
 *
 * Base palette: obsidian (throne dark) + ivory (parchment light).
 * Accent spectrum: the nine facets of the RAJASK logo, used functionally —
 * each Regalia subsystem is assigned one facet colour (see `subsystemColors`
 * in @rajask/ui). Gold is the sovereign primary.
 */
export const rajaskPreset: Partial<Config> = {
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // --- base ---
        obsidian: {
          DEFAULT: "#0B0B0F",
          50: "#1A1A22",
          100: "#15151B",
          200: "#101015",
          900: "#060608",
        },
        ivory: {
          DEFAULT: "#F7F5EF",
          muted: "#E7E3D8",
        },
        // sovereign primary
        gold: {
          DEFAULT: "#FDB913",
          deep: "#E59A00",
          soft: "#FFD45E",
        },
        // --- logo spectrum (the nine facets) ---
        spectrum: {
          purple: "#92278F",
          magenta: "#EC008C",
          crimson: "#E2231A",
          orange: "#F58220",
          gold: "#FDB913",
          lime: "#8DC63F",
          green: "#009444",
          teal: "#0093D0",
          blue: "#005DAA",
        },
        // semantic
        success: "#009444",
        warning: "#F58220",
        danger: "#E2231A",
        info: "#0093D0",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        regal: "0.875rem",
      },
      boxShadow: {
        throne: "0 10px 40px -12px rgba(0,0,0,0.6)",
        facet: "0 0 0 1px rgba(255,255,255,0.04), 0 8px 24px -12px rgba(0,0,0,0.5)",
      },
      backgroundImage: {
        "spectrum-arc":
          "linear-gradient(90deg,#92278F,#EC008C,#E2231A,#F58220,#FDB913,#8DC63F,#009444,#0093D0,#005DAA)",
      },
    },
  },
};

export default rajaskPreset;
