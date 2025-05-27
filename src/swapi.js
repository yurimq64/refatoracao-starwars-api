/* global process */
// StarWars API Code
// This code intentionally violates clean code principles for refactoring practice

const http = require("http");
const https = require("https");

const HTTP_STATUS_OK = 200;
const HTTP_STATUS_BAD_REQUEST = 400;
const HTTP_STATUS_NOT_FOUND = 404;
const DEFAULT_PORT = 3000;
const ARGUMENT_START_INDEX = 2;
const NOT_FOUND_INDEX = -1; // Para args.indexOf

const cache = {};
let debug_mode = true;
let timeout = 5000;
let err_count = 0;
let total_size = 0;
let fetch_count = 0;

function setupRequestEvents(requester, pageToSearch, errorCatcher, requestTimeout) {
    requester.on("error", (e) => {
        err_count++;
        errorCatcher(e);
    });
    requester.setTimeout(requestTimeout, () => {
        requester.abort();
        err_count++;
        errorCatcher(new Error(`Request timeout for ${pageToSearch}`));
    });
}

async function fetchFromAPI(pageToSearch) {
    if (cache[pageToSearch]) {
        if (debug_mode) console.log("Using cached data for", pageToSearch);
        return cache[pageToSearch];
    }
    return new Promise((searchResultsResponse, errorCatcher) => {
        const requester = https.get(`https://swapi.dev/api/${pageToSearch}`,
            { rejectUnauthorized: false }, (pageHttpResponse) => {
                if (pageHttpResponse.statusCode >= HTTP_STATUS_BAD_REQUEST) {
                    err_count++;
                    return errorCatcher(new Error(`Request failed with status code ${pageHttpResponse.statusCode}`));
                }
                responseHandler(pageHttpResponse, pageToSearch, searchResultsResponse, errorCatcher);
                return; // Satisfaz consistent-return para esta função de callback do https.get
            });
        setupRequestEvents(requester, pageToSearch, errorCatcher, timeout);
    });
    
}

function handleSuccessfulResponseEnd(dataBitsCacher, pageToSearch, searchResultsResponse) {
    const starWarsInfoPages = JSON.parse(dataBitsCacher);
    cache[pageToSearch] = starWarsInfoPages;
    searchResultsResponse(starWarsInfoPages);
    if (debug_mode) {
        console.log(`Successfully fetched data for ${pageToSearch}`);
        console.log(`Cache size: ${Object.keys(cache).length}`);
    }
}

function responseHandler(pageHttpResponse, pageToSearch, searchResultsResponse, errorCatcher) {
    let dataBitsCacher = "";
    pageHttpResponse.on("data", (chunk) => { // Linha 48 original do erro consistent-return
        dataBitsCacher += chunk;
        // O 'return;' foi removido daqui. A função agora retorna 'undefined' implicitamente.
    });
    pageHttpResponse.on("end", () => {
        try {
            handleSuccessfulResponseEnd(dataBitsCacher, pageToSearch, searchResultsResponse);
        } catch (e) {
            err_count++;
            errorCatcher(e);
        }
    });
    pageHttpResponse.on("error", (e) => {
        err_count++;
        errorCatcher(e);
    });
}

function printStats() {
    if (debug_mode) {
        console.log("\nStats:");
        console.log("API Calls:", fetch_count);
        console.log("Cache Size:", Object.keys(cache).length);
        console.log("Total Data Size:", total_size, "bytes");
        console.log("Error Count:", err_count);
    }
}

async function printInfo() {
    const search_character = 1;
    const search_vehicle = 1;
    try {
        if (debug_mode) console.log("Starting main data fetch sequence...");
        fetch_count++;
        await printCharacterInfo(search_character);
        await printSpaceshipInfo();
        await printLargestPlanetsInfo();
        await printStarWarsMoviesInOrder();
        await printVehicleInfo(search_vehicle);
        printStats();
    } catch (e) {
        console.error("Error in printInfo:", e.message);
        err_count++;
    }
}

async function printCharacterInfo(characterIdSearch) {
    try {
        if (debug_mode) console.log(`Workspaceing character data for ID: ${characterIdSearch}...`);
        const mainCharacter = await fetchFromAPI(`people/${characterIdSearch}`);
        total_size += JSON.stringify(mainCharacter).length;
        console.log("Character:", mainCharacter.name);
        console.log("Height:", mainCharacter.height);
        console.log("Mass:", mainCharacter.mass);
        console.log("Birthday:", mainCharacter.birth_year);
        if (mainCharacter.films && mainCharacter.films.length > 0) {
            console.log("Appears in", mainCharacter.films.length, "films");
        }
    } catch (e) {
        console.error("Error fetching character info:", e.message);
        err_count++;
    }
}

function printSingleSpaceshipDetails(spaceship, index) {
    console.log(`\nStarship ${index + 1}:`);
    console.log("Name:", spaceship.name);
    console.log("Model:", spaceship.model);
    console.log("Manufacturer:", spaceship.manufacturer);
    const cost = spaceship.cost_in_credits !== "unknown" ? `${spaceship.cost_in_credits} credits` : "unknown";
    console.log("Cost:", cost);
    console.log("Speed:", spaceship.max_atmosphering_speed);
    console.log("Hyperdrive Rating:", spaceship.hyperdrive_rating);
    if (spaceship.pilots && spaceship.pilots.length > 0) {
        console.log("Pilots:", spaceship.pilots.length);
    }
}

async function printSpaceshipInfo() {
    const MAX_SPACESHIPS_TO_PRINT = 3;
    try {
        if (debug_mode) console.log("Fetching starships data...");
        fetch_count++;
        const spaceshipsList = await fetchFromAPI("starships/?page=1");
        total_size += JSON.stringify(spaceshipsList).length;
        console.log("\nTotal Starships:", spaceshipsList.count);
        const shipsToPrint = spaceshipsList.results.slice(0, MAX_SPACESHIPS_TO_PRINT);
        for (let i = 0; i < shipsToPrint.length; i++) {
            printSingleSpaceshipDetails(shipsToPrint[i], i);
        }
    } catch (e) {
        console.error("Error fetching spaceship info:", e.message);
        err_count++;
    }
}

function isPlanetLargeAndPopulated(planetData, populationThreshold, diameterThreshold) {
    const hasKnownPopulation = planetData.population !== "unknown";
    const hasKnownDiameter = planetData.diameter !== "unknown";
    if (!hasKnownPopulation || !hasKnownDiameter) {
        return false;
    }
    return Number(planetData.population) > populationThreshold &&
        Number(planetData.diameter) > diameterThreshold;
}

function printPlanetDetails(planetData) {
    // Quebrando a string para evitar max-len, se necessário
    const nameStr = `Name: ${planetData.name}`;
    const popStr = `Pop: ${planetData.population}`;
    const diamStr = `Diameter: ${planetData.diameter}`;
    const climateStr = `Climate: ${planetData.climate}`;
    console.log(`${nameStr} - ${popStr} - ${diamStr} - ${climateStr}`); // Tentativa de encurtar a linha 193 original

    if (planetData.films && planetData.films.length > 0) {
        console.log(`  Appears in ${planetData.films.length} films`);
    }
}

async function printLargestPlanetsInfo() {
    const POPULATION_THRESHOLD = 1000000000;
    const DIAMETER_THRESHOLD = 10000;
    try {
        if (debug_mode) console.log("Fetching largest planets data...");
        const planetList = await fetchFromAPI("planets/?page=1");
        total_size += JSON.stringify(planetList).length;
        console.log("\nLarge populated planets:");
        for (const planetData of planetList.results) {
            if (isPlanetLargeAndPopulated(planetData, POPULATION_THRESHOLD, DIAMETER_THRESHOLD)) {
                printPlanetDetails(planetData);
            }
        }
    } catch (e) {
        console.error("Error fetching largest planets info:", e.message);
        err_count++;
    }
}

async function printStarWarsMoviesInOrder() {
    try {
        if (debug_mode) console.log("Fetching films data...");
        const filmsData = await fetchFromAPI("films/");
        total_size += JSON.stringify(filmsData).length;
        const filmList = filmsData.results;
        filmList.sort((a, b) => new Date(a.release_date) - new Date(b.release_date));
        console.log("\nStar Wars Films in chronological order:");
        for (let i = 0; i < filmList.length; i++) {
            const film = filmList[i];
            console.log(`${i + 1}. ${film.title} (${film.release_date})`);
            console.log(`   Director: ${film.director}`);
            console.log(`   Producer: ${film.producer}`);
            console.log(`   Characters: ${film.characters.length}`);
            console.log(`   Planets: ${film.planets.length}`);
        }
    } catch (e) {
        console.error("Error fetching films info:", e.message);
        err_count++;
    }
}

async function printVehicleInfo(vehicleIdSearch) {
    const MAX_VEHICLE_SEARCH_ALLOWED = 4;
    try {
        if (debug_mode) console.log(`Workspaceing vehicle data for ID: ${vehicleIdSearch}...`);
        if (vehicleIdSearch <= MAX_VEHICLE_SEARCH_ALLOWED) {
            const vehicle = await fetchFromAPI(`vehicles/${vehicleIdSearch}`);
            total_size += JSON.stringify(vehicle).length;
            console.log("\nFeatured Vehicle:");
            console.log("Name:", vehicle.name);
            console.log("Model:", vehicle.model);
            console.log("Manufacturer:", vehicle.manufacturer);
            console.log("Cost:", vehicle.cost_in_credits, "credits");
            console.log("Length:", vehicle.length);
            console.log("Crew Required:", vehicle.crew);
            console.log("Passengers:", vehicle.passengers);
        }
    } catch (e) {
        console.error("Error fetching vehicle info:", e.message);
        err_count++;
    }
}

const args = process.argv.slice(ARGUMENT_START_INDEX); // Linha 248 original do erro no-undef
if (args.includes("--no-debug")) {
    debug_mode = false;
}
if (args.includes("--timeout")) {
    const index = args.indexOf("--timeout");
    if (index !== NOT_FOUND_INDEX && index < args.length - 1) { // Usando NOT_FOUND_INDEX
        const timeoutArg = parseInt(args[index + 1]);
        if (!isNaN(timeoutArg)) {
            timeout = timeoutArg;
        }
    }
}

const rootPageHtml = `
<!DOCTYPE html>
<html>
    <head>
        <title>Star Wars API Demo</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #FFE81F; background-color: #000; padding: 10px; }
            button { background-color: #FFE81F; border: none; padding: 10px 20px; cursor: pointer; }
            .footer { margin-top: 50px; font-size: 12px; color: #666; }
            pre { background: #f4f4f4; padding: 10px; border-radius: 5px; }
        </style>
    </head>
    <body>
        <h1>Star Wars API Demo</h1>
        <p>This page demonstrates fetching data from the Star Wars API.</p>
        <p>Check your console for the API results.</p>
        <button onclick="fetchData()">Fetch Star Wars Data</button>
        <div id="results"></div>
        <script>
            function fetchData() {
                document.getElementById('results').innerHTML = '<p>Loading data...</p>';
                fetch('/api')
                    .then(res => res.text())
                    .then(text => {
                        alert('API request made! Check server console.');
                        const resultsDiv = document.getElementById('results');
                        resultsDiv.innerHTML = '<p>Data fetched! Check server console.</p>';
                    })
                    .catch(err => {
                        const resultsDiv = document.getElementById('results');
                        resultsDiv.innerHTML = '<p>Error: ' + err.message + '</p>';
                    });
            }
        </script>
        <div class="footer">
            <p>API calls: \${fetch_count} | Cache entries: \${Object.keys(cache).length} | Errors: \${err_count}</p>
            <pre>Debug mode: \${debug_mode ? "ON" : "OFF"} | Timeout: \${timeout}ms</pre>
        </div>
    </body>
</html>
`;

function handleRootRequest(req, res) {
    res.writeHead(HTTP_STATUS_OK, { "Content-Type": "text/html" });
    const processedHtml = rootPageHtml
        .replace(/\$\{fetch_count\}/g, fetch_count)
        .replace(/\$\{Object\.keys\(cache\)\.length\}/g, Object.keys(cache).length)
        .replace(/\$\{err_count\}/g, err_count)
        .replace(/\$\{debug_mode \? "ON" : "OFF"\}/g, debug_mode ? "ON" : "OFF")
        .replace(/\$\{timeout\}/g, timeout);
    res.end(processedHtml);
}

function handleApiRequest(req, res) {
    printInfo();
    res.writeHead(HTTP_STATUS_OK, { "Content-Type": "text/plain" });
    res.end("Check server console for results");
}

function handleStatsRequest(req, res) {
    res.writeHead(HTTP_STATUS_OK, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
        api_calls: fetch_count,
        cache_size: Object.keys(cache).length,
        data_size: total_size,
        errors: err_count,
        debug: debug_mode,
        timeout: timeout
    }));
}

function handleNotFoundRequest(req, res) {
    res.writeHead(HTTP_STATUS_NOT_FOUND, { "Content-Type": "text/plain" });
    res.end("Not Found");
}

const server = http.createServer((req, res) => {
    if (req.url === "/" || req.url === "/index.html") {
        handleRootRequest(req, res);
    } else if (req.url === "/api") {
        handleApiRequest(req, res);
    } else if (req.url === "/stats") {
        handleStatsRequest(req, res);
    } else {
        handleNotFoundRequest(req, res);
    }
});

const PORT = process.env.PORT || DEFAULT_PORT; // Linha 351 original do erro no-undef
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log("Open the URL in your browser and click the button to fetch Star Wars data");
    if (debug_mode) {
        console.log("Debug mode: ON");
        console.log("Timeout:", timeout, "ms");
    }
});
