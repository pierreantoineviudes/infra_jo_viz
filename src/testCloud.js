/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
async function main () {
  // set the dimensions and margins of the graph
  const margin = { top: 10, right: 10, bottom: 10, left: 10 }
  const width = window.innerWidth - margin.left - margin.right
  const height = window.innerHeight - margin.top - margin.bottom

  // append the svg object to the body of the page
  const svg = d3.select('body').append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform',
      'translate(' + margin.left + ',' + margin.top + ')')

  const data = await loadData()
  // console.log('data : ', data.map(e => {
  //   const r = {
  //     sport: e.SPORTS,
  //     capacite: e.capacite
  //   }
  //   return r
  // }))
  const dataClean = data.map(e => {
    const r = {
      sport: e.SPORTS,
      capacite: e.capacite
    }
    return r
  })
  // console.log('data clean : ', dataClean)
  const rolledupdata = [...d3.rollup(dataClean, v => d3.sum(v, e => e.capacite), d => d.sport)]
  // console.log('rolledupdata : ', rolledupdata)
  // const words = data.map(d => { return (d.SPORTS, d.capacite) })
  // console.log('words : ', words)

  console.log('min : ', d3.min(rolledupdata, d => d[1]))
  console.log('max : ', d3.max(rolledupdata, d => d[1]))

  const wordCloudScale = d3.scaleLog()
    .domain([d3.min(rolledupdata, d => d[1]), d3.max(rolledupdata, d => d[1])])
    .range([0, 50])

  // Constructs a new cloud layout instance. It run an algorithm to find the position of words that suits your requirements
  const layout = d3.layout.cloud()
    .size([width, height])
    .words(rolledupdata.map(function (d) {
      // console.log('d : ', d)
      return {
        text: d[0],
        size: wordCloudScale(d[1])
      }
    }))
    .padding(10)
    .rotate(0)
    .fontSize(function (d) {
      console.log('d : fontsize', d)
      return d.size
    })
    .on('end', draw)
  layout.start()

  // This function takes the output of 'layout' above and draw the words
  // Better not to touch it. To change parameters, play with the 'layout' variable above
  function draw (words) {
    svg
      .append('g')
      .attr('transform', 'translate(' + layout.size()[0] / 2 + ',' + layout.size()[1] / 2 + ')')
      .selectAll('text')
      .data(words)
      .enter().append('text')
      .style('font-size', function (d) { return d.size + 'px' })
      .style('font-family', 'Roboto')
      .attr('text-anchor', 'middle')
      .attr('transform', function (d) {
        return 'translate(' + [d.x, d.y] + ')rotate(' + d.rotate + ')'
      })
      .text(function (d) { return d.text })
  }

  async function loadData () {
    const planningParsed = await (d3.csv('session_planning_with_loc_v13.csv')
      .then(data => {
        // console.log(data)
        return data.map((d, i) => {
          const r = d
          r.capacite = +r.capacite
          return r
        })
      }))
    return planningParsed
  }
}
