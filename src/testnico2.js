/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

/**
 * Cartographie qui trace les POI sur un fond de carte Openstreetmap
 * @returns none
 */

async function main() {

  // Set the dimensions and margins
  const margin = { top: 10, right: 10, bottom: 45, left: 10 }
  const window_width = window.innerWidth - margin.left - margin.right
  const window_height = window.innerHeight - margin.top - margin.bottom

  // Data
  const idfArr = await loadArr()
  const planningParsed = await loadJOData()
  const locParsed = await loadLoc()

  //Variables de Dates
  const start = d3.min(planningParsed, d => d.date)
  const end = d3.max(planningParsed, d => d.date)
  const numberOfDays = d3.timeDay.count(start, end)
  const DateDomain = [start, end] // étendue des dates
  const dates = [...new Set(planningParsed.map(d => d3.utcFormat('%A %e %B %Y')(d.date)))] // Impossible d'avoir les dates unique sans formatter bizarre !
  const datefilteredplanning = d3.filter(planningParsed, d => d3.utcFormat('%A %e %B %Y')(d.date) == dates[2])

  console.log(locParsed)

  //Echelles
  const timeScale = d3.scaleTime()
    .domain(DateDomain)
    .range([0, numberOfDays])


  //CARTE INTERACTIVE
  const width = window_width * 0.75;

  d3.select('body').append('div')
    .attr('style', `width:${width}px; height:${width / 1.6}px`)
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

  const Tooltip = d3.select('body')
    .append("div")
    .style('z-index', 3000)
    .style("opacity", 0)
    .attr("class", "tooltip")
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "2px")
    .style("border-radius", "5px")
    .style("padding", "5px")

  const Dots = svg.selectAll('points')
    .data(datefilteredplanning)
    .join('circle')
    .attr('cx', d => map.latLngToLayerPoint([d.latitude, d.longitude]).x)
    .attr('cy', d => map.latLngToLayerPoint([d.latitude, d.longitude]).y)
    // .attr("cx", d=> projection([d.longitude, d.latitude])[0])
    // .attr("cy", d => projection([d.longitude, d.latitude])[1])
    .attr('r', 5)
    .style('fill', 'steelblue')
    .style('stroke', 'black')
    .style('opacity', 0.8)

    .on('mousemove', function (e, d) { // function to add mouseover event
      Tooltip
        .style('opacity', 0.9)
        .style("top", (e.pageY - 40) + "px")
        .style("left", (e.pageX + 30) + "px")
        .html(d["lieu_epreuve"])

      d3.select(this).transition() // D3 selects the object we have moused over in order to perform operations on it
        .duration('100') // how long we are transitioning between the two states (works like keyframes)
        .style('fill', 'red') // change the fill
        .attr('r', 7)
        .style('opacity', 1);
    })

    .on('mouseleave', function () {
      Tooltip
        .style('opacity', 0);
      d3.select(this).transition()
        .duration('100')
        .style('fill', 'steelblue')
        .style('opacity', 0.05)
        .attr('r', 5)
    })

  const update = () => Dots
    .attr('cx', d => map.latLngToLayerPoint([d.latitude, d.longitude]).x)
    .attr('cy', d => map.latLngToLayerPoint([d.latitude, d.longitude]).y)

  map.on('zoomend', update)


  // Création d'un sélecteur de dates

  scaleBand = d3.scaleBand()
    .domain(DateDomain)
    .range([0, window_width / 4])
    .paddingInner(0.17)
    .paddingOuter(1)

  scaleBalls = d3.scaleQuantize()
    .domain([0 + scaleBand.bandwidth(), width - scaleBand.bandwidth()])
    .range(planningParsed)


}



// Fonctions de chargement et parsing des données
async function loadArr() {
  const idfArr = (await fetch('https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/regions/ile-de-france/arrondissements-ile-de-france.geojson')).json()
  return idfArr
}

async function loadLoc() {
  const locParsed = await (d3.csv('../data/raw/loc_epreuves.csv')
    .then(data => {
      return data.map((d, i) => {
        const r = d
        r.latitude = +d.latitude
        r.longitude = +d.longitude
        return r
      })
    }))
  return locParsed
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
  const parseDateHour = d3.timeParse('%A %e %B %Y %H:%M');// https://d3js.org/d3-time-format
  const parseDate = d3.utcParse('%A %e %B %Y');

  const planningParsed = await (d3.csv('../data/raw/session_planning_with_loc_v3.csv')
    .then(data => {
      return data.map((d, i) => {
        const r = d
        r.time = parseDateHour(d.date + ' ' + '2024' + ' ' + d.debut_epreuve)
        r.date = parseDate(d.date + " " + "2024")
        r.num_jour = +r.num_jour
        r.latitude = +r.latitude
        r.longitude = +r.longitude
        r.index = i
        return r
      })
    }))
  return planningParsed
}