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
  // const locParsed = await loadLoc()

  // Variables de Dates
  const dates_str = [...new Set(planningParsed.map(d => d3.utcFormat('%A %e %B %Y')(d.date)))] // Impossible d'avoir les dates uniques sans formatter en str bizarre !
  const dates = d3.sort(d3.map(dates_str, d => d3.utcParse('%A %e %B %Y')(d)))
  const SelectedDates = [dates[0], dates[dates.length - 1]]
  var planningfiltered = planningParsed
  var dataSelectedSessions = ["Discipline", "Début", "Fin"]
  // _______________________________________________________________________________//

  // SLIDER DE DATES

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
    .range([0, sliderWidth])
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
        // move the blue line
        g.select('.darkline')
          .attr('d', d3.line()(dateBalls.map((d) => [d.x, d.y])))
        // change the text
        d3.select(this)
          .select('text')
          .attr('x', (d) => xAxisValue)
          .text((d) => d3.utcFormat('%a %e %b')(date))
      })

      .on('end', () => {
        const SelectedDates = d3.sort(dateBalls.map((d) => scaleBalls(d.x)))
        console.log(SelectedDates)
        // Filter data based in slider value
        planningfiltered = d3.filter(planningParsed, d => d.date <= SelectedDates[1] && d.date >= SelectedDates[0])
        console.log(planningfiltered)
        // Update the map with the new domain
        // svg_map.select('#circle')
        //   .attr('d', )
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

  // Donnees filtrees par la date selectionnee



  // ______________________________________________________________________________//

  // CARTE INTERACTIVE
  const map_width = window_width * 0.75
  const map_height = map_width / 1.6
  d3.select('body').append('div')
    .attr('style', `width:${map_width}px; height:${map_height}px`)
    .attr('id', 'map')

  // PLANNING INFRAS
  const timeTableHeight = window_height //- margin.top - margin.bottom
  const timeTableWidth = window_width / 2
  const xInitTT = map_width + margin.left
  const yInitTT = map_height / 2


  d3.select('body').append('div')
    .attr('style', `width:${timeTableWidth}px; height:80px`)
    .attr('id', 'dayTimeTable')

  d3.select('body').append('div')
    .attr('style', `width:${timeTableWidth}px; height:${timeTableHeight}px`)
    .attr('id', 'timeTable')

  d3.select('body').append('div')
    .attr('style', `width:${timeTableWidth / 2}px; height:${timeTableHeight / 2}px`)
    .attr('id', 'infoSession')

  const gridSession = new gridjs.Grid({
    columns: [
      'Epreuve',
      'Genre',
      'Etape'
    ],
    data: [["", "", ""]],
    // columns: ['Discipline', 'Date', 'Début', 'Fin'], //, 'Epreuve', 'H/F', 'Genre'],
    // data: [["", "", "", ""]],
    resizable: true,
    pagination: true,
    fixedHeader: true,
    height: timeTableHeight / 2 + 'px',
    width: timeTableWidth / 2 + 'px',
    style: {
      td: {
        border: '1px solid #ccc'
      },
      table: {
        'font-size': '15px'
      }
    }
  });

  gridSession.render(document.getElementById('infoSession'));

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
    data: [["", "", "", ""]],
    // columns: ['Discipline', 'Date', 'Début', 'Fin'], //, 'Epreuve', 'H/F', 'Genre'],
    // data: [["", "", "", ""]],
    resizable: true,
    pagination: true,
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
  });
  grid.render(document.getElementById('timeTable'));

  grid.on('rowClick', (...args) => updateSession(args))
  // console.log('row: ' + JSON.stringify(args), args));

  function updateSession(args) {
    dataSession = args[1]._cells[4].data.content
    // .epreuve, args[1]._cells[4].data.content.genre, args[1]._cells[4].data.content.etape]
    console.log(dataSession)//[dataSession.epreuve, dataSession.genre, dataSession.etape])
    gridSession.updateConfig({
      data: dataSession // [dataSession.epreuve, dataSession.genre, dataSession.etape]
    }).forceRender();
  }
  // gridSession.updateConfig({
  //   data : dataSelectedSessions
  // }).forceRender();


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
  const svg = overlay.select('svg').attr('pointer-events', 'auto')
  const svg_map = overlay.select('svg').attr('pointer-events', 'auto')

  const Tooltip = d3.select('body')
    .append('div')
    .style('z-index', 3000)
    .style('opacity', 0)
    .attr('class', 'tooltip')
    .style('background-color', 'white')
    .style('border', 'solid')
    .style('border-width', '2px')
    .style('border-radius', '5px')
    .style('padding', '5px')

  const Dots = svg_map.selectAll('points')
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

    .on('click', function (e, d) {
      document.getElementById("timeTable").innerHTML = "";
      selectedPlace = d.lieu_epreuve
      document.getElementById("dayTimeTable").innerHTML = selectedPlace
      selectedSessions = d3.filter(planningfiltered, d => d.lieu_epreuve === selectedPlace)
      console.log(selectedPlace)


      dataSelectedSessions = selectedSessions.map(d => [d.discipline, d.jour, d.debut_epreuve, d.fin_epreuve, customJSONParsing(d.parsing_epreuve)])
      console.log(dataSelectedSessions)

      // const grid = new gridjs.Grid({
      //   columns: ['Discipline', 'Jour', 'Début', 'Fin'], //, 'Epreuve', 'H/F', 'Genre'],
      //   data: dataSelectedSessions,
      //   sort: true,
      //   pagination: true,
      //   fixedHeader: true,
      //   height: window_height+'px',
      // });
      // grid.render(document.getElementById('timeTable'));

      grid.updateConfig({
        data: dataSelectedSessions
      }).forceRender();

      // for (var i = 0; i < selectedSessions.length; i++){
      //   console.log(selectedSessions[i].discipline)
      //   console.log(selectedSessions[i].date, selectedSessions[i].debut_epreuve, selectedSessions[i].fin_epreuve)

      //   const grid = new gridjs.Grid({
      //     columns: ['Discipline', 'Début', 'Fin'], //, 'Epreuve', 'H/F', 'Genre'],
      //     data: dataSelectedSessions
      //   });

      //   obj = JSON.parse(selectedSessions[i].parsing_epreuve)
      //   infosEpreuve = obj.content
      //   console.log(infosEpreuve)
      //   for (var j =0; j < infosEpreuve.length; j++){
      //     console.log("Epreuve : ", infosEpreuve[j].epreuve, "Etape : ", infosEpreuve[j].etape, "H/F : ", infosEpreuve[j].genre)
      //   }
      // }
      // console.log(selectedSessions.map(d => JSON.parse(d.parsing_epreuve.epreuve)))

      // isJsonString('{ "Id": 1, "Name": "Coke" }')
      // planningfiltered = d3.filter(planningfiltered, d => d.lieu_epreuve <= SelectedDates[1] )
    })


  const update = () => Dots
    .attr('cx', d => map.latLngToLayerPoint([d.latitude, d.longitude]).x)
    .attr('cy', d => map.latLngToLayerPoint([d.latitude, d.longitude]).y)

  map.on('zoomend', update)
  // _____________________________________________________________________________//


  // create svg element:
  // const timeTable = d3.select('body')
  //   .append("div")
  //   .attr("width", timeTableWidth)
  //   .attr("height", timeTableHeight)

  // .attr('x', xInitTT)
  // .attr('y', yInitTT)

  // Add the path using this helper function
  // timeTable.append('rect')
  //   .attr('x', 0)
  //   .attr('y', 0)
  //   .attr('width', timeTableWidth)
  //   .attr('height', timeTableHeight)
  //   .attr('stroke', 'black')
  //   .attr('fill', '#69a3b2');

  // const timeTable = d3.select('body')
  //   .append('div')
  //   .attr('class', 'rect')
  // .attr("x", x_init)
  // .attr("y", y_init)
  // .attr("width", timeTableWidth)
  // .attr("height", timeTableHeight)
  // .attr("fill", "red")
  // .attr("stroke-width", 3)
  // .attr("stroke", "black")
}



// const timeTable = d3.select('body')
// .append('div')
// .style('z-index', 3000)
// .style('opacity', 0)
// .attr('class', 'rect')
// .style('background-color', 'white')
// .style('border', 'solid')
// .style('border-width', '2px')
// .style('border-radius', '5px')
// .style('padding', '5px')


// d3.select('body').append("div")
// .attr("x", x_init)
// .attr("y", y_init)
// .attr("width", timeTableWidth)
// .attr("height", timeTableHeight)
// .attr("fill", "black")
// .attr("stroke-width", 3)
// .attr("stroke", "black")

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


function isJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}


function customJSONParsing(x) {
  try {
    return JSON.parse(x);
  } catch (e) {
    return { "content": [] };
  }
  // return true;
  //   if(isJsonString(x)){
  //     return JSON.parse(x)
  //   }
  //   else {
  //     return {}
  //   }
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
        r.jour = d.date
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
