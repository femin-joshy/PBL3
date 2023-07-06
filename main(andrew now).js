document.querySelector("h1").addEventListener("click", function() {
    alert("You clicked the header!");
});

var map;
var marker;
var directionsService, directionsRenderer;
var segmentMarkers = [];

function initialize() {
    var mapOptions = {
        center: new google.maps.LatLng(0, 0),
        zoom: 2,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);
}

google.maps.event.addDomListener(window, 'load', initialize);

document.getElementById('location-form').addEventListener('submit', function(e) {
    e.preventDefault(); 

    var location = document.getElementById('location-input').value; // Get location input

    // Fetching geolocation data from Google Maps API
    fetch('https://maps.googleapis.com/maps/api/geocode/json?address=' + location + '&key=AIzaSyBp8mCZ8DuGAHg3Ixre2aLjDt6K6m5hoB8')
    .then(response => response.json())
    .then(data => {
        var lat = data.results[0].geometry.location.lat;
        var lng = data.results[0].geometry.location.lng;

        if (marker) {
            marker.setMap(null);
        }

        marker = new google.maps.Marker({
            position: new google.maps.LatLng(lat, lng),
            map: map
        });

        var latLng = new google.maps.LatLng(lat, lng);
        map.panTo(latLng);  // Smooth transition to new location
        smoothZoom(map, 18, map.getZoom());  // Smooth zooming to new location

        // Clear previous segment markers
        for (var i = 0; i < segmentMarkers.length; i++) {
            segmentMarkers[i].setMap(null);
        }
        segmentMarkers = [];

        // Fetching segments from Strava API
        fetch(`https://www.strava.com/api/v3/segments/explore?bounds=${lat-0.015},${lng-0.015},${lat+0.015},${lng+0.015}&activity_type=cycling&access_token=e620322c89631826869b2189515b5ff66862e662`)
        .then(response => response.json())
        .then(data => {
            // Add segments as markers on the map
            data.segments.forEach(segment => {
                var segmentMarker = new google.maps.Marker({
                    position: new google.maps.LatLng(segment.start_latlng[0], segment.start_latlng[1]),
                    map: map,
                    title: segment.name
                });
                segmentMarkers.push(segmentMarker); // Push the marker to the array
            });
        });
    })
    .catch(error => console.error(error));
});

// Handling form submission for directions
document.getElementById('directions-form').addEventListener('submit', function(e) {
    e.preventDefault(); 

    var startLocation = document.getElementById('start-location').value; // Get start location input
    var endLocation = document.getElementById('end-location').value; // Get end location input

    directionsService.route({
        origin: startLocation,
        destination: endLocation,
        travelMode: 'DRIVING',
        provideRouteAlternatives: true
    }, function(response, status) {
        if (status === 'OK') {
            directionsRenderer.setDirections(response);

            // Create a new DistanceMatrixService object.
            var distanceMatrixService = new google.maps.DistanceMatrixService();

            distanceMatrixService.getDistanceMatrix({
                origins: [startLocation],
                destinations: [endLocation],
                travelMode: 'DRIVING',
            }, function(response, status) {
                if (status === 'OK') {
                    var distance = response.rows[0].elements[0].distance;
                    var duration = response.rows[0].elements[0].duration;

                    // You can now use the distance and duration results.
                    // For example, you could display them on your webpage like so:
                    document.getElementById('distance').innerText = 'Distance: ' + distance.text;
                    document.getElementById('duration').innerText = 'Duration: ' + duration.text;
                }
            });
        } else {
            alert('Directions request failed due to ' + status);
        }
    });
});


// smoothZoom function
function smoothZoom (map, max, cnt) {
    if (cnt >= max) {
        return;
    }
    else {
        let z = google.maps.event.addListener(map, 'zoom_changed', function(event){
            google.maps.event.removeListener(z);
            smoothZoom(map, max, cnt + 1);
        });
        setTimeout(function(){map.setZoom(cnt)}, 100); // 100ms between each zoom
    }
} 

// Event listener for form submission
document.getElementById('location-form').addEventListener('submit', function(e) {
    e.preventDefault(); 
    var location = document.getElementById('location-input').value; // Get location input


    

    // Sending request to Google Maps API
    fetch('https://maps.googleapis.com/maps/api/geocode/json?address=' + location + '&key=AIzaSyBp8mCZ8DuGAHg3Ixre2aLjDt6K6m5hoB8')
    .then(response => response.json())
    .then(data => {
        var lat = data.results[0].geometry.location.lat;
        var lng = data.results[0].geometry.location.lng;

        if (marker) {
            marker.setMap(null);
        }

        marker = new google.maps.Marker({
            position: new google.maps.LatLng(lat, lng),
            map: map
        });

        var latLng = new google.maps.LatLng(lat, lng);
        map.panTo(latLng);  // Smooth transition to new location
        smoothZoom(map, 18, map.getZoom());  // Smooth zooming to new location
    })
    .catch(error => console.error(error));
});

// Find current location
document.getElementById("current-location").addEventListener("click", function() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            var pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            if (marker) {
                marker.setMap(null);
            }

            marker = new google.maps.Marker({
                position: new google.maps.LatLng(pos.lat, pos.lng),
                map: map
            });

            var latLng = new google.maps.LatLng(pos.lat, pos.lng);
            map.panTo(latLng);  // Smooth transition to new location
            smoothZoom(map, 18, map.getZoom());  // Smooth zooming to new location
        }, function() {
            handleLocationError(true, map.getCenter());
        });
    } else {
        handleLocationError(false, map.getCenter());
    }
});

function handleLocationError(browserHasGeolocation, pos) {
    alert(browserHasGeolocation ?
        'Error: The Geolocation service failed.' :
        'Error: Your browser doesn\'t support geolocation.');
}
