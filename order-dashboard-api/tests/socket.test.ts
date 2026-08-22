import http from "http";
import { AddressInfo } from "net";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";
import jwt from "jsonwebtoken";
import { app } from "../src/app";
import { prisma } from "../src/prisma";
import { initSocket, notifyOutlet } from "../src/socket";
import { createTenantWithAdmin, deleteTenant } from "./helpers";

const JWT_SECRET = process.env.JWT_SECRET ?? "test-secret";

describe("real-time updates (socket.io)", () => {
  let server: http.Server;
  let baseUrl: string;
  let tenantId: string;
  let outletId: string;
  let token: string;

  beforeAll(async () => {
    const t = await createTenantWithAdmin("Socket Test Cafe");
    tenantId = t.tenant.id;
    outletId = t.outlet.id;
    token = t.token;

    server = http.createServer(app);
    initSocket(server);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    await deleteTenant(tenantId);
    await prisma.$disconnect();
  });

  function connect(authToken: string | undefined): Promise<ClientSocket> {
    return new Promise((resolve, reject) => {
      const socket = ioClient(baseUrl, { auth: { token: authToken }, forceNew: true, reconnection: false });
      socket.on("connect", () => resolve(socket));
      socket.on("connect_error", (err) => reject(err));
    });
  }

  it("rejects a connection with no token", async () => {
    await expect(connect(undefined)).rejects.toThrow();
  });

  it("rejects a connection with an MFA-pending token", async () => {
    const mfaToken = jwt.sign({ id: "u1", purpose: "mfa" }, JWT_SECRET, { expiresIn: "10m" });
    await expect(connect(mfaToken)).rejects.toThrow();
  });

  it("accepts a connection with a valid session token", async () => {
    const socket = await connect(token);
    expect(socket.connected).toBe(true);
    socket.close();
  });

  it("delivers a notifyOutlet event only to clients that joined that outlet's room", async () => {
    const joined = await connect(token);
    const other = await createTenantWithAdmin("Socket Test Cafe Other");
    const notJoined = await connect(other.token);

    joined.emit("join-outlet", outletId);
    await new Promise((r) => setTimeout(r, 150));

    const received: string[] = [];
    joined.on("orders:changed", () => received.push("joined"));
    notJoined.on("orders:changed", () => received.push("not-joined"));

    notifyOutlet(outletId, "orders:changed");
    await new Promise((r) => setTimeout(r, 150));

    expect(received).toEqual(["joined"]);

    joined.close();
    notJoined.close();
    await deleteTenant(other.tenant.id);
  });

  it("joins the tenant's default outlet when no outletId is sent (single-outlet tenants have nothing stored client-side)", async () => {
    const socket = await connect(token);
    socket.emit("join-outlet", "");
    await new Promise((r) => setTimeout(r, 150));

    const received: string[] = [];
    socket.on("orders:changed", () => received.push("got-it"));
    notifyOutlet(outletId, "orders:changed");
    await new Promise((r) => setTimeout(r, 150));

    expect(received).toEqual(["got-it"]);
    socket.close();
  });

  it("does not let a client join an outlet from a different tenant", async () => {
    const other = await createTenantWithAdmin("Socket Test Cafe Cross-Tenant");
    const socket = await connect(other.token);

    socket.emit("join-outlet", outletId); // outletId belongs to the FIRST tenant
    await new Promise((r) => setTimeout(r, 150));

    const received: string[] = [];
    socket.on("orders:changed", () => received.push("got-it"));
    notifyOutlet(outletId, "orders:changed");
    await new Promise((r) => setTimeout(r, 150));

    expect(received).toEqual([]);
    socket.close();
    await deleteTenant(other.tenant.id);
  });
});
