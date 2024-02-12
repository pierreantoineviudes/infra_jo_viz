/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

/**
 * Cartographie qui trace les POI sur un fond de carte Openstreetmap
 * @returns none
 */
async function main() {
    const width = 800
    const height = 300
    console.log('hello world')
    const idfArr = await loadArr()
    console.log(idfArr)
    const planningParsed = await loadJOData()
    console.log('planningParsed : ', planningParsed)

    // Adding tooltip
    const tooltip = d3.select('body').append('div')
        .attr('class', 'hidden tooltip')


    // Creating the map
    d3.select('body').append('div')
        .attr('style', `width:${width}px;height:${width / 1.6}px`)
        .attr('id', 'map')
    const map = L.map('map')// Did not set view because we are using "fit bounds" to get the polygons to determine this
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map)

    const idfLayer = L.geoJson(idfArr, { // instantiates a new geoJson layer using built in geoJson handling
        weight: 2, // Attributes of polygons including the weight of boundaries and colors of map.
        color: '#432',
        opacity: 0.2
    }).bindPopup(function (Layer) { // binds a popup when clicking on each polygon to access underlying data
        return Layer.feature.properties.NAME
    }).addTo(map) // Adds the layer to the map.

    map.fitBounds(idfLayer.getBounds()) // finds bounds of polygon and automatically gets map view to fit (useful for interaction and not having to 'cook' the map zoom and coordinates as in map instantiation

    L.svg({ clickable: true }).addTo(map)
    const overlay = d3.select(map.getPanes().overlayPane)
    const svg = overlay.select('svg').attr("pointer-events", "auto")

    const tooltip_bis = d3.select('body').append("div")
        .style("opacity", 0)
        .attr("class", "tooltip")
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "2px")
        .style("border-radius", "5px")
        .style("padding", "5px")

    // Plotting the dots (lieu_epreuve)
    const Dots = svg.selectAll('points')
        .data(planningParsed)
        .join('circle')
        .attr('cx', d => map.latLngToLayerPoint([d.latitude, d.longitude]).x)
        .attr('cy', d => map.latLngToLayerPoint([d.latitude, d.longitude]).y)
        // .attr("cx", d=> projection([d.longitude, d.latitude])[0])
        // .attr("cy", d => projection([d.longitude, d.latitude])[1])
        .attr('r', 4)
        .style('fill', 'steelblue')
        .style('stroke', 'black')
        .style('opacity', 0.2)

        // Utilisation du tooltip
        .on('mousemove', function (e, d) { // function to add mouseover event
            tooltip_bis
                .style("opacity", 0.9)
                .style("left", (e.pageX) + "px")
                //console.log(d3.mouse(this))
                .style("top", (e.pageY - 40) + "px")
                .style("z-index", 3000)
                .html(d["lieu_epreuve"]);

            d3.select(this).transition()
                .duration('150')
                .attr('r', 7)
                .style('fill', 'red')
                .style('opacity', 1)
                .style('stroke', 'black');

        })


        .on('mouseleave', function () { // function to add mouseover event
            tooltip_bis
                .style("opacity", 0);

            d3.select(this).transition() // D3 selects the object we have moused over in order to perform operations on it
                .duration('150') // how long we are transitioning between the two states (works like keyframes)
                .attr('r', 4) // change radius
                .style('fill', 'steelblue')
                .style('stroke', 'black')
                .style('opacity', 0.2);
            //tooltip.classed('hidden', true);
        })
    const update = () => Dots
        .attr('cx', d => map.latLngToLayerPoint([d.latitude, d.longitude]).x)
        .attr('cy', d => map.latLngToLayerPoint([d.latitude, d.longitude]).y)

    map.on('zoomend', update)
}

async function loadArr() {
    const idfArr = (await fetch('https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/regions/ile-de-france/arrondissements-ile-de-france.geojson')).json()
    return idfArr
}

async function loadJOData() {
    const frFR = d3.timeFormatDefaultLocale({
        "dateTime": "%A %e %B %Y à %X",
        "date": "%d/%m/%Y",
        "time": "%H:%M:%S",
        "periods": ["AM", "PM"],
        "days": ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"],
        "shortDays": ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."],
        "months": ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
        "shortMonths": ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."]
    });

    const planningParsed = await (d3.csv('session_planning_with_loc_v2.csv')
        .then(data => {
            return data.map((d, i) => {
                const r = d
                r.time = parseDateHour(d.date + ' ' + '2024' + ' ' + d.debut_epreuve)
                r.num_jour = +r.num_jour
                r.latitude = +r.latitude
                r.longitude = +r.longitude
                return r
            })
        }))
    return planningParsed
}

parseDateHour = d3.utcParse('%A %e %B %Y %H:%M') // https://d3js.org/d3-time-format
  