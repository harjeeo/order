import { Request } from "express";

export function parsePagination(req: Request, defaultSize = 20, maxSize = 100) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(maxSize, Math.max(1, Number(req.query.pageSize) || defaultSize));
  return { page, pageSize };
}
