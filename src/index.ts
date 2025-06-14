import express from "express";
import dotenv from "dotenv";
import { pushNotificationListener } from "./functions/pushNotification";
import { isInsideZoneListener } from "./functions/isInsideZone";
import { simulateGoatWalk } from "./functions/simulateGoatWalk";

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// * Keep FCM service awake
app.get("/", (req, res) => {
  res.send("App is awake!");
});

// * Start the Express server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);

  // Start the Push Notification Listener
  pushNotificationListener();
  // Start the isInside Zone Listener
  isInsideZoneListener();

  // //! Goat Walking Simulation
  // const goats = [
  //   { id: "G-01", lat: 12.66310791429965, lng: 121.4834690093994 },
  //   { id: "G-02", lat: 12.663012722118545, lng: 121.48393638432026 },
  //   { id: "G-03", lat: 12.662629990310116, lng: 121.48426596075298 },
  //   { id: "G-04", lat: 12.662740557335997, lng: 121.48334529250862 },
  //   { id: "G-05", lat: 12.662262305536082, lng: 121.48360949009658 },
  // ];

  // const steps = 100;
  // const stepSize = 0.00005;
  // const delay = 10000;

  // goats.forEach((goat) => {
  //   simulateGoatWalk(goat.id, goat.lat, goat.lng, steps, stepSize, delay);
  // });
});
