var sButton = document.querySelector("#s-button");
var iBox = document.querySelector("#input-box");
var weatherBox = document.querySelector("#weather-section");
var historyBox = document.querySelector("#search-history");
var currentTime = moment();
var searchHistory = [];

$(sButton).click(function () {
  // Fires when we click on the search button
  var city = iBox.value; // Gets the value of the input box
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
          "https://api.openweathermap.org/data/2.5/onecall?lat=" +
          lat +
          "&lon=" +
          lon +
          "&exclude=hourly,minutely" +
          "&appid=ffa748d3a02711314373a2d30887317c" + // Second fetch url to get the daily forecast
          "&units=imperial"; // returns the temp in f not kelvin
        fetch(apiUrl2).then(function (response2) {
          if (response2.ok) {
            response2.json().then(function (data2) {
              currentTime = moment(); // reset the date, otherwise it will constantly increment
              makeCityBox(data, data2);
              makeForecast(data, data2);
              addHistory(data.name);
              saveHistory();
            });
          } else {
            console.log("Error: Location not found");
          }
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

var makeCityBox = function (data, data2) {
  // Creates the city weather box and adds it to the page
  var favorable = 2;
  var moderate = 5;
  // severe I didnt need to add as I just test for over 5

  var tempDiv = $(document.createElement("div")).addClass("weather-info");
  var temph2 = $(document.createElement("h2"));
  var tempp = $(document.createElement("p")).addClass("info-text");

  weatherBox.innerHTML = ""; // Clears the current weather data/content on screen
  temph2.html(
    data.name + // city name
      " (" +
      currentTime.tz(data2.timezone).format("MM/DD/YYYY") + // Gets the date in the locations timezone
      ") " +
      getIcon(data2.daily[0].weather[0].icon)
  ); // get the current weather emoji
  tempp.html(
    "Temp: " +
      data.main.temp +
      " °F" +
      "<br>" +
      "Wind: " +
      data.wind.speed +
      " MPH" +
      "<br>" +
      "Humidity: " +
      data.main.humidity +
      "%" +
      "<br>"
  );

  var tempString;
  var uv = parseFloat(data2.current.uvi);
  if (uv <= favorable) {
    tempString = "class='uv-box uv-favorable'";
  } else if (uv <= moderate) {
    tempString = "class='uv-box uv-moderate'";
  } else {
    tempString = "class='uv-box uv-severe'";
  }
  tempp.append("UV Index: " + "<span " + tempString + ">" + uv + "</span>");
  tempDiv.append(temph2);
  tempDiv.append(tempp);
  weatherBox.appendChild(tempDiv[0]); // The [0] gets the dom element
};

var makeForecast = function (data, data2) {
  // creates the forecast area and adds it to the page
  var tempDiv = $(document.createElement("div")).addClass("forecast-box");
  var tempDiv2 = $(document.createElement("div")).addClass("forecast-holder");
  var temph3 = $(document.createElement("h3"));
  temph3.text("5-Day Forecast:");
  tempDiv.append(temph3);
  tempDiv.append(tempDiv2);
  currentTime.add(1, "days");
  for (x = 1; x < 6; x++) {
    var tempCard = $(document.createElement("div")).addClass("forecast-card");
    var tempp = $(document.createElement("p")).addClass("forecast-header");
    tempp.text(currentTime.tz(data2.timezone).format("MM/DD/YYYY")); // get the current time of the city we are looking at
    currentTime.add(1, "days"); // add 1 day to the time so the cards show different dates
    var tempp2 = $(document.createElement("p")).addClass("forecast-text");
    tempp2.html(
      getIcon(data2.daily[x].weather[0].icon) +
        "<br>" +
        "Temp: " +
        data2.daily[x].temp.day +
        " °F" +
        "<br>" +
        "Wind: " +
        data2.daily[x].wind_speed +
        " MPH" +
        "<br>" +
        "Humidity: " +
        data2.daily[x].humidity +
        "%" +
        "<br>"
    );

    tempCard.append(tempp);
    tempCard.append(tempp2);
    tempDiv2.append(tempCard);
  }
  weatherBox.appendChild(tempDiv[0]);
};

var getIcon = function (icon) {
 return "<img class='weather-img' src='http://openweathermap.org/img/wn/" + icon + "@2x.png'>";
};

loadHistory(); // load the history when the page loads
