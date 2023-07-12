/*
2023/07/12

by Tomas Brand Sastre

This program aims to modify an existing route from Strava (input as polilyne) by adding
a specific place (in coordinates) in the route.

computeRoute(): Main function which returns the final route as a polyline to be displayed in Google Map's map.
              It takes the polyline of the route and the coordinates of the place to add as imputs.
              (At the moment it doesnt hold attributes as I inputed example values directly inside the function)

              The program iterates though all the coordinates in the polyline, and calculates
              the rout from each coordinate to the place, storing the distances in meters (array[] distances),
              and the polylines of each calulated route (array[] polylines).

modifyRoute(path, SP1, SP2, s1, s2): This function is called by computeRoute() after calculating 
              the distances and polylines, and obtaining the 2 points closest to the place. Depending on
              these values, [1]the route is modified by adding the place in a middle point of the route (by connecting the
              polyline to the place and returning back), [2]or in one of the ends (extending the polyline to
              the place)

              "path": polyline to modify; 
              "SP1" and "SP2": SubRoute1 and SubRoute2 
              "s1" and "s2": first and second indexes closest to point
                             \\if s1 or s2 == -1, then perform [2]


*/

function computeRoute() {
    var polyline = "}g|eFnpqjVl@En@Md@HbAd@d@^h@Xx@VbARjBDh@OPQf@w@d@k@XKXDFPH\\EbGT`AV`@v@|@NTNb@?XOb@cAxAWLuE@eAFMBoAv@eBt@q@b@}@tAeAt@i@dAC`AFZj@dB?~@[h@MbAVn@b@b@\\d@Eh@Qb@_@d@eB|@c@h@WfBK|AMpA?VF\\\\t@f@t@h@j@|@b@hCb@b@XTd@Bl@GtA?jAL`ALp@Tr@RXd@Rx@Pn@^Zh@Tx@Zf@`@FTCzDy@f@Yx@m@n@Op@VJr@";
    var path = google.maps.geometry.encoding.decodePath(polyline);
    var distances = [];
    var polylines = []

    //37.83260486680209, -122.4821962099374 ; 37.827510880318975, -122.50382313421191 ; 37.834777280404545, -122.49456642722907
    var newLocation = new google.maps.LatLng(37.83260486680209, -122.4821962099374);

  
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
  
