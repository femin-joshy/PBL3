

document.querySelector("h1").addEventListener("click", function() {
    alert("You clicked the header!");
});

var map;
var marker;
var directionsService, directionsRenderer;

function initialize() {
    
    var mapOptions = {
        center: new google.maps.LatLng(0,0),
        zoom: 2,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(document.getElementById("map"), mapOptions);

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);

    currentLoc();
}

google.maps.event.addDomListener(window, 'load', initialize);

// Handling form submission
document.getElementById('location-form').addEventListener('submit', function(e) {
    e.preventDefault(); 

    var location = document.getElementById('location-input').value; // Get location input

    
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

        
        map.setCenter(new google.maps.LatLng(lat, lng));
        map.setZoom(12);
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
        } else {
            alert('Directions request failed due to ' + status);
        }
    });
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

            map.setCenter(pos);
            map.setZoom(14);
        }, function() {
            handleLocationError(true, map.getCenter());
        });
    } else {
    
        handleLocationError(false, map.getCenter());
    }
});

// Find current location

function showLocation() {
    console.log("Hello")
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

            map.setCenter(pos);
            map.setZoom(14);
            
        }, function() {
            handleLocationError(true, map.getCenter());
        });
    } else {
        handleLocationError(false, map.getCenter());
    }
    return pos;
};

function handleLocationError(browserHasGeolocation, pos) {
    alert(browserHasGeolocation ?
        'Error: The Geolocation service failed.' :
        'Error: Your browser doesn\'t support geolocation.');
}

