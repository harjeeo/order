import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Avatar from "../components/Avatar";

describe("Avatar", () => {
  it("renders the first letter of the name, uppercased", () => {
    render(<Avatar name="tanvir kalsi" />);
    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("falls back to a question mark for an empty name", () => {
    render(<Avatar name="" />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("applies the requested pixel size", () => {
    render(<Avatar name="Amit" size={40} />);
    const el = screen.getByText("A");
    expect(el).toHaveStyle({ width: "40px", height: "40px" });
  });

  it("assigns the same color to the same name consistently", () => {
    const { container: c1 } = render(<Avatar name="Repeatable Name" />);
    const { container: c2 } = render(<Avatar name="Repeatable Name" />);
    const class1 = c1.querySelector("span")?.className;
    const class2 = c2.querySelector("span")?.className;
    expect(class1).toBe(class2);
  });
});
