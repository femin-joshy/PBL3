document.querySelector("h1").addEventListener("click", function() {
    alert("You clicked the header!");
});
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

}

google.maps.event.addDomListener(window, 'load', initialize);

function handleLocationError(browserHasGeolocation, pos) {
    alert(browserHasGeolocation ?
        'Error: The Geolocation service failed.' :
        'Error: Your browser doesn\'t support geolocation.');
}