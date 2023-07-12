function showPath() {
    var polyline = "}g|eFnpqjVl@En@Md@HbAd@d@^h@Xx@VbARjBDh@OPQf@w@d@k@XKXDFPH\\EbGT`AV`@v@|@NTNb@?XOb@cAxAWLuE@eAFMBoAv@eBt@q@b@}@tAeAt@i@dAC`AFZj@dB?~@[h@MbAVn@b@b@\\d@Eh@Qb@_@d@eB|@c@h@WfBK|AMpA?VF\\\\t@f@t@h@j@|@b@hCb@b@XTd@Bl@GtA?jAL`ALp@Tr@RXd@Rx@Pn@^Zh@Tx@Zf@`@FTCzDy@f@Yx@m@n@Op@VJr@";
    var path = google.maps.geometry.encoding.decodePath(polyline);
    var distances = [];
    var polylines = []
    var newLocation = new google.maps.LatLng(37.8338752488831, -122.49447354767364);

  
    map.setCenter(path[0]);
    map.setZoom(15);
  
    var polylineOptions = {
      path: path,
      strokeColor: "#FF0000",
      strokeWeight: 3,
      strokeOpacity: 1.0
    };
  
    var polyline = new google.maps.Polyline(polylineOptions);
    polyline.setMap(map);
  
    var promises = []; // Array to store promises
  
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
  
    // Wait for all the asynchronous calls to complete before logging distances
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
      var small1 = 0;
      var small2 = 1;
      for (var d in distances) {
        if (distances[d] < distances[small1]) {
          small1 = d;
          console.log(small1);
        } else if (distances[d] < distances[small2]) {
          small2 = d;
          console.log(small2);
        }
      }
  
      console.log(small1, small2);

      var subPath1 = google.maps.geometry.encoding.decodePath(polylines[small1]);
      var subPath2 = google.maps.geometry.encoding.decodePath(polylines[small2]);

      console.log(subPath1)
      console.log(small1)
      console.log(small2)

      console.log(path);
      var newPath = path.splice(small1, small2);
      console.log(newPath);





    });


  }
  
  function wait(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
  