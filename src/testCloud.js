/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
async function main () {
// List of words
  const myWords = ['Hello', 'Everybody', 'How', 'Are', 'You']

  // set the dimensions and margins of the graph
  const margin = { top: 10, right: 10, bottom: 10, left: 10 }
  const width = 450 - margin.left - margin.right
  const height = 450 - margin.top - margin.bottom

  // append the svg object to the body of the page
  const svg = d3.select('body').append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform',
      'translate(' + margin.left + ',' + margin.top + ')')

  // Constructs a new cloud layout instance. It run an algorithm to find the position of words that suits your requirements
  const layout = d3.layout.cloud()
    .size([width, height])
    .words(myWords.map(function (d) { return { text: d, size: Math.random() * 100 } }))
    .padding(10)
    .fontSize(function (d) { return d.size })
    .on('end', draw)
  layout.start()

  const data = await loadData()

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
      .attr('text-anchor', 'middle')
      .attr('transform', function (d) {
        return 'translate(' + [d.x, d.y] + ')rotate(' + d.rotate + ')'
      })
      .text(function (d) { return d.text })
  }

  async function loadData () {
    const planningParsed = await (d3.csv('session_planning_with_loc_v3.csv')
      .then(data => {
        console.log(data)
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
}
