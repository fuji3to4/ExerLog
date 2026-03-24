import { afterEach } from "vitest";
import "fake-indexeddb/auto";
import "@testing-library/jest-dom";

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.lang = "";
  delete document.documentElement.dataset.language;
});
