function showPath() {
    var polyline = "}g|eFnpqjVl@En@Md@HbAd@d@^h@Xx@VbARjBDh@OPQf@w@d@k@XKXDFPH\\EbGT`AV`@v@|@NTNb@?XOb@cAxAWLuE@eAFMBoAv@eBt@q@b@}@tAeAt@i@dAC`AFZj@dB?~@[h@MbAVn@b@b@\\d@Eh@Qb@_@d@eB|@c@h@WfBK|AMpA?VF\\\\t@f@t@h@j@|@b@hCb@b@XTd@Bl@GtA?jAL`ALp@Tr@RXd@Rx@Pn@^Zh@Tx@Zf@`@FTCzDy@f@Yx@m@n@Op@VJr@";
    var path = google.maps.geometry.encoding.decodePath(polyline);
    var distances = [];
    var polylines = []
    var newLocation = new google.maps.LatLng(37.83541579288643, -122.49519209044924);

  
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
          destination: newLocation,
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
        while (d < distances.length) {
            if (distances[d] < distances[small1]) {
              small1 = Number(d);
              console.log(small1);
            } else if (distances[d] < distances[small2]) {
              small2 = Number(d);
              console.log(small2);
            }
            d+=5;
        }
        
        
        //output the values
        console.log("Smallest values");
        console.log(small1, small2);

        //get the polylines in coordinates of the paths for the closest distances to the shrine
        var subPath1 = google.maps.geometry.encoding.decodePath(polylines[small1]);
        var subPath2 = google.maps.geometry.encoding.decodePath(polylines[small2]);
        subPath2.splice(0,1);

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
        
        //output the main path before and after deleting the middle values between the smallest values
        console.log("Before delete")
        console.log(path);
    
        console.log("Start index, values to delete")
        console.log(small1, small2 - small1 + 1);
        path.splice(small1, small2 - small1 + 1);

        console.log("After delete");
        console.log(path);

        path.splice(small1 , 0, ...subPath1);
        console.log("Length of subPath 1: " + subPath1.length)
        console.log("Add subPath 1");
        console.log(path);

        path.splice(small1 + subPath1.length, 0, ...subPath2);
        console.log("Length of subPath 2: " + subPath2.length)
        console.log("Add subPath 2");
        console.log(path);

        var newPolylineOptions = {
          path: path,
          strokeColor: "#FFFF00",
          strokeWeight: 4,
          strokeOpacity: 1.0
        };

      
        var newPolyline = new google.maps.Polyline(newPolylineOptions);
        newPolyline.setMap(map);
      
        
        });

  }
  
  function wait(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
  