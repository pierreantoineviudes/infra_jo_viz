// Couleurs et dimensions
var colours = {
    top: '#37474f',
    bottom: '#546e7a',
    accent: '#263238'
}

var sliderWidth = 400
var sliderHeight = 50

// Echelles dediees
var scaleBand = d3.scaleBand()
    .domain(dates)
    .range([0, sliderWidth])
    .paddingInner(0.17)
    .paddingOuter(1)

var scaleBalls = d3.scaleQuantize()
    .domain([0 + scaleBand.bandwidth(), sliderWidth - scaleBand.bandwidth()])
    .range(dates)

// Creation du slider
var dateBalls = // Elements date
    d3.extent(dates, d => d)
        .map((d) => ({ x: scaleBand(d), y: sliderHeight - 30 }))

var g = d3.select('body').append('svg')
    .attr('width', sliderWidth)
    .attr('height', sliderHeight)
    .attr('class', 'slider')

var grayLine = g
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

var darkLine = g
    .append('path')
    .attr('class', 'darkline')
    .attr('d', d3.line()(dateBalls.map((d) => [d.x, d.y])))
    .attr('stroke-width', 2)
    .attr('stroke', colours.accent)

var datePicker = g.selectAll('g').data(dateBalls).join('g')

datePicker.call(
    d3.drag()
        .on('drag', function dragged(event, d) {
            var date = scaleBalls(event.x)

            var xAxisValue = scaleBand(date)
            // move the circle
            d3.select(this)
                .select('circle')
                .attr('cx', (d.x = xAxisValue))
            // move the blue line
            g.select('.darkline')
                .attr('d', d3.line()(dateBalls.map((d) => [d.x, d.y])))
            // change the text
            d3.select(this)
                .select('text')
                .attr('x', (d) => xAxisValue)
                .text((d) => d3.utcFormat('%a %e %b')(date))
        })

        .on('end', () => {
            var SelectedDates = d3.sort(dateBalls.map((d) => scaleBalls(d.x)))
            console.log(SelectedDates)
            // Filter data based in slider value
            var planningfiltered = d3.filter(planningParsed, d => d.date <= SelectedDates[1] && d.date >= SelectedDates[0])
            console.log(planningfiltered);
            // Update the map with the new domain
            // interactive_map()
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
    .attr('font-family', 'Roboto, Arial, sans-serif')
    .attr('font-size', '12px')
    .append('text')
    .attr('y', (d) => d.y + 20)
    .attr('x', (d) => d.x)
    .attr('fill', colours.accent)
    .text((d) => d3.utcFormat('%a %e %b')(scaleBalls(d.x)))
