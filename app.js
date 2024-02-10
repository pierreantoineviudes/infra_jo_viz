import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm'

/* eslint-disable no-undef */
async function getFrance () {
  const france = (await fetch('https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements-version-simplifiee.geojson')).json()
  return france
}

// define date parser
const parseDate = d3.timeParse('%Y-%m-%d')
async function getCovidData () {
  // filter data
  console.log(await (d3.csv('covid-06-11-2021.csv'), function (data) {
    console.log(data)
  }))
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

// console.log('france : ', france)
// console.log('data', covidData)

async function main () {
  console.log('france : ', await getFrance())
  console.log('covidData : ', await getCovidData())

  const france = await getFrance()
  const covidData = await getCovidData()

  // mapping entre les données covid et les données geoJSON
  const franceEnriched = france.features.map(d => {
    d.properties.covidData = covidData.filter(e => e.dep === d.properties.code)
    return d
  })
  //   const margin = ({ top: 20, bottom: 20, right: 20, left: 20 })
  const height = 800
  const width = 800
  const svg = d3.select('my-dataviz')
    .attr('width', width)
    .attr('height', height)
  const selectedDate = new Date('2021-06-01')

  const g = svg.append('g')

  //   const title = svg.append('text')
  //     .attr('x', (width / 2))
  //     .attr('y', margin.top)
  //     .attr('text-anchor', 'middle')
  //     .style('font-size', '16px')
  //     .text(`Hospitalisations sous covid le : ${selectedDate.getDate()}/${selectedDate.getMonth() + 1}/${selectedDate.getFullYear()}`)

  const color = d3.scaleQuantize()
    .range(['#edf8e9', '#bae4b3', '#74c476', '#31a354', '#006d2c'])
    .domain([d3.min(franceEnriched.map(d => d.properties.covidData.filter(e => (e.time.getDate() === selectedDate.getDate() & e.time.getMonth() === selectedDate.getMonth() & e.time.getFullYear() === selectedDate.getFullYear()))[0].hosp)), d3.max(franceEnriched.map(d => d.properties.covidData.filter(e => (e.time.getDate() === selectedDate.getDate() & e.time.getMonth() === selectedDate.getMonth() & e.time.getFullYear() === selectedDate.getFullYear()))[0].hosp))])

  const projection = d3
    .geoConicConformal().center([2.454071, 46.279229]).scale(2800)

  const path = d3.geoPath().projection(projection)

  // il y a un probleme car il faut faire un groupe par département
  g.selectAll('path')
    .data(franceEnriched)
    .join('path')
    .attr('d', path)
    .attr('class', 'region-path')
    .style('stroke-width', 1.5)
    .style('stroke', 'black')
    .style('fill', function (d) {
    // onchoisit 0 mais il faut en fait choisir le jour selected
      const value = d.properties.covidData.filter(d => {
        return (d.time.getDate() === selectedDate.getDate() & d.time.getMonth() === selectedDate.getMonth() & d.time.getFullYear() === selectedDate.getFullYear())
      })[0].hosp
      // console.log('jourChoisi', selectedDate)
      // console.log(d.properties.covidData[0].time)
      // console.log('value : ', value)
      // console.log('color (value)', color(value))
      return color(value)
    })
  console.log('svg : ', svg)
  return svg.node()
}
const svg = main()
console.log('svg : ', svg)
