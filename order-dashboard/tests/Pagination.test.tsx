import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Pagination from "../components/Pagination";

describe("Pagination", () => {
  it("renders nothing when total is 0", () => {
    const { container } = render(<Pagination page={1} pageSize={20} total={0} onPageChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the correct range and page count", () => {
    render(<Pagination page={2} pageSize={20} total={45} onPageChange={() => {}} />);
    expect(screen.getByText(/showing 21–40 of 45/i)).toBeInTheDocument();
    expect(screen.getByText(/page 2 of 3/i)).toBeInTheDocument();
  });

  it("caps the \"to\" value at the total on the last page", () => {
    render(<Pagination page={3} pageSize={20} total={45} onPageChange={() => {}} />);
    expect(screen.getByText(/showing 41–45 of 45/i)).toBeInTheDocument();
  });

  it("disables Prev on page 1 and Next on the last page", () => {
    render(<Pagination page={1} pageSize={20} total={20} onPageChange={() => {}} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeDisabled();
  });

  it("calls onPageChange with the next/prev page on click", () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} pageSize={20} total={100} onPageChange={onPageChange} />);
    const [prevButton, nextButton] = screen.getAllByRole("button");

    fireEvent.click(nextButton);
    expect(onPageChange).toHaveBeenCalledWith(3);

    fireEvent.click(prevButton);
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});
