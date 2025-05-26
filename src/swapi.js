// StarWars API Code
// This code intentionally violates clean code principles for refactoring practice

const http = require("http"); 
const https = require("https"); 

const cache = {}; 
let debug_mode = true; 
let timeout = 5000; 
let err_count = 0; 

async function fetchFromAPI(pageToSearch) { 

    if (cache[pageToSearch]) { 
        if (debug_mode) console.log("Using cached data for", pageToSearch); 
        return cache[pageToSearch]; 
    }

    return new Promise((searchResultsResponse, errorCatcher) => { 
            const requester = https.get(`https://swapi.dev/api/${pageToSearch}`,
            { rejectUnauthorized: false }, (pageHttpResponse) => { 
            
            
            
                if (pageHttpResponse.statusCode >= 400) { 
                err_count++; 
                return errorCatcher(new Error(`Request failed with status code ${pageHttpResponse.statusCode}`)); 
            }
           responseHandler(pageHttpResponse, pageToSearch, searchResultsResponse, errorCatcher)
            });

         requester.on("error", (e) => { 
            err_count++;
            errorCatcher(e);
        });

        requester.setTimeout(timeout, () => {
            requester.abort(); 
            err_count++;
            errorCatcher(new Error(`Request timeout for ${pageToSearch}`)); 
        });
    });
}





function responseHandler(pageHttpResponse, pageToSearch, searchResultsResponse, errorCatcher) { 
    let dataBitsCacher = ""; 


    pageHttpResponse.on("data", (chunk) => { 
        dataBitsCacher += chunk;   });


    pageHttpResponse.on("end", () => { 

        try {
            const starWarsInfoPages = JSON.parse(dataBitsCacher); 
            cache[pageToSearch] = starWarsInfoPages; 
            searchResultsResponse(starWarsInfoPages); 


            if (debug_mode) {
                console.log(`Successfully fetched data for ${pageToSearch}`); 
                console.log(`Cache size: ${Object.keys(cache).length}`);}


        } catch (e) { 
            err_count++;
            errorCatcher(e);}

    });

    pageHttpResponse.on("error", (e) => { 
        err_count++;
        errorCatcher(e);
    });
}


// Global variables for tracking state
let vehicle_id_search = 1;
let total_size = 0;
let fetch_count = 0;

async function printInfo() {
    let search_character = 1;
    let search_vehicle = 1;

    await printCharacterInfo(search_character);
    await printSpaceshipInfo();
    await printLargestPlanetsInfo();
    await printStarWarsMoviesInOrder();
    await printVehicleInfo(search_vehicle);

    search_character++;
    search_vehicle++;

    

    try {
        if (debug_mode) console.log("Starting data fetch...");
        fetch_count++;
        
                
        // Print stats
        if (debug_mode) {
            console.log("\nStats:");
            console.log("API Calls:", fetch_count);
            console.log("Cache Size:", Object.keys(cache).length);
            console.log("Total Data Size:", total_size, "bytes");
            console.log("Error Count:", err_count);
        }
        
    } catch (e) {
        console.error("Error:", e.message);
        err_count++;
    }
}








////////////////////////////////////////////////



//////////////////////////////////

async function printCharacterInfo(character_id_search) {

    try {
        if (debug_mode) console.log("Starting data fetch...");
                             
        const mainCharacter = await fetchFromAPI(`people/${character_id_search}`);
        total_size += JSON.stringify(mainCharacter).length;

        console.log("Character:", mainCharacter.name);
        console.log("Height:", mainCharacter.height);
        console.log("Mass:", mainCharacter.mass);
        console.log("Birthday:", mainCharacter.birth_year);

        if (mainCharacter.films && mainCharacter.films.length > 0) {
            console.log("Appears in", mainCharacter.films.length, "films");
        }
        
        
           
    } catch (e) {
        console.error("Error:", e.message);
        err_count++;
    }
}


///////////////////////



async function printSpaceshipInfo() {

    let MAX_SPACESHIPS_TO_PRINT = 3;

    try {
        if (debug_mode) console.log("Starting data fetch...");
        fetch_count++;
        
        const spaceshipsList = await fetchFromAPI("starships/?page=1");
        total_size += JSON.stringify(spaceshipsList).length;
        console.log("\nTotal Starships:", spaceshipsList.count);
        
        // Print first 3 starships with details
        for (let i = 0; i < MAX_SPACESHIPS_TO_PRINT; i++) {
            if (i < spaceshipsList.results.length) {
                const spaceship = spaceshipsList.results[i];
                console.log(`\nStarship ${i+1}:`);
                console.log("Name:", spaceship.name);
                console.log("Model:", spaceship.model);
                console.log("Manufacturer:", spaceship.manufacturer);
                console.log("Cost:", spaceship.cost_in_credits !== "unknown" ? `${spaceship.cost_in_credits  } credits` : "unknown");
                console.log("Speed:", spaceship.max_atmosphering_speed);
                console.log("Hyperdrive Rating:", spaceship.hyperdrive_rating);
                if (spaceship.pilots && spaceship.pilots.length > 0) {
                    console.log("Pilots:", spaceship.pilots.length);
                }
            }
        }
           
    } catch (e) {
        console.error("Error:", e.message);
        err_count++;
    }
}

///////////////////////////////////

async function printLargestPlanetsInfo() {
// Find planets with population > 1000000000 and diameter > 10000

        let POPULATION_MAX = 1000000000;
        let DIAMETER_MIN = 10000;
        
        const planetList = await fetchFromAPI("planets/?page=1");
        total_size += JSON.stringify(planetList).length;

        console.log("\nLarge populated planets:");

        for (let i = 0; i < planetList.results.length; i++) {
            const planetData = planetList.results[i];

            if (planetData.population !== "unknown" && parseInt(planetData.population) > POPULATION_MAX && 
                planetData.diameter !== "unknown" && parseInt(planetData.diameter) > DIAMETER_MIN) {
                console.log(planetData.name, "- Pop:", planetData.population, "- Diameter:", planetData.diameter, "- Climate:", planetData.climate);
                // Check if it appears in any films
                if (planetData.films && planetData.films.length > 0) {
                    console.log(`  Appears in ${planetData.films.length} films`);
                }
            }
        }
}


///////////////////////////////////////

async function printStarWarsMoviesInOrder() {

        const films = await fetchFromAPI("films/");
        total_size += JSON.stringify(films).length;
        const filmList = films.results;
        filmList.sort((a, b) => {
            return new Date(a.release_date) - new Date(b.release_date);
        });
        
        console.log("\nStar Wars Films in chronological order:");
        for (let i = 0; i < filmList.length; i++) {
            const film = filmList[i];
            console.log(`${i+1}. ${film.title} (${film.release_date})`);
            console.log(`   Director: ${film.director}`);
            console.log(`   Producer: ${film.producer}`);
            console.log(`   Characters: ${film.characters.length}`);
            console.log(`   Planets: ${film.planets.length}`);
        }
}


///////////////////////////////////////////////

async function printVehicleInfo(vehicle_id_search){
    let max_vehicle_search_allowed = 4;

    // Get a vehicle and display details
        if (vehicle_id_search <= max_vehicle_search_allowed) {
            const vehicle = await fetchFromAPI(`vehicles/${  vehicle_id_search}`);
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
}

// Process command line arguments
const args = process.argv.slice(2);
if (args.includes("--no-debug")) {
    debug_mode = false;
}
if (args.includes("--timeout")) {
    const index = args.indexOf("--timeout");
    if (index < args.length - 1) {
        timeout = parseInt(args[index + 1]);
    }
}

// Create a simple HTTP server to display the results
const server = http.createServer((req, res) => {
    if (req.url === "/" || req.url === "/index.html") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
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
                                    document.getElementById('results').innerHTML = '<p>Data fetched! Check server console.</p>';
                                })
                                .catch(err => {
                                    document.getElementById('results').innerHTML = '<p>Error: ' + err.message + '</p>';
                                });
                        }
                    </script>
                    <div class="footer">
                        <p>API calls: ${fetch_count} | Cache entries: ${Object.keys(cache).length} | Errors: ${err_count}</p>
                        <pre>Debug mode: ${debug_mode ? "ON" : "OFF"} | Timeout: ${timeout}ms</pre>
                    </div>
                </body>
            </html>
        `);
    } else if (req.url === "/api") {
        printInfo();
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("Check server console for results");
    } else if (req.url === "/stats") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            api_calls: fetch_count,
            cache_size: Object.keys(cache).length,
            data_size: total_size,
            errors: err_count,
            debug: debug_mode,
            timeout: timeout
        }));
    } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log("Open the URL in your browser and click the button to fetch Star Wars data");
    if (debug_mode) {
        console.log("Debug mode: ON");
        console.log("Timeout:", timeout, "ms");
    }
}); 
