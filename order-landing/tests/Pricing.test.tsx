import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Pricing from "../components/landing/Pricing";

describe("Pricing", () => {
  it("renders all three plans matching the backend's TenantPlan enum", () => {
    render(<Pricing />);
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("Basic")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
  });

  it("marks Basic as the highlighted plan", () => {
    render(<Pricing />);
    expect(screen.getByText(/most popular/i)).toBeInTheDocument();
  });
});
