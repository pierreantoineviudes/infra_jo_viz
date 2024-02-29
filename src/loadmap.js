// var map_width = window_width * 0.75
// var map_height = map_width / 1.6

var map = L.map('map')// Did not set view because we are using "fit bounds" to get the polygons to determine this
var osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map)

var idfLayer = L.geoJson(idfArr, { // instantiates a new geoJson layer using built in geoJson handling
    weight: 2, // Attributes of polygons including the weight of boundaries and colors of map.
    color: '#432',
    opacity: 0.2
}).bindPopup(function (Layer) { // binds a popup when clicking on each polygon to access underlying data
    return Layer.feature.properties.NAME
}).addTo(map) // Adds the layer to the map.

map.fitBounds(idfLayer.getBounds()) // finds bounds of polygon and automatically gets map view to fit (useful for interaction and not having to 'cook' the map zoom and coordinates as in map instantiation

L.svg({ clickable: true }).addTo(map)
var overlay = d3.select(map.getPanes().overlayPane)
var svg_map = overlay.select('svg').attr('pointer-events', 'auto')
var bigg = d3.select("#map").select("svg").select("g")
bigg.attr("class", "leaflet-zoom-hide")

var Tooltip = d3.select('body')
    .append('div')
    .style('z-index', 3000)
    .style('opacity', 0)
    .attr('class', 'tooltip')
    .style('background-color', 'white')
    .style('border', 'solid')
    .style('border-width', '2px')
    .style('border-radius', '5px')
    .style('padding', '5px')

var Dots = svg_map.selectAll('points')
    .data(planningParsed)
    .join('circle')
    .attr('class', 'circle')
    .attr('cx', d => map.latLngToLayerPoint([d.latitude, d.longitude]).x)
    .attr('cy', d => map.latLngToLayerPoint([d.latitude, d.longitude]).y)
    .attr('r', 5)
    .style('fill', 'steelblue')
    .style('stroke', 'black')
    .style('opacity', 0.8)

    .on('mousemove', function (e, d) { // function to add mouseover event
        Tooltip
            .style('opacity', 0.9)
            .style('top', (e.pageY - 40) + 'px')
            .style('left', (e.pageX + 30) + 'px')
            .html(d.lieu_epreuve)

        d3.select(this).transition() // D3 selects the object we have moused over in order to perform operations on it
            .duration('100') // how long we are transitioning between the two states (works like keyframes)
            .style('fill', 'red') // change the fill
            .attr('r', 7)
            .style('opacity', 1)
    })

    .on('mouseleave', function () {
        Tooltip
            .style('opacity', 0)
        d3.select(this).transition()
            .duration('100')
            .style('fill', 'steelblue')
            .style('opacity', 0.05)
            .attr('r', 5)
    })

var update = () => Dots
    .attr('cx', d => map.latLngToLayerPoint([d.latitude, d.longitude]).x)
    .attr('cy', d => map.latLngToLayerPoint([d.latitude, d.longitude]).y)

map.on('zoomend', update)
