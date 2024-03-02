/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

/**
 * Cartographie qui trace les POI sur un fond de carte Openstreetmap
 * @returns none
 */

//__________________________________________________________________________________________________________________________//
// Initialisation dimensions

var margin = { top: 10, right: 10, bottom: 45, left: 10 }
var window_width = window.innerWidth - margin.left - margin.right
var window_height = window.innerHeight - margin.top - margin.bottom

// Initialisation Map

d3.select('body').append('div')
  // .attr('style', `width:${map_width}px; height:${map_height}px`)
  .attr('id', 'map')
var map = L.map('map')// Did not set view because we are using "fit bounds" to get the polygons to determine this
var osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map)

// Initialisation Tooltip

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

// Création de la carte
createMap()

// Création du slider de date interactif
slider()

//__________________________________________________________________________________________________________________________//
// Fonctions utilisées //

async function slider() {
  // Data
  const locParsed = await loadLoc()
  const planningParsed = await loadJOData()
  var planningfiltered;
  var lieux_uniques;
  var Tab_lieux_uniques;

  // Variables de Dates
  const dates_str = [...new Set(planningParsed.map(d => d3.utcFormat('%A %e %B %Y')(d.date)))] // Impossible d'avoir les dates uniques sans formatter en str bizarre !
  const dates = d3.sort(d3.map(dates_str, d => d3.utcParse('%A %e %B %Y')(d)))
  var SelectedDates;

  // Couleurs et dimensions
  const colours = {
    top: '#37474f',
    bottom: '#546e7a',
    accent: '#263238'
  }
  const sliderWidth = 400
  const sliderHeight = 50

  // Echelles dediees
  const scaleBand = d3.scaleBand()
    .domain(dates)
    .range([10, sliderWidth]) // Légère marge gauche de 10 px
    .paddingInner(0.17)
    .paddingOuter(1)

  const scaleBalls = d3.scaleQuantize()
    .domain([0 + scaleBand.bandwidth(), sliderWidth - scaleBand.bandwidth()])
    .range(dates)

  // Creation du slider
  const dateBalls = // Elements date
    d3.extent(dates, d => d)
      .map((d) => ({ x: scaleBand(d), y: sliderHeight - 30 }))

  const g = d3.select('body').append('svg')
    .attr('width', sliderWidth)
    .attr('height', sliderHeight)
    .attr('class', 'slider')

  const grayLine = g
    .append('path')
    .attr(
      'd',
      d3.line()([
        [scaleBand(dates[0]), sliderHeight - 30],
        [scaleBand(dates[dates.length - 1]), sliderHeight - 30]
      ])
    )
    .attr('stroke-width', 2)
    .attr('opacity', 1)
    .attr('stroke', '#C1C5C7')

  const darkLine = g
    .append('path')
    .attr('class', 'darkline')
    .attr('d', d3.line()(dateBalls.map((d) => [d.x, d.y])))
    .attr('stroke-width', 2)
    .attr('stroke', colours.accent)

  const datePicker = g.selectAll('g').data(dateBalls).join('g')

  datePicker.call(
    d3.drag()
      .on('drag', function dragged(event, d) {
        const date = scaleBalls(event.x)

        const xAxisValue = scaleBand(date)
        // move the circle
        d3.select(this)
          .select('circle')
          .attr('cx', (d.x = xAxisValue))
        // move the dark line
        g.select('.darkline')
          .attr('d', d3.line()(dateBalls.map((d) => [d.x, d.y])))
        // change the text
        d3.select(this)
          .select('text')
          .attr('x', (d) => xAxisValue)
          .text((d) => d3.utcFormat('%a %e %b')(date))

        SelectedDates = d3.sort(dateBalls.map((d) => scaleBalls(d.x)))

        // Filter data based in slider value
        planningfiltered = d3.filter(planningParsed, d => d.date <= SelectedDates[1] && d.date >= SelectedDates[0])
        lieux_uniques = [...new Set(planningfiltered.map(d => d.lieu_epreuve))]
        // Création du nouveau tableau contenant les valeurs uniques des lieu_epreuve
        Tab_lieux_uniques = Array.from(lieux_uniques).map(lieu => {
          return planningfiltered.find(obj => obj.lieu_epreuve === lieu);
        })
        // Update the map with the new domain
        updateMap(Tab_lieux_uniques)
      })

      .on('end', () => {

        console.log(Tab_lieux_uniques)

      })
  )

  datePicker
    .append('circle')
    .attr('cx', (d) => d.x)
    .attr('cy', (d) => d.y)
    .attr('r', 9)
    .attr('fill', 'white')
    .attr('stroke-width', 2)
    .attr('stroke', colours.accent)
    .attr('style', 'cursor: pointer')

  datePicker
    .attr('text-anchor', 'middle')
    .attr('font-family', 'Roboto, Arial, sans-serif')
    .attr('font-size', '12px')
    .append('text')
    .attr('y', (d) => d.y + 20)
    .attr('x', (d) => d.x)
    .attr('fill', colours.accent)
    .text((d) => d3.utcFormat('%a %e %b')(scaleBalls(d.x)))

} // Fin fonction slider()

//__________________________________________________________________________________________________________________________//

async function createMap() {
  const planningParsed = await loadJOData()
  const lieux_uniques = [...new Set(planningParsed.map(d => d.lieu_epreuve))]
  const Tab_lieux_uniques = Array.from(lieux_uniques).map(lieu => {
    return planningParsed.find(obj => obj.lieu_epreuve === lieu);
  })
  const idfArr = await loadArr()
  const idfLayer = L.geoJson(idfArr, { // instantiates a new geoJson layer using built in geoJson handling
    weight: 2, // Attributes of polygons including the weight of boundaries and colors of map.
    color: '#432',
    opacity: 0.15
  }).bindPopup(function (Layer) { // binds a popup when clicking on each polygon to access underlying data
    return Layer.feature.properties.NAME
  }).addTo(map) // Adds the layer to the map.

  map.fitBounds(idfLayer.getBounds()) // finds bounds of polygon and automatically gets map view to fit (useful for interaction and not having to 'cook' the map zoom and coordinates as in map instantiation
  L.svg({ clickable: true }).addTo(map)
  var overlay = d3.select(map.getPanes().overlayPane)
  var svg_map = overlay.select('svg').attr('pointer-events', 'auto')
  var bigg = d3.select("#map").select("svg").select("g")
  bigg.attr("class", "leaflet-zoom-hide")

  updateMap(Tab_lieux_uniques)
} // Fin fonction createMap

//__________________________________________________________________________________________________________________________//

async function updateMap(filteredData) {

  const bigg = d3.select("#map").select("svg").select("g")
  const Dots = bigg.selectAll('points')
    .data(filteredData)
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
        .style('top', (e.pageY - 20) + 'px')
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
        .style('opacity', 0.8)
        .attr('r', 5)
    })

  const update = () => Dots
    .attr('cx', d => map.latLngToLayerPoint([d.latitude, d.longitude]).x)
    .attr('cy', d => map.latLngToLayerPoint([d.latitude, d.longitude]).y)

  map.on('zoomend', update)

  // Cette partie du code sert à supprimer les éléments de la map après chaque update (i.e après le 'map.on()') 
  const dots_unbinded = bigg.selectAll("circle")
    .data(filteredData, d => {
      return d.index;
    });

  dots_unbinded.exit()
    .transition().duration(0)
    .attr("r", 1)
    .remove();

  // -> Au prochain update de la map l'ajout des éléments se fera donc sur un carte vierge

} // Fin fonction updateMap()

//__________________________________________________________________________________________________________________________//

// Fonctions de chargement et parsing des données
async function loadArr() {
  const idfArr = (await fetch('https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/regions/ile-de-france/arrondissements-ile-de-france.geojson')).json()
  return idfArr
}

async function loadLoc() {
  const locParsed = await (d3.csv('../loc_epreuves.csv')
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
    dateTime: '%A %e %B %Y à %X',
    date: '%d/%m/%Y',
    time: '%H:%M:%S',
    periods: ['AM', 'PM'],
    days: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
    shortDays: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'],
    months: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
    shortMonths: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
  })
  const parseDateHour = d3.timeParse('%A %e %B %Y %H:%M')// https://d3js.org/d3-time-format
  const parseDate = d3.utcParse('%A %e %B %Y')

  const planningParsed = await (d3.csv('../session_planning_pars_with_loc_v12.csv')
    .then(data => {
      return data.map((d, i) => {
        const r = d
        r.time = parseDateHour(d.date + ' ' + '2024' + ' ' + d.debut_epreuve)
        r.date = parseDate(d.date + ' ' + '2024')
        r.num_jour = +r.num_jour
        r.latitude = +r.latitude
        r.longitude = +r.longitude
        r.index = i
        return r
      })
    }))
  return planningParsed
}

//__________________________________________________________________________________________________________________________//
