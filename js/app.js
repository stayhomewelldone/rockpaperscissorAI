// Initializing variables and constants and selecting DOM elements.
let model;
let videoWidth, videoHeight;
let ctx, canvas;

const VIDEO_WIDTH = 360;
const VIDEO_HEIGHT = 200;
const computer = document.querySelector(".computer img");
const player = document.querySelector(".player img");
const computerPoints = document.querySelector(".computerPoints");
const playerPoints = document.querySelector(".playerPoints");
const options = document.querySelectorAll(".options button");
const buttonClassify = document.querySelector("#classify");
const buttonClassifyId = document.getElementById("classify")

// Initialize KNN classifier and load pre-trained model from file.
const knnClassifier = ml5.KNNClassifier();
knnClassifier.load("./model/myKNN4.json");

// Comment: Function to be executed when the model is loaded successfully, logs a message to the console.
function modelLoaded() {
  console.log("Model succesfully loaded!");
}

// Comment: Event listener for the classify button, which triggers the classify() function when the button is clicked.
buttonClassify.addEventListener("click", () => classify());

// Comment: Main function that loads the handpose model, sets up the camera, plays the video, and starts landmark detection.
async function main() {
  model = await handpose.load();
  const video = await setupCamera();
  video.play();
  startLandmarkDetection(video);
  // predictLandmarks();

}
// Comment: Async function that sets up the camera by requesting access to the user's webcam, setting video source object, and returning a Promise that resolves with the video element after metadata is loaded.
async function setupCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("Webcam not available");
  }

  const video = document.getElementById("video");
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: "user",
      width: VIDEO_WIDTH,
      height: VIDEO_HEIGHT,
    },
  });
  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}
// Comment: Async function that uses the trained "model" to estimate hand poses from the video element,
// retrieves landmarks for each hand pose, formats the landmarks into a "pose" array,
// and then classifies the pose using the "knnClassifier" with a k value of 25.
async function classify() {
  const predictions = await model.estimateHands(video);
  console.log(predictions);
  let pose = [];
  for (let point of predictions) {
    for (let i = 0; i < point.landmarks.length; i++) {
      pose.push(point.landmarks[i][0]);
      pose.push(point.landmarks[i][1]);
    }
  }
  knnClassifier.classify(pose, 25, (err, result) => {
    console.log(result.label); // result.label is the predicted label
    switchFunction(result.label)
  });
}

// Comment: A switch statement that takes the "result" label predicted by the KNN classifier as input,
// and performs corresponding actions based on the label value.
function switchFunction(result){
  switch (result) {
    case "0":
      console.log("It is 0")
      document.getElementById("stone").click();
      break;
    case "1":
      document.getElementById("paper").click();
      break;
    case "2":
      document.getElementById("scissors").click();
      break;
    }

}
// Comment: A function that initializes the landmark detection by setting up the canvas, context, and video dimensions,
// and then clears the canvas and sets the styles for drawing landmarks.
// It also applies a horizontal flip to the video to correct for webcam mirror image.
// Finally, it calls the "predictLandmarks()" function to start predicting and drawing the landmarks.
async function startLandmarkDetection(video) {
  videoWidth = video.videoWidth;
  videoHeight = video.videoHeight;

  canvas = document.getElementById("output");

  canvas.width = videoWidth;
  canvas.height = videoHeight;

  ctx = canvas.getContext("2d");

  video.width = videoWidth;
  video.height = videoHeight;

  ctx.clearRect(0, 0, videoWidth, videoHeight);
  ctx.strokeStyle = "red";
  ctx.fillStyle = "red";

  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1); // video omdraaien omdat webcam in spiegelbeeld is

  predictLandmarks();
}

async function predictLandmarks() {
  ctx.drawImage(
    video,
    0,
    0,
    videoWidth,
    videoHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );
  // prediction!
  const predictions = await model.estimateHands(video); // ,true voor flip
  if (predictions.length > 0) {
    drawHand(ctx, predictions[0].landmarks, predictions[0].annotations);
  }
  // 60 keer per seconde is veel, gebruik setTimeout om minder vaak te predicten
  requestAnimationFrame(predictLandmarks);
  // setTimeout(()=>predictLandmarks(), 1000)
}


function drawHand(ctx, keypoints, annotations) {
  // toon alle x,y,z punten van de hele hand in het log venster
  // log.innerText = keypoints.flat();

  // punten op alle kootjes kan je rechtstreeks uit keypoints halen
  for (let i = 0; i < keypoints.length; i++) {
    const y = keypoints[i][0];
    const x = keypoints[i][1];
    drawPoint(ctx, x - 2, y - 2, 3);
  }

  // palmbase als laatste punt toevoegen aan elke vinger
  let palmBase = annotations.palmBase[0];
  for (let key in annotations) {
    const finger = annotations[key];
    finger.unshift(palmBase);
    drawPath(ctx, finger, false);
  }
}

//
// teken een punt
//
function drawPoint(ctx, y, x, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fill();
}
//
// teken een lijn
//
function drawPath(ctx, points, closePath) {
  const region = new Path2D();
  region.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    region.lineTo(point[0], point[1]);
  }

  if (closePath) {
    region.closePath();
  }
  ctx.stroke(region);
}

// Comment: Adds click event listeners to each option element. When an option is clicked,
// it adds a shake animation class to the computer and player elements to simulate game play.
// After a delay of 900ms (0.9 seconds), it removes the shake animation classes and updates
// the player and computer images, as well as the points based on the game logic.
options.forEach((option) => {
  option.addEventListener("click", () => {
    computer.classList.add("shakeComputer");
    player.classList.add("shakePlayer");

    setTimeout(() => {
      computer.classList.remove("shakeComputer");
      player.classList.remove("shakePlayer");

      player.src = "./images/" + option.innerHTML + "Player.png";

      const choice = ["STONE", "PAPER", "SCISSORS"];
      let arrayNo = Math.floor(Math.random() * 3);
      let computerChoice = choice[arrayNo];
      computer.src = "./images/" + computerChoice + "Computer.png";

      let cPoints = parseInt(computerPoints.innerHTML);
      let pPoints = parseInt(playerPoints.innerHTML);

      if (option.innerHTML === "STONE") {
        if (computerChoice === "PAPER") computerPoints.innerHTML = cPoints + 1;
        else if (computerChoice === "SCISSORS")
          playerPoints.innerHTML = pPoints + 1;
      } else if (option.innerHTML === "PAPER") {
        if (computerChoice === "SCISSORS")
          computerPoints.innerHTML = cPoints + 1;
        else if (computerChoice === "STONE")
          playerPoints.innerHTML = pPoints + 1;
      } else {
        if (computerChoice === "STONE") computerPoints.innerHTML = cPoints + 1;
        else if (computerChoice === "PAPER")
          playerPoints.innerHTML = pPoints + 1;
      }
    }, 900);
  });
});
main();
