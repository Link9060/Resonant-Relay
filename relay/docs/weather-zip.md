# Dashboard weather location

Relay dashboard weather uses a user-entered 5-digit U.S. ZIP code instead of browser geolocation.

- The ZIP is saved locally on the current device/browser.
- The ZIP is resolved to latitude/longitude for the existing Open-Meteo forecast request.
- The weather card shows the resolved city/state and ZIP.
- Users can refresh weather or choose **Change ZIP** at any time.
- Invalid or unknown ZIP codes show an inline error and never request browser location permission.
