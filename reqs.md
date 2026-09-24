# privIsee application

## idea
the privIsee (spoken: privacy) application is an web app that enables users to share their actual (GPS based) position with others. the difference to other apps in this area is that the backend service never knows the concrete latitude and longitude because these will be saved encrypted in the database. the encryption and decryption of lat and lon will be end-to-end.

### application flow
user starts the web app and enters how long (in mins, hours) he aims to be localizable. then a public available URL is created that can be shared with others. others can use the URL to see the actual location of the user that shares his live location (or latest GPS update).

### end-2-end encryption
when the user starts sharing its location the latitude and longitude are encrypted on client side and send to the REST backend. the backend saves the encrypted values of latitude and longitude, the user id (set once when starting web app) and the timestamp. just the public created URL is able to decrypt lat and lon and to show the user on a openstreetmap. every time the user updates its position, the pin (a blue circle) will be updated on the map.

important: someone that has direct backend DB access is not able to decrypt or see the real user's position.

### technology

#### backend
the backend is a PHP (latest version) backend server using latest MySQL DB. the backend reports location changes using websocket.
a housekeeping job shall delete location sharings if their end-date older than 1 month.

#### frontend
the frontend for the user and for the followers of the user is a static html and js web application. mobile first approach. allowing geolocation for the user is a must.

#### local development
a docker-compose.yml covers PHP backend and frontend.
