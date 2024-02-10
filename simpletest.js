/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
async function main () {
  const france = await getFrance()
  console.log('france : ', france)
  d3.selectAll('p')
    .style('color', 'firebrick')

  const svg = d3.select('body').append('svg')
    .attr('width', width)
    .attr('height', height)
}

const parseDate = d3.timeParse('%Y-%m-%d')

async function loadCovidData () {
  const covidData = await (d3.csv('covid-06-11-2021.csv').then(function (data) {
    console.log('data : ', data)
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
