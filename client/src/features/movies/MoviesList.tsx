import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getMovies, getMoviesMetaData } from "../../api/movies";
import type { Movie, MoviesMeta } from "../../types/movie";
import MovieFilters from "./MovieFilters";
import type { GenreFilter, YearFilter } from "./MovieFilters";

type SortKey = "name" | "year" | "runtime" | "imdb" | "genre";
type SortDir = "asc" | "desc";

const SORT_ACCESSORS: Record<
  SortKey,
  (movie: Movie) => string | null | number
> = {
  name: (movie) => movie.name,
  year: (movie) => movie.year,
  runtime: (movie) => movie.runtime,
  imdb: (movie) => movie.imdbRating,
  genre: (movie) => movie.genre,
};

const TEXT_KEYS: SortKey[] = ["name", "genre"];

function compareMovies(a: Movie, b: Movie, key: SortKey, dir: SortDir) {
  const av = SORT_ACCESSORS[key](a);
  const bv = SORT_ACCESSORS[key](b);
  if (av === null && bv === null) return 0;
  if (av === null) return 1;
  if (bv === null) return -1;
  const cmp = TEXT_KEYS.includes(key)
    ? String(av).localeCompare(String(bv))
    : Number(av) - Number(bv);
  return dir === "asc" ? cmp : -cmp;
}

export default function MoviesList() {
  const [movies, setMovies] = useState<Movie[] | null>(null);
  const [meta, setMeta] = useState<MoviesMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("year");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [yearFilter, setYearFilter] = useState<YearFilter>(null);
  const [genreFilter, setGenreFilter] = useState<GenreFilter>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getMovies(), getMoviesMetaData()])
      .then(([movieList, moviesMeta]) => {
        if (!cancelled) {
          setMovies(movieList);
          setMeta(moviesMeta);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load movies",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleMovies = useMemo(() => {
    if (movies === null) return null;
    const filtered = movies.filter(
      (movie) =>
        (yearFilter === null ||
          (yearFilter === "unknown"
            ? movie.year === null
            : movie.year === yearFilter)) &&
        (genreFilter === null ||
          (genreFilter === "unknown"
            ? movie.genre === null
            : movie.genre === genreFilter)),
    );
    return filtered.sort((a, b) => compareMovies(a, b, sortKey, sortDir));
  }, [movies, yearFilter, genreFilter, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function sortHeader(key: SortKey, label: string) {
    const active = sortKey === key;
    return (
      <th
        aria-sort={
          active ? (sortDir === "asc" ? "ascending" : "descending") : "none"
        }
      >
        <button
          type="button"
          className={active ? "table__sort table__sort--active" : "table__sort"}
          onClick={() => handleSort(key)}
        >
          {label}
          {active && (sortDir === "asc" ? " \u2191" : " \u2193")}
        </button>
      </th>
    );
  }

  function clearFilters() {
    setYearFilter(null);
    setGenreFilter(null);
  }

  const hasMovies = (movies?.length ?? 0) > 0;

  return (
    <section className="page">
      <header className="page__header page__header--row">
        <div>
          <h1>Movies</h1>
          <p className="page__subtitle">Watched films, tracked here.</p>
        </div>
        <Link className="page__action" to="/movies/new">
          Add movie
        </Link>
      </header>

      <div className="panel">
        <h2>Library</h2>
        {error && <p className="form__error">{error}</p>}
        {movies === null && !error && <p className="muted">Loading…</p>}
        {movies !== null && movies.length === 0 && (
          <>
            <p className="muted">No movies yet.</p>
            <Link className="panel__action" to="/movies/new">
              Add the first movie
            </Link>
          </>
        )}
        {meta !== null && hasMovies && (
          <MovieFilters
            meta={meta}
            year={yearFilter}
            genre={genreFilter}
            onYearChange={setYearFilter}
            onGenreChange={setGenreFilter}
          />
        )}
        {hasMovies && visibleMovies !== null && visibleMovies.length === 0 && (
          <>
            <p className="muted">No movies match the current filters.</p>
            <button type="button" onClick={clearFilters}>
              Clear filters
            </button>
          </>
        )}
        {visibleMovies !== null && visibleMovies.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                {sortHeader("name", "Name")}
                {sortHeader("year", "Year")}
                {sortHeader("runtime", "Runtime")}
                {sortHeader("imdb", "IMDb")}
                {sortHeader("genre", "Genre")}
              </tr>
            </thead>
            <tbody>
              {visibleMovies.map((movie) => (
                <tr key={movie.id}>
                  <td>
                    <Link to={`/movies/${movie.id}`} className="table__link">
                      {movie.name}
                    </Link>
                  </td>
                  <td>{movie.year ?? "—"}</td>
                  <td>
                    {movie.runtime !== null ? `${movie.runtime} min` : "—"}
                  </td>
                  <td>{movie.imdbRating ?? "—"}</td>
                  <td>{movie.genre ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
