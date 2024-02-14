/*
    D3.js Slider
    Inspired by jQuery UI Slider
    Copyright (c) 2013, Bjorn Sandvik - http://blog.thematicmapping.org
    BSD license: http://opensource.org/licenses/BSD-3-Clause
*/
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['d3'], factory)
  } else if (typeof exports === 'object') {
    if (process.browser) {
      // Browserify. Import css too using cssify.
      require('./d3.slider.css')
    }
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory(require('d3'))
  } else {
    // Browser globals (root is window)
    root.d3.slider = factory(root.d3)
  }
}(this, function (d3) {
  return function module () {
    'use strict'

    // Public variables width default settings
    let min = 0
    let max = 100
    let step = 0.01
    let animate = true
    let orientation = 'horizontal'
    let axis = false
    let margin = 50
    let value
    let active = 1
    let snap = false
    let scale

    // Private variables
    let axisScale
    const dispatch = d3.dispatch('slide', 'slideend')
    const formatPercent = d3.format('.2%')
    const tickFormat = d3.format('.0')
    let handle1
    let handle2 = null
    let divRange
    let sliderLength

    function slider (selection) {
      selection.each(function () {
        // Create scale if not defined by user
        if (!scale) {
          scale = d3.scaleLinear().domain([min, max])
        }

        // Start value
        value = value || scale.domain()[0]

        // DIV container
        const div = d3.select(this).classed('d3-slider d3-slider-' + orientation, true)

        const drag = d3.behavior.drag()
        drag.on('dragend', function () {
          dispatch.slideend(d3.event, value)
        })

        // Slider handle
        // if range slider, create two
        // var divRange;

        if (toType(value) == 'array' && value.length == 2) {
          handle1 = div.append('a')
            .classed('d3-slider-handle', true)
            .attr('xlink:href', '#')
            .attr('id', 'handle-one')
            .on('click', stopPropagation)
            .call(drag)
          handle2 = div.append('a')
            .classed('d3-slider-handle', true)
            .attr('id', 'handle-two')
            .attr('xlink:href', '#')
            .on('click', stopPropagation)
            .call(drag)
        } else {
          handle1 = div.append('a')
            .classed('d3-slider-handle', true)
            .attr('xlink:href', '#')
            .attr('id', 'handle-one')
            .on('click', stopPropagation)
            .call(drag)
        }

        // Horizontal slider
        if (orientation === 'horizontal') {
          div.on('click', onClickHorizontal)

          if (toType(value) == 'array' && value.length == 2) {
            divRange = d3.select(this).append('div').classed('d3-slider-range', true)

            handle1.style('left', formatPercent(scale(value[0])))
            divRange.style('left', formatPercent(scale(value[0])))
            drag.on('drag', onDragHorizontal)

            const width = 100 - parseFloat(formatPercent(scale(value[1])))
            handle2.style('left', formatPercent(scale(value[1])))
            divRange.style('right', width + '%')
            drag.on('drag', onDragHorizontal)
          } else {
            handle1.style('left', formatPercent(scale(value)))
            drag.on('drag', onDragHorizontal)
          }

          sliderLength = parseInt(div.style('width'), 10)
        } else { // Vertical
          div.on('click', onClickVertical)
          drag.on('drag', onDragVertical)
          if (toType(value) == 'array' && value.length == 2) {
            divRange = d3.select(this).append('div').classed('d3-slider-range-vertical', true)

            handle1.style('bottom', formatPercent(scale(value[0])))
            divRange.style('bottom', formatPercent(scale(value[0])))
            drag.on('drag', onDragVertical)

            const top = 100 - parseFloat(formatPercent(scale(value[1])))
            handle2.style('bottom', formatPercent(scale(value[1])))
            divRange.style('top', top + '%')
            drag.on('drag', onDragVertical)
          } else {
            handle1.style('bottom', formatPercent(scale(value)))
            drag.on('drag', onDragVertical)
          }

          sliderLength = parseInt(div.style('height'), 10)
        }

        if (axis) {
          createAxis(div)
        }

        function createAxis (dom) {
          // Create axis if not defined by user
          if (typeof axis === 'boolean') {
            axis = d3.svg.axis()
              .ticks(Math.round(sliderLength / 100))
              .tickFormat(tickFormat)
              .orient((orientation === 'horizontal') ? 'bottom' : 'right')
          }

          // Copy slider scale to move from percentages to pixels
          axisScale = scale.ticks ? scale.copy().range([0, sliderLength]) : scale.copy().rangePoints([0, sliderLength], 0.5)
          axis.scale(axisScale)

          // Create SVG axis container
          const svg = dom.append('svg')
            .classed('d3-slider-axis d3-slider-axis-' + axis.orient(), true)
            .on('click', stopPropagation)

          const g = svg.append('g')

          // Horizontal axis
          if (orientation === 'horizontal') {
            svg.style('margin-left', -margin + 'px')

            svg.attr({
              width: sliderLength + margin * 2,
              height: margin
            })

            if (axis.orient() === 'top') {
              svg.style('top', -margin + 'px')
              g.attr('transform', 'translate(' + margin + ',' + margin + ')')
            } else { // bottom
              g.attr('transform', 'translate(' + margin + ',0)')
            }
          } else { // Vertical
            svg.style('top', -margin + 'px')

            svg.attr({
              width: margin,
              height: sliderLength + margin * 2
            })

            if (axis.orient() === 'left') {
              svg.style('left', -margin + 'px')
              g.attr('transform', 'translate(' + margin + ',' + margin + ')')
            } else { // right
              g.attr('transform', 'translate(' + 0 + ',' + margin + ')')
            }
          }

          g.call(axis)
        }

        function onClickHorizontal () {
          if (toType(value) != 'array') {
            const pos = Math.max(0, Math.min(sliderLength, d3.event.offsetX || d3.event.layerX))
            moveHandle(scale.invert
              ? stepValue(scale.invert(pos / sliderLength))
              : nearestTick(pos / sliderLength))
          }
        }

        function onClickVertical () {
          if (toType(value) != 'array') {
            const pos = sliderLength - Math.max(0, Math.min(sliderLength, d3.event.offsetY || d3.event.layerY))
            moveHandle(scale.invert
              ? stepValue(scale.invert(pos / sliderLength))
              : nearestTick(pos / sliderLength))
          }
        }

        function onDragHorizontal () {
          if (d3.event.sourceEvent.target.id === 'handle-one') {
            active = 1
          } else if (d3.event.sourceEvent.target.id == 'handle-two') {
            active = 2
          }
          const pos = Math.max(0, Math.min(sliderLength, d3.event.x))
          moveHandle(scale.invert
            ? stepValue(scale.invert(pos / sliderLength))
            : nearestTick(pos / sliderLength))
        }

        function onDragVertical () {
          if (d3.event.sourceEvent.target.id === 'handle-one') {
            active = 1
          } else if (d3.event.sourceEvent.target.id == 'handle-two') {
            active = 2
          }
          const pos = sliderLength - Math.max(0, Math.min(sliderLength, d3.event.y))
          moveHandle(scale.invert
            ? stepValue(scale.invert(pos / sliderLength))
            : nearestTick(pos / sliderLength))
        }

        function stopPropagation () {
          d3.event.stopPropagation()
        }
      })
    }

    // Move slider handle on click/drag
    function moveHandle (newValue) {
      const currentValue = toType(value) == 'array' && value.length == 2 ? value[active - 1] : value
      const oldPos = formatPercent(scale(stepValue(currentValue)))
      const newPos = formatPercent(scale(stepValue(newValue)))
      const position = (orientation === 'horizontal') ? 'left' : 'bottom'
      if (oldPos !== newPos) {
        if (toType(value) == 'array' && value.length == 2) {
          value[active - 1] = newValue
          if (d3.event) {
            dispatch.slide(d3.event, value)
          };
        } else {
          if (d3.event) {
            dispatch.slide(d3.event.sourceEvent || d3.event, value = newValue)
          };
        }

        if (value[0] >= value[1]) return
        if (active === 1) {
          if (toType(value) == 'array' && value.length == 2) {
            (position === 'left') ? divRange.style('left', newPos) : divRange.style('bottom', newPos)
          }

          if (animate) {
            handle1.transition()
              .styleTween(position, function () { return d3.interpolate(oldPos, newPos) })
              .duration((typeof animate === 'number') ? animate : 250)
          } else {
            handle1.style(position, newPos)
          }
        } else {
          const width = 100 - parseFloat(newPos)
          const top = 100 - parseFloat(newPos);

          (position === 'left') ? divRange.style('right', width + '%') : divRange.style('top', top + '%')

          if (animate) {
            handle2.transition()
              .styleTween(position, function () { return d3.interpolate(oldPos, newPos) })
              .duration((typeof animate === 'number') ? animate : 250)
          } else {
            handle2.style(position, newPos)
          }
        }
      }
    }

    // Calculate nearest step value
    function stepValue (val) {
      if (val === scale.domain()[0] || val === scale.domain()[1]) {
        return val
      }

      let alignValue = val
      if (snap) {
        alignValue = nearestTick(scale(val))
      } else {
        const valModStep = (val - scale.domain()[0]) % step
        alignValue = val - valModStep

        if (Math.abs(valModStep) * 2 >= step) {
          alignValue += (valModStep > 0) ? step : -step
        }
      };

      return alignValue
    }

    // Find the nearest tick
    function nearestTick (pos) {
      const ticks = scale.ticks ? scale.ticks() : scale.domain()
      const dist = ticks.map(function (d) { return pos - scale(d) })
      let i = -1
      let index = 0
      let r = scale.ticks ? scale.range()[1] : scale.rangeExtent()[1]
      do {
        i++
        if (Math.abs(dist[i]) < r) {
          r = Math.abs(dist[i])
          index = i
        };
      } while (dist[i] > 0 && i < dist.length - 1)

      return ticks[index]
    };

    // Return the type of an object
    function toType (v) {
      return ({}).toString.call(v).match(/\s([a-zA-Z]+)/)[1].toLowerCase()
    };

    // Getter/setter functions
    slider.min = function (_) {
      if (!arguments.length) return min
      min = _
      return slider
    }

    slider.max = function (_) {
      if (!arguments.length) return max
      max = _
      return slider
    }

    slider.step = function (_) {
      if (!arguments.length) return step
      step = _
      return slider
    }

    slider.animate = function (_) {
      if (!arguments.length) return animate
      animate = _
      return slider
    }

    slider.orientation = function (_) {
      if (!arguments.length) return orientation
      orientation = _
      return slider
    }

    slider.axis = function (_) {
      if (!arguments.length) return axis
      axis = _
      return slider
    }

    slider.margin = function (_) {
      if (!arguments.length) return margin
      margin = _
      return slider
    }

    slider.value = function (_) {
      if (!arguments.length) return value
      if (value) {
        moveHandle(stepValue(_))
      };
      value = _
      return slider
    }

    slider.snap = function (_) {
      if (!arguments.length) return snap
      snap = _
      return slider
    }

    slider.scale = function (_) {
      if (!arguments.length) return scale
      scale = _
      return slider
    }

    d3.rebind(slider, dispatch, 'on')

    return slider
  }
}))

// Copies a variable number of methods from source to target.
d3.rebind = function (target, source) {
  let i = 1; const n = arguments.length; let method
  while (++i < n) target[method = arguments[i]] = d3_rebind(target, source, source[method])
  return target
}

// Method is assumed to be a standard D3 getter-setter:
// If passed with no arguments, gets the value.
// If passed with arguments, sets the value and returns the target.
function d3_rebind (target, source, method) {
  return function () {
    const value = method.apply(source, arguments)
    return value === source ? target : value
  }
}
