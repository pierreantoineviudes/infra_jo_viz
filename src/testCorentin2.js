/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

const { pointer } = require('d3-selection')

/**
 * Cartographie qui trace les POI sur un fond de carte Openstreetmap
 * @returns none
 */

// __________________________________________________________________________________________________________________________//
async function main() {
  // Initialisation dimensions

  const margin = { top: 10, right: 10, bottom: 45, left: 10 }
  const window_width = window.innerWidth - margin.left - margin.right
  const window_height = window.innerHeight - margin.top - margin.bottom
  // dimensions time tables
  const timeTableHeight = window_height / 2 // - margin.top - margin.bottom
  const timeTableWidth = window_width / 3
  // const xInitTT = map_width + margin.left
  // const yInitTT = map_height / 2

  // Data
  const locParsed = await loadLoc()
  const planningParsed = await loadJOData()
  let planningfiltered = planningParsed
  let datacloud = planningParsed
  let lieux_uniques = [...new Set(planningParsed.map(d => d.lieu_epreuve))]
  let Tab_lieux_uniques = Array.from(lieux_uniques).map(lieu => {
    return planningParsed.find(obj => obj.lieu_epreuve === lieu)
  })

  // Echelle
  const RadiusScale = d3.scaleLinear()
    .domain(d3.extent(planningParsed, d => +d.capacite))
    .range([10, 30])

  // Variables de Dates
  const dates_str = [...new Set(planningParsed.map(d => d3.utcFormat('%A %e %B %Y')(d.date)))] // Impossible d'avoir les dates uniques sans formatter en str bizarre !
  const dates = d3.sort(d3.map(dates_str, d => d3.utcParse('%A %e %B %Y')(d)))
  let SelectedDates = dates

  // Initialisation Map

  d3.select('body').append('div')
    // .attr('style', `width:${map_width}px; height:${map_height}px`)
    .attr('id', 'map')
  const map = L.map('map', { zoomControl: false })// Did not set view because we are using "fit bounds" to get the polygons to determine this
  const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map)

  // Initialisation Tooltip

  const Tooltip = d3.select('body')
    .append('div')
    .style('z-index', 3000)
    .style('opacity', 0)
    .attr('class', 'tooltip')
  // .style('border-width', '2px')

  // Initialisation div slider

  const slider_div = d3.select('body')
    .append('div')
    .attr('class', 'slider')

  // Création des tableaux
  // Infos sessions
  const titleInfoSessions = d3.select('body').append('div')
    // .attr('style', `width:${timeTableWidth}px; height:${timeTableHeight}px`)
    .attr('id', 'headInfoSession')

  const sessionTable = d3.select('body').append('div')
    .attr('style', `width:${timeTableWidth}px; height:${timeTableHeight}px`)
    .attr('id', 'infoSession')

  const gridSession = new gridjs.Grid({
    columns: [
      'Epreuve',
      'Genre',
      'Etape'
    ],
    data: [['', '', '']],
    // columns: ['Discipline', 'Date', 'Début', 'Fin'], //, 'Epreuve', 'H/F', 'Genre'],
    // data: [["", "", "", ""]],
    resizable: true,
    // pagination: true,
    fixedHeader: true,
    height: timeTableHeight + 'px',
    width: timeTableWidth + 'px',
    style: {
      td: {
        border: '1px solid #ccc'
      },
      table: {
        'font-size': '15px'
      }
    }
  })

  gridSession.render(document.getElementById('infoSession'))
  // var gridSession = createSessionTable()
  // console.log(gridSession)

  // Planning infras
  let selectedPlace = ''
  const titlePlanning = d3.select('body').append('div')
    .attr('style', `width:${timeTableWidth}px; height:80px`)
    .attr('id', 'dayTimeTable')

  const planningInfras = d3.select('body').append('div')
    .attr('style', `width:${timeTableWidth}px; height:${timeTableHeight}px`)
    .attr('id', 'timeTable')

  const gridTimeTable = new gridjs.Grid({
    columns: [
      'Discipline',
      'Jour',
      'Heure',
      {
        name: 'infosEpreuves',
        hidden: true
      }],
    data: [['', '', '']],
    // columns: ['Discipline', 'Date', 'Début', 'Fin'], //, 'Epreuve', 'H/F', 'Genre'],
    // data: [["", "", "", ""]],
    resizable: true,
    // pagination: true,
    fixedHeader: true,
    height: timeTableHeight + 'px',
    width: timeTableWidth + 'px',
    style: {
      td: {
        border: '1px solid #ccc'
      },
      table: {
        'font-size': '15px'
      }
    }
  })

  gridTimeTable.render(document.getElementById('timeTable'))
  gridTimeTable.on('rowClick', (...args) => updateSession(args))

  // var gridTimeTable = createTimeTable()
  // console.log(gridTimeTable)

  // Création de la carte
  createMap()

  // Création du slider de date interactif
  slider()

  // Création du wordcloud container
  createCloud()

  // __________________________________________________________________________________________________________________________//
  // Fonctions utilisées //

  async function slider() {
    // Couleurs et dimensions
    const colours = {
      top: '#37474f',
      bottom: '#546e7a',
      accent: '#263238'
    }
    const sliderWidth = 400
    const sliderHeight = 40

    // Echelles dediees
    const scaleBand = d3.scaleBand()
      .domain(dates)
      .range([20, sliderWidth]) // Légère marge gauche de 20 px
      .paddingInner(0.17)
      .paddingOuter(1)

    const scaleBalls = d3.scaleQuantize()
      .domain([0 + scaleBand.bandwidth(), sliderWidth - scaleBand.bandwidth()])
      .range(dates)

    // Creation du slider
    const dateBalls = // Elements date
      d3.extent(dates, d => d)
        .map((d) => ({ x: scaleBand(d), y: sliderHeight - 30 }))

    const g = slider_div.append('svg')
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
          datacloud = planningfiltered
          lieux_uniques = [...new Set(planningfiltered.map(d => d.lieu_epreuve))]
          // Création du nouveau tableau contenant les valeurs uniques des lieu_epreuve
          Tab_lieux_uniques = Array.from(lieux_uniques).map(lieu => {
            return planningfiltered.find(obj => obj.lieu_epreuve === lieu)
          })
          // Update the map with the new domain
          updateMap(Tab_lieux_uniques)
        })

        .on('end', () => {
          console.log('end')
          console.log(Tab_lieux_uniques)
          updateCloud(datacloud)
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
      // .attr('font-family', 'Roboto, Arial, sans-serif')
      .attr('font-size', '12px')
      .append('text')
      .attr('y', (d) => d.y + 20)
      .attr('x', (d) => d.x)
      .attr('fill', colours.accent)
      .text((d) => d3.utcFormat('%a %e %b')(scaleBalls(d.x)))
  } // Fin fonction slider()

  // __________________________________________________________________________________________________________________________//

  async function createMap() {
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
    const overlay = d3.select(map.getPanes().overlayPane)
    const svg_map = overlay.select('svg').attr('pointer-events', 'auto')
    const bigg = d3.select('#map').select('svg').select('g')
    bigg.attr('class', 'leaflet-zoom-hide')

    updateMap(Tab_lieux_uniques)
  } // Fin fonction createMap

  // __________________________________________________________________________________________________________________________//

  async function updateMap(filteredData) {
    const bigg = d3.select('#map').select('svg').select('g')
    const Dots = bigg.selectAll('points')
      .data(filteredData)
      .join('circle')
      .attr('class', 'circle')
      .attr('cx', d => map.latLngToLayerPoint([d.latitude, d.longitude]).x)
      .attr('cy', d => map.latLngToLayerPoint([d.latitude, d.longitude]).y)
      .attr('r', d => RadiusScale(d.capacite))
      .style('fill', 'steelblue')
      .style('stroke', 'black')
      .style('opacity', 0.5)

      .on('mousemove', function (e, d) { // function to add mouseover event
        Tooltip
          .style('opacity', 0.9)
          .style('top', (e.pageY - 40) + 'px')
          .style('left', (e.pageX + 15) + 'px')
          .html(d.lieu_epreuve + ' - ' + d.capacite)

        d3.select(this).transition() // D3 selects the object we have moused over in order to perform operations on it
          .duration('100') // how long we are transitioning between the two states (works like keyframes)
          .style('fill', 'red') // change the fill
        // .attr('r', 7)
        // .style('opacity', 1)
      })

      .on('mouseleave', function () {
        Tooltip
          .style('opacity', 0)

        d3.select(this).transition()
          .duration('100')
          .style('fill', 'steelblue')
          .style('opacity', 0.5)
          .attr('r', d => RadiusScale(d.capacite))
      })

      .on('click', function (e, d) {
        selectedPlace = d.lieu_epreuve
        updateTimeTable()
      })

    const update = () => Dots
      .attr('cx', d => map.latLngToLayerPoint([d.latitude, d.longitude]).x)
      .attr('cy', d => map.latLngToLayerPoint([d.latitude, d.longitude]).y)

    map.on('zoomend', update)

    // Cette partie du code sert à supprimer les éléments de la map après chaque update (i.e après le 'map.on()')
    const dots_unbinded = bigg.selectAll('circle')
      .data(filteredData, d => {
        return d.index
      })
    dots_unbinded.exit()
      .transition().duration(0)
      .attr('r', 1)
      .remove()

    // -> Au prochain update de la map l'ajout des éléments se fera donc sur un carte vierge
  } // Fin fonction updateMap

  // __________________________________________________________________________________________________________________________//

  // Création des tableaux planning infras & infos sessions

  async function createSessionTable() {
    d3.select('body').append('div')
      .attr('style', `width:${timeTableWidth / 2}px; height:${timeTableHeight / 2}px`)
      .attr('id', 'infoSession')

    const gridSession = new gridjs.Grid({
      columns: [
        'Epreuve',
        'Genre',
        'Etape'
      ],
      data: [['', '', '']],
      // columns: ['Discipline', 'Date', 'Début', 'Fin'], //, 'Epreuve', 'H/F', 'Genre'],
      // data: [["", "", "", ""]],
      resizable: true,
      // pagination: true,
      fixedHeader: true,
      height: timeTableHeight + 'px',
      width: timeTableWidth + 'px',
      style: {
        td: {
          border: '1px solid #ccc'
        },
        table: {
          'font-size': '15px'
        }
      }
    })

    gridSession.render(document.getElementById('infoSession'))
    return gridSession
  } // Fin fonction createSessionTable

  // __________________________________________________________________________________________________________________________//

  async function createTimeTable() {
    d3.select('body').append('div')
      .attr('style', `width:${timeTableWidth}px; height:80px`)
      .attr('id', 'dayTimeTable')

    d3.select('body').append('div')
      .attr('style', `width:${timeTableWidth}px; height:${timeTableHeight}px`)
      .attr('id', 'timeTable')

    const grid = new gridjs.Grid({
      columns: [
        'Discipline',
        'Jour',
        'Début',
        'Fin',
        {
          name: 'infosEpreuves',
          hidden: true
        }],
      data: [['', '', '', '']],
      // columns: ['Discipline', 'Date', 'Début', 'Fin'], //, 'Epreuve', 'H/F', 'Genre'],
      // data: [["", "", "", ""]],
      resizable: true,
      // pagination: true,
      fixedHeader: true,
      height: timeTableHeight + 'px',
      width: timeTableWidth + 'px',
      style: {
        td: {
          border: '1px solid #ccc'
        },
        table: {
          'font-size': '15px'
        }
      }
    })

    grid.on('rowClick', (...args) => updateSession(args))
    return grid.render(document.getElementById('timeTable'))
  } // Fin fonction createTimeTable

  // __________________________________________________________________________________________________________________________//

  function updateSession(args) {
    sessionString = selectedPlace + '|' + args[1]._cells[0].data + '|' + args[1]._cells[1].data + '|' + args[1]._cells[2].data
    console.log(sessionString)
    titleInfoSessions.html('Session : ' + sessionString)
    dataSession = args[1]._cells[3].data.content
    // .epreuve, args[1]._cells[4].data.content.genre, args[1]._cells[4].data.content.etape]
    console.log(dataSession)// [dataSession.epreuve, dataSession.genre, dataSession.etape])
    gridSession.updateConfig({
      data: dataSession // [dataSession.epreuve, dataSession.genre, dataSession.etape]
    }).forceRender()
    sessionTable.style('z-index', 9000)
    titleInfoSessions.style('z-index', 9000)
  } // Fin fonction updateSession

  // __________________________________________________________________________________________________________________________//

  function updateTimeTable() {
    document.getElementById('timeTable').innerHTML = ''
    titlePlanning.html(selectedPlace)
    selectedSessions = d3.filter(planningfiltered, d => d.lieu_epreuve === selectedPlace)
    console.log(selectedPlace)

    dataSelectedSessions = selectedSessions.map(d => [d.discipline, d.jour, d.plage, customJSONParsing(d.parsing_epreuve)])
    console.log(dataSelectedSessions)

    console.log(gridTimeTable)
    gridTimeTable.updateConfig({
      data: dataSelectedSessions
    }).forceRender()
    planningInfras.style('z-index', 9000)
    sessionTable.style('z-index', 0)
    titleInfoSessions.style('z-index', 0)
    // document.getElementById("timeTable").style('opacity', 0.9)
  } // Fin fonction updateTimeTable

  // __________________________________________________________________________________________________________________________//

  function customJSONParsing(x) {
    try {
      return JSON.parse(x)
    } catch (e) {
      return { content: [] }
    }
  } // Fin fonction customJSONParsing

  // __________________________________________________________________________________________________________________________//

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
    const frFR1 = d3.timeFormatDefaultLocale({
      dateTime: '%A %e %B %Y à %X',
      date: '%d/%m/%Y',
      time: '%H:%M:%S',
      periods: ['AM', 'PM'],
      days: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
      shortDays: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'],
      months: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
      shortMonths: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
    })

    const frFR2 = d3.formatDefaultLocale({
      decimal: ',',
      thousands: '\u00a0',
      grouping: [3],
      currency: ['', '\u00a0€'],
      percent: '\u202f%'
    })

    const parseDateHour = d3.timeParse('%A %e %B %Y %H:%M')// https://d3js.org/d3-time-format
    const parseDate = d3.utcParse('%A %e %B %Y')

    const planningParsed = await (d3.csv('../session_planning_with_loc_v13.csv')
      .then(data => {
        return data.map((d, i) => {
          const r = d
          r.jour = d.date
          r.plage = d.debut_epreuve + ' : ' + d.fin_epreuve
          r.time = parseDateHour(d.date + ' ' + '2024' + ' ' + d.debut_epreuve)
          r.date = parseDate(d.date + ' ' + '2024')
          r.num_jour = +r.num_jour
          r.latitude = +r.latitude
          r.longitude = +r.longitude
          r.capacite = (+r.capacite) // d3.format("\u00a0")?
          r.index = i
          return r
        })
      }))
    return planningParsed
  }

  // __________________________________________________________________________________________________________________________//

  // functions for wordcloud
  // create wordcloud
  async function createCloud() {
    // set the dimensions for wordcloud
    const width = timeTableWidth
    const height = timeTableHeight

    // append the svg object to the body of the page
    const svg = d3.select('body').append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('z-index', '9000')
      .style('position', 'absolute')
      .attr('class', 'wordcloudContainer')
      .append('g')
    updateCloud(planningfiltered)
  }

  async function updateCloud(data) {
    // set the dimensions for wordcloud
    const width = timeTableWidth
    const height = timeTableHeight
    const svg = d3.select('.wordcloudContainer')
    svg.selectAll('*')
    .transition()
    .duration(500)
    .style('opacity', 0)
    .remove()
    const dataClean = data.map(e => {
      const r = {
        sport: e.discipline,
        capacite: e.capacite
      }
      return r
    })
    const rolledupdata = [...d3.rollup(dataClean, v => d3.sum(v, e => e.capacite), d => d.sport)]
    const wordCloudScale = d3.scaleLog()
      .domain([d3.min(rolledupdata, d => d[1]), d3.max(rolledupdata, d => d[1])])
      .range([10, 50])
    // Constructs a new cloud layout instance. It run an algorithm to find the position of words that suits your requirements
    const layout = d3.layout.cloud()
      .size([width, height])
      .words(rolledupdata.map(function (d) {
        return {
          text: d[0],
          size: wordCloudScale(d[1])
        }
      }))
      .padding(10)
      .rotate(0)
      .fontSize(function (d) {
        // console.log('d : fontsize', d)
        return d.size
      })
      .on('end', draw)
    layout.start()

    // This function takes the output of 'layout' above and draw the words
    // Better not to touch it. To change parameters, play with the 'layout' variable above
    function draw (words) {
      const textGroup = svg
        .append('g')
        .attr('class', 'groupclass')
        .attr('transform', 'translate(' + layout.size()[0] / 2 + ',' + layout.size()[1] / 2 + ')')
        .selectAll('text')
        .data(words)
        .enter().append('text')
        .style('font-size', function (d) { return d.size + 'px' })
        // .style('font-family', 'Roboto')
        .attr('text-anchor', 'middle')
        .attr('transform', function (d) {
          return 'translate(' + [d.x, d.y] + ')rotate(' + d.rotate + ')'
        })
        .text(function (d) { return d.text })
        .style('opacity', 0)
        .transition()
        .duration(500)
        .style('opacity', 1)
    }
  }
}
