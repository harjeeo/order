import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../App";

describe("Landing page App", () => {
  it("renders every major section without crashing", () => {
    render(<App />);

    // Nav + hero
    expect(screen.getAllByText(/OrderDashboard/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /smarter tools for better cafe outcomes/i })).toBeInTheDocument();

    // Section headings
    expect(screen.getByRole("heading", { name: /work smarter, grow faster/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /simple tools\. powerful results/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /we make work feel effortless/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /why businesses choose us/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /our simple pricing plan/i })).toBeInTheDocument();

    // CTA + footer
    expect(screen.getByText(/get up and running in just a few minutes/i)).toBeInTheDocument();
    expect(screen.getByText(/all rights reserved/i)).toBeInTheDocument();
  });

  it("nav has Log In and Contact Us actions", () => {
    render(<App />);
    expect(screen.getByText(/^log in$/i)).toBeInTheDocument();
    expect(screen.getByText(/^contact us$/i)).toBeInTheDocument();
  });
});
