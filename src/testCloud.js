/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
async function main () {
  // set the dimensions and margins of the graph
  const width = window.innerWidth
  const height = window.innerHeight

  // append the svg object to the body of the page
  const svg = d3.select('body').append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')

  const data = await loadData()

  const dataClean = data.map(e => {
    const r = {
      sport: e.SPORTS,
      capacite: e.capacite
    }
    return r
  })
  const rolledupdata = [...d3.rollup(dataClean, v => d3.sum(v, e => e.capacite), d => d.sport)]

  console.log('min : ', d3.min(rolledupdata, d => d[1]))
  console.log('max : ', d3.max(rolledupdata, d => d[1]))

  const wordCloudScale = d3.scaleLog()
    .domain([d3.min(rolledupdata, d => d[1]), d3.max(rolledupdata, d => d[1])])
    .range([0, 50])

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
        return data.map((d, i) => {
          const r = d
          r.capacite = +r.capacite
          return r
        })
      }))
    return planningParsed
  }
}
