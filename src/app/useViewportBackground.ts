import { useEffect } from "react";

const VIEWPORT_BG_COLOR_VAR = "--viewport-bg-color";
const VIEWPORT_BG_IMAGE_VAR = "--viewport-bg-image";

export function useViewportBackground({
  color,
  image = "none",
}: {
  color: string;
  image?: string;
}) {
  useEffect(() => {
    const rootStyle = document.documentElement.style;
    const previousColor = rootStyle.getPropertyValue(VIEWPORT_BG_COLOR_VAR);
    const previousImage = rootStyle.getPropertyValue(VIEWPORT_BG_IMAGE_VAR);

    rootStyle.setProperty(VIEWPORT_BG_COLOR_VAR, color);
    rootStyle.setProperty(VIEWPORT_BG_IMAGE_VAR, image);

    return () => {
      if (previousColor) {
        rootStyle.setProperty(VIEWPORT_BG_COLOR_VAR, previousColor);
      } else {
        rootStyle.removeProperty(VIEWPORT_BG_COLOR_VAR);
      }

      if (previousImage) {
        rootStyle.setProperty(VIEWPORT_BG_IMAGE_VAR, previousImage);
      } else {
        rootStyle.removeProperty(VIEWPORT_BG_IMAGE_VAR);
      }
    };
  }, [color, image]);
}
