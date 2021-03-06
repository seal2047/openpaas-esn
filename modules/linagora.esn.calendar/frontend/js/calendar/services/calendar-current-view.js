'use strict';

angular.module('esn.calendar').factory('calendarCurrentView', function($location, screenSize, fcMoment, CALENDAR_AVAILABLE_VIEWS) {

  var currentView = null;

  function set(view) {
    var firstDayOfView = view.name === 'month' ? fcMoment(view.start).add(7, 'days').startOf('month') : view.start;
    currentView = {
      viewMode: view.name,
      start: firstDayOfView.format('YYYY-MM-DD')
    };

    $location.search(currentView);
  }

  function get() {
    var view = {};

    var getParam = currentView || $location.search();

    if (getParam.viewMode && CALENDAR_AVAILABLE_VIEWS.indexOf(getParam.viewMode) !== -1) {
      view.name = getParam.viewMode;
    } else if (screenSize.is('xs, sm')) {
      // on mobile we force the 'agendaThreeDays' view
      view.name = CALENDAR_AVAILABLE_VIEWS[3];
    }

    var day = fcMoment(getParam.start);
    if (getParam.start && day.isValid()) {
      view.start = day;
    }

    return view;
  }

  return {
    set: set,
    get: get
  };
});
