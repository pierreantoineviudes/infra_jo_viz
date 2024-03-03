d3.select('.page')
.on('click', function () {
    d3.select('.selectedPage')
    .attr('class', 'page')
    d3.select(this)
    .attr('class', 'selectedPage')
})