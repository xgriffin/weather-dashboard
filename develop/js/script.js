var iBox = document.querySelector("#input-box");
var weatherBox = document.querySelector("#weather-section");
var historyBox = document.querySelector("#search-history");
var currentTime = moment();
var searchHistory = [];
var suggestionBox = document.querySelector("#suggestions");
var suggestions = []; // the cities currently shown in the dropdown
var activeSuggestion = -1; // which dropdown item is highlighted, -1 means none
var suggestTimer;
var latestQuery = "";

$("#search-box").submit(function (event) {
  // Fires when we click on the search button or press enter
  event.preventDefault();
  if (activeSuggestion !== -1) {
    // if a suggestion is highlighted, search for that exact city
    selectSuggestion(activeSuggestion);
    return;
  }
  var city = iBox.value.trim(); // Gets the value of the input box
  if (!city) {
    return;
  }
  closeSuggestions();
  var apiUrl =
    "https://api.openweathermap.org/data/2.5/weather?q=" + // First fetch to get lat and lon + weather info
    encodeURIComponent(city) +
    "&appid=ffa748d3a02711314373a2d30887317c" +
    "&units=imperial"; // returns the temp in f not kelvin
  getFetch(apiUrl);
});

$(iBox).on("input", function () {
  // waits until the user stops typing for a moment before looking up cities
  clearTimeout(suggestTimer);
  var query = iBox.value.trim();
  if (query.length < 2) {
    closeSuggestions();
    return;
  }
  suggestTimer = setTimeout(function () {
    getSuggestions(query);
  }, 250);
});

$(iBox).on("keydown", function (event) {
  // lets the user move through the dropdown with the arrow keys
  if (!suggestions.length) {
    return;
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    setActiveSuggestion((activeSuggestion + 1) % suggestions.length);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    setActiveSuggestion(activeSuggestion <= 0 ? suggestions.length - 1 : activeSuggestion - 1);
  } else if (event.key === "Escape") {
    closeSuggestions();
  }
});

$(suggestionBox).on("mousedown", ".suggestion", function (event) {
  // mousedown instead of click so the input doesnt lose focus first
  event.preventDefault();
  selectSuggestion(parseInt($(this).attr("data-index")));
});

$(suggestionBox).on("mousemove", ".suggestion", function () {
  setActiveSuggestion(parseInt($(this).attr("data-index")));
});

$(document).on("click", function (event) {
  // closes the dropdown when clicking anywhere outside the search box
  if (!$(event.target).closest("#search-box").length) {
    closeSuggestions();
  }
});

var getSuggestions = function (query) {
  // looks up cities that match what the user has typed so far
  latestQuery = query;
  var geoUrl =
    "https://geocoding-api.open-meteo.com/v1/search?name=" +
    encodeURIComponent(query) +
    "&count=6&language=en";
  fetch(geoUrl)
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      if (query !== latestQuery || iBox.value.trim() !== query) {
        return; // the user kept typing, so these results are out of date
      }
      showSuggestions(data.results || []);
    })
    .catch(function () {
      closeSuggestions(); // suggestions are optional, so just hide them on errors
    });
};

var showSuggestions = function (results) {
  // builds the dropdown list of matching cities
  suggestions = results;
  activeSuggestion = -1;
  suggestionBox.innerHTML = "";
  if (!results.length) {
    closeSuggestions();
    return;
  }
  for (x = 0; x < results.length; x++) {
    var place = [results[x].admin1, results[x].country].filter(Boolean).join(", "); // state or region and country
    var item = $(document.createElement("li"))
      .addClass("suggestion")
      .attr({ id: "suggestion-" + x, role: "option", "data-index": x, "aria-selected": "false" });
    item.append($("<span class='suggestion-name'>").text(results[x].name));
    item.append($("<span class='suggestion-place'>").text(place));
    suggestionBox.appendChild(item[0]);
  }
  suggestionBox.hidden = false;
  iBox.setAttribute("aria-expanded", "true");
};

var setActiveSuggestion = function (index) {
  // highlights one item in the dropdown
  activeSuggestion = index;
  $(".suggestion").each(function (i) {
    $(this).toggleClass("active", i === index).attr("aria-selected", i === index ? "true" : "false");
  });
  if (index === -1) {
    iBox.removeAttribute("aria-activedescendant");
  } else {
    iBox.setAttribute("aria-activedescendant", "suggestion-" + index);
  }
};

var selectSuggestion = function (index) {
  // gets the weather for the city the user picked using its exact location
  var city = suggestions[index];
  closeSuggestions();
  var apiUrl =
    "https://api.openweathermap.org/data/2.5/weather?lat=" +
    city.latitude +
    "&lon=" +
    city.longitude +
    "&appid=ffa748d3a02711314373a2d30887317c" +
    "&units=imperial"; // returns the temp in f not kelvin
  getFetch(apiUrl, city.name);
};

var closeSuggestions = function () {
  // hides the dropdown
  clearTimeout(suggestTimer);
  latestQuery = "";
  suggestions = [];
  activeSuggestion = -1;
  suggestionBox.hidden = true;
  suggestionBox.innerHTML = "";
  iBox.setAttribute("aria-expanded", "false");
  iBox.removeAttribute("aria-activedescendant");
};

var getFetch = function (apiUrl, cityName) {
  // fetchs data and sends data to the creation functions
  // cityName is optional and replaces the name openweather gives back, which can be a nearby neighborhood
  fetch(apiUrl).then(function (response) {
    if (response.ok) {
      response.json().then(function (data) {
        if (cityName) {
          data.name = cityName;
        }
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
