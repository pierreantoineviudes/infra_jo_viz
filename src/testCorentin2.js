/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

/**
 * Cartographie qui trace les POI sur un fond de carte Openstreetmap
 *
 * La cartographie utilise les données préprocessées en python "output.csv"
 * des variables de data globales sont créées
 * elles sont ensuites modifiées et filtrées par les différents callbacks qui exsitent
 * à chaque intéraction avec un widget, les variables globales sont updatées et les visualisations
 * sont recréées
 * @returns none
 */

// __________________________________________________________________________________________________________________________//
async function main () {
  let windowWidth = window.innerWidth
  let windowHeight = window.innerHeight
  // Initialisation dimensions

  const margin = { top: 10, right: 10, bottom: 45, left: 10 }
  let window_width = windowWidth - margin.left - margin.right
  let window_height = windowHeight - margin.top - margin.bottom
  // dimensions time tables
  let timeTableHeight = window_height / 2.2 // - margin.top - margin.bottom
  let timeTableWidth = window_width / 3
  // const xInitTT = map_width + margin.left
  // const yInitTT = map_height / 2

  // Data
  const planningParsed = await loadJOData()
  let planningfiltered = planningParsed
  let datacloud = planningfiltered
  let lieux = [...new Set(planningParsed.map(d => d.lieu_epreuve))]

  let newtab = [...d3.rollup(planningfiltered, group => ({
    ConcatenatedDiscipline: [...new Set(group.map(d => d.discipline))].join(', '),
    ...group[0]
  }),
  d => d.lieu_epreuve)]
  let selectedPlace = ''
  const url_root = 'https://www.paris2024.org/fr/sport/'
  let gridSession = creategridSession()
  let gridTimeTable = creategridTimeTable()

  // Echelle
  const RadiusScale = d3.scaleLinear()
    .domain(d3.extent(planningParsed, d => +d.capacite))
    .range([10, 40])

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

  // Initialisation Tooltips

  const Tooltip_map = d3.select('body')
    .append('div')
    .style('opacity', 0)
    .attr('class', 'maptooltip')
    .style('border-width', '1px')

  const Tooltip_cloud = d3.select('body')
    .append('div')
    .style('opacity', 0)
    .attr('class', 'cloudtooltip')
    .style('border-width', '1px')

  // Initialisation div slider

  const slider_div = d3.select('body')
    .append('div')
    .attr('class', 'slider')
    .style('border-width', '1px')

  // Création de la carte
  createMap()

  // Création du slider de date interactif
  slider()

  // Création du wordcloud container
  createCloud()
  // __________________________________________________________________________________________________________________________//
  // Fonctions utilisées //

  async function slider () {
    // Couleurs et dimensions
    const colours = {
      top: '#37474f',
      bottom: '#546e7a',
      accent: '#263238'
    }
    const sliderWidth = windowWidth * 0.6
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
        .on('drag', function dragged (event, d) {
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
          newtab = [...d3.rollup(planningfiltered, group => ({
            ConcatenatedDiscipline: [...new Set(group.map(d => d.discipline))].join(', '),
            ...group[0]
          }),
          d => d.lieu_epreuve)]
          // Update the map with the new domain
          updateMap()
        })

        .on('end', () => {
          updateCloud()
          updateTimeTable()
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

  async function createMap () {
    const idfArr = await loadArr()
    const idfLayer = L.geoJson(idfArr, { // instantiates a new geoJson layer using built in geoJson handling
      weight: 2, // Attributes of polygons including the weight of boundaries and colors of map.
      color: '#432',
      opacity: 0.07
    }).bindPopup(function (Layer) { // binds a popup when clicking on each polygon to access underlying data
      return Layer.feature.properties.NAME
    })
      .addTo(map) // Adds the layer to the map.

    map.fitBounds(idfLayer.getBounds()) // finds bounds of polygon and automatically gets map view to fit (useful for interaction and not having to 'cook' the map zoom and coordinates as in map instantiation
    L.svg({ clickable: true }).addTo(map)

    const overlay = d3.select(map.getPanes().overlayPane)
    const svg_map = overlay.select('svg').attr('pointer-events', 'auto')
    const bigg = d3.select('#map').select('svg').select('g')
    bigg.attr('class', 'leaflet-zoom-hide')

    // clickable_background = overlay.append('svg')
    //   .attr('class', 'clickable-background')
    //   .attr('width', window.innerWidth)
    //   .attr('height', window.innerHeight)

    updateMap()
  } // Fin fonction createMap

  // __________________________________________________________________________________________________________________________//

  async function updateMap () {
    const bigg = d3.select('#map').select('svg').select('g')

    const fond_cliquable = bigg.selectAll('path') // le click réinitialise la vue et déselectionne les cercles sélectionnés
      .on('click', () => {
        resetView()
      })

    const Dots = bigg.selectAll('circle')
      // .data(Tab_lieux)
      .data(newtab)
      .join('circle')
      .attr('class', 'circle')
      .attr('cx', d => map.latLngToLayerPoint([d[1].latitude, d[1].longitude]).x)
      .attr('cy', d => map.latLngToLayerPoint([d[1].latitude, d[1].longitude]).y)
      .attr('r', d => RadiusScale(d[1].capacite))
      .style('fill', 'steelblue')
      .style('stroke', 'black')
      .style('opacity', 0.5)
      // .attr('clicked', 'False')

      .on('mouseenter', function (e, d) { // function to add mouseover event
        Tooltip_map
          .style('z-index', 10000)
          .style('opacity', 0.9)
          .style('top', (e.pageY - 40) + 'px')
          .style('left', (e.pageX + 15) + 'px')
          .html(d[1].lieu_epreuve + ' - ' + `<b>${d[1].capacite}<b>`)

        isclicked = d.__selected
        if (!isclicked) {
          d3.select(this).transition()
            .duration('0')
            .style('fill', 'red')
            .style('cursor', 'pointer')
        } else {
        }
      })

      .on('click', function (e, d) {
        selection = d3.select(this)
        isclicked = d.__selected
        if (!isclicked) {
          d.__selected = true
          selection.style('opacity', 0.9)
        } else {
          d.__selected = false
          selection.style('opacity', 0.5)
        }

        selectedPlace = d[1].lieu_epreuve
        createTimeTable()
        // updateTimeTable()
        // displayTimeTable()
        console.log(newtab)
        lieux = newtab.filter(d => d.__selected).map(d => d[0])// Liste des infra sélectionnées
        console.log(lieux)

        datacloud = planningfiltered.filter(f => lieux.includes(f.lieu_epreuve))
        console.log('Datacloud :', datacloud)

        if (lieux.length > 0) {
          bigg.selectAll('circle').filter(f => !f.__selected)
            .style('opacity', 0.2)
        } else { // All has been unselected, reset global opacitys, DataCloud, PlaningInfra and Map
          bigg.selectAll('circle').filter(f => !f.__selected)
            .style('opacity', 0.5)
          datacloud = planningfiltered // wordcloud réinit. sur les données globales
          newtab = [...d3.rollup(planningfiltered, group => ({
            ConcatenatedDiscipline: [...new Set(group.map(d => d.discipline))].join(', '),
            ...group[0]
          }),
          d => d.lieu_epreuve)]
          updateMap()
        }

        updateCloud()
      })

      .on('mouseleave', function () {
        Tooltip_map
          .style('z-index', 0)

        bigg.selectAll('circle').filter(f => !f.__selected).transition()
          .duration('100')
          .style('fill', 'steelblue')
      })

    const update = () => Dots
      .attr('cx', d => map.latLngToLayerPoint([d[1].latitude, d[1].longitude]).x)
      .attr('cy', d => map.latLngToLayerPoint([d[1].latitude, d[1].longitude]).y)

    map.on('zoomend', update)

    // Cette partie du code sert à supprimer les éléments de la map après chaque update (i.e après le 'map.on()')
    // const dots_unbinded = bigg.selectAll('circle')
    //   .data(datacloud, d => {
    //     return d.index
    //   })
    // dots_unbinded.exit()
    //   .transition().duration(0)
    //   .attr('r', 1)
    //   .remove()

    // -> Au prochain update de la map l'ajout des éléments se fera donc sur un carte vierge
  } // Fin fonction updateMap

  // __________________________________________________________________________________________________________________________//

  // Création des tableaux planning infras & infos sessions

  // functions to create gridJS objects
  function creategridSession () {
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
      'max-width': '50px',
      style: {
        td: {
          border: '1px solid #ccc',
          padding: '10px',
          'max-width': '5px'
        },
        table: {
          'font-size': '15px'
        }
      }
    })
    return gridSession
  }

  function creategridTimeTable () {
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
        th: {
          padding: '10px'
        },
        td: {
          border: '1px solid #ccc',
          padding: '10px'
        },
        table: {
          'font-size': '15px'
        }
      }
    })
    return gridTimeTable
  }

  // __________________________________________________________________________________________________________________________//

  async function createTimeTable () {
    // remove the old timetable if exists
    d3.select('#timeTable').remove()
    // Planning infras
    const titlePlanning = d3.select('body').append('div')
      .attr('style', `left:${windowWidth - timeTableWidth - 10}px`)
      .attr('id', 'dayTimeTable')

    const planningInfras = d3.select('body').append('div')
      .attr('style', `width:${timeTableWidth}px; height:${timeTableHeight}px`)
      .attr('id', 'timeTable')

    gridTimeTable.render(document.getElementById('timeTable'))

    // gestion de l'intéraction avec les lignes
    gridTimeTable.on('rowClick', (...args) => {
      createInfoSession()
      updateSession(args)
    })
    document.getElementById('timeTable').innerHTML = ''
    titlePlanning.html(selectedPlace)
    selectedSessions = d3.filter(planningfiltered, d => d.lieu_epreuve === selectedPlace)
    dataSelectedSessions = selectedSessions.map(d => [d.discipline, d.jour, d.plage, customJSONParsing(d.parsing_epreuve)])
    gridTimeTable.updateConfig({
      data: dataSelectedSessions
    }).forceRender()
  } // Fin fonction createTimeTable

  async function createInfoSession () {
    d3.select('#infoSession').remove()
    d3.select('#headInfoSession').remove()
    // Infos sessions
    const titleInfoSessions = d3.select('body').append('div')
      // .attr('style', `width:${timeTableWidth}px; height:${timeTableHeight}px`)
      .attr('id', 'headInfoSession')

    const sessionTable = d3.select('body').append('div')
      .attr('style', `width:${timeTableWidth}px; height:${timeTableHeight}px`)
      .attr('id', 'infoSession')

    gridSession.render(document.getElementById('infoSession'))
  } // fin function createInfoSession

  // __________________________________________________________________________________________________________________________//

  function updateSession (args) {
    const titleInfoSessions = d3.select('#titleInfoSession')
    const sessionTable = d3.select('#sessionTable')
    sessionString = selectedPlace + ' | ' + args[1]._cells[0].data + ' | ' + args[1]._cells[1].data + ' | ' + args[1]._cells[2].data
    titleInfoSessions.html('Session : ' + sessionString)
    dataSession = args[1]._cells[3].data.content
    // .epreuve, args[1]._cells[4].data.content.genre, args[1]._cells[4].data.content.etape]
    // console.log(dataSession)// [dataSession.epreuve, dataSession.genre, dataSession.etape])
    gridSession.updateConfig({
      data: dataSession // [dataSession.epreuve, dataSession.genre, dataSession.etape]
    }).forceRender()
    sessionTable.style('z-index', 9000)
    titleInfoSessions.style('z-index', 9000)
  } // Fin fonction updateSession

  function HideSession () {
    // d3.select('#timeTable').remove()
    d3.select('#infoSession').remove()
    sessionTable.style('z-index', 0)
    titleInfoSessions.style('z-index', 0)
  }
  // __________________________________________________________________________________________________________________________//

  function updateTimeTable () {
    // titlePlanning = d3.select('#titlePlanning')
    // document.getElementById('timeTable').innerHTML = ''
    titlePlanning.html(selectedPlace)
    selectedSessions = d3.filter(planningfiltered, d => d.lieu_epreuve === selectedPlace)

    dataSelectedSessions = selectedSessions.map(d => [d.discipline, d.jour, d.plage, customJSONParsing(d.parsing_epreuve)])

    gridTimeTable.updateConfig({
      data: dataSelectedSessions
    }).forceRender()
    // document.getElementById("timeTable").style('opacity', 0.9)
  } // Fin fonction updateTimeTable

  function resetView () {
    d3.select('#timeTable').remove()
    d3.select('#infoSession').remove()
    // HideTimeTable()
    // HideSession()
    // bigg.selectAll('circle').filter(f => f.__selected) //déselectionne et réinit. les cercles sélectionnés.
    //   .style('opacity', .5)
    //   .attr('selected')

    // bigg.selectAll('circle').filter(f => !f.__selected) //éinit. les cercles non-sélectionnés.
    //   .style('opacity', .5)
  }

  function displayTimeTable () {
    // const titlePlanning = d3.select('#titlePlanning')
    // const planningInfras = d3.select('#timeTable')
    titlePlanning.style('z-index', 10000)
    planningInfras.style('z-index', 9000)
    HideSession()
  }

  function HideTimeTable () {
    // const titlePlanning = d3.select('#titlePlanning')
    // const planningInfras = d3.select('#timeTable')
    titlePlanning.style('z-index', 0)
    planningInfras.style('z-index', 0)
  }
  // __________________________________________________________________________________________________________________________//

  function customJSONParsing (x) {
    try {
      return JSON.parse(x)
    } catch (e) {
      return { content: [] }
    }
  } // Fin fonction customJSONParsing

  // __________________________________________________________________________________________________________________________//

  // Fonctions de chargement et parsing des données
  async function loadArr () {
    const idfArr = (await fetch('https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/regions/ile-de-france/arrondissements-ile-de-france.geojson')).json()
    return idfArr
  }

  async function loadJOData () {
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

    const planningParsed = await (d3.csv('../session_planning_v15.csv')
      .then(data => {
        return data.map((d, i) => {
          const r = d
          r.jour = d.date
          r.lieu_epreuve = d.NOM
          r.NOM = d.lieu_epreuve
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
  async function createCloud () {
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
    updateCloud()
  }

  async function updateCloud () {
    // set the dimensions for wordcloud
    const width = timeTableWidth
    const height = timeTableHeight
    const svg = d3.select('.wordcloudContainer')
    svg.selectAll('*')
      .transition()
      .duration(500)
      .style('opacity', 0)
      .remove()
    const dataClean = datacloud.map(e => {
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
    // Constructs a new cloud layout instance. It runs an algorithm to find the position of words that suits your requirements
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
        return d.size
      })
      .on('end', draw)
    layout.start()

    // This function takes the output of 'layout' above and draw the words
    // Better not to touch it. To change parameters, play with the 'layout' variable above
    function draw (words) {
      Tooltip_cloud
        .style('z-index', 0)
      const textGroup = svg
        .append('g')
        .attr('class', 'groupclass')
        .attr('transform', 'translate(' + layout.size()[0] / 2 + ',' + layout.size()[1] / 2 + ')')

      const words_map = textGroup.selectAll('text')
        .data(words)
        .enter().append('text')
        .style('font-size', function (d) { return d.size + 'px' })
        // .style('font-family', 'Roboto')
        .attr('text-anchor', 'middle')
        .attr('transform', function (d) {
          return 'translate(' + [d.x, d.y] + ')rotate(' + d.rotate + ')'
        })
        .text(function (d) { return d.text })
        .style('fill', 'midnightblue')

        .on('mouseenter', function (e, d) {
          nb_clicked = textGroup.selectAll('text').filter(f => f.__clicked)._groups[0].length // Nb de textes cliqués(sélectionnés)

          if (nb_clicked == 0) {
            textGroup.selectAll('text')
              .style('opacity', 0.2)
            d3.select(this)
              .style('opacity', 1)
              .style('cursor', 'pointer')
          } else {

          }
        })

        .on('click', function (e, d) {
          selection = d3.select(this)
          isclicked = d.__clicked
          nb_clicked = textGroup.selectAll('text').filter(f => f.__clicked)._groups[0].length // Nb de textes cliqués(sélectionnés)
          if (!isclicked) {
            if (nb_clicked == 0) { // Si encore aucun texte n'est cliqué, alors autoriser la sélection
              d.__clicked = true
              selection.style('opacity', 1)

              textGroup.selectAll('text').filter(f => !f.__clicked)
                .style('opacity', 0.2)
                .style('fill', 'grey')

              sport = selection._groups[0][0].__data__.text // Accéder au texte cliqué
              regex = new RegExp(sport)
              newtab = d3.filter(newtab, f => regex.test(f[1].ConcatenatedDiscipline))// Nouveau tableau filtré par la sélection
              updateMap()

              sport = sport.replace(/ /g, '-') // Remplace les espaces par des tirets (sinon lien invalide)

              url = new URL(sport, url_root)
              Tooltip_cloud
                .style('z-index', 10000)
                .style('opacity', 0.9)
                .style('top', (e.pageY - 40) + 'px')
                .style('left', (e.pageX + 15) + 'px')
                .html(`<a href=${url} target="_blank">Page JO dédiée <a>`)
            } else { // Si nb_clicked>0, un texte est déjà sélectionné donc on empêche une sélection supplémentaire
            }
          } else {
            d.__clicked = false
            textGroup.selectAll('text').filter(f => !f.__clicked)
              .style('fill', 'midnightblue')

            newtab = [...d3.rollup(planningfiltered, group => ({
              ConcatenatedDiscipline: [...new Set(group.map(d => d.discipline))].join(', '),
              ...group[0]
            }),
            d => d.lieu_epreuve)]
            updateMap()

            Tooltip_cloud
              .style('z-index', 0)
          }
        })

      // .on('dblclick', function (e, d) {
      //   selection = d3.select(this)
      //   sport = selection._groups[0][0].__data__.text //récupération du texte double-cliqué
      //   sport = sport.replace(/ /g, "-") //Remplace les espaces par des tirets (sinon lien invalide)
      //   url_root = "https://www.paris2024.org/fr/sport/"
      //   url = new URL(sport, url_root)
      //   console.log(url)
      //   window.open(url.href, '_blank')
      // })

        .on('mouseleave', function (e, d) {
          isclicked = d.__clicked
          nb_clicked = textGroup.selectAll('text').filter(f => f.__clicked)._groups[0].length // Nb de textes cliqués(sélectionnés)
          if (nb_clicked == 0) {
            textGroup.selectAll('text')
              .style('opacity', 1)
          } else { // Si mot cliqué, alors le mouseleave ne doit rien faire
          }
        })
        .transition()
        .duration(500)
        .style('opacity', 1)
      // .on('mousemove', function (d) {
      //   d3.select(this).transition()
      //     .duration('0')
      //     .style('opacity', 0)
      // })
    }

    // add tooltip on wordcloud
  }

  // functions to maje the application responsive
  window.addEventListener('resize', updateWindowSize)
  function updateWindowSize () {
    windowHeight = window.innerHeight
    windowWidth = window.innerWidth
    window_width = windowWidth - margin.left - margin.right
    window_height = windowHeight - margin.top - margin.bottom
    // dimensions time tables
    timeTableHeight = window_height / 2.2 // - margin.top - margin.bottom
    timeTableWidth = window_width / 3

    // update slider height and width
    d3.select('svg.slider').remove()
    slider()

    // update wordcloud
    d3.select('.wordcloudContainer').remove()
    createCloud()

    // update tables?
    gridSession = creategridSession()
    gridTimeTable = creategridTimeTable()
    d3.select('#timeTable').remove()
    d3.select('#infoSession').remove()
  }
}
