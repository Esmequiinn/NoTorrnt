// MoviesDrive Provider Plugin (nuvio) – FSL/FSLv2 only, stream_title from API

var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// -------------- CONFIG --------------
const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const DOMAIN_JSON_URL = "https://himanshu8443.github.io/providers/modflix.json";
const PROVIDER_KEY = "drive";
const HF_API_BASE = "https://badboysxs-md.hf.space";   // ← your HF space URL
const HF_MOVIE_API = HF_API_BASE + "/movie";
const HF_SERIES_API = HF_API_BASE + "/series";
let moviesDriveDomain = "";
let domainCacheTimestamp = 0;
const DOMAIN_CACHE_TTL = 60 * 60 * 1000;

function makeRequest(url, options = {}) {
  return __async(this, null, function* () {
    const defaultHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json",
    };
    const opts = __spreadProps(__spreadValues({}, options), {
      headers: __spreadValues(__spreadValues({}, defaultHeaders), options.headers || {}),
    });
    const res = yield fetch(url, opts);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  });
}

function findBestMatch(main, targets) {
  if (!targets || targets.length === 0) return { bestMatch: "", bestMatchIndex: -1 };
  const ratings = targets.map(t => {
    if (!t) return 0;
    const a = main.toLowerCase();
    const b = t.toLowerCase();
    if (a === b) return 1;
    if (b.includes(a) || a.includes(b)) return 0.8;
    const aWords = a.split(/\s+/);
    const bWords = b.split(/\s+/);
    let matchCount = 0;
    for (const w of aWords) {
      if (w.length > 2 && bWords.some(x => x.includes(w) || w.includes(x))) matchCount++;
    }
    return matchCount / Math.max(aWords.length, bWords.length);
  });
  const best = Math.max(...ratings);
  return { bestMatch: targets[ratings.indexOf(best)], bestMatchIndex: ratings.indexOf(best) };
}

// -------------- DOMAIN RESOLVER --------------
function getMoviesDriveDomain() {
  return __async(this, null, function* () {
    const now = Date.now();
    if (now - domainCacheTimestamp < DOMAIN_CACHE_TTL && moviesDriveDomain) {
      return moviesDriveDomain;
    }
    try {
      const res = yield fetch(DOMAIN_JSON_URL);
      if (res.ok) {
        const data = yield res.json();
        if (data && data[PROVIDER_KEY] && data[PROVIDER_KEY].url) {
          moviesDriveDomain = data[PROVIDER_KEY].url.replace(/\/$/, "");
          domainCacheTimestamp = now;
        }
      }
    } catch (e) {
      console.error("[MoviesDrive] Failed to fetch domain:", e.message);
    }
    return moviesDriveDomain;
  });
}

// -------------- SEARCH --------------
function searchMoviesDrive(query) {
  return __async(this, null, function* () {
    const domain = yield getMoviesDriveDomain();
    if (!domain) return [];
    const apiUrl = `${domain}/search.php?q=${encodeURIComponent(query)}&page=1`;
    const searchHeaders = {
      "Accept": "*/*",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
      "Cookie": "_ga=GA1.1.625399613.1778035100; _ga_YLNESKK47K=GS2.1.s1778047448$o2$g1$t1778047466$j42$l0$h0",
      "Referer": `${domain}/search.html?q=${encodeURIComponent(query)}`,
      "Sec-Ch-Ua": "\"Not-A.Brand\";v=\"99\", \"Chromium\";v=\"124\"",
      "Sec-Ch-Ua-Mobile": "?1",
      "Sec-Ch-Ua-Platform": "\"Android\"",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
    };
    try {
      const res = yield makeRequest(apiUrl, { headers: searchHeaders });
      const data = yield res.json();
      if (data && data.hits && data.hits.length > 0) {
        return data.hits.map(hit => ({
          title: hit.document.post_title,
          permalink: hit.document.permalink,
          imdb_id: hit.document.imdb_id || ""
        }));
      }
    } catch (e) {
      console.error("[MoviesDrive] Search API failed:", e);
    }
    return [];
  });
}

// -------------- HF API CALLS --------------
function getMovieLinks(pageUrl) {
  return __async(this, null, function* () {
    const url = `${HF_MOVIE_API}?url=${encodeURIComponent(pageUrl)}`;
    const res = yield makeRequest(url);
    const data = yield res.json();
    return data && data.links ? data.links : [];
  });
}

function getSeriesEpisodes(pageUrl) {
  return __async(this, null, function* () {
    const url = `${HF_SERIES_API}?url=${encodeURIComponent(pageUrl)}`;
    const res = yield makeRequest(url);
    const data = yield res.json();
    return data && data.episodes ? data.episodes : [];
  });
}

// -------------- getStreams --------------
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    try {
      // 1. TMDB metadata
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === "tv" ? "tv" : "movie"}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
      const tmdbRes = yield makeRequest(tmdbUrl);
      const tmdbData = yield tmdbRes.json();
      const title = mediaType === "tv" ? tmdbData.name : tmdbData.title;
      const year = (mediaType === "tv" ? tmdbData.first_air_date : tmdbData.release_date)?.substring(0, 4) || "";
      const imdbId = tmdbData.external_ids?.imdb_id || null;
      if (!title) return [];

      // 2. Search MoviesDrive
      let query = title;
      if (mediaType === "tv" && seasonNum) query += ` Season ${seasonNum}`;
      let results = yield searchMoviesDrive(query);
      if (results.length === 0 && query !== title) results = yield searchMoviesDrive(title);
      if (results.length === 0 && imdbId) results = yield searchMoviesDrive(imdbId);
      if (results.length === 0) return [];

      // 3. Best match
      const titles = results.map(r => r.title);
      const { bestMatchIndex } = findBestMatch(title, titles);
      let selected = bestMatchIndex >= 0 ? results[bestMatchIndex] : null;
      if (mediaType === "movie" && year && selected && !selected.title.includes(year)) {
        const withYear = results.find(r => r.title.includes(year));
        if (withYear) selected = withYear;
      }
      if (!selected) selected = results.find(r => r.title.toLowerCase().includes(title.toLowerCase())) || results[0];
      if (!selected) return [];

      const domain = yield getMoviesDriveDomain();
      if (!domain) return [];
      const pageUrl = domain + selected.permalink;

      // 4. Fetch links from HF API
      let rawLinks = [];
      if (mediaType === "movie") {
        rawLinks = yield getMovieLinks(pageUrl);
      } else {
        const episodes = yield getSeriesEpisodes(pageUrl);
        if (seasonNum != null && episodeNum != null) {
          const ep = episodes.find(e => e.season == seasonNum && e.episode == episodeNum);
          if (ep && ep.links) rawLinks = ep.links;
          else return [];
        } else return [];
      }

      if (!rawLinks || rawLinks.length === 0) return [];

      // 5. Build streams – just use stream_title from API
      const streams = rawLinks.map(link => ({
        name: `MoviesDrive ${link.name || "Direct"}`,
        title: link.stream_title || `${title} - ${link.quality}p`,
        url: link.url,
        type: "direct",
        quality: link.quality ? `${link.quality}p` : "Unknown",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": pageUrl,
        },
      }));

      streams.sort((a, b) => (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0));
      return streams;
    } catch (e) {
      console.error("[MoviesDrive] getStreams error:", e);
      return [];
    }
  });
}

// Export
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
