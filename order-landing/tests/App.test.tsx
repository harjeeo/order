import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../App";

describe("Landing page App", () => {
  it("renders every major section without crashing", () => {
    render(<App />);

    // Nav + hero
    expect(screen.getAllByText(/OrderDashboard/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /run your cafe like it's/i })).toBeInTheDocument();

    // Section headings
    expect(screen.getByRole("heading", { name: /everything a busy counter actually needs/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /twelve apps, one login/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /simple pricing, per outlet/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /loved by the counter/i })).toBeInTheDocument();

    // CTA + footer
    expect(screen.getByText(/create free account/i)).toBeInTheDocument();
    expect(screen.getByText(/all rights reserved/i)).toBeInTheDocument();
  });

  it("nav has Login and Sign up actions", () => {
    render(<App />);
    expect(screen.getByText(/^login$/i)).toBeInTheDocument();
    expect(screen.getByText(/^sign up$/i)).toBeInTheDocument();
  });
});
