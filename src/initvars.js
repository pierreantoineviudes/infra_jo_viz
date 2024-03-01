var margin = { top: 10, right: 10, bottom: 45, left: 10 };
var window_width = window.innerWidth - margin.left - margin.right;
var window_height = window.innerHeight - margin.top - margin.bottom;

// Data variables

const planningParsed = async () => {
    const planningParsed = await loadJOData();
    console.log(planningParsed);
};

test = loadJOData()
console.log(test)


var dates_str = [...new Set(planningParsed.map(d => d3.utcFormat('%A %e %B %Y')(d.date)))];// Impossible d'avoir les dates uniques sans formatter en str bizarre !
var dates = d3.sort(d3.map(dates_str, d => d3.utcParse('%A %e %B %Y')(d)));
var SelectedDates = [dates[0], dates[dates.length - 1]];

// var idfArr = loadArr();

