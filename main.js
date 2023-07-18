var marker;
var directionsService, directionsRenderer, placesService;
var YOUR_API_KEY = 'AIzaSyBp8mCZ8DuGAHg3Ixre2aLjDt6K6m5hoB8';
var YOUR_ACCESS_TOKEN = 'ce639fd9e4c7f28eb6f84f2f1e845fafaa262737';
var map;
var currentRouteIndex = -1;
var routes = [];

function initialize() {
    var mapOptions = {
        center: new google.maps.LatLng(0, 0),
        zoom: 2,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(document.getElementById("map"), mapOptions);

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();
    placesService = new google.maps.places.PlacesService(map);
    directionsRenderer.setMap(map);
}


function handleLocationError(browserHasGeolocation, pos) {
    alert(browserHasGeolocation ?
        'Error: The Geolocation service failed.' :
        'Error: Your browser doesn\'t support geolocation.');
}

async function getSegmentPolylines(location, iDistance, activityType) {
    // Fetching geolocation data from Google Maps API
    
    const response = await fetch('https://maps.googleapis.com/maps/api/geocode/json?address=' + location + '&key='+ YOUR_API_KEY);
    const data = await response.json();
    const lat = data.results[0].geometry.location.lat;
    const lng = data.results[0].geometry.location.lng;
    var pos = {
        lat: lat,
        lng: lng
    };
    map.setCenter(pos);
    map.setZoom(14);

    // Fetching segments from Strava API
    const segmentResponse = await fetch(`https://www.strava.com/api/v3/segments/explore?bounds=${lat-0.01},${lng-0.01},${lat+0.01},${lng+0.01}&activity_type=${activityType}&access_token=${YOUR_ACCESS_TOKEN}`);
const segmentData = await segmentResponse.json();

// Filter segments based on desired distance
const desiredDistance = Math.floor(iDistance - iDistance/5); // Specify your desired distance in meters
console.log(desiredDistance)
const filteredSegments = segmentData.segments.filter(segment => segment.distance <= desiredDistance);

const segmentPromises = filteredSegments.map(async (segment) => {
    // Fetch the polyline data for the segment
    const segmentDetailsResponse = await fetch(`https://www.strava.com/api/v3/segments/${segment.id}?access_token=${YOUR_ACCESS_TOKEN}`);
    const segmentDetails = await segmentDetailsResponse.json();
    const polyline = segmentDetails.map.polyline;
    return polyline;
});

const segments = await Promise.all(segmentPromises);

console.log(segments);
var sortedRoutes = sortRoutes(segments, iDistance);
console.log("HELLO:", sortedRoutes);

const chosenSegments = sortedRoutes.slice(0, 5);

    //DISPLAY IN MAP
    /*
    for(x in chosenSegments){
        var path = google.maps.geometry.encoding.decodePath(chosenSegments[x]);
        var newPolylineOptions = {
            path: path ,
            strokeColor: "#FFFF00",
            strokeWeight: 4,
            strokeOpacity: 1.0,
            setZoom: 10
          };
  
        
          var newPolyline = new google.maps.Polyline(newPolylineOptions);
          newPolyline.setMap(map);
    }
    */
    return chosenSegments;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

async function showNearbyPlaces(polyline) {
    var placesOfInterest = [];

    
    var path = google.maps.geometry.encoding.decodePath(polyline);
    var polyDistance = Number(calculateDistance(path));
    console.log(polyDistance)
    var radiousToSearch = Math.floor(polyDistance/path.length) * 2
    console.log(radiousToSearch);

    for (var i = 0; i < path.length; i += Math.floor(path.length/4)) {
        const location = path[i];
        const request = {
            location: location,
            radius: String(radiousToSearch),
            keyword: 'shrine'
        };

        const results = await new Promise((resolve, reject) => {
            placesService.nearbySearch(request, function(results, status) {
                if (status == google.maps.places.PlacesServiceStatus.OK) {
                    resolve(results);
                } else if (status == google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                    //console.log("ZERO_RESULTS");
                    resolve([]); // Resolve an empty array when there are no results
                } else {
                    reject(new Error(status));
                }
            });
        });

        if (results.length === 0) {
            continue; // Skip to the next iteration if there are no places
        }

        results.forEach(function(result) {
            if (!placesOfInterest.includes(result.name)) {
                placesOfInterest.push(result.geometry.location);
            }
        });
    }

    var placesOfInterest = placesOfInterest.filter(function(element) {
        return element !== null;
    });

        placesOfInterest = shuffleArray(placesOfInterest)

    const limitedPOIs = placesOfInterest.slice(0, 4);
    return limitedPOIs;
}

async function computeRoute(polyline, POI) {
    console.log("Polyline:" + polyline +" POI: "+ POI);
    var path = google.maps.geometry.encoding.decodePath(polyline);
    console.log("PATH: "+path.length)
    var distances = [];
    var polylines = [];
    var bm = Number(path.length / 10);



    var routePromises = path.filter((point, i) => i % 3 === 0).map((point) => {
        return new Promise((resolve, reject) => {
            directionsService.route({
                origin: point,
                destination: POI,
                travelMode: 'WALKING',
                provideRouteAlternatives: true
            }, function(response, status) {
                if (status === 'OK') {
                    var route = response.routes[0];
                    var legs = route.legs;
                    if (legs.length > 0) {
                        var distance = legs[0].distance.value;
                        var legPolyline = route.overview_polyline;
                        resolve({ distance: distance, polyline: legPolyline });
                    } else {
                        reject(new Error('No legs found for route'));
                    }
                } else if (status === 'NOT_FOUND') {
                    console.log('Route not found for POI: ' + POI);
                    resolve(null); // Skip this route
                } else {
                    reject(new Error('Directions request failed due to ' + status));
                }
            });
        });
    });

    var results = await Promise.all(routePromises);
    
    results.forEach(function(result) {
        if (result) {
            distances.push(result.distance);
            polylines.push(result.polyline);
        }
    });

    if(distances.length == 0){
        console.log("HERE")
        return null;
    }
    var small1 = 0;
    var small2 = 1;
    var d = 0;
    
    while (d < path.length) {
        if (distances[d] < distances[small1]) {
            small1 = Number(d);
        } else if (distances[d] < distances[small2] && d != 0) {
            small2 = Number(d);
        }
        d += bm;
    }

    if (small2 > distances.length - bm - 1 || small1 > distances.length - bm - 1) {
        if (small2 > distances.length - bm - 1) {
            var subPath2 = google.maps.geometry.encoding.decodePath(polylines[small2]);
            path = modifyRoute(path, subPath1, subPath2, -1, small2);
        } else if (small1 > distances.length - bm - 1) {
            var subPath1 = google.maps.geometry.encoding.decodePath(polylines[small1]);
            path = modifyRoute(path, subPath1, subPath2, small1, -1);
        }
    } else if (small2 < bm + 1 || small2 < bm + 1) {
        var temp = [];
        var i = path.length - 1;
        while (i >= 0) {
            temp.push(path[i]);
            i -= 1;
        }
        path = temp;

        if (small1 < bm + 1) {
            var subPath1 = google.maps.geometry.encoding.decodePath(polylines[small1]);
            small1 = path.length - small1 - 1;
            path = modifyRoute(path, subPath1, subPath2, small1, -1);
        } else if (small2 < bm + 1) {
            var subPath2 = google.maps.geometry.encoding.decodePath(polylines[small2]);
            small2 = path.length - small2 - 1;
            path = modifyRoute(path, subPath1, subPath2, -1, small2);
        }
    } else {
        if (small2 < small1) {
            var temp = small1;
            small1 = small2;
            small2 = temp;
        }
        var subPath1 = google.maps.geometry.encoding.decodePath(polylines[small1]);
        var subPath2 = google.maps.geometry.encoding.decodePath(polylines[small2]);
        subPath2.splice(0, 1);
        var temp = [];
        var i = subPath2.length - 1;
        while (i >= 0) {
            temp.push(subPath2[i]);
            i -= 1;
        }
        subPath2 = temp;

        path = modifyRoute(path, subPath1, subPath2, small1, small2);
    }

    return path;
}

function wait(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}


function modifyRoute(path, SP1, SP2, s1, s2){
    //"path": polyline to modify; "SP1" and "SP2": SubPath1 and 2; "s1" and "s2": first and second smallest distance
    
    
    if(s2 == -1){
        path.splice(s1, path.length - s1);
        path.splice(s1,0, ...SP1);
        return path;

    }
    else if(s1 == -1){
        path.splice(s2, path.length - s2);
        path.splice(s2,0, ...SP2);
        return path;

    }
    else{
      console.log("Start index, values to delete")
      console.log(s1, s2 - s1 + 1);
      path.splice(s1, s2 - s1 + 1);

      console.log("After delete");
      console.log(path);

      path.splice(s1 , -1, ...SP1);
      console.log("Length of subPath 1: " + SP1.length)
      console.log("Add subPath 1");
      console.log(path);

      path.splice(s1 + SP1.length, -1, ...SP2);
      console.log("Length of subPath 2: " + SP2.length)
      console.log("Add subPath 2");
      console.log(path);

    }
    return path;
}

function calculateDistance(polyline) {

    var distance = 0;
  
    for (var i = 0; i < polyline.length - 1; i++) {
      var point1 = polyline[i];
      var point2 = polyline[i + 1];
      var d = google.maps.geometry.spherical.computeDistanceBetween(point1, point2);
      distance += d;
    }
  
    return distance;
}
  
function selectRoute(routes, iDistance) {
    var closestRoute;
    var minDistanceDiff = Infinity;
  
    for (var i = 0; i < routes.length; i++) {
        var route = routes[i];
        var distance = calculateDistance(route);
        var distanceDiff = Math.abs(distance - iDistance);
    
        if (distanceDiff < minDistanceDiff) {
            minDistanceDiff = distanceDiff;
            closestRoute = route;
        }
    }
  
    return closestRoute;
}

function sortRoutes(routes, iDistance) {
    console.log(iDistance)
    var sortedRoutes = [];
    var distances = [];
    
    for(x in routes){
        var path = google.maps.geometry.encoding.decodePath(routes[x]);
        console.log(path);
        d = Math.floor(calculateDistance(path));
        console.log(d)

        distances.push(iDistance-d);
    }

    console.log(distances);

    var len = distances.length;
  
    for (var i = 0; i < len - 1; i++) {
      for (var j = 0; j < len - 1 - i; j++) {
        if (distances[j] > distances[j + 1]) {
            console.log("SWAP: ", distances[j])
          // Swap elements
          var temp = distances[j];
          distances[j] = distances[j + 1];
          distances[j + 1] = temp;
          var temp1 = routes[j];
          routes[j] = routes[j + 1];
          routes[j + 1] = temp1;
        }
      }
    }

  
    return routes
  }
  


async function displayRoutesOnMap(finalRoutes) {
    for (var x = 0; x < finalRoutes.length; x++) {
        console.log("Final Polylines:", finalRoutes);
      var path = google.maps.geometry.encoding.decodePath(finalRoutes[x]);
      var newPolylineOptions = {
        path: path,
        strokeColor: "#FF0000",
        strokeWeight: 4,
        strokeOpacity: 1.0,
        setZoom: 10
      };
      console.log("Final Polylines:", finalRoutes);
  
      var newPolyline = new google.maps.Polyline(newPolylineOptions);
      newPolyline.setMap(map);
    }
}

async function routeFinder(Location, iDistance, activityType){
    console.log("Step 1: Getting segment polylines...");
    try {
        console.log("HELLO")
        var polylines = await getSegmentPolylines(Location, iDistance, activityType);
        console.log(polylines)
        console.log("SEGMENT POLYLINES BRO:", polylines);
        var finalRoutes = []; // Array to store the final polylines

        // Step 2: Iterate over each polyline
        for (var i = 0; i < polylines.length; i++) {
            var polyline = polylines[i];

            // Step 3: Show nearby places
            console.log("Step 3: Showing nearby places for polyline:", polyline);
            var POIs = await showNearbyPlaces(polyline);
            console.log("POIs before checking if empty: " + POIs)
            if(POIs.length === 0){
                console.log("HELLO")
                continue;/////////////////////////////////
            }
            console.log("Nearby places for polyline:", polyline, "POIs:", POIs);

            // Step 4: Compute routes
            console.log("Step 4: Computing routes for polyline:", polyline);
            var routes = [];
            
            for (var j = 0; j < POIs.length; j++) {
                var POI = POIs[j];
                console.log("Computing route for polyline:", polyline, "and POI:", POI);
                var computedRoute = await computeRoute(polyline, POI);
                if(computedRoute == null){
                    continue;
                }
                console.log(computedRoute)
                routes.push(computedRoute);
                console.log("POI ITERATION NUMBER" + j)
                console.log("POLYLINE ITERATION NUMBER" + i)
                console.log("Computed routes for polyline:", polyline, "and POI:", POI, "Routes:", routes);
    
            }

            // Step 5: Select the closest route
            console.log("Step 5: Selecting closest route for polyline:", polyline);
            var closestRoute = selectRoute(routes, iDistance);
            console.log("Closest route for polyline:", polyline, "is:", closestRoute);
            
            finalRoutes.push(closestRoute);
            console.log("FINAL ROUTES: "+finalRoutes)
            
            
        }

        // Step 6: Use the finalRoutes array for further processing or display
        console.log("Final Polylines:", finalRoutes);
        for (var x = 0; x < finalRoutes.length; x++) {
            console.log("Final Polylines:", finalRoutes);
          /*
          var newPolylineOptions = {
            path: finalRoutes[x],
            strokeColor: "#FF0000",
            strokeWeight: 2,
            strokeOpacity: 1.0,
            setZoom: 10
          };
          
      
          var newPolyline = new google.maps.Polyline(newPolylineOptions);
          newPolyline.setMap(map);
          */
        }

        return finalRoutes;

        
    } catch (error) {
        console.error(error);
    }
    
}

// Function to display the current route on the map
function displayCurrentRoute() {
    // Clear previous polylines from the map

    routes.forEach(function(route) {
        route.polyline.setMap(null);
    });

    // Get the current route based on the currentRouteIndex
    var currentRoute = routes[currentRouteIndex];
    console.log(currentRoute);
    center = currentRoute.path[0];
    console.log(center);
    

    // Display the current route on the map
    currentRoute.polyline.setMap(map);
    map.setCenter(center);
    map.setZoom(16);
}

// Function to handle the "Next" button click
function onNextButtonClick() {
    if (currentRouteIndex < routes.length - 1) {
        currentRouteIndex++;
        displayCurrentRoute();
    }
}

// Function to handle the "Previous" button click
function onPreviousButtonClick() {
    if (currentRouteIndex > 0) {
        currentRouteIndex--;
        displayCurrentRoute();
    }
}







// Global variables
var routes = [];



window.onload = function() {
    // Initialize the map
    initialize();
  
    // Get the HTML elements
    var inputSection = document.getElementById("input-section");
    var mapSection = document.getElementById("map-section");
    var locationInput = document.getElementById("location-input");
    var distanceInput = document.getElementById("distance-input");
    var activityInput = document.getElementById("activity-input");
    var findButton = document.getElementById("find-button");
    var nextButton = document.getElementById("next-button");
    var previousButton = document.getElementById("previous-button");
    var loadingOverlay = document.getElementById("loading-overlay");
    var backButton = document.getElementById("back-button");
  
    var currentRouteIndex = 0;
  
    // Hide the map section initially
    mapSection.style.display = "none";
  
    // Add click event listener to the Find Trails button
    findButton.addEventListener("click", async function() {
      try {
        // Show loading overlay
        loadingOverlay.style.display = "block";
        
  
        var Location = locationInput.value;
        var iDistance = parseInt(distanceInput.value);
        var activityType = activityInput.options[activityInput.selectedIndex].value;
  
        var fetchedRoutes = await routeFinder(Location, iDistance, activityType);
  
        // Convert the fetched routes to google.maps.Polyline objects
        routes = fetchedRoutes.map(function(route) {
          var newPolylineOptions = {
            path: route,
            strokeColor: "#FFFF00",
            strokeWeight: 4,
            strokeOpacity: 1.0,
            setZoom: 10
          };
  
          var newPolyline = new google.maps.Polyline(newPolylineOptions);
  
          return {
            polyline: newPolyline,
            path: route
          };
        });
  
        // Hide loading overlay
        loadingOverlay.style.display = "none";
  
        // Hide the input section
        inputSection.style.display = "none";
  
        // Show the map section
        mapSection.style.display = "block";

        backButton.style.display = "block";


  
        // Display the first route
        currentRouteIndex = 0;
        displayCurrentRoute();


      } catch (error) {
        console.error(error);
        // Hide loading overlay in case of error
        loadingOverlay.style.display = "none";
      }
    });
  
    // Add click event listeners to the buttons
    nextButton.addEventListener("click", onNextButtonClick);
    previousButton.addEventListener("click", onPreviousButtonClick);
  };
  
  
   

/*
flag == -1;
finalShownext(){
    clearmap();
    if(routes.length>0 && flag<(routes.length-1)){
        flag++;
    }
    if( flag == finalroutes.length){
        flag = 0;
    }
    displayRoutesOnMap(flag);
    }
*/


