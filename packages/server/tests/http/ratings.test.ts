import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import type { Movie } from "@theatre/shared";
import { app } from "../../src/index.js";
import { createTestMovie, resetDB, ZERO_UUID } from "../helpers.js";
import { createSession, type SessionUser, type TestAgent } from "./helpers.js";

let userAgent: TestAgent;
let user: SessionUser;
let movie: Movie;

beforeEach(async () => {
  await resetDB();
  ({ agent: userAgent, user } = await createSession("member"));
  movie = await createTestMovie();
});

describe("PUT /movies/:movieId/rating", () => {
  it("creates a rating", async () => {
    const res = await userAgent
      .put(`/movies/${movie.id}/rating`)
      .send({ rating: 8 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      userId: user.id,
      movieId: movie.id,
      rating: 8,
    });
  });

  it("updates an existing rating", async () => {
    await userAgent.put(`/movies/${movie.id}/rating`).send({ rating: 8 });
    const res = await userAgent
      .put(`/movies/${movie.id}/rating`)
      .send({ rating: 9 });

    expect(res.status).toBe(200);
    expect(res.body.rating).toBe(9);
  });

  it("feeds the movie's aggregate ratings end to end", async () => {
    await userAgent.put(`/movies/${movie.id}/rating`).send({ rating: 9 });

    const res = await userAgent.get(`/movies/${movie.id}`);
    expect(res.body).toMatchObject({
      ratingCount: 1,
      averageRating: 9,
      userRating: 9,
    });
  });

  it("rejects out-of-range ratings with 400", async () => {
    expect(
      (await userAgent.put(`/movies/${movie.id}/rating`).send({ rating: 0 }))
        .status,
    ).toBe(400);
    expect(
      (await userAgent.put(`/movies/${movie.id}/rating`).send({ rating: 11 }))
        .status,
    ).toBe(400);
  });

  it("rejects a missing rating with 400", async () => {
    const res = await userAgent.put(`/movies/${movie.id}/rating`).send({});

    expect(res.status).toBe(400);
  });

  it("requires authentication", async () => {
    const res = await request(app)
      .put(`/movies/${movie.id}/rating`)
      .send({ rating: 8 });

    expect(res.status).toBe(401);
  });

  it("rejects malformed movie ids with 400", async () => {
    const res = await userAgent.put("/movies/not-a-uuid/rating").send({
      rating: 8,
    });

    expect(res.status).toBe(400);
  });

  it("responds 404 when the movie does not exist", async () => {
    const res = await userAgent
      .put(`/movies/${ZERO_UUID}/rating`)
      .send({ rating: 8 });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /movies/:movieId/rating", () => {
  it("removes the rating", async () => {
    await userAgent.put(`/movies/${movie.id}/rating`).send({ rating: 9 });

    const res = await userAgent.delete(`/movies/${movie.id}/rating`);

    expect(res.status).toBe(204);
    const after = await userAgent.get(`/movies/${movie.id}`);
    expect(after.body).toMatchObject({
      ratingCount: 0,
      averageRating: null,
      userRating: null,
    });
  });

  it("responds 204 for a rating that does not exist", async () => {
    const res = await userAgent.delete(`/movies/${movie.id}/rating`);

    expect(res.status).toBe(204);
  });

  it("requires authentication", async () => {
    const res = await request(app).delete(`/movies/${movie.id}/rating`);

    expect(res.status).toBe(401);
  });

  it("rejects malformed movie ids with 400", async () => {
    const res = await userAgent.delete("/movies/not-a-uuid/rating");

    expect(res.status).toBe(400);
  });
});
