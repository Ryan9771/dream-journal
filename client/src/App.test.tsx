import { render, screen } from "@testing-library/react";

jest.mock("@tiptap/react", () => ({
  EditorContent: () => null,
  useEditor: () => null,
}));
jest.mock("@tiptap/starter-kit", () => ({
  __esModule: true,
  default: { configure: () => ({}) },
}));
jest.mock("@tiptap/extension-placeholder", () => ({
  __esModule: true,
  default: { configure: () => ({}) },
}));
jest.mock("@tiptap/extension-character-count", () => ({
  __esModule: true,
  default: { configure: () => ({}) },
}));

import App from "./App";

test("renders the Recall sign-in experience", async () => {
  render(<App />);

  expect(await screen.findByText("Recall")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /continue with google/i })).toBeDisabled();
  expect(screen.getByRole("alert")).toHaveTextContent(/missing firebase configuration/i);
  expect(screen.getByText(/your dreams belong to you/i)).toBeInTheDocument();
});
