/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

/**
 * Cartographie qui trace les POI sur un fond de carte Openstreetmap
 * @returns none
 */
async function main () {
  const width = 800
  const height = 300
  console.log('hello world')
  const idfArr = await loadArr()
  console.log(idfArr)
  const planningParsed = await loadJOData()
  console.log('planningParsed : ', planningParsed)
  
  // You'll often see Leaflet examples initializing a map like L.map('map'),
  // which tells the library to look for a div with the id 'map' on the page.
    n Observable, we instead create a div from scratch in this cell (called "map")
    //   const container = d3.select('body').element('div', { style: `width:${width}px;height:${width / 1.6}px` })
  
  // This component utilizes "yield" which pauses the execution of this code block
  // returns the value of container back to the notebook which allows the
    iv to be placed on the page. This is important, because Leaflet uses
    he div's .offsetWidth and .offsetHeight (used to get current size of the div)
  // to size the map. If I were to only return the container at the end of this method,
  // Leaflet might get the wrong idea about the map's size.
    ield container;
  d3.select('body').append('div')
      .attr('style', `width:${width}px;height:${width / 1.6}px`)
    .attr('id', 'map')
    t map = L.map('map')// Did not set view because we are using "fit bounds" to get the polygons to determine this
    t osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    tribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map)
    
  const idfLayer = L.geoJson(idfArr, { // instantiates a new geoJson layer using built in geoJson handling
      weight: 2, // Attributes of polygons including the weight of boundaries and colors of map.
    color: '#432',
      opacity: 0.2
  }).bindPopup(function (Layer) { // binds a popup when clicking on each polygon to access underlying data
    return Layer.feature.properties.NAME
  }).addTo(map) // Adds the layer to the map.
  
  map.fitBounds(idfLayer.getBounds()) // finds bounds of polygon and automatically gets map view to fit (useful for interaction and not having to 'cook' the map zoom and coordinates as in map instantiation
    
    g().addTo(map)
    t overlay = d3.select(map.getPanes().overlayPane)
    t svg = overlay.select('svg')
    
    t tooltip = d3.select('body').append('div')
    ttr('class', 'hidden tooltip')
  
  const Dots = svg.selectAll('points')
    .data(planningParsed)
    oin('circle')
    ttr('cx', d => map.latLngToLayerPoint([d.latitude, d.longitude]).x)
    ttr('cy', d => map.latLngToLayerPoint([d.latitude, d.longitude]).y)
    attr("cx", d=> projection([d.longitude, d.latitude])[0])
    attr("cy", d => projection([d.longitude, d.latitude])[1])
    ttr('r', 4)
    tyle('fill', 'steelblue')
    tyle('stroke', 'black')
    tyle('opacity', 0.2)
    
    // tentative de Tootltip non fructueuse
    n('mouseover', function () { // function to add mouseover event
    d3.select(this).transition() // D3 selects the object we have moused over in order to perform operations on it
      uration('150') // how long we are transitioning between the two states (works like keyframes)
        'fill', 'red') // change the fill
        'r', 10) // change radius
        
        
        out', d => { return tooltip.classed('hidden', true) })
        
    const update = () => Dots
      'cx', d => map.latLngToLayerPoint([d.latitude, d.longitude]).x)
        , d => map.latLngToLayerPoint([d.latitude, d.longitude]).y)
        
        end', update)
        
        
  async function loadArr () {
    t idfArr = (await fetch('https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/regions/ile-de-france/arrondissements-ile-de-france.geojson')).json()
    return idfArr
  }
    
      tion loadJOData () {
        ngParsed = await (d3.csv('session_planning_with_loc_v2.csv')
      .then(data => {
      rn data.map((d, i) => {
        r = d
         = parseDateHour(d.date + ' ' + '2024' + ' ' + d.debut_epreuve)
        jour = +r.num_jour
        tude = +r.latitude
        itude = +r.longitude
      turn r
    })
    }))
    rn planningParsed
    
  
  rseDateHour = d3.utcParse('%A %e %B %Y %H:%M') // https://d3js.org/d3-time-format
  