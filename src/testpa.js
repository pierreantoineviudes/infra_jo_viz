/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

/**
 * Cartographie qui trace les POI sur un fond de carte de l'Île de France
 * @returns none
 */
async function main () {
  console.log('hello world')
  const idfArr = await loadArr()
  console.log(idfArr)
  const planningParsed = await loadJOData()
  console.log('planningParsed : ', planningParsed)

  const height = 350
  const width = 900
  const marginTop = 30
  const marginRight = width / 6
  const marginBottom = 50
  const marginLeft = 50

  // choix de la projection
  const projection = d3.geoConicConformal().fitSize([width, height], idfArr)

  const svg = d3.select('body').append('svg')
    .attr('width', width)
    .attr('height', height)

  const path = d3.geoPath().projection(projection)
  // Carte de l'IdF
  svg.append('g')
    .selectAll('path')
    .data(idfArr.features)
    .join('path')
    .attr('d', path)
    .attr('stroke', 'black')
    .attr('fill', 'white')
    .attr('stroke-width', 0.5)

  const coo = [2.39007, 48.8257]

  svg.selectAll('points')
    .data(planningParsed)
    .join('circle')
    .attr('cx', d => projection([d.longitude, d.latitude])[0])
    .attr('cy', d => projection([d.longitude, d.latitude])[1])
    .attr('r', 4)
    .style('fill', 'red')
    .style('opacity', 0.1)
}

async function loadArr () {
  const idfArr = (await fetch('https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/regions/ile-de-france/arrondissements-ile-de-france.geojson')).json()
  return idfArr
}

async function loadJOData () {
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
