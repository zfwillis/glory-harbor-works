import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SermonsHub from "../../src/pages/SermonsHub";

vi.mock("../../src/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../../src/context/AuthContext";

describe("SermonsHub Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sermons: [
          {
            _id: "sermon-1",
            title: "Faith To Win",
            speaker: "Pastor Victor",
            type: "audio",
            url: "https://example.com/audio.mp3",
            likesCount: 0,
            liked: false,
          },
        ],
      }),
    });

    useAuth.mockReturnValue({
      token: "token-123",
      isAuthenticated: true,
      user: { role: "leader" },
    });
  });

  it("should hide edit/delete actions until Manage Sermons is opened", async () => {
    render(<SermonsHub />);

    await waitFor(() => {
      expect(screen.getByText(/Faith To Win/i)).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /Manage Sermons/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Delete$/i })).not.toBeInTheDocument();
  });

  it("should show edit/delete actions after opening Manage Sermons", async () => {
    render(<SermonsHub />);

    await waitFor(() => {
      expect(screen.getByText(/Faith To Win/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Manage Sermons/i }));

    expect(screen.getByRole("button", { name: /^Edit$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Delete$/i })).toBeInTheDocument();
  });

  it("should hide management actions after closing Manage Sermons", async () => {
    render(<SermonsHub />);

    await waitFor(() => {
      expect(screen.getByText(/Faith To Win/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Manage Sermons/i }));
    expect(screen.getByRole("button", { name: /^Edit$/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Close/i }));

    expect(screen.queryByRole("button", { name: /^Edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Delete$/i })).not.toBeInTheDocument();
  });
});
