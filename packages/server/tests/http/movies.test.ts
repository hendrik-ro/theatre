import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/index.js";
import { populateTestData, resetDB, ZERO_UUID } from "../helpers.js";
import { rateMovie } from "../../src/db/queries/movieRatings.js";
import { createSession, type SessionUser, type TestAgent } from "./helpers.js";

let fixture: Awaited<ReturnType<typeof populateTestData>>;
let adminAgent: TestAgent;
let userAgent: TestAgent;
let normalUser: SessionUser;

// "firstAdmin" registers first and claims the bootstrap admin role; "userAgent" is
// a regular user. populateTestData's fixture users (admin, user, user2,
// user3) are DB-created and stay regular users regardless of order.
beforeEach(async () => {
  await resetDB();
  ({ agent: adminAgent } = await createSession("firstAdmin"));
  ({ agent: userAgent, user: normalUser } = await createSession("userAgent"));
  fixture = await populateTestData();
});

const matrixId = () =>
  fixture.movies.find((movie) => movie.name === "The Matrix")!.id;

describe("GET /movies", () => {
  it("returns the first page with pagination metadata", async () => {
    const res = await request(app).get("/movies");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      page: 1,
      limit: 20,
      total: 22,
      totalPages: 2,
    });
    expect(res.body.movies).toHaveLength(20);
  });

  it("paginates", async () => {
    const res = await request(app).get("/movies?page=2&limit=20");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 2, totalPages: 2 });
    expect(res.body.movies).toHaveLength(2);
  });

  it("enriches rated movies only for the authenticated user", async () => {
    await rateMovie({ userId: normalUser.id, movieId: matrixId(), rating: 7 });

    const anon = await request(app).get("/movies?limit=100");
    const authed = await userAgent.get("/movies?limit=100");

    expect(anon.status).toBe(200);
    expect(authed.status).toBe(200);
    const anonMatrix = anon.body.movies.find(
      (m: { id: string }) => m.id === matrixId(),
    );
    const authedMatrix = authed.body.movies.find(
      (m: { id: string }) => m.id === matrixId(),
    );
    expect(anonMatrix.userRating).toBe(null);
    expect(authedMatrix).toMatchObject({
      userRating: 7,
      ratingCount: 3,
      averageRating: 7.7,
    });
  });

  it("filters by genre", async () => {
    const res = await request(app).get("/movies?genre=western");

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    for (const movie of res.body.movies) {
      expect(movie.genre).toBe("western");
    }
  });

  it("searches names case-insensitively", async () => {
    const res = await request(app).get("/movies?search=matrix");

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.movies[0].name).toBe("The Matrix");
  });

  it("sorts by year ascending and descending", async () => {
    const asc = await request(app).get("/movies?sortBy=year&limit=1");
    const desc = await request(app).get(
      "/movies?sortBy=year&order=desc&limit=1",
    );

    expect(asc.body.movies[0].name).toBe("Man with a Movie Camera");
    expect(desc.body.movies[0].name).toBe("Parasite");
  });

  it("sorts by average rating ascending, unrated last", async () => {
    const res = await request(app).get(
      "/movies?sortBy=averageRating&order=asc&limit=1",
    );

    expect(res.status).toBe(200);
    expect(res.body.movies[0].averageRating).toBe(8);
  });

  it("sorts by average rating descending, unrated last", async () => {
    const res = await request(app).get(
      "/movies?sortBy=averageRating&order=desc&limit=1",
    );

    expect(res.status).toBe(200);
    expect(res.body.movies[0]).toMatchObject({
      name: "The Godfather",
      averageRating: 9,
    });
  });

  it("sorts by the caller's rating descending, rated movies first", async () => {
    await rateMovie({ userId: normalUser.id, movieId: matrixId(), rating: 7 });

    const res = await userAgent.get(
      "/movies?sortBy=userRating&order=desc&limit=1",
    );

    expect(res.status).toBe(200);
    expect(res.body.movies[0]).toMatchObject({
      name: "The Matrix",
      userRating: 7,
    });
  });

  it("filters by the authenticated user's rating", async () => {
    await rateMovie({ userId: normalUser.id, movieId: matrixId(), rating: 7 });

    const res = await userAgent.get("/movies?userRating=7&limit=100");

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.movies[0].name).toBe("The Matrix");
  });

  it("rejects an anonymous userRating filter with 400", async () => {
    const res = await request(app).get("/movies?userRating=5");

    expect(res.status).toBe(400);
  });

  it("rejects invalid query parameters with 400", async () => {
    expect((await request(app).get("/movies?limit=101")).status).toBe(400);
    expect((await request(app).get("/movies?page=0")).status).toBe(400);
    expect((await request(app).get("/movies?genre=noir")).status).toBe(400);
    expect((await request(app).get("/movies?sortBy=popularity")).status).toBe(
      400,
    );
  });
});

describe("GET /movies/:movieId", () => {
  it("returns a movie with aggregate ratings", async () => {
    const res = await request(app).get(`/movies/${matrixId()}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      name: "The Matrix",
      averageRating: 8,
      ratingCount: 2,
      userRating: null,
    });
  });

  it("returns the caller's own rating when authenticated", async () => {
    await rateMovie({ userId: normalUser.id, movieId: matrixId(), rating: 7 });

    const res = await userAgent.get(`/movies/${matrixId()}`);

    expect(res.status).toBe(200);
    expect(res.body.userRating).toBe(7);
  });

  it("responds 404 for unknown ids", async () => {
    const res = await request(app).get(`/movies/${ZERO_UUID}`);

    expect(res.status).toBe(404);
  });

  it("rejects malformed ids with 400", async () => {
    const res = await request(app).get("/movies/not-a-uuid");

    expect(res.status).toBe(400);
  });
});

describe("POST /movies", () => {
  it("creates a movie", async () => {
    const res = await userAgent.post("/movies").send({
      name: "Nanook of the North",
      year: 1922,
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: "Nanook of the North",
      year: 1922,
    });
    expect(typeof res.body.id).toBe("string");
  });

  it("requires authentication", async () => {
    const res = await request(app).post("/movies").send({ name: "New Movie" });

    expect(res.status).toBe(401);
  });

  it("rejects an invalid body with 400", async () => {
    const res = await userAgent.post("/movies").send({ name: "", year: 3000 });

    expect(res.status).toBe(400);
  });
});

describe("PATCH /movies/:movieId", () => {
  it("updates fields", async () => {
    const res = await userAgent
      .patch(`/movies/${matrixId()}`)
      .send({ name: "Matrix" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: "Matrix", year: 1999 });
  });

  it("requires authentication", async () => {
    const res = await request(app)
      .patch(`/movies/${matrixId()}`)
      .send({ name: "Matrix" });

    expect(res.status).toBe(401);
  });

  it("responds 404 for unknown ids", async () => {
    const res = await userAgent
      .patch(`/movies/${ZERO_UUID}`)
      .send({ name: "Matrix" });

    expect(res.status).toBe(404);
  });

  it("rejects an empty patch with 400", async () => {
    const res = await userAgent.patch(`/movies/${matrixId()}`).send({});

    expect(res.status).toBe(400);
  });
});

describe("DELETE /movies/:movieId", () => {
  it("deletes as admin", async () => {
    const res = await adminAgent.delete(`/movies/${matrixId()}`);

    expect(res.status).toBe(204);
    expect((await request(app).get(`/movies/${matrixId()}`)).status).toBe(404);
    expect((await request(app).get("/movies")).body.total).toBe(21);
  });

  it("forbids normal users with 403", async () => {
    const res = await userAgent.delete(`/movies/${matrixId()}`);

    expect(res.status).toBe(403);
  });

  it("requires authentication", async () => {
    const res = await request(app).delete(`/movies/${matrixId()}`);

    expect(res.status).toBe(401);
  });

  it("responds 204 for unknown ids", async () => {
    const res = await adminAgent.delete(`/movies/${ZERO_UUID}`);

    expect(res.status).toBe(204);
  });
});
