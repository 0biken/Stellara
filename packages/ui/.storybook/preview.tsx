import { useEffect } from "react";

import "../src/styles.css";
import { applyThemeChoice } from "../src/theme.js";

import type { Preview } from "@storybook/react-vite";
import type { ReactNode } from "react";

function Canvas({ theme, children }: { theme: "light" | "dark"; children: ReactNode }) {
  useEffect(() => {
    applyThemeChoice(theme);
  }, [theme]);
  return (
    <div data-story-root className="min-h-24 w-full p-5 font-sans">
      {children}
    </div>
  );
}

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Theme",
      toolbar: { icon: "paintbrush", items: ["light", "dark"], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: "light" },
  decorators: [
    (Story, context) => (
      <Canvas theme={context.globals.theme === "dark" ? "dark" : "light"}>
        <Story />
      </Canvas>
    ),
  ],
  parameters: { layout: "fullscreen", a11y: { test: "error" }, controls: { expanded: true } },
};
export default preview;
