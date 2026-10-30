var iBox = document.querySelector("#input-box");
var weatherBox = document.querySelector("#weather-section");
var historyBox = document.querySelector("#search-history");
var currentTime = moment();
var searchHistory = [];

$("#search-box").submit(function (event) {
  // Fires when we click on the search button or press enter
  event.preventDefault();
  var city = iBox.value.trim(); // Gets the value of the input box
  if (!city) {
    return;
  }
  var apiUrl =
    "https://api.openweathermap.org/data/2.5/weather?q=" + // First fetch to get lat and lon + weather info
    city +
    "&appid=ffa748d3a02711314373a2d30887317c" +
    "&units=imperial"; // returns the temp in f not kelvin
  getFetch(apiUrl);
});

var getFetch = function (apiUrl) {
  // fetchs data and sends data to the creation functions
  fetch(apiUrl).then(function (response) {
    if (response.ok) {
      response.json().then(function (data) {
        var lon = parseFloat(data.coord.lon);
        var lat = parseFloat(data.coord.lat);
        var apiUrl2 =
          "https://api.openweathermap.org/data/2.5/forecast?lat=" + // Second fetch url to get the 5 day forecast
          lat +
          "&lon=" +
          lon +
          "&appid=ffa748d3a02711314373a2d30887317c" +
          "&units=imperial"; // returns the temp in f not kelvin
        var uvUrl =
          "https://api.open-meteo.com/v1/forecast?latitude=" + // Third fetch url to get the uv index
          lat +
          "&longitude=" +
          lon +
          "&current=uv_index";
        Promise.all([fetch(apiUrl2), fetch(uvUrl)])
          .then(function (responses) {
            if (!responses[0].ok) {
              throw new Error("Forecast not found");
            }
            return Promise.all([
              responses[0].json(),
              responses[1].ok ? responses[1].json() : null, // the uv index is optional
            ]);
          })
          .then(function (results) {
            var uv = results[1] ? results[1].current.uv_index : null;
            makeCityBox(data, uv);
            makeForecast(data, results[0]);
            addHistory(data.name);
            saveHistory();
            setActiveHistory(data.name);
            iBox.value = "";
          })
          .catch(function (error) {
            console.log("Error: " + error.message);
            alert("Error: Could not load the forecast");
          });
      });
    } else {
      alert("Error: City not found");
    }
  });
};

$("#search-history").on("click", ".sh-button", function () {
  // fires when we click on a search history item
  var x = parseInt($(this).attr("index")); // getting our custom index attribute
  var city = searchHistory[x];
  var apiUrl =
    "https://api.openweathermap.org/data/2.5/weather?q=" + // First fetch to get lat and lon + weather info
    city +
    "&appid=ffa748d3a02711314373a2d30887317c" +
    "&units=imperial"; // returns the temp in f not kelvin
  getFetch(apiUrl);
  currentTime = moment(); // reset the date, otherwise it will constantly increment
});

var addHistory = function (cityName) {
  // adds the latest searched item to the history list
  var dataItem = cityName;
  var unique = true;
  for (x = 0; x < searchHistory.length; x++) {
    if (searchHistory[x] === dataItem) {
      unique = false;
    }
  }
  if (unique != false) {
    createHistoryButton(dataItem, searchHistory.length);
    searchHistory.push(dataItem);
    unique = true;
  }
};

var createHistoryButton = function (cityName, index) {
  // creates the searched items buttons
  var tempButton = $(document.createElement("button"))
    .addClass("sh-button")
    .attr("index", index); // adds a custom attribute to help us keep track of its position in our sh array

  tempButton.text(cityName);
  historyBox.appendChild(tempButton[0]);
};

var setActiveHistory = function (cityName) {
  // highlights the search history button for the city on screen
  $(".sh-button").each(function () {
    $(this).toggleClass("active", $(this).text() === cityName);
  });
};

var saveHistory = function () {
  // saves the search history to local storage
  localStorage.setItem("search-history", JSON.stringify(searchHistory));
};

var loadHistory = function () {
  // loads the search history
  if (!localStorage.getItem("search-history")) {
    // if search history is empty do the following
    searchHistory = [];
  } else {
    searchHistory = JSON.parse(localStorage.getItem("search-history")); // retrive data
    for (x = 0; x < searchHistory.length; x++) {
      createHistoryButton(searchHistory[x], x); // create search history buttons again
    }
  }
};

var getLocalTime = function (seconds, offset) {
  // returns a moment in the city's timezone, offset is in seconds from utc
  return moment.unix(seconds).utcOffset(offset / 60);
};

var makeCityBox = function (data, uv) {
  // Creates the city weather box and adds it to the page
  var favorable = 2;
  var moderate = 5;
  // severe I didnt need to add as I just test for over 5

  var tempDiv = $(document.createElement("section")).addClass("weather-info");
  var summary = $(document.createElement("div")).addClass("current-summary");
  var stats = $(document.createElement("div")).addClass("info-text");

  weatherBox.innerHTML = ""; // Clears the current weather data/content on screen
  summary.append($("<h2 class='city-name'>").text(data.name + ", " + data.sys.country));
  summary.append(
    $("<p class='city-date'>").text(
      getLocalTime(data.dt, data.timezone).format("dddd, MMMM D · h:mm A") // Gets the date in the locations timezone
    )
  );
  summary.append(
    "<div class='current-main'>" +
      "<span class='current-temp'>" +
      Math.round(data.main.temp) +
      "<sup>°F</sup></span>" +
      getIcon(data.weather[0].icon) +
      "</div>"
  );
  summary.append($("<p class='current-desc'>").text(data.weather[0].description));

  stats.append(makeStat("Feels like", Math.round(data.main.feels_like) + "°F"));
  stats.append(makeStat("Wind", Math.round(data.wind.speed) + " mph"));
  stats.append(makeStat("Humidity", data.main.humidity + "%"));

  if (uv !== null) {
    // only show the uv index if we were able to get it
    var uvClass;
    var uvLabel;
    uv = parseFloat(uv);
    if (uv <= favorable) {
      uvClass = "uv-favorable";
      uvLabel = "Low";
    } else if (uv <= moderate) {
      uvClass = "uv-moderate";
      uvLabel = "Moderate";
    } else {
      uvClass = "uv-severe";
      uvLabel = "High";
    }
    stats.append(
      makeStat("UV index", Math.round(uv) + "<span class='uv-box " + uvClass + "'>" + uvLabel + "</span>")
    );
  }
  tempDiv.append(summary);
  tempDiv.append(stats);
  weatherBox.appendChild(tempDiv[0]); // The [0] gets the dom element
};

var makeStat = function (label, value) {
  // creates one of the small stat tiles in the city box
  return (
    "<div class='stat'>" +
    "<p class='stat-label'>" +
    label +
    "</p>" +
    "<p class='stat-value'>" +
    value +
    "</p>" +
    "</div>"
  );
};

var getDailyForecast = function (forecast) {
  // the forecast comes in 3 hour steps, so pick the one closest to noon for each day after today
  var offset = forecast.city.timezone;
  var today = getLocalTime(moment().unix(), offset).format("YYYY-MM-DD");
  var days = {};
  for (x = 0; x < forecast.list.length; x++) {
    var item = forecast.list[x];
    var localTime = getLocalTime(item.dt, offset);
    var day = localTime.format("YYYY-MM-DD");
    var distance = Math.abs(localTime.hours() - 12);
    if (day === today) {
      continue;
    }
    if (!days[day]) {
      days[day] = { item: item, time: localTime, distance: distance, high: item.main.temp_max, low: item.main.temp_min };
    }
    days[day].high = Math.max(days[day].high, item.main.temp_max); // keep track of the high and low for the day
    days[day].low = Math.min(days[day].low, item.main.temp_min);
    if (distance < days[day].distance) {
      days[day].item = item;
      days[day].time = localTime;
      days[day].distance = distance;
    }
  }
  return Object.keys(days)
    .sort()
    .slice(0, 5)
    .map(function (day) {
      return days[day];
    });
};

var makeForecast = function (data, forecast) {
  // creates the forecast area and adds it to the page
  var tempDiv = $(document.createElement("div")).addClass("forecast-box");
  var tempDiv2 = $(document.createElement("div")).addClass("forecast-holder");
  var temph3 = $(document.createElement("h3"));
  temph3.text("5-day forecast");
  tempDiv.append(temph3);
  tempDiv.append(tempDiv2);
  var daily = getDailyForecast(forecast);
  for (x = 0; x < daily.length; x++) {
    var item = daily[x].item;
    var tempCard = $(document.createElement("div")).addClass("forecast-card");
    tempCard.html(
      "<div>" +
        "<p class='forecast-header'>" +
        daily[x].time.format("dddd") + // the day in the city we are looking at
        "</p>" +
        "<p class='forecast-date'>" +
        daily[x].time.format("MMM D") +
        "</p>" +
        "</div>" +
        getIcon(item.weather[0].icon) +
        "<p class='forecast-temps'>" +
        Math.round(daily[x].high) +
        "°" +
        "<span class='forecast-low'>" +
        Math.round(daily[x].low) +
        "°</span>" +
        "</p>" +
        "<p class='forecast-text'>" +
        "<span>💨 " +
        Math.round(item.wind.speed) +
        " mph</span>" +
        "<span>💧 " +
        item.main.humidity +
        "%</span>" +
        "</p>"
    );
    tempDiv2.append(tempCard);
  }
  weatherBox.appendChild(tempDiv[0]);
};

var getIcon = function (icon) {
  return "<img class='weather-img' alt='' src='https://openweathermap.org/img/wn/" + icon + "@2x.png'>";
};

loadHistory(); // load the history when the page loads
