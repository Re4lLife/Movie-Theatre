import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useRef, useState } from 'react';
import { useKey } from './useKey'

const apiKey = import.meta.env.VITE_OMDB_API_KEY;
const youtubeApiKey = import.meta.env.VITE_YOUTUBE_API_KEY;

async function fetchYouTubeTrailer(title) {
  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${title} trailer&type=video&maxResults=1&key=${youtubeApiKey}`);
    const data = await res.json();

    // Extract videoId of the first video in the search result
    const videoId = data.items[0]?.id?.videoId;

    // Return full embed URL if found, else return null
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch (err) {
    console.error("Failed to fetch YouTube data: " + err);
    return null;
  }
}

function App() {
  //Array for the queried movie
  const [movies, setMovies] = useState([]);

  //State for search query
  const [query, setQuery] = useState("");

  //State for error msg to display in the "MovieSection" component based api error response.
  const [errorMsg, setErrorMsg] = useState("");

  //Loading state for the movie section
  const [isLoading, SetIsLoading] = useState(false);

  //State that takes selected movie ID - updates to new movie ID when clicked
  const [selectedId, setSelectedId] = useState();

  //State for movie details
  const [isOpen, setIsOpen] = useState(false);

  //state for watched movie list
  const [watchMovieList, setWatchedMovie] = useState(() => {
    const stored = localStorage.getItem("movieList");
    return stored ? JSON.parse(stored) : [];
  });

  //state for watch list
  const [watchisOpen, setWatchisOpen] = useState(false);

  function ToggleWatchList() {
    setWatchisOpen(prev => !prev);
  }

  function handleQuerySearch(e) {
    setQuery(e.target.value)
  }

  function handleCloseMovie() {
    setSelectedId(null)
    setIsOpen(false)
  }

  useEffect(function () {
    const controller = new AbortController();

    async function fetchMovies() {
      try {
        SetIsLoading(true);
        const res = await fetch(`http://www.omdbapi.com/?apikey=${apiKey}&s=${query}`, { signal: controller.signal });

        if (!res.ok) throw Error("Something went wrong, please check your connection and try again");

        const data = await res.json();

        if (data.Error === "Incorrect IMDb ID.") throw Error("Search your favorite movie");
        if (data.Error === "Too many results.") throw Error("Please complete your search query.")
        if (data.Response === "False") throw Error(data.Error);

        setMovies(data.Search);
        SetIsLoading(false);

        if (data.Search) {
          setMovies(data.Search);

          if (data.Error === "Too many results.") {
            setErrorMsg("⚠ Too many results. Showing only first 10.");
          } else {
            setErrorMsg("");
          }
        } else {
          throw Error(data.Error);
        }
      } catch (err) {
        if (err.name === "AbortError") {
          console.log("Fetch aborted"); // Silent skip
          return;
        }
        setErrorMsg(err.message || "Something went wrong");
      } finally {
        SetIsLoading(false)
      }
    }

    fetchMovies()
    return () => {
      controller.abort();
    }
  }, [query]);

  useEffect(function () {
    localStorage.setItem("movieList", JSON.stringify(watchMovieList));
  }, [watchMovieList]);

  function handleSelectedMovie(id) {
    setSelectedId(id);
    setIsOpen(true)
  }

  function addToWatchList(movie) {
    setWatchedMovie(watchMovieList => {
      const alreadyExist = watchMovieList.some(m => m.imdbID === movie.imdbID);
      if (alreadyExist) {
        alert("🎬 Movie already in your watchlist!");
        return watchMovieList;
      }
      return [...watchMovieList, movie];
    });
  }

  function deleteFromWatchList(id) {
    setWatchedMovie(watchMovieList =>
      watchMovieList.filter(movie => movie.imdbID !== id)
    )
  }

  return (
    <>
      <TopNavBar
        query={query}
        onSearch={handleQuerySearch}
        ToggleWatchList={ToggleWatchList}
        watchMovieList={watchMovieList}
        setQuery={setQuery}
      />

      <MovieSection
        movies={movies}
        errorMsg={errorMsg}
        isLoading={isLoading}
        onSelectMovie={handleSelectedMovie}
      />

      <SelectedMovieDetails
        selectedId={selectedId}
        isOpen={isOpen}
        onCloseMovie={handleCloseMovie}
        watchLater={addToWatchList}
      />

      <WatchMovieLater
        watchMovieList={watchMovieList}
        onDeleteMovie={deleteFromWatchList}
        watchisOpen={watchisOpen}
      />

      <Footer />
    </>
  )
}

function TopNavBar({ query, setQuery, onSearch, ToggleWatchList, watchMovieList }) {
  //Initialized useRef to reference the input element
  const inputEl = useRef(null);

  useKey(() => {
    if (document.activeElement === inputEl.current) return;
    inputEl.current.focus();
    setQuery("");
  }, "Enter")

  return (
    <div className="topNavBar">
      <label className="logo">
        Movie<br />Theatre
      </label>

      <input
        type="text"
        placeholder="Search your favorite movie here."
        value={query}
        onChange={onSearch}
        ref={inputEl}
      />

      <div onClick={ToggleWatchList}>
        <Button
          WIDTH="95px"
          HEIGHT="40px"
          BGCOLOR="white"
          COLOR="grey"
          BORDER="1px solid grey"
          BORDERRADIUS="5px"
        >
          Watch later ({watchMovieList.length})
        </Button>
      </div>

      <span>Sign in</span>
    </div>
  );
}

function MovieSection({ movies, errorMsg, isLoading, onSelectMovie }) {

  return (
    <div className='movieSection'>
      {!errorMsg && !isLoading &&
        movies.map(movie =>
          <MovieCard
            key={movie.imdbID}
            imdbID={movie.imdbID}
            photo={movie.Poster}
            title={movie.Title}
            onSelectMovie={onSelectMovie}
          />
        )}

      {errorMsg && (
        <div className="errorContainer">
          <ErrorMessage errorMsg={errorMsg} />
        </div>
      )}

      {isLoading && (<LoadingMovies />)}
    </div>
  );
}

function MovieCard({ photo, title, imdbID, onSelectMovie }) {
  return (
    <div className='movieCard' onClick={() => onSelectMovie(imdbID)}>
      <img src={photo} />
      <p>{title}</p>
    </div>
  );
}

function ErrorMessage({ errorMsg }) {
  return (
    <div className='errorContainer'>
      <p className='errorMessage'>{errorMsg}</p>
    </div>
  )
}

function LoadingMovies() {
  return (
    <div className='loadingContainer'>
      <div className='movieLoader' />
    </div>
  )
}

//For the selected movies' details popup.
function SelectedMovieDetails({ selectedId, isOpen, onCloseMovie, watchLater }) {
  const [movieDetails, setMovieDetails] = useState({});
  const [isLoading, SetIsLoading] = useState(false);
  const [trailerURL, setTrailerURL] = useState(null);
  const [toggleTrailer, setToggleTrailer] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const {
    Title,
    Language,
    Genre,
    Poster,
    Actors,
    Released,
    imdbRating,
    Director,
    Runtime,
    Plot,
  } = movieDetails;

  useEffect(() => {
    if (!Title) return;
    document.title = `${Title}`
    return function () {
      document.title = "Movie Theatre"
    }
  }, [Title]);

  //Hook for Escape and Backspace key press to close movie details.
  useKey(onCloseMovie, "Escape", "Backspace");

  useEffect(function () {
    if (!Title) return;
    async function getTrailerURL() {
      const url = await fetchYouTubeTrailer(Title);
      setTrailerURL(url)
    }
    getTrailerURL();
  }, [Title]);

  useEffect(function () {
    async function getMovieDetails() {
      SetIsLoading(true);
      const res = await fetch(`http://www.omdbapi.com/?apikey=${apiKey}&i=${selectedId}`);
      const data = await res.json();
      setMovieDetails(data);
      SetIsLoading(false);
    }
    getMovieDetails()
  }, [selectedId]);

  function newWatchedMovie() {
    const newMovie = {
      imdbID: selectedId,
      Title,
      Poster,
      runtime: Number(Runtime.split(" ").at(0)),
      Genre,
    }
    watchLater(newMovie);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  }

  return (
    <div className={`movie-popup ${isOpen ? "" : "close"}`}>
      {isLoading ? (
        <LoadingMovies />
      ) : (
        <div className="bubble">
          <p style={{ color: "grey", marginBottom: "10px", textAlign: "center" }}>
            PRESS ESCAPE OR BACKSPACE TO EXIT
          </p>
          <span onClick={onCloseMovie}>❌</span>

          <div className='details'>
            <section>
              <img src={Poster} alt={Poster} style={{ width: "90%" }} />
              <h2>{Title}</h2>

              <div onClick={() => setToggleTrailer(!toggleTrailer)}>
                <Button
                  WIDTH="75px"
                  HEIGHT="50px"
                  BGCOLOR="#e50914"
                  COLOR="white"
                  BORDER="1px solid white"
                  BORDERRADIUS="5px"
                >
                  {toggleTrailer ? "CLOSE" : "▶ TRAILER"}
                </Button>
              </div>

              {/* Frame for movie trailer */}
              {toggleTrailer && trailerURL && (
                <div style={{ position: "absolute", top: "80px", left: "10%" }}>
                  <iframe
                    width="180%"
                    height="300px"
                    src={trailerURL}
                    title={`${Title} trailer`}
                    Border="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              )}

              <div onClick={newWatchedMovie}>
                <Button
                  WIDTH="100%"
                  HEIGHT="50px"
                  BGCOLOR="GREY"
                  COLOR="white"
                  BORDER="1px solid white"
                  BORDERRADIUS="5px"
                >
                  {isAdded ? "✔ DONE" : "WATCH LATER"}
                </Button>
              </div>
            </section>

            <section>
              <h2>DETAILS</h2>
              <p>Language: {Language}</p>
              <p>Genre: {Genre}</p>
              <p>Released on {Released}</p>
              <p>imDb Rating: ⭐{imdbRating}</p>
              <p><em>Story:</em> {Plot}</p>
              <p>Duration: {Runtime}</p>
              <p>Starring: {Actors}</p>
              <p>Directed by {Director}</p>
            </section>
          </div>
        </div>
      )}
    </div >
  );
}

function WatchMovieLater({ watchMovieList, onDeleteMovie, watchisOpen, watchMovieLisT }) {
  const greater = watchMovieList.length >= 1;

  return (
    <div className={watchisOpen ? "watchMovieSection" : "closeWatchList"}>
      {greater ? (
        watchMovieList.map(movie =>
          <WatchLaterCard
            key={movie.imdbID}
            imdbID={movie.imdbID}
            title={movie.Title}
            poster={movie.Poster}
            runtime={movie.runtime}
            genre={movie.Genre}
            onDeleteMovie={onDeleteMovie}
          />
        )
      ) : (
        <h3 className="msg">Nothing to see here.🎃🎞🦉</h3>
      )}
    </div>
  )
}

function WatchLaterCard({ title, poster, runtime, genre, onDeleteMovie, imdbID }) {
  return (
    <div className="cardStyle">
      <span>
        <img src={poster} alt={`Poster of ${title}`} />
      </span>

      <span className="cardInfo">
        <span className="cardTitle">{title}</span>
        <span className="cardMeta"><strong>Genre:</strong> {genre}</span>
        <span className="cardMeta"><strong>Duration:</strong> {runtime} mins</span>
      </span>

      <span onClick={() => onDeleteMovie(imdbID)}>
        <FontAwesomeIcon icon={faTrash} style={{ color: "red" }} />
      </span>
    </div>
  )
}


function Button({ WIDTH, HEIGHT, BGCOLOR, COLOR, BORDER, BORDERRADIUS, children }) {
  return (
    <button
      style={{
        width: WIDTH,
        height: HEIGHT,
        backgroundColor: BGCOLOR,
        color: COLOR,
        border: BORDER,
        borderRadius: BORDERRADIUS
      }}
    >
      {children}
    </button>
  )
}

function Footer() {
  return (
    <div className='footer'>
      <p>©2025 Movie Theatre. All rights reserved.
        .</p>
    </div>
  );
}

export default App;

