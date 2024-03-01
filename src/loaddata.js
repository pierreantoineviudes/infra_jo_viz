async function loadJOData() {
    var frFR = d3.timeFormatDefaultLocale({
        dateTime: '%A %e %B %Y à %X',
        date: '%d/%m/%Y',
        time: '%H:%M:%S',
        periods: ['AM', 'PM'],
        days: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
        shortDays: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'],
        months: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
        shortMonths: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
    })
    var parseDateHour = d3.timeParse('%A %e %B %Y %H:%M')// https://d3js.org/d3-time-format
    var parseDate = d3.utcParse('%A %e %B %Y')

    var planningParsed = await (d3.csv('../session_planning_with_loc_v3.csv')
        .then(data => {
            return data.map((d, i) => {
                var r = d
                r.time = parseDateHour(d.date + ' ' + '2024' + ' ' + d.debut_epreuve)
                r.date = parseDate(d.date + ' ' + '2024')
                r.num_jour = +r.num_jour
                r.latitude = +r.latitude
                r.longitude = +r.longitude
                r.index = i
                return r
            })
        }))
    return planningParsed
}

async function loadArr() {
    var idfArr = await (fetch('https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/regions/ile-de-france/arrondissements-ile-de-france.geojson')).json()
    return idfArr
}
