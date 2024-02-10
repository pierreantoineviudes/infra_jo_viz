/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
async function main () {
  const france = await getFrance()
  const covidData = await loadCovidData()
  const departements = [...new Set(covidData.map(d => d.dep))]

  const width = 1600
  const height = 900
  const margin = ({ top: 20, bottom: 20, left: 20, right: 20 })

  const svg = d3.select('body').append('svg')
    .attr('width', width)
    .attr('height', height)
  const g = svg.append('g')

  const projection = d3
    .geoConicConformal()
    .center([2.454071, 46.279229])
    .scale(2800)

  const path = d3.geoPath().projection(projection)

  g.selectAll('path')
    .data(france.features)
    .join('path')
    .attr('d', path)
    .attr('fill', 'none')
    .attr('stroke', 'black')
}

const parseDate = d3.timeParse('%Y-%m-%d')

async function loadCovidData () {
  const covidData = await (d3.csv('data/covid-06-11-2021.csv').then(function (data) {
    // console.log('data : ', data)
    data.forEach(d => {
      d.hosp = +d.hosp
      d.time = parseDate(d.jour)
    })
    return data.filter(d => d.sexe === '0')
  }))
  return covidData
}

async function getFrance () {
  const france = (await fetch('https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements-version-simplifiee.geojson')).json()
  return france
}
