var parseDate = d3.timeParse("%m/%d/%Y");

var originalData;
var filteredData;

function ksTest(data1, data2) {
  // Sort the data arrays
  data1 = data1.slice().sort((a, b) => a - b);
  data2 = data2.slice().sort((a, b) => a - b);

  // Combine the datasets
  const combinedData = data1.concat(data2);

  // Calculate the cumulative distribution functions (CDF) for both datasets
  const cdf1 = calculateCDF(data1, combinedData);
  const cdf2 = calculateCDF(data2, combinedData);

  // Calculate the KS statistic
  const ksStat = calculateKSStatistic(cdf1, cdf2);

  // Calculate the p-value
  const n1 = data1.length;
  const n2 = data2.length;
  const lambda = Math.sqrt((n1 * n2) / (n1 + n2));

  const pValue = 2 * (1 - cumulativeDistribution(ksStat * lambda));

  return { ksStat, pValue };
}

function calculateCDF(data, combinedData) {
  const cdf = [];
  let count = 0;

  for (const value of combinedData) {
    while (data[count] <= value) {
      count++;
    }
    cdf.push(count / data.length);
  }

  return cdf;
}

function calculateKSStatistic(cdf1, cdf2) {
  let ksStat = 0;

  for (let i = 0; i < cdf1.length; i++) {
    const diff = Math.abs(cdf1[i] - cdf2[i]);
    if (diff > ksStat) {
      ksStat = diff;
    }
  }

  return ksStat;
}

function cumulativeDistribution(x) {
  // In this example, we use the standard normal cumulative distribution function (CDF)
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

function erf(x) {
  // Error function approximation for the standard normal distribution
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  const sign = (x < 0) ? -1 : 1;
  x = Math.abs(x);

  const t = 1.0 / (1.0 + p * x);
  const y = ((((a5 * t + a4) * t) + a3) * t + a2) * t + a1;

  return sign * (1.0 - y * Math.exp(-x * x));
}

///////////////////////////////////////////////////////////////////////////
d3.csv("SPY ETF Stock Price History.csv").then(function (data){
      originalData = data.map(function(d){
            
            var returns = ((parseFloat(d.Open) - parseFloat(d.Price)) / parseFloat(d.Open)) * 100;
            
            var parsedDate = parseDate(d.Date);

            return{
                  Date: parsedDate,
                  Day: parsedDate.toLocaleDateString('en-US', {weekday: 'long' }),
                  FY: parsedDate.getFullYear(),
                  Open: parseFloat(d.Open),
                  Close: parseFloat(d.Price),
                  Returns: returns

            };
      });
      console.log("Original Clean Data:", originalData);
});

function filterByConditions(data, conditions){
      return data.filter(function(d) {
            return conditions.every(function (condition) {
                  if (condition.property === "FY") {
                        if (condition.range) {
                              return d[condition.property] >= condition.range[0] && d[condition.property] <= condition.range[1];
                        } else {
                              return condition.values.includes(d[condition.property]);

                        }
                  } else if (condition.property === "Day"){
                        return condition.values.includes(d[condition.property]);
                  }
                  return true;
            });

      });
}


function parseYearInput(yearInput){
      return yearInput.split(",").map(yearCondition => {
            var range = yearCondition.split("-")
            if (range.length === 2) {
                  return {
                        property: "Year",
                        range: [parseInt(range[0].trim(), 10), parseInt(range[1].trim(), 10)]
                  };
            } else {
                  return {
                        property: "Year",
                        values: [parseInt(yearCondition.trim(), 10)]
                  };
            }
      });
}


function createHistogram(originalData, filteredData, containerID, title) {
      var margin = { top: 50, right: 30, bottom: 70, left: 70 },
        width = 600 - margin.left - margin.right,
        height = 300 - margin.top - margin.bottom;
    
      var svg = d3
        .select("#" + containerID)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
      // Define x and y scales
      var x = d3.scaleLinear().range([0, width]);
      var y = d3.scaleLinear().range([height, 0]);
    
      // Create histogram for originalData
      var histogramOriginal = d3
        .histogram()
        .value(function (d) {
          return d.Returns;
        })
        .domain(d3.extent(originalData, function (d) {
          return d.Returns;
        }))
        .thresholds(d3.range(-10, 11, 1));
    
      var binsOriginal = histogramOriginal(originalData);
    
      // Update x and y scales with the domain of the original data
      x.domain([d3.min(originalData, function (d) { return d.Returns; }), d3.max(originalData, function (d) { return d.Returns; })]);
      y.domain([0, d3.max(binsOriginal, function (d) { return d.length; })]);
      
      svg.append("g")
        .attr("class", "grid")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x).ticks(10).tickSize(-height).tickFormat(""));

      // Draw y grid lines
      svg.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(""));

      // Draw x-axis
      svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x))
        .append("text")
        .attr("x", width / 2)
        .attr("y", margin.bottom-5)
        .attr("dy", "2.5em")
        .style("text-anchor", "middle")
        .text("Returns");

    // Draw y-axis
      svg.append("g")
        .call(d3.axisLeft(y))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - height / 2)
        .attr("dy", "-4em")
        .style("text-anchor", "middle")
        .text("Frequency");
      

      // Draw bars for originalData
      svg
        .selectAll(".barOriginal")
        .data(binsOriginal)
        .enter()
        .append("rect")
        .attr("class", "barOriginal")
        .attr("x", function (d) {
          return x(d.x0);
        })
        .attr("y", function (d) {
          return y(d.length);
        })
        .attr("width", function (d) {
          return x(d.x1) - x(d.x0) - 1;
        })
        .attr("height", function (d) {
          return height - y(d.length);
        })
        .attr("fill", "orange");
    
      // Create histogram for filteredData
      var histogramFiltered = d3
        .histogram()
        .value(function (d) {
          return d.Returns;
        })
        .domain(d3.extent(filteredData, function (d) {
          return d.Returns;
        }))
        .thresholds(d3.range(-10, 11, 1));
    
      var binsFiltered = histogramFiltered(filteredData);
    
      // Update x and y scales with the domain of the filtered data
      x.domain([d3.min(filteredData, function (d) { return d.Returns; }), d3.max(filteredData, function (d) { return d.Returns; })]);
      y.domain([0, d3.max(binsFiltered, function (d) { return d.length; })]);
    
      // Draw bars for filteredData
      svg
        .selectAll(".barFiltered")
        .data(binsFiltered)
        .enter()
        .append("rect")
        .attr("class", "barFiltered")
        .attr("x", function (d) {
          return x(d.x0);
        })
        .attr("y", function (d) {
          return y(d.length);
        })
        .attr("width", function (d) {
          return x(d.x1) - x(d.x0) - 1;
        })
        .attr("height", function (d) {
          return height - y(d.length);
        })
        .attr("fill", "steelblue");
    
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", 0 - margin.top / 2)
        .attr("text-anchor", "middle")
        .style("text-decoration", "underline")
        .text(title);
    }
    
  function addBooleanColumnBySelectedDays(data, selectedDays) {
    // Add a new boolean column for the selected days
    var newColumnName = 'is' + selectedDays.join('Is').replace(/-/g, ''); // Format: isMondayIsTuesday
  
    // Update each data point with a true/false value for the new column
    data.forEach(function (d) {
      d[newColumnName] = selectedDays.some(function (day) {
        return d.Day.toLowerCase() === day.toLowerCase();
          });
    });
  
      return data;
  }

///////////////////////////////////////////////////////////////////////////////////////////////////////////

// Function to get the last column name of the data
function getLastColumnName(data) {
  // Assuming 'data' is an array of objects
  if (data.length > 0) {
      return Object.keys(data[0]).pop();
  }
  return null;
}

// Function to generate equity curve
function generateEquityCurve(data) {
  // Assuming the dataset has a "Returns" column representing returns per trade
  // and the last column is the signal column that indicates when to enter or exit a trade

  // Determine the last column name
  var signalColumn = getLastColumnName(data);

  if (!signalColumn) {
      console.error("Unable to determine the signal column.");
      return [];
  }

  // Initialize variables
  var equityCurve = [];
  var currentEquity = 0;
  var isInTrade = false;

  // Iterate through the dataset
  data.forEach(function (d) {
      // Check if the signal is true (enter trade)
      if (d[signalColumn] && !isInTrade) {
          isInTrade = true;
          currentEquity += d.Returns || 0; // Assuming "Returns" column is present
      }

      // Check if the signal is false (exit trade)
      if (!d[signalColumn] && isInTrade) {
          isInTrade = false;
          currentEquity += d.Returns || 0; // Assuming "Returns" column is present
      }

      // Save the equity value for each data point
      equityCurve.push({ Date: d.Date, Equity: currentEquity });
  });

  return equityCurve;
}

function generateChart(data) {
  // Assuming 'originalData' is available
  var equityCurveData = generateEquityCurve(data);

  // Get the canvas element
  var ctx = document.getElementById('combined-chart-container').getContext('2d');

  // Create the chart
  var myChart = new Chart(ctx, {
      type: 'line',
      data: {
          labels: equityCurveData.map(dataPoint => dataPoint.Date),
          datasets: [{
              label: 'Equity Curve',
              data: equityCurveData.map(dataPoint => dataPoint.Equity),
              borderColor: 'blue',
              borderWidth: 2,
              fill: false
          }]
      },
      options: {
          scales: {
              x: [{
                  type: 'linear',
                  position: 'bottom'
              }]
          }
      }
  });
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////
function filterAndCalculate(event){
      
      var startingFY = document.getElementById("starting-fy-label").value;
      var endingFY = document.getElementById("ending-fy-label").value;
      var selectedDays = Array.from(document.getElementById("day").selectedOptions).map(option => option.value);

      var yearConditions = parseYearInput(startingFY + "," + endingFY);

      var conditions = [
            yearConditions, 
            {property: "Day", values: selectedDays}
      ];

      var filteredData = filterByConditions(originalData, conditions);
      
      var first50Original = originalData.slice(50);
      var first50Filtered = filteredData.slice(50);

      console.log("Filtered Data:", filteredData);

      const data1 = originalData.map(entry => entry.Returns);
      const data2 = filteredData.map(entry => entry.Returns);

      console.log("Returns from data1:", data1);
      console.log("Returns from data2:", data2);

      const {ksStat, pValue} = ksTest(data1, data2);
      
      console.log("KS Statistic:", ksStat);
      console.log("P-Value", pValue);

      var dataWithBooleanColumn = addBooleanColumnBySelectedDays(originalData, selectedDays);
      console.log("Data with Boolean Column:", dataWithBooleanColumn);

      createHistogram(first50Original, first50Filtered,"combined-chart-container", "Combined Data");

      console.log("selected days", selectedDays)
      var dataWithBooleanColumn = addBooleanColumnBySelectedDays(originalData, selectedDays);
      console.log("Data with Boolean Column:", dataWithBooleanColumn);

      
      var equityCurveData = dataWithBooleanColumn.filter(function (d) {
        var fy = d.FY;
        var day = d.Day;
        return fy >= startingFY && fy <= endingFY && selectedDays.includes(day);
    });
      
      generateChart(equityCurveData);
}


