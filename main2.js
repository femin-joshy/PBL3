var marker;
var directionsService, directionsRenderer, placesService;
var YOUR_API_KEY = 'AIzaSyBp8mCZ8DuGAHg3Ixre2aLjDt6K6m5hoB8';
var YOUR_ACCESS_TOKEN = '998bff32592253f3149905d655e703cd51d57116';


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

google.maps.event.addDomListener(window, 'load', initialize);

function handleLocationError(browserHasGeolocation, pos) {
    alert(browserHasGeolocation ?
        'Error: The Geolocation service failed.' :
        'Error: Your browser doesn\'t support geolocation.');
}

function getSegmentPolylines(location) {
    return new Promise((resolve, reject) => {
        // Fetching geolocation data from Google Maps API
        fetch('https://maps.googleapis.com/maps/api/geocode/json?address=' + location + '&key='+YOUR_API_KEY)
        .then(response => response.json())
        .then(data => {
            var lat = data.results[0].geometry.location.lat;
            var lng = data.results[0].geometry.location.lng;

            // Fetching segments from Strava API
            fetch(`https://www.strava.com/api/v3/segments/explore?bounds=${lat-0.015},${lng-0.015},${lat+0.015},${lng+0.015}&activity_type=running&access_token=`+ YOUR_ACCESS_TOKEN)
            .then(response => response.json())
            .then(data => {
                var segmentPromises = [];
                var segments = [];

                data.segments.forEach(segment => {
                    // Create a promise for each segment to fetch the polyline data
                    var promise = new Promise((resolveSegment, rejectSegment) => {
                        fetch(`https://www.strava.com/api/v3/segments/${segment.id}?access_token=`+YOUR_ACCESS_TOKEN)
                            .then(response => response.json())
                            .then(segmentData => {
                                var polyline = segmentData.map.polyline;  // Get the polyline data for the segment
                                segments.push(polyline); // Add the polyline to the segments array
                                resolveSegment(); // Resolve the promise
                            })
                            .catch(error => {
                                rejectSegment(error); // Reject the promise with the error
                            });
                    });

                    segmentPromises.push(promise);
                });

                // Wait for all segment promises to resolve
                Promise.all(segmentPromises)
                    .then(() => {
                        resolve(segments); // Resolve the main promise with the array of segments
                    })
                    .catch(error => {
                        reject(error); // Reject the main promise with the error
                    });
            })
            .catch(error => {
                reject(error); // Reject the main promise with the error
            });
        })
        .catch(error => {
            reject(error); // Reject the main promise with the error
        });
    });
}

function showNearbyPlaces(polyline) {
    return new Promise(function(resolve, reject) {
      var placesOfInterest = [];
      var pattern = /TEMPLE/;
      
      var path = google.maps.geometry.encoding.decodePath(polyline);
  
      var promises = path.reduce(function(chain, location, i) {
        if (i % 10 === 0) {
          return chain.then(function() {
            return new Promise(function(resolve, reject) {
              var request = {
                location: location,
                radius: '500',
                type: ['shrine', 'temple']
              };
  
              placesService.nearbySearch(request, function(results, status) {
                if (status == google.maps.places.PlacesServiceStatus.OK) {
                  console.log(results);
                  results.forEach(function(result) {
                    if(!pattern.test(result.name.toUpperCase()) && !placesOfInterest.includes(result.name)){
                        placesOfInterest.push(result.name);
                    }
                  });
                  resolve();
                } else {
                  reject(status);
                }
              });
            });
          });
        } else {
          return chain;
        }
      }, Promise.resolve());
  
      promises
        .then(function() {
          // Process the placesOfInterest array here
          console.log("placesOfInterest:", placesOfInterest);
          resolve(placesOfInterest);
        })
        .catch(function(error) {
          console.error(error);
          reject(error);
        })
        .finally(function() {
          console.log("Finally block executed.");
          // Perform any cleanup or final actions here
        });
    });
  }

  function computeRoute(polyline, POI) {
   
    var path = google.maps.geometry.encoding.decodePath(polyline);
    var distances = [];
    var polylines = []



  
    map.setCenter(path[0]);
    map.setZoom(15);
  
    var polylineOptions = {
      path: path,
      strokeColor: "#FF0000",
      strokeWeight:7,
      strokeOpacity: 1.0
    };
  
    var polyline = new google.maps.Polyline(polylineOptions);
    polyline.setMap(map);
  
    var promises = []; // Array to store promises
  
    //Get distance and polyline from each point of the route to the shrine
    path.forEach(function (point) {
      var promise = new Promise(function (resolve, reject) {
        directionsService.route({
          origin: point,
          destination: POI,
          travelMode: 'WALKING',
          provideRouteAlternatives: true
        }, function (response, status) {
          if (status === 'OK') {
            var route = response.routes[0];
            var legs = route.legs;
            console.log("Point to fetch distance:", point);
            if (legs.length > 0) {
              var distance = legs[0].distance.value;
              var legPolyline = route.overview_polyline;
              console.log('Distance:', distance);
              console.log('Leg Polyline:', legPolyline);
              resolve({ distance: distance, polyline: legPolyline }); // Resolve the promise with the distance
            } else {
              reject(new Error('No legs found for route'));
            }
          } else {
            reject(new Error('Directions request failed due to ' + status));
          }
        });
      });
  
      promises.push(promise); // Add the promise to the array
    });
  
    // Wait for all the asynchronous calls to complete, then store values in arrays for distance and polylines
    Promise.all(promises)
      .then(function (results) {
        results.forEach(function (result) {
            distances.push(result.distance); // Store the distances in the distances array
            polylines.push(result.polyline); // Store the resolved distances in the distances array
        })
        
  
        console.log('Distances:', distances);
        console.log('Polylines:', polylines);
  
        return distances;
      })
      .catch(function (error) {
        console.error('Error:', error);
      });
  
    wait(1000).then(() => {
        
        //Get the indexes of the two smallest distances from distance list
        var small1 = 0; //first closest distance. Initialize with first value.
        var small2 = 1; //second closest distance. Initialize with second value.
        var d = 0;
        var bm = Number(distances.length /14);
        while (d < distances.length) {
            if (distances[d] < distances[small1]) {
              small1 = Number(d);
              console.log(small1);
            }else if (distances[d] < distances[small2] && d!=0) {
              
              small2 = Number(d);
              console.log(small2);
            }
            d+=bm
        }
        
        //output the values
        console.log("Smallest values");
        console.log(small1, small2);

        //if and else if statements in case the shrine is at the end of the path
        if(small2 > distances.length - bm - 1 || small1 > distances.length - bm - 1){
          if(small2 > distances.length - bm - 1){
            var subPath2 = google.maps.geometry.encoding.decodePath(polylines[small2]);
            path = modifyRoute(path, subPath1, subPath2, -1, small2)
          }
          else if(small1 > distances.length - bm - 1){
            var subPath1 = google.maps.geometry.encoding.decodePath(polylines[small1]);
            path = modifyRoute(path, subPath1, subPath2, small1, -1)
          }
        }

        else if(small2 < bm + 1 || small2 < bm + 1){
          var temp = [] 
            var i = path.length - 1;
            while (i >= 0) {
                temp.push(path[i])
                i -= 1;
            }
            path = temp;
            
          if(small1 < bm + 1){
            var subPath1 = google.maps.geometry.encoding.decodePath(polylines[small1]);
            small1 = path.length - small1 -1;
            path = modifyRoute(path, subPath1, subPath2, small1, -1)
            
          }
          else if(small2 < bm + 1){
            var subPath2 = google.maps.geometry.encoding.decodePath(polylines[small2]);
            small2 = path.length - small2 -1;
            path = modifyRoute(path, subPath1, subPath2, -1, small2)
          }
        }
        

        else{
              if(small2<small1){
                var temp = small1;
                small1 = small2;
                small2 = temp;
              }
              var subPath1 = google.maps.geometry.encoding.decodePath(polylines[small1]);
              var subPath2 = google.maps.geometry.encoding.decodePath(polylines[small2]);
              subPath2.splice(0,1); //remove first value of subPath2 as it is the same as the last value of subPath1.

              //output the subpaths
              console.log(subPath1);
              console.log(subPath2);
              
              //invert the second subpath (subPath2) so the route is from the shrine back to the segment,
              //and not the opposite
              var temp = [] 
              var i = subPath2.length - 1;
              while (i >= 0) {
                  temp.push(subPath2[i])
                  i -= 1;
              }
              subPath2 = temp;
              
              //output the inversed route
              console.log("Inverted subpath 2")
              console.log(subPath2);

              path = modifyRoute(path, subPath1, subPath2, small1, small2);

        }
    
        
        });

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

function selectRoute(routes, targetDistance) {
    // Find the route closest to the target distance
    var closestRoute = null;
    var closestDistanceDiff = Infinity;
  
    routes.forEach(function(route) {
      var distanceDiff = Math.abs(route.distance - targetDistance);
  
      if (distanceDiff < closestDistanceDiff) {
        closestDistanceDiff = distanceDiff;
        closestRoute = route;
      }
    });
  
    return closestRoute;
  }
  

window.onload = function() {
    initialize();

  // User inputs
    var Location = "Tokyo";
    var Distance = 3000;

    // Step 1: Get segment polylines
    console.log("Step 1: Getting segment polylines...");
    getSegmentPolylines(Location)
    .then(function(polylines) {
        console.log("Segment polylines:", polylines);
        var finalRoutes = []; // Array to store the final polylines

        // Step 4: Iterate over each polyline
        var polylinePromises = polylines.map(function(polyline) {
        // Step 5: Show nearby places
        console.log("Step 5: Showing nearby places for polyline:", polyline);
        return showNearbyPlaces(polyline)
            .then(function(POIs) {
            console.log("Nearby places for polyline:", polyline, "POIs:", POIs);
            var routes = []; // Array to store the routes for each combination

            // Step 7: Iterate over each POI and polyline combination
            var routePromises = [];
            polylines.forEach(function(polyline) {
                POIs.forEach(function(POI) {
                // Step 8: Compute route
                console.log("Step 8: Computing route for polyline:", polyline, "and POI:", POI);
                var promise = computeRoute(polyline, POI)
                    .then(function(routes) {
                    console.log("Computed routes for polyline:", polyline, "and POI:", POI, "Routes:", routes);
                    routes.forEach(function(route) {
                        // Step 9: Store the routes in the array
                        routes.push(route);
                    });
                    });
                routePromises.push(promise);
                });
            });

            // Step 10: Select the closest route
            console.log("Step 10: Selecting closest route for polyline:", polyline);
            return Promise.all(routePromises)
                .then(function() {
                var closestRoute = selectRoute(routes, Distance); // Implement selectRoute function
                console.log("Closest route for polyline:", polyline, "is:", closestRoute);
                finalRoutes.push(closestRoute); // Add the closest route to the final routes array
                });
            });
        });

        // Step 11: Wait for all polyline promises to resolve
        console.log("Step 11: Waiting for all polyline promises to resolve...");
        Promise.all(polylinePromises)
        .then(function() {
            console.log("All polyline promises resolved!");
            // Step 12: Use the finalRoutes array for further processing or display
            console.log("Final Polylines:", finalRoutes);
        });
    })
    .catch(function(error) {
        console.error(error);
    });
}
  
