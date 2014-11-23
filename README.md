# Angular JS Video Masonry - Video Wall
This is a video masonry for Youtube with an optional minimal backend. Without the geo-location and socket.io functionality it is backend independent.  Keep in mind that this is a side project and is a WIP.

DEMO: http://www.greatvideo.org

![](https://github.com/dev-dude/Angular-Video-Masonry/blob/master/project-screenshot.png)

### Functionality:
  - Scroll and it will load more related videos
  - When the system runs out of related videos, it starts seeding itself by getting related videos to the videos already loaded. This will allow it to load related videos until youtube runs out of videos.
  - Click a Video and it will expand to play the video.
  - Responsive reorganization
  - Mini video with scroll that restores to original position (like Youtube on Android)
  - Video Search and auto-complete
  - Filters for new, popular, published, and rating
  - Small thumbnail and big thumbnail support
  - If a video is not allowed on youtube, it auto searches for similar videos
  - Displays videos relevant to the users region (need back-end node component)
  - Works with mobile devices
  - Has socket.io support for chatting and users sharing video status
  - Has a video stash functionality (limited functionality)

### Important Information:
- Bower components are included in the project. Why? Because I made modifications to speed up masonry, there are specific modifications to angular masonry, and the facebook sharing functionality and some other modules. I will create forks and get these updated
- Things in the "side project" are:
- a) not all done the angular way for the sake of speed
- b) inline style is present but will be removed
- c) not really using bower.json completely correctly (can be fixed)
- d) missing a few node dependencies in server/index.js from package.json (will update)

### Url Structure:
  - Videos: http://www.greatvideo.org/#/video/Qun80b7hV-Y/Things%2520to%2520do%2520in%2520GTA%2520V%2520-%2520Unhungry%2520Unhungry%2520Cargos.html (/video/, video id, video title)
  - Search: http://www.greatvideo.org/#/search/totinos (/search/, keyword)

### Key Files:
    - scripts/controllers/main.js - where all the magic happens
    - scripts/services/youtube.js - the youtube service that contacts youtube
    - scripts/services/socket.js - handles the front-end socket io connections
    - server/index.js - handles the geo location and socket io backend.
    - scripts/app.js - the routes of the app
    - bower_components/angular-masonry/angular-masonry.js - handles the ui directive part of expanding the video etc.

### Installation:
  - Clone the project
  - Navigate to the server folder and "node index.js"
  - In separate terminal window "grunt serve"
  - In app.js, change below the line // Change this to true to run locally vs on a server, to false to run it on production
  - To create a distribution copy, "grunt dist"

### Disclaimer:
  - Use at your own risk. Not responsible for damages. Bower_component files belong to their respected owners. This is a WIP and not a final product intended to be used on production.

Want to contribute? Thanks!

License
----
MIT