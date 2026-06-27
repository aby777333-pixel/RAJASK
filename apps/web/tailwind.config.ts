import type { Config } from "tailwindcss";
import { rajaskPreset } from "@rajask/config/tailwind.preset";

const config: Config = {
  presets: [rajaskPreset as Config],
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};

export default config;
