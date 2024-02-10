import * as d3 from 'd3';

// The svg;
const svg = d3.select('svg');

// Map and projection
const width = 500;
const height = 500;
const projection = d3.geoMercator()
    .center([2, 47])                // GPS of location to zoom on
    .scale(1020)                       // This is like the zoom
    .translate([width / 2, height / 2]);


// Create data for circles:
var markers = [
    { long: 9.083, lat: 42.149 }, // corsica
    { long: 7.26, lat: 43.71 }, // nice
    { long: 2.349, lat: 48.864 }, // Paris
    { long: -1.397, lat: 43.664 }, // Hossegor
    { long: 3.075, lat: 50.640 }, // Lille
    { long: -3.83, lat: 58 }, // Morlaix
];

// Load external data and boot
d3.json('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson', function (data) {

    // Filter data
    data.features = data.features.filter(function (d) { return d.properties.name == 'France' })

    // Draw the map
    svg.append('g')
        .selectAll('path')
        .data(data.features)
        .enter()
        .append('path')
        .attr('fill', '#b8b8b8')
        .attr('d', d3.geoPath()
            .projection(projection)
        )
        .style('stroke', 'black')
        .style('opacity', .3)

    // Add circles:
    svg
        .selectAll('myCircles')
        .data(markers)
        .enter()
        .append('circle')
        .attr('cx', function (d) { return projection([d.long, d.lat])[0] })
        .attr('cy', function (d) { return projection([d.long, d.lat])[1] })
        .attr('r', 14)
        .style('fill', '69b3a2')
        .attr('stroke', '#69b3a2')
        .attr('stroke-width', 3)
        .attr('fill-opacity', .4)
})