/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/**
 * This file is to create all the components for a slider
 */
function main () {
  d3.select('body')
    .append('p')
    .attr('id', 'value')

  d3.select('body')
    .append('div')
    .attr('id', 'slider')

  const minDate = '2021-01-01'
  const maxDate = '2021-01-06'
  const timeParse = d3.timeParse('%Y-%M-%d')
  const minDateParsed = timeParse(minDate)
  const maxDateParsed = timeParse(maxDate)

  const slider = d3
    .sliderHorizontal()
    .min(minDateParsed)
    .max(maxDateParsed)
    .width(300)
    .displayValue(false)
    .on('onchange', (val) => {
      d3.select('#value').text(val)
    })

  d3.select('#slider')
    .append('svg')
    .attr('width', 500)
    .attr('height', 100)
    .append('g')
    .attr('transform', 'translate(30,30)')
    .call(slider)
}
