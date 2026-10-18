import "@testing-library/jest-dom/vitest";

// jsdom does not implement matchMedia, which some components probe.
if (!window.matchMedia) {
  window.matchMedia = () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  });
}
