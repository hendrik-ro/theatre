import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/index.js";
import { createTestMovie, resetDB, ZERO_UUID } from "../helpers.js";
import { createSession, type TestAgent } from "./helpers.js";

let adminAgent: TestAgent;
let userAgent: TestAgent;
let matrixId: string;
let inceptionId: string;

beforeEach(async () => {
  await resetDB();
  ({ agent: adminAgent } = await createSession("adminAgent"));
  ({ agent: userAgent } = await createSession("userAgent"));
  matrixId = (await createTestMovie()).id;
  inceptionId = (await createTestMovie({ name: "Inception", year: 2010 })).id;
});

describe("GET /users/watchlist", () => {
  it("returns an empty watchlist", async () => {
    const res = await adminAgent.get("/users/watchlist");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      movies: [],
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it("lists the caller's watchlisted movies", async () => {
    await adminAgent.post(`/users/watchlist/${matrixId}`);

    const res = await adminAgent.get("/users/watchlist");

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.movies).toMatchObject([{ id: matrixId }]);
  });

  it("contains only the caller's own entries", async () => {
    await adminAgent.post(`/users/watchlist/${matrixId}`);
    await userAgent.post(`/users/watchlist/${inceptionId}`);

    const res = await adminAgent.get("/users/watchlist");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 1 });
    expect(res.body.movies).toMatchObject([{ id: matrixId }]);
  });

  it("supports the movies query parameters", async () => {
    await adminAgent.post(`/users/watchlist/${matrixId}`);
    await adminAgent.post(`/users/watchlist/${inceptionId}`);

    const res = await adminAgent
      .get("/users/watchlist")
      .query("limit=1&sortBy=year&order=desc");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 2, page: 1, limit: 1 });
    expect(res.body.movies).toMatchObject([{ name: "Inception" }]);
  });

  it("requires authentication", async () => {
    const res = await request(app).get("/users/watchlist");

    expect(res.status).toBe(401);
  });
});

describe("POST /users/watchlist/:movieId", () => {
  it("adds a movie and returns 204", async () => {
    const res = await adminAgent.post(`/users/watchlist/${matrixId}`);

    expect(res.status).toBe(204);
    const list = await adminAgent.get("/users/watchlist");
    expect(list.body).toMatchObject({ total: 1 });
    expect(list.body.movies).toMatchObject([{ id: matrixId }]);
  });

  it("is idempotent on re-add", async () => {
    expect((await adminAgent.post(`/users/watchlist/${matrixId}`)).status).toBe(
      204,
    );
    expect((await adminAgent.post(`/users/watchlist/${matrixId}`)).status).toBe(
      204,
    );

    const list = await adminAgent.get("/users/watchlist");
    expect(list.body.total).toBe(1);
  });

  it("requires authentication", async () => {
    const res = await request(app).post(`/users/watchlist/${matrixId}`);

    expect(res.status).toBe(401);
  });

  it("rejects malformed movie ids with 400", async () => {
    const res = await adminAgent.post("/users/watchlist/not-a-uuid");

    expect(res.status).toBe(400);
  });

  it("responds 404 when the movie does not exist", async () => {
    const res = await adminAgent.post(`/users/watchlist/${ZERO_UUID}`).send();

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Movie not found" });
  });
});

describe("DELETE /users/watchlist/:movieId", () => {
  it("removes a watchlisted movie", async () => {
    await adminAgent.post(`/users/watchlist/${matrixId}`);

    const res = await adminAgent.delete(`/users/watchlist/${matrixId}`);

    expect(res.status).toBe(204);
    const list = await adminAgent.get("/users/watchlist");
    expect(list.body).toEqual({
      movies: [],
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it("responds 204 when the entry does not exist", async () => {
    const res = await adminAgent.delete(`/users/watchlist/${matrixId}`);

    expect(res.status).toBe(204);
  });

  it("requires authentication", async () => {
    const res = await request(app).delete(`/users/watchlist/${matrixId}`);

    expect(res.status).toBe(401);
  });

  it("rejects malformed movie ids with 400", async () => {
    const res = await adminAgent.delete("/users/watchlist/not-a-uuid");

    expect(res.status).toBe(400);
  });
});

describe("GET /users/watchlist enrichment", () => {
  it("enriches entries with the caller's rating", async () => {
    await adminAgent.post(`/users/watchlist/${matrixId}`);
    await adminAgent.put(`/movies/${matrixId}/rating`).send({ rating: 9 });

    const res = await adminAgent.get("/users/watchlist");

    expect(res.status).toBe(200);
    expect(res.body.movies).toMatchObject([
      {
        id: matrixId,
        userRating: 9,
        averageRating: 9,
        ratingCount: 1,
      },
    ]);
  });
});
